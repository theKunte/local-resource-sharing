import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateToken, requireVerifiedEmail } from "../middleware/auth";
import {
  createBorrowRequest,
  getBorrowRequests,
  acceptBorrowRequest,
  declineBorrowRequest,
  cancelBorrowRequest,
  updateBorrowRequest,
  deleteBorrowRequest,
} from "../controllers/borrowRequestController";
import { markReturned } from "../controllers/loanController";

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post(
  "/",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  createBorrowRequest,
);
router.get("/", authenticateToken, getBorrowRequests);
router.post(
  "/:id/accept",
  authenticateToken,
  requireVerifiedEmail,
  acceptBorrowRequest,
);
router.post(
  "/:id/decline",
  authenticateToken,
  requireVerifiedEmail,
  declineBorrowRequest,
);
router.post(
  "/:id/cancel",
  authenticateToken,
  requireVerifiedEmail,
  cancelBorrowRequest,
);
router.put(
  "/:id",
  authenticateToken,
  requireVerifiedEmail,
  updateBorrowRequest,
);
router.delete(
  "/:id",
  authenticateToken,
  requireVerifiedEmail,
  deleteBorrowRequest,
);
router.post(
  "/:id/mark-returned",
  authenticateToken,
  requireVerifiedEmail,
  markReturned,
);

export default router;
