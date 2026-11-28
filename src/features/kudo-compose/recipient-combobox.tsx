"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CaretDownIcon } from "@/components/shell/shell-icons";
import { useLocale } from "@/i18n/locale-provider";
import { borderFor, DROPDOWN_PANEL_CLASS, INPUT_CLASS, SunnerAvatar, useCloseOnOutsidePress } from "./compose-field-parts";
import { searchSunners, type SunnerOption } from "./kudo-compose-api";

/** RECIPIENT_SEARCH_DEBOUNCE_MS (F005 § 4.6). */
export const SEARCH_DEBOUNCE_MS = 250;

/** Debounced Sunner search, shared by the recipient combobox and the @mention list (A2, DRY). */
export function useSunnerSearch(query: string, enabled: boolean) {
  const [state, setState] = useState<{ query: string; results: SunnerOption[] | null; failed: boolean }>({ query: "", results: null, failed: false });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchSunners(query.trim(), controller.signal).then(
        (results) => setState({ query, results, failed: false }),
        () => {
          if (!controller.signal.aborted) setState({ query, results: [], failed: true });
        },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled]);
  const settled = state.query === query;
  return { results: settled ? state.results : null, failed: settled && state.failed };
}

/**
 * F005 A2 recipient field (Figma 828:10943): typing searches Sunners by name
 * (the caller is never offered, BR-001); each row shows avatar, name and unit.
 * Locked in edit mode (D004): the recipient is shown but cannot change.
 */
export function RecipientCombobox({ value, onChange, locked, invalid, labelId }: {
  value: SunnerOption | null;
  onChange: (sunner: SunnerOption) => void;
  locked: boolean;
  invalid: boolean;
  labelId: string;
}) {
  const { t } = useLocale();
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const { results, failed } = useSunnerSearch(query, open);
  const close = useCallback(() => setOpen(false), []);
  useCloseOnOutsidePress(ref, open, close);

  if (locked) {
    return (
      <div
        aria-labelledby={labelId}
        aria-disabled="true"
        title={t("kudo-compose.recipient.locked")}
        data-testid="recipient-locked"
        className="flex h-14 w-full items-center justify-between rounded-panel bg-white px-6 text-base font-bold text-on-primary shadow-[0_4px_8px_rgb(0_0_0/0.15)]"
      >
        <span className="truncate">{value?.name}</span>
        <CaretDownIcon size={24} className="text-compose-muted" />
      </div>
    );
  }

  function choose(sunner: SunnerOption) {
    onChange(sunner);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = results?.length ?? 0;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      if (count) setActive((i) => (i + 1) % count);
    } else if (event.key === "ArrowUp" && count) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? count - 1 : i - 1));
    } else if (event.key === "Enter" && open && results?.[active]) {
      event.preventDefault();
      choose(results[active]);
    }
  }

  return (
    <div ref={ref} className="relative w-full">
      <input
        role="combobox"
        aria-labelledby={labelId}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid}
        autoComplete="off"
        placeholder={t("kudo-compose.recipient.placeholder")}
        value={open ? query : (value?.name ?? "")}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={`${INPUT_CLASS} ${borderFor(invalid)} pr-14 focus:border-primary`}
      />
      <CaretDownIcon size={24} className="pointer-events-none absolute right-6 top-4 text-on-primary" />
      {open && (
        <ul id={listId} role="listbox" aria-labelledby={labelId} className={`${DROPDOWN_PANEL_CLASS} left-0 right-0 top-full mt-1 max-h-[320px] overflow-y-auto`}>
          {results === null && <li className="px-4 py-3 text-sm font-bold text-compose-muted">{t("kudo-compose.recipient.searching")}</li>}
          {results?.length === 0 && (
            <li className="px-4 py-3 text-sm font-bold text-compose-muted">
              {t(failed ? "kudo-compose.recipient.searchFailed" : "kudo-compose.recipient.empty")}
            </li>
          )}
          {results?.map((sunner, i) => (
            <li
              key={sunner.id}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(sunner)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-4 rounded-control px-3 py-2 ${i === active ? "bg-primary-muted" : ""}`}
            >
              <SunnerAvatar name={sunner.name} url={sunner.avatarUrl} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-base font-bold text-white">{sunner.name}</span>
                {sunner.unitCode && <span className="text-sm font-bold text-compose-muted">{sunner.unitCode}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
