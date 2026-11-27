import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COUNTDOWN_TICK_MS, createCountdownClock } from "./countdown-clock";
import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from "./split-remaining-time";

const SERVER_NOW = Date.parse("2026-12-13T11:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createCountdownClock", () => {
  it.each([
    ["one day ahead", MS_PER_DAY],
    ["three hours behind", -3 * MS_PER_HOUR],
  ])("counts against the server clock when the device clock is %s (BR-003, SC-004)", (_, skew) => {
    vi.setSystemTime(SERVER_NOW + skew);
    const target = SERVER_NOW + 2 * MS_PER_HOUR + 30 * MS_PER_MINUTE;
    const clock = createCountdownClock(iso(target), iso(SERVER_NOW));

    expect(clock.getSnapshot()).toBe(target - SERVER_NOW);
    const unsubscribe = clock.subscribe(() => {});
    vi.advanceTimersByTime(MS_PER_MINUTE);
    expect(clock.getSnapshot()).toBe(target - SERVER_NOW - MS_PER_MINUTE);
    unsubscribe();
  });

  it("ignores a device clock step while counting (BR-003, FR-402)", () => {
    vi.setSystemTime(SERVER_NOW);
    const target = SERVER_NOW + 23 * MS_PER_HOUR;
    const clock = createCountdownClock(iso(target), iso(SERVER_NOW));
    const unsubscribe = clock.subscribe(() => {});
    expect(clock.getSnapshot()).toBe(23 * MS_PER_HOUR);

    // NTP correction or a manual change: the wall clock jumps 3 h ahead, real time does not.
    vi.setSystemTime(Date.now() + 3 * MS_PER_HOUR);
    vi.advanceTimersByTime(MS_PER_MINUTE);
    expect(clock.getSnapshot()).toBe(23 * MS_PER_HOUR - MS_PER_MINUTE);
    unsubscribe();
  });

  it("serves the server's own reading during server render and hydration", () => {
    vi.setSystemTime(SERVER_NOW + 5 * MS_PER_DAY);
    const clock = createCountdownClock(iso(SERVER_NOW + MS_PER_HOUR), iso(SERVER_NOW));
    expect(clock.getServerSnapshot()).toBe(MS_PER_HOUR);
  });

  it("reaches 0 ms exactly at the target, not on the next whole tick, then stops (D001)", () => {
    vi.setSystemTime(SERVER_NOW);
    const clock = createCountdownClock(iso(SERVER_NOW + 2_500), iso(SERVER_NOW));
    const listener = vi.fn();
    clock.subscribe(listener);

    vi.advanceTimersByTime(2_499);
    expect(clock.getSnapshot()).toBeGreaterThan(0);
    vi.advanceTimersByTime(1);
    expect(clock.getSnapshot()).toBe(0);
    expect(listener).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ticks every COUNTDOWN_TICK_MS while subscribed and stops when the last subscriber leaves", () => {
    vi.setSystemTime(SERVER_NOW);
    const clock = createCountdownClock(iso(SERVER_NOW + MS_PER_HOUR), iso(SERVER_NOW));
    const listener = vi.fn();
    const unsubscribe = clock.subscribe(listener);

    vi.advanceTimersByTime(3 * COUNTDOWN_TICK_MS);
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("never goes below zero for a target already in the past", () => {
    vi.setSystemTime(SERVER_NOW);
    const clock = createCountdownClock(iso(SERVER_NOW - MS_PER_MINUTE), iso(SERVER_NOW));
    expect(clock.getSnapshot()).toBe(0);
    expect(clock.getServerSnapshot()).toBe(0);
  });
});
