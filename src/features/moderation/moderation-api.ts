/**
 * F011 read and decision contracts as Go answers them (technical-spec § 3)
 * and the Review content address `/admin/review?sender&receiver&status&from&to&q&page`.
 * The filters live in the address (FR-206), so a reload or a shared link shows
 * the same table; Go validates every value again and echoes what it applied.
 */

export const KUDO_STATUSES = ["public", "spam"] as const;
export type KudoStatus = (typeof KUDO_STATUSES)[number];

/** A sender, receiver or filter option; never an email (A2). */
export interface ReviewPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  unitCode: string | null;
}

/** The moderation state a decision carries and a 409 returns (Codex R13). */
export interface KudoModeration {
  status: KudoStatus;
  moderationVersion: number;
  moderatedBy: string | null;
  moderatedAt: string | null;
}

/** One review row (FR-101): the real sender with the anonymous marker for admins (BR-004). */
export interface ReviewKudo extends KudoModeration {
  id: string;
  createdAt: string;
  title: string;
  /** Visible text of the body, cut with "…". */
  excerpt: string;
  isAnonymous: boolean;
  sender: ReviewPerson | null;
  receiver: ReviewPerson;
  hashtags: string[];
  heartTotal: number;
}

/** What Go applied: people named, the range it used (null when ignored, BR-005). */
export interface AppliedReviewFilters {
  sender: ReviewPerson | null;
  receiver: ReviewPerson | null;
  status: KudoStatus | null;
  from: string | null;
  to: string | null;
  q: string;
}

export interface ReviewPage {
  items: ReviewKudo[];
  total: number;
  /** The page shown, clamped to the last one. */
  page: number;
  pageSize: number;
  filters: AppliedReviewFilters;
}

/** The Review content address state; empty filters are absent. */
export interface ReviewQuery {
  sender: string | null;
  receiver: string | null;
  status: KudoStatus | null;
  from: string | null;
  to: string | null;
  q: string;
  page: number;
}

export const REVIEW_PATH = "/admin/review";
export const PEOPLE_DEBOUNCE_MS = 250;

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isStatus = (value: string): value is KudoStatus => (KUDO_STATUSES as readonly string[]).includes(value);

/** Reads the address; unknown values are dropped like Go drops them (a lone or reversed day too). */
export function parseReviewQuery(params: SearchParams): ReviewQuery {
  const sender = first(params.sender);
  const receiver = first(params.receiver);
  const status = first(params.status);
  const [from, to] = [first(params.from), first(params.to)];
  const range = DAY.test(from) && DAY.test(to) && from <= to;
  const page = Number.parseInt(first(params.page), 10);
  return {
    sender: UUID.test(sender) ? sender.toLowerCase() : null,
    receiver: UUID.test(receiver) ? receiver.toLowerCase() : null,
    status: isStatus(status) ? status : null,
    from: range ? from : null,
    to: range ? to : null,
    q: first(params.q).trim(),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export const hasReviewFilter = (query: ReviewQuery) =>
  Boolean(query.sender || query.receiver || query.status || query.from || query.q);

/** `sender=…&receiver=…&status=…&from=…&to=…&q=…[&page=…]` with empty values left out. */
export function reviewSearch(query: ReviewQuery, withPage = true): string {
  const params = new URLSearchParams();
  if (query.sender) params.set("sender", query.sender);
  if (query.receiver) params.set("receiver", query.receiver);
  if (query.status) params.set("status", query.status);
  if (query.from && query.to) {
    params.set("from", query.from);
    params.set("to", query.to);
  }
  if (query.q) params.set("q", query.q);
  if (withPage && query.page > 1) params.set("page", String(query.page));
  return params.toString();
}

/** The Review content address of a query. */
export function reviewHref(query: ReviewQuery): string {
  const search = reviewSearch(query);
  return search ? `${REVIEW_PATH}?${search}` : REVIEW_PATH;
}

/** Every filter change returns to page 1 (FR-206). */
export const reviewFilterHref = (query: ReviewQuery, patch: Partial<ReviewQuery>) => reviewHref({ ...query, ...patch, page: 1 });

const withQuery = (path: string, search: string) => (search ? `${path}?${search}` : path);

export const MODERATION_PATHS = {
  list: (query: ReviewQuery) => withQuery("/api/v1/admin/kudos", reviewSearch(query)),
  people: (role: "sender" | "receiver", q: string) =>
    withQuery("/api/v1/admin/kudos/people", new URLSearchParams(q ? { role, q } : { role }).toString()),
  decision: (kudoId: string, target: KudoStatus) => `/api/v1/admin/kudos/${encodeURIComponent(kudoId)}/${target}`,
} as const;

/** D012: the ID column shows the first 8 characters of the kudo id. */
export const shortKudoId = (id: string) => id.slice(0, 8);
