"use client";

import { useLocale } from "@/i18n/locale-provider";
import { fillText, formatCount } from "./kudo-board-format";
import type { KudoCardData } from "./kudo-card-types";
import { HeartIcon } from "./kudos-board-icons";

/**
 * FR-211 heart place on a card: the weighted total (G08, the same number used
 * for the Highlight ranking) with a heart. F008 (phase 8) swaps in its heart
 * button here; until then it only displays the count.
 */
export function HeartSlot({ kudoId, heart }: { kudoId: string; heart: KudoCardData["heart"] }) {
  const { locale, t } = useLocale();
  return (
    <span
      data-slot="heart"
      data-kudo-id={kudoId}
      data-testid="heart-count"
      role="img"
      aria-label={fillText(t("kudos-board.card.hearts"), { count: formatCount(heart.total, locale) })}
      className="flex items-center gap-1 text-2xl font-bold leading-8 text-on-primary"
    >
      <span aria-hidden="true">{formatCount(heart.total, locale)}</span>
      <HeartIcon size={32} className="text-danger" />
    </span>
  );
}
