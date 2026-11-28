import { fillText } from "@/features/kudos-board/kudo-board-format";
import type { NotificationItem } from "./notifications-api";

/** Type icon of a row and of the detail window (FR-202, Figma 589:9132). */
export type NotificationIcon = "mail" | "heart" | "gift" | "star" | "warning" | "badge";

/** Where the notice leads (FR-103): its action button, or the Secret Box flow (DEC-002). */
export type NotificationTarget =
  | { type: "kudo"; href: string | null; available: boolean }
  | { type: "profile"; href: "/profile" }
  | { type: "secretBox" }
  | { type: "none" };

export interface NotificationMessage {
  icon: NotificationIcon;
  /** Heading of the detail window. */
  title: string;
  /** The message, one entry per line, shown in the row and in the detail window. */
  lines: string[];
  /** Extra lines only the detail window shows (the full message, FR-206). */
  detailLines: string[];
  /** Inline "Tiêu chuẩn cộng đồng" link of the spam warning (X06). */
  standardsLink: { label: string; href: string } | null;
  target: NotificationTarget;
  /** Label of the detail window's action button; null when the notice has no target. */
  actionLabel: string | null;
}

type Translate = (key: string) => string;

const COMMUNITY_STANDARDS_HREF = "/community-standards";
const PROFILE_TARGET = { type: "profile", href: "/profile" } as const;

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/** Tier name from `notifications.tier.*`; a key the dictionary does not know shows as is. */
function tierName(t: Translate, levelKey: unknown): string {
  const key = String(levelKey ?? "");
  const name = t(`notifications.tier.${key}`);
  return name === `notifications.tier.${key}` ? key : name;
}

function kudoTarget(item: NotificationItem): NotificationTarget {
  const href = item.kudoId ? `/kudos/${encodeURIComponent(item.kudoId)}` : null;
  return { type: "kudo", href, available: href !== null && item.kudoAvailable };
}

/**
 * The one mapping from `kind` + `params` to text, icon and target, shared by the
 * panel row and the detail window (DRY, FR-004). Sender fields are read only
 * when present: Go removes them for a kudo that is anonymous now (BR-007), so a
 * notice without them names nobody. Unknown kinds render as a generic notice.
 */
export function buildNotificationMessage(item: NotificationItem, t: Translate): NotificationMessage {
  const base = { detailLines: [], standardsLink: null };
  const viewKudo = { target: kudoTarget(item), actionLabel: t("notifications.action.viewKudo") };
  const viewProfile = { target: PROFILE_TARGET, actionLabel: t("notifications.action.viewProfile") };
  const { params } = item;

  switch (item.kind) {
    case "kudo_received": {
      const name = text(params.senderName);
      const line = name ? fillText(t("notifications.kudoReceived.named"), { name }) : t("notifications.kudoReceived.anonymous");
      return { ...base, ...viewKudo, icon: "mail", title: t("notifications.kudoReceived.title"), lines: [line] };
    }
    case "heart_received": {
      const name = text(params.receiverName);
      const line = name ? fillText(t("notifications.heartReceived.named"), { name }) : t("notifications.heartReceived.unnamed");
      return { ...base, ...viewKudo, icon: "heart", title: t("notifications.heartReceived.title"), lines: [line] };
    }
    case "secret_box_received":
      return {
        ...base,
        icon: "gift",
        title: t("notifications.secretBox.title"),
        lines: [t("notifications.secretBox.message")],
        target: { type: "secretBox" },
        actionLabel: t("notifications.action.openSecretBox"),
      };
    case "hero_level_up": {
      const level = tierName(t, params.levelKey);
      const count = typeof params.sendersCount === "number" ? params.sendersCount : 0;
      const from = text(params.fromLevelKey);
      return {
        ...base,
        ...viewProfile,
        icon: "star",
        title: t("notifications.heroLevelUp.title"),
        lines: [fillText(t("notifications.heroLevelUp.message"), { count, level }), t("notifications.heroLevelUp.encourage")],
        detailLines: from ? [fillText(t("notifications.heroLevelUp.transition"), { from: tierName(t, from), to: level })] : [],
      };
    }
    case "kudo_spam_warning":
      return {
        ...base,
        ...viewKudo,
        icon: "warning",
        title: t("notifications.spamWarning.title"),
        lines: [t("notifications.spamWarning.message")],
        standardsLink: { label: t("notifications.standardsLink"), href: COMMUNITY_STANDARDS_HREF },
      };
    case "icons_completed":
      return {
        ...base,
        ...viewProfile,
        icon: "badge",
        title: t("notifications.iconsCompleted.title"),
        lines: [t("notifications.iconsCompleted.message")],
      };
    default:
      // `generic` (D007) keeps its one text in every language (tech-spec 5.3 #5).
      return {
        ...base,
        icon: "mail",
        title: t("notifications.generic.title"),
        lines: [text(params.message) ?? t("notifications.generic.fallback")],
        target: { type: "none" },
        actionLabel: null,
      };
  }
}
