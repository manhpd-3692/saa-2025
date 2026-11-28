import Link from "next/link";
import { getRequestTranslator } from "@/i18n/get-request-translator";
import { REVIEW_PATH, type ReviewKudo } from "./moderation-api";
import { ReviewTableRow } from "./review-table-row";

/**
 * Columns of Figma 722:16251 at 1280 px with the spec's Time column (FR-101);
 * Content takes what is left.
 */
const COLUMNS = [
  { key: "id", width: 92 },
  { key: "sender", width: 128 },
  { key: "receiver", width: 128 },
  { key: "content", width: undefined },
  { key: "hashtags", width: 144 },
  { key: "heart", width: 80 },
  { key: "time", width: 100 },
  { key: "status", width: 100 },
  { key: "actions", width: 148 },
] as const;

const CENTERED = new Set(["id", "heart", "time", "status", "actions"]);

/**
 * A1 review table (FR-101, FR-102): newest first; an empty result says "no
 * kudo matches" with Clear filters when a filter or search is set, "no kudos
 * yet" otherwise (DEC-002, FR-103). Each row owns its moderation state.
 */
export async function ReviewTable({ items, filtered, query }: { items: ReviewKudo[]; filtered: boolean; query: string }) {
  const { t } = await getRequestTranslator("moderation");
  return (
    <table className="w-full table-fixed border-collapse text-sm leading-5 text-white" aria-label={t("moderation.table")} data-testid="review-table">
      <colgroup>
        {COLUMNS.map((column) => (
          <col key={column.key} style={column.width ? { width: column.width } : undefined} />
        ))}
      </colgroup>
      <thead className="bg-page">
        <tr className="h-12 border-b border-divider">
          {COLUMNS.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={`relative px-3 font-medium ${CENTERED.has(column.key) ? "text-center" : "text-left"} ${
                column.key === "hashtags" || column.key === "actions"
                  ? "before:absolute before:left-0 before:top-1/2 before:h-6 before:w-px before:-translate-y-1/2 before:bg-divider"
                  : ""
              }`}
            >
              {t(`moderation.col.${column.key}`)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr className="bg-menu">
            <td colSpan={COLUMNS.length} className="px-6 py-12 text-center text-base" data-testid="review-empty">
              <p>{t(filtered ? "moderation.empty.filtered" : "moderation.empty.none")}</p>
              {filtered && (
                <Link href={REVIEW_PATH} className="mt-3 inline-block font-bold text-primary underline-offset-2 hover:underline">
                  {t("moderation.clearFilters")}
                </Link>
              )}
            </td>
          </tr>
        ) : (
          items.map((item) => <ReviewTableRow key={`${item.id}:${item.moderationVersion}`} item={item} query={query} />)
        )}
      </tbody>
    </table>
  );
}
