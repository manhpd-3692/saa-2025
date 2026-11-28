import { describe, expect, it } from "vitest";
import type { KudoCardData } from "@/features/kudos-board/kudo-card-types";
import { createLoadGate, refreshedList, withNextPage, type ProfileListState } from "./profile-kudos-list-state";

/** Card `n` is `n` minutes old: a lower number is newer, as the list is ordered newest first. */
function card(n: number, title = `kudo ${n}`): KudoCardData {
  return {
    id: `00000000-0000-4000-8000-${String(1000 - n).padStart(12, "0")}`,
    createdAt: new Date(Date.UTC(2026, 10, 28, 12, 0) - n * 60_000).toISOString(),
    title,
    contentHtml: "<p>x</p>",
    isAnonymous: false,
    sender: null,
    receiver: { id: "r", name: "R", avatarUrl: null, unitCode: null, heroTier: null },
    hashtags: [],
    images: [],
    heart: { total: 0, viewerHearted: false, viewerCanHeart: true },
    isOwn: false,
    status: "public",
  };
}
const cards = (...ns: number[]) => ns.map((n) => card(n));
const ids = (state: ProfileListState) => state.items.map((c) => c.title);
const shown = (items: KudoCardData[], nextCursor: string | null): ProfileListState => ({
  filter: "received",
  items,
  nextCursor,
  status: "ready",
  failure: null,
  generation: 0,
});

describe("refreshedList: a server refresh of the shown list (FR-403, review W2)", () => {
  it("replaces the list when the fresh page holds the whole list: a removed (spam) card goes, a new one comes", () => {
    const state = shown(cards(1, 2, 3), null);
    const next = refreshedList(state, { items: [card(0), card(1, "edited"), card(3)], nextCursor: null });
    expect(ids(next)).toEqual(["kudo 0", "edited", "kudo 3"]);
    expect(next.nextCursor).toBeNull();
  });

  it("keeps the older pages already loaded after an overlapping fresh page, dropping cards removed inside it", () => {
    const state = shown(cards(1, 2, 3, 4, 5, 6), "cursor-after-6");
    // Fresh first page of 3 (a page size of 3 for the example): one new kudo, kudo 2 became spam.
    const next = refreshedList(state, { items: cards(0, 1, 3), nextCursor: "cursor-after-3" });
    expect(ids(next)).toEqual(["kudo 0", "kudo 1", "kudo 3", "kudo 4", "kudo 5", "kudo 6"]);
    expect(next.nextCursor).toBe("cursor-after-6");
  });

  it("starts again from the fresh page when it does not overlap the shown cards, so no gap is left", () => {
    const state = shown(cards(20, 21, 22), "cursor-after-22");
    const next = refreshedList(state, { items: cards(1, 2, 3), nextCursor: "cursor-after-3" });
    expect(ids(next)).toEqual(["kudo 1", "kudo 2", "kudo 3"]);
    expect(next.nextCursor).toBe("cursor-after-3");
  });

  it("fills an empty or failed list with the fresh page", () => {
    const next = refreshedList({ ...shown([], null), status: "error", failure: { kind: "first", filter: "received" } }, { items: cards(1), nextCursor: null });
    expect(next).toMatchObject({ status: "ready", failure: null });
    expect(ids(next)).toEqual(["kudo 1"]);
  });
});

describe("withNextPage: the 'Xem thêm' answer (review L1)", () => {
  it("appends the next page without repeating a card when the list is still the one it was asked for", () => {
    const state = { ...shown(cards(1, 2), "cursor-after-2"), status: "loadingMore" as const };
    const next = withNextPage(state, { items: cards(2, 3, 4), nextCursor: null }, state.generation);
    expect(ids(next)).toEqual(["kudo 1", "kudo 2", "kudo 3", "kudo 4"]);
    expect(next).toMatchObject({ nextCursor: null, status: "ready" });
  });

  it("drops a late page once a server refresh has replaced the list meanwhile, so no gap or stale tail is added", () => {
    const asked = { ...shown(cards(20, 21, 22), "cursor-after-22"), status: "loadingMore" as const };
    const refreshed = refreshedList(asked, { items: cards(1, 2, 3), nextCursor: "cursor-after-3" }); // no overlap: reset
    expect(refreshed.status).toBe("ready");
    const late = withNextPage(refreshed, { items: cards(23, 24), nextCursor: "cursor-after-24" }, asked.generation);
    expect(late).toBe(refreshed);
    expect(ids(late)).toEqual(["kudo 1", "kudo 2", "kudo 3"]);
    expect(late.nextCursor).toBe("cursor-after-3");
  });
});

describe("createLoadGate: list request ordering (review W1)", () => {
  it("lets a filter change supersede a 'Xem thêm' in flight, whose late answer is then ignored", () => {
    const gate = createLoadGate();
    const more = gate.start("more");
    const first = gate.start("first");
    expect(more).not.toBeNull();
    expect(first).not.toBeNull();
    expect(gate.finish(more!)).toBe(false);
    expect(gate.finish(first!)).toBe(true);
  });

  it("lets a later filter change supersede an earlier one", () => {
    const gate = createLoadGate();
    const sent = gate.start("first");
    const received = gate.start("first");
    expect(gate.finish(sent!)).toBe(false);
    expect(gate.finish(received!)).toBe(true);
  });

  it("refuses 'Xem thêm' while any load is in flight, and accepts it again once that load ends", () => {
    const gate = createLoadGate();
    const first = gate.start("first");
    expect(gate.start("more")).toBeNull();
    gate.finish(first!);
    const more = gate.start("more");
    expect(gate.start("more")).toBeNull();
    expect(gate.finish(more!)).toBe(true);
  });
});
