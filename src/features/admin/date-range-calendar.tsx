"use client";

import { useLocale } from "@/i18n/locale-provider";
import { ChevronIcon, DoubleChevronIcon } from "./admin-icons";
import { addMonths, isDayBeforeStart, monthGrid, type CalendarMonth, type DaySelection } from "./report-dates";

const navButton = "flex size-6 items-center justify-center rounded-control text-compose-muted hover:text-on-primary";

/**
 * Two side-by-side months of the range picker (Figma "pick date" 2492:9140):
 * Monday-first weeks, the neighbouring months' days greyed, today outlined,
 * the chosen days filled dark and the days between them tinted. While only a
 * start is chosen, earlier days are disabled (BR-006, SM-001).
 */
export function DateRangeCalendar({ view, onViewChange, selection, today, onPick }: {
  /** The left month; the right one follows it. */
  view: CalendarMonth;
  onViewChange: (month: CalendarMonth) => void;
  selection: DaySelection;
  today: string;
  onPick: (day: string) => void;
}) {
  const { t } = useLocale();
  const weekdays = t("admin.range.weekdays").split(",");
  const months = t("admin.range.months").split(",");
  const shift = (by: number) => onViewChange(addMonths(view, by));

  return (
    <div className="flex divide-x divide-divider/20">
      {[view, addMonths(view, 1)].map((month, index) => (
        <div key={index} className="w-[290px] px-2 pb-2">
          <div className="flex h-11 items-center justify-between border-b border-divider/15 px-2 text-sm text-on-primary">
            <span className="flex w-14 gap-1">
              {index === 0 && (
                <>
                  <button type="button" className={navButton} aria-label={t("admin.range.prevYear")} onClick={() => shift(-12)}>
                    <DoubleChevronIcon direction="left" size={18} />
                  </button>
                  <button type="button" className={navButton} aria-label={t("admin.range.prevMonth")} onClick={() => shift(-1)}>
                    <ChevronIcon direction="left" size={18} />
                  </button>
                </>
              )}
            </span>
            <span className="font-medium" data-testid="calendar-month">{`${months[month.month]} ${month.year}`}</span>
            <span className="flex w-14 justify-end gap-1">
              {index === 1 && (
                <>
                  <button type="button" className={navButton} aria-label={t("admin.range.nextMonth")} onClick={() => shift(1)}>
                    <ChevronIcon direction="right" size={18} />
                  </button>
                  <button type="button" className={navButton} aria-label={t("admin.range.nextYear")} onClick={() => shift(12)}>
                    <DoubleChevronIcon direction="right" size={18} />
                  </button>
                </>
              )}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-sm text-on-primary">
            {weekdays.map((day) => (
              <span key={day} aria-hidden="true" className="py-1 font-medium">{day}</span>
            ))}
            {monthGrid(month).map((day) => {
              const inMonth = Number(day.slice(5, 7)) - 1 === month.month;
              const chosen = day === selection.start || day === selection.end;
              const between = selection.start !== null && selection.end !== null && day > selection.start && day < selection.end;
              const disabled = isDayBeforeStart(selection, day);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  aria-pressed={chosen}
                  aria-label={day}
                  onClick={() => onPick(day)}
                  className={`mx-auto flex size-8 items-center justify-center rounded-control border ${
                    day === today && !chosen ? "border-on-primary" : "border-transparent"
                  } ${chosen ? "bg-on-primary text-white" : between ? "bg-compose" : "hover:bg-primary-muted"} ${
                    inMonth ? "" : "text-compose-muted"
                  } disabled:cursor-not-allowed disabled:opacity-35`}
                >
                  {Number(day.slice(8))}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
