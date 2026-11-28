"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CloseIcon } from "@/components/shell/shell-icons";
import { useLocale } from "@/i18n/locale-provider";
import { AddButton, DROPDOWN_PANEL_CLASS, useCloseOnOutsidePress } from "./compose-field-parts";
import { CheckCircleIcon } from "./compose-icons";
import { listHashtags, type HashtagOption } from "./kudo-compose-api";
import { HASHTAGS_MAX, normalizeHashtag, normalizeHashtags } from "./kudo-input-schema";
import { SEARCH_DEBOUNCE_MS } from "./recipient-combobox";

function useHashtagOptions(query: string, enabled: boolean) {
  const [options, setOptions] = useState<HashtagOption[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      listHashtags(query, controller.signal).then(setOptions, () => {
        if (!controller.signal.aborted) setOptions([]);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled]);
  return options;
}

/**
 * F005 A3 hashtags (Figma 1002:13013, 1002:13094): 1–5 shared tags picked from
 * the dropdown or typed as a new one, shown as removable chips. Names are
 * normalized like Go (BR-002: no leading `#`, lower-case, de-duplicated); at 5
 * the add button is disabled while chips stay removable (DEC-002).
 */
export function HashtagPicker({ value, onChange, invalid, labelId }: {
  value: string[];
  onChange: (names: string[]) => void;
  invalid: boolean;
  labelId: string;
}) {
  const { t } = useLocale();
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const options = useHashtagOptions(query, open);
  const close = useCallback(() => setOpen(false), []);
  useCloseOnOutsidePress(ref, open, close);
  const full = value.length >= HASHTAGS_MAX;

  function toggle(name: string) {
    if (value.includes(name)) onChange(value.filter((n) => n !== name));
    else if (!full) onChange(normalizeHashtags([...value, name]).names);
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const name = normalizeHashtag(query);
      if (!name || full || value.includes(name)) return;
      const next = normalizeHashtags([...value, name]);
      if (next.code) return;
      onChange(next.names);
      setQuery("");
    }
  }

  return (
    <div ref={ref} className="relative flex flex-wrap items-center gap-2" role="group" aria-labelledby={labelId} data-invalid={invalid || undefined}>
      {value.map((name) => (
        <span key={name} className={`flex h-12 items-center gap-2 rounded-panel border bg-white pl-4 pr-2 text-base font-bold text-on-primary ${invalid ? "border-danger" : "border-primary-border"}`}>
          #{name}
          <button type="button" aria-label={`${t("kudo-compose.hashtag.remove")} #${name}`} onClick={() => toggle(name)} className="rounded-control p-1 hover:bg-compose-active">
            <CloseIcon size={20} />
          </button>
        </span>
      ))}
      <span className={invalid && value.length === 0 ? "rounded-panel ring-1 ring-danger" : undefined}>
        <AddButton label={t("kudo-compose.hashtag.add")} hint={t("kudo-compose.hashtag.max")} disabled={full} expanded={open} onClick={() => setOpen(!open)} testId="hashtag-add" />
      </span>
      {open && (
        <div className={`${DROPDOWN_PANEL_CLASS} left-0 top-full mt-1 w-[318px]`}>
          <input
            autoFocus
            aria-label={t("kudo-compose.hashtag.search")}
            placeholder={t("kudo-compose.hashtag.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="mb-1 h-10 w-full rounded-control bg-white/10 px-3 text-sm font-bold text-white placeholder:text-compose-muted focus:outline-none"
          />
          <ul id={listId} role="listbox" aria-multiselectable="true" aria-label={t("kudo-compose.hashtag.list")} className="max-h-[320px] overflow-y-auto">
            {options.length === 0 && <li className="px-4 py-2 text-sm font-bold text-compose-muted">{t("kudo-compose.hashtag.empty")}</li>}
            {options.map((option) => {
              const selected = value.includes(option.name);
              return (
                <li
                  key={option.id}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={!selected && full}
                  onClick={() => toggle(option.name)}
                  className={`flex h-10 cursor-pointer items-center justify-between rounded-control px-4 text-base font-bold text-white hover:bg-primary-soft ${selected ? "bg-primary-muted" : ""} ${!selected && full ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  #{option.name}
                  {selected && <CheckCircleIcon size={20} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
