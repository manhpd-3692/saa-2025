"use client";

import Link from "next/link";
import { useLocale } from "@/i18n/locale-provider";
import type { KudoCardData, PersonCard } from "./kudo-card-types";
import { HeroBadgeSlot } from "./hero-badge-slot";
import { IncognitoIcon, SendArrowIcon } from "./kudos-board-icons";
import { profilePath } from "./kudos-board-api";
import { SunnerAvatarHover } from "./sunner-avatar-hover";

/** A named Sunner: hover avatar, profile link, unit code • hero badge slot (FR-002, FR-103). */
function PersonBlock({ person, marker }: { person: PersonCard; marker?: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <SunnerAvatarHover person={person} />
      <Link
        href={profilePath(person.id)}
        className="max-w-full truncate text-base font-bold leading-6 text-on-primary hover:underline"
        data-testid="person-name"
      >
        {person.name}
      </Link>
      <div className="flex items-center gap-2 text-sm font-bold leading-5 text-compose-muted">
        {person.unitCode && <span>{person.unitCode}</span>}
        {person.unitCode && person.heroTier && <span aria-hidden="true">•</span>}
        <HeroBadgeSlot tier={person.heroTier} />
      </div>
      {marker && <span className="text-xs font-bold text-compose-muted">({marker})</span>}
    </div>
  );
}

/**
 * DEC-002 masked sender: placeholder avatar and "Ẩn danh", no profile link and
 * no hover card. Nothing about the real sender reaches the browser (R01).
 */
function AnonymousSender() {
  const { t } = useLocale();
  return (
    <div className="flex flex-col items-center gap-2 text-center" data-testid="anonymous-sender">
      <span className="flex size-16 items-center justify-center rounded-full border-2 border-white bg-compose-muted/40 text-on-primary">
        <IncognitoIcon size={40} />
      </span>
      <span className="text-[22px] font-bold leading-7 text-on-primary">{t("kudos-board.card.anonymous")}</span>
      <span className="text-sm font-bold leading-5 text-compose-muted">{t("kudos-board.card.anonymousHint")}</span>
    </div>
  );
}

/**
 * Sender → receiver row of a kudo card. An admin receives the real sender of
 * an anonymous kudo (G04) and sees it with a "sent anonymously" marker.
 */
export function KudoCardPeople({ card }: { card: KudoCardData }) {
  const { t } = useLocale();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2">
      {card.sender ? (
        <PersonBlock person={card.sender} marker={card.isAnonymous ? t("kudos-board.card.anonymousAdmin") : undefined} />
      ) : (
        <AnonymousSender />
      )}
      <span className="mt-4 text-on-primary">
        <SendArrowIcon size={32} />
        <span className="sr-only">{t("kudos-board.card.sentTo")}</span>
      </span>
      <PersonBlock person={card.receiver} />
    </div>
  );
}
