"use client";

import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { BADGE_HOVER_DELAY_MS } from "./gamification-config";

/**
 * Hover-or-focus overlay of a badge (hero badge FR-203, campaign badge
 * FR-204): opens after the pointer or keyboard focus rests BADGE_HOVER_DELAY_MS
 * on the wrapper, stays open while either is inside it, closes on leave, on
 * focus moving out and on Escape. Spread `wrapper` on the element holding the
 * trigger and the overlay; point the trigger's aria-describedby at `id`.
 */
export function useHoverPopover() {
  const id = useId();
  const timer = useRef(0);
  const [open, setOpen] = useState(false);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function show() {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), BADGE_HOVER_DELAY_MS);
  }
  function hide() {
    window.clearTimeout(timer.current);
    setOpen(false);
  }

  const wrapper = {
    onPointerEnter: show,
    onPointerLeave: hide,
    onFocus: show,
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) hide();
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape" && open) {
        event.stopPropagation();
        hide();
      }
    },
  };
  return { id, open, wrapper };
}
