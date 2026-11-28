import Image from "next/image";
import type { Translate } from "@/i18n/load-translator";

const PARAGRAPH = "text-justify text-2xl font-bold leading-8";

/**
 * F004 FR-205 "Root Further" theme text (Figma 5001:14827 B4_content): the
 * logo at about 2/3 size, three paragraphs, the quoted proverb with its source,
 * then two closing paragraphs. Vietnamese master copy (no English supplied).
 */
export function HomeAboutSection({ t }: { t: Translate }) {
  return (
    <section aria-label={t("home.keyVisual")} className="mx-auto mt-[103px] flex max-w-[1152px] flex-col items-center">
      <Image src="/images/login/root-further.png" alt="" width={293} height={131} className="h-[131px] w-[293px]" />
      <div data-testid="home-about" className="mt-[35px] w-full">
        <p className={PARAGRAPH}>{t("home.about.p1")}</p>
        <p className={PARAGRAPH}>{t("home.about.p2")}</p>
        <p className={PARAGRAPH}>{t("home.about.p3")}</p>
        <figure className="mt-8 text-center font-bold">
          <blockquote className="text-2xl leading-8">{t("home.about.quote")}</blockquote>
          <figcaption className="text-xl leading-8">{t("home.about.quoteSource")}</figcaption>
        </figure>
        <p className={`mt-[34px] ${PARAGRAPH}`}>{t("home.about.p4")}</p>
        <p className={PARAGRAPH}>{t("home.about.p5")}</p>
      </div>
    </section>
  );
}
