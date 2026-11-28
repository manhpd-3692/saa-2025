/**
 * The F006 read contracts as Go answers them (technical-spec § 4.2, Codex R15).
 * `KudoCardData` is the one KudoCard DTO; consumers never add or rename fields.
 */

/** F008 hero tiers (BR-005); null when the Sunner has no badge yet. */
export type HeroTier = "New" | "Rising" | "Super" | "Legend";

export interface PersonCard {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** `units.code`, e.g. CECV2; null without a unit. */
  unitCode: string | null;
  heroTier: HeroTier | null;
}

export interface KudoCardData {
  id: string;
  createdAt: string;
  title: string;
  /** Sanitized HTML as stored by Go (F005 R20). */
  contentHtml: string;
  isAnonymous: boolean;
  /** Null when the sender is masked (BR-002); an admin gets the real sender. */
  sender: PersonCard | null;
  receiver: PersonCard;
  hashtags: string[];
  /** Go-signed URLs of opaque keys; null when a key could not be signed (INT-001). */
  images: { url: string | null }[];
  heart: { total: number; viewerHearted: boolean; viewerCanHeart: boolean };
  /** True only for the real sender viewing their own kudo. */
  isOwn: boolean;
  status: "public" | "spam";
}

/** List envelope: `nextCursor` is null on the last page and on Highlight. */
export interface KudoPage {
  items: KudoCardData[];
  nextCursor: string | null;
}

export interface FilterOptions {
  hashtags: { id: string; name: string }[];
  units: { id: string; name: string; code: string }[];
}

export interface HighlightFilter {
  hashtagId: string | null;
  unitId: string | null;
}

export interface SpotlightData {
  total: number;
  names: { userId: string; name: string; count: number }[];
  recent: { receiverId: string; receiverName: string; createdAt: string }[];
}

export interface BoardSidebarData {
  stats: {
    kudosReceived: number;
    kudosSent: number;
    heartsReceived: number;
    boxesOpened: number;
    boxesUnopened: number;
  };
  latestRecipients: { userId: string; name: string; avatarUrl: string | null; icon: string | null }[];
}

export interface HoverCardData {
  id: string;
  name: string;
  avatarUrl: string | null;
  unitCode: string | null;
  unitName: string | null;
  heroTier: HeroTier | null;
  receivedCount: number;
  sentCount: number;
  /** The card is the viewer's own: "Gửi KUDO" offers no recipient (no self-kudo, F005 BR-001). */
  isSelf: boolean;
}

/** A section's first-paint data from the server: the value, or a failure to retry (FR-403). */
export type SectionResult<T> = { data: T } | { error: true };
