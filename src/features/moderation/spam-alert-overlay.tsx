"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { CloseIcon } from "@/components/shell/shell-icons";
import { trapTabKey } from "@/features/kudo-compose/dialog-focus-trap";
import { useLocale } from "@/i18n/locale-provider";
import { AlertSignIcon } from "./moderation-icons";

/** F004 Community Standards page the alert points to (FR-402). */
const STANDARDS_PATH = "/community-standards";

/** An Escape typed in an open menu or list belongs to that control, not to the alert. */
const inOtherPopup = (target: EventTarget | null) =>
  target instanceof Element && target.closest('[role="menu"], [role="listbox"]') !== null;

/**
 * Author-facing alert over their own Spam kudo (Figma "Alert Overlay"
 * 3127:24672, FR-401, FR-402; SCR-kudo-spam-alert § 4, § 9): the card blurred
 * behind a grey wash, the large warning sign and "Cảnh báo vi phạm tiêu chuẩn
 * cộng đồng" with the standards link. An alert dialog labelled by its heading:
 * focus moves to its close control on open and stays inside while it is open
 * (Tab wraps); × or Escape closes it and focus goes back to where it was (or
 * to the card). Inside the View Kudo modal the first Escape closes only the
 * alert. Not remembered: it shows again on every open while Spam (D005).
 * `onClose` unmounts it (the frame owns the open state).
 */
export function SpamAlertOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const ids = useId();
  const root = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    const back = returnTo.current;
    const fallback = root.current?.parentElement ?? null; // the Spam frame (tabIndex -1)
    onClose();
    (back && back.isConnected && back !== document.body ? back : fallback)?.focus();
  }, [onClose]);

  useEffect(() => {
    // After the parent's own mount focus (the View Kudo modal focuses itself in its effect).
    const timer = window.setTimeout(() => {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      root.current?.querySelector<HTMLElement>("[data-alert-close]")?.focus();
    }, 0);
    // Capture phase: the alert gets Escape before the modal underneath would close itself.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || inOtherPopup(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [close]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    event.stopPropagation(); // the alert keeps its own Tab ring, inside the modal's
    trapTabKey(event, root.current);
  }

  return (
    <div
      ref={root}
      role="alertdialog"
      aria-labelledby={`${ids}-heading`}
      aria-describedby={`${ids}-detail`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      data-testid="spam-alert-overlay"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 overflow-hidden rounded-3xl bg-black/45 p-10 text-center text-white outline-none backdrop-blur-[6px]"
    >
      <button
        type="button"
        data-alert-close
        aria-label={t("moderation.overlay.close")}
        onClick={close}
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
      >
        <CloseIcon size={24} />
      </button>
      <AlertSignIcon className="h-auto max-h-[45%] w-[330px] max-w-[60%] text-[#bebebe]" />
      <h2 id={`${ids}-heading`} className="text-[32px] font-bold leading-10 [text-shadow:0_2px_8px_rgb(0_0_0/0.35)]">
        {t("moderation.overlay.lead")}
        <br />
        <Link href={STANDARDS_PATH} className="underline-offset-4 hover:underline focus-visible:underline">
          {t("moderation.overlay.link")}
        </Link>
      </h2>
      <p id={`${ids}-detail`} className="max-w-[420px] text-base">
        {t("moderation.overlay.detail")}
      </p>
    </div>
  );
}

/**
 * The spam slot of the kudo detail (F006 A7, DEC-003): a Public kudo renders
 * as is; a Spam kudo — which Go shows only to its author and to admins
 * (BR-006, SC-006) — gets the orange "Spam" badge of Figma "KUDO spam"
 * 3127:24099 as the neutral notice, and its author also gets the alert. While
 * the alert is open the card beneath is inert (out of the Tab order and the
 * accessibility tree, reviewer R3); the frame takes focus back when the alert
 * closes and nothing else had it.
 */
export function SpamKudoFrame({ status, isOwn, children }: { status: "public" | "spam"; isOwn: boolean; children: ReactNode }) {
  const { t } = useLocale();
  const [alertOpen, setAlertOpen] = useState(isOwn);
  const closeAlert = useCallback(() => setAlertOpen(false), []);
  if (status !== "spam") return children;
  return (
    <div className="relative h-fit outline-none" tabIndex={-1} data-testid="spam-kudo-frame">
      <div inert={alertOpen}>{children}</div>
      <span
        data-testid="spam-badge"
        title={t("moderation.spam.adminNotice")}
        className="absolute right-0 top-10 flex h-[38px] items-center rounded-control bg-[#ff8a14] px-2.5 text-base font-bold text-white"
      >
        {t("moderation.spam.badge")}
        <span className="sr-only">{`: ${t("moderation.spam.adminNotice")}`}</span>
      </span>
      {alertOpen && <SpamAlertOverlay onClose={closeAlert} />}
    </div>
  );
}
