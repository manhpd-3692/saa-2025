import type { HeartView } from "./heart-toggle";

/**
 * Shared heart state of the page (RISK-02): one kudo can show in Highlight,
 * the feed and the detail at once, and a heart given on one card must show on
 * all of them. Entries belong to one viewer (the Supabase user id, stable
 * across the shell's `/me` focus re-reads, review W1); a different viewer
 * drops them all, so nothing crosses users. Each entry remembers the server
 * data (`base`) it was made from: a card whose server data has moved on (a
 * refresh) shows that newer data instead. One request per kudo at a time
 * across all its cards (review W2), and a rollback never undoes a newer state.
 */
export interface HeartStore {
  identify(viewerId: string | null): void;
  view(kudoId: string, server: HeartView): HeartView;
  set(kudoId: string, server: HeartView, view: HeartView): void;
  /** Puts `previous` back only while the kudo still shows `expected`. */
  revert(kudoId: string, server: HeartView, expected: HeartView, previous: HeartView): void;
  busy(kudoId: string): boolean;
  /** Claims the kudo for one request; false while any card of it has one in flight. */
  begin(kudoId: string): boolean;
  end(kudoId: string): void;
  subscribe(listener: () => void): () => void;
  version(): number;
}

interface Entry {
  base: HeartView;
  view: HeartView;
}

const same = (a: HeartView, b: HeartView) => a.total === b.total && a.viewerHearted === b.viewerHearted;
const UNKNOWN = Symbol("viewer not known yet");

export function createHeartStore(): HeartStore {
  let viewer: string | null | typeof UNKNOWN = UNKNOWN;
  const entries = new Map<string, Entry>();
  const inFlight = new Set<string>();
  const listeners = new Set<() => void>();
  let version = 0;
  const changed = () => {
    version++;
    listeners.forEach((listener) => listener());
  };
  const view = (kudoId: string, server: HeartView) => {
    const entry = entries.get(kudoId);
    return entry && same(entry.base, server) ? entry.view : server;
  };
  const set = (kudoId: string, server: HeartView, next: HeartView) => {
    entries.set(kudoId, { base: { ...server }, view: next });
    changed();
  };

  return {
    identify(viewerId) {
      if (viewer === viewerId) return;
      // Entries made before the viewer was known belong to the first one identified.
      if (viewer !== UNKNOWN) {
        entries.clear();
        inFlight.clear();
      }
      viewer = viewerId;
      changed();
    },
    view,
    set,
    revert(kudoId, server, expected, previous) {
      if (same(view(kudoId, server), expected)) set(kudoId, server, previous);
    },
    busy: (kudoId) => inFlight.has(kudoId),
    begin(kudoId) {
      if (inFlight.has(kudoId)) return false;
      inFlight.add(kudoId);
      changed();
      return true;
    },
    end(kudoId) {
      if (inFlight.delete(kudoId)) changed();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
  };
}
