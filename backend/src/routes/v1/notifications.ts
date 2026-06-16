import { Router } from "express";
import { authenticateToken } from "../../middleware/auth";
import {
  registerDeviceToken,
  getUserDevices,
  unregisterDeviceToken,
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../../controllers/notificationController";

const router = Router();

// Device token management
router.post("/device-tokens", authenticateToken, registerDeviceToken);
router.get("/device-tokens", authenticateToken, getUserDevices);
router.delete("/device-tokens/:id", authenticateToken, unregisterDeviceToken);

// Notification management
router.get("/", authenticateToken, getNotifications);
router.get("/unread-count", authenticateToken, getUnreadCount);
router.put("/:id/read", authenticateToken, markNotificationAsRead);
router.put("/read-all", authenticateToken, markAllNotificationsAsRead);
router.delete("/:id", authenticateToken, deleteNotification);

// Notification preferences
router.get("/preferences", authenticateToken, getNotificationPreferences);
router.put("/preferences", authenticateToken, updateNotificationPreferences);

export default router;
