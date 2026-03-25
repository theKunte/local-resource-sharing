import { useEffect, useRef, useState } from "react";
import apiClient from "../utils/apiClient";

/**
 * Returns the count of requests needing the user's attention:
 * - Incoming PENDING borrow requests (owner must accept/decline)
 * - PENDING_RETURN_CONFIRMATION loans (owner must confirm return)
 */
export function useActionableCount(userId: string | undefined): number {
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    const fetchCount = async () => {
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

        setCount(actionable);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("[ActionableCount] fetch failed:", err);
        }
      }
    };

    fetchCount();
    intervalRef.current = setInterval(fetchCount, 30_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userId]);

  return count;
}
