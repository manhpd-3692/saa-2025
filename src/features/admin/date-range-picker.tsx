"use client";

import { useState } from "react";
import { useDismissablePopover } from "@/components/shell/use-dismissable-popover";
import { useLocale } from "@/i18n/locale-provider";
import { ArrowRightIcon, CalendarIcon } from "./admin-icons";
import { DateRangeCalendar } from "./date-range-calendar";
import { addMonths, monthOf, pickDay, quickRange, quickRangeOf, QUICK_RANGES, type DaySelection, type QuickRange } from "./report-dates";
import { useReportNavigation } from "./report-navigation";

export interface DayRange {
  from: string;
  to: string;
}

/**
 * Range field with quick ranges and a two-month calendar (A2, FR-401, D012;
 * shared with P13). A quick range applies at once; on the calendar the admin
 * picks a start, then an end not before it, then Apply (SM-001). Escape, a
 * click outside or Cancel closes it and the applied range stays.
 */
export function DateRangePicker({ from, to, today, onApply }: DayRange & { today: string; onApply: (range: DayRange) => void }) {
  const { t } = useLocale();
  const { open, setOpen, ref } = useDismissablePopover<HTMLDivElement>();
  const [selection, setSelection] = useState<DaySelection>({ start: from, end: to });
  const [view, setView] = useState(() => addMonths(monthOf(to), -1));
  const preset = selection.start && selection.end ? quickRangeOf(selection.start, selection.end, today) : "custom";

  function toggle() {
    if (!open) {
      setSelection({ start: from, end: to });
      setView(addMonths(monthOf(to), -1));
    }
    setOpen(!open);
  }

  function apply(range: DayRange) {
    setOpen(false);
    ref.current?.querySelector<HTMLElement>("[data-popover-trigger]")?.focus();
    if (range.from !== from || range.to !== to) onApply(range);
  }

  function chooseQuick(kind: QuickRange | "custom") {
    if (kind === "custom") setSelection({ start: null, end: null });
    else apply(quickRange(kind, today));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-popover-trigger
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t("admin.range.label")}: ${from} → ${to}`}
        onClick={toggle}
        data-testid="date-range-field"
        className="flex h-[52px] w-64 items-center gap-2 whitespace-nowrap rounded-panel border border-admin-header bg-white px-3 text-base text-on-primary"
      >
        <span>{from}</span>
        <ArrowRightIcon size={14} className="mx-1 shrink-0 text-compose-muted" />
        <span>{to}</span>
        <CalendarIcon size={16} className="ml-auto shrink-0 text-compose-muted" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t("admin.range.dialog")}
          className="absolute right-0 top-full z-40 mt-2 flex rounded-control bg-white text-on-primary shadow-[0_4px_16px_rgb(0_0_0/0.25)]"
        >
          <ul className="flex w-36 flex-col gap-1 border-r border-divider/15 p-2">
            {[...QUICK_RANGES, "custom" as const].map((kind) => (
              <li key={kind}>
                <button
                  type="button"
                  aria-pressed={preset === kind}
                  onClick={() => chooseQuick(kind)}
                  className={`w-full rounded-control px-3 py-2 text-left text-sm ${preset === kind ? "bg-on-primary text-white" : "hover:bg-primary-muted"}`}
                >
                  {t(`admin.range.${kind}`)}
                </button>
              </li>
            ))}
          </ul>
          <div>
            <DateRangeCalendar view={view} onViewChange={setView} selection={selection} today={today} onPick={(day) => setSelection(pickDay(selection, day))} />
            <div className="flex items-center justify-end gap-3 border-t border-divider/15 px-4 py-3 text-sm">
              <span className="mr-auto text-compose-muted" aria-live="polite">
                {selection.start === null ? t("admin.range.pickStart") : selection.end === null ? t("admin.range.pickEnd") : `${selection.start} → ${selection.end}`}
              </span>
              <button type="button" onClick={() => setOpen(false)} className="rounded-control px-3 py-1.5 hover:bg-primary-muted">
                {t("admin.range.cancel")}
              </button>
              <button
                type="button"
                disabled={!selection.start || !selection.end}
                onClick={() => selection.start && selection.end && apply({ from: selection.start, to: selection.end })}
                className="rounded-control bg-on-primary px-4 py-1.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("admin.range.apply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** The Overview's picker: an applied range becomes the address `/admin?from&to` (A2). */
export function OverviewRangePicker(props: DayRange & { today: string }) {
  const { navigate } = useReportNavigation();
  return <DateRangePicker {...props} onApply={(range) => navigate(`/admin?from=${range.from}&to=${range.to}`)} />;
}
