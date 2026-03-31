import { Request, Response, NextFunction } from "express";
import { requestIdMiddleware } from "../../src/middleware/requestId";

function mockReqResNext() {
  const req = {
    headers: {},
  } as unknown as Request;
  const res = {
    setHeader: jest.fn(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe("requestIdMiddleware", () => {
  it("generates a UUID when no X-Request-Id header", () => {
    const { req, res, next } = mockReqResNext();
    requestIdMiddleware(req, res, next);

    expect((req as any).requestId).toBeDefined();
    expect(typeof (req as any).requestId).toBe("string");
    expect((req as any).requestId.length).toBeGreaterThan(0);
    expect(res.setHeader).toHaveBeenCalledWith(
      "X-Request-Id",
      (req as any).requestId,
    );
    expect(next).toHaveBeenCalled();
  });

  it("uses existing X-Request-Id from headers", () => {
    const { req, res, next } = mockReqResNext();
    req.headers["x-request-id"] = "custom-id-123";
    requestIdMiddleware(req, res, next);

    expect((req as any).requestId).toBe("custom-id-123");
    expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", "custom-id-123");
    expect(next).toHaveBeenCalled();
  });
});
