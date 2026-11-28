"use client";

import { useId } from "react";
import { fillText } from "@/features/kudos-board/kudo-board-format";
import { useLocale } from "@/i18n/locale-provider";
import { useActiveCampaign } from "./active-campaign-context";
import type { ActiveCampaign } from "./gamification-api";
import { useHoverPopover } from "./use-hover-popover";

const EVENT_TIME_ZONE = "Asia/Ho_Chi_Minh";

/** Orange flame with the multiplier (Figma 3241:15021), drawn so any multiplier 2–10 fits. */
export function CampaignFlame({ multiplier, size }: { multiplier: number; size: number }) {
  const gradient = `campaign-flame-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg width={size} height={size * 1.0625} viewBox="0 0 64 68" aria-hidden="true" focusable="false" className="shrink-0">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc93c" />
          <stop offset="1" stopColor="#ff9a1f" />
        </linearGradient>
      </defs>
      <path
        d="M32 2c4 9 13 12 14 23 3-5 5-9 5-13 7 9 11 20 11 31 0 14-13 24-30 24S2 57 2 43c0-11 5-19 11-25 0 6 2 10 6 12C17 19 24 9 32 2z"
        fill={`url(#${gradient})`}
      />
      <path d="M32 26c5 8 14 12 14 24 0 9-6 15-14 15s-14-6-14-15c0-12 9-16 14-24z" fill="#ff7a00" />
      <text
        x="32"
        y="60"
        textAnchor="middle"
        fontSize={multiplier >= 10 ? 21 : 26}
        fontWeight={800}
        fill="#fff"
        stroke="#3b2a17"
        strokeWidth={3}
        paintOrder="stroke"
      >
        x{multiplier}
      </text>
    </svg>
  );
}

function formatMoment(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: EVENT_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23", day: "2-digit", month: "2-digit" })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return { time: `${parts.hour}:${parts.minute}`, date: `${parts.day}/${parts.month}` };
}

/** FR-204 period line: "Từ HH:mm ngày dd/MM đến HH:mm ngày dd/MM, tất cả tim … nhân đôi." */
export function campaignPeriodText(campaign: ActiveCampaign, t: (key: string) => string): string {
  const start = formatMoment(campaign.startsAt);
  const end = formatMoment(campaign.endsAt);
  const factorKey = `gamification.campaign.factor.${campaign.multiplier}`;
  const factor = t(factorKey) === factorKey ? fillText(t("gamification.campaign.factor.other"), { multiplier: campaign.multiplier }) : t(factorKey);
  return fillText(t("gamification.campaign.period"), {
    startTime: start.time,
    startDate: start.date,
    endTime: end.time,
    endDate: end.date,
    factor,
  });
}

/** Where the overlay opens: below the badge (sidebar) or above it (card footer, inside the card). */
const OVERLAY_PLACEMENT = {
  below: "left-1/2 top-full -translate-x-1/2 pt-2",
  above: "bottom-full left-0 pb-2",
} as const;

/**
 * F008 A3 campaign badge (FR-204, US004, D013): while a heart campaign runs,
 * the flame sits next to the heart control of every kudo card (D013) and next
 * to the viewer's heart total in the Live board sidebar (Figma 2940:13431);
 * hover or focus shows the campaign name, its multiplier and its window
 * (Figma 3241:15021). Nothing renders without a campaign or when its read failed.
 */
export function CampaignBadge({ size = 32, placement = "below" }: { size?: number; placement?: keyof typeof OVERLAY_PLACEMENT }) {
  const { t } = useLocale();
  const campaign = useActiveCampaign();
  const { id, open, wrapper } = useHoverPopover();
  if (!campaign) return null;
  return (
    <span className="relative inline-flex" data-testid="campaign-badge" {...wrapper}>
      <button
        type="button"
        aria-label={fillText(t("gamification.campaign.label"), { name: campaign.name, multiplier: campaign.multiplier })}
        aria-describedby={open ? id : undefined}
        className="inline-flex cursor-default rounded-control outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary-border"
      >
        <CampaignFlame multiplier={campaign.multiplier} size={size} />
      </button>
      {open && (
        <span className={`absolute z-30 ${OVERLAY_PLACEMENT[placement]}`}>
          <span
            id={id}
            role="tooltip"
            data-testid="campaign-hover"
            className="flex w-[368px] items-start gap-2 rounded-2xl bg-menu py-2.5 pl-1 pr-3 text-left shadow-[0_8px_24px_rgb(0_0_0/0.45)]"
          >
            <CampaignFlame multiplier={campaign.multiplier} size={68} />
            <span className="min-w-0 pt-0.5 text-base font-bold leading-6">
              <span className="block text-white">{campaign.name}</span>
              <span className="block text-compose-muted">{campaignPeriodText(campaign, t)}</span>
            </span>
          </span>
        </span>
      )}
    </span>
  );
}
