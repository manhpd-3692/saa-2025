import { isApiError } from "@/lib/api/api-error";

/**
 * What an admin page does when a browser call to Go fails (P3 review W3, phase 11 review W2):
 * 401 → Login with the way back, 403 → reload into the Forbidden page, anything else → the
 * caller's own error or empty state. Server reads follow the same rule (`loadAdminReport`).
 */
export type AdminCallFailure = "sign-in" | "forbidden" | "error";

export function classifyAdminCallFailure(error: unknown): AdminCallFailure {
  if (isApiError(error) && error.status === 401) return "sign-in";
  if (isApiError(error) && error.status === 403) return "forbidden";
  return "error";
}

/** The Login address that returns to `returnPath` (path and query) after signing in. */
export const loginHref = (returnPath: string) => `/login?next=${encodeURIComponent(returnPath)}`;
