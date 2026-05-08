import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { logger } from "../utils/logger";

/**
 * Sanitize error messages to prevent information leakage in production
 */
function sanitizeErrorMessage(message: string, statusCode: number): string {
  // In development, return the actual message
  if (process.env.NODE_ENV !== "production") {
    return message;
  }

  // In production, return generic messages for 5xx errors
  if (statusCode >= 500) {
    return "An unexpected error occurred";
  }

  // For client errors (4xx), we can be more specific but still cautious
  // Remove any file paths, stack traces, or technical details
  return message
    .replace(/[\w/.-]+\.(ts|js|json)/g, "[file]") // Remove file paths
    .replace(/at .+:\d+:\d+/g, "") // Remove stack trace lines
    .replace(/\b[A-Z]:\\[\w\\.-]+/g, "[path]") // Remove Windows paths
    .replace(/\b[\w/.-]+/g, "[path]") // Remove Unix paths
    .substring(0, 200); // Limit length
}

/**
 * Custom error class for operational errors (expected errors we can handle gracefully)
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 * MUST be registered AFTER all routes
 *
 * Best practices implemented:
 * 1. Four parameters (err, req, res, next) - required for Express error handler
 * 2. Never expose stack traces in production
 * 3. Log all errors with request context
 * 4. Return consistent JSON responses
 * 5. Distinguish operational vs programming errors
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Prevent errors if response already sent
  if (res.headersSent) {
    logger.warn("Headers already sent, cannot send error response", {
      requestId: (req as any).requestId,
      error: err.message,
    });
    return _next(err);
  }

  // Default to 500 Internal Server Error
  let statusCode = 500;
  let message = "An unexpected error occurred";
  let isOperational = false;

  // Check if it's our custom AppError with known status code
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }
  // Handle Prisma errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    isOperational = true;
    switch (err.code) {
      case "P2002": // Unique constraint violation
        statusCode = 409;
        message = "A record with this information already exists";
        break;
      case "P2025": // Record not found
        statusCode = 404;
        message = "Record not found";
        break;
      case "P2003": // Foreign key constraint failed
        statusCode = 400;
        message = "Invalid reference to related record";
        break;
      case "P2014": // Invalid ID
        statusCode = 400;
        message = "Invalid ID provided";
        break;
      default:
        statusCode = 500;
        message = "Database error occurred";
        isOperational = false;
    }
  }
  // Handle Prisma validation errors
  else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Invalid data provided";
    isOperational = true;
  }
  // Handle rate limit errors
  else if (err.message && err.message.includes("Too many requests")) {
    statusCode = 429;
    message = err.message;
    isOperational = true;
  }
  // Handle Firebase Auth errors
  else if (
    err.message &&
    (err.message.includes("auth/") ||
      err.message.includes("Firebase ID token") ||
      err.message.includes("credential"))
  ) {
    statusCode = 401;
    message = "Authentication failed";
    isOperational = true;
  }
  // Handle validation errors
  else if (err.name === "ValidationError") {
    statusCode = 400;
    message = err.message;
    isOperational = true;
  }
  // Handle JWT/Unauthorized errors
  else if (
    err.name === "UnauthorizedError" ||
    err.message.includes("unauthorized")
  ) {
    statusCode = 401;
    message = "Unauthorized access";
    isOperational = true;
  }
  // Handle CORS errors
  else if (err.message.includes("CORS")) {
    statusCode = 403;
    message = "CORS policy violation";
    isOperational = true;
  }
  // Handle JSON parse errors
  else if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    message = "Invalid JSON in request body";
    isOperational = true;
  }

  // Log error with context - always log programming errors, log operational errors at appropriate level
  const errorLog = {
    requestId: (req as any).requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: (req as any).user?.uid,
    statusCode,
    message: err.message,
    stack: err.stack,
    isOperational,
    // Include Prisma error details if available
    ...(err instanceof Prisma.PrismaClientKnownRequestError && {
      prismaCode: err.code,
      prismaTarget: err.meta?.target,
    }),
  };

  if (isOperational) {
    // Operational errors (expected) - log as warning
    logger.warn("Operational error occurred", errorLog);
  } else {
    // Programming errors (unexpected) - log as error
    logger.error("Unexpected error occurred", errorLog);
  }

  // Never send stack traces to client in production
  const response: any = {
    success: false,
    message: sanitizeErrorMessage(message, statusCode),
    requestId: (req as any).requestId,
  };

  // Only include stack trace in development mode
  if (process.env.NODE_ENV !== "production" && err.stack) {
    response.stack = err.stack;
    response.error = err.message;
  }

  // Send response
  res.status(statusCode).json(response);
}

/**
 * Catch-all handler for 404 Not Found
 * Place this AFTER all routes but BEFORE error handler
 */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const error = new AppError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
  );
  next(error);
}

/**
 * Async error wrapper - wraps async route handlers to catch promise rejections
 * Usage: app.get('/route', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
