import { isApiError } from "@/lib/api/api-error";
import type { HeartState } from "./gamification-api";

/** What a heart control shows: the weighted total (G08) and whether the viewer hearted. */
export interface HeartView {
  total: number;
  viewerHearted: boolean;
}

/** Dictionary suffix of a refused or failed heart (DEC-002, functional § 9). */
export type HeartErrorKey = "notAvailable" | "ownKudo" | "sessionExpired" | "failed";

/** 404 / 409 → gone or spam, 403 → own kudo, 401 → session; anything else (500 R09, network) → retry. */
export function heartErrorKey(error: unknown): HeartErrorKey {
  if (!isApiError(error)) return "failed";
  if (error.status === 404 || error.status === 409) return "notAvailable";
  if (error.status === 403) return "ownKudo";
  if (error.status === 401) return "sessionExpired";
  return "failed";
}

/** The optimistic guess: ± the active campaign's weight; the server total replaces it. */
export function optimisticHeart(view: HeartView, hearted: boolean, weight: number): HeartView {
  return { total: Math.max(0, view.total + (hearted ? weight : -weight)), viewerHearted: hearted };
}

/**
 * One click of the heart (A1, FR-401): show the optimistic state, send the
 * idempotent setter for the target state (PUT to give, DELETE to withdraw),
 * then show the server's weighted total — or the state before the click when
 * the request fails, so a refused or unsaved heart never looks saved (R09).
 * `revert(expected, previous)`, when given, restores only while the guess is
 * still what is shown (review W2); otherwise `show(previous)` is used.
 */
export async function runHeartToggle(
  current: HeartView,
  deps: {
    weight: number;
    send: (hearted: boolean) => Promise<HeartState>;
    show: (view: HeartView) => void;
    revert?: (expected: HeartView, previous: HeartView) => void;
  },
): Promise<{ view: HeartView; error: HeartErrorKey | null }> {
  const hearted = !current.viewerHearted;
  const guess = optimisticHeart(current, hearted, deps.weight);
  deps.show(guess);
  try {
    const state = await deps.send(hearted);
    const confirmed = { total: state.heartTotal, viewerHearted: state.viewerHearted };
    deps.show(confirmed);
    return { view: confirmed, error: null };
  } catch (error) {
    if (deps.revert) deps.revert(guess, current);
    else deps.show(current);
    return { view: current, error: heartErrorKey(error) };
  }
}

/**
 * Runs one heart request under the kudo's claim (review W2, N1): nothing runs
 * while another card of the kudo has a request in flight (null), and the claim
 * is released however `run` ends, even when a state callback throws.
 */
export async function withHeartClaim<T>(claim: { begin: () => boolean; end: () => void }, run: () => Promise<T>): Promise<T | null> {
  if (!claim.begin()) return null;
  try {
    return await run();
  } finally {
    claim.end();
  }
}
