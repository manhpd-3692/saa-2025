"use client";

import Image from "next/image";
import { useState } from "react";
import { iconImage, SECRET_BOX_ICONS, type SecretBoxIcon } from "@/features/gamification/gamification-config";
import { fillText } from "@/features/kudos-board/kudo-board-format";
import { useLocale } from "@/i18n/locale-provider";
import type { ProfileData } from "./profile-api";

/** 200 px photo in a 4 px white ring (Figma 362:5037); the name's first letter when there is none. */
function ProfileAvatar({ name, url }: { name: string; url: string | null }) {
  const { t } = useLocale();
  const [broken, setBroken] = useState<string | null>(null);
  const showPhoto = url !== null && url !== broken;
  return (
    <span className="flex size-[200px] shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-primary-border text-[80px] font-bold text-white">
      {showPhoto ? (
        <Image
          src={url}
          alt={fillText(t("profile.avatar"), { name })}
          width={192}
          height={192}
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setBroken(url)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

/**
 * The six icon slots in collection order (F008 BR-008): a collected icon shows
 * its artwork and name, a missing one an empty ring. The name is also the
 * slot's tooltip and accessible label (FR-201).
 */
function CollectedIcons({ icons }: { icons: SecretBoxIcon[] | null }) {
  const { t } = useLocale();
  const collected = new Set(icons ?? []);
  return (
    <ul data-testid="profile-icons" aria-label={t("profile.icons.label")} className="flex items-start gap-8">
      {SECRET_BOX_ICONS.map((icon) => {
        const has = collected.has(icon);
        const name = t(`gamification.icon.${icon}`);
        return (
          <li
            key={icon}
            data-icon={icon}
            data-collected={has}
            title={name}
            aria-label={fillText(t(has ? "profile.icons.collected" : "profile.icons.missing"), { icon: name })}
            className="flex w-16 flex-col items-center gap-1.5 text-center"
          >
            <span className="flex size-16 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-neutral-700/80">
              {has && <Image src={iconImage(icon)} alt="" width={64} height={64} className="size-full object-cover" />}
            </span>
            {has && (
              <span aria-hidden="true" className="w-20 text-xs font-bold uppercase leading-4 text-white">
                {name}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * R1 identity header shared by both profiles (FR-001, FR-002, FR-201): avatar,
 * name, unit code (`units.code`, Codex R15; the line keeps its height without
 * a unit) and the collected icons. No hero badge here (D006, Codex N10).
 */
export function ProfileHeader({ profile }: { profile: ProfileData }) {
  const { t } = useLocale();
  const { user, isOwner } = profile;
  return (
    <header data-testid="profile-header" className="flex flex-col items-center text-center">
      <ProfileAvatar name={user.name} url={user.avatarUrl} />
      <h1 className="mt-8 text-4xl font-bold leading-[44px] text-primary">{user.name}</h1>
      <p data-testid="profile-unit" className="mt-2 h-7 text-[22px] font-bold leading-7 text-white">
        {user.unitCode}
      </p>
      <div className="mt-8">
        <CollectedIcons icons={profile.collectedIcons} />
      </div>
      <p className="mt-8 text-[22px] font-bold leading-7 text-white">
        {isOwner ? t("profile.icons.own") : fillText(t("profile.icons.other"), { name: user.name })}
      </p>
    </header>
  );
}
