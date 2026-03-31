import { Request, Response, NextFunction } from "express";

// Mock firebase-admin before importing the auth middleware
jest.mock("firebase-admin", () => ({
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

import admin from "firebase-admin";
import {
  authenticateToken,
  requireVerifiedEmail,
} from "../../src/middleware/auth";

function mockReqResNext(overrides: Partial<Request> = {}) {
  const req = {
    headers: {},
    path: "/test",
    ...overrides,
  } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe("authenticateToken", () => {
  it("returns 401 when no authorization header", async () => {
    const { req, res, next } = mockReqResNext();
    await authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "No authorization token provided" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when authorization header is not Bearer", async () => {
    const { req, res, next } = mockReqResNext({
      headers: { authorization: "Basic abc123" },
    } as any);
    await authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() and sets user on valid token", async () => {
    const mockDecodedToken = {
      uid: "user-123",
      email: "test@example.com",
      email_verified: true,
    };
    (admin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: jest.fn().mockResolvedValue(mockDecodedToken),
    });

    const { req, res, next } = mockReqResNext({
      headers: { authorization: "Bearer valid-token-123" },
    } as any);

    await authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user).toEqual({
      uid: "user-123",
      email: "test@example.com",
      emailVerified: true,
    });
  });

  it("returns 403 on invalid token", async () => {
    (admin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: jest.fn().mockRejectedValue(new Error("Invalid token")),
    });

    const { req, res, next } = mockReqResNext({
      headers: { authorization: "Bearer bad-token" },
    } as any);

    // Suppress console.error for this test
    jest.spyOn(console, "error").mockImplementation();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it("returns 503 on timeout", async () => {
    (admin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: jest
        .fn()
        .mockRejectedValue(new Error("Token verification timeout")),
    });

    const { req, res, next } = mockReqResNext({
      headers: { authorization: "Bearer slow-token" },
    } as any);

    jest.spyOn(console, "error").mockImplementation();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Authentication service temporarily unavailable",
      }),
    );

    jest.restoreAllMocks();
  });
});

describe("requireVerifiedEmail", () => {
  it("calls next() when email is verified", () => {
    const { req, res, next } = mockReqResNext();
    (req as any).user = { uid: "u1", email: "a@b.com", emailVerified: true };
    requireVerifiedEmail(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("returns 403 when email is not verified", () => {
    const { req, res, next } = mockReqResNext();
    (req as any).user = { uid: "u1", email: "a@b.com", emailVerified: false };
    requireVerifiedEmail(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Email verification required" }),
    );
  });

  it("returns 403 when no user on request", () => {
    const { req, res, next } = mockReqResNext();
    requireVerifiedEmail(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
