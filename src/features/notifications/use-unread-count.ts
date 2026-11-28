"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchUnreadCount, UNREAD_REFRESH_INTERVAL_MS } from "./notifications-api";
import { shouldLogRefreshFailure, shouldRefreshOnReturn } from "./unread-refresh-policy";

/**
 * F009 A2 bell state of ONE signed-in Sunner (FR-205, FR-404, D010): the bell
 * mounts it keyed by the user id, so another user never sees or receives this
 * count (review W1). The count is read on mount, when the window regains focus
 * or the tab is shown again (at most once per 5 s, review W3), and every
 * UNREAD_REFRESH_INTERVAL_MS while the page is visible — no live push. A failed
 * read keeps the last known count (US001); only the newest answer is applied,
 * and unmounting cancels the read in flight. `null` = not known yet. `adjust`
 * lets the panel move the count at once after a mark-read.
 */
export function useUnreadCount() {
  const [count, setCount] = useState<number | null>(null);
  const sequence = useRef(0);
  const inFlight = useRef<AbortController | null>(null);
  const lastStartedAt = useRef(Number.NEGATIVE_INFINITY);

  const refresh = useCallback((): Promise<void> => {
    inFlight.current?.abort(); // the newest read wins
    const controller = new AbortController();
    inFlight.current = controller;
    lastStartedAt.current = Date.now();
    const mine = ++sequence.current;
    return fetchUnreadCount(controller.signal).then(
      (next) => {
        if (mine === sequence.current) setCount(next);
      },
      (error) => {
        if (shouldLogRefreshFailure(error, controller.signal.aborted)) console.warn("notification unread count refresh failed", error);
      },
    );
  }, []);

  const adjust = useCallback((change: (current: number) => number) => {
    sequence.current++; // an older answer in flight must not undo this change
    setCount((current) => Math.max(0, change(current ?? 0)));
  }, []);

  useEffect(() => {
    const latestRead = sequence; // the ref objects themselves: cleanup bumps their latest value
    const reading = inFlight;
    void refresh();
    const onReturn = () => {
      if (shouldRefreshOnReturn(document.visibilityState === "visible", lastStartedAt.current, Date.now())) void refresh();
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, UNREAD_REFRESH_INTERVAL_MS);
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
      latestRead.current++; // an answer for this user that is still on its way is never applied
      reading.current?.abort();
    };
  }, [refresh]);

  return { count, refresh, adjust };
}
