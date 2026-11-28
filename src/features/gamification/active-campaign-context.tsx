"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchActiveCampaign, type ActiveCampaign } from "./gamification-api";

const ActiveCampaignContext = createContext<ActiveCampaign | null>(null);
const MAX_TIMER_MS = 2_147_483_647; // setTimeout's upper bound

/**
 * A3 for the pages that show hearts: reads GET /api/v1/campaigns/active once
 * from the browser and drops the campaign when its window ends. No campaign
 * and a failed read both leave the value null, which only hides the campaign
 * badge (Codex R09): every heart still gets its weight from Go's own lookup
 * inside the heart transaction.
 */
export function ActiveCampaignProvider({ children }: { children: ReactNode }) {
  const [campaign, setCampaign] = useState<ActiveCampaign | null>(null);
  useEffect(() => {
    let live = true;
    let timer = 0;
    fetchActiveCampaign().then(
      (value) => {
        const left = value ? Date.parse(value.endsAt) - Date.now() : 0;
        if (!live || !value || left <= 0) return;
        setCampaign(value);
        timer = window.setTimeout(() => setCampaign(null), Math.min(left, MAX_TIMER_MS));
      },
      (error: unknown) => console.warn("campaign badge hidden: active campaign read failed", error),
    );
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, []);
  return <ActiveCampaignContext value={campaign}>{children}</ActiveCampaignContext>;
}

/** The running campaign, or null (none, ended, failed read, or outside the provider). */
export function useActiveCampaign(): ActiveCampaign | null {
  return useContext(ActiveCampaignContext);
}
