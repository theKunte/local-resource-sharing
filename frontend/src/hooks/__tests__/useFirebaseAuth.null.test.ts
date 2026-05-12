import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Mock firebase as null (not initialized)
vi.mock("../../firebase", () => ({
  auth: null,
}));

// Mock firebase/auth functions (won't be called but need to exist)
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

// Mock apiClient
vi.mock("../../utils/apiClient", () => ({
  default: {
    post: vi.fn(),
  },
}));

import { useFirebaseAuth } from "../useFirebaseAuth";

describe("useFirebaseAuth - null auth (Firebase not initialized)", () => {
  it("handles null auth gracefully", async () => {
    const { result } = renderHook(() => useFirebaseAuth());

    // When auth is null, useEffect immediately sets loading to false
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // User should remain null
    expect(result.current.user).toBeNull();
  });

  it("signInWithGoogle returns false when auth is null", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useFirebaseAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const success = await result.current.signInWithGoogle();

    expect(success).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith("Firebase auth not initialized");

    consoleSpy.mockRestore();
  });

  it("signOutUser does nothing when auth is null", async () => {
    const { result } = renderHook(() => useFirebaseAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not throw
    await expect(result.current.signOutUser()).resolves.toBeUndefined();
  });
});
