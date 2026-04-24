import { Request, Response } from "express";
import { GroupRole } from "@prisma/client";
import admin from "firebase-admin";
import prisma from "../prisma";
import {
  validateResourceInput,
  validateImageInput,
  sanitizeString,
} from "../utils/validation";

/**
 * Extracts the Firebase Storage object path from a download URL so we can
 * delete it via the Admin SDK.  Returns null for non-Storage URLs (e.g.
 * legacy base64 values stored as strings).
 */
function storagePathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/o/");
    if (parts.length < 2) return null;
    return decodeURIComponent(parts[1]);
  } catch {
    return null;
  }
}

// GET /api/resources
export async function getResources(req: Request, res: Response) {
  try {
    const authenticatedUserId = (req as any).user.uid;
    const userId = req.query.user as string | undefined;
    const ownerId = req.query.ownerId as string | undefined;

    if (ownerId && ownerId !== authenticatedUserId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (userId && userId !== authenticatedUserId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip = (page - 1) * limit;

    if (ownerId) {
      const [resources, total] = await Promise.all([
        prisma.resource.findMany({
          where: { ownerId },
          skip,
          take: limit,
          include: {
            owner: {
              select: { id: true, email: true, name: true },
            },
            currentLoan: {
              select: {
                id: true,
                status: true,
                startDate: true,
                endDate: true,
                returnedDate: true,
                borrower: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
            sharedWith: {
              include: {
                group: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        }),
        prisma.resource.count({ where: { ownerId } }),
      ]);
      return res.json({
        data: resources,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    if (!userId) {
      return res.json({
        data: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 },
      });
    }

    const userGroups = await prisma.groupMember.findMany({
      where: { userId: userId },
      select: { groupId: true },
    });

    const groupIds = userGroups.map((ug) => ug.groupId);

    // Filter at the DB level: resources shared into any of the user's groups,
    // excluding resources the user owns. Dedup is handled by Prisma's distinct.
    const sharedResourcesWhere = {
      ownerId: { not: userId },
      sharedWith: {
        some: {
          groupId: { in: groupIds },
        },
      },
    };

    const [paginatedResources, total] = await Promise.all([
      prisma.resource.findMany({
        where: sharedResourcesWhere,
        skip,
        take: limit,
        include: {
          owner: {
            select: { id: true, email: true, name: true },
          },
          currentLoan: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              returnedDate: true,
              borrower: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      }),
      prisma.resource.count({ where: sharedResourcesWhere }),
    ]);

    res.json({
      data: paginatedResources,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/resources/:id/pending-requests-count
export async function getPendingRequestsCount(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const count = await prisma.borrowRequest.count({
      where: {
        resourceId: id,
        status: "PENDING",
      },
    });

    res.json({ resourceId: id, pendingRequestsCount: count });
  } catch (error) {
    console.error("Error fetching pending requests count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/resources
export async function createResource(req: Request, res: Response) {
  const { title, description, ownerId, image } = req.body;
  const authenticatedUserId = (req as any).user.uid;

  const sanitizedTitle = sanitizeString(title, 200);
  const sanitizedDescription = sanitizeString(description, 2000);

  const validation = validateResourceInput({
    title: sanitizedTitle,
    description: sanitizedDescription,
    ownerId,
    image,
  });
  if (!validation.valid) {
    return res.status(400).json({ error: validation.errors.join(", ") });
  }

  if (image && typeof image === "string") {
    const imageValidation = validateImageInput(image);
    if (!imageValidation.valid) {
      return res.status(400).json({ error: imageValidation.error });
    }
  }

  if (ownerId !== authenticatedUserId) {
    return res
      .status(403)
      .json({ error: "You can only create resources for yourself" });
  }

  try {
    await prisma.user.upsert({
      where: { id: ownerId },
      update: {
        email: req.body.email ? req.body.email.toLowerCase() : undefined,
        name: req.body.name || undefined,
      },
      create: {
        id: ownerId,
        email: req.body.email
          ? req.body.email.toLowerCase()
          : ownerId + "@local.firebase",
        name: req.body.name || null,
      },
    });

    const userGroups = await prisma.groupMember.findMany({
      where: { userId: ownerId },
    });

    if (userGroups.length === 0) {
      const defaultGroup = await prisma.group.create({
        data: {
          name: "My Friends",
          createdById: ownerId,
          members: {
            create: { userId: ownerId },
          },
        },
      });

      await prisma.groupMember.updateMany({
        where: {
          groupId: defaultGroup.id,
          userId: ownerId,
        },
        data: {
          role: GroupRole.OWNER,
        },
      });
    }

    const resource = await prisma.resource.create({
      data: {
        title: sanitizedTitle,
        description: sanitizedDescription,
        ownerId,
        image,
      },
    });
    res.status(201).json(resource);
  } catch (error) {
    console.error("Error creating resource:", error);
    res.status(500).json({ error: "Failed to create resource" });
  }
}

// PUT /api/resources/:id
export async function updateResource(req: Request, res: Response) {
  const id = req.params.id;
  const { title, description } = req.body;
  const authenticatedUserId = (req as any).user.uid;

  const errors: string[] = [];
  if (!title || title.trim().length < 3) {
    errors.push("Title must be at least 3 characters");
  }
  if (title && title.length > 200) {
    errors.push("Title must be less than 200 characters");
  }
  if (!description || description.trim().length < 10) {
    errors.push("Description must be at least 10 characters");
  }
  if (description && description.length > 2000) {
    errors.push("Description must be less than 2000 characters");
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  try {
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }
    if (resource.ownerId !== authenticatedUserId) {
      return res
        .status(403)
        .json({ error: "You can only update your own resources" });
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: { title, description },
      select: {
        id: true,
        title: true,
        description: true,
        image: true,
        ownerId: true,
        status: true,
        currentLoanId: true,
        currentLoan: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            returnedDate: true,
            borrower: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating resource:", error);
    res.status(404).json({ error: "Resource not found" });
  }
}

// DELETE /api/resources/:id
export async function deleteResource(req: Request, res: Response) {
  const id = req.params.id;
  const authenticatedUserId = (req as any).user.uid;

  try {
    const resource = await prisma.resource.findUnique({
      where: { id },
      select: { ownerId: true, currentLoanId: true, image: true },
    });
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    if (resource.ownerId !== authenticatedUserId) {
      return res
        .status(403)
        .json({ error: "You don't have permission to delete this resource" });
    }

    if (resource.currentLoanId) {
      return res.status(400).json({
        error:
          "Cannot delete resource while it is currently borrowed. Please wait for it to be returned.",
      });
    }

    await prisma.loan.deleteMany({ where: { resourceId: id } });
    await prisma.borrowRequest.deleteMany({ where: { resourceId: id } });
    await prisma.resourceSharing.deleteMany({ where: { resourceId: id } });
    await prisma.resource.delete({ where: { id } });

    // Best-effort: delete the image from Firebase Storage.
    // This runs after the DB delete so a Storage failure never blocks the response.
    if (resource.image) {
      const storagePath = storagePathFromUrl(resource.image);
      if (storagePath) {
        const bucket = process.env.FIREBASE_STORAGE_BUCKET;
        if (bucket) {
          admin
            .storage()
            .bucket(bucket)
            .file(storagePath)
            .delete()
            .catch((err) =>
              console.error(
                `Failed to delete Storage file ${storagePath}:`,
                err,
              ),
            );
        }
      }
    }

    res.status(204).end();
  } catch (error) {
    console.error("Error deleting resource:", error);
    res.status(500).json({ error: "Failed to delete resource" });
  }
}

// GET /api/resources/:resourceId/groups
export async function getResourceGroups(req: Request, res: Response) {
  const { resourceId } = req.params;
  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { ownerId: true },
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    if (resource.ownerId !== userId) {
      return res.status(403).json({ error: "You don't own this resource" });
    }

    const sharedGroups = await prisma.resourceSharing.findMany({
      where: { resourceId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const groupsWithCounts = await Promise.all(
      sharedGroups.map(async (sharing) => {
        const memberCount = await prisma.groupMember.count({
          where: { groupId: sharing.groupId },
        });

        return {
          ...sharing.group,
          memberCount,
        };
      }),
    );

    res.json(groupsWithCounts);
  } catch (error) {
    console.error("Error fetching resource groups:", error);
    res.status(500).json({ error: "Failed to fetch resource groups" });
  }
}

// POST /api/resources/:resourceId/groups/:groupId
export async function addResourceToGroup(req: Request, res: Response) {
  const { resourceId, groupId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { ownerId: true },
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    if (resource.ownerId !== userId) {
      return res.status(403).json({ error: "You don't own this resource" });
    }

    const membership = await prisma.groupMember.findFirst({
      where: {
        userId,
        groupId,
      },
    });

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You're not a member of this group" });
    }

    const existingSharing = await prisma.resourceSharing.findFirst({
      where: {
        resourceId,
        groupId,
      },
    });

    if (existingSharing) {
      return res
        .status(400)
        .json({ error: "Resource is already shared with this group" });
    }

    await prisma.resourceSharing.create({
      data: {
        resourceId,
        groupId,
      },
    });

    res.json({ success: true, message: "Resource added to group" });
  } catch (error) {
    console.error("Error adding resource to group:", error);
    res.status(500).json({ error: "Failed to add resource to group" });
  }
}

// DELETE /api/resources/:resourceId/groups/:groupId
export async function removeResourceFromGroup(req: Request, res: Response) {
  const { resourceId, groupId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { ownerId: true },
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    if (resource.ownerId !== userId) {
      return res.status(403).json({ error: "You don't own this resource" });
    }

    await prisma.resourceSharing.deleteMany({
      where: {
        resourceId,
        groupId,
      },
    });

    res.json({ success: true, message: "Resource removed from group" });
  } catch (error) {
    console.error("Error removing resource from group:", error);
    res.status(500).json({ error: "Failed to remove resource from group" });
  }
}

// POST /api/resources/:resourceId/share
export async function shareResource(req: Request, res: Response) {
  const { resourceId } = req.params;
  const { groupId } = req.body;
  const authenticatedUserId = (req as any).user.uid;

  if (!groupId) return res.status(400).json({ error: "groupId required" });

  try {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { ownerId: true },
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    if (resource.ownerId !== authenticatedUserId) {
      return res
        .status(403)
        .json({ error: "You can only share your own resources" });
    }

    const groupMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: authenticatedUserId,
      },
    });

    if (!groupMember) {
      return res
        .status(403)
        .json({ error: "You must be a member of this group" });
    }

    const existingSharing = await prisma.resourceSharing.findFirst({
      where: { resourceId, groupId },
    });

    if (existingSharing) {
      return res
        .status(400)
        .json({ error: "Resource already shared with this group" });
    }

    const sharing = await prisma.resourceSharing.create({
      data: { resourceId, groupId },
    });
    res.status(201).json(sharing);
  } catch (error) {
    console.error("Error sharing resource:", error);
    res.status(500).json({ error: "Failed to share resource" });
  }
}
