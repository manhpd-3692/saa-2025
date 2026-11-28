"use client";

import { PencilIcon } from "@/components/shell/shell-icons";
import { useShellActions } from "@/components/shell/shell-actions-context";
import { useLocale } from "@/i18n/locale-provider";
import { formatCount } from "./kudo-board-format";
import type { HoverCardData } from "./kudo-card-types";
import { HeroBadgeSlot } from "./hero-badge-slot";

/**
 * Avatar info card (Figma 2268:35101): name, unit, hero badge slot, public
 * kudos received / sent, and "Gửi KUDO", which opens the write-kudo window
 * with this Sunner preselected as the recipient (not on the viewer's own card).
 */
export function SunnerHoverCard({ card, failed }: { card: HoverCardData | null; failed: boolean }) {
  const { locale, t } = useLocale();
  const actions = useShellActions();
  if (failed) return <p className="text-sm font-bold text-white">{t("kudos-board.hover.error")}</p>;
  if (!card) {
    return (
      <p role="status" className="text-sm font-bold text-compose-muted">
        {t("common.loading")}
      </p>
    );
  }
  const row = "flex items-center gap-2 text-base font-bold leading-6 text-white";
  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex flex-col gap-1">
        <p className="text-[22px] font-bold leading-7 text-primary">{card.name}</p>
        {card.unitName && (
          <p className="text-sm font-bold leading-5 text-compose-muted">
            {t("kudos-board.hover.unit")} {card.unitName}
            {card.unitCode ? ` (${card.unitCode})` : ""}
          </p>
        )}
        <div className="mt-2">
          <HeroBadgeSlot tier={card.heroTier} size="lg" />
        </div>
      </div>
      <div className="flex flex-col gap-4 border-t border-divider pt-4">
        <p className={row}>
          {t("kudos-board.hover.received")} <span className="text-primary">{formatCount(card.receivedCount, locale)}</span>
        </p>
        <p className={row}>
          {t("kudos-board.hover.sent")} <span className="text-primary">{formatCount(card.sentCount, locale)}</span>
        </p>
      </div>
      <button
        type="button"
        data-testid="hover-card-send"
        onClick={() =>
          actions?.runAction(
            "compose",
            card.isSelf ? undefined : { receiver: { id: card.id, name: card.name, avatarUrl: card.avatarUrl, unitCode: card.unitCode } },
          )
        }
        className="flex h-12 items-center justify-center gap-2 rounded-panel bg-primary text-base font-bold text-on-primary hover:bg-primary-hover"
      >
        <PencilIcon size={20} />
        {t("kudos-board.hover.send")}
      </button>
    </div>
  );
}
