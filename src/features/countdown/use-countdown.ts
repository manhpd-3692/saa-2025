"use client";

import { useMemo, useSyncExternalStore } from "react";
import { createCountdownClock } from "./countdown-clock";
import { splitRemainingTime, type RemainingTimeParts } from "./split-remaining-time";

export interface CountdownState extends RemainingTimeParts {
  /** Milliseconds left against the server clock; 0 once the target is reached. */
  remainingMs: number;
}

/**
 * Shared countdown arithmetic (F003 A4, F004 ceremony mode; Codex R08):
 * remaining time to `targetIso` measured on the server clock (`serverNowIso`
 * is anchored on mount; pass a fresher one after a resync), ticking every
 * `COUNTDOWN_TICK_MS`, split by ALG-001. Never navigates. Server render and
 * hydration use the server's own reading, so the markup always matches.
 */
export function useCountdown(targetIso: string, serverNowIso: string): CountdownState {
  const clock = useMemo(() => createCountdownClock(targetIso, serverNowIso), [targetIso, serverNowIso]);
  const remainingMs = useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getServerSnapshot);
  return { remainingMs, ...splitRemainingTime(remainingMs) };
}
