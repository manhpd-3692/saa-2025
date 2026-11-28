"use client";

import Image from "next/image";
import { fillText } from "@/features/kudos-board/kudo-board-format";
import type { HeroTier } from "@/features/kudos-board/kudo-card-types";
import { useLocale } from "@/i18n/locale-provider";
import { heroBadgeImage } from "./gamification-config";

/** Rendered sizes of the 222 x 43 badge artwork: card (Figma kudo card), rules panel, hover card, overlay. */
export const HERO_BADGE_SIZES = {
  sm: { width: 110, height: 21 },
  md: { width: 127, height: 24 },
  lg: { width: 166, height: 32 },
  hover: { width: 222, height: 43 },
} as const;
export type HeroBadgeSize = keyof typeof HERO_BADGE_SIZES;

/** The tier's badge artwork alone (Thể lệ panel, inside the hover overlay). */
export function HeroBadgeArt({ tier, size }: { tier: HeroTier; size: HeroBadgeSize }) {
  const { t } = useLocale();
  const { width, height } = HERO_BADGE_SIZES[size];
  return (
    <Image
      src={heroBadgeImage(tier)}
      alt={fillText(t("gamification.badge.label"), { tier: t(`gamification.tier.${tier}`) })}
      width={width}
      height={height}
      className="shrink-0"
      style={{ width, height }}
    />
  );
}
