import type { KeyboardEvent } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Focusable, rendered descendants of `container` in tab order. */
function focusables(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
}

/**
 * Keeps Tab / Shift+Tab inside a modal (WAI-ARIA dialog pattern, reviewer W5):
 * from the last focusable element Tab wraps to the first, and from the first —
 * or from the panel itself — Shift+Tab wraps to the last. Keys from elements
 * outside `container` (a nested dialog rendered in a portal) are left alone.
 */
export function trapTabKey(event: KeyboardEvent, container: HTMLElement | null): void {
  if (event.key !== "Tab" || !container || !container.contains(event.target as Node)) return;
  const items = focusables(container);
  if (items.length === 0) {
    // Nothing to tab to yet (the edit form is still loading): focus stays on the
    // dialog itself (tabIndex -1) instead of escaping to the page (reviewer N3).
    event.preventDefault();
    container.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === container)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
