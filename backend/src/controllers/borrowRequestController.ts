import { Request, Response } from "express";
import prisma from "../prisma";
import { sanitizeString } from "../utils/validation";
import {
  notifyNewBorrowRequest,
  notifyRequestAccepted,
  notifyRequestDeclined,
} from "../utils/notifications";

// POST /api/borrow-requests
export async function createBorrowRequest(req: Request, res: Response) {
  const { resourceId, borrowerId, groupId, message, startDate, endDate } =
    req.body;
  const authenticatedUserId = (req as any).user.uid;

  if (!resourceId || !borrowerId || !startDate || !endDate) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["resourceId", "borrowerId", "startDate", "endDate"],
    });
  }

  if (borrowerId !== authenticatedUserId) {
    return res
      .status(403)
      .json({ error: "You can only create borrow requests for yourself" });
  }

  const sanitizedMessage = message ? sanitizeString(message, 500) : null;

  try {
    // Parse date strings as local time to avoid UTC timezone offset issues
    const parseDateParts = (dateStr: string) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      return new Date(y, m - 1, d);
    };
    const start = parseDateParts(startDate);
    const end = parseDateParts(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    if (start < today) {
      return res
        .status(400)
        .json({ error: "Start date cannot be in the past" });
    }

    if (end <= start) {
      return res
        .status(400)
        .json({ error: "End date must be after start date" });
    }

    // Enforce maximum loan duration (365 days)
    const durationMs = end.getTime() - start.getTime();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    if (durationDays > 365) {
      return res
        .status(400)
        .json({ error: "Loan duration cannot exceed 365 days" });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    if (resource.ownerId === borrowerId) {
      return res
        .status(400)
        .json({ error: "You cannot borrow your own resource" });
    }

    // If groupId not provided, find a suitable group
    let finalGroupId = groupId;
    if (!finalGroupId) {
      const suitableGroup = await prisma.resourceSharing.findFirst({
        where: {
          resourceId,
          group: {
            members: {
              some: {
                userId: borrowerId,
              },
            },
          },
        },
        select: { groupId: true },
      });

      if (!suitableGroup) {
        return res.status(403).json({
          error: "No suitable group found",
          message:
            "You must be a member of a group where this resource is shared",
        });
      }

      finalGroupId = suitableGroup.groupId;
    } else {
      const resourceSharing = await prisma.resourceSharing.findFirst({
        where: {
          resourceId,
          groupId: finalGroupId,
        },
      });

      if (!resourceSharing) {
        return res.status(403).json({
          error: "Resource not shared with this group",
          message: "This resource is not available in the specified group",
        });
      }

      const groupMember = await prisma.groupMember.findFirst({
        where: {
          userId: borrowerId,
          groupId: finalGroupId,
        },
      });

      if (!groupMember) {
        return res.status(403).json({
          error: "Not a group member",
          message:
            "You must be a member of this group to request this resource",
        });
      }
    }

    // Check for overlapping active loans
    const overlappingLoans = await prisma.loan.findMany({
      where: {
        resourceId,
        status: "ACTIVE",
        OR: [
          {
            AND: [{ startDate: { lte: end } }, { startDate: { gte: start } }],
          },
          {
            AND: [{ endDate: { lte: end } }, { endDate: { gte: start } }],
          },
          {
            AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }],
          },
        ],
      },
    });

    if (overlappingLoans.length > 0) {
      return res.status(409).json({
        error: "Resource unavailable",
        message:
          "This resource is already borrowed during the requested time period",
        conflictingLoans: overlappingLoans.map((loan) => ({
          startDate: loan.startDate,
          endDate: loan.endDate,
        })),
      });
    }

    // Check for existing pending or approved requests from the same borrower for overlapping dates
    const existingRequests = await prisma.borrowRequest.findMany({
      where: {
        resourceId,
        borrowerId,
        status: {
          in: ["PENDING", "APPROVED"],
        },
        OR: [
          {
            AND: [{ startDate: { lte: end } }, { startDate: { gte: start } }],
          },
          {
            AND: [{ endDate: { lte: end } }, { endDate: { gte: start } }],
          },
          {
            AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }],
          },
        ],
      },
      include: {
        loan: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Filter to only active/pending requests (exclude completed loans)
    const activeRequests = existingRequests.filter((r) => {
      if (r.status === "PENDING") return true;
      if (r.status === "APPROVED") {
        return (
          !r.loan ||
          r.loan.status === "ACTIVE" ||
          r.loan.status === "PENDING_RETURN_CONFIRMATION"
        );
      }
      return false;
    });

    if (activeRequests.length > 0) {
      const existingRequest = activeRequests[0];
      const requestType =
        existingRequest.status === "PENDING" ? "pending" : "approved";
      return res.status(409).json({
        error: "Duplicate request",
        message: `You already have a ${requestType} request for this item during these dates`,
        existingRequest: {
          id: existingRequest.id,
          status: existingRequest.status,
          startDate: existingRequest.startDate,
          endDate: existingRequest.endDate,
        },
      });
    }

    const borrowRequest = await prisma.borrowRequest.create({
      data: {
        resourceId,
        borrowerId,
        ownerId: resource.ownerId,
        message: sanitizedMessage,
        startDate: start,
        endDate: end,
        status: "PENDING",
      },
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            description: true,
            image: true,
          },
        },
        borrower: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      borrowRequest,
      message: "Borrow request created successfully",
    });

    // Fire-and-forget push notification to owner
    notifyNewBorrowRequest(
      borrowRequest.ownerId,
      borrowRequest.borrower.name || borrowRequest.borrower.email,
      borrowRequest.resource.title,
      borrowRequest.id,
    );
  } catch (error) {
    console.error("Error creating borrow request:", error);
    res.status(500).json({ error: "Failed to create borrow request" });
  }
}

