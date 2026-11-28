import Link from "next/link";
import type { Translate } from "@/i18n/load-translator";
import type { Locale } from "@/i18n/locale-config";
import { pickLocalized } from "@/i18n/localized-text";
import type { Award } from "./award-catalog";
import { ArrowUpRightIcon } from "./award-icons";
import { AwardImage } from "./award-image";

/**
 * Homepage award card (FR-206, Figma 2167:9026 C2.x): framed artwork, gold
 * name, one-line summary and "Chi tiết", which opens the award's own card on
 * the Awards page (`/awards#<slug>`, FR-102). Prizes live on the Awards page.
 */
export function AwardSummaryCard({ award, locale, t }: { award: Award; locale: Locale; t: Translate }) {
  const name = pickLocalized(award.name, locale);
  return (
    <article data-award={award.slug} className="flex flex-col">
      <AwardImage src={award.image} name={name} unavailableLabel={t("awards.image.unavailable")} />
      <h3 className="mt-6 text-2xl leading-8 text-primary">{name}</h3>
      <p className="mt-1 text-base leading-6 tracking-[0.5px]">{pickLocalized(award.summary, locale)}</p>
      <Link
        href={`/awards#${award.slug}`}
        aria-label={`${t("awards.detail")}: ${name}`}
        className="mt-5 inline-flex w-fit items-center gap-1 text-base font-medium leading-6 hover:text-primary"
      >
        {t("awards.detail")}
        <ArrowUpRightIcon size={20} />
      </Link>
    </article>
  );
}
