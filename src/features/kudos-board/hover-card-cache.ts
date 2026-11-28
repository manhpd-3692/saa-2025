import type { HoverCardData } from "./kudo-card-types";

// One map per signed-in viewer object (from the shell's session context). A
// different viewer — sign-out/sign-in, or the focus re-read of `/me` — gets a
// fresh map, so a card read for an admin or for the Sunner themself (whose sent
// count includes anonymous kudos, BR-002) is never shown to someone else.
const byViewer = new WeakMap<object, Map<string, HoverCardData>>();

/** The hover cards already read for this viewer; null (no caching) when the viewer is unknown. */
export function hoverCardsFor(viewer: object | null): Map<string, HoverCardData> | null {
  if (!viewer) return null;
  let cards = byViewer.get(viewer);
  if (!cards) {
    cards = new Map();
    byViewer.set(viewer, cards);
  }
  return cards;
}
