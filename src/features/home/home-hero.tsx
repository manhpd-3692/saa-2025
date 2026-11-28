import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "@/features/awards/award-icons";
import { KUDOS_BOARD_PATH } from "@/features/awards/sun-kudos-promo-block";
import type { Translate } from "@/i18n/load-translator";

const CTA = "flex h-[60px] items-center gap-2 rounded-panel px-6 text-[22px] font-bold leading-7";

/**
 * F004 FR-201 / FR-204 hero of the Homepage (Figma 2167:9030 "Bia"): the
 * "ROOT FURTHER" key visual as the page heading, the event panel (countdown
 * and event info, passed in so it can stream), then "ABOUT AWARDS" (Awards
 * page, top) and "ABOUT KUDOS" (Kudos board).
 */
export function HomeHero({ t, eventPanel }: { t: Translate; eventPanel: ReactNode }) {
  return (
    <section aria-labelledby="home-title" className="flex flex-col items-start">
      <h1 id="home-title" className="mt-[103px]">
        <Image src="/images/login/root-further.png" alt={t("home.keyVisual")} width={454} height={203} preload />
      </h1>
      <div className="mt-[39px]">{eventPanel}</div>
      <div className="mt-[33px] flex gap-10">
        <Link href="/awards" className={`${CTA} bg-primary text-on-primary hover:bg-primary-hover`}>
          {t("home.cta.awards")}
          <ArrowUpRightIcon />
        </Link>
        <Link
          href={KUDOS_BOARD_PATH}
          className={`${CTA} border border-primary-border bg-primary-soft text-white hover:bg-primary-muted`}
        >
          {t("home.cta.kudos")}
          <ArrowUpRightIcon />
        </Link>
      </div>
    </section>
  );
}
