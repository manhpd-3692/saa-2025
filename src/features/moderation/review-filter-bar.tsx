"use client";

import { AdminSelect } from "@/features/admin/admin-select";
import { DateRangePicker } from "@/features/admin/date-range-picker";
import { useReportNavigation } from "@/features/admin/report-navigation";
import { useLocale } from "@/i18n/locale-provider";
import { KUDO_STATUSES, reviewFilterHref, type ReviewPerson, type ReviewQuery } from "./moderation-api";
import { ReviewPeopleSelect } from "./review-people-select";
import { ReviewSearchBox } from "./review-search-box";

/**
 * A1 filter bar (Figma C_Filter 1002:15394; FR-201..FR-206): Sender and
 * Receiver from the people who sent / received (BR-009), Status Public or
 * Spam (D009), and the content search. Every change goes to the address on
 * page 1 and the filters combine (BR-001).
 */
export function ReviewFilterBar({ query, sender, receiver }: {
  query: ReviewQuery;
  /** The people the applied filters name (echoed by Go), for the field labels. */
  sender: ReviewPerson | null;
  receiver: ReviewPerson | null;
}) {
  const { t } = useLocale();
  const { navigate } = useReportNavigation();
  const change = (patch: Partial<ReviewQuery>) => navigate(reviewFilterHref(query, patch));

  return (
    <div className="flex items-end gap-4">
      <ReviewPeopleSelect
        role="sender"
        testId="filter-sender"
        label={t("moderation.filter.sender")}
        placeholder={t("moderation.filter.senderPlaceholder")}
        value={query.sender ? (sender ?? { id: query.sender, name: query.sender.slice(0, 8), avatarUrl: null, unitCode: null }) : null}
        onChange={(id) => change({ sender: id })}
      />
      <ReviewPeopleSelect
        role="receiver"
        testId="filter-receiver"
        label={t("moderation.filter.receiver")}
        placeholder={t("moderation.filter.receiverPlaceholder")}
        value={query.receiver ? (receiver ?? { id: query.receiver, name: query.receiver.slice(0, 8), avatarUrl: null, unitCode: null }) : null}
        onChange={(id) => change({ receiver: id })}
      />
      <AdminSelect
        testId="filter-status"
        className="w-[258px]"
        boxed
        label={t("moderation.filter.status")}
        placeholder={t("moderation.filter.statusPlaceholder")}
        anyLabel={t("moderation.filter.any")}
        options={KUDO_STATUSES.map((status) => ({ value: status, label: t(`moderation.status.${status}`) }))}
        value={query.status}
        onChange={(status) => change({ status: status as ReviewQuery["status"] })}
      />
      <div className="ml-auto">
        <ReviewSearchBox key={query.q} initial={query.q} onSearch={(q) => change({ q })} />
      </div>
    </div>
  );
}

/** The creation-date range of the header (FR-204): optional, cleared from the picker. */
export function ReviewRangePicker({ query, today }: { query: ReviewQuery; today: string }) {
  const { navigate } = useReportNavigation();
  return (
    <DateRangePicker
      from={query.from ?? ""}
      to={query.to ?? ""}
      today={today}
      onApply={(range) => navigate(reviewFilterHref(query, range))}
      onClear={() => navigate(reviewFilterHref(query, { from: null, to: null }))}
    />
  );
}
