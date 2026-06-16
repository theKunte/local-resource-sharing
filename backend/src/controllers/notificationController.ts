import { Request, Response } from "express";
import prisma from "../prisma";
import NotificationService from "../services/NotificationService";

// POST /api/notifications/token
// @deprecated - Use POST /api/v1/device-tokens instead
// Kept for backward compatibility
export async function saveNotificationToken(req: Request, res: Response) {
  const uid = req.user!.uid;
  const { token } = req.body;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Valid token string is required" });
  }

  try {
    await prisma.user.update({
      where: { id: uid },
      data: { fcmToken: token },
    });

    res.json({ success: true, message: "Notification token saved" });
  } catch (error) {
    console.error("Error saving FCM token:", error);
    res.status(500).json({ error: "Failed to save notification token" });
  }
}

// POST /api/v1/device-tokens
// Register a new device token for push notifications
export async function registerDeviceToken(req: Request, res: Response) {
  const userId = req.user!.uid;
  const { token, deviceType, deviceName } = req.body;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Valid token string is required" });
  }

  if (!deviceType || typeof deviceType !== "string") {
    return res
      .status(400)
      .json({ error: "Valid deviceType is required (web, ios, android)" });
  }

  try {
    const userAgent = req.headers["user-agent"];
    const success = await NotificationService.registerDeviceToken(
      userId,
      token,
      deviceType,
      deviceName,
      userAgent,
    );

    if (success) {
      res.json({ success: true, message: "Device token registered" });
    } else {
      res.status(500).json({ error: "Failed to register device token" });
    }
  } catch (error) {
    console.error("Error registering device token:", error);
    res.status(500).json({ error: "Failed to register device token" });
  }
}

// GET /api/v1/device-tokens
// Get all registered devices for the current user
export async function getUserDevices(req: Request, res: Response) {
  const userId = req.user!.uid;

  try {
    const devices = await NotificationService.getUserDevices(userId);
    res.json({ devices });
  } catch (error) {
    console.error("Error fetching user devices:", error);
    res.status(500).json({ error: "Failed to fetch devices" });
  }
}

// DELETE /api/v1/device-tokens/:id
// Unregister a device token
export async function unregisterDeviceToken(req: Request, res: Response) {
  const userId = req.user!.uid;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Device ID is required" });
  }

  try {
    const success = await NotificationService.unregisterDeviceToken(id, userId);
    if (success) {
      res.json({ success: true, message: "Device token unregistered" });
    } else {
      res.status(404).json({ error: "Device token not found" });
    }
  } catch (error) {
    console.error("Error unregistering device token:", error);
    res.status(500).json({ error: "Failed to unregister device token" });
  }
}

// GET /api/v1/notifications
// Get paginated notifications for the current user
export async function getNotifications(req: Request, res: Response) {
  const userId = req.user!.uid;
  const skip = parseInt(req.query.skip as string) || 0;
  const take = parseInt(req.query.take as string) || 20;
  const includeRead = req.query.includeRead !== "false";
  const type = req.query.type as string | undefined;

  try {
    const result = await NotificationService.getNotifications(userId, {
      skip,
      take,
      includeRead,
      type,
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
}

// GET /api/v1/notifications/unread-count
// Get unread notification count
export async function getUnreadCount(req: Request, res: Response) {
  const userId = req.user!.uid;

  try {
    const count = await NotificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
}

// PUT /api/v1/notifications/:id/read
// Mark a single notification as read
export async function markNotificationAsRead(req: Request, res: Response) {
  const userId = req.user!.uid;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Notification ID is required" });
  }

  try {
    const success = await NotificationService.markAsRead(id, userId);
    if (success) {
      res.json({ success: true, message: "Notification marked as read" });
    } else {
      res.status(404).json({ error: "Notification not found" });
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
}

// PUT /api/v1/notifications/read-all
// Mark all notifications as read
export async function markAllNotificationsAsRead(req: Request, res: Response) {
  const userId = req.user!.uid;

  try {
    const count = await NotificationService.markAllAsRead(userId);
    res.json({
      success: true,
      count,
      message: `${count} notifications marked as read`,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
}

// DELETE /api/v1/notifications/:id
// Delete a notification
export async function deleteNotification(req: Request, res: Response) {
  const userId = req.user!.uid;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Notification ID is required" });
  }

  try {
    const success = await NotificationService.deleteNotification(id, userId);
    if (success) {
      res.json({ success: true, message: "Notification deleted" });
    } else {
      res.status(404).json({ error: "Notification not found" });
    }
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Failed to delete notification" });
  }
}

// GET /api/v1/notification-preferences
// Get notification preferences for the current user
export async function getNotificationPreferences(req: Request, res: Response) {
  const userId = req.user!.uid;

  try {
    const preferences = await NotificationService.getPreferences(userId);
    if (preferences) {
      res.json(preferences);
    } else {
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
}

// PUT /api/v1/notification-preferences
// Update notification preferences
export async function updateNotificationPreferences(
  req: Request,
  res: Response,
) {
  const userId = req.user!.uid;
  const preferences = req.body;

  try {
    const success = await NotificationService.updatePreferences(
      userId,
      preferences,
    );
    if (success) {
      res.json({ success: true, message: "Preferences updated" });
    } else {
      res.status(500).json({ error: "Failed to update preferences" });
    }
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    res.status(500).json({ error: "Failed to update preferences" });
  }
}
