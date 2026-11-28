import { goApiBrowser } from "@/lib/api/go-api-browser";

/** F009 Go endpoints (technical-spec § 2): unread count (A2), list (A4), mark one read (A6), read all (A7). */
export const NOTIFICATION_PATHS = {
  list: "/api/v1/me/notifications",
  unreadCount: "/api/v1/me/notifications/unread-count",
  readAll: "/api/v1/me/notifications/read-all",
  read: (id: string) => `/api/v1/me/notifications/${encodeURIComponent(id)}/read`,
} as const;

/** NOTIFICATIONS_PAGE_SIZE and UNREAD_REFRESH_INTERVAL_MS (§ 4.6, D010). */
export const NOTIFICATIONS_PAGE_SIZE = 20;
export const UNREAD_REFRESH_INTERVAL_MS = 60_000;

/** The seven kinds (FR-002); there is no review-request kind (G10). */
export const NOTIFICATION_KINDS = [
  "kudo_received",
  "heart_received",
  "secret_box_received",
  "hero_level_up",
  "kudo_spam_warning",
  "icons_completed",
  "generic",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/**
 * One notice as A4 returns it. Text is built here from `kind` + `params` in the
 * reader's language (FR-004); Go has already removed the sender of a kudo that
 * is anonymous now (BR-007). `kudoAvailable` is false when the linked kudo can
 * no longer be opened (hidden as spam, removed).
 */
export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  params: Record<string, unknown>;
  kudoId: string | null;
  kudoAvailable: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  items: NotificationItem[];
  nextCursor: string | null;
}

export function fetchNotificationPage(cursor: string | null): Promise<NotificationPage> {
  const query = new URLSearchParams({ limit: String(NOTIFICATIONS_PAGE_SIZE) });
  if (cursor) query.set("cursor", cursor);
  return goApiBrowser<NotificationPage>(`${NOTIFICATION_PATHS.list}?${query}`);
}

/** A2; `signal` lets the bell cancel a read it no longer needs. */
export async function fetchUnreadCount(signal?: AbortSignal): Promise<number> {
  const { unreadCount } = await goApiBrowser<{ unreadCount: number }>(NOTIFICATION_PATHS.unreadCount, { signal });
  return unreadCount;
}

/** A6: 204 on success; another Sunner's id is a 404 (BR-001). */
export const markNotificationRead = (id: string) => goApiBrowser<void>(NOTIFICATION_PATHS.read(id), { method: "POST" });

/** A7: every unread notice of the caller. */
export const markAllNotificationsRead = () =>
  goApiBrowser<{ markedRead: number }>(NOTIFICATION_PATHS.readAll, { method: "POST" });
