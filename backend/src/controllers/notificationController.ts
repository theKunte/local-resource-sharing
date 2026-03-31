import { Request, Response } from "express";
import prisma from "../prisma";

// POST /api/notifications/token
export async function saveNotificationToken(req: Request, res: Response) {
  const uid = (req as any).user.uid;
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
