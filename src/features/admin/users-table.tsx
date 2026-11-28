import Link from "next/link";
import { getRequestTranslator } from "@/i18n/get-request-translator";
import type { DirectoryUser } from "./admin-reports-api";
import { formatBadgeDuration, formatLastLogin, shortUserId } from "./admin-table-format";
import { UserRowMenu } from "./user-row-menu";

/** Columns of Figma 773:26403 (1280 px), widened for the 8-character ID (D010). */
const COLUMNS = [
  { key: "id", width: 96, align: "center" },
  { key: "user", width: 140, align: "left" },
  { key: "email", width: 170, align: "left" },
  { key: "sent", width: 112, align: "center" },
  { key: "received", width: 124, align: "center" },
  { key: "heart", width: 80, align: "center" },
  { key: "level", width: 96, align: "center" },
  { key: "badges", width: 100, align: "center" },
  { key: "sixBadges", width: 112, align: "center" },
  { key: "lastLogin", width: 110, align: "center" },
  { key: "role", width: 72, align: "center" },
  { key: "actions", width: 68, align: "center" },
] as const;

const DASH = "-";

/**
 * A4 user table (FR-201): twelve columns, name order, Total Heart in red as
 * designed; a dash for no level, fewer than six badges (DEC-003) and never
 * logged in. Role is text only (FR-206). Empty: "no user matches" with Clear
 * filters when a filter is set, "no users yet" otherwise (DEC-002).
 */
export async function UsersTable({ rows, filtered }: { rows: DirectoryUser[]; filtered: boolean }) {
  const { t } = await getRequestTranslator("admin", "gamification");
  return (
    <table className="w-full table-fixed border-collapse text-sm leading-5 text-white" aria-label={t("admin.users.table")} data-testid="users-table">
      <colgroup>
        {COLUMNS.map((column) => (
          <col key={column.key} style={{ width: column.width }} />
        ))}
      </colgroup>
      <thead className="bg-page">
        <tr className="h-16 border-b border-divider">
          {COLUMNS.map((column, index) => (
            <th
              key={column.key}
              scope="col"
              className={`relative px-3 font-medium ${column.key === "id" || column.key === "actions" || column.key === "role" ? "text-center" : "text-left"} ${
                index > 0 ? "before:absolute before:left-0 before:top-1/2 before:h-6 before:w-px before:-translate-y-1/2 before:bg-divider" : ""
              }`}
            >
              {t(`admin.users.col.${column.key}`)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr className="bg-menu">
            <td colSpan={COLUMNS.length} className="px-6 py-12 text-center text-base" data-testid="users-empty">
              <p>{t(filtered ? "admin.users.empty.filtered" : "admin.users.empty.none")}</p>
              {filtered && (
                <Link href="/admin/users" className="mt-3 inline-block font-bold text-primary underline-offset-2 hover:underline">
                  {t("admin.users.clearFilters")}
                </Link>
              )}
            </td>
          </tr>
        ) : (
          rows.map((user) => {
            const login = user.lastLoginAt ? formatLastLogin(user.lastLoginAt) : null;
            return (
              <tr key={user.id} className="border-b border-divider bg-menu last:border-b-0" data-user-id={user.id}>
                <td className="px-3 py-4 text-center">{shortUserId(user.id)}</td>
                <th scope="row" className="break-words px-3 py-4 text-left font-normal">{user.name}</th>
                <td className="break-all px-3 py-4">{user.email}</td>
                <td className="px-3 py-4 text-center">{user.kudosSent}</td>
                <td className="px-3 py-4 text-center">{user.kudosReceived}</td>
                <td className="px-3 py-4 text-center text-danger">{user.totalHeart}</td>
                <td className="px-3 py-4 text-center">{user.level ? t(`gamification.tier.${user.level}`) : DASH}</td>
                <td className="px-3 py-4 text-center">{user.badges}</td>
                <td className="px-3 py-4 text-center">
                  {user.timeToSixBadgesSeconds === null ? DASH : formatBadgeDuration(user.timeToSixBadgesSeconds, t)}
                </td>
                <td className="px-3 py-4 text-center leading-7">
                  {login ? (
                    <>
                      {login.date}
                      <br />
                      {login.time}
                    </>
                  ) : (
                    DASH
                  )}
                </td>
                <td className="px-3 py-4 text-center">{t(`admin.users.role.${user.role}`)}</td>
                <td className="px-3 py-4">
                  <UserRowMenu userId={user.id} name={user.name} />
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
