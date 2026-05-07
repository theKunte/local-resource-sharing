import express from "express";
import { AppError } from "../middleware/errorHandler";

const router = express.Router();

/**
 * Test routes to verify error handling works correctly
 * REMOVE THESE IN PRODUCTION or protect with authentication
 */

// Test 1: Synchronous error
router.get("/test-sync-error", (_req, _res) => {
  throw new AppError("This is a test synchronous error", 400);
});

// Test 2: Async error
router.get("/test-async-error", async (_req, _res) => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  throw new AppError("This is a test async error", 500);
});

// Test 3: Unexpected programming error (uncaught)
router.get("/test-unexpected-error", (_req, _res) => {
  // @ts-ignore - intentionally accessing undefined
  const result = undefined.somethingThatDoesntExist;
  _res.json({ result });
});

// Test 4: 404 - non-existent route (will be caught by notFoundHandler)
// Just try: GET /api/test-errors/this-route-does-not-exist

// Test 5: Different status codes
router.get("/test-401", (_req, _res) => {
  throw new AppError("Unauthorized - invalid token", 401);
});

router.get("/test-403", (_req, _res) => {
  throw new AppError("Forbidden - insufficient permissions", 403);
});

router.get("/test-404", (_req, _res) => {
  throw new AppError("Resource not found", 404);
});

router.get("/test-422", (_req, _res) => {
  throw new AppError("Validation failed - invalid input", 422);
});

// Test 6: JSON parse error simulation
router.get("/test-json-error", (_req, _res) => {
  throw new SyntaxError("Unexpected token in JSON");
});

export default router;
