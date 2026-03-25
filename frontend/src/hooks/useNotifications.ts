import { useEffect, useRef } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "../firebase";
import apiClient from "../utils/apiClient";

/**
 * Hook to manage push notifications via Firebase Cloud Messaging.
 * Requests permission, gets FCM token, saves it to backend,
 * and handles foreground notifications.
 */
export function useNotifications(userId: string | undefined) {
  const savedForUserIdRef = useRef<string | null>(null);

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

        // Save token to backend
        await apiClient.post("/api/notifications/token", { token });
        savedForUserIdRef.current = userId;

        // Handle foreground messages
        unsubscribeOnMessage = onMessage(messaging, (payload) => {
          const { title, body } = payload.notification || {};
          if (title) {
            new Notification(title, {
              body: body || "",
              icon: "/vite.svg",
            });
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
  }, [userId]);
}
