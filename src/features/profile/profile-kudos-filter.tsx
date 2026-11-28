"use client";

import { CaretDownIcon } from "@/components/shell/shell-icons";
import { useDismissablePopover } from "@/components/shell/use-dismissable-popover";
import { fillText, formatCount } from "@/features/kudos-board/kudo-board-format";
import { useLocale } from "@/i18n/locale-provider";
import type { ProfileCounts, ProfileFilter } from "./profile-api";

const FILTERS: readonly ProfileFilter[] = ["received", "sent"];

const item = (checked: boolean) =>
  `flex h-14 w-full items-center whitespace-nowrap rounded-control px-4 text-left text-base font-bold text-white hover:bg-primary-soft hover:text-glow focus-visible:bg-primary-soft ${
    checked ? "bg-primary-soft text-glow" : ""
  }`;

/**
 * Dropdown-filter đã nhận/gửi (Figma 763:4728, FR-205): "Đã nhận (n)" and
 * "Đã gửi (n)", the counts being the profile's counts, which follow the
 * list's visibility rules (FR-403); without counts only the names show.
 * Menu keyboard model from the shell popover; the choice returns focus to the trigger.
 */
export function ProfileKudosFilter({ value, counts, onChange }: {
  value: ProfileFilter;
  counts: ProfileCounts | null;
  onChange: (filter: ProfileFilter) => void;
}) {
  const { locale, t } = useLocale();
  const { open, setOpen, ref } = useDismissablePopover<HTMLDivElement>({ menu: true });

  function label(filter: ProfileFilter): string {
    const name = t(`profile.filter.${filter}`);
    if (!counts) return name;
    const count = filter === "received" ? counts.kudosReceived : counts.kudosSent;
    return fillText(t("profile.filter.withCount"), { label: name, count: formatCount(count, locale) });
  }

  function choose(filter: ProfileFilter) {
    setOpen(false);
    ref.current?.querySelector<HTMLElement>("[data-popover-trigger]")?.focus();
    if (filter !== value) onChange(filter);
  }

  return (
    <div ref={ref} className="relative" data-testid="profile-filter">
      <button
        type="button"
        data-popover-trigger
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("profile.filter.label")}: ${label(value)}`}
        onClick={() => setOpen(!open)}
        className="flex h-16 items-center gap-2 whitespace-nowrap rounded-control border border-primary-border bg-primary-soft px-6 text-base font-bold text-white hover:bg-primary-muted"
      >
        {label(value)}
        <CaretDownIcon size={24} className="shrink-0" />
      </button>
      {open && (
        <ul
          role="menu"
          aria-label={t("profile.filter.label")}
          className="absolute right-0 top-full z-50 mt-2 min-w-full rounded-panel border border-primary-border bg-menu p-1.5"
        >
          {FILTERS.map((filter) => (
            <li key={filter} role="none">
              <button type="button" role="menuitemradio" aria-checked={filter === value} onClick={() => choose(filter)} className={item(filter === value)}>
                {label(filter)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
