"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { CloseIcon, PencilIcon } from "@/components/shell/shell-icons";
import { trapTabKey } from "@/features/kudo-compose/dialog-focus-trap";
import { useLocale } from "@/i18n/locale-provider";
import { NationalKudosRules, ReceiverRules, SenderRules } from "./rules-panel-sections";

/**
 * F008 A8 Thể lệ side panel (Figma 3204:6051, FR-101, FR-201, FR-202): a
 * 553 px drawer over the right edge of the page. The three rule blocks scroll;
 * "Đóng" and "Viết KUDOS" stay pinned at its foot, so both are in view at
 * 1440 x 1024 (the Figma frame is 1410 px tall). Esc and the backdrop close it
 * too; focus moves into the panel, stays there, and returns to the opener.
 */
export function RulesPanel({ onClose, onWrite }: { onClose: () => void; onWrite: () => void }) {
  const { t } = useLocale();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    trapTabKey(event, panel.current);
  }

  return (
    <div className="fixed inset-0 z-50 bg-overlay" onClick={(event) => event.target === event.currentTarget && onClose()} data-testid="rules-backdrop">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-panel-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        data-testid="rules-panel"
        className="absolute inset-y-0 right-0 flex w-[553px] flex-col bg-menu outline-none"
      >
        {/* Focusable so the keyboard can scroll it: it holds only text (WCAG 2.1.1). */}
        <div tabIndex={0} role="region" aria-labelledby="rules-panel-title" className="min-h-0 flex-1 overflow-y-auto px-10 pb-[35px] pt-6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-border" data-testid="rules-body">
          <h2 id="rules-panel-title" className="text-[45px] font-bold leading-[52px] text-primary">
            {t("gamification.rules.title")}
          </h2>
          <ReceiverRules />
          <SenderRules />
          <NationalKudosRules />
        </div>
        <div className="flex shrink-0 gap-4 px-10 pb-10 pt-4" data-testid="rules-actions">
          <button
            type="button"
            onClick={onClose}
            className="flex h-14 w-[94px] shrink-0 items-center justify-center gap-2 rounded-control border border-primary-border bg-primary-soft text-lg font-bold text-white hover:bg-primary-muted"
          >
            <CloseIcon size={24} />
            {t("gamification.rules.close")}
          </button>
          <button
            type="button"
            onClick={onWrite}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-control bg-primary text-lg font-bold text-on-primary hover:bg-primary-hover"
          >
            <PencilIcon size={24} />
            {t("gamification.rules.write")}
          </button>
        </div>
      </div>
    </div>
  );
}
