import { useEffect, useRef, useState, useCallback } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "../firebase";
import apiClient from "../utils/apiClient";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  actionUrl?: string;
  imageUrl?: string;
  priority: string;
  createdAt: string;
  readAt?: string;
}

/**
 * Hook to manage push notifications via Firebase Cloud Messaging.
 * Requests permission, gets FCM token, saves it to backend with multi-device support,
 * handles foreground notifications, and provides methods to fetch/manage notifications.
 */
export function useNotifications(userId: string | undefined) {
  const savedForUserIdRef = useRef<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await apiClient.get(
        "/api/v1/notifications/unread-count",
      );
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, [userId]);

  // Fetch notifications
  const fetchNotifications = useCallback(
    async (skip = 0, take = 20) => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const response = await apiClient.get("/api/v1/notifications", {
          params: { skip, take, includeRead: true },
        });
        setNotifications(response.data.notifications);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [userId],
  );

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!userId) return;
      try {
        await apiClient.put(`/api/v1/notifications/${notificationId}/read`);
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, read: true, readAt: new Date().toISOString() }
              : n,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    [userId],
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    try {
      await apiClient.put("/api/v1/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read: true,
          readAt: new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, [userId]);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!userId) return;
      try {
        await apiClient.delete(`/api/v1/notifications/${notificationId}`);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        // Decrement unread count if notification was unread
        const notification = notifications.find((n) => n.id === notificationId);
        if (notification && !notification.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        console.error("Failed to delete notification:", error);
      }
    },
    [userId, notifications],
  );

  // Detect device type and browser name
  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let deviceType = "web";
    let deviceName = "Unknown Browser";

    // Detect mobile
    if (/android/i.test(ua)) {
      deviceType = "android";
    } else if (/iPad|iPhone|iPod/.test(ua)) {
      deviceType = "ios";
    }

    // Detect browser
    if (ua.indexOf("Chrome") > -1) {
      deviceName = "Chrome";
    } else if (ua.indexOf("Safari") > -1) {
      deviceName = "Safari";
    } else if (ua.indexOf("Firefox") > -1) {
      deviceName = "Firefox";
    } else if (ua.indexOf("Edge") > -1) {
      deviceName = "Edge";
    } else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) {
      deviceName = "Opera";
    }

    return { deviceType, deviceName };
  };

  useEffect(() => {
    if (!userId || savedForUserIdRef.current === userId) return;

    let unsubscribeOnMessage: (() => void) | undefined;

    const setup = async () => {
      try {
        // Check if browser supports notifications
        if (!("Notification" in window)) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        // Get VAPID key from environment
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.warn(
            "VITE_FIREBASE_VAPID_KEY not set — push notifications disabled",
          );
          return;
        }

        // Get FCM token
        const token = await getToken(messaging, { vapidKey });
        if (!token) return;

        // Save token to backend with device info (multi-device support)
        const { deviceType, deviceName } = getDeviceInfo();
        await apiClient.post("/api/v1/notifications/device-tokens", {
          token,
          deviceType,
          deviceName,
        });
        savedForUserIdRef.current = userId;

        // Fetch initial unread count
        fetchUnreadCount();

        // Handle foreground messages
        unsubscribeOnMessage = onMessage(messaging, (payload) => {
          const { title, body } = payload.notification || {};
          if (title) {
            // Show browser notification
            new Notification(title, {
              body: body || "",
              icon: "/vite.svg",
            });

            // Increment unread count and refetch notifications
            setUnreadCount((prev) => prev + 1);
            fetchNotifications();
          }
        });
      } catch (error) {
        console.error("Push notification setup failed:", error);
      }
    };

    setup();

    return () => {
      unsubscribeOnMessage?.();
    };
  }, [userId, fetchUnreadCount, fetchNotifications]);

  // Poll for unread count every 30 seconds (for real-time updates)
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [userId, fetchUnreadCount]);

  return {
    unreadCount,
    notifications,
    isLoading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
