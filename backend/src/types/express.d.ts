/**
 * Express Request type extensions
 * Adds custom properties attached by middleware
 */

export interface AuthenticatedUser {
  uid: string;
  email: string | undefined;
  emailVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}
