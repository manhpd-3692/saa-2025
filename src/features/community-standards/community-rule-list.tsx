import Image from "next/image";
import { KeyVisualBackdrop } from "@/components/key-visual-backdrop";
import { loadTranslator } from "@/i18n/load-translator";
import type { Locale } from "@/i18n/locale-config";
import { pickLocalized, type LocalizedText } from "@/i18n/localized-text";
import { COMMUNITY_STANDARDS } from "./community-rules-content";

const BODY = "text-base font-bold tracking-[0.15px]";

/**
 * F004 A6 Community Standards (Figma 1161:8944), cached per locale (`use
 * cache`): key visual with "ROOT FURTHER", the ten numbered content rules
 * (FR-351) and the security standards (FR-352). Static copy, no data read.
 * The art is laid out from the left edge, like the logo it sits under.
 */
export async function CommunityRuleList({ locale }: { locale: Locale }) {
  "use cache";
  const t = await loadTranslator(locale, "standards", "home");
  const text = (value: LocalizedText) => pickLocalized(value, locale);
  const { lead, rulesIntro, rules, security } = COMMUNITY_STANDARDS;

  return (
    <div className="relative px-36 pb-[72px]">
      <KeyVisualBackdrop visual="communityStandards" align="left" />
      <Image
        src="/images/login/root-further.png"
        alt={t("home.keyVisual")}
        width={454}
        height={203}
        preload
        className="relative mt-[103px]"
      />
      <section aria-labelledby="community-standards-title" className="relative mx-4 mt-[135px] max-w-[1080px]">
        <h1 id="community-standards-title" className="text-[45px] font-bold leading-[52px] text-primary">
          {t("standards.title")}
        </h1>
        <p className={`mt-5 leading-6 text-primary ${BODY}`}>{text(lead)}</p>
        <p className={`leading-6 ${BODY}`}>{text(rulesIntro)}</p>
        <ol data-testid="community-rules" className={`mt-[30px] list-decimal pl-[34px] leading-[30px] ${BODY}`}>
          {rules.map((rule) => (
            <li key={rule.vi}>{text(rule)}</li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="security-standards-title" className="relative mx-4 mt-11 border-t border-divider pt-8">
        <h2 id="security-standards-title" className="text-[45px] font-bold leading-[52px] text-primary">
          {t("standards.security.title")}
        </h2>
        <p className={`mt-[19px] max-w-[1080px] leading-[30px] ${BODY}`}>{text(security.intro)}</p>
        <ul className={`max-w-[1080px] list-disc pl-[25px] leading-[30px] ${BODY}`}>
          {security.points.map((point) => (
            <li key={point.vi}>{text(point)}</li>
          ))}
        </ul>
        <p className={`mt-[15px] leading-6 text-primary ${BODY}`}>{text(security.contact)}</p>
      </section>
    </div>
  );
}
