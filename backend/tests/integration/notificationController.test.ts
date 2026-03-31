import { Request, Response } from "express";

const mockPrisma = {
  user: { update: jest.fn() },
};
jest.mock("../../src/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}));

import { saveNotificationToken } from "../../src/controllers/notificationController";

function mockReqRes(body: any = {}, uid = "user-123") {
  const req = {
    body,
    params: {},
    query: {},
    user: { uid },
    headers: {},
  } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return { req, res };
}

describe("notificationController", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("saveNotificationToken", () => {
    it("returns 400 when token is missing", async () => {
      const { req, res } = mockReqRes({});
      await saveNotificationToken(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Valid token string is required" }),
      );
    });

    it("returns 400 when token is not a string", async () => {
      const { req, res } = mockReqRes({ token: 12345 });
      await saveNotificationToken(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("saves token successfully", async () => {
      mockPrisma.user.update.mockResolvedValue({});
      const { req, res } = mockReqRes({ token: "fcm-token-abc" });
      await saveNotificationToken(req, res);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { fcmToken: "fcm-token-abc" },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Notification token saved",
        }),
      );
    });

    it("returns 500 on database error", async () => {
      mockPrisma.user.update.mockRejectedValue(new Error("DB error"));
      const { req, res } = mockReqRes({ token: "fcm-token-abc" });
      await saveNotificationToken(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Failed to save notification token" }),
      );
    });
  });
});
