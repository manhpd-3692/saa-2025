import { describe, expect, it, vi } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@/lib/api/api-error";
import { runHeartToggle, withHeartClaim, type HeartView } from "./heart-toggle";

const START: HeartView = { total: 7, viewerHearted: false };

/** Runs one toggle and records every state the control showed. */
async function toggle(current: HeartView, send: (hearted: boolean) => Promise<{ heartTotal: number; viewerHearted: boolean }>, weight = 2) {
  const shown: HeartView[] = [];
  const result = await runHeartToggle(current, { weight, send, show: (view) => shown.push(view) });
  return { shown, result };
}

describe("HeartButton toggle (F008 A1, FR-401, DEC-001, DEC-002, Codex R09)", () => {
  it("fills at once by the campaign weight, then shows the server's weighted total", async () => {
    const send = vi.fn(async () => ({ heartTotal: 9, viewerHearted: true }));
    const { shown, result } = await toggle(START, send);
    expect(send).toHaveBeenCalledWith(true); // PUT: an idempotent setter, not a blind toggle
    expect(shown).toEqual([{ total: 9, viewerHearted: true }, { total: 9, viewerHearted: true }]);
    expect(result).toEqual({ view: { total: 9, viewerHearted: true }, error: null });
  });

  it("withdraws a given heart and reconciles with the server total when the guess was off", async () => {
    const send = vi.fn(async () => ({ heartTotal: 6, viewerHearted: false }));
    const { shown } = await toggle({ total: 9, viewerHearted: true }, send);
    expect(send).toHaveBeenCalledWith(false); // DELETE
    expect(shown).toEqual([{ total: 7, viewerHearted: false }, { total: 6, viewerHearted: false }]);
  });

  it("reverts to the state before the click when the campaign lookup fails (500, nothing saved)", async () => {
    const send = vi.fn(async () => {
      throw new ApiError(500, "campaign_lookup_failed", "The heart was not recorded; please retry.");
    });
    const { shown, result } = await toggle(START, send);
    expect(shown).toEqual([{ total: 9, viewerHearted: true }, START]);
    expect(result).toEqual({ view: START, error: "failed" });
  });

  it.each([
    [new ApiError(409, "kudo_not_public", "spam"), "notAvailable"],
    [new ApiError(404, "kudo_not_found", "gone"), "notAvailable"],
    [new ApiError(403, "cannot_heart_own_kudo", "own"), "ownKudo"],
    [new ApiError(401, "unauthorized", "expired"), "sessionExpired"],
    [new ApiError(0, CLIENT_ERROR_CODES.network, "offline"), "failed"],
  ])("reverts and names the refusal %s as %s", async (error, key) => {
    const { shown, result } = await toggle({ total: 3, viewerHearted: true }, async () => {
      throw error;
    });
    expect(shown.at(-1)).toEqual({ total: 3, viewerHearted: true });
    expect(result.error).toBe(key);
  });

  it("with a store, rolls back through revert (only while the guess is still shown) instead of show", async () => {
    const shown: HeartView[] = [];
    const reverted: [HeartView, HeartView][] = [];
    const result = await runHeartToggle(START, {
      weight: 2,
      send: async () => {
        throw new ApiError(500, "campaign_lookup_failed", "not recorded");
      },
      show: (view) => shown.push(view),
      revert: (expected, previous) => reverted.push([expected, previous]),
    });
    expect(shown).toEqual([{ total: 9, viewerHearted: true }]);
    expect(reverted).toEqual([[{ total: 9, viewerHearted: true }, START]]);
    expect(result.error).toBe("failed");
  });

  it("never shows a negative total while withdrawing", async () => {
    const { shown } = await toggle({ total: 1, viewerHearted: true }, async () => ({ heartTotal: 0, viewerHearted: false }), 2);
    expect(shown[0]).toEqual({ total: 0, viewerHearted: false });
  });
});

describe("the per-kudo claim around a heart request (review W2, N1)", () => {
  const claim = (free = true) => {
    const calls: string[] = [];
    return { calls, begin: () => (calls.push("begin"), free), end: () => void calls.push("end") };
  };

  it("runs nothing while another card of the kudo holds the claim", async () => {
    const c = claim(false);
    const run = vi.fn(async () => "sent");
    expect(await withHeartClaim(c, run)).toBeNull();
    expect(run).not.toHaveBeenCalled();
    expect(c.calls).toEqual(["begin"]);
  });

  it("releases the claim after the request", async () => {
    const c = claim();
    expect(await withHeartClaim(c, async () => "sent")).toBe("sent");
    expect(c.calls).toEqual(["begin", "end"]);
  });

  it("releases the claim even when a state callback throws, so the kudo never stays locked", async () => {
    const c = claim();
    const throwingShow = () => {
      throw new Error("render failed");
    };
    await expect(
      withHeartClaim(c, () => runHeartToggle(START, { weight: 2, send: async () => ({ heartTotal: 9, viewerHearted: true }), show: throwingShow })),
    ).rejects.toThrow("render failed");
    expect(c.calls).toEqual(["begin", "end"]);
  });
});
