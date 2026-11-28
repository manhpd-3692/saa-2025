import { ForbiddenPage } from "@/components/errors/forbidden-page";
import { AdminLocaleProvider } from "@/features/admin/admin-locale-provider";
import { AdminPager } from "@/features/admin/admin-pager";
import { AdminLoadError } from "@/features/admin/admin-report-states";
import {
  ADMIN_REPORT_PATHS, hasUserFilter, parseUserDirectoryQuery, usersPageHref, type UserDirectoryPage,
} from "@/features/admin/admin-reports-api";
import { ExportButton } from "@/features/admin/export-button";
import { loadAdminReport } from "@/features/admin/load-admin-report";
import { reportToday } from "@/features/admin/report-dates";
import { ReportBusyRegion, ReportNavigationProvider } from "@/features/admin/report-navigation";
import { UserFilterBar } from "@/features/admin/user-filter-bar";
import { UsersTable } from "@/features/admin/users-table";
import { getRequestTranslator } from "@/i18n/get-request-translator";

// The admin layout drops this segment for non-admins (Forbidden page instead),
// so it cannot be validated for instant navigation; every admin page needs this.
export const instant = false;

/**
 * F010 A4/A5/A6 Admin - User `/admin/users?unit&level&role&q&page` (Figma
 * 773:26403): 20 Sunners a page by name (D013), filters and search in the
 * address (BR-005), Export of every match of the current filters (FR-403).
 */
export default async function AdminUsersPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseUserDirectoryQuery(await searchParams);
  const result = await loadAdminReport<UserDirectoryPage>(ADMIN_REPORT_PATHS.users(query), usersPageHref(query));
  if ("forbidden" in result) {
    return (
      <div className="relative">
        <ForbiddenPage />
      </div>
    );
  }

  const { t } = await getRequestTranslator("admin");
  const data = "data" in result ? result.data : null;
  return (
    <AdminLocaleProvider>
      <ReportNavigationProvider>
        <section className="px-20 pb-16 pt-6">
          <div className="flex items-center justify-between">
            <h1 className="text-5xl font-light leading-[52px] text-on-primary">{t("admin.users.title")}</h1>
            <ExportButton
              path={ADMIN_REPORT_PATHS.usersExport(query)}
              fallbackName={`saa-users-${reportToday()}.csv`}
              disabled={data === null}
            />
          </div>
          <div className="mt-5">
            <UserFilterBar query={query} units={data?.units ?? []} />
          </div>
          <div className="mt-4">
            {data ? (
              <ReportBusyRegion>
                <UsersTable rows={data.rows} filtered={hasUserFilter(query)} />
                <AdminPager page={data.page} pageSize={data.pageSize} total={data.total} baseHref={usersPageHref({ ...query, page: 1 })} />
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
