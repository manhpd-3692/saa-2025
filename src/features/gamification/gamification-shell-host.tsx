"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useShellActions } from "@/components/shell/shell-actions-context";
import type { Dictionary } from "@/i18n/load-dictionary";
import type { Locale } from "@/i18n/locale-config";
import { LocaleProvider } from "@/i18n/locale-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

// Both overlays load only when first opened.
const RulesPanel = dynamic(() => import("./rules-panel").then((m) => m.RulesPanel), { ssr: false });
const SecretBoxModal = dynamic(() => import("./secret-box-modal").then((m) => m.SecretBoxModal), { ssr: false });

/** Registers `action` with the shell for as long as this is mounted; returns [open, setOpen]. */
function useShellOverlay(action: "rules" | "secretBox") {
  const register = useShellActions()?.registerAction;
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  useEffect(() => register?.(action, show), [register, action, show]);
  return [open, setOpen] as const;
}

/**
 * FR-101 / FR-103: the FAB's "Thể lệ" opens the rules panel; its "Viết KUDOS"
 * closes the panel and opens F005's write window, or sends a signed-out
 * Sunner to sign in (US005 error path).
 */
function RulesPanelController() {
  const actions = useShellActions();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useShellOverlay("rules");

  async function write() {
    setOpen(false);
    const { data } = await createSupabaseBrowserClient().auth.getSession();
    if (!data.session) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    actions?.runAction("compose");
  }
  return open ? <RulesPanel onClose={() => setOpen(false)} onWrite={() => void write()} /> : null;
}

/** FR-102: "Mở Secret Box" buttons open the window; after an open the page re-reads its counts. */
function SecretBoxController() {
  const router = useRouter();
  const [open, setOpen] = useShellOverlay("secretBox");
  function close(changed: boolean) {
    setOpen(false);
    if (changed) router.refresh(); // sidebar / profile box counts and the gift list come from Go again
  }
  return open ? <SecretBoxModal onClose={close} /> : null;
}

/**
 * F008 entries in the full shell for a signed-in Sunner: the Thể lệ panel and
 * the secret box window, opened through shell actions. Carries its own
 * dictionary (`common` + `gamification`) so the root layout stays small.
 */
export function GamificationShellHost({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  return (
    <LocaleProvider locale={locale} dictionary={dictionary}>
      <RulesPanelController />
      <SecretBoxController />
    </LocaleProvider>
  );
}
