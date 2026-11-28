import Image from "next/image";
import { KeyVisualBackdrop } from "@/components/key-visual-backdrop";
import { loadTranslator } from "@/i18n/load-translator";
import type { Locale } from "@/i18n/locale-config";
import { pickLocalized } from "@/i18n/localized-text";
import { AWARDS } from "./award-catalog";
import { AwardDetailCard } from "./award-detail-card";
import { AwardsMenu } from "./awards-menu";
import { SunKudosPromoBlock } from "./sun-kudos-promo-block";

/**
 * F004 A3 Awards Information (Figma 313:8436), cached per locale (`use cache`,
 * tech spec § 5.3 #2): static catalog and copy, no Go call. Key visual with
 * "ROOT FURTHER" and the title (FR-301), then the sticky menu (FR-302) beside
 * the six award cards in catalog order (BR-001), then the Kudos block (FR-305).
 * Below 1440 px the card text column narrows; under 1280 px the page scrolls
 * sideways (R17).
 */
export async function AwardsPageContent({ locale }: { locale: Locale }) {
  "use cache";
  const t = await loadTranslator(locale, "awards", "home");
  const menuItems = AWARDS.map((award) => ({ slug: award.slug, label: pickLocalized(award.menuLabel, locale) }));

  return (
    <>
      <section className="relative h-[547px]">
        <KeyVisualBackdrop visual="awards" />
        <div className="relative flex h-full flex-col px-36">
          <Image
            src="/images/login/root-further.png"
            alt={t("home.keyVisual")}
            width={342}
            height={153}
            preload
            className="mt-[103px] h-[153px] w-[342px]"
          />
          <div className="mt-auto pb-[46px] text-center">
            <p className="text-2xl font-bold leading-8">{t("awards.page.kicker")}</p>
            <hr className="mt-5 border-divider" />
            <h1 className="mt-4 text-[57px] font-bold leading-[64px] text-primary">{t("awards.page.title")}</h1>
          </div>
        </div>
      </section>

      <div className="flex justify-between gap-10 px-36 pt-[76px]">
        <AwardsMenu items={menuItems} label={t("awards.menu.label")} />
        <div className="w-[856px] min-w-0">
          {AWARDS.map((award, index) => (
            <div key={award.slug} className="border-b border-divider py-20 first:pt-0 last:border-b-0 last:pb-0">
              <AwardDetailCard award={award} index={index} locale={locale} t={t} />
            </div>
          ))}
        </div>
      </div>

      <div className="px-36 pb-[110px] pt-[120px]">
        <SunKudosPromoBlock t={t} />
      </div>
    </>
  );
}
