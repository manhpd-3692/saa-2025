"use client";

import { CampaignBadge } from "@/features/gamification/campaign-badge";
import { HeartButton } from "@/features/gamification/heart-button";
import type { KudoCardData } from "./kudo-card-types";

/**
 * FR-211 heart place on a card: F008's heart control (A1) with the weighted
 * total (G08, the same number used for the Highlight ranking), and the
 * campaign badge beside it while a heart campaign runs (D013).
 */
export function HeartSlot({ kudoId, heart }: { kudoId: string; heart: KudoCardData["heart"] }) {
  return (
    <span className="flex items-center gap-2">
      <HeartButton kudoId={kudoId} heart={heart} />
      <CampaignBadge size={28} placement="above" />
    </span>
  );
}
