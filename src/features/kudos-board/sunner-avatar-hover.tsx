"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FocusEvent } from "react";
import { useSessionUser } from "@/components/shell/me-refresher";
import { SunnerAvatar } from "@/features/kudo-compose/compose-field-parts";
import { useLocale } from "@/i18n/locale-provider";
import { hoverCardsFor } from "./hover-card-cache";
import { fillText } from "./kudo-board-format";
import type { HoverCardData, PersonCard } from "./kudo-card-types";
import { fetchHoverCard, profilePath } from "./kudos-board-api";
import { SunnerHoverCard } from "./sunner-hover-card";

/** HOVER_CARD_DELAY_MS (F006 § 4.6): the card opens only after the pointer rests this long. */
export const HOVER_CARD_DELAY_MS = 300;

/**
 * A9 avatar of a named Sunner (Figma 721:5827): a link to the profile (FR-103)
 * that, after HOVER_CARD_DELAY_MS of hover or keyboard focus, shows the info
 * card (FR-402) and keeps it open while the pointer is over avatar or card.
 * A masked anonymous sender never gets this component (DEC-002), so no
 * request is ever made for one.
 */
export function SunnerAvatarHover({ person, size = 64 }: { person: PersonCard; size?: number }) {
  const { t } = useLocale();
  const panelId = useId();
  const timer = useRef(0);
  const [open, setOpen] = useState(false);
  const [fetched, setFetched] = useState<{ viewer: object | null; data: HoverCardData } | null>(null);
  const [failed, setFailed] = useState(false);
  // One read per Sunner per viewer; the counts are not live (D012) and never cross viewers (W3).
  const viewer = useSessionUser();
  const cards = hoverCardsFor(viewer);
  const card = cards?.get(person.id) ?? (fetched?.viewer === viewer ? fetched.data : null);

  useEffect(() => {
    if (!open || card) return;
    const controller = new AbortController();
    fetchHoverCard(person.id, controller.signal).then(
      (data) => {
        cards?.set(person.id, data);
        setFetched({ viewer, data });
      },
      () => {
        if (!controller.signal.aborted) setFailed(true);
      },
    );
    return () => controller.abort();
  }, [open, card, cards, viewer, person.id]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function show() {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setFailed(false);
      setOpen(true);
    }, HOVER_CARD_DELAY_MS);
  }
  function hide() {
    window.clearTimeout(timer.current);
    setOpen(false);
  }
  function onBlur(event: FocusEvent<HTMLSpanElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) hide();
  }

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={onBlur}
      onKeyDown={(event) => event.key === "Escape" && hide()}
    >
      <Link
        href={profilePath(person.id)}
        aria-label={fillText(t("kudos-board.card.profile"), { name: person.name })}
        aria-describedby={open ? panelId : undefined}
        data-testid="sunner-avatar"
        className="rounded-full outline-offset-2 hover:[&>span]:border-primary focus-visible:[&>span]:border-primary"
      >
        <SunnerAvatar name={person.name} url={person.avatarUrl} size={size} />
      </Link>
      {open && (
        <span className="absolute left-1/2 top-full z-30 -translate-x-1/2 pt-2">
          <span
            id={panelId}
            role="group"
            aria-label={person.name}
            data-testid="hover-card"
            className="block w-[344px] rounded-2xl bg-menu p-4 shadow-[0_8px_24px_rgb(0_0_0/0.45)]"
          >
            <SunnerHoverCard card={card} failed={failed} />
          </span>
        </span>
      )}
    </span>
  );
}
