import { CLIENT_ERROR_CODES, isApiError } from "@/lib/api/api-error";

/**
 * Minimum gap between two unread-count reads triggered by the window coming
 * back (focus, tab shown): alt-tabbing or an iframe focus flip must not send a
 * request per event (review W3). The 60 s interval is not throttled.
 */
export const RETURN_REFRESH_MIN_GAP_MS = 5000;

/** Whether a focus or visibilitychange event should read the count again. */
export function shouldRefreshOnReturn(visible: boolean, lastStartedAt: number, now: number): boolean {
  return visible && now - lastStartedAt >= RETURN_REFRESH_MIN_GAP_MS;
}

/**
 * Whether a failed read is worth a console warning. The bell silently keeps its
 * last count either way (US001): a request it cancelled itself (newer read,
 * user switch, unmount) or one the browser dropped while the page was leaving
 * (no response at all) is normal noise, not a fault.
 */
export function shouldLogRefreshFailure(error: unknown, cancelled: boolean): boolean {
  if (cancelled) return false;
  if (error instanceof DOMException && error.name === "AbortError") return false;
  return !(isApiError(error) && error.code === CLIENT_ERROR_CODES.network);
}
