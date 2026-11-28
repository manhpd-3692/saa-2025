"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { loginHref } from "./admin-call-failure";
import { runExport, saveBlob, type ExportOutcome } from "./export-download";
import { useReportNavigation } from "./report-navigation";

async function browserAccessToken(): Promise<string | null> {
  return (await createSupabaseBrowserClient().auth.getSession()).data.session?.access_token ?? null;
}

/**
 * Export (A3, A6; shared with P12/P13): fetches a Go CSV export from the
 * browser with the Bearer token and saves it only once the whole file has
 * arrived (Codex N11, `downloadExport`). Busy until saved; a failure or a
 * cut-off download saves nothing and offers to try again. 401 → Login;
 * 403 → the page reloads into the Forbidden page (P3 review W3).
 */
export function ExportButton({ path, fallbackName, disabled = false }: {
  /** Go export path with its query, e.g. `/api/v1/admin/users/export?unit=…`. */
  path: string;
  fallbackName: string;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  const { pending, reload, navigate } = useReportNavigation();
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");

  async function run() {
    setState("busy");
    let outcome: ExportOutcome = { kind: "failed" };
    try {
      outcome = await runExport({
        apiBase: process.env.NEXT_PUBLIC_API_BASE_URL,
        path,
        getToken: browserAccessToken,
        fallbackName,
        save: saveBlob,
      });
    } finally {
      // Always leaves "busy" (review W1): Login on 401, the Forbidden page on 403, else idle or failed.
      if (outcome.kind === "unauthorized") navigate(loginHref(window.location.pathname + window.location.search));
      if (outcome.kind === "forbidden") reload();
      setState(outcome.kind === "failed" ? "failed" : "idle");
    }
  }

  const busy = state === "busy";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={run}
        disabled={busy || pending || disabled}
        aria-busy={busy}
        data-testid="export-button"
        className="h-[52px] rounded-control bg-primary px-4 text-base font-medium text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? t("admin.export.busy") : t("admin.export")}
      </button>
      {state === "failed" && (
        <div role="alert" className="absolute right-0 top-full z-30 mt-2 flex w-max items-center gap-3 rounded-panel border border-primary-border bg-menu px-4 py-3 text-sm text-white">
          <span>{t("admin.export.failed")}</span>
          <button type="button" onClick={run} className="font-bold text-primary underline-offset-2 hover:underline">
            {t("admin.export.retry")}
          </button>
        </div>
      )}
    </div>
  );
}
