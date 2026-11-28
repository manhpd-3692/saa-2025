import { classifyAdminCallFailure } from "@/features/admin/admin-call-failure";
import { isApiError } from "@/lib/api/api-error";
import { KUDO_STATUSES, MODERATION_PATHS, type KudoModeration, type KudoStatus } from "./moderation-api";

/**
 * What a row does after a decision (A3/A4, Codex R13): take the row Go
 * returned (200, also `changed: false`), take the current row of a 409
 * `stale_decision` and say it was changed by another admin (E16), reload the
 * table when the kudo is gone (404, C03), follow the admin call rule on 401 /
 * 403, or keep the row and show a short error.
 */
export type DecisionOutcome =
  | { kind: "changed"; row: KudoModeration }
  | { kind: "stale"; row: KudoModeration }
  | { kind: "reload" }
  | { kind: "sign-in" }
  | { kind: "forbidden" }
  | { kind: "error" };

/** POSTs a JSON body to Go and resolves with the parsed answer (goApiBrowser in the page). */
export type DecisionPost = (path: string, body: { expectedVersion: number }) => Promise<unknown>;

/** FR-305 / DEC-001: a Public row offers Spam, a Spam row offers Public. */
export const decisionTarget = (status: KudoStatus): KudoStatus => (status === "public" ? "spam" : "public");

function asModeration(value: unknown): KudoModeration | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  const statusOk = typeof row.status === "string" && (KUDO_STATUSES as readonly string[]).includes(row.status);
  if (!statusOk || typeof row.moderationVersion !== "number") return null;
  return {
    status: row.status as KudoStatus,
    moderationVersion: row.moderationVersion,
    moderatedBy: typeof row.moderatedBy === "string" ? row.moderatedBy : null,
    moderatedAt: typeof row.moderatedAt === "string" ? row.moderatedAt : null,
  };
}

/** Sends the decision that changes `row`'s status with the version the admin saw. */
export async function runKudoDecision(kudoId: string, row: KudoModeration, post: DecisionPost): Promise<DecisionOutcome> {
  try {
    const answer = await post(MODERATION_PATHS.decision(kudoId, decisionTarget(row.status)), { expectedVersion: row.moderationVersion });
    const kudo = asModeration((answer as { kudo?: unknown } | null)?.kudo);
    return kudo ? { kind: "changed", row: kudo } : { kind: "reload" };
  } catch (error) {
    if (isApiError(error) && error.status === 409) {
      const current = asModeration((error.body as { current?: unknown } | undefined)?.current);
      return current ? { kind: "stale", row: current } : { kind: "reload" };
    }
    if (isApiError(error) && error.status === 404) return { kind: "reload" };
    const failure = classifyAdminCallFailure(error);
    return failure === "error" ? { kind: "error" } : { kind: failure };
  }
}
