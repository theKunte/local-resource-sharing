import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
} from "../../src/middleware/errorHandler";

// Mock the logger module before importing
jest.mock("../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    security: jest.fn(),
    audit: jest.fn(),
    http: jest.fn(),
    database: jest.fn(),
  },
}));

// Import the mocked logger to get a reference to the mock
import { logger as mockLogger } from "../../src/utils/logger";

describe("Error Handler Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: "GET",
      originalUrl: "/test",
      ip: "127.0.0.1",
    } as any;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    } as any;

    mockNext = jest.fn();

    // Reset logger mocks
    (mockLogger.warn as jest.Mock).mockClear();
    (mockLogger.error as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("AppError", () => {
    it("should create an AppError with correct properties", () => {
      const error = new AppError("Test error", 400);

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it("should default to status code 500", () => {
      const error = new AppError("Test error");

      expect(error.statusCode).toBe(500);
    });
  });

  describe("errorHandler", () => {
    it("should handle AppError correctly", () => {
      const error = new AppError("Test error", 400);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.any(String),
        }),
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should not send response if headers already sent", () => {
      const error = new AppError("Test error", 400);
      mockResponse.headersSent = true;

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it("should handle Prisma P2002 (unique constraint) error", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        { code: "P2002", clientVersion: "5.0.0" },
      );

      errorHandler(
        prismaError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.any(String),
        }),
      );
    });

    it("should handle Prisma P2025 (record not found) error", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Record not found",
        { code: "P2025", clientVersion: "5.0.0" },
      );

      errorHandler(
        prismaError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it("should handle Prisma P2003 (foreign key) error", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Foreign key constraint failed",
        { code: "P2003", clientVersion: "5.0.0" },
      );

      errorHandler(
        prismaError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should handle Prisma P2014 (invalid ID) error", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Invalid ID",
        { code: "P2014", clientVersion: "5.0.0" },
      );

      errorHandler(
        prismaError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should handle Prisma unknown error code as 500 (default case)", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unknown Prisma error",
        { code: "P9999", clientVersion: "5.0.0" },
      );

      errorHandler(
        prismaError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle ValidationError (name === 'ValidationError')", () => {
      const error = new Error("Validation failed") as any;
      error.name = "ValidationError";

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it("should handle UnauthorizedError (name === 'UnauthorizedError')", () => {
      const error = new Error("Unauthorized") as any;
      error.name = "UnauthorizedError";

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it("should handle errors with 'unauthorized' in message", () => {
      const error = new Error("access unauthorized");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it("should handle Prisma validation error", () => {
      const prismaError = new Prisma.PrismaClientValidationError(
        "Invalid data",
        { clientVersion: "5.0.0" },
      );

      errorHandler(
        prismaError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should handle rate limit errors", () => {
      const error = new Error("Too many requests from this IP");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    it("should handle Firebase auth errors", () => {
      const error = new Error("Firebase ID token has expired");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it("should handle CORS errors", () => {
      const error = new Error("Not allowed by CORS");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it("should handle JSON parse errors", () => {
      const error = new SyntaxError("Unexpected token");
      (error as any).body = "invalid json";

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it("should handle generic errors as 500", () => {
      const error = new Error("Unexpected error");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should include stack trace in development mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new AppError("Test error", 400);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
          error: expect.any(String),
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("should NOT include stack trace in production mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new AppError("Test error", 400);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it("should sanitize error messages in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new Error("Database error at /app/src/controller.ts:42");
      (error as any).statusCode = 500;

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.message).toBe("An unexpected error occurred");

      process.env.NODE_ENV = originalEnv;
    });

    it("should include requestId in response", () => {
      (mockRequest as any).requestId = "test-request-id";
      const error = new AppError("Test error", 400);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: "test-request-id",
        }),
      );
    });

    it("should include userId in error log context", () => {
      (mockRequest as any).requestId = "test-request-id";
      (mockRequest as any).user = { uid: "user-123" };
      const error = new AppError("Test error", 400);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLogger.warn).toHaveBeenCalled();
      const logCall = (mockLogger.warn as jest.Mock).mock.calls[0][1];
      expect(logCall.userId).toBe("user-123");
    });
  });

  describe("notFoundHandler", () => {
    it("should create 404 AppError for undefined routes", () => {
      mockRequest.method = "GET";
      mockRequest.originalUrl = "/api/nonexistent";

      notFoundHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Route not found: GET /api/nonexistent",
          statusCode: 404,
        }),
      );
    });
  });

  describe("asyncHandler", () => {
    it("should handle successful async operations", async () => {
      const asyncFn = jest.fn().mockResolvedValue(undefined);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should catch async errors and pass to next", async () => {
      const error = new Error("Async error");
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it("should handle synchronous throws in async functions", async () => {
      const error = new Error("Sync throw in async");
      const asyncFn = jest.fn(async () => {
        throw error;
      });
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("Message Sanitization", () => {
    it("should sanitize file paths in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new AppError("Error in controller.ts at line 42", 400);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.message).not.toContain("controller.ts");

      process.env.NODE_ENV = originalEnv;
    });

    it("should limit message length to 200 characters in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const longMessage = "A".repeat(300);
      const error = new AppError(longMessage, 400);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.message.length).toBeLessThanOrEqual(200);

      process.env.NODE_ENV = originalEnv;
    });

    it("should preserve original message in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new AppError(
        "Detailed error with /file/path/controller.ts:42",
        400,
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.message).toContain("/file/path/controller.ts:42");

      process.env.NODE_ENV = originalEnv;
    });
  });
});
