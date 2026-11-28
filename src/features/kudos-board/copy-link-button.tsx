"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { kudoDetailPath } from "./kudos-board-api";
import { LinkIcon } from "./kudos-board-icons";

/** How long "Link copied" stays on the button. */
export const COPIED_NOTICE_MS = 2000;

/**
 * A8 Copy Link (FR-401, BR-007): copies the plain absolute detail address
 * `{origin}/kudos/{id}` (no filters, no scroll state) and says "Link copied"
 * for a moment. When the browser blocks the clipboard the link is shown
 * selected in a small field so it can be copied by hand.
 */
export function CopyLinkButton({ kudoId }: { kudoId: string }) {
  const { t } = useLocale();
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const [link, setLink] = useState("");

  useEffect(() => {
    if (state !== "copied") return;
    const timer = window.setTimeout(() => setState("idle"), COPIED_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy() {
    const url = new URL(kudoDetailPath(kudoId), window.location.origin).toString();
    setLink(url);
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("manual");
    }
  }

  return (
    <span className="relative">
      <button
        type="button"
        onClick={copy}
        data-testid="copy-link"
        className="flex h-10 items-center gap-1 rounded-control px-2 text-base font-bold text-on-primary hover:bg-primary/40"
      >
        {state === "copied" ? t("kudos-board.card.copied") : t("kudos-board.card.copyLink")}
        <LinkIcon size={20} />
      </button>
      <span role="status" className="sr-only">
        {state === "copied" ? t("kudos-board.card.copied") : ""}
      </span>
      {state === "manual" && (
        <span className="absolute bottom-full right-0 z-20 mb-2 flex w-[320px] flex-col gap-1 rounded-panel border border-primary-border bg-menu p-3 text-sm font-bold text-white">
          <input
            readOnly
            autoFocus
            value={link}
            aria-label={t("kudos-board.card.copyLink")}
            onFocus={(event) => event.currentTarget.select()}
            onBlur={() => setState("idle")}
            className="rounded-control bg-white px-2 py-1 text-on-primary"
          />
          {t("kudos-board.card.copyFallback")}
        </span>
      )}
    </span>
  );
}
