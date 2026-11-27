/**
 * F003 A1 launch-gate state for `proxy.ts`: the last successful read of the Go
 * event, kept in-process for `ttlMs` (60 s, AD13) so most requests add no
 * backend round trip. A failed read is never cached: the request fails open
 * (DEC-003) and the next request retries (SC-010). Per instance only; several
 * instances may each lag a start-time change by up to the TTL (tech spec 5.3 #2).
 */

export interface LaunchGateReading {
  /** `events.start_at` as epoch milliseconds. */
  startAtMs: number;
  /** The Go server clock when it answered, as epoch milliseconds. */
  serverNowMs: number;
}

interface LaunchGateCacheOptions {
  /** Reads the current event from Go; rejects on 404, errors and its own deadline. */
  lookup: () => Promise<LaunchGateReading>;
  ttlMs: number;
  /** Told once about every failed lookup; the gate then lets the request through. */
  onLookupFailure: (error: unknown) => void;
}

export interface LaunchGateCache {
  /** True while the event has not started (BR-001); false once started or unreadable. */
  isUpcoming: () => Promise<boolean>;
  /**
   * Reads Go again when the cached reading still says "upcoming". Called for
   * `/countdown`, whose page reads Go fresh and sends visitors to `/` once the
   * event has started: a stale "upcoming" here would send them straight back
   * (redirect loop when `start_at` is moved earlier within the TTL).
   */
  recheckIfUpcoming: () => Promise<void>;
}

interface CachedReading {
  reading: LaunchGateReading;
  /** Process clock when the lookup was sent, so the estimate never lags the server. */
  requestedAtMs: number;
}

export function createLaunchGateCache(options: LaunchGateCacheOptions): LaunchGateCache {
  const { lookup, ttlMs, onLookupFailure } = options;
  let cached: CachedReading | null = null;
  let pending: Promise<CachedReading | null> | null = null;

  // A failure is logged once and resolves to null (fail open), never stored.
  async function lookupOnce(): Promise<CachedReading | null> {
    const requestedAtMs = Date.now();
    try {
      cached = { reading: await lookup(), requestedAtMs };
    } catch (error) {
      cached = null;
      onLookupFailure(error);
    }
    return cached;
  }

  // One lookup at a time, shared by concurrent requests.
  const read = () =>
    (pending ??= lookupOnce().finally(() => {
      pending = null;
    }));

  const isFresh = (entry: CachedReading | null): entry is CachedReading =>
    entry !== null && Date.now() - entry.requestedAtMs < ttlMs;

  // Server time now = the server reading advanced by the time elapsed since the
  // lookup was sent, so the Next.js process clock never decides on its own (BR-003).
  const upcoming = ({ reading, requestedAtMs }: CachedReading) =>
    reading.serverNowMs + (Date.now() - requestedAtMs) < reading.startAtMs;

  async function isUpcoming(): Promise<boolean> {
    const entry = isFresh(cached) ? cached : await read();
    return entry !== null && upcoming(entry);
  }

  async function recheckIfUpcoming(): Promise<void> {
    if (isFresh(cached) && upcoming(cached)) await read();
  }

  return { isUpcoming, recheckIfUpcoming };
}
