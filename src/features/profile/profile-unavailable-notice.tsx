"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/locale-provider";

/** The profile itself could not be read (Go error or timeout, not a 404): a message and Retry. */
export function ProfileUnavailableNotice() {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <div role="alert" data-testid="profile-unavailable" className="flex w-full flex-col items-center gap-4 rounded-3xl border border-primary-border bg-menu p-10">
      <p className="text-base font-bold text-white">{t("profile.unavailable")}</p>
      <button type="button" onClick={() => router.refresh()} className="h-12 rounded-panel bg-primary px-6 text-base font-bold text-on-primary hover:bg-primary-hover">
        {t("common.retry")}
      </button>
    </div>
  );
}
