"use client";

import { useLocale } from "@/i18n/locale-provider";
import { AdminSelect } from "./admin-select";
import { HERO_LEVELS, USER_ROLES, usersPageHref, type UnitChoice, type UserDirectoryQuery } from "./admin-reports-api";
import { useReportNavigation } from "./report-navigation";
import { UserSearchBox } from "./user-search-box";

/**
 * A4/A5 filter bar (FR-202, FR-203): Unit, Level and Role dropdowns and the
 * search box. Every change goes to the address on page 1, and filters combine
 * (BR-005). Level choices are the F008 hero tiers by name; Role is a filter
 * only, never an edit (FR-206).
 */
export function UserFilterBar({ query, units }: { query: UserDirectoryQuery; units: UnitChoice[] }) {
  const { t } = useLocale();
  const { navigate } = useReportNavigation();
  const change = (patch: Partial<UserDirectoryQuery>) => navigate(usersPageHref({ ...query, ...patch, page: 1 }));
  const any = t("admin.users.filter.any");

  return (
    <div className="flex items-end gap-4">
      <AdminSelect
        testId="filter-unit"
        className="w-[258px]"
        label={t("admin.users.filter.unit")}
        placeholder={t("admin.users.filter.unitPlaceholder")}
        anyLabel={any}
        options={units.map((unit) => ({ value: unit.id, label: unit.code }))}
        value={query.unit}
        onChange={(unit) => change({ unit })}
      />
      <AdminSelect
        testId="filter-level"
        className="w-[135px]"
        label={t("admin.users.filter.level")}
        placeholder={t("admin.users.filter.levelPlaceholder")}
        anyLabel={any}
        options={HERO_LEVELS.map((level) => ({ value: level, label: t(`gamification.tier.${level}`) }))}
        value={query.level}
        onChange={(level) => change({ level: level as UserDirectoryQuery["level"] })}
      />
      <AdminSelect
        testId="filter-role"
        className="w-[122px]"
        label={t("admin.users.filter.role")}
        placeholder={t("admin.users.filter.rolePlaceholder")}
        anyLabel={any}
        options={USER_ROLES.map((role) => ({ value: role, label: t(`admin.users.role.${role}`) }))}
        value={query.role}
        onChange={(role) => change({ role: role as UserDirectoryQuery["role"] })}
      />
      <div className="ml-auto">
        <UserSearchBox key={query.q} query={query} />
      </div>
    </div>
  );
}
