import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateToken } from "../middleware/auth";
import {
  debugListUsers,
  registerUser,
  fixUserEmail,
} from "../controllers/authController";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: "Too many authentication requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.get("/debug/users", authenticateToken, authLimiter, debugListUsers);
router.post("/auth/register", authenticateToken, authLimiter, registerUser);
router.put("/auth/fix-user-email", authenticateToken, authLimiter, fixUserEmail);

export default router;
