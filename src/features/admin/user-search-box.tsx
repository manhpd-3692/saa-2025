"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { useDismissablePopover } from "@/components/shell/use-dismissable-popover";
import { SunnerAvatar } from "@/features/kudo-compose/compose-field-parts";
import { useLocale } from "@/i18n/locale-provider";
import { goApiBrowser } from "@/lib/api/go-api-browser";
import { classifyAdminCallFailure, loginHref } from "./admin-call-failure";
import { SearchIcon } from "./admin-icons";
import {
  ADMIN_REPORT_PATHS, SUGGEST_DEBOUNCE_MS, SUGGEST_LIMIT, SUGGEST_MIN_CHARS,
  usersPageHref, type DirectoryUser, type UserDirectoryPage, type UserDirectoryQuery,
} from "./admin-reports-api";
import { useReportNavigation } from "./report-navigation";

/**
 * A5 suggestions: the directory read itself with 8 rows (no second search
 * endpoint), under the current filters so they match the table (SC-003),
 * debounced, from 2 characters. Like every admin call: 401 → Login (review W2),
 * 403 → the page reloads into Forbidden (P3 review W3).
 */
function useUserSuggestions(term: string, query: UserDirectoryQuery, enabled: boolean) {
  const { reload, navigate } = useReportNavigation();
  const [state, setState] = useState<{ term: string; rows: DirectoryUser[] }>({ term: "", rows: [] });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      goApiBrowser<UserDirectoryPage>(ADMIN_REPORT_PATHS.users({ ...query, q: term, page: 1 }, SUGGEST_LIMIT), { signal: controller.signal }).then(
        (page) => setState({ term, rows: page.rows }),
        (error: unknown) => {
          if (controller.signal.aborted) return;
          const failure = classifyAdminCallFailure(error);
          if (failure === "sign-in") navigate(loginHref(window.location.pathname + window.location.search));
          if (failure === "forbidden") reload();
          setState({ term, rows: [] });
        },
      );
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term, query, enabled, reload, navigate]);
  return state.term === term ? state.rows : null;
}

/**
 * Search box with the suggestion list (Figma 1002:15639, FR-203): name or
 * email, case-insensitive (BR-005). Picking a suggestion searches its email;
 * Enter searches the typed text; an empty search clears `q`.
 */
export function UserSearchBox({ query }: { query: UserDirectoryQuery }) {
  const { t } = useLocale();
  const { navigate } = useReportNavigation();
  const listId = useId();
  const { open, setOpen, ref } = useDismissablePopover<HTMLDivElement>();
  const [text, setText] = useState(query.q);
  const [active, setActive] = useState(-1);
  const term = text.trim();
  const suggesting = open && term.length >= SUGGEST_MIN_CHARS;
  const rows = useUserSuggestions(term, query, suggesting);

  function search(q: string) {
    setOpen(false);
    setText(q);
    navigate(usersPageHref({ ...query, q: q.trim(), page: 1 }));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = suggesting ? (rows?.length ?? 0) : 0;
    if (event.key === "ArrowDown" && count) {
      event.preventDefault();
      setActive((i) => (i + 1) % count);
    } else if (event.key === "ArrowUp" && count) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? count - 1 : i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const picked = suggesting && rows?.[active];
      search(picked ? picked.email : text);
    }
  }

  return (
    <div ref={ref} className="relative w-[258px] self-end" data-testid="user-search">
      <input
        type="text"
        role="combobox"
        aria-label={t("admin.users.search.label")}
        aria-expanded={suggesting}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={t("admin.users.search.placeholder")}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={`h-12 w-full rounded-panel border bg-white pl-4 pr-12 text-sm text-on-primary placeholder:text-compose-muted focus:outline-none ${
          suggesting ? "border-primary" : "border-divider"
        }`}
      />
      <button
        type="button"
        aria-label={t("admin.users.search.submit")}
        onClick={() => search(text)}
        className="absolute right-3 top-3 text-on-primary"
      >
        <SearchIcon size={24} />
      </button>
      {suggesting && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("admin.users.search.suggestions")}
          className="absolute right-0 top-full z-40 mt-2.5 w-[380px] rounded-panel border border-primary-border bg-menu p-1.5"
        >
          {rows === null && <li className="px-3 py-2 text-sm text-white/60">{t("admin.users.search.loading")}</li>}
          {rows?.length === 0 && <li className="px-3 py-2 text-sm text-white/60">{t("admin.users.search.empty")}</li>}
          {rows?.map((user, i) => (
            <li
              key={user.id}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => search(user.email)}
              onMouseEnter={() => setActive(i)}
              className={`flex h-[60px] cursor-pointer items-center gap-3 rounded-control px-2.5 ${i === active ? "bg-primary-muted" : ""}`}
            >
              <SunnerAvatar name={user.name} url={user.avatarUrl} size={40} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-base text-white">{user.name}</span>
                <span className="truncate text-sm text-white/60">{user.email}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
