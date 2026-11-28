"use client";

import { HeroBadge } from "@/features/gamification/hero-badge";
import type { HeroTier } from "./kudo-card-types";

/**
 * FR-211 hero badge place next to a Sunner (cards, hover card): F008's badge
 * artwork and tier overlay (A4, D011). Nothing shows without a tier (DEC-003).
 */
export function HeroBadgeSlot({ tier, size = "sm" }: { tier: HeroTier | null; size?: "sm" | "lg" }) {
  return <HeroBadge tier={tier} size={size} />;
}
