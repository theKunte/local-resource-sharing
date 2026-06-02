import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateToken, requireVerifiedEmail } from "../middleware/auth";
import { requestReturn, confirmReturn } from "../controllers/loanController";

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post(
  "/:id/request-return",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  requestReturn,
);
router.post(
  "/:id/confirm-return",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  confirmReturn,
);

export default router;
