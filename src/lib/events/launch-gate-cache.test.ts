import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api-error";
import { createLaunchGateCache, type LaunchGateReading } from "./launch-gate-cache";

const TTL_MS = 60_000;
const SERVER_NOW = Date.parse("2026-12-13T11:00:00Z");

function setup(...answers: Array<LaunchGateReading | Error>) {
  const lookup = vi.fn(async () => {
    const answer = answers.length > 1 ? answers.shift()! : answers[0]!;
    if (answer instanceof Error) throw answer;
    return answer;
  });
  const onLookupFailure = vi.fn();
  return { gate: createLaunchGateCache({ lookup, ttlMs: TTL_MS, onLookupFailure }), lookup, onLookupFailure };
}

beforeEach(() => {
  vi.useFakeTimers();
  // The Next.js process clock is two days ahead of Go: only serverNow may count (BR-003).
  vi.setSystemTime(SERVER_NOW + 2 * 86_400_000);
});
afterEach(() => vi.useRealTimers());

describe("createLaunchGateCache (F003 A1)", () => {
  it("gates while the server clock is before startAt and reuses one lookup for the TTL (AD13)", async () => {
    const { gate, lookup } = setup({ startAtMs: SERVER_NOW + 10 * 60_000, serverNowMs: SERVER_NOW });
    expect(await gate.isUpcoming()).toBe(true);
    vi.advanceTimersByTime(TTL_MS - 1);
    expect(await gate.isUpcoming()).toBe(true);
    expect(lookup).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(await gate.isUpcoming()).toBe(true);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("opens exactly at startAt, estimating server time as serverNow plus elapsed time (BR-001)", async () => {
    const { gate, lookup } = setup({ startAtMs: SERVER_NOW + 30_000, serverNowMs: SERVER_NOW });
    expect(await gate.isUpcoming()).toBe(true);
    vi.advanceTimersByTime(29_999);
    expect(await gate.isUpcoming()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(await gate.isUpcoming()).toBe(false);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("fails open on a failed lookup and never caches the failure (DEC-003, SC-010)", async () => {
    const timeout = new ApiError(0, "timeout", "Go API request timed out");
    const { gate, lookup, onLookupFailure } = setup(timeout, {
      startAtMs: SERVER_NOW + 60 * 60_000,
      serverNowMs: SERVER_NOW,
    });
    expect(await gate.isUpcoming()).toBe(false);
    expect(onLookupFailure).toHaveBeenCalledWith(timeout);
    expect(await gate.isUpcoming()).toBe(true);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("does not fall back to an expired success when the next lookup fails", async () => {
    const { gate } = setup(
      { startAtMs: SERVER_NOW + 60 * 60_000, serverNowMs: SERVER_NOW },
      new ApiError(404, "event_not_found", "No event is configured."),
    );
    expect(await gate.isUpcoming()).toBe(true);
    vi.advanceTimersByTime(TTL_MS);
    expect(await gate.isUpcoming()).toBe(false);
  });

  it("shares one in-flight lookup between concurrent requests", async () => {
    const { gate, lookup } = setup({ startAtMs: SERVER_NOW + 60_000, serverNowMs: SERVER_NOW });
    const answers = await Promise.all([gate.isUpcoming(), gate.isUpcoming(), gate.isUpcoming()]);
    expect(answers).toEqual([true, true, true]);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("logs a failed lookup once, however many requests were waiting on it", async () => {
    const { gate, onLookupFailure } = setup(new ApiError(0, "timeout", "Go API request timed out"));
    const answers = await Promise.all([gate.isUpcoming(), gate.isUpcoming(), gate.isUpcoming()]);
    expect(answers).toEqual([false, false, false]);
    expect(onLookupFailure).toHaveBeenCalledTimes(1);
  });

  it("counts the time Go took to answer, so a slow lookup never holds the gate past startAt", async () => {
    const lookup = vi.fn(async () => {
      vi.advanceTimersByTime(1_000); // Go stamps serverNow somewhere inside this second
      return { startAtMs: SERVER_NOW + 1_000, serverNowMs: SERVER_NOW };
    });
    const gate = createLaunchGateCache({ lookup, ttlMs: TTL_MS, onLookupFailure: vi.fn() });
    expect(await gate.isUpcoming()).toBe(false);
  });
});
