import type { KudoCardData, KudoPage, SectionResult } from "@/features/kudos-board/kudo-card-types";
import type { ProfileFilter } from "./profile-api";

/**
 * Pure state of a profile's KUDOS list (F007 A3, BR-005), kept apart from the
 * React hook so the refresh merge and the request ordering are unit-tested.
 */

export type ProfileListStatus = "ready" | "loading" | "loadingMore" | "error";

/** What Retry repeats: the first page of a filter (the cards shown stay) or the next page. */
export type ProfileListFailure = { kind: "first"; filter: ProfileFilter } | { kind: "more" };

export interface ProfileListState {
  /** The filter of the cards shown; it changes only once its first page has loaded. */
  filter: ProfileFilter;
  items: KudoCardData[];
  nextCursor: string | null;
  status: ProfileListStatus;
  failure: ProfileListFailure | null;
  /** Bumped whenever the list is replaced; a "Xem thêm" answer asked for an older list is dropped. */
  generation: number;
}

export function fromInitial(filter: ProfileFilter, initial: SectionResult<KudoPage>): ProfileListState {
  return "data" in initial
    ? { filter, items: initial.data.items, nextCursor: initial.data.nextCursor, status: "ready", failure: null, generation: 0 }
    : { filter, items: [], nextCursor: null, status: "error", failure: { kind: "first", filter }, generation: 0 };
}

/** Newest-first order of the list: created later, then the higher id (as Go's keyset). */
function isOlder(card: KudoCardData, than: KudoCardData): boolean {
  const a = Date.parse(card.createdAt);
  const b = Date.parse(than.createdAt);
  return a < b || (a === b && card.id < than.id);
}

/**
 * A server refresh (after a kudo is written or edited, or a box opened) brings a
 * fresh first page of the shown filter, and the list must agree with the new
 * counts (FR-403): a fresh page that holds the whole list replaces it; one that
 * overlaps the shown cards replaces everything it covers (removed or spam cards
 * go, new and edited ones come) and keeps the older pages already loaded; one
 * that does not overlap them (many new kudos) starts the list again from it, so
 * no gap is left.
 */
export function refreshedList(state: ProfileListState, page: KudoPage): ProfileListState {
  const reset = { ...state, items: page.items, nextCursor: page.nextCursor, status: "ready" as const, failure: null, generation: state.generation + 1 };
  const last = page.items.at(-1);
  if (page.nextCursor === null || !last) return reset;
  const freshIds = new Set(page.items.map((card) => card.id));
  if (!state.items.some((card) => freshIds.has(card.id))) return reset;
  const older = state.items.filter((card) => !freshIds.has(card.id) && isOlder(card, last));
  return { ...reset, items: [...page.items, ...older], nextCursor: older.length > 0 ? state.nextCursor : page.nextCursor };
}

/**
 * The answer to "Xem thêm" asked for list `generation`: appended without
 * repeating a card. If a server refresh replaced the list meanwhile, the page
 * belongs to the old list and would add a gap or a stale tail: it is dropped
 * (review L1).
 */
export function withNextPage(state: ProfileListState, page: KudoPage, generation: number): ProfileListState {
  if (state.generation !== generation) return state;
  const known = new Set(state.items.map((card) => card.id));
  const fresh = page.items.filter((card) => !known.has(card.id));
  return { ...state, items: [...state.items, ...fresh], nextCursor: page.nextCursor, status: "ready", failure: null };
}

export type LoadKind = "first" | "more";

/**
 * Orders the list's requests (review W1): a first-page load (filter change,
 * Retry) always starts and supersedes whatever is in flight; "Xem thêm" starts
 * only when nothing is. Only the latest request's answer may be applied.
 */
export function createLoadGate() {
  let latest = 0;
  let inFlight: LoadKind | null = null;
  return {
    /** A ticket for the new request, or null when "Xem thêm" must wait. */
    start(kind: LoadKind): number | null {
      if (kind === "more" && inFlight !== null) return null;
      inFlight = kind;
      return ++latest;
    },
    /** True when `ticket` is still the latest request: apply its answer. */
    finish(ticket: number): boolean {
      if (ticket !== latest) return false;
      inFlight = null;
      return true;
    },
  };
}
