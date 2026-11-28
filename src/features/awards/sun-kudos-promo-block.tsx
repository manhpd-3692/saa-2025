import Link from "next/link";
import type { Translate } from "@/i18n/load-translator";
import { ArrowUpRightIcon } from "./award-icons";

/** Destination of every Kudos call to action: the live board (F006). */
export const KUDOS_BOARD_PATH = "/kudos";

/**
 * Sun* Kudos teaser shared by the Homepage and the Awards page (FR-207,
 * FR-305; Figma D1_Sunkudos 3390:10349 / 335:12023): static copy (D005) on a
 * 500 px panel whose right side carries the KUDOS artwork (a crop of the
 * reference with the copy painted out), and a "Chi tiết" button to the board.
 * The artwork is pinned right, so a narrower panel only trims plain dark edge.
 */
export function SunKudosPromoBlock({ t, className = "" }: { t: Translate; className?: string }) {
  return (
    <section
      aria-labelledby="sun-kudos-title"
      className={`h-[500px] overflow-hidden rounded-2xl bg-[#0f0f0f] bg-[url(/images/awards/sun-kudos-promo-background.webp)] bg-[length:auto_100%] bg-right bg-no-repeat px-16 pt-[46px] ${className}`}
    >
      <div className="w-[456px]">
        <p className="text-2xl font-bold leading-8">{t("awards.kudos.kicker")}</p>
        <h2 id="sun-kudos-title" className="mt-[14px] text-[57px] font-bold leading-[64px] text-primary">
          {t("awards.kudos.title")}
        </h2>
        <p className="mt-[18px] text-justify text-base font-bold leading-6 tracking-[0.4px]">
          <span className="block text-left">{t("awards.kudos.badge")}</span>
          {t("awards.kudos.body")}
        </p>
        <Link
          href={KUDOS_BOARD_PATH}
          aria-label={`${t("awards.detail")}: ${t("awards.kudos.title")}`}
          className="mt-8 inline-flex h-14 items-center gap-2 rounded-control bg-primary px-4 text-base font-bold text-on-primary hover:bg-primary-hover"
        >
          {t("awards.detail")}
          <ArrowUpRightIcon />
        </Link>
      </div>
    </section>
  );
}
