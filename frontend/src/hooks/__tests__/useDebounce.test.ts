/**
 * Tests for useDebounce hook
 */
import { renderHook } from "@testing-library/react";
import { useDebounce } from "../useDebounce";
import { act } from "react";
import { vi } from "vitest";

describe("useDebounce Hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe("Basic Functionality", () => {
    it("should return initial value immediately", () => {
      const { result } = renderHook(() => useDebounce("initial", 300));

      expect(result.current).toBe("initial");
    });

    it("should debounce value changes", () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: "initial", delay: 300 },
        },
      );

      expect(result.current).toBe("initial");

      // Update value
      rerender({ value: "updated", delay: 300 });

      // Should still be initial before delay
      expect(result.current).toBe("initial");

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should now be updated
      expect(result.current).toBe("updated");
    });

    it("should cancel previous timeout on rapid changes", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: "v1" },
        },
      );

      expect(result.current).toBe("v1");

      // Rapid updates
      rerender({ value: "v2" });
      act(() => vi.advanceTimersByTime(100));

      rerender({ value: "v3" });
      act(() => vi.advanceTimersByTime(100));

      rerender({ value: "v4" });
      act(() => vi.advanceTimersByTime(100));

      // Should still be v1 (300ms hasn't passed since last change)
      expect(result.current).toBe("v1");

      // Now complete the delay
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Should be v4 (last value)
      expect(result.current).toBe("v4");
    });
  });

  describe("Delay Configuration", () => {
    it("should use default delay of 300ms", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value),
        {
          initialProps: { value: "initial" },
        },
      );

      rerender({ value: "updated" });

      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(result.current).toBe("initial");

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe("updated");
    });

    it("should respect custom delay", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        {
          initialProps: { value: "initial" },
        },
      );

      rerender({ value: "updated" });

      act(() => {
        vi.advanceTimersByTime(499);
      });
      expect(result.current).toBe("initial");

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe("updated");
    });

    it("should handle very short delay (50ms)", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 50),
        {
          initialProps: { value: "initial" },
        },
      );

      rerender({ value: "updated" });

      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(result.current).toBe("updated");
    });

    it("should handle very long delay (5000ms)", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 5000),
        {
          initialProps: { value: "initial" },
        },
      );

      rerender({ value: "updated" });

      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(result.current).toBe("initial");

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe("updated");
    });

    it("should handle delay change", () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: "initial", delay: 300 },
        },
      );

      rerender({ value: "updated", delay: 500 });

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe("initial"); // Still waiting

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe("updated");
    });
  });

  describe("Type Safety", () => {
    it("should work with string values", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: "test string" },
        },
      );

      expect(result.current).toBe("test string");
      rerender({ value: "new string" });

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe("new string");
    });

    it("should work with number values", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: 42 },
        },
      );

      expect(result.current).toBe(42);
      rerender({ value: 100 });

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe(100);
    });

    it("should work with boolean values", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: true },
        },
      );

      expect(result.current).toBe(true);
      rerender({ value: false });

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe(false);
    });

    it("should work with array values", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: ["a", "b"] },
        },
      );

      expect(result.current).toEqual(["a", "b"]);
      rerender({ value: ["c", "d"] });

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toEqual(["c", "d"]);
    });

    it("should work with object values", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: { key: "value" } },
        },
      );

      expect(result.current).toEqual({ key: "value" });
      rerender({ value: { key: "new value" } });

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toEqual({ key: "new value" });
    });
  });

  describe("Search Input Use Case", () => {
    it("should simulate typing in search box", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: "" },
        },
      );

      // User types "camping" letter by letter
      const searchSequence = [
        "c",
        "ca",
        "cam",
        "camp",
        "campi",
        "campin",
        "camping",
      ];

      searchSequence.forEach((partialSearch) => {
        rerender({ value: partialSearch });
        act(() => {
          vi.advanceTimersByTime(50); // Simulate typing delay
        });
        // Should still be empty string until 300ms after last keystroke
        expect(result.current).toBe("");
      });

      // Wait for debounce to complete
      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current).toBe("camping");
    });

    it("should prevent excessive API calls during typing", () => {
      const apiCallSpy = vi.fn();
      const { rerender } = renderHook(
        ({ value }) => {
          const debouncedValue = useDebounce(value, 300);
          // Simulate API call when debounced value changes
          if (debouncedValue) {
            apiCallSpy(debouncedValue);
          }
          return debouncedValue;
        },
        {
          initialProps: { value: "" },
        },
      );

      // Type 10 characters quickly
      for (let i = 1; i <= 10; i++) {
        rerender({ value: "a".repeat(i) });
        act(() => {
          vi.advanceTimersByTime(50);
        });
      }

      // API should not have been called yet
      expect(apiCallSpy).not.toHaveBeenCalled();

      // Complete debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // API should be called exactly once with final value
      expect(apiCallSpy).toHaveBeenCalledTimes(1);
      expect(apiCallSpy).toHaveBeenCalledWith("aaaaaaaaaa");
    });
  });

  describe("Cleanup and Memory Leaks", () => {
    it("should cleanup timeout on unmount", () => {
      const { unmount, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: "initial" },
        },
      );

      rerender({ value: "updated" });

      // Unmount before debounce completes
      unmount();

      // Timer should be cleared (no error)
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // No assertions needed - just ensuring no errors/warnings
    });

    it("should handle multiple rapid updates and cleanup", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: "v1" },
        },
      );

      // 100 rapid updates
      for (let i = 2; i <= 100; i++) {
        rerender({ value: `v${i}` });
      }

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should have final value
      expect(result.current).toBe("v100");
    });
  });

  describe("Edge Cases", () => {
    it("should handle null value", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: null as string | null },
        },
      );

      expect(result.current).toBeNull();
      rerender({ value: "not null" });

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe("not null");
    });

    it("should handle undefined value", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: undefined as string | undefined },
        },
      );

      expect(result.current).toBeUndefined();
      rerender({ value: "defined" });

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe("defined");
    });

    it("should handle empty string transitions", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: "text" },
        },
      );

      rerender({ value: "" });

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe("");
    });

    it("should handle same value updates", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: "same" },
        },
      );

      rerender({ value: "same" });

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe("same");
    });
  });
});
