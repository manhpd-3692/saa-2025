import type { Translate } from "@/i18n/load-translator";
import type { Locale } from "@/i18n/locale-config";
import { pickLocalized } from "@/i18n/localized-text";
import type { Award } from "./award-catalog";
import { AwardTargetIcon } from "./award-icons";
import { AwardImage } from "./award-image";
import { AwardPrizeDetails } from "./award-prize-details";

/**
 * Award card of the Awards page (FR-303, Figma 313:8436 D.x): 336 px artwork
 * beside a 480 px text column with the title, description, quantity and prize
 * value(s). Cards alternate sides, artwork first on odd rows as in the design.
 * The card's id is the award slug, so `/awards#<slug>` lands on it (FR-102);
 * `scroll-mt-24` keeps it clear of the 80 px sticky header; it takes
 * focus (not tabbable) after a menu pick.
 */
export function AwardDetailCard({
  award,
  index,
  locale,
  t,
}: {
  award: Award;
  index: number;
  locale: Locale;
  t: Translate;
}) {
  const name = pickLocalized(award.name, locale);
  return (
    <article
      id={award.slug}
      aria-labelledby={`${award.slug}-title`}
      data-award={award.slug}
      tabIndex={-1}
      className={`flex scroll-mt-24 outline-none items-start justify-between gap-10 ${index % 2 === 1 ? "flex-row-reverse" : ""}`}
    >
      <AwardImage
        src={award.image}
        name={name}
        unavailableLabel={t("awards.image.unavailable")}
        className="w-[336px] shrink-0"
      />
      <div className="min-w-0 max-w-[480px] flex-1">
        <h2 id={`${award.slug}-title`} className="flex items-center gap-4 text-2xl font-bold leading-8 text-primary">
          <AwardTargetIcon className="shrink-0 text-white" />
          {name}
        </h2>
        <p className="mt-6 whitespace-pre-line text-justify text-base font-bold leading-6 tracking-[0.5px]">
          {pickLocalized(award.description, locale)}
        </p>
        <AwardPrizeDetails award={award} t={t} />
      </div>
    </article>
  );
}
