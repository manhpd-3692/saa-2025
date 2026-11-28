import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isApiError } from "@/lib/api/api-error";
import { goApiServer } from "@/lib/api/go-api-server";
import { loginHref } from "./admin-call-failure";

export type AdminReportResult<T> = { data: T } | { forbidden: true } | { error: true };

/**
 * One Go admin read for a Server Component page (no-store, 5 s, R23). The
 * admin layout checks the role once per mount (P3 review W3), so the page
 * itself follows Go: 401 → Login with the way back; 403 → the Forbidden page
 * (a Sunner demoted since the layout mounted); anything else → the error
 * state with Retry. Go's RequireAdmin is the protection (BR-007).
 */
export async function loadAdminReport<T>(path: string, returnPath: string): Promise<AdminReportResult<T>> {
  await connection();
  try {
    return { data: await goApiServer<T>(path) };
  } catch (error) {
    if (isApiError(error) && error.status === 401) redirect(loginHref(returnPath));
    if (isApiError(error) && error.status === 403) return { forbidden: true };
    return { error: true };
  }
}
