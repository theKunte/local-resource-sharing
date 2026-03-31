import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  debugListUsers,
  registerUser,
  fixUserEmail,
} from "../controllers/authController";

const router = Router();

router.get("/debug/users", authenticateToken, debugListUsers);
router.post("/auth/register", authenticateToken, registerUser);
router.put("/auth/fix-user-email", authenticateToken, fixUserEmail);

export default router;
