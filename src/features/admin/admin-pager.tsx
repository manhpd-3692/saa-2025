import Link from "next/link";
import { fillText } from "@/features/kudos-board/kudo-board-format";
import { getRequestTranslator } from "@/i18n/get-request-translator";

/** Pages shown around the current one before the list is cut with "…". */
const NEIGHBOURS = 2;

function pageHref(baseHref: string, page: number): string {
  const [path, search = ""] = baseHref.split("?");
  const params = new URLSearchParams(search);
  if (page > 1) params.set("page", String(page));
  else params.delete("page");
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function visiblePages(page: number, last: number): (number | "gap")[] {
  const pages: (number | "gap")[] = [];
  for (let p = 1; p <= last; p++) {
    if (p === 1 || p === last || Math.abs(p - page) <= NEIGHBOURS) pages.push(p);
    else if (pages.at(-1) !== "gap") pages.push("gap");
  }
  return pages;
}

const cell = "flex h-10 min-w-10 items-center justify-center rounded-control px-3 text-base";

/**
 * Pager under an admin table (FR-204; shared with P12): page links that keep
 * the address's filters, hidden when everything fits on one page (E21). The
 * page shown is the one Go clamped to (page past the end → last page).
 */
export async function AdminPager({ page, pageSize, total, baseHref, summary }: {
  page: number;
  pageSize: number;
  total: number;
  /** The list address without `page`, e.g. `/admin/users?unit=…`. */
  baseHref: string;
  /** Translated "{from}–{to} of {total} …" naming what is paged; users (`admin.pager.summary`) by default. */
  summary?: string;
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  if (last <= 1) return null;
  const { t } = await getRequestTranslator("admin");
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const step = (target: number, labelKey: string, symbol: string) =>
    target < 1 || target > last ? (
      <span className={`${cell} text-on-primary/40`} aria-hidden="true">{symbol}</span>
    ) : (
      <Link href={pageHref(baseHref, target)} aria-label={t(labelKey)} className={`${cell} bg-white text-on-primary hover:bg-primary`}>
        {symbol}
      </Link>
    );

  return (
    <nav aria-label={t("admin.pager.label")} className="mt-4 flex items-center justify-end gap-2" data-testid="admin-pager">
      <span className="mr-auto text-base text-on-primary">{fillText(summary ?? t("admin.pager.summary"), { from, to, total })}</span>
      {step(page - 1, "admin.pager.previous", "‹")}
      {visiblePages(page, last).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className={`${cell} text-on-primary`}>…</span>
        ) : (
          <Link
            key={p}
            href={pageHref(baseHref, p)}
            aria-label={fillText(t("admin.pager.page"), { page: p })}
            aria-current={p === page ? "page" : undefined}
            className={`${cell} ${p === page ? "bg-on-primary font-bold text-primary" : "bg-white text-on-primary hover:bg-primary"}`}
          >
            {p}
          </Link>
        ),
      )}
      {step(page + 1, "admin.pager.next", "›")}
    </nav>
  );
}
