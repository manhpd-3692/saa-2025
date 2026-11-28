import { goApiBrowser } from "@/lib/api/go-api-browser";
import type {
  BoardSidebarData,
  FilterOptions,
  HighlightFilter,
  HoverCardData,
  KudoCardData,
  KudoPage,
  SpotlightData,
} from "./kudo-card-types";

/**
 * Go endpoints of the Live board (F006 A2–A9). The server page reads the same
 * paths for the first paint (`goApiServer`); the browser calls below refetch
 * with the session's Bearer token for filters, scrolling, hover and refocus.
 */
export const BOARD_PATHS = {
  highlight: ({ hashtagId, unitId }: HighlightFilter) => {
    const query = new URLSearchParams();
    if (hashtagId) query.set("hashtagId", hashtagId);
    if (unitId) query.set("unitId", unitId);
    return `/api/v1/kudos/highlight${query.size > 0 ? `?${query}` : ""}`;
  },
  filterOptions: "/api/v1/kudos/filter-options",
  spotlight: "/api/v1/kudos/spotlight",
  feed: (cursor: string | null) => (cursor ? `/api/v1/kudos?cursor=${encodeURIComponent(cursor)}` : "/api/v1/kudos"),
  sidebar: "/api/v1/kudos/sidebar",
  kudo: (id: string) => `/api/v1/kudos/${encodeURIComponent(id)}`,
  hoverCard: (userId: string) => `/api/v1/users/${encodeURIComponent(userId)}/hover-card`,
} as const;

export const fetchHighlight = (filter: HighlightFilter) => goApiBrowser<KudoPage>(BOARD_PATHS.highlight(filter));
export const fetchFilterOptions = () => goApiBrowser<FilterOptions>(BOARD_PATHS.filterOptions);
export const fetchSpotlight = () => goApiBrowser<SpotlightData>(BOARD_PATHS.spotlight);
export const fetchFeedPage = (cursor: string | null) => goApiBrowser<KudoPage>(BOARD_PATHS.feed(cursor));
export const fetchSidebar = () => goApiBrowser<BoardSidebarData>(BOARD_PATHS.sidebar);
export const fetchHoverCard = (userId: string, signal?: AbortSignal) =>
  goApiBrowser<HoverCardData>(BOARD_PATHS.hoverCard(userId), { signal });
/** One kudo again, for fresh signed image URLs after an image failed to load. */
export const fetchKudo = (id: string) => goApiBrowser<KudoCardData>(BOARD_PATHS.kudo(id));

// In this Next.js version the intercepted `(.)[id]` param can arrive with the
// interception marker in front of the id ("(.)", repeated, seen in `next dev`).
const INTERCEPTION_MARKERS = /^(?:\(\.{1,3}\))+/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The kudo id of a `/kudos/[id]` route param, or null when it is not a uuid
 * (then the page is the not-found page without asking Go, and nothing like
 * `..` ever reaches the Go URL, review W1). Go stays the authority on
 * existence and visibility (BR-006).
 */
export function parseKudoIdParam(param: string): string | null {
  const id = param.replace(INTERCEPTION_MARKERS, "");
  return UUID.test(id) ? id : null;
}

/** Detail address shared by Copy Link (BR-007): no filters, no scroll state. */
export const kudoDetailPath = (id: string) => `/kudos/${id}`;

/** Profile page of a Sunner (F007). */
export const profilePath = (userId: string) => `/profile/${userId}`;
