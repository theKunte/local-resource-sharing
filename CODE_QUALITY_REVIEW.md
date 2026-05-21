# Code Quality Review: Test Requirements & TypeScript

**Date**: May 18, 2026  
**Branch**: Issue#FeatureSearchAndDiscovery  
**Reviewer**: Senior Engineering Review

---

## 🔴 Critical Issues (Must Fix)

### 1. **TypeScript: Excessive `as any` Usage**

**Problem**: 20+ instances of `(req as any).user.uid` across all controllers

**Files Affected**:

- `backend/src/controllers/resourceController.ts` (12 instances)
- `backend/src/controllers/groupController.ts` (6 instances)
- `backend/src/controllers/authController.ts` (2 instances)
- `backend/src/controllers/borrowRequestController.ts` (1 instance)
- `backend/src/controllers/notificationController.ts` (1 instance)
- `backend/src/middleware/auth.ts` (2 instances)

**Impact**:

- Defeats TypeScript type safety
- No autocomplete for `req.user` properties
- Runtime errors if auth middleware changes

**Solution**: Create proper type definitions

```typescript
// backend/src/types/express.d.ts (NEW FILE)
import { Request } from "express";

export interface AuthenticatedUser {
  uid: string;
  email: string | undefined;
  emailVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}
```

**Required Changes**:

- Create `backend/src/types/express.d.ts` with above content
- Replace all `(req as any).user.uid` with `req.user!.uid`
- Update auth middleware to use typed interface
- Add to tsconfig.json: `"typeRoots": ["./node_modules/@types", "./src/types"]`

**Estimated Work**: 30 minutes

---

### 2. **Missing Tests for Priority 1 Security Features**

**Problem**: No tests for critical security features implemented in latest changes

**Missing Test Coverage**:

#### Backend: `sanitizeCategories()` Function

**Location**: `backend/src/constants/categories.ts`

**Required Tests**:

```typescript
// backend/tests/unit/categories.test.ts (MISSING FILE)
describe("sanitizeCategories", () => {
  it("should accept valid categories", () => {
    expect(sanitizeCategories(["Sports", "Camping"])).toEqual([
      "Sports",
      "Camping",
    ]);
  });

  it("should reject invalid categories", () => {
    expect(sanitizeCategories(["InvalidCategory", "Sports"])).toEqual([
      "Sports",
    ]);
  });

  it("should remove duplicates", () => {
    expect(sanitizeCategories(["Sports", "Sports", "Camping"])).toEqual([
      "Sports",
      "Camping",
    ]);
  });

  it("should limit to maxCount", () => {
    const many = [
      "Sports",
      "Camping",
      "Tools",
      "Electronics",
      "Music",
      "Gaming",
    ];
    expect(sanitizeCategories(many, 3)).toHaveLength(3);
  });

  it("should handle non-array input", () => {
    expect(sanitizeCategories("Sports")).toEqual(["Sports"]);
    expect(sanitizeCategories(null)).toEqual([]);
    expect(sanitizeCategories(undefined)).toEqual([]);
  });

  it("should trim whitespace", () => {
    expect(sanitizeCategories(["  Sports  ", "Camping"])).toEqual([
      "Sports",
      "Camping",
    ]);
  });
});
```

#### Backend: Search Query Sanitization

**Location**: `backend/src/controllers/resourceController.ts` (lines 702-706)

**Required Tests**:

```typescript
// Add to backend/tests/integration/resourceController.test.ts
describe("searchResources - query sanitization", () => {
  it("should limit query to 100 characters", async () => {
    const longQuery = "a".repeat(150);
    const { req, res } = mockReqRes({}, {}, { q: longQuery });
    await searchResources(req, res);
    // Verify Prisma was called with only 100 chars
    expect(mockPrisma.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { title: { contains: "a".repeat(100), mode: "insensitive" } },
              ]),
            }),
          ]),
        }),
      }),
    );
  });

  it("should remove special characters from query", async () => {
    const { req, res } = mockReqRes(
      {},
      {},
      { q: 'bike<script>alert("xss")</script>' },
    );
    await searchResources(req, res);
    // Should sanitize to just 'bikescriptalertxssscript'
    expect(mockPrisma.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                {
                  title: {
                    contains: "bikescriptalertxssscript",
                    mode: "insensitive",
                  },
                },
              ]),
            }),
          ]),
        }),
      }),
    );
  });
});
```

#### Backend: Multi-Category Search with OR Logic

**Location**: `backend/src/controllers/resourceController.ts` (lines 738-744)

**Required Tests**:

