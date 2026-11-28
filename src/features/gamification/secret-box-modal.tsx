"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CloseIcon } from "@/components/shell/shell-icons";
import { trapTabKey } from "@/features/kudo-compose/dialog-focus-trap";
import { fillText } from "@/features/kudos-board/kudo-board-format";
import { useLocale } from "@/i18n/locale-provider";
import { ICON_COUNT, SECRET_BOX_IMAGES } from "./gamification-config";
import { prefersReducedMotion, SecretBoxStage, type SecretBoxPicture } from "./secret-box-stage";
import { useOpenSecretBox } from "./use-open-secret-box";

const OPENING_MS = 900; // the shaking box stays at least this long (0 under reduced motion)
const COMPLETION_HOLD_MS = 2200; // the 6th icon is shown before the congratulation box
type GiftStep = "box" | "opening" | "revealed";
const motionMs = (ms: number) => (prefersReducedMotion() ? 0 : ms);
const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * F008 A5/A6 secret box window (Figma 1466:7069, 1466:7024, 2995:15708..15754,
 * standby frames; FR-205..FR-207, FR-404): "KHÁM PHÁ SECRET BOX CỦA BẠN", the box
 * to click, the unopened count; then the shaking box while Go opens one, and the
 * drawn icon rising out of it with the collection n/6. The open that completes
 * the set (BR-010) leads to the congratulation box and the full collection; the
 * prize itself is handed out at SAA 2025 (D010). Retry after a lost answer
 * reuses the Idempotency-Key (R12). `onClose(changed)` lets the page re-read counts.
 */
