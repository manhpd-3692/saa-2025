import type { HeroTier } from "@/features/kudos-board/kudo-card-types";

/**
 * F008 configuration (technical-spec § 4.6): the frontend copy of the Go
 * constants in backend/internal/gamification, which stay authoritative —
 * tiers, box grants and draws are always decided by the server (FR-603).
 */
export const HEARTS_PER_BOX = 5; // BR-006
export const ICON_COUNT = 6; // BR-010 completion threshold

/** BR-005: New 1–4, Rising 5–9, Super 10–20, Legend more than 20 distinct senders (max null). */
export const HERO_TIERS: readonly { tier: HeroTier; min: number; max: number | null }[] = [
  { tier: "New", min: 1, max: 4 },
  { tier: "Rising", min: 5, max: 9 },
  { tier: "Super", min: 10, max: 20 },
  { tier: "Legend", min: 21, max: null },
];

/** `{min}`, `{max}` and `{over}` ("more than {over}") for a tier's sender-range copy. */
export function tierRangeValues(tier: HeroTier): Record<string, number> {
  const range = HERO_TIERS.find((t) => t.tier === tier) ?? HERO_TIERS[0];
  return { min: range.min, max: range.max ?? range.min, over: range.min - 1 };
}

/** BR-008: the six icons, in the enum order Go lists collected icons in. */
export const SECRET_BOX_ICONS = [
  "REVIVAL",
  "TOUCH_OF_LIGHT",
  "STAY_GOLD",
  "FLOW_TO_HORIZON",
  "BEYOND_THE_BOUNDARY",
  "ROOT_FURTHER",
] as const;
export type SecretBoxIcon = (typeof SECRET_BOX_ICONS)[number];

export function isSecretBoxIcon(value: unknown): value is SecretBoxIcon {
  return typeof value === "string" && (SECRET_BOX_ICONS as readonly string[]).includes(value);
}

/** Hover / focus rest before a badge overlay opens (BADGE_HOVER_DELAY_MS), as the avatar card. */
export const BADGE_HOVER_DELAY_MS = 300;

const ASSETS = "/images/gamification";

/** Icon artwork cropped from the Figma Thể lệ panel; `large` is the 184 px reveal size. */
export const iconImage = (icon: SecretBoxIcon, size: "small" | "large" = "small") =>
  `${ASSETS}/icon-${icon.toLowerCase().replaceAll("_", "-")}${size === "large" ? "-large" : ""}.png`;

/** Badge artwork of each tier (Figma hover frames 3241:14991..15003, 222 x 43 px). */
export const heroBadgeImage = (tier: HeroTier) => `${ASSETS}/hero-badge-${tier.toLowerCase()}.png`;

export const SECRET_BOX_IMAGES = {
  closedSparkle: `${ASSETS}/secret-box-closed-sparkle.webp`,
  closed: `${ASSETS}/secret-box-closed.webp`,
  opened: `${ASSETS}/secret-box-opened.webp`,
} as const;
