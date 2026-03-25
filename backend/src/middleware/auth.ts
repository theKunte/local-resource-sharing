/**
 * Firebase Admin Authentication Middleware
 * Validates Firebase ID tokens with revocation check and timeout protection
 */
import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

/**
 * Middleware to verify Firebase ID token with revocation check and timeout
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const token = authHeader.split("Bearer ")[1];

    // Verify the token with Firebase Admin with timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Token verification timeout")), 10000);
    });

    const decodedToken = await Promise.race([
      admin.auth().verifyIdToken(token, true), // checkRevoked = true
      timeoutPromise,
    ]);

    // Attach user info to request
    (req as any).user = {
      uid: (decodedToken as any).uid,
      email: (decodedToken as any).email,
      emailVerified: (decodedToken as any).email_verified,
    };

    next();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Token verification failed:", {
      error: errorMessage,
      timestamp: new Date().toISOString(),
      path: req.path,
    });

    if (errorMessage.includes("timeout")) {
      return res.status(503).json({
        error: "Authentication service temporarily unavailable",
        message: "Please try again in a moment",
      });
    }

    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware to require verified email
 */
export function requireVerifiedEmail(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = (req as any).user;

  if (!user || !user.emailVerified) {
    return res.status(403).json({
      error: "Email verification required",
      message: "Please verify your email address to access this resource",
    });
  }

  next();
}
