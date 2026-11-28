"use client";

import { useLocale } from "@/i18n/locale-provider";
import type { HeroTier } from "./kudo-card-types";

/**
 * FR-211 hero badge place next to a Sunner (cards, hover card). F008 supplies
 * the tier (D011) and, in phase 8, its badge artwork and hover; until then a
 * plain pill names the tier. Nothing shows without a tier.
 */
export function HeroBadgeSlot({ tier, size = "sm" }: { tier: HeroTier | null; size?: "sm" | "lg" }) {
  const { t } = useLocale();
  if (!tier) return null;
  return (
    <span
      data-slot="hero-badge"
      data-tier={tier}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-primary-border bg-page font-bold text-primary ${
        size === "lg" ? "h-8 px-4 text-base" : "h-[18px] px-2.5 text-[11px] leading-none"
      }`}
    >
      {t(`kudos-board.tier.${tier}`)}
    </span>
  );
}
