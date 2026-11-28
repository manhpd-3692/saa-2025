import { describe, expect, it } from "vitest";
import { createHeartStore } from "./heart-state-store";

const SERVER = { total: 7, viewerHearted: false };
const HEARTED = { total: 9, viewerHearted: true };

describe("shared heart state (F008 A1, RISK-02, review W1/W2)", () => {
  it("keeps a heart across a re-identification of the same viewer (the shell's focus re-read of /me)", () => {
    const store = createHeartStore();
    store.identify("u1");
    store.set("k1", SERVER, HEARTED);
    store.identify("u1");
    expect(store.view("k1", SERVER)).toEqual(HEARTED);
  });

  it("drops every heart, and any in-flight claim, when another viewer signs in, so nothing crosses users", () => {
    const store = createHeartStore();
    store.identify("u1");
    store.set("k1", SERVER, HEARTED);
    store.begin("k2");
    store.identify("u2");
    expect(store.view("k1", SERVER)).toEqual(SERVER);
    expect(store.busy("k2")).toBe(false);
  });

  it("keeps a heart given before the viewer was known for the first viewer identified", () => {
    const store = createHeartStore();
    store.set("k1", SERVER, HEARTED);
    store.identify("u1");
    expect(store.view("k1", SERVER)).toEqual(HEARTED);
  });

  it("shows newer server data instead of an entry made from older data", () => {
    const store = createHeartStore();
    store.set("k1", SERVER, HEARTED);
    expect(store.view("k1", { total: 12, viewerHearted: true })).toEqual({ total: 12, viewerHearted: true });
  });

  it("lets one card of a kudo send at a time: every card of it sees the claim until it ends", () => {
    const store = createHeartStore();
    expect(store.begin("k1")).toBe(true);
    expect(store.begin("k1")).toBe(false); // the same kudo on another card
    expect(store.busy("k1")).toBe(true);
    expect(store.begin("k2")).toBe(true); // other kudos are independent
    store.end("k1");
    expect(store.begin("k1")).toBe(true);
  });

  it("rolls back only while the failed guess is still shown, never over a newer state", () => {
    const store = createHeartStore();
    store.set("k1", SERVER, HEARTED); // optimistic guess of a request that will fail
    const newer = { total: 10, viewerHearted: true };
    store.set("k1", SERVER, newer); // a newer confirmed state arrived meanwhile
    store.revert("k1", SERVER, HEARTED, SERVER);
    expect(store.view("k1", SERVER)).toEqual(newer);
    store.revert("k1", SERVER, newer, SERVER);
    expect(store.view("k1", SERVER)).toEqual(SERVER);
  });

  it("tells subscribers about every change", () => {
    const store = createHeartStore();
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.set("k1", SERVER, HEARTED);
    store.begin("k1");
    store.end("k1");
    unsubscribe();
    store.set("k1", SERVER, SERVER);
    expect(calls).toBe(3);
    expect(store.version()).toBe(4);
  });
});
