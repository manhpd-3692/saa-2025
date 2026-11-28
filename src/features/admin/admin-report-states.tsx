"use client";

import { useLocale } from "@/i18n/locale-provider";
import { useReportNavigation } from "./report-navigation";

/**
 * Error state of an admin report (E15 / E22): "Could not load the data. Try
 * again." with Retry, in place of the table; the admin header keeps working.
 */
export function AdminLoadError() {
  const { t } = useLocale();
  const { reload, pending } = useReportNavigation();
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-panel bg-menu px-6 py-16 text-center text-base text-white">
      <p>{t("admin.load.failed")}</p>
      <button
        type="button"
        onClick={reload}
        disabled={pending}
        className="h-12 rounded-control bg-primary px-6 text-base font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
      >
        {t("admin.load.retry")}
      </button>
    </div>
  );
}
