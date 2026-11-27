"use client";

import { useEffect, useRef, useState } from "react";

const MENU_ITEM = '[role^="menuitem"]';

/** Index of the item to focus for a navigation key, or -1 when the key is not handled. */
function nextItemIndex(key: string, current: number, count: number): number {
  if (key === "ArrowDown") return (current + 1) % count;
  if (key === "ArrowUp") return current <= 0 ? count - 1 : current - 1;
  if (current < 0) return -1; // Home and End only act while an item has focus
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return -1;
}

/**
 * Open/closed state for a dropdown or the FAB choices (F001 SCR-app-shell § 4):
 * an outside pointer press, Escape, or focus moving out of the wrapper closes
 * it, so opening one popover closes any other. Escape also returns focus to
 * the trigger (the element marked `data-popover-trigger`). `ref` goes on the
 * element that wraps trigger and panel.
 *
 * With `menu: true` the panel follows the WAI-ARIA menu keyboard model for
 * `role="menuitem*"` children: the first item takes focus on open, ArrowUp /
 * ArrowDown (wrapping), Home and End move between items.
 */
export function useDismissablePopover<T extends HTMLElement>({ menu = false }: { menu?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!open || !root) return;
    const items = () => [...root.querySelectorAll<HTMLElement>(MENU_ITEM)].filter((el) => !el.hasAttribute("disabled"));
    if (menu) items()[0]?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!root.contains(event.target as Node)) setOpen(false);
    };
    const onFocusOut = (event: FocusEvent) => {
      const to = event.relatedTarget;
      if (to instanceof Node && !root.contains(to)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        root.querySelector<HTMLElement>("[data-popover-trigger]")?.focus();
        return;
      }
      if (!menu || !root.contains(document.activeElement)) return;
      const list = items();
      const next = list.length ? nextItemIndex(event.key, list.indexOf(document.activeElement as HTMLElement), list.length) : -1;
      if (next < 0) return;
      event.preventDefault();
      list[next].focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    root.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("focusout", onFocusOut);
    };
  }, [open, menu]);

  return { open, setOpen, ref };
}
