import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { SESSION_CONFIG } from "../config/session";

const TIMEOUT_DURATION = SESSION_CONFIG.TIMEOUT;
const WARNING_DURATION = SESSION_CONFIG.WARNING_TIME;

export function useSessionTimeout() {
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);

  const logout = () => {
    setShowWarning(false);
    signOut(auth).catch((error) => {
      console.error("Error during session timeout logout:", error);
    });
  };

  const resetTimeout = () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);

    // Clear existing timeouts
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    if (warningIdRef.current) {
      clearTimeout(warningIdRef.current);
    }

    // Show warning 1 minute before timeout
    warningIdRef.current = setTimeout(() => {
      setShowWarning(true);
    }, TIMEOUT_DURATION - WARNING_DURATION);

    // Set logout timeout
    timeoutIdRef.current = setTimeout(logout, TIMEOUT_DURATION);
  };

  const extendSession = () => {
    resetTimeout();
  };

  useEffect(() => {
    // Only start timeout if user is logged in
    if (!auth.currentUser) {
      return;
    }

    // Activity events to track
    const events = SESSION_CONFIG.ACTIVITY_EVENTS;

    // Reset timeout on any user activity
    const handleActivity = () => {
      resetTimeout();
    };

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, true);
    });

    // Start initial timeout
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity, true);
      });
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (warningIdRef.current) {
        clearTimeout(warningIdRef.current);
      }
      setShowWarning(false);
    };
  }, [auth.currentUser]);

  return { showWarning, extendSession, logout };
}
