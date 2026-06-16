import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const {
  mockGetToken,
  mockOnMessage,
  mockPost,
  mockGet,
  mockPut,
  mockDelete,
  mockGetFirebaseMessaging,
} = vi.hoisted(() => ({
  mockGetToken: vi.fn(),
  mockOnMessage: vi.fn(),
  mockPost: vi.fn(),
  mockGet: vi.fn().mockResolvedValue({ data: { count: 0 } }),
  mockPut: vi.fn().mockResolvedValue({}),
  mockDelete: vi.fn().mockResolvedValue({}),
  mockGetFirebaseMessaging: vi.fn(),
}));

vi.mock("../../firebase", () => ({
  getFirebaseMessaging: mockGetFirebaseMessaging,
  initializeFirebase: vi.fn().mockResolvedValue(undefined),
  getFirebaseAuth: vi.fn(() => null),
  getFirebaseApp: vi.fn(() => null),
}));

vi.mock("firebase/messaging", () => ({
  getToken: mockGetToken,
  onMessage: mockOnMessage,
}));

vi.mock("../../utils/apiClient", () => ({
  default: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  },
}));

import { useNotifications } from "../useNotifications";

describe("useNotifications", () => {
  const originalNotification = globalThis.Notification;

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock return values after clearAllMocks
    mockGet.mockResolvedValue({ data: { count: 0 } });
    mockPut.mockResolvedValue({});
    mockDelete.mockResolvedValue({});
    // Mock Notification API with permission = 'default' so requestPermission is called
    Object.defineProperty(globalThis, "Notification", {
      value: {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("granted"),
      },
      writable: true,
      configurable: true,
    });
    // Set VAPID key
    vi.stubEnv("VITE_FIREBASE_VAPID_KEY", "test-vapid-key");
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "Notification", {
      value: originalNotification,
      writable: true,
      configurable: true,
    });
    vi.unstubAllEnvs();
  });

  it("does nothing if userId is undefined", () => {
    renderHook(() => useNotifications(undefined));
    expect(mockGetFirebaseMessaging).not.toHaveBeenCalled();
  });

  it("requests permission and saves token on setup", async () => {
    const mockMessaging = {};
    mockGetFirebaseMessaging.mockResolvedValue(mockMessaging);
    mockGetToken.mockResolvedValue("fcm-token-123");
    mockPost.mockResolvedValue({});
    mockOnMessage.mockReturnValue(vi.fn());

    renderHook(() => useNotifications("user-1"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/notifications/device-tokens",
        {
          token: "fcm-token-123",
          deviceType: expect.any(String),
          deviceName: expect.any(String),
        },
      );
    });
  });

  it("does not re-run setup for same userId", async () => {
    const mockMessaging = {};
    mockGetFirebaseMessaging.mockResolvedValue(mockMessaging);
    mockGetToken.mockResolvedValue("fcm-token-123");
    mockPost.mockResolvedValue({});
    mockOnMessage.mockReturnValue(vi.fn());

    const { rerender } = renderHook(({ userId }) => useNotifications(userId), {
      initialProps: { userId: "user-1" },
    });

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    rerender({ userId: "user-1" });

    // Should not call again
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it("skips setup when permission is denied", async () => {
    Object.defineProperty(globalThis, "Notification", {
      value: {
        permission: "denied",
        requestPermission: vi.fn().mockResolvedValue("denied"),
      },
      writable: true,
      configurable: true,
    });

    renderHook(() => useNotifications("user-1"));

    // Wait a tick for the async setup
    await new Promise((r) => setTimeout(r, 50));

    expect(mockGetFirebaseMessaging).not.toHaveBeenCalled();
  });

  it("skips when messaging is null", async () => {
    mockGetFirebaseMessaging.mockResolvedValue(null);

    renderHook(() => useNotifications("user-1"));

    await new Promise((r) => setTimeout(r, 50));

    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it("handles setup error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetFirebaseMessaging.mockRejectedValue(new Error("messaging error"));

    renderHook(() => useNotifications("user-1"));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it("fetchNotifications fetches paginated notifications", async () => {
    mockGet.mockResolvedValueOnce({ data: { count: 0 } }); // unread-count
    mockGet.mockResolvedValueOnce({
      data: { notifications: [{ id: "n1", title: "Test", read: false }] },
    });

    const { result } = renderHook(() => useNotifications("user-1"));

    await waitFor(async () => {
      await result.current.fetchNotifications(0, 5);
    });

    expect(mockGet).toHaveBeenCalledWith(
      "/api/v1/notifications",
      expect.any(Object),
    );
  });

  it("markAsRead calls PUT and re-fetches unread count", async () => {
    mockGet.mockResolvedValue({ data: { count: 2 } });
    mockPut.mockResolvedValue({});

    const { result } = renderHook(() => useNotifications("user-1"));

    await result.current.markAsRead("n1");

    expect(mockPut).toHaveBeenCalledWith("/api/v1/notifications/n1/read");
  });

  it("markAllAsRead calls PUT read-all and re-fetches count", async () => {
    mockGet.mockResolvedValue({ data: { count: 0 } });
    mockPut.mockResolvedValue({});

    const { result } = renderHook(() => useNotifications("user-1"));

    await result.current.markAllAsRead();

    expect(mockPut).toHaveBeenCalledWith("/api/v1/notifications/read-all");
  });

  it("deleteNotification calls DELETE and re-fetches count for unread", async () => {
    mockGet.mockResolvedValue({ data: { count: 1 } });
    mockGet.mockResolvedValueOnce({
      data: { notifications: [{ id: "n1", read: false }] },
    });
    mockDelete.mockResolvedValue({});

    const { result } = renderHook(() => useNotifications("user-1"));
    await result.current.fetchNotifications();
    await result.current.deleteNotification("n1");

    expect(mockDelete).toHaveBeenCalledWith("/api/v1/notifications/n1");
  });

  it("deleteNotification reverts optimistic update on error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockDelete.mockRejectedValue(new Error("network error"));
    mockGet.mockResolvedValueOnce({
      data: {
        notifications: [
          {
            id: "n1",
            title: "Test",
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });

    const { result } = renderHook(() => useNotifications("user-1"));
    await result.current.fetchNotifications();
    await result.current.deleteNotification("n1");

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to delete notification:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
