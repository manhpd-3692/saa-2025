import { getRequestTranslator } from "@/i18n/get-request-translator";

// The admin layout drops this segment for non-admins (Forbidden page instead),
// so it cannot be validated for instant navigation; every admin page needs this.
export const instant = false;

/**
 * Admin Overview route `/admin` inside the admin chrome. The table, date range
 * and export are F010's and arrive in phase 11; phase 3 only needs the route so
 * the admin gate and chrome have a page to wrap.
 */
export default async function AdminOverviewPage() {
  const { t } = await getRequestTranslator("shell");
  return <h1 className="px-20 pt-6 text-5xl font-light text-on-primary">{t("shell.admin.nav.overview")}</h1>;
}
