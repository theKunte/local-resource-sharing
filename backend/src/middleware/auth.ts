/**
 * Firebase Admin Authentication Middleware
 * Validates Firebase ID tokens on every backend request
 */
import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

// Initialize Firebase Admin (do this once in index.ts)
// You'll need to download service account key from Firebase Console
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error) {
    console.error("Firebase admin initialization error:", error);
  }
}

/**
 * Middleware to verify Firebase ID token
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const token = authHeader.split("Bearer ")[1];

    // Verify the token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attach user info to request for use in routes
    (req as any).user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

/**
 * Optional: Check if user owns the resource
 */
export function authorizeResourceOwner(resourceIdParam: string = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const resourceId = req.params[resourceIdParam];

    // Add your resource ownership check here
    // Example: const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    // if (resource.ownerId !== user.uid) return res.status(403).json({ error: 'Forbidden' });

    next();
  };
}
