import { AWARDS } from "@/features/awards/award-catalog";
import { AwardSummaryCard } from "@/features/awards/award-summary-card";
import type { Translate } from "@/i18n/load-translator";
import type { Locale } from "@/i18n/locale-config";

/**
 * F004 FR-206 award system on the Homepage (Figma C1/C2): heading, then the six
 * catalog awards (BR-001) in a 3 × 2 grid of cards up to 336 px wide that
 * spread across the content width and narrow below 1440 px.
 */
export function HomeAwardsSection({ locale, t }: { locale: Locale; t: Translate }) {
  return (
    <section aria-labelledby="home-awards-title" className="mt-[100px]">
      <p className="text-2xl font-bold leading-8">{t("home.awards.kicker")}</p>
      <hr className="mt-4 border-divider" />
      <h2 id="home-awards-title" className="mt-4 text-[57px] font-bold leading-[64px] text-primary">
        {t("home.awards.title")}
      </h2>
      <div className="mt-20 grid grid-cols-[repeat(3,minmax(0,336px))] justify-between gap-x-10 gap-y-24">
        {AWARDS.map((award) => (
          <AwardSummaryCard key={award.slug} award={award} locale={locale} t={t} />
        ))}
      </div>
    </section>
  );
}
