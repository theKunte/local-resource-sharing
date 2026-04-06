import { Request, Response } from "express";
import prisma from "../prisma";
import {
  notifyReturnRequested,
  notifyReturnConfirmed,
} from "../utils/notifications";

// POST /api/loans/:id/request-return (borrower only)
export async function requestReturn(req: Request, res: Response) {
  const { id } = req.params;
  const userId = (req as any).user.uid;

  try {
    const loan = await prisma.loan.findUnique({
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
        lender: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    if (loan.borrowerId !== userId) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "Only the borrower can request to return this loan",
      });
    }

    if (loan.status !== "ACTIVE") {
      return res.status(400).json({
        error: "Invalid loan status",
        message: `This loan is already ${loan.status.toLowerCase()}`,
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const currentLoan = await tx.loan.findUnique({
          where: { id },
          select: { status: true },
        });

        if (!currentLoan || currentLoan.status !== "ACTIVE") {
          throw new Error("Loan status changed. Please refresh and try again.");
        }

        const updatedLoan = await tx.loan.update({
          where: { id },
          data: {
            status: "PENDING_RETURN_CONFIRMATION",
            returnedDate: new Date(),
          },
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
            lender: {
              select: { id: true, email: true, name: true },
            },
          },
        });

        return { loan: updatedLoan };
      },
      {
        maxWait: 5000,
        timeout: 10000,
      },
    );

    res.json({
      success: true,
      message: "Return requested successfully. Awaiting owner confirmation.",
      loan: result.loan,
    });

    notifyReturnRequested(
      result.loan.lenderId,
      result.loan.borrower.name || result.loan.borrower.email,
      result.loan.resource.title,
      result.loan.id,
    );
  } catch (error) {
    console.error("Error requesting loan return:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to request loan return";
    res.status(500).json({ error: errorMessage });
  }
}

// POST /api/loans/:id/confirm-return (lender/owner only)
export async function confirmReturn(req: Request, res: Response) {
  const { id } = req.params;
  const userId = (req as any).user.uid;

  try {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            description: true,
            image: true,
            status: true,
            currentLoanId: true,
          },
        },
        borrower: {
          select: { id: true, email: true, name: true },
        },
        lender: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    if (loan.lenderId !== userId) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "Only the resource owner can confirm the return",
      });
    }

    if (loan.status !== "PENDING_RETURN_CONFIRMATION") {
      return res.status(400).json({
        error: "Invalid loan status",
        message:
          loan.status === "RETURNED"
            ? "This loan has already been marked as returned"
            : "The borrower must initiate the return first",
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const currentLoan = await tx.loan.findUnique({
          where: { id },
          select: { status: true, resourceId: true },
        });

        if (
          !currentLoan ||
          currentLoan.status !== "PENDING_RETURN_CONFIRMATION"
        ) {
          throw new Error("Loan status changed. Please refresh and try again.");
        }

        const updatedLoan = await tx.loan.update({
          where: { id },
          data: {
            status: "RETURNED",
          },
          include: {
            resource: {
              select: {
                id: true,
                title: true,
              },
            },
            borrower: {
              select: { id: true, email: true, name: true },
            },
            lender: {
              select: { id: true, email: true, name: true },
            },
          },
        });

        await tx.resource.update({
          where: { id: currentLoan.resourceId },
          data: {
            status: "AVAILABLE",
            currentLoanId: null,
          },
        });

        return { loan: updatedLoan };
      },
      {
        maxWait: 5000,
        timeout: 10000,
      },
    );

    res.json({
      success: true,
      message: "Return confirmed successfully",
      loan: result.loan,
    });

    notifyReturnConfirmed(
      result.loan.borrowerId,
      result.loan.lender.name || result.loan.lender.email,
      result.loan.resource.title,
      result.loan.id,
    );
  } catch (error) {
    console.error("Error confirming return:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to confirm return";
    res.status(500).json({ error: errorMessage });
  }
}

// POST /api/borrow-requests/:id/mark-returned (owner direct return)
export async function markReturned(req: Request, res: Response) {
  const { id } = req.params;
  const userId = (req as any).user.uid;

  try {
    const borrowRequest = await prisma.borrowRequest.findUnique({
      where: { id },
      include: {
        loan: true,
        resource: true,
      },
    });

    if (!borrowRequest) {
      return res.status(404).json({ error: "Borrow request not found" });
    }

    if (borrowRequest.ownerId !== userId) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "Only the resource owner can mark items as returned",
      });
    }

    if (borrowRequest.status !== "APPROVED" || !borrowRequest.loan) {
      return res.status(400).json({
        error: "Invalid request status",
        message:
          "Only approved requests with active loans can be marked as returned",
      });
    }

    if (borrowRequest.loan.status !== "ACTIVE") {
      return res.status(400).json({
        error: "Loan already completed",
        message: "This loan has already been returned",
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const currentLoan = await tx.loan.findUnique({
          where: { id: borrowRequest.loan!.id },
          select: { status: true },
        });

        if (!currentLoan || currentLoan.status !== "ACTIVE") {
          throw new Error("Loan status changed. Please refresh and try again.");
        }

        const updatedLoan = await tx.loan.update({
          where: { id: borrowRequest.loan!.id },
          data: {
            status: "RETURNED",
            returnedDate: new Date(),
          },
          include: {
            borrower: {
              select: { id: true, email: true, name: true },
            },
            lender: {
              select: { id: true, email: true, name: true },
            },
          },
        });

        await tx.resource.update({
          where: { id: borrowRequest.resourceId },
          data: {
            status: "AVAILABLE",
            currentLoanId: null,
          },
        });

        return { loan: updatedLoan };
      },
      {
        maxWait: 5000,
        timeout: 10000,
      },
    );

    res.json({
      success: true,
      message: "Item marked as returned successfully",
      loan: result.loan,
    });
  } catch (error) {
    console.error("Error marking item as returned:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to mark item as returned";
    res.status(500).json({ error: errorMessage });
  }
}
