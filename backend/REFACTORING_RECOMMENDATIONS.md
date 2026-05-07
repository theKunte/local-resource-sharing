# Refactoring Recommendations

Based on the code review, here are specific recommendations for improving code quality and leveraging the new error handler:

## 1. Controller Refactoring (High Priority)

### Current Pattern (Many controllers use this):

```typescript
export const createBorrowRequest = async (req: Request, res: Response) => {
  try {
    if (!req.body.resourceId) {
      return res.status(400).json({ error: "resourceId is required" });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: req.body.resourceId },
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // ... more logic

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to create borrow request" });
  }
};
```

### Recommended Pattern:

```typescript
import { asyncHandler, AppError } from "../middleware/errorHandler";

export const createBorrowRequest = asyncHandler(async (req, res) => {
  if (!req.body.resourceId) {
    throw new AppError("resourceId is required", 400);
  }

  const resource = await prisma.resource.findUnique({
    where: { id: req.body.resourceId },
  });

  if (!resource) {
    throw new AppError("Resource not found", 404);
  }

  // ... more logic

  res.json({ success: true, data: result });
  // No try-catch needed! asyncHandler catches and passes to errorHandler
});
```

### Benefits:

- ✅ No try-catch boilerplate
- ✅ Consistent error responses
- ✅ Automatic logging with context
- ✅ Cleaner, more readable code
- ✅ No manual status codes in catch blocks

## 2. Remove Manual Error Responses (Medium Priority)

### Files to Refactor:

All controllers currently use manual error responses. Example locations:

- `authController.ts`: Lines 8, 22, 32, 36, 87, 97, 102, 121
- `borrowRequestController.ts`: Lines 17, 43, 77, 104, 121, 135, 163, 221, 284
- `loanController.ts`: Lines 14, 40, 44, 51, 65, 117, 127, 154, 158, 165, 185, 241, 251, 264, 268, 275, 283, 297, 343
- `resourceController.ts`: Similar pattern
- `groupController.ts`: Similar pattern
- `notificationController.ts`: Similar pattern

### Search & Replace Pattern:

```typescript
// OLD:
return res.status(400).json({ error: "Message" });

// NEW:
throw new AppError("Message", 400);
```

```typescript
// OLD:
return res.status(404).json({ error: "Not found" });

// NEW:
throw new AppError("Not found", 404);
```

## 3. Add Validation Helpers (Medium Priority)

Create a validation utilities file:

```typescript
// backend/src/utils/validation.ts
import { AppError } from "../middleware/errorHandler";

export function requireFields(
  obj: any,
  fields: string[],
  message?: string,
): void {
  for (const field of fields) {
    if (!obj[field]) {
      throw new AppError(message || `${field} is required`, 400);
    }
  }
}

export function requireUserId(req: any): string {
  const userId = req.user?.uid;
  if (!userId) {
    throw new AppError("User ID not found in request", 401);
  }
  return userId;
}

export function validateDateRange(startDate: Date, endDate: Date): void {
  if (startDate >= endDate) {
    throw new AppError("Start date must be before end date", 400);
  }
}
```

Usage:

```typescript
export const createBorrowRequest = asyncHandler(async (req, res) => {
  requireFields(req.body, ["resourceId", "startDate", "endDate"]);
  const userId = requireUserId(req);

  const startDate = new Date(req.body.startDate);
  const endDate = new Date(req.body.endDate);
  validateDateRange(startDate, endDate);

  // ... rest of logic
});
```

## 4. Prisma Error Handling (Low Priority - Now Automatic)

The error handler now automatically handles Prisma errors:

```typescript
// Before (manual handling):
try {
  await prisma.user.create({ data: { email } });
} catch (error: any) {
  if (error.code === "P2002") {
    return res.status(409).json({ error: "Email already exists" });
  }
  throw error;
}

// After (automatic handling):
// Just let it throw! The error handler catches it
await prisma.user.create({ data: { email } });
// P2002 → 409 "Record already exists"
// P2025 → 404 "Record not found"
```

## 5. Authentication Error Consistency (Low Priority)

### Current Pattern (mixed):

```typescript
if (!req.user) {
  return res.status(401).json({ error: "Unauthorized" });
}

if (req.user.uid !== resourceOwner) {
  return res.status(403).json({ error: "You don't own this resource" });
}
```

### Recommended Pattern:

```typescript
import { AppError } from "../middleware/errorHandler";

if (!req.user) {
  throw new AppError("Authentication required", 401);
}

if (req.user.uid !== resourceOwner) {
  throw new AppError("You don't have permission to access this resource", 403);
}
```

