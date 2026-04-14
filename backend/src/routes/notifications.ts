import { Router } from "express";
import { authenticateToken, requireVerifiedEmail } from "../middleware/auth";
import { saveNotificationToken } from "../controllers/notificationController";

const router = Router();

router.post(
  "/token",
  authenticateToken,
  requireVerifiedEmail,
  saveNotificationToken,
);

export default router;
