"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/i18n/locale-provider";

/** Section header of the board (Figma): kicker, rule, big gold title, optional right-side controls. */
export function BoardSectionHeading({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  const { t } = useLocale();
  return (
    <header>
      <p className="text-2xl font-bold leading-8 text-white">{t("kudos-board.kicker")}</p>
      <div className="mt-4 flex items-end justify-between border-t border-divider pt-4">
        <h2 id={id} className="text-[57px] font-bold leading-[64px] text-primary">
          {title}
        </h2>
        {children}
      </div>
    </header>
  );
}

/** FR-403 loading state of one section: a pulsing placeholder, announced politely. */
export function SectionLoading({ className = "" }: { className?: string }) {
  const { t } = useLocale();
  return (
    <div role="status" aria-label={t("common.loading")} className={`animate-pulse rounded-3xl bg-primary-soft ${className}`} />
  );
}

/** FR-403 error state of one section with Retry; the rest of the page keeps working. */
export function SectionError({ onRetry, className = "" }: { onRetry: () => void; className?: string }) {
  const { t } = useLocale();
  return (
    <div role="alert" className={`flex flex-col items-center justify-center gap-4 rounded-3xl border border-primary-border bg-menu p-8 ${className}`}>
      <p className="text-base font-bold text-white">{t("kudos-board.section.error")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="h-12 rounded-panel bg-primary px-6 text-base font-bold text-on-primary hover:bg-primary-hover"
      >
        {t("common.retry")}
      </button>
    </div>
  );
}

/** Empty state message of one section, with an optional action. */
export function SectionEmpty({ message, children, className = "" }: { message: string; children?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 rounded-3xl border border-primary-border bg-menu p-8 text-center ${className}`}>
      <p className="text-base font-bold text-white">{message}</p>
      {children}
    </div>
  );
}
