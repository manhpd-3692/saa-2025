"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useShellActions, type ShellActionPayload } from "@/components/shell/shell-actions-context";
import type { Dictionary } from "@/i18n/load-dictionary";
import type { Locale } from "@/i18n/locale-config";
import { LocaleProvider, useLocale } from "@/i18n/locale-provider";
import type { ComposeMode } from "./kudo-compose-form-state";

// The editor (Tiptap) and the whole form load only when the window first opens.
const KudoComposeModal = dynamic(() => import("./kudo-compose-modal").then((m) => m.KudoComposeModal), { ssr: false });

/** `?editKudo=<id>` on any full-shell page opens the author's kudo for editing (FR-102). */
export const EDIT_KUDO_PARAM = "editKudo";
const KUDO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOAST_MS = 4000;

/** Opens the edit form from the URL once, then drops the parameter. */
function EditKudoLink({ onOpen }: { onOpen: (payload: ShellActionPayload) => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const kudoId = params.get(EDIT_KUDO_PARAM);

  useEffect(() => {
    if (!kudoId) return;
    if (KUDO_ID.test(kudoId)) onOpen({ kudoId });
    const rest = new URLSearchParams(params.toString());
    rest.delete(EDIT_KUDO_PARAM);
    router.replace(rest.size > 0 ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [kudoId, params, pathname, router, onOpen]);
  return null;
}

function ComposeController() {
  const actions = useShellActions();
  const router = useRouter();
  const { t } = useLocale();
  const [mode, setMode] = useState<ComposeMode | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const isOpen = useRef(false);

  // An open window is never replaced (typed input would be lost); a new one mounts fresh.
  const open = useCallback((payload?: ShellActionPayload) => {
    if (!isOpen.current) {
      const active = document.activeElement;
      opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
    }
    setMode((current) => current ?? (payload?.kudoId ? { kind: "edit", kudoId: payload.kudoId } : { kind: "create" }));
    setToast(null);
  }, []);

  // Reviewer W5 (WAI-ARIA dialog): closing gives focus back to the control that opened the window.
  useEffect(() => {
    isOpen.current = mode !== null;
    if (mode !== null) return;
    const target = opener.current;
    opener.current = null;
    if (target?.isConnected) target.focus();
  }, [mode]);

  const register = actions?.registerAction;
  useEffect(() => register?.("compose", open), [register, open]);

  // D005 / F001 SC-007: no language switch while the form is open.
  const lockLocale = actions?.setLocaleLocked;
  useEffect(() => {
    lockLocale?.(mode !== null);
    return () => lockLocale?.(false);
  }, [mode, lockLocale]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function saved() {
    setToast(mode?.kind === "edit" ? "kudo-compose.success.edit" : "kudo-compose.success.create");
    setMode(null);
    router.refresh(); // pages showing kudos re-read them from Go (FR-401)
  }

  return (
    <>
      <Suspense fallback={null}>
        <EditKudoLink onOpen={open} />
      </Suspense>
      {mode && <KudoComposeModal mode={mode} onClose={() => setMode(null)} onSaved={saved} />}
      {toast && (
        <p role="status" className="fixed bottom-10 left-1/2 z-40 -translate-x-1/2 rounded-panel bg-primary px-6 py-3 text-base font-bold text-on-primary shadow-glow">
          {t(toast)}
        </p>
      )}
    </>
  );
}

/**
 * F005 entry in the full shell (FR-101): registers the FAB "Viết KUDOS" action
 * (and the edit opener other features call with a kudo id), mounts the
 * lazily-loaded window and shows the success notice. Carries its own
 * dictionary (`common` + `kudo-compose`) so the root layout stays small.
 */
export function KudoComposeHost({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  return (
    <LocaleProvider locale={locale} dictionary={dictionary}>
      <ComposeController />
    </LocaleProvider>
  );
}
