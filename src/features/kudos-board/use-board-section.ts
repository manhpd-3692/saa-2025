"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SectionResult } from "./kudo-card-types";

/** A refocus within this window does not refetch again (D012: refresh on focus, no push). */
export const FOCUS_REFRESH_MS = 15_000;

export type SectionStatus = "loading" | "ready" | "error";

interface Settled<T> {
  key: string;
  data: T | null;
  failed: boolean;
}

function settledFrom<T>(initial: SectionResult<T> | null, key: string): Settled<T> | null {
  if (initial === null) return null;
  return "data" in initial ? { key, data: initial.data, failed: false } : { key, data: null, failed: true };
}

/** Calls `refresh` when the tab comes back into view, at most once per FOCUS_REFRESH_MS. */
export function useRefreshOnFocus(refresh: () => void) {
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  });
  useEffect(() => {
    let last = Date.now();
    const onFocus = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < FOCUS_REFRESH_MS) return;
      last = Date.now();
      latest.current();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);
}

/**
 * One independently loading board section (FR-403): starts from the server's
 * first-paint result (`initial`, valid for `initialKey`), loads again whenever
 * `key` changes (a filter), on Retry, and silently on refocus — a failed
 * silent refresh keeps the data on screen. New `initial` data from a server
 * refresh (after a kudo is written) replaces the data when it fits `key`.
 */
export function useBoardSection<T>({ key, initialKey = "", initial, load }: {
  key: string;
  initialKey?: string;
  initial: SectionResult<T> | null;
  load: () => Promise<T>;
}): { data: T | null; status: SectionStatus; retry: () => void } {
  const [settled, setSettled] = useState<Settled<T> | null>(() => settledFrom(initial, initialKey));
  const [seenInitial, setSeenInitial] = useState(initial);
  const [nonce, setNonce] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const loadRef = useRef(load);
  const requested = useRef("");
  useEffect(() => {
    loadRef.current = load;
  });

  if (initial !== seenInitial) {
    setSeenInitial(initial);
    if (key === initialKey) setSettled(settledFrom(initial, initialKey));
  }

  const current = settled?.key === key;
  useEffect(() => {
    const token = `${key}#${nonce}`;
    if (requested.current === token || (nonce === 0 && current)) return;
    requested.current = token;
    let live = true;
    let done = false;
    loadRef.current().then(
      (data) => {
        done = true;
        if (!live) return;
        setSettled({ key, data, failed: false });
        setRetrying(false);
      },
      () => {
        done = true;
        if (!live) return;
        setSettled((prev) => (prev?.key === key && prev.data !== null ? prev : { key, data: null, failed: true }));
        setRetrying(false);
      },
    );
    return () => {
      live = false;
      if (!done) requested.current = ""; // dropped before it answered: ask again on the next run
    };
  }, [key, nonce, current]);

  useRefreshOnFocus(useCallback(() => setNonce((n) => n + 1), []));
  const retry = useCallback(() => {
    setRetrying(true);
    setNonce((n) => n + 1);
  }, []);

  const data = current ? settled.data : null;
  const status: SectionStatus = retrying || !current ? "loading" : settled.failed ? "error" : "ready";
  return { data, status, retry };
}
