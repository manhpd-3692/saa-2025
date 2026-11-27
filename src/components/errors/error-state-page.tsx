import Link from "next/link";
import type { CSSProperties } from "react";
import { getRequestTranslator } from "@/i18n/get-request-translator";

/**
 * Shared body of the 403 and 404 pages (Figma 2182:9291, 1378:5063), rendered
 * inside `MinimalChrome`. The artwork (background plus illustration, a 1438 × 917
 * crop) is painted at its natural size from the top of the chrome, so the
 * text below lands where the frame has it at any desktop width. Its edges fade
 * into the page colour beyond the crop.
 */
const ART_LAYER_STYLE = (src: string): CSSProperties => ({
  backgroundImage: `url(${src})`,
  maskImage:
    "linear-gradient(to bottom, #000 80%, transparent), linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
  maskComposite: "intersect",
});

export async function ErrorStatePage({
  titleKey,
  messageKey,
  artSrc,
  testId,
}: {
  titleKey: string;
  messageKey: string;
  artSrc: string;
  testId: string;
}) {
  const { t } = await getRequestTranslator("errors");
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[917px] w-[1438px] -translate-x-1/2 bg-no-repeat"
        style={ART_LAYER_STYLE(artSrc)}
      />
      <section data-testid={testId} className="relative flex flex-col items-center pb-10 pt-[46px] text-center">
        <h1 className="text-[56px] font-bold leading-[68px]">{t(titleKey)}</h1>
        {/* The illustration is part of the artwork layer; keep its 541 px band clear (title top 5 px lower, message position unchanged). */}
        <div aria-hidden="true" className="h-[541px]" />
        <p className="max-w-[580px] text-2xl font-bold leading-8">{t(messageKey)}</p>
        <Link
          href="/"
          className="mt-8 flex h-14 items-center rounded-panel bg-primary px-6 text-lg font-bold text-on-primary hover:bg-primary-hover"
        >
          {t("errors.backHome")}
        </Link>
      </section>
    </>
  );
}
