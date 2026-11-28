import { ForbiddenPage } from "@/components/errors/forbidden-page";
import { AdminLocaleProvider } from "@/features/admin/admin-locale-provider";
import { AdminLoadError } from "@/features/admin/admin-report-states";
import { ADMIN_REPORT_PATHS, type OverviewReport } from "@/features/admin/admin-reports-api";
import { OverviewRangePicker } from "@/features/admin/date-range-picker";
import { ExportButton } from "@/features/admin/export-button";
import { loadAdminReport } from "@/features/admin/load-admin-report";
import { OverviewTable } from "@/features/admin/overview-table";
import { quickRange, reportToday } from "@/features/admin/report-dates";
import { ReportBusyRegion, ReportNavigationProvider } from "@/features/admin/report-navigation";
import { getRequestTranslator } from "@/i18n/get-request-translator";

// The admin layout drops this segment for non-admins (Forbidden page instead),
// so it cannot be validated for instant navigation; every admin page needs this.
export const instant = false;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/**
 * F010 A1/A2/A3 Admin - Overview `/admin?from&to` (Figma 620:7712): the range
 * in the address is read by Go, which answers the default last 30 days when
 * it is missing or invalid (FR-104); the picker and Export use the range Go
 * applied, so the file holds the table's numbers (SC-002).
 */
export default async function AdminOverviewPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [from, to] = [first(params.from), first(params.to)];
  const returnPath = from || to ? `/admin?${new URLSearchParams({ from, to })}` : "/admin";
  const result = await loadAdminReport<OverviewReport>(ADMIN_REPORT_PATHS.overview(from, to), returnPath);
  if ("forbidden" in result) {
    return (
      <div className="relative">
        <ForbiddenPage />
      </div>
    );
  }

  const { t } = await getRequestTranslator("admin");
  const today = reportToday();
  const range = "data" in result ? { from: result.data.from, to: result.data.to } : quickRange("last30", today);
  return (
    <AdminLocaleProvider>
      <ReportNavigationProvider>
        <section className="px-20 pb-16 pt-6">
          <div className="flex items-center justify-between">
            <h1 className="text-5xl font-light leading-[52px] text-on-primary">{t("admin.overview.title")}</h1>
            <div className="flex items-start gap-4">
              <OverviewRangePicker from={range.from} to={range.to} today={today} />
              <ExportButton
                path={ADMIN_REPORT_PATHS.overviewExport(range.from, range.to)}
                fallbackName={`saa-overview-${range.from}_${range.to}.csv`}
                disabled={"error" in result}
              />
            </div>
          </div>
          <div className="mt-4">
            {"data" in result ? (
              <ReportBusyRegion>
                <OverviewTable rows={result.data.rows} />
              </ReportBusyRegion>
            ) : (
              <AdminLoadError />
            )}
          </div>
        </section>
      </ReportNavigationProvider>
    </AdminLocaleProvider>
  );
}
