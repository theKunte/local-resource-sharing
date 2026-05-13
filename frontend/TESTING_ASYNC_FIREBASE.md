# Testing with Async Firebase Initialization

## Overview

Firebase is now initialized asynchronously at runtime instead of synchronously at build time. This guide explains how to write tests that work with the new pattern.

## What Changed

### Before (Synchronous)

```typescript
// Old pattern - Firebase initialized immediately
import { auth } from "./firebase";
auth.currentUser; // Available immediately
```

### After (Asynchronous)

```typescript
// New pattern - Firebase initialized async
import { initializeFirebase, getFirebaseAuth } from "./firebase";

await initializeFirebase();
const auth = getFirebaseAuth();
auth?.currentUser; // May be null if not initialized
```

## Updating Tests

### 1. Global Mock (setup.ts)

The global Firebase mock in `src/test/setup.ts` now includes the new async API:

```typescript
vi.mock("../firebase", () => ({
  // Legacy exports (deprecated but still supported)
  auth: {
    /* mock auth */
  },
  app: {},
  firebaseInitError: null,

  // New async API
  initializeFirebase: vi.fn().mockResolvedValue(undefined),
  getFirebaseAuth: vi.fn(() => mockAuth),
  getFirebaseApp: vi.fn(() => mockApp),
}));
```

### 2. Component/Hook Tests

When mocking Firebase in individual tests:

```typescript
const { mockGetFirebaseAuth } = vi.hoisted(() => ({
  mockGetFirebaseAuth: vi.fn(),
}));

const mockAuth = {
  currentUser: null,
  onAuthStateChanged: vi.fn(),
  // ... other methods
};

vi.mock("../../firebase", () => ({
  auth: mockAuth, // Legacy export
  getFirebaseAuth: mockGetFirebaseAuth, // New API
  initializeFirebase: vi.fn().mockResolvedValue(undefined),
}));

describe("MyComponent", () => {
  beforeEach(() => {
    mockGetFirebaseAuth.mockReturnValue(mockAuth);
  });

  // ... tests
});
```

### 3. Using Test Helpers

Use the provided test helpers for easier test setup:

```typescript
import {
  createFirebaseMock,
  createMockUser,
} from "../test/firebaseTestHelpers";

const { mockAuth, mockGetFirebaseAuth, mocks } = createFirebaseMock({
  auth: { currentUser: createMockUser() },
});

vi.mock("../../firebase", () => mocks);
```

## Common Patterns

### Testing Null Auth (Firebase Not Initialized)

```typescript
vi.mock("../../firebase", () => ({
  auth: null,
  getFirebaseAuth: vi.fn(() => null),
  initializeFirebase: vi.fn().mockResolvedValue(undefined),
}));

it("handles uninitialized Firebase gracefully", () => {
  // Component should handle null auth without crashing
});
```

### Testing Auth State Changes

```typescript
const mockOnAuthStateChanged = vi.fn();
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: mockOnAuthStateChanged,
};

mockOnAuthStateChanged.mockImplementation((callback) => {
  setTimeout(() => callback(mockUser), 0);
  return vi.fn(); // unsubscribe
});
```

### Testing With User Authenticated

```typescript
import { createMockUser } from "../test/firebaseTestHelpers";

const mockUser = createMockUser({
  uid: "custom-id",
  email: "custom@example.com",
});

const mockAuth = {
  currentUser: mockUser,
  // ...
};
```

## Files Updated

The following test files have been updated to support async Firebase:

- ✅ `src/test/setup.ts` - Global mock
- ✅ `src/hooks/__tests__/useFirebaseAuth.test.ts`
- ✅ `src/hooks/__tests__/useFirebaseAuth.null.test.ts`
- ✅ `src/hooks/__tests__/useSessionTimeout.test.ts`
- ✅ `src/hooks/__tests__/useNotifications.test.ts`
- ✅ `src/utils/__tests__/apiClient.test.ts`
- ✅ `src/utils/__tests__/firebaseStorage.test.ts`
- ✅ `src/__tests__/App.test.tsx`

## Best Practices

1. **Always mock both old and new APIs** for backward compatibility
2. **Return mock auth from `getFirebaseAuth()`** in beforeEach
3. **Use test helpers** to reduce boilerplate
4. **Test null states** to ensure graceful degradation
5. **Mock async initialization** with `mockResolvedValue(undefined)`

## Troubleshooting

### "auth is null" errors

Make sure `getFirebaseAuth()` is mocked and returns a valid auth object in your beforeEach.

### "Cannot read property of null"

Check that your component/hook handles null auth gracefully before Firebase initializes.

### Timeout errors

Ensure async mocks use `mockResolvedValue()` not `mockReturnValue()`.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test useFirebaseAuth.test.ts

# Run with coverage
npm run test:coverage
```
