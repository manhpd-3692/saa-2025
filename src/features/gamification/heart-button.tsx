"use client";

import { useEffect, useState } from "react";
import { fillText, formatCount } from "@/features/kudos-board/kudo-board-format";
import type { KudoCardData } from "@/features/kudos-board/kudo-card-types";
import { HeartIcon } from "@/features/kudos-board/kudos-board-icons";
import { useLocale } from "@/i18n/locale-provider";
import { useActiveCampaign } from "./active-campaign-context";
import { setHeart } from "./gamification-api";
import { useHeartView } from "./use-heart-view";
import { runHeartToggle, withHeartClaim, type HeartErrorKey } from "./heart-toggle";

const ERROR_MS = 4000;

/**
 * F008 A1 heart control of a kudo card (FR-401, DEC-001): filled when the
 * viewer hearted, outline otherwise, disabled on the viewer's own kudo
 * (`viewerCanHeart` false; Go refuses it too, BR-002). A click shows the
 * change at once (the active campaign's weight, G08), sends PUT or DELETE and
 * then shows Go's weighted total; a refusal or failure puts the state back and
 * says why (DEC-002, R09). While a request for this kudo is in flight, clicks
 * on any of its cards wait (review W2).
 */
export function HeartButton({ kudoId, heart }: { kudoId: string; heart: KudoCardData["heart"] }) {
  const { locale, t } = useLocale();
  const campaign = useActiveCampaign();
  const { view, busy, set, revert, begin, end } = useHeartView(kudoId, { total: heart.total, viewerHearted: heart.viewerHearted });
  const [error, setError] = useState<HeartErrorKey | null>(null);
  const canHeart = heart.viewerCanHeart;

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), ERROR_MS);
    return () => window.clearTimeout(timer);
  }, [error]);

  async function toggle() {
    if (!canHeart) return;
    // One request per kudo across its cards (a double click must not send twice); always released.
    const result = await withHeartClaim({ begin, end }, () => {
      setError(null);
      return runHeartToggle(view, { weight: campaign?.multiplier ?? 1, send: (hearted) => setHeart(kudoId, hearted), show: set, revert });
    });
    if (result) setError(result.error);
  }

  const count = formatCount(view.total, locale);
  const label = fillText(t("gamification.heart.label"), { count });
  const filled = view.viewerHearted || !canHeart;
  return (
    <span className="relative inline-flex" data-slot="heart" data-kudo-id={kudoId}>
      <button
        type="button"
        data-testid="heart-button"
        data-hearted={view.viewerHearted}
        aria-pressed={canHeart ? view.viewerHearted : undefined}
        aria-busy={busy}
        aria-label={canHeart ? `${t("gamification.heart.give")} (${label})` : `${label}. ${t("gamification.heart.ownKudo")}`}
        title={canHeart ? undefined : t("gamification.heart.ownKudo")}
        disabled={!canHeart}
        onClick={toggle}
        className="group flex items-center gap-1 rounded-control text-2xl font-bold leading-8 text-on-primary outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary-border disabled:cursor-not-allowed"
      >
        <span data-testid="heart-count">{count}</span>
        <HeartIcon
          size={32}
          fill={filled ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={filled ? 0 : 2}
          className={`transition-transform motion-reduce:transition-none ${canHeart ? "text-danger group-hover:scale-110" : "text-compose-muted"}`}
        />
      </button>
      {error && (
        <span role="alert" className="absolute bottom-full left-0 z-20 mb-2 w-max max-w-[320px] rounded-panel bg-menu px-3 py-2 text-sm font-bold leading-5 text-white shadow-lg">
          {t(`gamification.heart.error.${error}`)}
        </span>
      )}
    </span>
  );
}
