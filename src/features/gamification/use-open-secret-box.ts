"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isApiError } from "@/lib/api/api-error";
import { ICON_COUNT, type SecretBoxIcon } from "./gamification-config";
import { fetchSecretBoxSummary, openSecretBox, type OpenResult, type SecretBoxSummary } from "./gamification-api";
import { attemptOpen, SecretBoxOpenIntent } from "./secret-box-open-intent";

export type SecretBoxPhase = "loading" | "load-error" | "ready" | "opening" | "open-error";

/** The icon of the latest open; `completedNow` = this open brought the collection to all six (BR-010). */
export interface SecretBoxReveal {
  icon: SecretBoxIcon;
  repeat: boolean;
  completedNow: boolean;
}

export interface SecretBoxState {
  phase: SecretBoxPhase;
  summary: SecretBoxSummary | null;
  reveal: SecretBoxReveal | null;
  /** After a failed open: true when it may have committed, so Retry reuses the key (R12). */
  retryable: boolean;
  /** A box was opened in this window: pages showing box counts re-read them on close. */
  changed: boolean;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The inventory right after an open, from the stored response (A6); the GET refresh follows (N12). */
function summaryAfter(before: SecretBoxSummary, result: OpenResult): SecretBoxSummary {
  const icons = result.summary.distinctIcons;
  return { ...before, unopened: result.summary.unopened, opened: result.summary.opened, collectedIcons: icons, completed: before.completed || icons.length >= ICON_COUNT };
}

/**
 * Data side of the secret box window (A5, A6): reads the caller's summary,
 * opens one box per intent with an Idempotency-Key reused on Retry after an
 * uncertain failure (Codex R12), shows the stored result and then re-reads
 * the current inventory (N12). "No box left" (another tab took it) turns into
 * the empty state (DEC-004). `minOpeningMs` keeps the opening frame on screen.
 */
export function useOpenSecretBox() {
  const [state, setState] = useState<SecretBoxState>({ phase: "loading", summary: null, reveal: null, retryable: false, changed: false });
  const intent = useRef(new SecretBoxOpenIntent());
  const opening = useRef(false);
  const opens = useRef(0); // a summary read started before the latest open is stale (review S1)

  const [loads, setLoads] = useState(0); // bumped by Retry after a failed first read

  // First read, and again on Retry: the summary, or the load-error state.
  useEffect(() => {
    let live = true;
    fetchSecretBoxSummary().then(
      (summary) => live && setState((s) => ({ ...s, summary, phase: "ready" })),
      (error: unknown) => {
        console.warn("secret box summary read failed", error);
        if (live) setState((s) => ({ ...s, phase: "load-error" }));
      },
    );
    return () => {
      live = false;
    };
  }, [loads]);

  const load = useCallback(() => {
    setState((s) => ({ ...s, phase: "loading" }));
    setLoads((n) => n + 1);
  }, []);

  /** After an open: the current inventory replaces the stored snapshot (N12); a failed or stale read keeps it. */
  const refresh = useCallback(() => {
    const after = opens.current;
    fetchSecretBoxSummary().then(
      (summary) => opens.current === after && setState((s) => ({ ...s, summary })),
      (error: unknown) => console.warn("secret box summary refresh failed", error),
    );
  }, []);

  const open = useCallback(
    async (minOpeningMs: number) => {
      const before = state.summary;
      if (opening.current || !before || before.unopened === 0) return;
      opening.current = true;
      opens.current++;
      setState((s) => ({ ...s, phase: "opening" }));
      const [attempt] = await Promise.all([attemptOpen(intent.current, openSecretBox), wait(minOpeningMs)]);
      opening.current = false;
      if (attempt.ok) {
        const { icon, summary } = attempt.result;
        const reveal = {
          icon,
          repeat: before.collectedIcons.includes(icon),
          completedNow: before.collectedIcons.length < ICON_COUNT && summary.distinctIcons.length >= ICON_COUNT,
        };
        setState((s) => ({ ...s, phase: "ready", summary: summaryAfter(before, attempt.result), reveal, retryable: false, changed: true }));
        refresh();
      } else if (isApiError(attempt.error) && attempt.error.code === "no_unopened_box") {
        setState((s) => ({ ...s, phase: "ready", reveal: null, summary: { ...before, unopened: 0 } }));
        refresh();
      } else {
        setState((s) => ({ ...s, phase: "open-error", retryable: attempt.retryable }));
      }
    },
    [state.summary, refresh],
  );

  return { state, load, open };
}
