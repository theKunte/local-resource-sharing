import { Request, Response } from "express";

// Mock NotificationService before importing controller
const mockNotificationService = {
  registerDeviceToken: jest.fn(),
  getUserDevices: jest.fn(),
  unregisterDeviceToken: jest.fn(),
  getNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteNotification: jest.fn(),
  getPreferences: jest.fn(),
  updatePreferences: jest.fn(),
};

jest.mock("../../src/services/NotificationService", () => ({
  __esModule: true,
  default: mockNotificationService,
}));

const mockPrisma = {
  user: { update: jest.fn() },
};
jest.mock("../../src/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}));

import {
  saveNotificationToken,
  registerDeviceToken,
  getUserDevices,
  unregisterDeviceToken,
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../../src/controllers/notificationController";

// Helper to build mock req/res
function makeReqRes(
  body: Record<string, unknown> = {},
  params: Record<string, string> = {},
  query: Record<string, string> = {},
  uid = "user-1",
  headers: Record<string, string> = {},
) {
  const req = {
    user: { uid },
    body,
    params,
    query,
    headers,
  } as unknown as Request;
  const res = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return { req, res };
}

describe("notificationController", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── saveNotificationToken ──────────────────────────────────────────
  describe("saveNotificationToken", () => {
    it("returns 400 when token is missing", async () => {
      const { req, res } = makeReqRes({});
      await saveNotificationToken(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("saves token and returns success", async () => {
      mockPrisma.user.update.mockResolvedValue({});
      const { req, res } = makeReqRes({ token: "tok-123" });
      await saveNotificationToken(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 500 on prisma error", async () => {
      mockPrisma.user.update.mockRejectedValue(new Error("db error"));
      const { req, res } = makeReqRes({ token: "tok-123" });
      jest.spyOn(console, "error").mockImplementation(() => {});
      await saveNotificationToken(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  // ── registerDeviceToken ────────────────────────────────────────────
  describe("registerDeviceToken", () => {
    it("returns 400 when token missing", async () => {
      const { req, res } = makeReqRes({ deviceType: "web" });
      await registerDeviceToken(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when deviceType missing", async () => {
      const { req, res } = makeReqRes({ token: "t" });
      await registerDeviceToken(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns success when service succeeds", async () => {
      mockNotificationService.registerDeviceToken.mockResolvedValue(true);
      const { req, res } = makeReqRes({
        token: "t",
        deviceType: "web",
        deviceName: "Chrome",
      });
      await registerDeviceToken(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 500 when service returns false", async () => {
      mockNotificationService.registerDeviceToken.mockResolvedValue(false);
      const { req, res } = makeReqRes({ token: "t", deviceType: "web" });
      await registerDeviceToken(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("returns 500 on thrown error", async () => {
      mockNotificationService.registerDeviceToken.mockRejectedValue(
        new Error("fail"),
      );
      const { req, res } = makeReqRes({ token: "t", deviceType: "web" });
      jest.spyOn(console, "error").mockImplementation(() => {});
      await registerDeviceToken(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  // ── getUserDevices ─────────────────────────────────────────────────
  describe("getUserDevices", () => {
    it("returns devices list", async () => {
      mockNotificationService.getUserDevices.mockResolvedValue([{ id: "d1" }]);
      const { req, res } = makeReqRes();
      await getUserDevices(req, res);
      expect(res.json).toHaveBeenCalledWith({ devices: [{ id: "d1" }] });
    });

    it("returns 500 on error", async () => {
      mockNotificationService.getUserDevices.mockRejectedValue(
        new Error("fail"),
      );
      const { req, res } = makeReqRes();
      jest.spyOn(console, "error").mockImplementation(() => {});
      await getUserDevices(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  // ── unregisterDeviceToken ──────────────────────────────────────────
  describe("unregisterDeviceToken", () => {
    it("returns 400 when id missing", async () => {
      const { req, res } = makeReqRes({}, {});
      await unregisterDeviceToken(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns success when found", async () => {
      mockNotificationService.unregisterDeviceToken.mockResolvedValue(true);
      const { req, res } = makeReqRes({}, { id: "d1" });
      await unregisterDeviceToken(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 404 when not found", async () => {
      mockNotificationService.unregisterDeviceToken.mockResolvedValue(false);
      const { req, res } = makeReqRes({}, { id: "d1" });
      await unregisterDeviceToken(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 500 on error", async () => {
      mockNotificationService.unregisterDeviceToken.mockRejectedValue(
        new Error("fail"),
      );
      const { req, res } = makeReqRes({}, { id: "d1" });
      jest.spyOn(console, "error").mockImplementation(() => {});
      await unregisterDeviceToken(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  // ── getNotifications ───────────────────────────────────────────────
  describe("getNotifications", () => {
    it("returns notifications with defaults", async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        notifications: [],
        total: 0,
      });
      const { req, res } = makeReqRes({}, {}, {});
      await getNotifications(req, res);
      expect(res.json).toHaveBeenCalledWith({ notifications: [], total: 0 });
    });

    it("passes skip/take/includeRead/type from query", async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        notifications: [],
      });
      const { req, res } = makeReqRes(
        {},
        {},
        {
          skip: "10",
          take: "5",
          includeRead: "false",
          type: "borrow_request",
        },
      );
      await getNotifications(req, res);
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          skip: 10,
          take: 5,
          includeRead: false,
          type: "borrow_request",
        }),
      );
    });

    it("returns 500 on error", async () => {
      mockNotificationService.getNotifications.mockRejectedValue(
        new Error("fail"),
      );
      const { req, res } = makeReqRes();
      jest.spyOn(console, "error").mockImplementation(() => {});
      await getNotifications(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  // ── getUnreadCount ─────────────────────────────────────────────────
  describe("getUnreadCount", () => {
    it("returns count", async () => {
      mockNotificationService.getUnreadCount.mockResolvedValue(3);
      const { req, res } = makeReqRes();
      await getUnreadCount(req, res);
      expect(res.json).toHaveBeenCalledWith({ count: 3 });
    });

    it("returns 500 on error", async () => {
      mockNotificationService.getUnreadCount.mockRejectedValue(
        new Error("fail"),
      );
      const { req, res } = makeReqRes();
      jest.spyOn(console, "error").mockImplementation(() => {});
      await getUnreadCount(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  // ── markNotificationAsRead ─────────────────────────────────────────
  describe("markNotificationAsRead", () => {
    it("returns 400 when id missing", async () => {
      const { req, res } = makeReqRes({}, {});
      await markNotificationAsRead(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns success when found", async () => {
      mockNotificationService.markAsRead.mockResolvedValue(true);
      const { req, res } = makeReqRes({}, { id: "n1" });
      await markNotificationAsRead(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 404 when not found", async () => {
      mockNotificationService.markAsRead.mockResolvedValue(false);
      const { req, res } = makeReqRes({}, { id: "n1" });
      await markNotificationAsRead(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 500 on error", async () => {
      mockNotificationService.markAsRead.mockRejectedValue(new Error("fail"));
      const { req, res } = makeReqRes({}, { id: "n1" });
      jest.spyOn(console, "error").mockImplementation(() => {});
      await markNotificationAsRead(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  // ── markAllNotificationsAsRead ─────────────────────────────────────
  describe("markAllNotificationsAsRead", () => {
    it("returns count of marked notifications", async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue(5);
      const { req, res } = makeReqRes();
      await markAllNotificationsAsRead(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, count: 5 }),
      );
    });

    it("returns 500 on error", async () => {
      mockNotificationService.markAllAsRead.mockRejectedValue(
        new Error("fail"),
      );
      const { req, res } = makeReqRes();
      jest.spyOn(console, "error").mockImplementation(() => {});
      await markAllNotificationsAsRead(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  // ── deleteNotification ─────────────────────────────────────────────
  describe("deleteNotification", () => {
    it("returns 400 when id missing", async () => {
      const { req, res } = makeReqRes({}, {});
      await deleteNotification(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns success when found", async () => {
      mockNotificationService.deleteNotification.mockResolvedValue(true);
      const { req, res } = makeReqRes({}, { id: "n1" });
      await deleteNotification(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 404 when not found", async () => {
      mockNotificationService.deleteNotification.mockResolvedValue(false);
      const { req, res } = makeReqRes({}, { id: "n1" });
      await deleteNotification(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 500 on error", async () => {
      mockNotificationService.deleteNotification.mockRejectedValue(
        new Error("fail"),
      );
      const { req, res } = makeReqRes({}, { id: "n1" });
      jest.spyOn(console, "error").mockImplementation(() => {});
      await deleteNotification(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  // ── getNotificationPreferences ─────────────────────────────────────
  describe("getNotificationPreferences", () => {
    it("returns preferences", async () => {
      mockNotificationService.getPreferences.mockResolvedValue({
        pushEnabled: true,
      });
      const { req, res } = makeReqRes();
      await getNotificationPreferences(req, res);
      expect(res.json).toHaveBeenCalledWith({ pushEnabled: true });
    });

    it("returns 500 when service returns falsy", async () => {
      mockNotificationService.getPreferences.mockResolvedValue(null);
      const { req, res } = makeReqRes();
      await getNotificationPreferences(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("returns 500 on error", async () => {
      mockNotificationService.getPreferences.mockRejectedValue(
        new Error("fail"),
      );
      const { req, res } = makeReqRes();
      jest.spyOn(console, "error").mockImplementation(() => {});
      await getNotificationPreferences(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });

  // ── updateNotificationPreferences ──────────────────────────────────
  describe("updateNotificationPreferences", () => {
    it("returns success when updated", async () => {
      mockNotificationService.updatePreferences.mockResolvedValue(true);
      const { req, res } = makeReqRes({ pushEnabled: false });
      await updateNotificationPreferences(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("returns 500 when service returns false", async () => {
      mockNotificationService.updatePreferences.mockResolvedValue(false);
      const { req, res } = makeReqRes({});
      await updateNotificationPreferences(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("returns 500 on error", async () => {
      mockNotificationService.updatePreferences.mockRejectedValue(
        new Error("fail"),
      );
      const { req, res } = makeReqRes({});
      jest.spyOn(console, "error").mockImplementation(() => {});
      await updateNotificationPreferences(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      jest.restoreAllMocks();
    });
  });
});
