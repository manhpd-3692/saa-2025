"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { fillText } from "@/features/kudos-board/kudo-board-format";
import { HeartIcon } from "@/features/kudos-board/kudos-board-icons";
import { useLocale } from "@/i18n/locale-provider";
import { HEARTS_PER_BOX, HERO_TIERS, ICON_COUNT, iconImage, SECRET_BOX_ICONS, tierRangeValues } from "./gamification-config";
import { HeroBadgeArt } from "./hero-badge-art";

/** Thể lệ panel copy blocks (Figma 3204:6051), text kept as in the design (Codex N10); measured at 1440 px. */
const HEADING = "text-[22px] font-bold leading-7 text-primary";
const BODY = "text-justify text-base font-bold leading-6 tracking-[0.5px] text-white";

/** The red heart inside the copy; `beforePunctuation` drops the space before a following comma. */
function InlineHeart({ beforePunctuation = false }: { beforePunctuation?: boolean }) {
  const { t } = useLocale();
  return (
    <span className={`${beforePunctuation ? "ml-1" : "mx-1"} inline-flex align-[-3px] text-danger`} role="img" aria-label={t("gamification.rules.heart")}>
      <HeartIcon size={18} />
    </span>
  );
}

function Section({ title, children, className = "mt-6" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h3 className={HEADING}>{title}</h3>
      {children}
    </section>
  );
}

/** NGƯỜI NHẬN KUDOS: the four tiers from the shared thresholds (BR-005, FR-201). */
export function ReceiverRules() {
  const { t } = useLocale();
  return (
    <Section title={t("gamification.rules.receiver.title")}>
      <p className={`mt-4 ${BODY}`}>{t("gamification.rules.receiver.body")}</p>
      <ul className="mt-4 flex flex-col gap-5 pl-5" data-testid="rules-tiers">
        {HERO_TIERS.map(({ tier }) => (
          <li key={tier}>
            <div className="flex items-center gap-2">
              <HeroBadgeArt tier={tier} size="md" />
              <span className="text-base font-bold leading-6 text-white">
                {fillText(t(`gamification.rules.tier.${tier}.range`), tierRangeValues(tier))}
              </span>
            </div>
            <p className="mt-1 text-sm font-bold leading-5 text-white">{t(`gamification.badge.${tier}.description`)}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** NGƯỜI GỬI KUDOS: 5 hearts per box (BR-006), the six icons (BR-008) and the prize for all six. */
export function SenderRules() {
  const { t } = useLocale();
  return (
    <Section title={t("gamification.rules.sender.title")}>
      <p className={`mt-4 ${BODY}`}>
        {t("gamification.rules.sender.bodyStart")}
        <InlineHeart />
        {fillText(t("gamification.rules.sender.bodyMiddle"), { hearts: HEARTS_PER_BOX })}
        <InlineHeart beforePunctuation />
        {fillText(t("gamification.rules.sender.bodyEnd"), { icons: ICON_COUNT })}
      </p>
      <ul className="mx-auto mt-10 grid w-[444px] grid-cols-3 gap-y-4" data-testid="rules-icons">
        {SECRET_BOX_ICONS.map((icon) => (
          <li key={icon} className="flex flex-col items-center gap-2 text-center">
            <Image src={iconImage(icon)} alt="" width={64} height={64} className="rounded-full" />
            <span className="max-w-[100px] text-xs font-bold uppercase leading-4 tracking-[0.5px] text-white">{t(`gamification.icon.${icon}`)}</span>
          </li>
        ))}
      </ul>
      <p className={`mt-4 ${BODY}`}>{fillText(t("gamification.rules.sender.prize"), { icons: ICON_COUNT })}</p>
    </Section>
  );
}

/** KUDOS QUỐC DÂN: the 5 most-hearted kudos (BR-009), shown as the unfiltered Highlight. */
export function NationalKudosRules() {
  const { t } = useLocale();
  return (
    <Section title={t("gamification.rules.national.title")} className="mt-5">
      <p className={`mt-4 ${BODY}`}>
        {t("gamification.rules.national.bodyStart")}
        <InlineHeart />
        {t("gamification.rules.national.bodyEnd")}
      </p>
    </Section>
  );
}
