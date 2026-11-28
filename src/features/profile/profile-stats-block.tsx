"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";
import { useShellActions } from "@/components/shell/shell-actions-context";
import { formatCount } from "@/features/kudos-board/kudo-board-format";
import { GiftIcon } from "@/features/kudos-board/kudos-board-icons";
import { useLocale } from "@/i18n/locale-provider";
import type { ProfileCounts } from "./profile-api";

const BOX = "w-full rounded-2xl border border-primary-border bg-menu p-10";

function StatRow({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[22px] font-bold leading-7 text-white">{label}</dt>
      <dd data-testid={`profile-stat-${id}`} className="text-[32px] font-bold leading-10 text-primary">
        {value}
      </dd>
    </div>
  );
}

/** "Mở Secret Box" opens F008's window (FR-203); disabled with no unopened box (DEC-002, D009). */
function OpenSecretBoxButton({ unopened }: { unopened: number }) {
  const { t } = useLocale();
  const shell = useShellActions();
  const hintId = useId();
  const empty = unopened === 0;
  return (
    <>
      <button
        type="button"
        data-testid="profile-open-box"
        disabled={empty}
        aria-describedby={empty ? hintId : undefined}
        onClick={() => shell?.runAction("secretBox")}
        className="mt-4 flex h-[60px] w-full items-center justify-center gap-2 rounded-panel bg-primary text-[22px] font-bold text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
      >
        {t("profile.stats.openBox")}
        <GiftIcon size={24} />
      </button>
      {empty && (
        <p id={hintId} className="sr-only">
          {t("profile.stats.noBox")}
        </p>
      )}
    </>
  );
}

/**
 * R2 counts block (FR-202, FR-301): kudos received, kudos sent and the
 * weighted hearts received for everyone; the owner also gets boxes opened and
 * unopened with "Mở Secret Box" (BR-004). Counts Go could not read show a
 * message with Retry (Codex R15); the shell re-renders this after the secret
 * box window changed something (FR-404).
 */
export function ProfileStatsBlock({ counts, isOwner }: { counts: ProfileCounts | null; isOwner: boolean }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const who = isOwner ? "own" : "other";
  const n = (value: number | undefined) => formatCount(value ?? 0, locale);

  if (!counts) {
    return (
      <section aria-label={t("profile.stats.label")} data-testid="profile-stats" className={`${BOX} flex flex-col items-center gap-4`}>
        <p role="alert" className="text-base font-bold text-white">
          {t("profile.stats.unavailable")}
        </p>
        <button type="button" onClick={() => router.refresh()} className="h-12 rounded-panel bg-primary px-6 text-base font-bold text-on-primary hover:bg-primary-hover">
          {t("common.retry")}
        </button>
      </section>
    );
  }

  return (
    <section aria-label={t("profile.stats.label")} data-testid="profile-stats" className={BOX}>
      <dl className="flex flex-col gap-4">
        <StatRow id="kudosReceived" label={t(`profile.stats.${who}.received`)} value={n(counts.kudosReceived)} />
        <StatRow id="kudosSent" label={t(`profile.stats.${who}.sent`)} value={n(counts.kudosSent)} />
        <StatRow id="heartsReceived" label={t(`profile.stats.${who}.hearts`)} value={n(counts.heartsReceived)} />
      </dl>
      {isOwner && (
        <>
          <dl className="mt-4 flex flex-col gap-4 border-t border-divider pt-4">
            <StatRow id="boxesOpened" label={t("profile.stats.boxesOpened")} value={n(counts.boxesOpened)} />
            <StatRow id="boxesUnopened" label={t("profile.stats.boxesUnopened")} value={n(counts.boxesUnopened)} />
          </dl>
          <OpenSecretBoxButton unopened={counts.boxesUnopened ?? 0} />
        </>
      )}
    </section>
  );
}
