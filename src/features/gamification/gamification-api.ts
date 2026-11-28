import { goApiBrowser } from "@/lib/api/go-api-browser";
import type { SecretBoxIcon } from "./gamification-config";

/** F008 Go endpoints (technical-spec § 2): hearts (A1), campaign badge (A3), secret boxes (A5, A6). */
export const GAMIFICATION_PATHS = {
  heart: (kudoId: string) => `/api/v1/kudos/${encodeURIComponent(kudoId)}/heart`,
  activeCampaign: "/api/v1/campaigns/active",
  secretBoxes: "/api/v1/me/secret-boxes",
  openSecretBox: "/api/v1/me/secret-boxes/open",
} as const;

/** A1 answer: the weighted total (G08) and the viewer's heart after the change. */
export interface HeartState {
  heartTotal: number;
  viewerHearted: boolean;
}

/** A3: the active campaign with the highest multiplier (2–10, G14); null when none runs. */
export interface ActiveCampaign {
  name: string;
  multiplier: number;
  startsAt: string;
  endsAt: string;
}

/** A5: the caller's current inventory (R11: `completed` = icon set completed once). */
export interface SecretBoxSummary {
  unopened: number;
  opened: number;
  collectedIcons: SecretBoxIcon[];
  totalIcons: number;
  completed: boolean;
}

/** A6 answer, stored by Go and replayed verbatim for the same Idempotency-Key (R12, N12). */
export interface OpenResult {
  boxId: string;
  icon: SecretBoxIcon;
  summary: { unopened: number; opened: number; distinctIcons: SecretBoxIcon[] };
}

/** Idempotent setter (BR-001): PUT gives the heart, DELETE withdraws it; never a blind toggle. */
export const setHeart = (kudoId: string, hearted: boolean) =>
  goApiBrowser<HeartState>(GAMIFICATION_PATHS.heart(kudoId), { method: hearted ? "PUT" : "DELETE" });

export const fetchActiveCampaign = () => goApiBrowser<ActiveCampaign | null>(GAMIFICATION_PATHS.activeCampaign);

export const fetchSecretBoxSummary = () => goApiBrowser<SecretBoxSummary>(GAMIFICATION_PATHS.secretBoxes);

/** One opening intent: the same key on every retry of it (R12). The server picks the box (BR-007). */
export const openSecretBox = (idempotencyKey: string) =>
  goApiBrowser<OpenResult>(GAMIFICATION_PATHS.openSecretBox, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
  });
