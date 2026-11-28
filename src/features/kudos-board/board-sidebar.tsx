"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useShellActions } from "@/components/shell/shell-actions-context";
import { CampaignBadge } from "@/features/gamification/campaign-badge";
import { SunnerAvatar } from "@/features/kudo-compose/compose-field-parts";
import { useLocale } from "@/i18n/locale-provider";
import { SectionError, SectionLoading } from "./board-section-parts";
import { fillText, formatCount } from "./kudo-board-format";
import type { BoardSidebarData, SectionResult } from "./kudo-card-types";
import { fetchSidebar, profilePath } from "./kudos-board-api";
import { GiftIcon } from "./kudos-board-icons";
import { useBoardSection } from "./use-board-section";

const BOX = "rounded-2xl border border-primary-border bg-menu p-6";

function StatRow({ label, value, badge }: { label: string; value: string; badge?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-1 text-[22px] font-bold leading-7 text-white">
        {label}
        {badge}
      </dt>
      <dd className="text-[32px] font-bold leading-10 text-primary">{value}</dd>
    </div>
  );
}

/**
 * A6 sidebar (FR-208..FR-210): the viewer's own numbers (hearts = weighted
 * total, with F008's campaign badge while a heart campaign runs), "Mở Secret
 * Box", which opens F008's secret box window (FR-102; with no box left the
 * window shows its empty state, FR-207), and the 10 Sunners who most recently
 * opened a box, each linking to the profile.
 */
export function BoardSidebar({ initial }: { initial: SectionResult<BoardSidebarData> }) {
  const { locale, t } = useLocale();
  const shell = useShellActions();
  const { data, status, retry } = useBoardSection({ key: "sidebar", initialKey: "sidebar", initial, load: fetchSidebar });
  if (status === "loading") return <SectionLoading className="h-[640px]" />;
  if (status === "error" || !data) return <SectionError onRetry={retry} className="h-[400px]" />;
  const { stats, latestRecipients } = data;
  const n = (value: number) => formatCount(value, locale);

  return (
    <div className="flex flex-col gap-6" data-testid="board-sidebar">
      <section aria-label={t("kudos-board.sidebar.label")} className={BOX}>
        {/* Row rhythm of Figma 2940:13431 (56 px rows, 406 px box): with it, the gift list heading
            sits above the FAB at 1440 x 1024 when ALL KUDOS scrolls into view. */}
        <dl className="flex flex-col gap-4">
          <StatRow label={t("kudos-board.sidebar.received")} value={n(stats.kudosReceived)} />
          <StatRow label={t("kudos-board.sidebar.sent")} value={n(stats.kudosSent)} />
          <StatRow label={t("kudos-board.sidebar.hearts")} value={n(stats.heartsReceived)} badge={<CampaignBadge />} />
        </dl>
        <dl className="mt-4 flex flex-col gap-4 border-t border-divider pt-4">
          <StatRow label={t("kudos-board.sidebar.boxesOpened")} value={n(stats.boxesOpened)} />
          <StatRow label={t("kudos-board.sidebar.boxesUnopened")} value={n(stats.boxesUnopened)} />
        </dl>
        <button
          type="button"
          data-testid="open-secret-box"
          onClick={() => shell?.runAction("secretBox")}
          className="mt-4 flex h-[60px] w-full items-center justify-center gap-2 rounded-panel bg-primary text-[22px] font-bold text-on-primary hover:bg-primary-hover"
        >
          {t("kudos-board.sidebar.openBox")}
          <GiftIcon size={24} />
        </button>
      </section>
      <section aria-labelledby="gift-recipients-title" className={BOX}>
        <h3 id="gift-recipients-title" className="mx-auto max-w-[280px] text-center text-[22px] font-bold leading-7 text-primary">
          {t("kudos-board.sidebar.recipientsTitle")}
        </h3>
        {latestRecipients.length === 0 ? (
          <p className="mt-6 text-center text-base font-bold text-white">{t("kudos-board.sidebar.recipientsEmpty")}</p>
        ) : (
          // pr-[88px]: row text ends by x 1184 at 1440 px, clear of the FAB lane (x 1191+), as the Figma rows
          // do (names truncate). A long icon name wraps to two lines (76 px rows), so 444 px still shows five.
          <ul className="mt-4 flex max-h-[444px] flex-col gap-4 overflow-y-auto pr-[88px]" data-testid="gift-recipients">
            {latestRecipients.map((r) => (
              <li key={r.userId}>
                <Link href={profilePath(r.userId)} className="flex items-center gap-2 rounded-panel hover:bg-primary-soft">
                  <SunnerAvatar name={r.name} url={r.avatarUrl} size={64} />
                  <span className="min-w-0">
                    <span className="block truncate text-[22px] font-bold leading-7 text-primary">{r.name}</span>
                    {r.icon && (
                      <span className="block text-base font-bold leading-6 text-white">
                        {fillText(t("kudos-board.sidebar.gift"), { icon: t(`kudos-board.icon.${r.icon}`) })}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
