import admin from "firebase-admin";
import prisma from "../prisma";

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  actionUrl?: string;
  imageUrl?: string;
  priority?: "low" | "normal" | "high" | "urgent";
}

export interface SendResult {
  saved: boolean;
  pushSent: boolean;
  devicesReached: number;
  errors: string[];
}

class NotificationService {
  /**
   * Main notification dispatcher
   * Routes to appropriate channels based on user preferences
   * Phase 1: Push + In-App only (Email will be added in Phase 2)
   */
  async send(payload: NotificationPayload): Promise<SendResult> {
    const {
      userId,
      type,
      title,
      body,
      data,
      actionUrl,
      imageUrl,
      priority = "normal",
    } = payload;

    const result: SendResult = {
      saved: false,
      pushSent: false,
      devicesReached: 0,
      errors: [],
    };

    try {
      // 1. Always store in database (in-app notification center)
      await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          data: data || {},
          actionUrl,
          imageUrl,
          priority,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
      result.saved = true;

      // 2. Get user preferences (default to enabled if not set)
      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      const shouldSendPush = preferences?.pushEnabled !== false;

      // 3. Send push notification to all devices
      if (shouldSendPush) {
        const pushResult = await this.sendPushToAllDevices(userId, {
          title,
          body,
          data: { ...data, actionUrl, type },
        });
        result.pushSent = pushResult.sent;
        result.devicesReached = pushResult.devicesReached;
        result.errors.push(...pushResult.errors);
      }

      // TODO: Phase 2 - Add email notification for high/urgent priority
      // if (priority === 'high' || priority === 'urgent') {
      //   await this.sendEmailNotification(userId, { type, title, body, actionUrl });
      // }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Failed to send notification: ${errorMessage}`);
      console.error("NotificationService.send error:", error);
    }

    return result;
  }

  /**
   * Send push notification to all user's devices
   * Automatically cleans up invalid/expired tokens
   */
  private async sendPushToAllDevices(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, any> },
  ): Promise<{ sent: boolean; devicesReached: number; errors: string[] }> {
    const result = { sent: false, devicesReached: 0, errors: [] as string[] };

    try {
      const tokens = await prisma.deviceToken.findMany({
        where: { userId },
        select: { id: true, token: true },
      });

      if (tokens.length === 0) {
        result.errors.push("No device tokens found for user");
        return result;
      }

      const messaging = admin.messaging();
      const results = await Promise.allSettled(
        tokens.map(({ token }) =>
          messaging.send({
            token,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: payload.data,
            webpush: {
              headers: { Urgency: "high" },
              notification: {
                icon: "/vite.svg",
                badge: "/vite.svg",
                requireInteraction: true,
                tag: payload.data?.type || "general",
              },
              fcmOptions: {
                link: payload.data?.actionUrl,
              },
            },
          }),
        ),
      );

      // Clean up invalid tokens and count successes
      const invalidTokenIds: string[] = [];
      results.forEach((promiseResult, index) => {
        if (promiseResult.status === "fulfilled") {
          result.devicesReached++;
          result.sent = true;
        } else {
          const error = promiseResult.reason;
          if (
            error?.code === "messaging/invalid-registration-token" ||
            error?.code === "messaging/registration-token-not-registered"
          ) {
            invalidTokenIds.push(tokens[index].id);
          } else {
            result.errors.push(
              `Push failed: ${error?.message || "Unknown error"}`,
            );
          }
        }
      });

      // Remove invalid tokens from database
      if (invalidTokenIds.length > 0) {
        await prisma.deviceToken.deleteMany({
          where: { id: { in: invalidTokenIds } },
        });
        console.log(
          `Cleaned up ${invalidTokenIds.length} invalid device tokens`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Failed to send push notifications: ${errorMessage}`);
      console.error("sendPushToAllDevices error:", error);
    }

    return result;
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await prisma.notification.count({
        where: { userId, read: false },
      });
    } catch (error) {
      console.error("getUnreadCount error:", error);
      return 0;
    }
  }

  /**
   * Get paginated notifications for a user
   */
  async getNotifications(
    userId: string,
    options: {
      skip?: number;
      take?: number;
      includeRead?: boolean;
      type?: string;
    } = {},
  ) {
    const { skip = 0, take = 20, includeRead = true, type } = options;

    try {
      const where: any = { userId };
      if (!includeRead) {
        where.read = false;
      }
      if (type) {
        where.type = type;
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.notification.count({ where }),
      ]);

      return {
        notifications,
        total,
        hasMore: skip + take < total,
      };
    } catch (error) {
      console.error("getNotifications error:", error);
      return { notifications: [], total: 0, hasMore: false };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.update({
        where: { id: notificationId, userId },
        data: { read: true, readAt: new Date() },
      });
      return true;
    } catch (error) {
      console.error("markAsRead error:", error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true, readAt: new Date() },
      });
      return result.count;
    } catch (error) {
      console.error("markAllAsRead error:", error);
      return 0;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      await prisma.notification.delete({
        where: { id: notificationId, userId },
      });
      return true;
    } catch (error) {
      console.error("deleteNotification error:", error);
      return false;
    }
  }

  /**
   * Register a device token for push notifications
   */
  async registerDeviceToken(
    userId: string,
    token: string,
    deviceType: string,
    deviceName?: string,
    userAgent?: string,
  ): Promise<boolean> {
    try {
      await prisma.deviceToken.upsert({
        where: { token },
        create: {
          userId,
          token,
          deviceType,
          deviceName,
          userAgent,
        },
        update: {
          userId,
          deviceType,
          deviceName,
          userAgent,
          lastUsed: new Date(),
        },
      });
      return true;
    } catch (error) {
      console.error("registerDeviceToken error:", error);
      return false;
    }
  }

  /**
   * Unregister a device token
   */
  async unregisterDeviceToken(
    tokenOrId: string,
    userId?: string,
  ): Promise<boolean> {
    try {
      const where: any = userId
        ? { token: tokenOrId, userId }
        : { id: tokenOrId };

      await prisma.deviceToken.delete({ where });
      return true;
    } catch (error) {
      console.error("unregisterDeviceToken error:", error);
      return false;
    }
  }

  /**
   * Get all device tokens for a user
   */
  async getUserDevices(userId: string) {
    try {
      return await prisma.deviceToken.findMany({
        where: { userId },
        orderBy: { lastUsed: "desc" },
      });
    } catch (error) {
      console.error("getUserDevices error:", error);
      return [];
    }
  }

  /**
   * Get or create notification preferences for a user
   */
  async getPreferences(userId: string) {
    try {
      let preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      if (!preferences) {
        preferences = await prisma.notificationPreference.create({
          data: { userId },
        });
      }

      return preferences;
    } catch (error) {
      console.error("getPreferences error:", error);
      return null;
    }
  }

  /**
   * Update notification preferences for a user
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<any>,
  ): Promise<boolean> {
    try {
      await prisma.notificationPreference.upsert({
        where: { userId },
        create: { userId, ...preferences },
        update: preferences,
      });
      return true;
    } catch (error) {
      console.error("updatePreferences error:", error);
      return false;
    }
  }

  /**
   * Cleanup expired notifications (should be run as a cron job)
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          expiresAt: {
            lte: new Date(),
          },
        },
      });
      console.log(`Cleaned up ${result.count} expired notifications`);
      return result.count;
    } catch (error) {
      console.error("cleanupExpiredNotifications error:", error);
      return 0;
    }
  }
}

export default new NotificationService();
