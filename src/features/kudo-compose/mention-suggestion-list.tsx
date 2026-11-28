"use client";

import { useLocale } from "@/i18n/locale-provider";
import { DROPDOWN_PANEL_CLASS, SunnerAvatar } from "./compose-field-parts";
import type { SunnerOption } from "./kudo-compose-api";

export interface MentionListState {
  items: SunnerOption[];
  loading: boolean;
  active: number;
  /** Caret box in viewport coordinates; the list opens below it. */
  anchor: { left: number; bottom: number } | null;
  pick: (sunner: SunnerOption) => void;
}

/**
 * F005 FR-204 "@ + tên" suggestions: the same Sunner search as the recipient
 * field (A2), shown under the caret; an empty result says so and inserts
 * nothing (US006 error path).
 */
export function MentionSuggestionList({ state }: { state: MentionListState }) {
  const { t } = useLocale();
  if (!state.anchor) return null;
  return (
    <ul
      role="listbox"
      aria-label={t("kudo-compose.mention.list")}
      data-testid="mention-list"
      style={{ left: state.anchor.left, top: state.anchor.bottom + 4 }}
      className={`${DROPDOWN_PANEL_CLASS} fixed z-[70] w-[360px]`}
    >
      {state.items.length === 0 && (
        <li className="px-4 py-3 text-sm font-bold text-compose-muted">
          {t(state.loading ? "kudo-compose.recipient.searching" : "kudo-compose.recipient.empty")}
        </li>
      )}
      {state.items.map((sunner, i) => (
        <li
          key={sunner.id}
          role="option"
          aria-selected={i === state.active}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => state.pick(sunner)}
          className={`flex cursor-pointer items-center gap-3 rounded-control px-3 py-2 ${i === state.active ? "bg-primary-muted" : ""}`}
        >
          <SunnerAvatar name={sunner.name} url={sunner.avatarUrl} size={36} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold text-white">{sunner.name}</span>
            {sunner.unitCode && <span className="text-xs font-bold text-compose-muted">{sunner.unitCode}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