// GET /api/borrow-requests
export async function getBorrowRequests(req: Request, res: Response) {
  const userId = req.query.userId as string | undefined;
  const role = req.query.role as "owner" | "borrower" | undefined;
  const status = req.query.status as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  if (!role || (role !== "owner" && role !== "borrower")) {
    return res.status(400).json({
      error: "role is required and must be 'owner' or 'borrower'",
    });
  }

  try {
    const whereClause: any = {
      [role === "owner" ? "ownerId" : "borrowerId"]: userId,
    };

    if (status) {
      whereClause.status = status.toUpperCase();
    }

    const totalCount = await prisma.borrowRequest.count({
      where: whereClause,
    });

    const borrowRequests = await prisma.borrowRequest.findMany({
      where: whereClause,
      select: {
        id: true,
        resourceId: true,
        borrowerId: true,
        ownerId: true,
        status: true,
        message: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        resource: {
          select: {
            id: true,
            title: true,
            description: true,
            image: true,
            status: true,
            sharedWith: {
              select: {
                groupId: true,
                group: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
        borrower: {
          select: {
            id: true,
            email: true,
            name: true,
            groupMembers: {
              select: {
                groupId: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        loan: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            returnedDate: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Optimized transform: use Set for faster lookups
    const requestsWithGroups = borrowRequests.map((request) => {
      const borrowerGroupIds = new Set(
        request.borrower.groupMembers.map((gm) => gm.groupId),
      );

      const sharedGroup = request.resource.sharedWith.find((sharing) =>
        borrowerGroupIds.has(sharing.groupId),
      );

      return {
        id: request.id,
        resourceId: request.resourceId,
        borrowerId: request.borrowerId,
        ownerId: request.ownerId,
        status: request.status,
        message: request.message,
        startDate: request.startDate,
        endDate: request.endDate,
        createdAt: request.createdAt,
        resource: {
          id: request.resource.id,
          title: request.resource.title,
          description: request.resource.description,
          image: request.resource.image,
          status: request.resource.status,
        },
        borrower: {
          id: request.borrower.id,
          email: request.borrower.email,
          name: request.borrower.name,
        },
        owner: request.owner,
        loan: request.loan,
        group: sharedGroup?.group || null,
      };
    });

    res.setHeader("Cache-Control", "private, max-age=10");

    res.json({
      success: true,
      requests: requestsWithGroups,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching borrow requests:", error);
    res.status(500).json({ error: "Failed to fetch borrow requests" });
  }
}

// POST /api/borrow-requests/:id/accept
export async function acceptBorrowRequest(req: Request, res: Response) {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const borrowRequest = await prisma.borrowRequest.findUnique({
      where: { id },
      include: {
        resource: true,
        borrower: {
          select: { id: true, email: true, name: true },
        },
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!borrowRequest) {
      return res.status(404).json({ error: "Borrow request not found" });
    }

    if (borrowRequest.ownerId !== userId) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "Only the resource owner can accept borrow requests",
      });
    }

    if (borrowRequest.status !== "PENDING") {
      return res.status(400).json({
        error: "Invalid request status",
        message: `This request has already been ${borrowRequest.status.toLowerCase()}`,
      });
    }

    // Check for active loans during the requested period
    const overlappingLoans = await prisma.loan.findMany({
      where: {
        resourceId: borrowRequest.resourceId,
        status: "ACTIVE",
        OR: [
          {
            AND: [
              { startDate: { lte: borrowRequest.endDate } },
              { startDate: { gte: borrowRequest.startDate } },
            ],
          },
          {
            AND: [
              { endDate: { lte: borrowRequest.endDate } },
              { endDate: { gte: borrowRequest.startDate } },
            ],
          },
          {
            AND: [
              { startDate: { lte: borrowRequest.startDate } },
              { endDate: { gte: borrowRequest.endDate } },
            ],
          },
        ],
      },
    });

    if (overlappingLoans.length > 0) {
      return res.status(409).json({
        error: "Resource unavailable",
        message:
          "This resource is already borrowed during the requested time period",
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Optimistic locking check within transaction
        const currentRequest = await tx.borrowRequest.findUnique({
          where: { id },
          select: { status: true },
        });

        if (!currentRequest || currentRequest.status !== "PENDING") {
          throw new Error(
            "Request status changed. Please refresh and try again.",
          );
        }

        const loan = await tx.loan.create({
          data: {
            requestId: borrowRequest.id,
            resourceId: borrowRequest.resourceId,
            borrowerId: borrowRequest.borrowerId,
            lenderId: borrowRequest.ownerId,
            startDate: borrowRequest.startDate,
            endDate: borrowRequest.endDate,
            status: "ACTIVE",
          },
          include: {
            borrower: {
              select: { id: true, email: true, name: true },
            },
            lender: {
              select: { id: true, email: true, name: true },
            },
            resource: {
              select: {
                id: true,
                title: true,
                description: true,
                image: true,
                status: true,
              },
            },
          },
        });

        const updatedRequest = await tx.borrowRequest.update({
          where: { id },
          data: { status: "APPROVED" },
          include: {
            resource: true,
            borrower: {
              select: { id: true, email: true, name: true },
            },
            owner: {
              select: { id: true, email: true, name: true },
            },
          },
        });

        await tx.resource.update({
          where: { id: borrowRequest.resourceId },
          data: {
            status: "BORROWED",
            currentLoanId: loan.id,
          },
        });

        // Auto-decline overlapping pending requests
        const declinedRequests = await tx.borrowRequest.updateMany({
          where: {
            resourceId: borrowRequest.resourceId,
            id: { not: borrowRequest.id },
            status: "PENDING",
            OR: [
              {
                AND: [
                  { startDate: { lte: borrowRequest.endDate } },
                  { startDate: { gte: borrowRequest.startDate } },
                ],
              },
              {
                AND: [
                  { endDate: { lte: borrowRequest.endDate } },
                  { endDate: { gte: borrowRequest.startDate } },
                ],
              },
              {
                AND: [
                  { startDate: { lte: borrowRequest.startDate } },
                  { endDate: { gte: borrowRequest.endDate } },
                ],
              },
            ],
          },
          data: { status: "REJECTED" },
        });

        return {
          loan,
          updatedRequest,
          declinedCount: declinedRequests.count,
        };
      },
      {
        maxWait: 5000,
        timeout: 10000,
      },
    );

    res.json({
      success: true,
      message: "Borrow request accepted successfully",
      borrowRequest: result.updatedRequest,
      loan: result.loan,
      autoDeclinedRequests: result.declinedCount,
    });

    notifyRequestAccepted(
      result.updatedRequest.borrowerId,
      result.updatedRequest.owner.name || result.updatedRequest.owner.email,
      result.updatedRequest.resource.title,
      result.updatedRequest.id,
    );
  } catch (error) {
    console.error("Error accepting borrow request:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to accept borrow request";
    res.status(500).json({ error: errorMessage });
  }
}

// POST /api/borrow-requests/:id/decline
export async function declineBorrowRequest(req: Request, res: Response) {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const borrowRequest = await prisma.borrowRequest.findUnique({
      where: { id },
      include: {
        resource: true,
        borrower: {
          select: { id: true, email: true, name: true },
        },
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!borrowRequest) {
      return res.status(404).json({ error: "Borrow request not found" });
    }

    if (borrowRequest.ownerId !== userId) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "Only the resource owner can decline borrow requests",
      });
    }

    if (borrowRequest.status !== "PENDING") {
      return res.status(400).json({
        error: "Invalid request status",
        message: `This request has already been ${borrowRequest.status.toLowerCase()}`,
      });
    }

    const updatedRequest = await prisma.borrowRequest.update({
      where: { id },
      data: { status: "REJECTED" },
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            description: true,
            image: true,
            status: true,
          },
        },
        borrower: {
          select: { id: true, email: true, name: true },
        },
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    res.json({
      success: true,
      message: "Borrow request declined",
      borrowRequest: updatedRequest,
    });

    notifyRequestDeclined(
      updatedRequest.borrowerId,
      updatedRequest.owner.name || updatedRequest.owner.email,
      updatedRequest.resource.title,
      updatedRequest.id,
    );
  } catch (error) {
    console.error("Error declining borrow request:", error);
    res.status(500).json({ error: "Failed to decline borrow request" });
  }
}

// POST /api/borrow-requests/:id/cancel
export async function cancelBorrowRequest(req: Request, res: Response) {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const borrowRequest = await prisma.borrowRequest.findUnique({
      where: { id },
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            description: true,
            image: true,
            status: true,
          },
        },
        borrower: {
          select: { id: true, email: true, name: true },
        },
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!borrowRequest) {
      return res.status(404).json({ error: "Borrow request not found" });
    }

    if (borrowRequest.borrowerId !== userId) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "Only the borrower can cancel their own request",
      });
    }

    if (borrowRequest.status !== "PENDING") {
      return res.status(400).json({
        error: "Invalid request status",
        message: `Cannot cancel a request that has been ${borrowRequest.status.toLowerCase()}`,
      });
    }

    const updatedRequest = await prisma.borrowRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            description: true,
            image: true,
            status: true,
          },
        },
        borrower: {
          select: { id: true, email: true, name: true },
        },
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    res.json({
      success: true,
      message: "Borrow request cancelled",
      borrowRequest: updatedRequest,
    });
  } catch (error) {
    console.error("Error cancelling borrow request:", error);
    res.status(500).json({ error: "Failed to cancel borrow request" });
  }
}

// PUT /api/borrow-requests/:id
export async function updateBorrowRequest(req: Request, res: Response) {
  const { id } = req.params;
  const { userId, startDate, endDate, message } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const borrowRequest = await prisma.borrowRequest.findUnique({
      where: { id },
    });

    if (!borrowRequest) {
      return res.status(404).json({ error: "Borrow request not found" });
    }

    if (
      borrowRequest.borrowerId !== userId &&
      borrowRequest.ownerId !== userId
    ) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "Only the borrower or owner can update this request",
      });
    }

    if (borrowRequest.status !== "PENDING") {
      return res.status(400).json({
        error: "Invalid request status",
        message: "Only pending requests can be updated",
      });
    }

    const updateData: any = {};

    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ error: "Invalid start date format" });
      }
      updateData.startDate = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({ error: "Invalid end date format" });
      }
      updateData.endDate = end;
    }

    const finalStartDate = updateData.startDate || borrowRequest.startDate;
    const finalEndDate = updateData.endDate || borrowRequest.endDate;

    if (finalEndDate <= finalStartDate) {
      return res.status(400).json({
        error: "End date must be after start date",
      });
    }

    if (message !== undefined) {
      updateData.message = message || null;
    }

    const updatedRequest = await prisma.borrowRequest.update({
      where: { id },
      data: updateData,
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            description: true,
            image: true,
            status: true,
          },
        },
        borrower: {
          select: { id: true, email: true, name: true },
        },
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    res.json({
      success: true,
      message: "Borrow request updated",
      borrowRequest: updatedRequest,
    });
  } catch (error) {
    console.error("Error updating borrow request:", error);
    res.status(500).json({ error: "Failed to update borrow request" });
  }
}

// DELETE /api/borrow-requests/:id
export async function deleteBorrowRequest(req: Request, res: Response) {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const borrowRequest = await prisma.borrowRequest.findUnique({
      where: { id },
      include: {
        loan: true,
      },
    });

    if (!borrowRequest) {
      return res.status(404).json({ error: "Borrow request not found" });
    }

    if (
      borrowRequest.borrowerId !== userId &&
      borrowRequest.ownerId !== userId
    ) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "Only the borrower or owner can delete this request",
      });
    }

    if (borrowRequest.status === "APPROVED") {
      return res.status(400).json({
        error: "Cannot delete approved request",
        message:
          "Approved requests cannot be deleted. Cancel the loan instead.",
      });
    }

    // Delete associated loan first if exists
    if (borrowRequest.loan) {
      await prisma.loan.delete({
        where: { id: borrowRequest.loan.id },
      });
    }

    await prisma.borrowRequest.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Borrow request deleted",
    });
  } catch (error) {
    console.error("Error deleting borrow request:", error);
    res.status(500).json({ error: "Failed to delete borrow request" });
  }
}