```typescript
// Add to backend/tests/integration/resourceController.test.ts
describe("searchResources - multi-category filtering", () => {
  it("should find resources matching ANY selected category (OR logic)", async () => {
    const { req, res } = mockReqRes(
      {},
      {},
      { category: ["Sports", "Camping"] },
    );

    mockPrisma.groupMember.findMany.mockResolvedValue([]);
    mockPrisma.resource.findMany.mockResolvedValue([
      { id: "1", title: "Bike", category: ["Sports"] },
      { id: "2", title: "Tent", category: ["Camping"] },
      { id: "3", title: "Kayak", category: ["Sports", "Water Sports"] },
    ]);
    mockPrisma.resource.count.mockResolvedValue(3);

    await searchResources(req, res);

    expect(mockPrisma.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              OR: [
                { category: { has: "Sports" } },
                { category: { has: "Camping" } },
              ],
            },
          ]),
        }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ category: ["Sports"] }),
          expect.objectContaining({ category: ["Camping"] }),
        ]),
      }),
    );
  });

  it("should handle empty category array", async () => {
    const { req, res } = mockReqRes({}, {}, { category: [] });
    // Should not add category filter
    await searchResources(req, res);
    expect(mockPrisma.resource.findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ OR: expect.anything() }),
          ]),
        }),
      }),
    );
  });
});
```

---

#### Frontend: `useDebounce` Hook

**Location**: `frontend/src/hooks/useDebounce.ts`

**Required Tests**:

```typescript
// frontend/src/hooks/__tests__/useDebounce.test.ts (MISSING FILE)
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDebounce } from "../useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("test", 300));
    expect(result.current).toBe("test");
  });

  it("should debounce value changes", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "initial" } },
    );

    expect(result.current).toBe("initial");

    // Change value
    rerender({ value: "updated" });
    expect(result.current).toBe("initial"); // Still old value

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current).toBe("updated");
    });
  });

  it("should cancel previous timeout on rapid changes", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "first" } },
    );

    rerender({ value: "second" });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: "third" });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: "final" });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current).toBe("final");
    });
  });

  it("should use custom delay", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "test" } },
    );

    rerender({ value: "updated" });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("test"); // Not updated yet

    act(() => {
      vi.advanceTimersByTime(200);
    });
    await waitFor(() => {
      expect(result.current).toBe("updated");
    });
  });
});
```

**Estimated Work**: 4-6 hours

---

### 3. **Backend: JavaScript File in TypeScript Project**

**Problem**: `check-data.js` is JavaScript, causing ESLint errors

**File**: `backend/check-data.js`

**Current Errors**:

- `require()` style imports forbidden
- `'require' is not defined`
- `'console' is not defined` (14 instances)

**Solution**: Convert to TypeScript

```typescript
// backend/check-data.ts (RENAME FROM .js)
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkData(): Promise<void> {
  try {
    const resourceCount = await prisma.resource.count();
    const userCount = await prisma.user.count();
    const groupCount = await prisma.group.count();

    console.log("\n📊 Database Status:");
    console.log("==================");
    console.log(`Resources: ${resourceCount}`);
    console.log(`Users: ${userCount}`);
    console.log(`Groups: ${groupCount}`);

    if (resourceCount > 0) {
      console.log("\n✅ Your gear is still in the database!");
      const resources = await prisma.resource.findMany({
        take: 5,
        select: { title: true, description: true, ownerId: true },
      });
      console.log("\nSample resources:");
      resources.forEach((r, i) => {
        console.log(
          `  ${i + 1}. ${r.title} - ${r.description.substring(0, 50)}...`,
        );
      });
    } else {
      console.log("\n⚠️  No resources found in database");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
```

**Also Update**: `backend/package.json`

```json
{
  "scripts": {
    "db:check": "ts-node check-data.ts" // Changed from .js
  }
}
```

**Estimated Work**: 10 minutes

---

## 🟡 High Priority Issues (Should Fix Soon)

### 4. **Low Test Coverage Thresholds**

**Problem**: Coverage thresholds are extremely low

**Current**: `backend/jest.config.ts`

```typescript
coverageThreshold: {
  global: {
    branches: 20,    // ❌ Way too low
    functions: 30,   // ❌ Way too low
    lines: 20,       // ❌ Way too low
    statements: 20,  // ❌ Way too low
  },
}
```

**Recommended**:

```typescript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 75,
    lines: 80,
    statements: 80,
  },
  // Per-directory thresholds for critical code
  './src/controllers/': {
    branches: 80,
    functions: 85,
    lines: 85,
    statements: 85,
  },
  './src/middleware/': {
    branches: 85,
    functions: 90,
    lines: 90,
    statements: 90,
  },
}
```

**Estimated Work**: 1 hour (update thresholds only, fixing coverage is separate)

---

### 5. **Frontend: No Tests for Category Integration**

**Problem**: Existing tests don't verify CATEGORIES constant usage

**Files Affected**:

- `frontend/src/pages/__tests__/PostResource.test.tsx` - Should test autocomplete
- `frontend/src/pages/__tests__/Home.test.tsx` - Should test category filters
- No tests for `frontend/src/constants/categories.ts`

**Required Tests**:

