import { Request, Response, NextFunction } from "express";
import {
  validateRequestSize,
  validateImageSize,
} from "../../src/middleware/requestValidation";

function mockReqResNext(overrides: Partial<Request> = {}) {
  const req = {
    headers: {},
    body: {},
    path: "/test",
    get: jest.fn((header: string) => {
      const h = header.toLowerCase();
      return (req.headers as any)[h];
    }),
    ...overrides,
  } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe("validateRequestSize", () => {
  it("calls next() when content-length is within limit", () => {
    const middleware = validateRequestSize(1024);
    const { req, res, next } = mockReqResNext();
    (req.get as jest.Mock).mockReturnValue("512");
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("returns 413 when content-length exceeds limit", () => {
    const middleware = validateRequestSize(1024);
    const { req, res, next } = mockReqResNext();
    (req.get as jest.Mock).mockReturnValue("2048");
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Request too large" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when no content-length header", () => {
    const middleware = validateRequestSize(1024);
    const { req, res, next } = mockReqResNext();
    (req.get as jest.Mock).mockReturnValue(undefined);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("validateImageSize", () => {
  it("calls next() when no image in body", () => {
    const { req, res, next } = mockReqResNext();
    validateImageSize(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("calls next() when image is small enough", () => {
    const { req, res, next } = mockReqResNext();
    req.body = { image: "a".repeat(100) };
    validateImageSize(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("returns 413 when image is too large", () => {
    const { req, res, next } = mockReqResNext();
    // 10MB in base64 chars ~ 13.3M chars, use 15M to be safe
    req.body = { image: "a".repeat(15_000_000) };
    validateImageSize(req, res, next);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Image too large" }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
