/**
 * Test Helpers for Firebase with Async Initialization
 *
 * This module provides utilities for testing components and hooks that use
 * the new async Firebase initialization pattern.
 */

import { vi } from "vitest";

/**
 * Creates a mock Firebase auth instance
 */
export function createMockAuth(overrides: Partial<any> = {}) {
  return {
    currentUser: null,
    onAuthStateChanged: vi.fn(() => vi.fn()), // Returns unsubscribe function
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  };
}

/**
 * Creates a mock Firebase app instance
 */
export function createMockApp(overrides: Partial<any> = {}) {
  return {
    name: "[DEFAULT]",
    options: {},
    ...overrides,
  };
}

/**
 * Creates a complete Firebase mock for testing
 *
 * @example
 * ```typescript
 * const { mockAuth, mockGetFirebaseAuth } = createFirebaseMock();
 *
 * vi.mock("../../firebase", () => ({
 *   ...createFirebaseMock().mocks,
 * }));
 * ```
 */
export function createFirebaseMock(
  options: {
    auth?: Partial<any>;
    app?: Partial<any>;
    initError?: string | null;
  } = {},
) {
  const mockAuth = createMockAuth(options.auth);
  const mockApp = createMockApp(options.app);

  const mockGetFirebaseAuth = vi.fn(() => mockAuth);
  const mockGetFirebaseApp = vi.fn(() => mockApp);
  const mockInitializeFirebase = vi.fn().mockResolvedValue(undefined);

  return {
    // Mock instances
    mockAuth,
    mockApp,

    // Mock functions
    mockGetFirebaseAuth,
    mockGetFirebaseApp,
    mockInitializeFirebase,

    // Complete mocks object for vi.mock()
    mocks: {
      auth: mockAuth,
      app: mockApp,
      firebaseInitError: options.initError ?? null,
      getFirebaseAuth: mockGetFirebaseAuth,
      getFirebaseApp: mockGetFirebaseApp,
      initializeFirebase: mockInitializeFirebase,
    },
  };
}

/**
 * Waits for async Firebase initialization to complete in tests
 *
 * @example
 * ```typescript
 * const { result } = renderHook(() => useFirebaseAuth());
 * await waitForFirebaseInit();
 * expect(result.current.loading).toBe(false);
 * ```
 */
export async function waitForFirebaseInit() {
  // Allow time for any pending promises to resolve
  await vi.waitFor(() => Promise.resolve(), { timeout: 100 });
}

/**
 * Creates a mock user for Firebase auth testing
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    uid: "test-user-123",
    email: "test@example.com",
    displayName: "Test User",
    photoURL: "https://example.com/photo.jpg",
    getIdToken: vi.fn().mockResolvedValue("mock-token"),
    ...overrides,
  };
}
