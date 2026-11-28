"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KudoCardData, KudoPage, SectionResult } from "./kudo-card-types";
import { fetchFeedPage } from "./kudos-board-api";
import { useRefreshOnFocus } from "./use-board-section";

/** SM-001: loading (first page) → ready ↔ loadingMore → ready | error; end = ready without a cursor. */
export type FeedStatus = "loading" | "ready" | "loadingMore" | "error";

interface FeedState {
  items: KudoCardData[];
  nextCursor: string | null;
  status: FeedStatus;
}

function fromInitial(initial: SectionResult<KudoPage>): FeedState {
  return "data" in initial
    ? { items: initial.data.items, nextCursor: initial.data.nextCursor, status: "ready" }
    : { items: [], nextCursor: null, status: "error" };
}

/**
 * A fresh first page joins the cards already shown without disturbing the
 * scrolling sequence: shown cards take the fresh data (hearts, edits), newer
 * kudos go on top, nothing is removed or repeated.
 */
function mergeFirstPage(state: FeedState, page: KudoPage): FeedState {
  if (state.items.length === 0) return { items: page.items, nextCursor: page.nextCursor, status: "ready" };
  const fresh = new Map(page.items.map((card) => [card.id, card]));
  const known = new Set(state.items.map((card) => card.id));
  const top = Date.parse(state.items[0].createdAt);
  const newer = page.items.filter((card) => !known.has(card.id) && Date.parse(card.createdAt) > top);
  return { ...state, items: [...newer, ...state.items.map((card) => fresh.get(card.id) ?? card)] };
}

/**
 * A5 All Kudos feed state (BR-005, ALG-001): pages of 10 by keyset cursor,
 * appended without duplicates; a failed page keeps the loaded cards and offers
 * Retry; refocus and a server refresh merge the newest page on top (D012).
 */
export function useAllKudosFeed(initial: SectionResult<KudoPage>) {
  const [state, setState] = useState<FeedState>(() => fromInitial(initial));
  const [seenInitial, setSeenInitial] = useState(initial);
  const latest = useRef(state);
  // Separate flags: a silent refocus refresh must never swallow a page request (the sentinel
  // stays in view and would not fire again, review S1).
  const paging = useRef(false);
  const refreshing = useRef(false);
  useEffect(() => {
    latest.current = state;
  });

  if (initial !== seenInitial) {
    setSeenInitial(initial);
    if ("data" in initial) setState(mergeFirstPage(state, initial.data));
  }

  const loadMore = useCallback(() => {
    const { nextCursor, status } = latest.current;
    if (paging.current || !nextCursor || status !== "ready") return;
    paging.current = true;
    setState((s) => ({ ...s, status: "loadingMore" }));
    fetchFeedPage(nextCursor)
      .then(
        (page) =>
          setState((s) => {
            const known = new Set(s.items.map((card) => card.id));
            return { items: [...s.items, ...page.items.filter((card) => !known.has(card.id))], nextCursor: page.nextCursor, status: "ready" };
          }),
        () => setState((s) => ({ ...s, status: "error" })),
      )
      .finally(() => {
        paging.current = false;
      });
  }, []);

  const loadFirst = useCallback((silent: boolean) => {
    if (refreshing.current) return;
    refreshing.current = true;
    if (!silent) setState((s) => ({ ...s, status: "loading" }));
    fetchFeedPage(null)
      .then(
        (page) => setState((s) => mergeFirstPage(s, page)),
        () => {
          if (!silent) setState((s) => ({ ...s, status: "error" }));
        },
      )
      .finally(() => {
        refreshing.current = false;
      });
  }, []);

  const retry = useCallback(() => {
    if (latest.current.items.length === 0) {
      loadFirst(false);
      return;
    }
    latest.current = { ...latest.current, status: "ready" };
    setState((s) => ({ ...s, status: "ready" }));
    loadMore();
  }, [loadFirst, loadMore]);

  useRefreshOnFocus(useCallback(() => loadFirst(latest.current.items.length > 0), [loadFirst]));

  return { ...state, loadMore, retry };
}