export function SecretBoxModal({ onClose }: { onClose: (changed: boolean) => void }) {
  const { t } = useLocale();
  const { state, load, open } = useOpenSecretBox();
  const { phase, summary, reveal } = state;
  const [giftStep, setGiftStep] = useState<GiftStep | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const giftTimer = useRef(0);
  const close = () => onClose(state.changed);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    for (const src of Object.values(SECRET_BOX_IMAGES)) new window.Image().src = src;
    return () => {
      document.body.style.overflow = overflow;
      window.clearTimeout(giftTimer.current);
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  useEffect(() => {
    if (!reveal?.completedNow) return;
    const timer = window.setTimeout(() => setGiftStep("box"), COMPLETION_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [reveal]);

  function openGift() {
    setGiftStep("opening");
    giftTimer.current = window.setTimeout(() => setGiftStep("revealed"), motionMs(OPENING_MS));
  }

  const unopened = summary?.unopened ?? 0;
  const canOpen = unopened > 0 && (phase === "ready" || phase === "open-error");
  const openBox = canOpen ? () => void open(motionMs(OPENING_MS)) : undefined;

  let picture: SecretBoxPicture;
  let hint: ReactNode = t("gamification.box.hint");
  if (giftStep) {
    picture = giftStep === "revealed" ? { kind: "completed", icons: summary?.collectedIcons ?? [] } : { kind: "closed", sparkle: true, shaking: giftStep === "opening" };
  } else if (phase === "loading") {
    picture = { kind: "message", children: <p className="text-base font-bold text-white">{t("common.loading")}</p> };
  } else if (phase === "load-error") {
    picture = {
      kind: "message",
      children: (
        <>
          <p role="alert" className="text-base font-bold text-white">{t("gamification.box.loadError")}</p>
          <button type="button" onClick={load} className="h-10 rounded-panel bg-primary px-6 text-base font-bold text-on-primary hover:bg-primary-hover">
            {t("gamification.box.retry")}
          </button>
        </>
      ),
    };
  } else if (phase === "opening") {
    picture = { kind: "closed", sparkle: false, shaking: true };
  } else if (reveal && phase === "ready") {
    picture = { kind: "revealed", icon: reveal.icon };
  } else {
    picture = { kind: "closed", sparkle: unopened > 0, dimmed: unopened === 0 };
  }
  if (!giftStep && phase === "open-error") {
    hint = <span role="alert">{t(state.retryable ? "gamification.box.openError" : "gamification.box.openRefused")}</span>;
  } else if (!giftStep && phase === "ready" && unopened === 0) {
    hint = t("gamification.box.empty");
  }

  const collected = summary?.collectedIcons.length ?? 0;
  const announcement = reveal
    ? `${fillText(t("gamification.box.revealed"), { icon: t(`gamification.icon.${reveal.icon}`) })}${
        reveal.repeat ? ` ${fillText(t("gamification.box.repeat"), { count: collected, total: ICON_COUNT })}` : ""
      }`
    : "";

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    trapTabKey(event, dialog.current);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-overlay" onClick={(event) => event.target === event.currentTarget && close()}>
      <div className="flex min-h-full justify-center py-[100px]" onClick={(event) => event.target === event.currentTarget && close()}>
        <div
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="secret-box-title"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          data-testid="secret-box-modal"
          data-phase={giftStep ? `gift-${giftStep}` : phase}
          className="relative h-fit w-[652px] rounded-xl bg-page outline-none"
        >
          <h2
            id="secret-box-title"
            className={`mx-auto text-center text-[26px] font-bold text-primary ${
              giftStep === "revealed"
                ? "max-w-[420px] pb-[37px] pt-[33px] leading-8"
                : giftStep
                  ? "max-w-[420px] pb-[37px] pt-[41px] leading-8"
                  : "h-[86px] whitespace-nowrap pt-[31px] leading-9"
            }`}
          >
            {giftStep ? t("gamification.box.congrats") : t("gamification.box.title")}
          </h2>
          <button type="button" onClick={close} aria-label={t("gamification.box.close")} className={`absolute right-3 ${giftStep && giftStep !== "revealed" ? "top-[33px]" : "top-[25px]"} flex size-12 items-center justify-center rounded-full text-white hover:bg-primary-soft`}>
            <CloseIcon size={24} />
          </button>
          <div className="mx-3 border-t border-divider" />
          {giftStep !== "revealed" && (
            <p className="mt-[22px] min-h-5 px-12 text-center text-sm font-bold leading-5 text-white" data-testid="secret-box-hint">{hint}</p>
          )}
          <div className={`relative ${giftStep === "revealed" ? "mt-6" : "mt-[23px]"}`}>
            <SecretBoxStage picture={picture} onOpen={giftStep === "box" ? openGift : openBox} openLabel={giftStep === "box" ? t("gamification.box.giftOpen") : undefined} />
            {phase === "open-error" && state.retryable && !giftStep && (
              <button type="button" onClick={openBox} className="absolute bottom-6 left-1/2 h-12 -translate-x-1/2 rounded-panel bg-primary px-8 text-base font-bold text-on-primary shadow-glow hover:bg-primary-hover">
                {t("gamification.box.retry")}
              </button>
            )}
          </div>
          {giftStep === "revealed" ? (
            <div className="px-12 pb-12 pt-[19px] text-center">
              <p className="text-[32px] font-bold leading-10 text-primary">{fillText(t("gamification.box.completedCaption"), { total: ICON_COUNT })}</p>
              <p className="mt-2 text-sm font-bold leading-5 text-white">{t("gamification.box.completedNote")}</p>
            </div>
          ) : giftStep ? (
            <div className="h-[57px]" />
          ) : (
            <div className="mx-3 mt-[22px] flex flex-col items-center border-t border-divider pb-[31px] pt-5 text-white" data-testid="secret-box-footer">
              <p className="flex items-center gap-2 text-sm font-bold leading-5">
                {t("gamification.box.unopened")}
                <span className="text-[30px] leading-10 text-primary" data-testid="secret-box-unopened">{pad2(unopened)}</span>
              </p>
              {reveal && (
                <p className="text-sm font-bold leading-5" data-testid="secret-box-collected">
                  {fillText(t("gamification.box.collected"), { count: collected, total: ICON_COUNT })}
                </p>
              )}
            </div>
          )}
          <p role="status" className="sr-only">{announcement}</p>
        </div>
      </div>
    </div>
  );
}
