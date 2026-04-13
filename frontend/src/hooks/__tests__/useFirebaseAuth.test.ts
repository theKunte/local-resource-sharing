import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// We need to mock firebase and apiClient before importing the hook
const mockOnAuthStateChanged = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockSignOut = vi.fn();
const mockPost = vi.fn();

vi.mock("../../firebase", () => ({
  auth: {},
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: mockSignInWithPopup,
  signOut: mockSignOut,
  onAuthStateChanged: mockOnAuthStateChanged,
}));

vi.mock("../../utils/apiClient", () => ({
  default: {
    post: mockPost,
  },
}));

import { useFirebaseAuth } from "../useFirebaseAuth";

describe("useFirebaseAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChanged.mockImplementation(() => vi.fn()); // return unsubscribe
  });

  it("starts with loading=true and user=null", () => {
    const { result } = renderHook(() => useFirebaseAuth());
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it("sets user when auth state changes to logged-in user", async () => {
    const fakeUser = {
      uid: "u1",
      email: "test@example.com",
      displayName: "Test",
      photoURL: null,
      getIdToken: vi.fn().mockResolvedValue("token"),
    };

    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, callback: (user: unknown) => void) => {
        // Simulate async callback
        setTimeout(() => callback(fakeUser), 0);
        return vi.fn();
      },
    );
    mockPost.mockResolvedValue({});

    const { result } = renderHook(() => useFirebaseAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBe(fakeUser);
    expect(mockPost).toHaveBeenCalledWith("/api/auth/register", {
      uid: "u1",
      email: "test@example.com",
      name: "Test",
      photoURL: null,
    });
  });

  it("sets user to null when auth state changes to logged-out", async () => {
    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, callback: (user: unknown) => void) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      },
    );

    const { result } = renderHook(() => useFirebaseAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("handles auth state change error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockOnAuthStateChanged.mockImplementation(
      (
        _auth: unknown,
        _callback: unknown,
        errorCallback: (e: Error) => void,
      ) => {
        setTimeout(() => errorCallback(new Error("auth error")), 0);
        return vi.fn();
      },
    );

    const { result } = renderHook(() => useFirebaseAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("signInWithGoogle calls signInWithPopup and returns true on success", async () => {
    mockOnAuthStateChanged.mockImplementation(() => vi.fn());
    mockSignInWithPopup.mockResolvedValue({});

    const { result } = renderHook(() => useFirebaseAuth());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.signInWithGoogle();
    });

    expect(mockSignInWithPopup).toHaveBeenCalled();
    expect(success).toBe(true);
  });

  it("signInWithGoogle returns false on error", async () => {
    mockOnAuthStateChanged.mockImplementation(() => vi.fn());
    mockSignInWithPopup.mockRejectedValue(new Error("popup blocked"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(window, "alert").mockImplementation(() => {});

    const { result } = renderHook(() => useFirebaseAuth());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.signInWithGoogle();
    });

    expect(success).toBe(false);
  });

  it("signOutUser calls firebase signOut", async () => {
    mockOnAuthStateChanged.mockImplementation(() => vi.fn());
    mockSignOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useFirebaseAuth());

    await act(async () => {
      await result.current.signOutUser();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("handles backend registration failure gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fakeUser = {
      uid: "u1",
      email: "t@t.com",
      displayName: "T",
      photoURL: null,
    };

    mockPost.mockRejectedValue(new Error("server down"));
    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, callback: (user: unknown) => void) => {
        setTimeout(() => callback(fakeUser), 0);
        return vi.fn();
      },
    );

    const { result } = renderHook(() => useFirebaseAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // User should still be set even if backend registration fails
    expect(result.current.user).toBe(fakeUser);
    consoleSpy.mockRestore();
  });
});
