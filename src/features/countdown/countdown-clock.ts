/**
 * Framework-free countdown store behind `useCountdown` (F003 A4, BR-003).
 *
 * Remaining time is always measured against the Go server clock: `serverNow` is
 * taken as "now" on the first client read (mount) and advanced by the elapsed
 * time of the monotonic `performance.now()`, never by `Date.now()`. So a device
 * clock that is hours off, or is stepped while the page counts, changes nothing
 * (BR-003, FR-402); a refocus resync re-anchors on a fresh reading. The store ticks every
 * `COUNTDOWN_TICK_MS` while subscribed and schedules its last tick for the exact
 * zero moment, so a launch redirect fires at 0 ms rather than up to a tick late
 * (D001). It knows nothing about redirects or event status (Codex R08).
 */

/** Tick interval of the shared countdown (technical spec § 4.6). */
export const COUNTDOWN_TICK_MS = 1000;

export interface CountdownClock {
  subscribe: (listener: () => void) => () => void;
  /** Remaining milliseconds on the client, measured against the server clock. */
  getSnapshot: () => number;
  /** Remaining milliseconds as the server saw them; reads no device clock. */
  getServerSnapshot: () => number;
}

export function createCountdownClock(targetIso: string, serverNowIso: string): CountdownClock {
  const targetMs = Date.parse(targetIso);
  const serverNowMs = Date.parse(serverNowIso);
  const serverSnapshot = Math.max(0, targetMs - serverNowMs);
  const listeners = new Set<() => void>();
  let anchorMs: number | null = null; // performance.now() at which the server clock read serverNowMs
  let current: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const measure = () => {
    const nowMs = performance.now();
    anchorMs ??= nowMs;
    return Math.max(0, targetMs - (serverNowMs + (nowMs - anchorMs)));
  };

  const getSnapshot = () => (current ??= measure());

  const schedule = () => {
    const remaining = getSnapshot();
    if (remaining <= 0 || listeners.size === 0) return;
    timer = setTimeout(tick, Math.min(COUNTDOWN_TICK_MS, remaining));
  };

  function tick() {
    timer = null;
    current = measure();
    for (const listener of listeners) listener();
    schedule();
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    if (timer === null) schedule();
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };
  };

  return { subscribe, getSnapshot, getServerSnapshot: () => serverSnapshot };
}
