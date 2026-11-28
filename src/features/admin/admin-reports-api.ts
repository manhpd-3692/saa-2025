/**
 * F010 read contracts as Go answers them (technical-spec § 3) and the admin
 * page addresses: `/admin?from&to` and `/admin/users?unit&level&role&q&page`.
 * The filters live in the address (SCR-admin-users § 4), so a reload or a
 * shared link shows the same list; Go validates every value again.
 */

export interface OverviewRow {
  /** Null on the All row, which always comes first (FR-101, FR-103). */
  unitId: string | null;
  unitCode: string | null;
  unitName: string | null;
  totalMembers: number;
  kudosSent: number;
  kudosReceived: number;
  usersWithKudo: number;
  secretBoxes: number;
}

/** A1: the applied range (Go's default when the address had none or a bad one, FR-104). */
export interface OverviewReport {
  from: string;
  to: string;
  rows: OverviewRow[];
}

export const HERO_LEVELS = ["New", "Rising", "Super", "Legend"] as const;
export type HeroLevel = (typeof HERO_LEVELS)[number];
export const USER_ROLES = ["admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  unitCode: string | null;
  kudosSent: number;
  kudosReceived: number;
  /** Weighted heart total (BR-008). */
  totalHeart: number;
  /** F008 hero tier; null without public kudos received. */
  level: HeroLevel | null;
  badges: number;
  /** Null below six badges (DEC-003). */
  timeToSixBadgesSeconds: number | null;
  lastLoginAt: string | null;
  role: UserRole;
}

export interface UnitChoice {
  id: string;
  code: string;
  name: string;
}

/** A4/A5: one page, the match count, the page shown (clamped) and the Unit choices. */
export interface UserDirectoryPage {
  rows: DirectoryUser[];
  total: number;
  page: number;
  pageSize: number;
  units: UnitChoice[];
}

/** The user directory address state; empty filters are absent (BR-005). */
export interface UserDirectoryQuery {
  unit: string | null;
  level: HeroLevel | null;
  role: UserRole | null;
  q: string;
  page: number;
}

export const EMPTY_USER_QUERY: UserDirectoryQuery = { unit: null, level: null, role: null, q: "", page: 1 };

/** Suggestions after 2 characters, up to 8, debounced (technical-spec § 4.6). */
export const SUGGEST_MIN_CHARS = 2;
export const SUGGEST_LIMIT = 8;
export const SUGGEST_DEBOUNCE_MS = 250;

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const isOneOf = <T extends string>(list: readonly T[], value: string): value is T => (list as readonly string[]).includes(value);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads the directory address; unknown values are dropped like Go drops them. */
export function parseUserDirectoryQuery(params: SearchParams): UserDirectoryQuery {
  const unit = first(params.unit);
  const level = first(params.level);
  const role = first(params.role);
  const page = Number.parseInt(first(params.page), 10);
  return {
    unit: UUID.test(unit) ? unit.toLowerCase() : null,
    level: isOneOf(HERO_LEVELS, level) ? level : null,
    role: isOneOf(USER_ROLES, role) ? role : null,
    q: first(params.q).trim(),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export const hasUserFilter = (query: UserDirectoryQuery) => Boolean(query.unit || query.level || query.role || query.q);

/** `unit=…&level=…&role=…&q=…[&page=…]` with empty values left out. */
export function userDirectorySearch(query: UserDirectoryQuery, withPage = true): string {
  const params = new URLSearchParams();
  if (query.unit) params.set("unit", query.unit);
  if (query.level) params.set("level", query.level);
  if (query.role) params.set("role", query.role);
  if (query.q) params.set("q", query.q);
  if (withPage && query.page > 1) params.set("page", String(query.page));
  return params.toString();
}

/** The users page address for a query (page 1 unless given). */
export function usersPageHref(query: UserDirectoryQuery): string {
  const search = userDirectorySearch(query);
  return search ? `/admin/users?${search}` : "/admin/users";
}

const withQuery = (path: string, search: string) => (search ? `${path}?${search}` : path);

export const ADMIN_REPORT_PATHS = {
  overview: (from: string, to: string) => withQuery("/api/v1/admin/overview", new URLSearchParams({ from, to }).toString()),
  overviewExport: (from: string, to: string) =>
    withQuery("/api/v1/admin/overview/export", new URLSearchParams({ from, to }).toString()),
  users: (query: UserDirectoryQuery, pageSize?: number) =>
    withQuery("/api/v1/admin/users", [userDirectorySearch(query), pageSize ? `pageSize=${pageSize}` : ""].filter(Boolean).join("&")),
  usersExport: (query: UserDirectoryQuery) => withQuery("/api/v1/admin/users/export", userDirectorySearch(query, false)),
} as const;
