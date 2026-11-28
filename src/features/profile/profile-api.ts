import type { SecretBoxIcon } from "@/features/gamification/gamification-config";
import type { KudoPage } from "@/features/kudos-board/kudo-card-types";
import { goApiBrowser } from "@/lib/api/go-api-browser";

/**
 * F007 read contracts as Go answers them (technical-spec § 3): the profile
 * (A1/A2) and one page of a Sunner's kudos (A3, F006's `{items, nextCursor}`).
 */

export type ProfileFilter = "received" | "sent";

/** Box figures are present only on the viewer's own profile (BR-004). */
export interface ProfileCounts {
  kudosReceived: number;
  kudosSent: number;
  /** Weighted heart total over the kudos received (G08). */
  heartsReceived: number;
  boxesOpened?: number;
  boxesUnopened?: number;
}

export interface ProfileData {
  user: { id: string; name: string; avatarUrl: string | null; unitCode: string | null };
  /** Null with `countsUnavailable` when Go could not read them (Codex R15). */
  counts: ProfileCounts | null;
  countsUnavailable: boolean;
  /** Distinct collected icons in enum order; null when the F008 summary failed (C02). */
  collectedIcons: SecretBoxIcon[] | null;
  isOwner: boolean;
}

export const PROFILE_PATHS = {
  profile: (userId: string) => `/api/v1/users/${encodeURIComponent(userId)}/profile`,
  kudos: (userId: string, filter: ProfileFilter, cursor: string | null) =>
    `/api/v1/users/${encodeURIComponent(userId)}/kudos?filter=${filter}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
} as const;

export const fetchProfileKudos = (userId: string, filter: ProfileFilter, cursor: string | null) =>
  goApiBrowser<KudoPage>(PROFILE_PATHS.kudos(userId, filter, cursor));

/** FR-401 / D004: the address `filter`; anything but "sent" shows the received list. */
export function parseProfileFilter(value: string | string[] | undefined): ProfileFilter {
  return value === "sent" ? "sent" : "received";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The user id of a `/profile/[userId]` param in lower case, or null when it is not a uuid (FR-104). */
export function parseUserIdParam(param: string): string | null {
  return UUID.test(param) ? param.toLowerCase() : null;
}

/** DEC-001: the own profile address, keeping a filter the visitor chose. */
export function ownProfilePath(filter: ProfileFilter | null): string {
  return filter ? `/profile?filter=${filter}` : "/profile";
}
