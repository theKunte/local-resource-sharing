import { Request, Response } from "express";

// Mock prisma before importing the controller
const mockPrisma = {
  user: { upsert: jest.fn(), findMany: jest.fn() },
  group: { create: jest.fn() },
  groupMember: { findMany: jest.fn(), updateMany: jest.fn() },
};
jest.mock("../../src/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}));

import {
  registerUser,
  debugListUsers,
} from "../../src/controllers/authController";

function mockReqRes(body = {}, params = {}, query = {}) {
  const req = {
    body,
    params,
    query,
    user: { uid: "user-123" },
  } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return { req, res };
}

describe("authController", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("registerUser", () => {
    it("returns 400 when uid is missing", async () => {
      const { req, res } = mockReqRes({ email: "a@b.com" });
      await registerUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 403 when uid does not match authenticated user", async () => {
      const { req, res } = mockReqRes({ uid: "other-user" });
      await registerUser(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("registers a new user successfully", async () => {
      const user = { id: "user-123", email: "a@b.com", name: "Test" };
      mockPrisma.user.upsert.mockResolvedValue(user);
      mockPrisma.groupMember.findMany.mockResolvedValue([{ groupId: "g1" }]);

      const { req, res } = mockReqRes({
        uid: "user-123",
        email: "a@b.com",
        name: "Test",
      });
      await registerUser(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, user }),
      );
    });

    it("creates a default group when user has no groups", async () => {
      const user = { id: "user-123", email: "a@b.com", name: "Test" };
      mockPrisma.user.upsert.mockResolvedValue(user);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);
      mockPrisma.group.create.mockResolvedValue({
        id: "new-group",
        name: "My Friends",
      });
      mockPrisma.groupMember.updateMany.mockResolvedValue({ count: 1 });

      const { req, res } = mockReqRes({ uid: "user-123", email: "a@b.com" });
      await registerUser(req, res);

      expect(mockPrisma.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "My Friends" }),
        }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.user.upsert.mockRejectedValue(new Error("DB error"));
      jest.spyOn(console, "error").mockImplementation();

      const { req, res } = mockReqRes({ uid: "user-123" });
      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  describe("debugListUsers", () => {
    it("returns 404 in production", async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const { req, res } = mockReqRes();
      await debugListUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      process.env.NODE_ENV = origEnv;
    });

    it("returns users in development", async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const users = [{ id: "u1", email: "a@b.com", name: "A" }];
      mockPrisma.user.findMany.mockResolvedValue(users);

      const { req, res } = mockReqRes();
      await debugListUsers(req, res);

      expect(res.json).toHaveBeenCalledWith(users);
      process.env.NODE_ENV = origEnv;
    });
  });
});
