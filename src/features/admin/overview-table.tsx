import { getRequestTranslator } from "@/i18n/get-request-translator";
import type { OverviewRow } from "./admin-reports-api";

/** Column widths of Figma 620:7712 (1280 px table) and their dictionary keys. */
const COLUMNS = [
  { key: "no", width: 60 },
  { key: "unit", width: 274 },
  { key: "members", width: 126 },
  { key: "sent", width: 142 },
  { key: "received", width: 213 },
  { key: "withKudo", width: 232 },
  { key: "boxes", width: 233 },
] as const;

const MEASURES = ["totalMembers", "kudosSent", "kudosReceived", "usersWithKudo", "secretBoxes"] as const;

/**
 * A1 Overview table (FR-101): All first, then one row per unit under its
 * code, every figure shown even when 0 (US001); No is blank on the All row
 * and counts the units from 1 (E07). The CSV export holds the same cells.
 */
export async function OverviewTable({ rows }: { rows: OverviewRow[] }) {
  const { t } = await getRequestTranslator("admin");
  return (
    <table className="w-full table-fixed border-collapse text-sm text-white" aria-label={t("admin.overview.table")} data-testid="overview-table">
      <colgroup>
        {COLUMNS.map((column) => (
          <col key={column.key} style={{ width: column.width }} />
        ))}
      </colgroup>
      <thead className="bg-admin-row-alt">
        <tr className="h-12 border-b border-divider">
          {COLUMNS.map((column, index) => (
            <th
              key={column.key}
              scope="col"
              className={`relative px-3 font-medium ${index === 0 ? "text-center" : "text-left"} ${
                index > 0 ? "before:absolute before:left-0 before:top-1/2 before:h-5 before:w-px before:-translate-y-1/2 before:bg-divider" : ""
              }`}
            >
              {t(`admin.overview.col.${column.key}`)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.unitId ?? "all"} className="h-12 border-b border-divider bg-menu last:border-b-0 even:bg-admin-row-alt">
            <td className="px-3 text-center">{row.unitId === null ? "" : index}</td>
            <th scope="row" className="truncate px-3 text-left font-normal" title={row.unitName ?? undefined}>
              {row.unitCode ?? t("admin.overview.all")}
            </th>
            {MEASURES.map((measure) => (
              <td key={measure} className="px-3">
                {row[measure]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
