import { NotificationBell } from "@/features/notifications/notification-bell";
import { getRequestLocale } from "@/i18n/get-request-locale";
import { loadDictionaries } from "@/i18n/load-dictionary";

/**
 * F001 A4 bell entry, filled by F009 (phase 10): the bell with its unread dot
 * and the notification panel. A Server Component, so the header and the admin
 * chrome keep mounting it unchanged; it hands the panel its own dictionary
 * (`common` + `notifications`). The bell hides without a signed-in Sunner (FR-602).
 */
export async function NotificationBellSlot() {
  const locale = await getRequestLocale();
  const dictionary = await loadDictionaries(locale, ["common", "notifications"]);
  return <NotificationBell locale={locale} dictionary={dictionary} />;
}
