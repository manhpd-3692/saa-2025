import { ApiError, CLIENT_ERROR_CODES } from "@/lib/api/api-error";
import { requestGoApi } from "@/lib/api/go-api-request";

/**
 * F003 EventsApiClient: the PUBLIC Go route `GET /api/v1/events/current` (no
 * token, Codex N09). Three callers, three budgets (Codex R23):
 * - the `proxy.ts` launch gate: 1.5 s, then the gate fails open;
 * - the `/countdown` Server Component: no-store, 5 s;
 * - the browser resync of `LaunchCountdown` on refocus: 5 s.
 * Next.js never reads the database; Go is the only reader (G16).
 */

export const CURRENT_EVENT_PATH = "/api/v1/events/current";
export const LAUNCH_GATE_LOOKUP_TIMEOUT_MS = 1500;
export const EVENTS_FETCH_TIMEOUT_MS = 5000;

export type EventStatus = "upcoming" | "active";

/** A3 response; timestamps are ISO 8601 with offset. */
export interface CurrentEvent {
  id: string;
  name: string;
  startAt: string;
  ceremonyAt: string;
  venue: string | null;
  livestreamNote: string | null;
  serverNow: string;
  /** `active` iff serverNow >= startAt (BR-001), derived by Go. */
  status: EventStatus;
}

const isTimestamp = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

const optionalText = (value: unknown) => (typeof value === "string" ? value : null);

/** Validates the A3 body; an unusable answer counts as a failed read (fail open). */
export function parseCurrentEvent(body: unknown): CurrentEvent {
  const event = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const { startAt, ceremonyAt, serverNow, status } = event;
  if (
    !isTimestamp(startAt) ||
    !isTimestamp(ceremonyAt) ||
    !isTimestamp(serverNow) ||
    (status !== "upcoming" && status !== "active")
  ) {
    throw new ApiError(200, CLIENT_ERROR_CODES.invalidResponse, "Unexpected current event shape", body);
  }
  return {
    id: String(event.id ?? ""),
    name: String(event.name ?? ""),
    startAt,
    ceremonyAt,
    venue: optionalText(event.venue),
    livestreamNote: optionalText(event.livestreamNote),
    serverNow,
    status,
  };
}

async function fetchCurrentEvent(baseUrl: string | undefined, envName: string, timeoutMs: number) {
  const body = await requestGoApi({
    baseUrl,
    baseUrlEnvName: envName,
    path: CURRENT_EVENT_PATH,
    timeoutMs,
    cache: "no-store",
  });
  return parseCurrentEvent(body);
}

/** Launch gate lookup from `proxy.ts`; rejects after 1.5 s so the gate can fail open. */
export function getCurrentEventForGate(): Promise<CurrentEvent> {
  return fetchCurrentEvent(process.env.API_BASE_URL, "API_BASE_URL", LAUNCH_GATE_LOOKUP_TIMEOUT_MS);
}

/**
 * Fresh read for the `/countdown` page; null when there is no event row, Go
 * fails, or 5 s pass (FR-204 "Coming soon"). Anything but a 404 is logged.
 */
export async function getCurrentEventForPage(): Promise<CurrentEvent | null> {
  try {
    return await fetchCurrentEvent(process.env.API_BASE_URL, "API_BASE_URL", EVENTS_FETCH_TIMEOUT_MS);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) {
      console.warn("[countdown] current event unavailable:", describeFailure(error));
    }
    return null;
  }
}

/** Browser resync (A4): fresh `serverNow` and `status` when the tab is shown again. */
export function getCurrentEventFromBrowser(): Promise<CurrentEvent> {
  return fetchCurrentEvent(
    process.env.NEXT_PUBLIC_API_BASE_URL,
    "NEXT_PUBLIC_API_BASE_URL",
    EVENTS_FETCH_TIMEOUT_MS,
  );
}

/** One-line reason for logs (code and status only, never a body). */
export function describeFailure(error: unknown): string {
  if (error instanceof ApiError) return `${error.code} (status ${error.status})`;
  return error instanceof Error ? error.message : String(error);
}
