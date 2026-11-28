import { isApiError } from "@/lib/api/api-error";
import { ProfileRecoveryError, withProfileRecovery } from "@/lib/api/profile-recovery";

/**
 * Session summary for the chrome (F001 A1): what the header may show for the
 * current visitor. Built from Go `GET /api/v1/me` (F002 A8) on the server by
 * the `(shell)` and admin layouts, and again in the browser on window focus.
 * Pure (no framework imports), so the outcome mapping is unit-tested.
 */

/** Go A8: `GET /api/v1/me` (PROFILE route class). */
export const ME_PATH = "/api/v1/me";

export type SessionRole = "user" | "admin";

export interface SessionUser {
  /** `users.id`: keys per-user client state (the notification bell, F009 review W1). */
  id: string;
  displayName: string;
  avatarUrl: string | null;
  /** From `users.role` as Go returns it; never from the browser (Codex R05). */
  role: SessionRole;
}

export type SessionSummary =
  /** 200: full chrome with avatar menu and bell. */
  | { kind: "signed-in"; user: SessionUser }
  /** No session cookie, or Go answered 401: no avatar, no bell (FR-602). */
  | { kind: "signed-out" }
  /** Go failed, timed out (5 s, R23) or answered garbage: links and language only. */
  | { kind: "unavailable" }
  /** 403 profile_not_provisioned and the one re-provision failed (R22, N06). */
  | { kind: "profile-missing" };

export interface SessionSummarySources {
  /** A Supabase session cookie is present (no call is made without one). */
  hasSession: boolean;
  fetchMe: () => Promise<unknown>;
  provision: () => Promise<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Narrows a `/me` body to what the chrome needs; null when the shape is unusable. */
export function toSessionUser(body: unknown): SessionUser | null {
  if (!isRecord(body)) return null;
  const { id, name, avatarUrl, role } = body;
  if (typeof id !== "string" || !id || typeof name !== "string" || (role !== "user" && role !== "admin")) return null;
  return {
    id,
    displayName: name,
    avatarUrl: typeof avatarUrl === "string" && avatarUrl ? avatarUrl : null,
    role,
  };
}

/**
 * /me outcome → summary: 200 → signed-in; 401 → signed-out; 403
 * profile_not_provisioned → provision once and retry once (F002 R22), a failed
 * recovery → profile-missing; anything else (timeout, network, 5xx) → unavailable.
 */
export async function resolveSessionSummary({
  hasSession,
  fetchMe,
  provision,
}: SessionSummarySources): Promise<SessionSummary> {
  if (!hasSession) return { kind: "signed-out" };
  try {
    const user = toSessionUser(await withProfileRecovery(fetchMe, provision));
    return user ? { kind: "signed-in", user } : { kind: "unavailable" };
  } catch (error) {
    if (error instanceof ProfileRecoveryError) return { kind: "profile-missing" };
    if (isApiError(error) && error.status === 401) return { kind: "signed-out" };
    return { kind: "unavailable" };
  }
}
