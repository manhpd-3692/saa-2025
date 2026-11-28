"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { createHeartStore } from "./heart-state-store";
import type { HeartView } from "./heart-toggle";

const store = createHeartStore();
let trackingViewer = false;

/**
 * Binds the page's heart store to the signed-in Supabase user (its id, not the
 * shell's `/me` object, which is replaced on every window focus: review W1).
 * The first auth event reports the current session; a sign-out or another
 * account drops every entry.
 */
function trackViewer() {
  if (trackingViewer) return;
  trackingViewer = true;
  createSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => store.identify(session?.user.id ?? null));
}

/** The heart state to show for one card of `kudoId` (starting from its server data) and its actions. */
export function useHeartView(kudoId: string, server: HeartView) {
  useEffect(trackViewer, []);
  useSyncExternalStore(store.subscribe, store.version, store.version);
  return {
    view: store.view(kudoId, server),
    busy: store.busy(kudoId),
    set: (view: HeartView) => store.set(kudoId, server, view),
    revert: (expected: HeartView, previous: HeartView) => store.revert(kudoId, server, expected, previous),
    begin: () => store.begin(kudoId),
    end: () => store.end(kudoId),
  };
}
