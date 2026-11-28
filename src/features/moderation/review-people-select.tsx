"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { CaretDownIcon } from "@/components/shell/shell-icons";
import { useDismissablePopover } from "@/components/shell/use-dismissable-popover";
import { classifyAdminCallFailure, loginHref } from "@/features/admin/admin-call-failure";
import { useReportNavigation } from "@/features/admin/report-navigation";
import { SunnerAvatar } from "@/features/kudo-compose/compose-field-parts";
import { useLocale } from "@/i18n/locale-provider";
import { goApiBrowser } from "@/lib/api/go-api-browser";
import { MODERATION_PATHS, PEOPLE_DEBOUNCE_MS, type ReviewPerson } from "./moderation-api";

type PeopleState = { term: string; people: ReviewPerson[] | "failed" };

/** A2 options (BR-009) for the open list, re-read as the admin types (debounced). */
function usePeople(role: "sender" | "receiver", term: string, enabled: boolean) {
  const { reload, navigate } = useReportNavigation();
  const [state, setState] = useState<PeopleState | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      goApiBrowser<{ items: ReviewPerson[] }>(MODERATION_PATHS.people(role, term), { signal: controller.signal }).then(
        (answer) => setState({ term, people: answer.items }),
        (error: unknown) => {
          if (controller.signal.aborted) return;
          const failure = classifyAdminCallFailure(error);
          if (failure === "sign-in") navigate(loginHref(window.location.pathname + window.location.search));
          if (failure === "forbidden") reload();
          setState({ term, people: "failed" });
        },
      );
    }, PEOPLE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [role, term, enabled, reload, navigate]);
  return state?.term === term ? state.people : null;
}

/**
 * Sender / Receiver filter (Figma 1002:15428, 1002:15464; FR-201, FR-202):
 * a field like the other admin dropdowns that opens a dark list of the people
 * who sent (received) a kudo with avatar, name and unit code, narrowed by the
 * search box on top; "All" clears the filter. Picking one sets the filter.
 */
export function ReviewPeopleSelect({ role, label, placeholder, value, onChange, testId }: {
  role: "sender" | "receiver";
  label: string;
  placeholder: string;
  value: ReviewPerson | null;
  onChange: (id: string | null) => void;
  testId: string;
}) {
  const { t } = useLocale();
  const listId = useId();
  const { open, setOpen, ref } = useDismissablePopover<HTMLDivElement>();
  const [text, setText] = useState("");
  const [active, setActive] = useState(-1);
  const term = text.trim();
  const people = usePeople(role, term, open);
  const options = Array.isArray(people) ? people : [];

  function choose(id: string | null) {
    setOpen(false);
    ref.current?.querySelector<HTMLElement>("[data-popover-trigger]")?.focus();
    if (id !== (value?.id ?? null)) onChange(id);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = options.length + 1; // "All" first
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (event.key === "ArrowDown" ? (i + 1) % count : i <= 0 ? count - 1 : i - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(active === 0 ? null : options[active - 1].id);
    }
  }

  const row = (i: number) => `flex w-full cursor-pointer items-center gap-3 rounded-control px-2.5 text-left ${i === active ? "bg-primary-muted" : ""}`;
  return (
    <div ref={ref} className="relative flex w-[258px] flex-col gap-1" data-testid={testId}>
      <span className="text-base leading-5 text-on-primary">{label}</span>
      <button
        type="button"
        data-popover-trigger
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${value ? value.name : placeholder}`}
        onClick={() => {
          setText("");
          setActive(-1);
          setOpen(!open);
        }}
        className={`flex h-12 w-full items-center rounded-panel border bg-white pl-4 pr-1.5 text-left text-sm ${open ? "border-primary" : "border-divider"}`}
      >
        <span className={`truncate ${value ? "text-on-primary" : "text-compose-muted"}`}>{value ? value.name : placeholder}</span>
        <CaretDownIcon size={24} className="ml-auto shrink-0 text-on-primary" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-2.5 w-[380px] rounded-panel border border-primary-border bg-menu p-1.5">
          <input
            type="text"
            autoFocus
            role="combobox"
            aria-label={t("moderation.people.search")}
            aria-controls={listId}
            aria-expanded="true"
            placeholder={t("moderation.people.search")}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            className="mb-1.5 h-10 w-full rounded-control border border-divider bg-page px-3 text-sm text-white placeholder:text-white/50 focus:border-primary focus:outline-none"
          />
          <ul id={listId} role="listbox" aria-label={label} className="max-h-[320px] overflow-y-auto">
            <li role="option" aria-selected={value === null} onClick={() => choose(null)} onMouseEnter={() => setActive(0)} className={`${row(0)} h-10 text-sm text-white`}>
              {t("moderation.filter.any")}
            </li>
            {people === null && <li className="px-3 py-2 text-sm text-white/60">{t("moderation.people.loading")}</li>}
            {people === "failed" && <li role="alert" className="px-3 py-2 text-sm text-danger">{t("moderation.people.failed")}</li>}
            {Array.isArray(people) && people.length === 0 && <li className="px-3 py-2 text-sm text-white/60">{t("moderation.people.empty")}</li>}
            {options.map((person, i) => (
              <li
                key={person.id}
                role="option"
                aria-selected={person.id === value?.id}
                onClick={() => choose(person.id)}
                onMouseEnter={() => setActive(i + 1)}
                className={`${row(i + 1)} h-[60px]`}
              >
                <SunnerAvatar name={person.name} url={person.avatarUrl} size={40} />
                <span className="flex min-w-0 flex-col">
                  <span data-testid="person-name" className="truncate text-base text-white">{person.name}</span>
                  <span className="truncate text-sm text-white/60">{person.unitCode ?? ""}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
