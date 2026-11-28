import { ForbiddenPage } from "@/components/errors/forbidden-page";
import { AdminLocaleProvider } from "@/features/admin/admin-locale-provider";
import { AdminPager } from "@/features/admin/admin-pager";
import { AdminLoadError } from "@/features/admin/admin-report-states";
import { loadAdminReport } from "@/features/admin/load-admin-report";
import { reportToday } from "@/features/admin/report-dates";
import { ReportBusyRegion, ReportNavigationProvider } from "@/features/admin/report-navigation";
import { hasReviewFilter, MODERATION_PATHS, parseReviewQuery, reviewHref, type ReviewPage } from "@/features/moderation/moderation-api";
import { ReviewFilterBar, ReviewRangePicker } from "@/features/moderation/review-filter-bar";
import { ReviewTable } from "@/features/moderation/review-table";
import { getRequestTranslator } from "@/i18n/get-request-translator";

// The admin layout drops this segment for non-admins (Forbidden page instead),
// so it cannot be validated for instant navigation; every admin page needs this.
export const instant = false;

/**
 * F011 A1 Admin - Review content `/admin/review?sender&receiver&status&from&to&q&page`
 * (Figma 722:16251, search state 832:13197): every kudo newest first, 20 a
 * page (FR-102), filters and search in the address (FR-206), the real sender
 * of anonymous kudos with a marker (BR-004) and the Spam / Public row action.
 * No Export (D008). Go's RequireAdmin is the protection (BR-007, FR-601).
 */
export default async function AdminReviewPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseReviewQuery(await searchParams);
  const result = await loadAdminReport<ReviewPage>(MODERATION_PATHS.list(query), reviewHref(query));
  if ("forbidden" in result) {
    return (
      <div className="relative">
        <ForbiddenPage />
      </div>
    );
  }

  const { t } = await getRequestTranslator("moderation");
  const data = "data" in result ? result.data : null;
  return (
    <AdminLocaleProvider extraNamespaces={["moderation"]}>
      <ReportNavigationProvider>
        <section className="px-20 pb-16 pt-6">
          <div className="flex items-center justify-between">
            <h1 className="text-5xl font-light leading-[52px] text-on-primary">{t("moderation.title")}</h1>
            <ReviewRangePicker query={query} today={reportToday()} />
          </div>
          <div className="mt-5">
            <ReviewFilterBar query={query} sender={data?.filters.sender ?? null} receiver={data?.filters.receiver ?? null} />
          </div>
          <div className="mt-4">
            {data ? (
              <ReportBusyRegion>
                <ReviewTable items={data.items} filtered={hasReviewFilter(query)} query={data.filters.q} />
                <AdminPager
                  page={data.page}
                  pageSize={data.pageSize}
                  total={data.total}
                  baseHref={reviewHref({ ...query, page: 1 })}
                  summary={t("moderation.pager.summary")}
                />
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
