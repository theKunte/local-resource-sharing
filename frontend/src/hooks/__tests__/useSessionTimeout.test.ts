import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockSignOut = vi.fn();

vi.mock("../../firebase", () => ({
  auth: {
    currentUser: { uid: "u1" },
  },
}));

vi.mock("firebase/auth", () => ({
  signOut: (...args: any[]) => mockSignOut(...args),
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
});
