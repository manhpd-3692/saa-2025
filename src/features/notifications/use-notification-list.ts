"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNotificationPage, type NotificationItem } from "./notifications-api";

export type ListStatus = "loading" | "ready" | "error";
export type MoreStatus = "idle" | "loading" | "error";

export interface NotificationListState {
  items: NotificationItem[];
  nextCursor: string | null;
  status: ListStatus;
  more: MoreStatus;
  /** When the shown rows were read; relative times count from here (ALG-001). */
  loadedAt: Date;
}

/**
 * The panel's list (A3, A4, FR-203, FR-403): the first page on open, older
 * pages appended by keyset cursor without duplicates; a failed first page shows
 * an error with retry, a failed older page keeps the loaded rows (US005).
 * Opening the panel marks nothing read (D011); `markRead` / `markAllRead`
 * mirror a successful A6 / A7 locally.
 */
export function useNotificationList() {
  const [state, setState] = useState<NotificationListState>(() => ({
    items: [],
    nextCursor: null,
    status: "loading",
    more: "idle",
    loadedAt: new Date(),
  }));
  const latest = useRef(state);
  const paging = useRef(false);
  useEffect(() => {
    latest.current = state;
  });

  const fetchFirst = useCallback(
    () =>
      fetchNotificationPage(null).then(
        (page) => setState({ items: page.items, nextCursor: page.nextCursor, status: "ready", more: "idle", loadedAt: new Date() }),
        (error) => {
          console.warn("notification list failed", error);
          setState((s) => ({ ...s, status: "error" }));
        },
      ),
    [],
  );

  useEffect(() => {
    void fetchFirst();
  }, [fetchFirst]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, status: "loading" }));
    void fetchFirst();
  }, [fetchFirst]);

  const loadMore = useCallback(async () => {
    const { nextCursor, status } = latest.current;
    if (!nextCursor || status !== "ready" || paging.current) return;
    paging.current = true;
    setState((s) => ({ ...s, more: "loading" }));
    try {
      const page = await fetchNotificationPage(nextCursor);
      setState((s) => {
        const known = new Set(s.items.map((item) => item.id));
        const older = page.items.filter((item) => !known.has(item.id));
        return { ...s, items: [...s.items, ...older], nextCursor: page.nextCursor, more: "idle", loadedAt: new Date() };
      });
    } catch (error) {
      console.warn("older notifications failed", error);
      setState((s) => ({ ...s, more: "error" }));
    } finally {
      paging.current = false;
    }
  }, []);

  const markRead = useCallback((id: string) => {
    const readAt = new Date().toISOString();
    setState((s) => ({ ...s, items: s.items.map((item) => (item.id === id && !item.readAt ? { ...item, readAt } : item)) }));
  }, []);

  const markAllRead = useCallback(() => {
    const readAt = new Date().toISOString();
    setState((s) => ({ ...s, items: s.items.map((item) => (item.readAt ? item : { ...item, readAt })) }));
  }, []);

  return { ...state, retry, loadMore, markRead, markAllRead };
}
