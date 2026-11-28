"use client";

import { fillText } from "@/features/kudos-board/kudo-board-format";
import type { HeroTier } from "@/features/kudos-board/kudo-card-types";
import { useLocale } from "@/i18n/locale-provider";
import { tierRangeValues } from "./gamification-config";
import { HeroBadgeArt } from "./hero-badge-art";

/**
 * Hover overlay of a hero badge (FR-203; Figma New 3241:14991, Rising 3241:14995,
 * Super 3241:14999, Legend 3241:15003): 304 px dark card with the badge, the
 * sender range from the shared thresholds (BR-005) and the tier's line, copied
 * from the design.
 */
export function HeroBadgeHover({ id, tier }: { id: string; tier: HeroTier }) {
  const { t } = useLocale();
  return (
    <span className="absolute left-1/2 top-full z-30 -translate-x-1/2 pt-2">
      <span
        id={id}
        role="tooltip"
        data-testid="hero-badge-hover"
        className="block w-[304px] rounded-2xl bg-menu pb-4 pl-4 pr-3 pt-4 text-left shadow-[0_8px_24px_rgb(0_0_0/0.45)]"
      >
        <HeroBadgeArt tier={tier} size="hover" />
        <span className="mt-2.5 block text-sm font-bold leading-5 text-white">
          {fillText(t(`gamification.badge.${tier}.range`), tierRangeValues(tier))}
        </span>
        <span className="block text-base font-bold leading-6 text-compose-muted">{t(`gamification.badge.${tier}.description`)}</span>
      </span>
    </span>
  );
}
