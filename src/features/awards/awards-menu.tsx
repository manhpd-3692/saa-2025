"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { AwardTargetIcon } from "./award-icons";
import { ACTIVE_AWARD_VISIBILITY_THRESHOLD, pickActiveAward } from "./pick-active-award";

/** Height of the sticky site header: cards under it do not count as visible. */
const HEADER_OFFSET_PX = 80;
/** Fallback end of a smooth scroll where `scrollend` is not supported. */
const SCROLL_SETTLE_MS = 1200;

export interface AwardsMenuItem {
  slug: string;
  label: string;
}

/**
 * F004 A4/A5 sticky award menu (Figma 313:8459). Items are real `#slug`
 * links, so they work before hydration. A click scrolls smoothly to the card
 * (instantly under `prefers-reduced-motion: reduce`, WCAG 2.3.3),
 * puts the fragment in the address with `pushState` (shareable, Back returns,
 * FR-401) and moves focus to the card. While the user scrolls, an
 * IntersectionObserver marks the topmost card at least 30 % on screen
 * (DEC-002, FR-402); during a menu-driven scroll the target stays marked so the
 * highlight does not flicker through the cards in between.
 */
export function AwardsMenu({ items, label }: { items: readonly AwardsMenuItem[]; label: string }) {
  const [active, setActive] = useState(items[0]?.slug ?? "");
  const ratios = useRef<Record<string, number>>({});
  const scrollingTo = useRef<string | null>(null);

  useEffect(() => {
    const order = items.map((item) => item.slug);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.current[entry.target.id] = entry.intersectionRatio;
        if (!scrollingTo.current) setActive((current) => pickActiveAward(order, ratios.current, current));
      },
      { rootMargin: `-${HEADER_OFFSET_PX}px 0px 0px 0px`, threshold: [0, ACTIVE_AWARD_VISIBILITY_THRESHOLD, 1] },
    );
    for (const slug of order) {
      const card = document.getElementById(slug);
      if (card) observer.observe(card);
    }
    return () => observer.disconnect();
  }, [items]);

  function select(event: MouseEvent<HTMLAnchorElement>, slug: string) {
    const card = document.getElementById(slug);
    if (!card || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setActive(slug);
    scrollingTo.current = slug;
    const settle = () => {
      if (scrollingTo.current !== slug) return;
      scrollingTo.current = null;
      setActive((current) => pickActiveAward(items.map((item) => item.slug), ratios.current, current));
    };
    window.addEventListener("scrollend", settle, { once: true });
    window.setTimeout(settle, SCROLL_SETTLE_MS);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    card.focus({ preventScroll: true });
    if (window.location.hash !== `#${slug}`) window.history.pushState(null, "", `#${slug}`);
  }

  return (
    <nav aria-label={label} className="sticky top-24 w-[170px] shrink-0 self-start">
      <ul className="flex flex-col gap-4">
        {items.map((item) => {
          const current = item.slug === active;
          return (
            <li key={item.slug}>
              <a
                href={`#${item.slug}`}
                aria-current={current ? "true" : undefined}
                onClick={(event) => select(event, item.slug)}
                className={`flex w-fit items-center gap-1 border-b px-4 pb-[15px] pt-4 text-sm font-bold leading-5 transition-colors focus-visible:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  current ? "border-primary text-primary text-glow" : "border-transparent text-white hover:text-primary"
                }`}
              >
                <AwardTargetIcon className="shrink-0" />
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
