"use client";

import Link from "next/link";
import { SunnerAvatar } from "@/features/kudo-compose/compose-field-parts";
import { useLocale } from "@/i18n/locale-provider";
import { SectionError, SectionLoading } from "./board-section-parts";
import { fillText, formatCount } from "./kudo-board-format";
import type { BoardSidebarData, SectionResult } from "./kudo-card-types";
import { fetchSidebar, profilePath } from "./kudos-board-api";
import { GiftIcon } from "./kudos-board-icons";
import { useBoardSection } from "./use-board-section";

const BOX = "rounded-2xl border border-primary-border bg-menu p-6";

function StatRow({ label, value, slot }: { label: string; value: string; slot?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-1 text-[22px] font-bold leading-7 text-white">
        {label}
        {slot && <span data-slot={slot} />}
      </dt>
      <dd className="text-[32px] font-bold leading-10 text-primary">{value}</dd>
    </div>
  );
}

/**
 * A6 sidebar (FR-208..FR-210): the viewer's own numbers (hearts = weighted
 * total), the "Mở Secret Box" button slot that F008 wires in phase 8
 * (disabled without an unopened box), and the 10 Sunners who most recently
 * opened a box, each linking to the profile.
 */
export function BoardSidebar({ initial }: { initial: SectionResult<BoardSidebarData> }) {
  const { locale, t } = useLocale();
  const { data, status, retry } = useBoardSection({ key: "sidebar", initialKey: "sidebar", initial, load: fetchSidebar });
  if (status === "loading") return <SectionLoading className="h-[640px]" />;
  if (status === "error" || !data) return <SectionError onRetry={retry} className="h-[400px]" />;
  const { stats, latestRecipients } = data;
  const n = (value: number) => formatCount(value, locale);

  return (
    <div className="flex flex-col gap-6" data-testid="board-sidebar">
      <section aria-label={t("kudos-board.sidebar.label")} className={BOX}>
        <dl className="flex flex-col gap-6">
          <StatRow label={t("kudos-board.sidebar.received")} value={n(stats.kudosReceived)} />
          <StatRow label={t("kudos-board.sidebar.sent")} value={n(stats.kudosSent)} />
          <StatRow label={t("kudos-board.sidebar.hearts")} value={n(stats.heartsReceived)} slot="campaign-badge" />
        </dl>
        <dl className="mt-6 flex flex-col gap-6 border-t border-divider pt-6">
          <StatRow label={t("kudos-board.sidebar.boxesOpened")} value={n(stats.boxesOpened)} />
          <StatRow label={t("kudos-board.sidebar.boxesUnopened")} value={n(stats.boxesUnopened)} />
        </dl>
        <button
          type="button"
          data-slot="secret-box-button"
          disabled={stats.boxesUnopened === 0}
          className="mt-6 flex h-[60px] w-full items-center justify-center gap-2 rounded-panel bg-primary text-[22px] font-bold text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
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
          <ul className="mt-4 flex max-h-[400px] flex-col gap-4 overflow-y-auto pr-2" data-testid="gift-recipients">
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
