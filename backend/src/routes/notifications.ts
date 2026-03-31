import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { saveNotificationToken } from "../controllers/notificationController";

const router = Router();

router.post("/token", authenticateToken, saveNotificationToken);

export default router;
