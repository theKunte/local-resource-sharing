import { describe, it, expect, vi } from "vitest";
import {
  getErrorMessage,
  isAuthError,
  isNetworkError,
  logError,
} from "../errorHandler";

describe("errorHandler", () => {
  describe("getErrorMessage", () => {
    it("returns default message for null/undefined", () => {
      expect(getErrorMessage(null)).toBe("An unexpected error occurred");
      expect(getErrorMessage(undefined)).toBe("An unexpected error occurred");
    });

    it("extracts response.data.message", () => {
      const err = {
        response: { data: { message: "Bad request" } },
        message: "Axios error",
      };
      expect(getErrorMessage(err)).toBe("Bad request");
    });

    it("extracts response.data.error when no message", () => {
      const err = {
        response: { data: { error: "Not found" } },
        message: "Axios error",
      };
      expect(getErrorMessage(err)).toBe("Not found");
    });

    it("falls back to error.message", () => {
      const err = { message: "Network Error" };
      expect(getErrorMessage(err)).toBe("Network Error");
    });

    it("returns default for unknown error shape", () => {
      expect(getErrorMessage({})).toBe("An unexpected error occurred");
    });
  });

  describe("isAuthError", () => {
    it("returns true for 401", () => {
      expect(isAuthError({ response: { status: 401 }, message: "" })).toBe(
        true,
      );
    });

    it("returns true for 403", () => {
      expect(isAuthError({ response: { status: 403 }, message: "" })).toBe(
        true,
      );
    });

    it("returns false for 500", () => {
      expect(isAuthError({ response: { status: 500 }, message: "" })).toBe(
        false,
      );
    });

    it("returns false when no response", () => {
      expect(isAuthError({ message: "err" })).toBe(false);
    });
  });

  describe("isNetworkError", () => {
    it("returns true when no response but has message", () => {
      expect(isNetworkError({ message: "Network Error" })).toBe(true);
    });

    it("returns false when response exists", () => {
      expect(
        isNetworkError({ response: { status: 500 }, message: "err" }),
      ).toBe(false);
    });
  });

  describe("logError", () => {
    it("logs in dev mode", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logError("TestContext", "some error");
      // In vitest, import.meta.env.DEV is true
      expect(spy).toHaveBeenCalledWith("[TestContext]", "some error");
      spy.mockRestore();
    });
  });
});
