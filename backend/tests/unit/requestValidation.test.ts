import { Request, Response, NextFunction } from "express";
import {
  validateRequestSize,
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
