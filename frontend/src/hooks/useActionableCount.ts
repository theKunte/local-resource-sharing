import { useEffect, useSyncExternalStore } from "react";
import apiClient from "../utils/apiClient";

/**
 * Singleton polling store so that multiple components calling
 * useActionableCount() share a single 30s polling interval.
 */
let _listeners: Set<() => void> = new Set();
let _count = 0;
let _activeUserId: string | undefined;
let _interval: ReturnType<typeof setInterval> | null = null;
let _subscribers = 0;

function notifyListeners() {
  for (const listener of _listeners) listener();
}

async function fetchCount(userId: string) {
  try {
    const res = await apiClient.get(
      `/api/borrow-requests?userId=${userId}&role=owner`,
    );
    const requests = res.data.requests || res.data;
    if (!Array.isArray(requests)) return;

    const actionable = requests.filter(
      (r: any) =>
        r.status === "PENDING" ||
        (r.status === "APPROVED" &&
          r.loan?.status === "PENDING_RETURN_CONFIRMATION"),
    ).length;

    if (import.meta.env.DEV) {
      console.log(
        `[ActionableCount] ${actionable} of ${requests.length} owner requests need action`,
      );
    }

    if (actionable !== _count) {
      _count = actionable;
      notifyListeners();
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[ActionableCount] fetch failed:", err);
    }
  }
}

function startPolling(userId: string) {
  if (_interval && _activeUserId === userId) return;
  stopPolling();
  _activeUserId = userId;
  fetchCount(userId);
  _interval = setInterval(() => fetchCount(userId), 30_000);
}

function stopPolling() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
  _activeUserId = undefined;
  _count = 0;
  notifyListeners();
}

function subscribe(listener: () => void) {
  _listeners.add(listener);
  _subscribers++;
  return () => {
    _listeners.delete(listener);
    _subscribers--;
    if (_subscribers === 0) stopPolling();
  };
}

function getSnapshot() {
  return _count;
}

/**
 * Returns the count of requests needing the user's attention:
 * - Incoming PENDING borrow requests (owner must accept/decline)
 * - PENDING_RETURN_CONFIRMATION loans (owner must confirm return)
 *
 * Safe to call from multiple components — only one polling interval runs.
 */
export function useActionableCount(userId: string | undefined): number {
  const count = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    if (userId) {
      startPolling(userId);
    }
  }, [userId]);

  return userId ? count : 0;
}
