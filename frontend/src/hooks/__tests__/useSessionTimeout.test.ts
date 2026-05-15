import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { mockSignOut, mockGetFirebaseAuth, mockAuth } = vi.hoisted(() => {
  const mockAuth = {
    currentUser: { uid: "u1" },
  };
  return {
    mockSignOut: vi.fn(),
    mockGetFirebaseAuth: vi.fn(),
    mockAuth,
  };
});

vi.mock("../../firebase", () => ({
  auth: mockAuth,
  getFirebaseAuth: mockGetFirebaseAuth,
  initializeFirebase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("firebase/auth", () => ({
  signOut: mockSignOut,
}));

vi.mock("../../config/session", () => ({
  SESSION_CONFIG: {
    TIMEOUT: 1000, // 1 second for fast tests
    WARNING_TIME: 500, // 500ms
    ACTIVITY_EVENTS: ["mousedown", "keydown"],
  },
}));

import { useSessionTimeout } from "../useSessionTimeout";

describe("useSessionTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
    mockGetFirebaseAuth.mockReturnValue(mockAuth);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initially showWarning is false", () => {
    const { result } = renderHook(() => useSessionTimeout());
    expect(result.current.showWarning).toBe(false);
  });

  it("shows warning before timeout", () => {
    const { result } = renderHook(() => useSessionTimeout());

    // Advance past warning time (TIMEOUT - WARNING_TIME = 500ms)
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current.showWarning).toBe(true);
  });

  it("calls signOut after full timeout", () => {
    renderHook(() => useSessionTimeout());

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("extendSession resets the warning", () => {
    const { result } = renderHook(() => useSessionTimeout());

    // Trigger warning
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.showWarning).toBe(true);

    // Extend
    act(() => {
      result.current.extendSession();
    });
    expect(result.current.showWarning).toBe(false);
  });

  it("logout calls signOut and hides warning", () => {
    const { result } = renderHook(() => useSessionTimeout());

    act(() => {
      result.current.logout();
    });

    expect(result.current.showWarning).toBe(false);
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("cleans up timers on unmount", () => {
    const { unmount } = renderHook(() => useSessionTimeout());

    unmount();

    // Should not call signOut after unmount even after timeout
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("handles signOut error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSignOut.mockRejectedValueOnce(new Error("signOut failed"));

    const { result } = renderHook(() => useSessionTimeout());

    await act(async () => {
      await result.current.logout();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error during session timeout logout:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("activity events trigger resetTimeout", () => {
    const { result } = renderHook(() => useSessionTimeout());

    // Advance to warning time (TIMEOUT - WARNING_TIME = 500ms)
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.showWarning).toBe(true);

    // Simulate user activity (mousedown event)
    act(() => {
      window.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    // Warning should be cleared because resetTimeout was called
    expect(result.current.showWarning).toBe(false);

    // Also test keydown event - advance to trigger warning again
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.showWarning).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    });

    expect(result.current.showWarning).toBe(false);
  });
});