```typescript
// frontend/src/constants/__tests__/categories.test.ts (MISSING)
import {
  CATEGORIES,
  isValidCategory,
  filterValidCategories,
} from "../categories";

describe("categories", () => {
  it("should export 20 categories", () => {
    expect(CATEGORIES).toHaveLength(20);
    expect(CATEGORIES).toContain("Sports");
    expect(CATEGORIES).toContain("Camping");
    expect(CATEGORIES).toContain("Other");
  });

  it("should validate categories", () => {
    expect(isValidCategory("Sports")).toBe(true);
    expect(isValidCategory("InvalidCategory")).toBe(false);
    expect(isValidCategory(123)).toBe(false);
    expect(isValidCategory(null)).toBe(false);
  });

  it("should filter valid categories", () => {
    const input = ["Sports", "Invalid", "Camping", 123, null];
    expect(filterValidCategories(input)).toEqual(["Sports", "Camping"]);
  });
});
```

**Estimated Work**: 2 hours

---

## 🟢 Medium Priority Issues (Nice to Have)

### 6. **TypeScript: Missing Strict Null Checks in Frontend**

**Problem**: Frontend tsconfig doesn't enforce strict null checking

**File**: `frontend/tsconfig.app.json`

**Current**:

```json
{
  "compilerOptions": {
    "strict": true
    // Missing explicit null checks
  }
}
```

**Recommended**: Add explicit configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true, // Explicitly enable
    "strictFunctionTypes": true, // Explicitly enable
    "strictBindCallApply": true, // Explicitly enable
    "strictPropertyInitialization": true, // Explicitly enable
    "noImplicitThis": true, // Explicitly enable
    "alwaysStrict": true // Explicitly enable
  }
}
```

**Estimated Work**: 15 minutes

---

### 7. **Backend: Missing Integration Test for createResource with Categories**

**Problem**: Existing tests use old category format (single string or null)

**Location**: `backend/tests/integration/resourceController.test.ts`

**Current Test Data** (Lines 1065, 1073):

```typescript
category: ["Electronics"]; // ✅ Correct array format
```

But missing tests for:

- Creating resource with multiple categories
- Creating resource with empty category array
- Creating resource with > 5 categories (should limit)

**Required Tests**:

```typescript
describe("createResource - category validation", () => {
  it("should accept multiple valid categories", async () => {
    const { req, res } = mockReqRes({
      title: "Multi-Cat Item",
      description: "Test",
      category: ["Sports", "Camping", "Outdoor"],
    });

    mockPrisma.resource.create.mockResolvedValue({
      id: "1",
      category: ["Sports", "Camping", "Outdoor"],
    });

    await createResource(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.resource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: ["Sports", "Camping", "Outdoor"],
        }),
      }),
    );
  });

  it("should limit to 5 categories max", async () => {
    const { req, res } = mockReqRes({
      title: "Too Many Cats",
      description: "Test",
      category: [
        "Sports",
        "Camping",
        "Tools",
        "Electronics",
        "Music",
        "Gaming",
        "Books",
      ],
    });

    await createResource(req, res);

    const call = mockPrisma.resource.create.mock.calls[0][0];
    expect(call.data.category).toHaveLength(5);
  });

  it("should reject invalid categories", async () => {
    const { req, res } = mockReqRes({
      title: "Invalid Cats",
      description: "Test",
      category: ["Sports", "InvalidCategory", "Camping"],
    });

    await createResource(req, res);

    const call = mockPrisma.resource.create.mock.calls[0][0];
    expect(call.data.category).toEqual(["Sports", "Camping"]); // Invalid removed
    expect(call.data.category).not.toContain("InvalidCategory");
  });
});
```

**Estimated Work**: 1 hour

---

## 📊 Summary

### Critical Issues: 3

1. ❌ TypeScript `as any` overuse (20+ instances)
2. ❌ Missing tests for security features (sanitization, validation)
3. ❌ JavaScript file causing lint errors

### High Priority: 2

4. ⚠️ Very low coverage thresholds
5. ⚠️ No tests for frontend category integration

### Medium Priority: 2

6. 📝 Missing explicit null checks in frontend
7. 📝 Incomplete integration tests for categories

### Total Estimated Work: 9-12 hours

---

## 🎯 Recommended Action Plan

### Phase 1: Fix Critical (2-3 hours)

1. Create Express type definitions (30 min)
2. Convert check-data.js to TypeScript (10 min)
3. Create unit tests for sanitizeCategories (1 hour)
4. Add integration tests for search sanitization (1 hour)

### Phase 2: High Priority (3 hours)

5. Create useDebounce tests (1 hour)
6. Create category constants tests (1 hour)
7. Update coverage thresholds (1 hour to verify passing)

### Phase 3: Medium Priority (4-6 hours)

8. Replace all `as any` with proper types (2-3 hours)
9. Add createResource category tests (1 hour)
10. Update frontend tsconfig (15 min)
11. Verify all tests pass (2 hours buffer)

---

## ✅ Current Strengths

**What's Working Well**:

- ✅ Backend has comprehensive test structure (unit + integration)
- ✅ Frontend has Vitest configured with proper setup
- ✅ TypeScript strict mode enabled on both sides
- ✅ Existing tests are well-structured with good mocks
- ✅ Coverage reporting configured (HTML + LCOV)
- ✅ Test scripts properly set up in package.json

**Keep Doing**:

- Continue writing integration tests for controllers
- Use proper mocking patterns for Prisma/Firebase
- Maintain separate unit and integration test directories
