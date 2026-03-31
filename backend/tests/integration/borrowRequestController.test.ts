import { Request, Response } from "express";

// Local mock that mirrors the shared one but is accessible in this file
const mockPrisma = {
  resource: { findUnique: jest.fn(), update: jest.fn() },
  resourceSharing: { findFirst: jest.fn() },
  groupMember: { findFirst: jest.fn() },
  borrowRequest: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  loan: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock("../../src/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}));
jest.mock("../../src/utils/notifications", () => ({
  notifyNewBorrowRequest: jest.fn(),
  notifyRequestAccepted: jest.fn(),
  notifyRequestDeclined: jest.fn(),
}));

import {
  createBorrowRequest,
  getBorrowRequests,
  acceptBorrowRequest,
  declineBorrowRequest,
  cancelBorrowRequest,
  updateBorrowRequest,
  deleteBorrowRequest,
} from "../../src/controllers/borrowRequestController";

function mockReqRes(
  body: any = {},
  params: any = {},
  query: any = {},
  uid = "user-123",
) {
  const req = {
    body,
    params,
    query,
    user: { uid },
    headers: {},
  } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
  } as unknown as Response;
  return { req, res };
}

// Helper: future date string
function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

describe("borrowRequestController", () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── createBorrowRequest ───────────────────────────────────────
  describe("createBorrowRequest", () => {
    it("returns 400 when required fields are missing", async () => {
      const { req, res } = mockReqRes({ borrowerId: "user-123" });
      await createBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Missing required fields" }),
      );
    });

    it("returns 403 when borrowerId does not match authenticated user", async () => {
      const { req, res } = mockReqRes({
        resourceId: "r1",
        borrowerId: "other-user",
        startDate: futureDate(1),
        endDate: futureDate(5),
      });
      await createBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 for invalid date format", async () => {
      const { req, res } = mockReqRes({
        resourceId: "r1",
        borrowerId: "user-123",
        startDate: "not-a-date",
        endDate: futureDate(5),
      });
      await createBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Invalid date format" }),
      );
    });

    it("returns 400 when end date is before start date", async () => {
      const { req, res } = mockReqRes({
        resourceId: "r1",
        borrowerId: "user-123",
        startDate: futureDate(5),
        endDate: futureDate(1),
      });
      await createBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "End date must be after start date" }),
      );
    });

    it("returns 400 when loan duration exceeds 365 days", async () => {
      const { req, res } = mockReqRes({
        resourceId: "r1",
        borrowerId: "user-123",
        startDate: futureDate(1),
        endDate: futureDate(400),
      });
      await createBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Loan duration cannot exceed 365 days",
        }),
      );
    });

    it("returns 404 when resource not found", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue(null);
      const { req, res } = mockReqRes({
        resourceId: "r1",
        borrowerId: "user-123",
        startDate: futureDate(1),
        endDate: futureDate(5),
      });
      await createBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when borrowing own resource", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        id: "r1",
        ownerId: "user-123",
        owner: { id: "user-123", email: "a@b.com", name: "Owner" },
      });
      const { req, res } = mockReqRes({
        resourceId: "r1",
        borrowerId: "user-123",
        startDate: futureDate(1),
        endDate: futureDate(5),
      });
      await createBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "You cannot borrow your own resource",
        }),
      );
    });

    it("returns 403 when no suitable group found", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        id: "r1",
        ownerId: "owner-1",
        owner: { id: "owner-1", email: "o@b.com", name: "Owner" },
      });
      mockPrisma.resourceSharing.findFirst.mockResolvedValue(null);
      const { req, res } = mockReqRes({
        resourceId: "r1",
        borrowerId: "user-123",
        startDate: futureDate(1),
        endDate: futureDate(5),
      });
      await createBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "No suitable group found" }),
      );
    });

    it("returns 409 when overlapping active loans exist", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        id: "r1",
        ownerId: "owner-1",
        owner: { id: "owner-1", email: "o@b.com", name: "Owner" },
      });
      mockPrisma.resourceSharing.findFirst.mockResolvedValue({ groupId: "g1" });
      mockPrisma.loan.findMany.mockResolvedValue([
        { id: "l1", startDate: new Date(), endDate: new Date() },
      ]);

      const { req, res } = mockReqRes({
        resourceId: "r1",
        borrowerId: "user-123",
        startDate: futureDate(1),
        endDate: futureDate(5),
      });
      await createBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("creates borrow request successfully", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        id: "r1",
        ownerId: "owner-1",
        owner: { id: "owner-1", email: "o@b.com", name: "Owner" },
      });
      mockPrisma.resourceSharing.findFirst.mockResolvedValue({ groupId: "g1" });
      mockPrisma.loan.findMany.mockResolvedValue([]);
      mockPrisma.borrowRequest.findMany.mockResolvedValue([]);
      mockPrisma.borrowRequest.create.mockResolvedValue({
        id: "br1",
        resourceId: "r1",
        borrowerId: "user-123",
        ownerId: "owner-1",
        status: "PENDING",
        resource: { id: "r1", title: "Drill", description: "", image: null },
        borrower: { id: "user-123", email: "u@b.com", name: "User" },
        owner: { id: "owner-1", email: "o@b.com", name: "Owner" },
      });

      const { req, res } = mockReqRes({
        resourceId: "r1",
        borrowerId: "user-123",
        startDate: futureDate(1),
        endDate: futureDate(5),
      });
      await createBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          borrowRequest: expect.any(Object),
        }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.resource.findUnique.mockRejectedValue(new Error("DB error"));
      const { req, res } = mockReqRes({
        resourceId: "r1",
        borrowerId: "user-123",
        startDate: futureDate(1),
        endDate: futureDate(5),
      });
      await createBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("returns 403 when resource not shared with specified group", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        id: "r1",
        ownerId: "owner-1",
        owner: { id: "owner-1", email: "o@b.com", name: "Owner" },
      });
      mockPrisma.resourceSharing.findFirst.mockResolvedValue(null);

      const { req, res } = mockReqRes({
        resourceId: "r1",
        borrowerId: "user-123",
        groupId: "g1",
        startDate: futureDate(1),
        endDate: futureDate(5),
      });
      await createBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Resource not shared with this group",
        }),
      );
    });

    it("returns 403 when user is not a member of the specified group", async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({
        id: "r1",
        ownerId: "owner-1",
        owner: { id: "owner-1", email: "o@b.com", name: "Owner" },
      });
      mockPrisma.resourceSharing.findFirst.mockResolvedValue({ id: "rs1" });
      mockPrisma.groupMember.findFirst.mockResolvedValue(null);

      const { req, res } = mockReqRes({
        resourceId: "r1",
        borrowerId: "user-123",
        groupId: "g1",
        startDate: futureDate(1),
        endDate: futureDate(5),
      });
      await createBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Not a group member" }),
      );
    });
  });

  // ─── getBorrowRequests ─────────────────────────────────────────
  describe("getBorrowRequests", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({}, {}, {});
      await getBorrowRequests(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when role is missing or invalid", async () => {
      const { req, res } = mockReqRes({}, {}, { userId: "user-123" });
      await getBorrowRequests(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("role is required"),
        }),
      );
    });

    it("returns paginated borrow requests for owner role", async () => {
      mockPrisma.borrowRequest.count.mockResolvedValue(1);
      mockPrisma.borrowRequest.findMany.mockResolvedValue([
        {
          id: "br1",
          resourceId: "r1",
          borrowerId: "user-2",
          ownerId: "user-123",
          status: "PENDING",
          message: null,
          startDate: new Date(),
          endDate: new Date(),
          createdAt: new Date(),
          resource: {
            id: "r1",
            title: "Drill",
            description: "",
            image: null,
            status: "AVAILABLE",
            sharedWith: [
              {
                groupId: "g1",
                group: {
                  id: "g1",
                  name: "Group1",
                  description: null,
                  avatar: null,
                },
              },
            ],
          },
          borrower: {
            id: "user-2",
            email: "b@b.com",
            name: "Borrower",
            groupMembers: [{ groupId: "g1" }],
          },
          owner: { id: "user-123", email: "o@b.com", name: "Owner" },
          loan: null,
        },
      ]);

      const { req, res } = mockReqRes(
        {},
        {},
        { userId: "user-123", role: "owner" },
      );
      await getBorrowRequests(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          requests: expect.any(Array),
          pagination: expect.objectContaining({ total: 1 }),
        }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.borrowRequest.count.mockRejectedValue(new Error("DB error"));
      const { req, res } = mockReqRes(
        {},
        {},
        { userId: "user-123", role: "owner" },
      );
      await getBorrowRequests(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── acceptBorrowRequest ──────────────────────────────────────
  describe("acceptBorrowRequest", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({}, { id: "br1" });
      await acceptBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when borrow request not found", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue(null);
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await acceptBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user is not the owner", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        ownerId: "other-owner",
        status: "PENDING",
        resource: {},
        borrower: {},
        owner: {},
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await acceptBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when request is not PENDING", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        ownerId: "user-123",
        status: "APPROVED",
        resource: {},
        borrower: {},
        owner: {},
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await acceptBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 409 when overlapping active loans exist", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        ownerId: "user-123",
        borrowerId: "user-2",
        resourceId: "r1",
        status: "PENDING",
        startDate: new Date(),
        endDate: new Date(),
        resource: { id: "r1", title: "Drill" },
        borrower: { id: "user-2", email: "b@b.com", name: "B" },
        owner: { id: "user-123", email: "o@b.com", name: "O" },
      });
      mockPrisma.loan.findMany.mockResolvedValue([{ id: "l1" }]);

      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await acceptBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("accepts borrow request successfully via transaction", async () => {
      const borrowReq = {
        id: "br1",
        ownerId: "user-123",
        borrowerId: "user-2",
        resourceId: "r1",
        status: "PENDING",
        startDate: new Date(),
        endDate: new Date(),
        resource: { id: "r1", title: "Drill" },
        borrower: { id: "user-2", email: "b@b.com", name: "B" },
        owner: { id: "user-123", email: "o@b.com", name: "O" },
      };
      mockPrisma.borrowRequest.findUnique.mockResolvedValue(borrowReq);
      mockPrisma.loan.findMany.mockResolvedValue([]);

      const txResult = {
        loan: {
          id: "l1",
          borrower: {},
          lender: {},
          resource: { title: "Drill" },
        },
        updatedRequest: {
          ...borrowReq,
          status: "APPROVED",
          resource: { title: "Drill" },
          owner: { name: "O", email: "o@b.com" },
        },
        declinedCount: 0,
      };
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        if (typeof fn === "function") {
          // Simulate the transaction callback
          const tx = {
            borrowRequest: {
              findUnique: jest.fn().mockResolvedValue({ status: "PENDING" }),
              update: jest.fn().mockResolvedValue(txResult.updatedRequest),
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
            loan: { create: jest.fn().mockResolvedValue(txResult.loan) },
            resource: { update: jest.fn().mockResolvedValue({}) },
          };
          return fn(tx);
        }
        return txResult;
      });

      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await acceptBorrowRequest(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  // ─── declineBorrowRequest ─────────────────────────────────────
  describe("declineBorrowRequest", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({}, { id: "br1" });
      await declineBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when borrow request not found", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue(null);
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await declineBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user is not the owner", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        ownerId: "other-owner",
        status: "PENDING",
        resource: {},
        borrower: {},
        owner: {},
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await declineBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when request is not PENDING", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        ownerId: "user-123",
        status: "APPROVED",
        resource: {},
        borrower: {},
        owner: {},
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await declineBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("declines request successfully", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        ownerId: "user-123",
        borrowerId: "user-2",
        status: "PENDING",
        resource: { title: "Drill" },
        borrower: { id: "user-2", email: "b@b.com", name: "B" },
        owner: { id: "user-123", email: "o@b.com", name: "O" },
      });
      mockPrisma.borrowRequest.update.mockResolvedValue({
        id: "br1",
        status: "REJECTED",
        borrowerId: "user-2",
        resource: { title: "Drill" },
        borrower: { id: "user-2", email: "b@b.com", name: "B" },
        owner: { id: "user-123", email: "o@b.com", name: "O" },
      });

      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await declineBorrowRequest(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Borrow request declined",
        }),
      );
    });
  });

  // ─── cancelBorrowRequest ──────────────────────────────────────
  describe("cancelBorrowRequest", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({}, { id: "br1" });
      await cancelBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when borrow request not found", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue(null);
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await cancelBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user is not the borrower", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        borrowerId: "other-user",
        status: "PENDING",
        resource: {},
        borrower: {},
        owner: {},
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await cancelBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when request is not PENDING", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        borrowerId: "user-123",
        status: "APPROVED",
        resource: {},
        borrower: {},
        owner: {},
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await cancelBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("cancels request successfully", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        borrowerId: "user-123",
        status: "PENDING",
        resource: {},
        borrower: {},
        owner: {},
      });
      mockPrisma.borrowRequest.update.mockResolvedValue({
        id: "br1",
        status: "CANCELLED",
      });

      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await cancelBorrowRequest(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Borrow request cancelled",
        }),
      );
    });
  });

  // ─── updateBorrowRequest ──────────────────────────────────────
  describe("updateBorrowRequest", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({}, { id: "br1" });
      await updateBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when borrow request not found", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue(null);
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await updateBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user is not borrower or owner", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        borrowerId: "other",
        ownerId: "other-owner",
        status: "PENDING",
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await updateBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when request is not PENDING", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        borrowerId: "user-123",
        ownerId: "owner-1",
        status: "APPROVED",
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await updateBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when end date is before start date", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        borrowerId: "user-123",
        ownerId: "owner-1",
        status: "PENDING",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-10"),
      });
      const { req, res } = mockReqRes(
        { userId: "user-123", startDate: "2026-06-10", endDate: "2026-06-01" },
        { id: "br1" },
      );
      await updateBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("updates borrow request successfully", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        borrowerId: "user-123",
        ownerId: "owner-1",
        status: "PENDING",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-10"),
      });
      mockPrisma.borrowRequest.update.mockResolvedValue({
        id: "br1",
        status: "PENDING",
        resource: {},
        borrower: {},
        owner: {},
      });

      const { req, res } = mockReqRes(
        { userId: "user-123", message: "Updated message" },
        { id: "br1" },
      );
      await updateBorrowRequest(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Borrow request updated",
        }),
      );
    });
  });

  // ─── deleteBorrowRequest ──────────────────────────────────────
  describe("deleteBorrowRequest", () => {
    it("returns 400 when userId is missing", async () => {
      const { req, res } = mockReqRes({}, { id: "br1" });
      await deleteBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when borrow request not found", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue(null);
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await deleteBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when user is not borrower or owner", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        borrowerId: "other",
        ownerId: "other-owner",
        status: "PENDING",
        loan: null,
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await deleteBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when trying to delete approved request", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        borrowerId: "user-123",
        ownerId: "owner-1",
        status: "APPROVED",
        loan: { id: "l1" },
      });
      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await deleteBorrowRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deletes borrow request successfully", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        borrowerId: "user-123",
        ownerId: "owner-1",
        status: "PENDING",
        loan: null,
      });
      mockPrisma.borrowRequest.delete.mockResolvedValue({});

      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await deleteBorrowRequest(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Borrow request deleted",
        }),
      );
    });

    it("deletes associated loan before deleting request", async () => {
      mockPrisma.borrowRequest.findUnique.mockResolvedValue({
        id: "br1",
        borrowerId: "user-123",
        ownerId: "owner-1",
        status: "REJECTED",
        loan: { id: "l1" },
      });
      mockPrisma.loan.delete.mockResolvedValue({});
      mockPrisma.borrowRequest.delete.mockResolvedValue({});

      const { req, res } = mockReqRes({ userId: "user-123" }, { id: "br1" });
      await deleteBorrowRequest(req, res);
      expect(mockPrisma.loan.delete).toHaveBeenCalledWith({
        where: { id: "l1" },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });
});
