"use client";

import { CaretDownIcon } from "@/components/shell/shell-icons";
import { useDismissablePopover } from "@/components/shell/use-dismissable-popover";

export interface AdminSelectOption {
  value: string;
  label: string;
}

/**
 * Labelled filter dropdown of the admin pages (Unit 1002:15708, Level
 * 1002:15711, Role 1002:15714): white field with the placeholder until a value
 * is chosen, gold outline while open, dark panel of centred choices. The first
 * choice ("All") clears the filter. Menu keyboard model from the shell popover.
 * `boxed` draws each choice as an outlined rounded box in a compact panel at the
 * field's right edge (F011 Status, Figma 1002:15559).
 */
export function AdminSelect({ label, placeholder, anyLabel, options, value, onChange, className = "", testId, boxed = false }: {
  label: string;
  placeholder: string;
  anyLabel: string;
  options: readonly AdminSelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** Width of the field (Figma: Unit 258 px, Level 135 px, Role 122 px). */
  className?: string;
  testId: string;
  boxed?: boolean;
}) {
  const { open, setOpen, ref } = useDismissablePopover<HTMLDivElement>({ menu: true });
  const selected = options.find((option) => option.value === value) ?? null;

  function choose(next: string | null) {
    setOpen(false);
    ref.current?.querySelector<HTMLElement>("[data-popover-trigger]")?.focus();
    if (next !== value) onChange(next);
  }

  const item = (checked: boolean) =>
    boxed
      ? `flex h-9 w-full min-w-[72px] items-center justify-center whitespace-nowrap rounded-control border px-3 text-sm hover:bg-primary-muted focus-visible:bg-primary-muted ${
          checked ? "border-primary text-primary" : "border-white/80 text-white"
        }`
      : `flex h-[30px] w-full items-center justify-center whitespace-nowrap rounded-control px-3 text-sm text-white/75 hover:bg-primary-muted hover:text-white focus-visible:bg-primary-muted ${
          checked ? "bg-primary-muted text-white" : ""
        }`;

  return (
    <div ref={ref} className={`relative flex flex-col gap-1 ${className}`} data-testid={testId}>
      <span className="text-base leading-5 text-on-primary">{label}</span>
      <button
        type="button"
        data-popover-trigger
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${selected ? selected.label : placeholder}`}
        onClick={() => setOpen(!open)}
        className={`flex h-12 w-full items-center rounded-panel border bg-white pl-4 pr-1.5 text-left text-sm ${
          open ? "border-primary" : "border-divider"
        }`}
      >
        <span className={`truncate ${selected ? "text-on-primary" : "text-compose-muted"}`}>{selected ? selected.label : placeholder}</span>
        <CaretDownIcon size={24} className="ml-auto shrink-0 text-on-primary" />
      </button>
      {open && (
        <ul
          role="menu"
          aria-label={label}
          className={
            boxed
              ? "absolute right-0 top-full z-40 mt-2.5 flex max-h-80 flex-col gap-2.5 overflow-y-auto rounded-panel bg-menu px-5 py-2.5"
              : "absolute left-0 top-full z-40 mt-2.5 max-h-80 min-w-full overflow-y-auto rounded-panel border border-primary-border bg-menu p-1.5"
          }
        >
          <li role="none">
            <button type="button" role="menuitemradio" aria-checked={value === null} onClick={() => choose(null)} className={item(value === null)}>
              {anyLabel}
            </button>
          </li>
          {options.map((option) => (
            <li key={option.value} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={option.value === value}
                onClick={() => choose(option.value)}
                className={item(option.value === value)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
