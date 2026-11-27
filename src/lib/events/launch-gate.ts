import { describeFailure, getCurrentEventForGate } from "./events-api";
import { createLaunchGateCache } from "./launch-gate-cache";

/**
 * F003 A1 LaunchGate#evaluate, run by `proxy.ts` before the F002 sign-in
 * redirect: before the event start every non-exempt page request goes to the
 * countdown (DEC-002); a missing, failing or stalled event read lets it through
 * (DEC-003). A convenience, not access control (no bypass for anyone, D007).
 */

export const COUNTDOWN_PATH = "/countdown";
export const LAUNCH_GATE_CACHE_TTL_MS = 60_000;

/**
 * D002 / FR-103: reachable before launch (countdown, sign-in, OAuth callback, Next internals).
 * Static files (public images, icons, fonts, favicon) never reach the proxy: its `matcher`
 * excludes them by extension. Any other path is a page and is gated, dots or not (FR-101).
 */
const EXEMPT_PREFIXES = [COUNTDOWN_PATH, "/login", "/auth/callback", "/_next"] as const;

export function isLaunchGateExempt(pathname: string): boolean {
  return EXEMPT_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const gate = createLaunchGateCache({
  lookup: async () => {
    const event = await getCurrentEventForGate();
    return { startAtMs: Date.parse(event.startAt), serverNowMs: Date.parse(event.serverNow) };
  },
  ttlMs: LAUNCH_GATE_CACHE_TTL_MS,
  onLookupFailure: (error) =>
    console.warn("[launch-gate] event lookup failed, letting the request through:", describeFailure(error)),
});

/** `/countdown` while the event has not started, otherwise null (pass through). */
export async function launchGateRedirect(pathname: string): Promise<string | null> {
  if (pathname === COUNTDOWN_PATH) {
    // The page reads Go fresh and redirects to `/` once started; refresh a cached
    // "upcoming" first so `/` is not sent straight back here (no redirect loop).
    await gate.recheckIfUpcoming();
    return null;
  }
  if (isLaunchGateExempt(pathname)) return null;
  return (await gate.isUpcoming()) ? COUNTDOWN_PATH : null;
}
