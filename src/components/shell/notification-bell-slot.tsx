"use client";

import { useLocale } from "@/i18n/locale-provider";
import { useSessionUser } from "./me-refresher";
import { BellIcon } from "./shell-icons";

/**
 * F001 A4 bell entry: the mount point F009 fills in phase 10 (unread dot and
 * the notification panel). Until then the bell shows no dot and opens nothing.
 * Hidden without a signed-in Sunner (FR-602).
 */
export function NotificationBellSlot() {
  const user = useSessionUser();
  const { t } = useLocale();
  if (!user) return null;

  return (
    <button
      type="button"
      aria-label={t("shell.notifications")}
      data-testid="notification-bell"
      className="relative flex size-10 items-center justify-center rounded-control text-white hover:bg-primary-soft"
    >
      <BellIcon size={24} />
    </button>
  );
}
