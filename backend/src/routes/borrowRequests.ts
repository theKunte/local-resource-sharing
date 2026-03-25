import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateToken } from "../middleware/auth";
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

router.post("/", authenticateToken, writeLimiter, createBorrowRequest);
router.get("/", authenticateToken, getBorrowRequests);
router.post("/:id/accept", authenticateToken, acceptBorrowRequest);
router.post("/:id/decline", authenticateToken, declineBorrowRequest);
router.post("/:id/cancel", authenticateToken, cancelBorrowRequest);
router.put("/:id", authenticateToken, updateBorrowRequest);
router.delete("/:id", authenticateToken, deleteBorrowRequest);
router.post("/:id/mark-returned", authenticateToken, markReturned);

export default router;
