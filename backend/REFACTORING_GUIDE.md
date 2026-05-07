/\*\*

- Example: Refactoring a controller to use the global error handler
-
- BEFORE (manual error handling):
- ================================
  \*/

// ❌ Old way - manual error responses everywhere
export async function getResourceOld(req: Request, res: Response) {
try {
const resourceId = parseInt(req.params.id);

    if (!resourceId) {
      return res.status(400).json({ error: "Invalid resource ID" });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Check permissions
    if (resource.ownerId !== (req as any).user.uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(resource);

} catch (error) {
console.error("Error:", error);
res.status(500).json({ error: "Internal server error" });
}
}

/\*\*

- AFTER (using global error handler):
- ====================================
  \*/

import { AppError, asyncHandler } from "../middleware/errorHandler";

// ✅ New way - throw errors, let middleware handle them
export const getResourceNew = asyncHandler(async (req: Request, res: Response) => {
const resourceId = parseInt(req.params.id);

// Throw AppError for operational errors
if (!resourceId) {
throw new AppError("Invalid resource ID", 400);
}

const resource = await prisma.resource.findUnique({
where: { id: resourceId }
});

if (!resource) {
throw new AppError("Resource not found", 404);
}

// Check permissions
if (resource.ownerId !== (req as any).user.uid) {
throw new AppError("Forbidden", 403);
}

res.json(resource);
// No try-catch needed! asyncHandler catches any errors and passes to middleware
});

/\*\*

- Benefits of the new approach:
- ==============================
-
- 1.  ✅ Cleaner code - no try-catch boilerplate
- 2.  ✅ Consistent error format across all endpoints
- 3.  ✅ Automatic request ID tracking
- 4.  ✅ Centralized logging
- 5.  ✅ No accidental stack trace leaks
- 6.  ✅ Async errors handled automatically
- 7.  ✅ Less repetitive error handling code
      \*/

/\*\*

- Refactoring Guide:
- ==================
-
- Step 1: Import the utilities
- ***
  \*/
  import { AppError, asyncHandler } from "../middleware/errorHandler";

/\*\*

- Step 2: Wrap async handlers
- ***
- Change: export async function myHandler(req, res) { }
- To: export const myHandler = asyncHandler(async (req, res) => { });
  \*/

/\*\*

- Step 3: Replace error responses with throws
- ***
- Change: return res.status(404).json({ error: "Not found" });
- To: throw new AppError("Not found", 404);
  \*/

/\*\*

- Step 4: Remove try-catch blocks
- ***
- The asyncHandler wrapper catches all errors automatically
  \*/

/\*\*

- Step 5: Remove console.error calls
- ***
- The error middleware logs everything with full context
  \*/

/\*\*

- Common Error Patterns:
- ======================
  \*/

// 400 Bad Request - Invalid input
throw new AppError("Invalid email format", 400);
throw new AppError("Missing required field: name", 400);

// 401 Unauthorized - Not authenticated
throw new AppError("Invalid or expired token", 401);
throw new AppError("Authentication required", 401);

// 403 Forbidden - Authenticated but no permission
throw new AppError("You don't have permission to access this resource", 403);
throw new AppError("Only group admins can perform this action", 403);

// 404 Not Found - Resource doesn't exist
throw new AppError("Resource not found", 404);
throw new AppError(`User with ID ${userId} not found`, 404);

// 409 Conflict - Resource conflict
throw new AppError("Resource with this name already exists", 409);
throw new AppError("Loan already exists for this request", 409);

// 422 Unprocessable Entity - Validation failed
throw new AppError("Validation failed: name must be at least 3 characters", 422);

// 500 Internal Server Error - Unexpected issues (default)
throw new AppError("Failed to process request", 500);

/\*\*

- When NOT to use try-catch:
- ==========================
-
- ❌ Don't do this:
  \*/
  export const badExample = asyncHandler(async (req, res) => {
  try {
  const data = await someOperation();
  res.json(data);
  } catch (error) {
  // Don't catch here - let asyncHandler do it!
  throw new AppError("Something went wrong", 500);
  }
  });

/\*\*

- ✅ Do this instead:
  \*/
  export const goodExample = asyncHandler(async (req, res) => {
  const data = await someOperation();
  res.json(data);
  // That's it! Errors bubble up automatically
  });

/\*\*

- When TO use try-catch:
- ======================
-
- Only when you need to add context or handle specific errors differently
  \*/
  export const specificErrorHandling = asyncHandler(async (req, res) => {
  try {
  await externalApiCall();
  } catch (error: any) {
  // Add context to external API errors
  throw new AppError(`External API failed: ${error.message}`, 502);
  }

try {
await database.transaction();
} catch (error: any) {
if (error.code === "P2002") {
throw new AppError("Duplicate entry", 409);
}
// Re-throw unknown errors to be handled by middleware
throw error;
}

res.json({ success: true });
});
