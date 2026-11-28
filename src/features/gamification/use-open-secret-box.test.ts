import { describe, expect, it, vi } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@/lib/api/api-error";
import type { OpenResult } from "./gamification-api";
import { attemptOpen, SecretBoxOpenIntent } from "./secret-box-open-intent";

const RESULT: OpenResult = {
  boxId: "b0000000-0000-4000-8000-000000000001",
  icon: "STAY_GOLD",
  summary: { unopened: 2, opened: 1, distinctIcons: ["STAY_GOLD"] },
};

function keys() {
  let n = 0;
  return () => `key-${++n}`;
}

describe("Secret box opening intent (F008 A6, Codex R12, N12)", () => {
  it("retries a lost answer with the same Idempotency-Key, then starts a new intent with a new key", async () => {
    const intent = new SecretBoxOpenIntent(keys());
    const open = vi
      .fn<(key: string) => Promise<OpenResult>>()
      .mockRejectedValueOnce(new ApiError(0, CLIENT_ERROR_CODES.timeout, "timed out")) // committed, answer lost
      .mockResolvedValueOnce(RESULT) // Retry: Go replays the stored result
      .mockResolvedValueOnce(RESULT);

    const first = await attemptOpen(intent, open);
    expect(first).toMatchObject({ ok: false, retryable: true });
    expect(await attemptOpen(intent, open)).toEqual({ ok: true, result: RESULT });
    await attemptOpen(intent, open); // the next box is a new intent
    expect(open.mock.calls.map(([key]) => key)).toEqual(["key-1", "key-1", "key-2"]);
  });

  it.each([
    ["a dropped connection", new ApiError(0, CLIENT_ERROR_CODES.network, "offline")],
    ["a server error", new ApiError(500, "internal_error", "boom")],
    ["an unreadable answer", new ApiError(200, CLIENT_ERROR_CODES.invalidResponse, "bad json")],
  ])("keeps the key after %s, because the open may have committed", async (_name, error) => {
    const intent = new SecretBoxOpenIntent(keys());
    const open = vi.fn<(key: string) => Promise<OpenResult>>().mockRejectedValueOnce(error).mockResolvedValueOnce(RESULT);
    expect(await attemptOpen(intent, open)).toMatchObject({ ok: false, retryable: true });
    await attemptOpen(intent, open);
    expect(open.mock.calls.map(([key]) => key)).toEqual(["key-1", "key-1"]);
  });

  it.each([
    ["no unopened box (409)", new ApiError(409, "no_unopened_box", "empty")],
    ["an expired session (401)", new ApiError(401, "unauthorized", "expired")],
  ])("drops the key after %s: nothing was consumed, so the next click is a new intent", async (_name, error) => {
    const intent = new SecretBoxOpenIntent(keys());
    const open = vi.fn<(key: string) => Promise<OpenResult>>().mockRejectedValueOnce(error).mockResolvedValueOnce(RESULT);
    expect(await attemptOpen(intent, open)).toMatchObject({ ok: false, retryable: false });
    await attemptOpen(intent, open);
    expect(open.mock.calls.map(([key]) => key)).toEqual(["key-1", "key-2"]);
  });

  it("generates UUID keys by default", () => {
    expect(new SecretBoxOpenIntent().keyForAttempt()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
