"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SUPPORTED_LOCALES, writeLocaleCookie, type Locale } from "@/i18n/locale-config";
import { useLocale } from "@/i18n/locale-provider";
import { LocaleFlag } from "./locale-flag";
import { useShellActions } from "./shell-actions-context";
import { CaretDownIcon } from "./shell-icons";
import { useDismissablePopover } from "./use-dismissable-popover";

/**
 * F001 A7 LocaleSwitcher#select: current code + flag, two-item dropdown
 * (Figma 721:4942). A pick writes the locale cookie and refreshes the Server
 * Components (no Server Action, no Go call). Only `vi`/`en` are written
 * (BR-003). Disabled while the write-kudo form holds the lock (D005).
 */
export function LocaleSwitcher() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const locked = useShellActions()?.localeLocked ?? false;
  const { open, setOpen, ref } = useDismissablePopover<HTMLDivElement>({ menu: true });
  const [pending, startTransition] = useTransition();
  const [changed, setChanged] = useState(false);

  function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    writeLocaleCookie(next);
    setChanged(true);
    startTransition(() => router.refresh());
  }

  return (
    <div ref={ref} className="relative" data-testid="locale-switcher">
      <button
        type="button"
        data-popover-trigger
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("locale.switch")}: ${t(`locale.${locale}`)}`}
        title={locked ? t("shell.language.locked") : undefined}
        disabled={locked || pending}
        onClick={() => setOpen(!open)}
        className="flex h-10 items-center gap-2 rounded-control px-3 text-base font-bold text-white transition-opacity hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LocaleFlag locale={locale} />
        <span>{t(`locale.${locale}`)}</span>
        <CaretDownIcon size={20} className="-ml-1" />
      </button>
      {open && (
        <ul
          role="menu"
          aria-label={t("locale.switch")}
          className="absolute right-0 top-full z-50 mt-2 w-[122px] rounded-panel border border-primary-border bg-menu p-1.5"
        >
          {SUPPORTED_LOCALES.map((code) => (
            <li key={code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={code === locale}
                onClick={() => choose(code)}
                className={`flex h-14 w-full items-center justify-center gap-2 rounded-control text-base font-bold text-white hover:bg-primary-soft hover:text-glow focus-visible:bg-primary-soft ${
                  code === locale ? "bg-primary-muted" : ""
                }`}
              >
                <LocaleFlag locale={code} />
                {t(`locale.${code}`)}
              </button>
            </li>
          ))}
        </ul>
      )}
      <span aria-live="polite" className="sr-only">
        {changed && !pending ? t("shell.language.changed") : ""}
      </span>
    </div>
  );
}
