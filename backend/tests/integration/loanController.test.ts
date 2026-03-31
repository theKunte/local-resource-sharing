import { Request, Response } from "express";

const mockPrisma = {
  loan: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  resource: { update: jest.fn() },
  borrowRequest: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};
jest.mock("../../src/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}));
jest.mock("../../src/utils/notifications", () => ({
  notifyReturnRequested: jest.fn(),
  notifyReturnConfirmed: jest.fn(),
}));

import {
  requestReturn,
  confirmReturn,
  markReturned,
} from "../../src/controllers/loanController";

function mockReqRes(body: any = {}, params: any = {}) {
  const req = {
    body,
    params,
    query: {},
    user: { uid: "user-123" },
    headers: {},
  } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return { req, res };
}

describe("loanController", () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── requestReturn ────────────────────────────────────────────
  describe("requestReturn", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({}, { id: "l1" });
      await requestReturn(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "userId is required" }),
      );
    });

    it("returns 404 when loan not found", async () => {
      mockPrisma.loan.findUnique.mockResolvedValue(null);
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "l1" });
      await requestReturn(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user is not the borrower", async () => {
      mockPrisma.loan.findUnique.mockResolvedValue({
        id: "l1",
        borrowerId: "other-user",
        lenderId: "owner-1",
        status: "ACTIVE",
        resource: {
          id: "r1",
          title: "Drill",
          description: "",
          image: null,
          status: "BORROWED",
        },
        borrower: { id: "other-user", email: "b@b.com", name: "B" },
        lender: { id: "owner-1", email: "o@b.com", name: "O" },
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "l1" });
      await requestReturn(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when loan is not ACTIVE", async () => {
      mockPrisma.loan.findUnique.mockResolvedValue({
        id: "l1",
        borrowerId: "user-123",
        lenderId: "owner-1",
        status: "RETURNED",
        resource: {
          id: "r1",
          title: "Drill",
          description: "",
          image: null,
          status: "AVAILABLE",
        },
        borrower: { id: "user-123", email: "b@b.com", name: "B" },
        lender: { id: "owner-1", email: "o@b.com", name: "O" },
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "l1" });
      await requestReturn(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Invalid loan status" }),
      );
    });

    it("requests return successfully via transaction", async () => {
      mockPrisma.loan.findUnique.mockResolvedValue({
        id: "l1",
        borrowerId: "user-123",
        lenderId: "owner-1",
        status: "ACTIVE",
        resource: {
          id: "r1",
          title: "Drill",
          description: "",
          image: null,
          status: "BORROWED",
        },
        borrower: { id: "user-123", email: "b@b.com", name: "B" },
        lender: { id: "owner-1", email: "o@b.com", name: "O" },
      });

      const updatedLoan = {
        id: "l1",
        borrowerId: "user-123",
        lenderId: "owner-1",
        status: "PENDING_RETURN_CONFIRMATION",
        resource: {
          id: "r1",
          title: "Drill",
          description: "",
          image: null,
          status: "BORROWED",
        },
        borrower: { id: "user-123", email: "b@b.com", name: "B" },
        lender: { id: "owner-1", email: "o@b.com", name: "O" },
      };

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          loan: {
            findUnique: jest.fn().mockResolvedValue({ status: "ACTIVE" }),
            update: jest.fn().mockResolvedValue(updatedLoan),
          },
        };
        return fn(tx);
      });

      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "l1" });
      await requestReturn(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.loan.findUnique.mockRejectedValue(new Error("DB error"));
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "l1" });
      await requestReturn(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── confirmReturn ────────────────────────────────────────────
  describe("confirmReturn", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({}, { id: "l1" });
      await confirmReturn(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when loan not found", async () => {
      mockPrisma.loan.findUnique.mockResolvedValue(null);
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "l1" });
      await confirmReturn(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user is not the lender", async () => {
      mockPrisma.loan.findUnique.mockResolvedValue({
        id: "l1",
        borrowerId: "user-2",
        lenderId: "other-owner",
        status: "PENDING_RETURN_CONFIRMATION",
        resource: {
          id: "r1",
          title: "Drill",
          description: "",
          image: null,
          status: "BORROWED",
          currentLoanId: "l1",
        },
        borrower: { id: "user-2", email: "b@b.com", name: "B" },
        lender: { id: "other-owner", email: "o@b.com", name: "O" },
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "l1" });
      await confirmReturn(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when loan is not PENDING_RETURN_CONFIRMATION", async () => {
      mockPrisma.loan.findUnique.mockResolvedValue({
        id: "l1",
        borrowerId: "user-2",
        lenderId: "user-123",
        status: "ACTIVE",
        resource: {
          id: "r1",
          title: "Drill",
          description: "",
          image: null,
          status: "BORROWED",
          currentLoanId: "l1",
        },
        borrower: { id: "user-2", email: "b@b.com", name: "B" },
        lender: { id: "user-123", email: "o@b.com", name: "O" },
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "l1" });
      await confirmReturn(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 with specific message for already RETURNED loan", async () => {
      mockPrisma.loan.findUnique.mockResolvedValue({
        id: "l1",
        borrowerId: "user-2",
        lenderId: "user-123",
        status: "RETURNED",
        resource: {
          id: "r1",
          title: "Drill",
          description: "",
          image: null,
          status: "AVAILABLE",
          currentLoanId: null,
        },
        borrower: { id: "user-2", email: "b@b.com", name: "B" },
        lender: { id: "user-123", email: "o@b.com", name: "O" },
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "l1" });
      await confirmReturn(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "This loan has already been marked as returned",
        }),
      );
    });

    it("confirms return successfully via transaction", async () => {
      mockPrisma.loan.findUnique.mockResolvedValue({
        id: "l1",
        borrowerId: "user-2",
        lenderId: "user-123",
        status: "PENDING_RETURN_CONFIRMATION",
        resource: {
          id: "r1",
          title: "Drill",
          description: "",
          image: null,
          status: "BORROWED",
          currentLoanId: "l1",
        },
        borrower: { id: "user-2", email: "b@b.com", name: "B" },
        lender: { id: "user-123", email: "o@b.com", name: "O" },
      });

      const updatedLoan = {
        id: "l1",
        borrowerId: "user-2",
        lenderId: "user-123",
        status: "RETURNED",
        resource: { id: "r1", title: "Drill" },
        borrower: { id: "user-2", email: "b@b.com", name: "B" },
        lender: { id: "user-123", email: "o@b.com", name: "O" },
      };

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          loan: {
            findUnique: jest
              .fn()
              .mockResolvedValue({
                status: "PENDING_RETURN_CONFIRMATION",
                resourceId: "r1",
              }),
            update: jest.fn().mockResolvedValue(updatedLoan),
          },
          resource: { update: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "l1" });
      await confirmReturn(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Return confirmed successfully",
        }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.loan.findUnique.mockRejectedValue(new Error("DB error"));
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "l1" });
      await confirmReturn(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── markReturned (owner direct return) ───────────────────────
  describe("markReturned", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({}, { id: "br1" });
      await markReturned(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when borrow request not found", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue(null);
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await markReturned(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user is not the owner", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        ownerId: "other-owner",
        status: "APPROVED",
        loan: { id: "l1", status: "ACTIVE" },
        resource: { id: "r1" },
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await markReturned(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when request is not APPROVED or has no loan", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        ownerId: "user-123",
        status: "PENDING",
        loan: null,
        resource: { id: "r1" },
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await markReturned(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Invalid request status" }),
      );
    });

    it("returns 400 when loan is not ACTIVE", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        ownerId: "user-123",
        status: "APPROVED",
        loan: { id: "l1", status: "RETURNED" },
        resource: { id: "r1" },
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await markReturned(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Loan already completed" }),
      );
    });

    it("marks item as returned successfully via transaction", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        ownerId: "user-123",
        resourceId: "r1",
        status: "APPROVED",
        loan: { id: "l1", status: "ACTIVE" },
        resource: { id: "r1" },
      });

      const updatedLoan = {
        id: "l1",
        status: "RETURNED",
        borrower: { id: "user-2", email: "b@b.com", name: "B" },
        lender: { id: "user-123", email: "o@b.com", name: "O" },
      };

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          loan: {
            findUnique: jest.fn().mockResolvedValue({ status: "ACTIVE" }),
            update: jest.fn().mockResolvedValue(updatedLoan),
          },
          resource: { update: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await markReturned(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Item marked as returned successfully",
        }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.borrowRequest.findUnique.mockRejectedValue(
        new Error("DB error"),
      );
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await markReturned(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
