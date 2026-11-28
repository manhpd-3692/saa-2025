import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api-error";
import { decisionTarget, runKudoDecision } from "./kudo-decision";
import type { KudoModeration } from "./moderation-api";

const KUDO = "0b6d2c4e-1111-4222-8333-444455556666";
const PUBLIC_V0: KudoModeration = { status: "public", moderationVersion: 0, moderatedBy: null, moderatedAt: null };
const SPAM_V1: KudoModeration = { status: "spam", moderationVersion: 1, moderatedBy: "a", moderatedAt: "2026-11-28T10:00:00Z" };

describe("decisionTarget (FR-305, DEC-001)", () => {
  it("offers only the decision that changes the status", () => {
    expect(decisionTarget("public")).toBe("spam");
    expect(decisionTarget("spam")).toBe("public");
  });
});

describe("runKudoDecision (A3/A4, Codex R13)", () => {
  it("sends the version the admin saw to the route of the target and takes the returned row", async () => {
    const post = vi.fn().mockResolvedValue({ changed: true, kudo: SPAM_V1 });
    await expect(runKudoDecision(KUDO, PUBLIC_V0, post)).resolves.toEqual({ kind: "changed", row: SPAM_V1 });
    expect(post).toHaveBeenCalledWith(`/api/v1/admin/kudos/${KUDO}/spam`, { expectedVersion: 0 });
  });

  it("refreshes the row to the current one from a 409 stale_decision and flags the stale message (E16)", async () => {
    const current = { status: "public", moderationVersion: 2, moderatedBy: "b", moderatedAt: "2026-11-28T10:05:00Z" };
    const post = vi.fn().mockRejectedValue(
      new ApiError(409, "stale_decision", "stale", { error: { code: "stale_decision", message: "stale" }, current }),
    );
    await expect(runKudoDecision(KUDO, SPAM_V1, post)).resolves.toEqual({ kind: "stale", row: current });
    expect(post).toHaveBeenCalledWith(`/api/v1/admin/kudos/${KUDO}/public`, { expectedVersion: 1 });
  });

  it("reloads the table when the kudo is gone (404, C03) or a 409 carries no readable row", async () => {
    const gone = vi.fn().mockRejectedValue(new ApiError(404, "kudo_not_found", "gone"));
    await expect(runKudoDecision(KUDO, PUBLIC_V0, gone)).resolves.toEqual({ kind: "reload" });
    const bare = vi.fn().mockRejectedValue(new ApiError(409, "stale_decision", "stale", { current: { status: "nope" } }));
    await expect(runKudoDecision(KUDO, PUBLIC_V0, bare)).resolves.toEqual({ kind: "reload" });
  });

  it("follows the admin call rule for 401 / 403 and keeps the row on any other failure", async () => {
    const outcome = (error: unknown) => runKudoDecision(KUDO, PUBLIC_V0, vi.fn().mockRejectedValue(error));
    await expect(outcome(new ApiError(401, "unauthorized", "x"))).resolves.toEqual({ kind: "sign-in" });
    await expect(outcome(new ApiError(403, "forbidden", "x"))).resolves.toEqual({ kind: "forbidden" });
    await expect(outcome(new ApiError(500, "internal_error", "x"))).resolves.toEqual({ kind: "error" });
    await expect(outcome(new TypeError("network"))).resolves.toEqual({ kind: "error" });
  });
});
