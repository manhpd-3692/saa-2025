"use client";

import { CaretDownIcon } from "@/components/shell/shell-icons";
import { useDismissablePopover } from "@/components/shell/use-dismissable-popover";
import { useLocale } from "@/i18n/locale-provider";

export interface FilterChoice {
  id: string;
  label: string;
}

/**
 * Single-select Highlight filter (Hashtag 721:5580, Phòng ban 721:5684) with
 * an "all" choice that clears it (FR-203, FR-204). Unset, the trigger shows
 * the filter name on the dark button; set, it shows the chosen value on the
 * light chip of Figma 1002:13094. Menu keyboard model from the shell popover.
 */
export function FilterDropdown({ label, choices, value, onChange, testId }: {
  label: string;
  choices: FilterChoice[];
  value: string | null;
  onChange: (id: string | null) => void;
  testId: string;
}) {
  const { t } = useLocale();
  const { open, setOpen, ref } = useDismissablePopover<HTMLDivElement>({ menu: true });
  const selected = choices.find((choice) => choice.id === value) ?? null;

  function choose(id: string | null) {
    setOpen(false);
    if (id !== value) onChange(id);
  }

  const item = (checked: boolean) =>
    `flex h-14 w-full items-center whitespace-nowrap rounded-control px-4 text-left text-base font-bold text-white hover:bg-primary-soft hover:text-glow focus-visible:bg-primary-soft ${
      checked ? "bg-primary-soft text-glow" : ""
    }`;

  return (
    <div ref={ref} className="relative" data-testid={testId}>
      <button
        type="button"
        data-popover-trigger
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={selected ? `${label}: ${selected.label}` : label}
        onClick={() => setOpen(!open)}
        data-selected={selected ? "" : undefined}
        className={`flex h-14 max-w-[280px] items-center gap-2 border border-primary-border px-4 text-base font-bold ${
          // Selected = Figma 1002:13094 measured: fill #FFFFFF, 1 px outline #998C5F (primary-border), 8 px corners.
          selected ? "rounded-panel bg-white text-on-primary" : "rounded-control bg-primary-soft text-white hover:bg-primary-muted"
        }`}
      >
        <span className="truncate">{selected ? selected.label : label}</span>
        <CaretDownIcon size={24} className="shrink-0" />
      </button>
      {open && (
        <ul
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-50 mt-2 max-h-[400px] min-w-full overflow-y-auto rounded-panel border border-primary-border bg-menu p-1.5"
        >
          <li role="none">
            <button type="button" role="menuitemradio" aria-checked={value === null} onClick={() => choose(null)} className={item(value === null)}>
              {t("kudos-board.filter.all")}
            </button>
          </li>
          {choices.map((choice) => (
            <li key={choice.id} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={choice.id === value}
                onClick={() => choose(choice.id)}
                className={item(choice.id === value)}
              >
                {choice.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
