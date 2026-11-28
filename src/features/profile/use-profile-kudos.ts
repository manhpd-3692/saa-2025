"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KudoPage, SectionResult } from "@/features/kudos-board/kudo-card-types";
import { isApiError } from "@/lib/api/api-error";
import { fetchProfileKudos, type ProfileFilter } from "./profile-api";
import {
  createLoadGate,
  fromInitial,
  refreshedList,
  withNextPage,
  type ProfileListFailure,
  type ProfileListState,
} from "./profile-kudos-list-state";

/** FR-401: the shown filter goes into the address (history API, kept in sync by the Next router). */
function showFilterInAddress(filter: ProfileFilter) {
  const params = new URLSearchParams(window.location.search);
  params.set("filter", filter);
  window.history.replaceState(null, "", `?${params}`);
}

/**
 * A3 list state of a profile (BR-005): the server's first page, then a filter
 * change reloads from the first page and "Xem thêm" appends the next one. A
 * filter change supersedes a load in flight (its late answer is ignored); a
 * failure keeps the cards shown and offers Retry (US002); an ended session
 * goes to Login (technical-spec § 3.4); a server refresh of the shown filter
 * brings the list in line with the new counts (FR-403) and drops the answer of
 * a "Xem thêm" asked for the list it replaced (`generation`, review L1).
 */
export function useProfileKudos(userId: string, initialFilter: ProfileFilter, initial: SectionResult<KudoPage>) {
  const router = useRouter();
  const [state, setState] = useState<ProfileListState>(() => fromInitial(initialFilter, initial));
  const [seenInitial, setSeenInitial] = useState(initial);
  const [gate] = useState(createLoadGate);
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });

  if (initial !== seenInitial) {
    setSeenInitial(initial);
    if ("data" in initial && initialFilter === state.filter) setState(refreshedList(state, initial.data));
  }

  /** A failed load; for "Xem thêm" only while the list is still the one it was asked for (`generation`). */
  const fail = useCallback(
    (error: unknown, failure: ProfileListFailure, generation?: number) => {
      if (isApiError(error) && error.status === 401) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      setState((s) => (generation !== undefined && s.generation !== generation ? s : { ...s, status: "error", failure }));
    },
    [router],
  );

  const loadFirst = useCallback(
    async (filter: ProfileFilter) => {
      const ticket = gate.start("first")!; // a first-page load always starts
      setState((s) => ({ ...s, status: "loading", failure: null }));
      try {
        const page = await fetchProfileKudos(userId, filter, null);
        if (!gate.finish(ticket)) return;
        setState((s) => ({ filter, items: page.items, nextCursor: page.nextCursor, status: "ready", failure: null, generation: s.generation + 1 }));
        showFilterInAddress(filter);
      } catch (error) {
        if (gate.finish(ticket)) fail(error, { kind: "first", filter });
      }
    },
    [userId, gate, fail],
  );

  const loadMore = useCallback(async () => {
    const { filter, nextCursor, generation } = latest.current;
    if (!nextCursor) return;
    const ticket = gate.start("more");
    if (ticket === null) return;
    setState((s) => ({ ...s, status: "loadingMore", failure: null }));
    try {
      const page = await fetchProfileKudos(userId, filter, nextCursor);
      if (gate.finish(ticket)) setState((s) => withNextPage(s, page, generation)); // dropped if a refresh replaced the list
    } catch (error) {
      if (gate.finish(ticket)) fail(error, { kind: "more" }, generation);
    }
  }, [userId, gate, fail]);

  const retry = useCallback(() => {
    const { failure, filter } = latest.current;
    if (failure?.kind === "more") void loadMore();
    else void loadFirst(failure?.filter ?? filter);
  }, [loadFirst, loadMore]);

  const changeFilter = useCallback((filter: ProfileFilter) => void loadFirst(filter), [loadFirst]);
  const more = useCallback(() => void loadMore(), [loadMore]);
  return { ...state, changeFilter, loadMore: more, retry };
}
