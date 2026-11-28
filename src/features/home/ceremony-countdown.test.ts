import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCountdownClock } from "@/features/countdown/countdown-clock";
import type { CountdownCopy } from "@/features/countdown/countdown-copy";
import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from "@/features/countdown/split-remaining-time";
import { CeremonyCountdown } from "./ceremony-countdown";

// Any navigation from the ceremony countdown is a defect (Codex R08): fail loudly if it is ever used.
const navigation = vi.hoisted(() => ({ useRouter: vi.fn(), redirect: vi.fn(), usePathname: vi.fn() }));
vi.mock("next/navigation", () => navigation);

const SERVER_NOW = Date.parse("2026-12-01T03:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const COPY: CountdownCopy = {
  locale: "vi",
  labels: { days: "DAYS", hours: "HOURS", minutes: "MINUTES" },
  spoken: {
    days: { one: "{count} ngày", other: "{count} ngày" },
    hours: { one: "{count} giờ", other: "{count} giờ" },
    minutes: { one: "{count} phút", other: "{count} phút" },
  },
};

function renderedValues(ceremonyMs: number): string[] {
  const html = renderToString(
    createElement(CeremonyCountdown, { ceremonyAt: iso(ceremonyMs), serverNow: iso(SERVER_NOW), copy: COPY }),
  );
  return [...html.matchAll(/data-value="(\d+)"/g)].map((match) => match[1]);
}

describe("CeremonyCountdown (F004 A2, DEC-001, Codex R08)", () => {
  it("counts days, hours and minutes to ceremonyAt on the server clock (SC-005)", () => {
    const ceremony = SERVER_NOW + 13 * MS_PER_DAY + 23 * MS_PER_HOUR + 59 * MS_PER_MINUTE + 30_000;
    expect(renderedValues(ceremony)).toEqual(["13", "23", "59"]);
  });

  it("renders the post-zero state 00 00 00 once the ceremony has passed (SC-008, seed after-ceremony)", () => {
    expect(renderedValues(SERVER_NOW - MS_PER_DAY)).toEqual(["00", "00", "00"]);
    expect(renderedValues(SERVER_NOW + 59_000)).toEqual(["00", "00", "00"]); // under a minute left
  });

  it("never asks the router for a navigation, whatever the remaining time (no redirect, FR-202)", () => {
    renderedValues(SERVER_NOW - MS_PER_DAY);
    renderedValues(SERVER_NOW + MS_PER_DAY);
    expect(navigation.useRouter).not.toHaveBeenCalled();
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});

describe("ceremony target a few seconds ahead (SC-008 unit part)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("reaches zero, notifies once more and then stops ticking", () => {
    vi.setSystemTime(SERVER_NOW);
    const clock = createCountdownClock(iso(SERVER_NOW + 2_500), iso(SERVER_NOW));
    const listener = vi.fn();
    const unsubscribe = clock.subscribe(listener);
    expect(clock.getSnapshot()).toBe(2_500);

    vi.advanceTimersByTime(3_000);
    expect(clock.getSnapshot()).toBe(0);
    const ticks = listener.mock.calls.length;
    expect(vi.getTimerCount()).toBe(0); // no timer left: the countdown has stopped

    vi.advanceTimersByTime(60_000);
    expect(listener).toHaveBeenCalledTimes(ticks);
    unsubscribe();
  });
});
