"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { KUDOS_BOARD_PATH } from "@/features/awards/sun-kudos-promo-block";
import { trapTabKey } from "@/features/kudo-compose/dialog-focus-trap";
import { SpamKudoFrame } from "@/features/moderation/spam-alert-overlay";
import { useLocale } from "@/i18n/locale-provider";
import { fillText } from "./kudo-board-format";
import { KudoCard } from "./kudo-card";
import type { KudoCardData, SectionResult } from "./kudo-card-types";

const CLOSE = "flex h-10 items-center rounded-control px-4 text-base font-bold text-on-primary hover:bg-primary/40";

/** The read failed (not a 404): message, Retry (re-renders from the server) and Đóng. */
function DetailError({ closeControl }: { closeControl: ReactNode }) {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <div role="alert" className="flex w-[680px] flex-col items-center gap-6 rounded-3xl bg-compose p-10 text-on-primary">
      <p className="text-base font-bold">{t("kudos-board.section.error")}</p>
      <div className="flex gap-4">
        <button type="button" onClick={() => router.refresh()} className="h-10 rounded-panel bg-primary px-6 text-base font-bold hover:bg-primary-hover">
          {t("common.retry")}
        </button>
        {closeControl}
      </div>
    </div>
  );
}

/**
 * A7 View Kudo (Figma 520:18779, FR-404): the enlarged card with Copy Link and
 * "Đóng". Opened from the board it is a modal over the board (intercepted
 * route): Đóng, Esc or the backdrop go back, so the reader lands where they
 * were (FR-102) and focus returns to the control they used. Opened from a
 * link it is a page whose Đóng opens the board.
 */
export function KudoDetailOverlay({ result, mode }: { result: SectionResult<KudoCardData>; mode: "overlay" | "page" }) {
  const { t } = useLocale();
  const router = useRouter();
  const dialog = useRef<HTMLDivElement>(null);
  const card = "data" in result ? result.data : null;

  useEffect(() => {
    if (mode !== "overlay") return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [mode]);

  const close = () => router.back();
  const closeControl =
    mode === "page" ? (
      <Link href={KUDOS_BOARD_PATH} className={CLOSE}>
        {t("kudos-board.detail.close")}
      </Link>
    ) : (
      <button type="button" onClick={close} className={CLOSE}>
        {t("kudos-board.detail.close")}
      </button>
    );
  // F011 DEC-003: a Spam kudo (author and admins only) carries the Spam badge; its author also gets the alert.
  const content = card ? (
    <SpamKudoFrame status={card.status} isOwn={card.isOwn}>
      <KudoCard card={card} variant="detail" actions={closeControl} />
    </SpamKudoFrame>
  ) : (
    <DetailError closeControl={closeControl} />
  );

  if (mode === "page") {
    return (
      <div className="flex justify-center px-36 pb-24" data-testid="kudo-detail-page">
        {content}
      </div>
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    trapTabKey(event, dialog.current);
  }
  function onBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) close();
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-overlay" onClick={onBackdrop} data-testid="kudo-detail-overlay">
      <div className="flex min-h-full justify-center px-4 py-[79px]" onClick={onBackdrop}>
        <div
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-label={card ? fillText(t("kudos-board.detail.label"), { title: card.title }) : t("kudos-board.section.error")}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="h-fit outline-none"
        >
          {content}
        </div>
      </div>
    </div>
  );
}
