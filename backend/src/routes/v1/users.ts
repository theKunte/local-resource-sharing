import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateToken } from "../../middleware/auth";
import { getUserGroups } from "../../controllers/groupController";

const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.get("/:userId/groups", authenticateToken, readLimiter, getUserGroups);

export default router;
