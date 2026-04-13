import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const { mockGetToken, mockOnMessage, mockPost, mockGetFirebaseMessaging } =
  vi.hoisted(() => ({
    mockGetToken: vi.fn(),
    mockOnMessage: vi.fn(),
    mockPost: vi.fn(),
    mockGetFirebaseMessaging: vi.fn(),
  }));

vi.mock("../../firebase", () => ({
  getFirebaseMessaging: mockGetFirebaseMessaging,
}));

vi.mock("firebase/messaging", () => ({
  getToken: mockGetToken,
  onMessage: mockOnMessage,
}));

vi.mock("../../utils/apiClient", () => ({
  default: {
    post: mockPost,
  },
}));

import { useNotifications } from "../useNotifications";

describe("useNotifications", () => {
  const originalNotification = globalThis.Notification;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Notification API
    Object.defineProperty(globalThis, "Notification", {
      value: {
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
      expect(mockPost).toHaveBeenCalledWith("/api/notifications/token", {
        token: "fcm-token-123",
      });
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
    (
      globalThis.Notification as unknown as {
        requestPermission: ReturnType<typeof vi.fn>;
      }
    ).requestPermission = vi.fn().mockResolvedValue("denied");

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
});