## 6. Remove console.error Calls (Low Priority)

The error handler automatically logs all errors with context. Remove manual logging:

```typescript
// Remove these:
console.error("Error creating resource:", error);
console.log("Database error:", error.message);

// The error handler logs with full context automatically:
// - requestId
// - method, url, ip
// - userId
// - statusCode, message, stack
// - isOperational flag
```

## 7. Standardize Error Messages (Optional)

Create an error messages file for consistency:

```typescript
// backend/src/constants/errorMessages.ts
export const ERROR_MESSAGES = {
  // Authentication
  AUTH_REQUIRED: "Authentication required",
  AUTH_INVALID_TOKEN: "Invalid or expired token",
  AUTH_PERMISSION_DENIED: "You don't have permission to perform this action",

  // Validation
  VALIDATION_REQUIRED_FIELD: (field: string) => `${field} is required`,
  VALIDATION_INVALID_DATE: "Invalid date format",
  VALIDATION_DATE_RANGE: "Start date must be before end date",

  // Resources
  RESOURCE_NOT_FOUND: "Resource not found",
  RESOURCE_ALREADY_BORROWED: "Resource is already borrowed",
  RESOURCE_UNAVAILABLE: "Resource is not available",

  // Generic
  UNEXPECTED_ERROR: "An unexpected error occurred",
  DATABASE_ERROR: "Database operation failed",
};
```

Usage:

```typescript
import { ERROR_MESSAGES } from "../constants/errorMessages";

if (!resource) {
  throw new AppError(ERROR_MESSAGES.RESOURCE_NOT_FOUND, 404);
}
```

## 8. Consider Error Codes (Optional)

Add error codes for easier client-side handling:

```typescript
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string; // Add this

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Usage:
throw new AppError("Resource not found", 404, "RESOURCE_NOT_FOUND");

// Response:
{
  "success": false,
  "message": "Resource not found",
  "code": "RESOURCE_NOT_FOUND",
  "requestId": "abc-123"
}
```

## Priority Implementation Order

### Phase 1 (Immediate):

1. Update 2-3 controllers to use `asyncHandler` and `AppError` as proof of concept
2. Test thoroughly in development
3. Document any issues found

### Phase 2 (Next sprint):

1. Create validation utilities (`requireFields`, `requireUserId`)
2. Refactor remaining controllers incrementally
3. Remove manual try-catch blocks

### Phase 3 (Future):

1. Add error codes for client-side handling
2. Create error messages constants
3. Integrate error monitoring service (Sentry, etc.)

## Example: Full Controller Refactor

### Before:

```typescript
export const updateResource = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const resourceId = req.params.id;
    if (!resourceId) {
      return res.status(400).json({ error: "Resource ID is required" });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    if (resource.ownerId !== userId) {
      return res.status(403).json({
        error: "You don't have permission to update this resource",
      });
    }

    const updated = await prisma.resource.update({
      where: { id: resourceId },
      data: req.body,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating resource:", error);
    res.status(500).json({ error: "Failed to update resource" });
  }
};
```

### After:

```typescript
import { asyncHandler, AppError } from "../middleware/errorHandler";

export const updateResource = asyncHandler(async (req, res) => {
  // Validate user
  const userId = req.user?.uid;
  if (!userId) {
    throw new AppError("Authentication required", 401);
  }

  // Validate resource ID
  const resourceId = req.params.id;
  if (!resourceId) {
    throw new AppError("Resource ID is required", 400);
  }

  // Find resource (Prisma will throw P2025 if not found → 404 automatically)
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  });

  if (!resource) {
    throw new AppError("Resource not found", 404);
  }

  // Check ownership
  if (resource.ownerId !== userId) {
    throw new AppError(
      "You don't have permission to update this resource",
      403,
    );
  }

  // Update (any Prisma errors are handled automatically)
  const updated = await prisma.resource.update({
    where: { id: resourceId },
    data: req.body,
  });

  res.json({ success: true, data: updated });
});
// 27 lines → clean, readable, no try-catch!
```

## Estimated Time Investment

- **Phase 1** (2-3 controllers): ~2 hours
- **Phase 2** (All controllers): ~6-8 hours
- **Phase 3** (Enhancements): ~4 hours

**Total**: ~12-14 hours for complete refactor

## Testing After Refactoring

Use the existing test scripts:

```powershell
# Rebuild and test
docker-compose up --build -d
.\quick-docker-test.ps1

# Check logs
docker-compose logs --tail=100 backend | Select-String "error"
```

All tests should still pass, but now with:

- Consistent error format
- Better logging
- Cleaner code
- Easier maintenance
