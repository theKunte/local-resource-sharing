import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockGet = vi.fn();

vi.mock("../../utils/apiClient", () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
  },
}));

// We need to re-import after mock because the module has module-level state
// Reset module state between tests
let useActionableCount: any;

describe("useActionableCount", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Re-import to reset module-level state
    vi.resetModules();
    const mod = await import("../useActionableCount");
    useActionableCount = mod.useActionableCount;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 when userId is undefined", () => {
    const { result } = renderHook(() => useActionableCount(undefined));
    expect(result.current).toBe(0);
  });

  it("fetches count for a given userId", async () => {
    mockGet.mockResolvedValue({
      data: {
        requests: [
          { status: "PENDING", loan: null },
          { status: "APPROVED", loan: { status: "ACTIVE" } },
          {
            status: "APPROVED",
            loan: { status: "PENDING_RETURN_CONFIRMATION" },
          },
        ],
      },
    });

    const { result } = renderHook(() => useActionableCount("user-1"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // PENDING + PENDING_RETURN_CONFIRMATION = 2 actionable
    expect(result.current).toBe(2);
  });

  it("returns 0 when no actionable requests", async () => {
    mockGet.mockResolvedValue({
      data: {
        requests: [
          { status: "APPROVED", loan: { status: "ACTIVE" } },
          { status: "REJECTED", loan: null },
        ],
      },
    });

    const { result } = renderHook(() => useActionableCount("user-1"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current).toBe(0);
  });

  it("handles fetch error gracefully", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGet.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useActionableCount("user-1"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current).toBe(0);
    warnSpy.mockRestore();
  });
});
