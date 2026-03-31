import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId =
    (req.headers["x-request-id"] as string) || crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}
