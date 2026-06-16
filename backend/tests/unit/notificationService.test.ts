const mockSend = jest.fn();
jest.mock("firebase-admin", () => ({
  __esModule: true,
  default: { messaging: jest.fn(() => ({ send: mockSend })) },
}));

const mockPrisma = {
  notification: {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  notificationPreference: {
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  deviceToken: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};
jest.mock("../../src/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}));

import NotificationService from "../../src/services/NotificationService";

describe("NotificationService", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── send ───────────────────────────────────────────────────────────
  describe("send", () => {
    it("saves in-app notification and sends push when tokens exist", async () => {
      mockPrisma.notification.create.mockResolvedValue({ id: "n1" });
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.deviceToken.findMany.mockResolvedValue([
        { id: "dt1", token: "tok" },
      ]);
      mockSend.mockResolvedValue("msg-id");

      const result = await NotificationService.send({
        userId: "u1",
        type: "borrow_request",
        title: "Test",
        body: "Hello",
      });

      expect(result.saved).toBe(true);
      expect(result.pushSent).toBe(true);
      expect(result.devicesReached).toBe(1);
    });

    it("returns saved=true pushSent=false when no device tokens", async () => {
      mockPrisma.notification.create.mockResolvedValue({ id: "n1" });
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await NotificationService.send({
        userId: "u1",
        type: "borrow_request",
        title: "Test",
        body: "Hello",
      });

      expect(result.saved).toBe(true);
      expect(result.pushSent).toBe(false);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("cleans up invalid device tokens after failed push", async () => {
      mockPrisma.notification.create.mockResolvedValue({ id: "n1" });
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.deviceToken.findMany.mockResolvedValue([
        { id: "dt1", token: "bad-token" },
      ]);
      const err = Object.assign(new Error("invalid"), {
        code: "messaging/invalid-registration-token",
      });
      mockSend.mockRejectedValue(err);

      await NotificationService.send({
        userId: "u1",
        type: "borrow_request",
        title: "Test",
        body: "Hello",
      });

      expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["dt1"] } },
      });
    });

    it("handles prisma create failure gracefully", async () => {
      mockPrisma.notification.create.mockRejectedValue(new Error("db error"));
      jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await NotificationService.send({
        userId: "u1",
        type: "borrow_request",
        title: "Test",
        body: "Hello",
      });

      expect(result.saved).toBe(false);
      jest.restoreAllMocks();
    });
  });

  // ── getUnreadCount ─────────────────────────────────────────────────
  describe("getUnreadCount", () => {
    it("returns count from prisma", async () => {
      mockPrisma.notification.count.mockResolvedValue(7);
      const count = await NotificationService.getUnreadCount("u1");
      expect(count).toBe(7);
    });

    it("returns 0 on error", async () => {
      mockPrisma.notification.count.mockRejectedValue(new Error("db"));
      jest.spyOn(console, "error").mockImplementation(() => {});
      const count = await NotificationService.getUnreadCount("u1");
      expect(count).toBe(0);
      jest.restoreAllMocks();
    });
  });

  // ── getNotifications ───────────────────────────────────────────────
  describe("getNotifications", () => {
    it("returns paginated notifications", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([{ id: "n1" }]);
      mockPrisma.notification.count.mockResolvedValue(1);
      const result = await NotificationService.getNotifications("u1", {
        skip: 0,
        take: 10,
      });
      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("filters unread when includeRead=false", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);
      await NotificationService.getNotifications("u1", { includeRead: false });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ read: false }),
        }),
      );
    });

    it("returns empty on error", async () => {
      mockPrisma.notification.findMany.mockRejectedValue(new Error("db"));
      jest.spyOn(console, "error").mockImplementation(() => {});
      const result = await NotificationService.getNotifications("u1");
      expect(result.notifications).toHaveLength(0);
      jest.restoreAllMocks();
    });
  });

  // ── markAsRead ─────────────────────────────────────────────────────
  describe("markAsRead", () => {
    it("returns true on success", async () => {
      mockPrisma.notification.update.mockResolvedValue({});
      expect(await NotificationService.markAsRead("n1", "u1")).toBe(true);
    });

    it("returns false on error", async () => {
      mockPrisma.notification.update.mockRejectedValue(new Error("not found"));
      jest.spyOn(console, "error").mockImplementation(() => {});
      expect(await NotificationService.markAsRead("n1", "u1")).toBe(false);
      jest.restoreAllMocks();
    });
  });

  // ── markAllAsRead ──────────────────────────────────────────────────
  describe("markAllAsRead", () => {
    it("returns count of updated notifications", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });
      expect(await NotificationService.markAllAsRead("u1")).toBe(3);
    });

    it("returns 0 on error", async () => {
      mockPrisma.notification.updateMany.mockRejectedValue(new Error("db"));
      jest.spyOn(console, "error").mockImplementation(() => {});
      expect(await NotificationService.markAllAsRead("u1")).toBe(0);
      jest.restoreAllMocks();
    });
  });

  // ── deleteNotification ─────────────────────────────────────────────
  describe("deleteNotification", () => {
    it("returns true on success", async () => {
      mockPrisma.notification.delete.mockResolvedValue({});
      expect(await NotificationService.deleteNotification("n1", "u1")).toBe(
        true,
      );
    });

    it("returns false on error", async () => {
      mockPrisma.notification.delete.mockRejectedValue(new Error("not found"));
      jest.spyOn(console, "error").mockImplementation(() => {});
      expect(await NotificationService.deleteNotification("n1", "u1")).toBe(
        false,
      );
      jest.restoreAllMocks();
    });
  });

  // ── registerDeviceToken ────────────────────────────────────────────
  describe("registerDeviceToken", () => {
    it("returns true on success", async () => {
      mockPrisma.deviceToken.upsert.mockResolvedValue({});
      expect(
        await NotificationService.registerDeviceToken("u1", "tok", "web"),
      ).toBe(true);
    });

    it("returns false on error", async () => {
      mockPrisma.deviceToken.upsert.mockRejectedValue(new Error("db"));
      jest.spyOn(console, "error").mockImplementation(() => {});
      expect(
        await NotificationService.registerDeviceToken("u1", "tok", "web"),
      ).toBe(false);
      jest.restoreAllMocks();
    });
  });

  // ── unregisterDeviceToken ──────────────────────────────────────────
  describe("unregisterDeviceToken", () => {
    it("returns true when deleted by id without userId", async () => {
      mockPrisma.deviceToken.delete.mockResolvedValue({});
      expect(await NotificationService.unregisterDeviceToken("dt1")).toBe(true);
    });

    it("returns true when deleted by token+userId", async () => {
      mockPrisma.deviceToken.delete.mockResolvedValue({});
      expect(await NotificationService.unregisterDeviceToken("tok", "u1")).toBe(
        true,
      );
    });

    it("returns false on error", async () => {
      mockPrisma.deviceToken.delete.mockRejectedValue(new Error("not found"));
      jest.spyOn(console, "error").mockImplementation(() => {});
      expect(await NotificationService.unregisterDeviceToken("dt1")).toBe(
        false,
      );
      jest.restoreAllMocks();
    });
  });

  // ── getUserDevices ─────────────────────────────────────────────────
  describe("getUserDevices", () => {
    it("returns list of devices", async () => {
      mockPrisma.deviceToken.findMany.mockResolvedValue([
        { id: "dt1", token: "tok" },
      ]);
      const devices = await NotificationService.getUserDevices("u1");
      expect(devices).toHaveLength(1);
    });

    it("returns empty array on error", async () => {
      mockPrisma.deviceToken.findMany.mockRejectedValue(new Error("db"));
      jest.spyOn(console, "error").mockImplementation(() => {});
      expect(await NotificationService.getUserDevices("u1")).toEqual([]);
      jest.restoreAllMocks();
    });
  });

  // ── getPreferences ─────────────────────────────────────────────────
  describe("getPreferences", () => {
    it("returns existing preferences", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        pushEnabled: true,
      });
      const prefs = await NotificationService.getPreferences("u1");
      expect(prefs).toEqual({ pushEnabled: true });
    });

    it("creates preferences when none exist", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notificationPreference.create.mockResolvedValue({
        pushEnabled: true,
      });
      const prefs = await NotificationService.getPreferences("u1");
      expect(mockPrisma.notificationPreference.create).toHaveBeenCalled();
      expect(prefs).toEqual({ pushEnabled: true });
    });

    it("returns null on error", async () => {
      mockPrisma.notificationPreference.findUnique.mockRejectedValue(
        new Error("db"),
      );
      jest.spyOn(console, "error").mockImplementation(() => {});
      expect(await NotificationService.getPreferences("u1")).toBeNull();
      jest.restoreAllMocks();
    });
  });

  // ── updatePreferences ──────────────────────────────────────────────
  describe("updatePreferences", () => {
    it("returns true on success", async () => {
      mockPrisma.notificationPreference.upsert.mockResolvedValue({});
      expect(
        await NotificationService.updatePreferences("u1", {
          pushEnabled: false,
        }),
      ).toBe(true);
    });

    it("returns false on error", async () => {
      mockPrisma.notificationPreference.upsert.mockRejectedValue(
        new Error("db"),
      );
      jest.spyOn(console, "error").mockImplementation(() => {});
      expect(await NotificationService.updatePreferences("u1", {})).toBe(false);
      jest.restoreAllMocks();
    });
  });
});
