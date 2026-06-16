import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
} from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "../firebase";
import apiClient from "../utils/apiClient";

// ---------------------------------------------------------------------------
// Singleton unread-count store — shared across all useNotifications callers
// so that multiple mounted components (e.g. Header + NotificationCenter)
// never run more than one polling interval for the same user.
//
// The last-known count is persisted to sessionStorage so the bell renders
// the correct badge instantly on page load instead of showing 0 until the
// first network fetch completes.
// ---------------------------------------------------------------------------
const _UC_STORAGE_KEY = "uc_unread_count";

function _ucReadStorage(): number {
  try {
    return parseInt(sessionStorage.getItem(_UC_STORAGE_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

const _ucListeners: Set<() => void> = new Set();
let _ucCount: number = _ucReadStorage();
let _ucActiveUserId: string | undefined;
let _ucInterval: ReturnType<typeof setInterval> | null = null;
let _ucSubscribers = 0;

function _ucNotify() {
  try {
    sessionStorage.setItem(_UC_STORAGE_KEY, String(_ucCount));
  } catch {
    // sessionStorage unavailable (private browsing restrictions etc.) — ignore
  }
  for (const l of _ucListeners) l();
}

async function _ucFetch(_userId: string) {
  try {
    const res = await apiClient.get("/api/v1/notifications/unread-count");
    const count: number = res.data.count ?? 0;
    if (count !== _ucCount) {
      _ucCount = count;
      _ucNotify();
    }
  } catch {
    // silently ignore — polling will retry next interval
  }
}

function _ucStartPolling(userId: string) {
  if (_ucInterval && _ucActiveUserId === userId) return;
  _ucStopPolling();
  _ucActiveUserId = userId;
  _ucFetch(userId);
  _ucInterval = setInterval(() => _ucFetch(userId), 30_000);
}

function _ucStopPolling() {
  if (_ucInterval) {
    clearInterval(_ucInterval);
    _ucInterval = null;
  }
  _ucActiveUserId = undefined;
  _ucCount = 0;
  try {
    sessionStorage.removeItem(_UC_STORAGE_KEY);
  } catch {
    // ignore
  }
  _ucNotify();
}

function _ucSubscribe(listener: () => void) {
  _ucListeners.add(listener);
  _ucSubscribers++;
  return () => {
    _ucListeners.delete(listener);
    _ucSubscribers = Math.max(0, _ucSubscribers - 1);
    if (_ucSubscribers === 0) _ucStopPolling();
  };
}

function _ucSnapshot() {
  return _ucCount;
}

// Module-level pure function — no need to redefine on every render
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let deviceType = "web";
  let deviceName = "Unknown Browser";

  if (/android/i.test(ua)) {
    deviceType = "android";
  } else if (/iPad|iPhone|iPod/.test(ua)) {
    deviceType = "ios";
  }

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
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
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
  const unreadCount = useSyncExternalStore(_ucSubscribe, _ucSnapshot);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Expose a manual refresh for the singleton count (e.g. after mark-as-read)
  const fetchUnreadCount = useCallback(() => {
    if (userId) _ucFetch(userId);
  }, [userId]);

  // Start/stop singleton polling when userId changes
  useEffect(() => {
    if (userId) {
      _ucStartPolling(userId);
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
        // Re-fetch from server to stay in sync (avoids drift if already read elsewhere)
        _ucFetch(userId);
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
      // Re-fetch from server to stay in sync
      _ucFetch(userId);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, [userId]);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!userId) return;
      // Capture before async call so state hasn't changed yet
      const notification = notifications.find((n) => n.id === notificationId);
      // Optimistic update
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      try {
        await apiClient.delete(`/api/v1/notifications/${notificationId}`);
        // Re-fetch count if we deleted an unread notification
        if (notification && !notification.read) {
          _ucFetch(userId);
        }
      } catch (error) {
        // Revert optimistic update on failure
        if (notification) {
          setNotifications((prev) => {
            // Re-insert in original position by id ordering
            const next = [...prev, notification];
            next.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            );
            return next;
          });
        }
        console.error("Failed to delete notification:", error);
      }
    },
    [userId, notifications],
  );

  // Detect device type and browser name — now a module-level function

  useEffect(() => {
    // Re-run setup when userId changes (handles sign-out → sign-in same user)
    if (!userId) return;
    if (savedForUserIdRef.current === userId) return;

    let unsubscribeOnMessage: (() => void) | undefined;

    const setup = async () => {
      try {
        // Check if browser supports notifications
        if (!("Notification" in window)) return;

        // Only prompt if permission hasn't been decided yet.
        // If already 'denied' or blocked by Chrome's repeated-dismissal policy,
        // calling requestPermission() again just wastes the quota and triggers
        // the "blocked" console warning.
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }
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
            _ucCount += 1;
            _ucNotify();
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
      // Reset so a future sign-in (even same uid) re-registers the FCM token
      savedForUserIdRef.current = null;
    };
  }, [userId, fetchUnreadCount, fetchNotifications]);

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
