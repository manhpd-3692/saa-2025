"use client";

import Image from "next/image";
import { fillText } from "@/features/kudos-board/kudo-board-format";
import type { HeroTier } from "@/features/kudos-board/kudo-card-types";
import { useLocale } from "@/i18n/locale-provider";
import { heroBadgeImage } from "./gamification-config";
import { HERO_BADGE_SIZES, type HeroBadgeSize } from "./hero-badge-art";
import { HeroBadgeHover } from "./hero-badge-hover";
import { useHoverPopover } from "./use-hover-popover";

/**
 * F008 A4 hero badge next to a Sunner (FR-002, FR-203, DEC-003): the tier
 * comes from the card DTO, computed by Go on every read; no tier, no badge.
 * Hover or keyboard focus opens the tier's overlay (Figma 3241:14991..15003).
 */
export function HeroBadge({ tier, size = "sm" }: { tier: HeroTier | null; size?: HeroBadgeSize }) {
  const { t } = useLocale();
  const { id, open, wrapper } = useHoverPopover();
  if (!tier) return null;
  const { width, height } = HERO_BADGE_SIZES[size];
  return (
    <span className="relative inline-flex shrink-0" {...wrapper}>
      <button
        type="button"
        data-slot="hero-badge"
        data-tier={tier}
        aria-label={fillText(t("gamification.badge.label"), { tier: t(`gamification.tier.${tier}`) })}
        aria-describedby={open ? id : undefined}
        className="inline-flex cursor-default rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary-border"
      >
        <Image src={heroBadgeImage(tier)} alt="" width={width} height={height} style={{ width, height }} />
      </button>
      {open && <HeroBadgeHover id={id} tier={tier} />}
    </span>
  );
}
