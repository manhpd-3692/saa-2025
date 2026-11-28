"use client";

import type { MentionNodeAttrs, MentionOptions } from "@tiptap/extension-mention";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { useState } from "react";
import { searchSunners, type SunnerOption } from "./kudo-compose-api";
import type { MentionListState } from "./mention-suggestion-list";
import { SEARCH_DEBOUNCE_MS } from "./recipient-combobox";

type MentionProps = SuggestionProps<SunnerOption, MentionNodeAttrs>;

/**
 * Tiptap `@` suggestion config (FR-204) whose list is rendered by React
 * (MentionSuggestionList). The editor is created once, so the config is built
 * once and talks to React only through a setter and a ref. ArrowUp/ArrowDown
 * move, Enter/Tab pick, Escape closes the list without closing the window.
 */
function createMentionSuggestion(
  publish: (next: MentionListState | null) => void,
  current: () => MentionListState | null,
): MentionOptions["suggestion"] {
  const show = (props: MentionProps) => {
    const rect = props.clientRect?.();
    const previous = current();
    publish({
      items: props.items,
      loading: props.loading,
      active: previous ? Math.min(previous.active, Math.max(props.items.length - 1, 0)) : 0,
      anchor: rect ? { left: rect.left, bottom: rect.bottom } : null,
      pick: (sunner) => props.command({ id: sunner.id, label: sunner.name }),
    });
  };
  const onKeyDown = ({ event }: SuggestionKeyDownProps): boolean => {
    const list = current();
    if (!list) return false;
    if (event.key === "Escape") {
      publish(null);
      return true;
    }
    const count = list.items.length;
    if (count === 0) return false;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const step = event.key === "ArrowDown" ? 1 : count - 1;
      publish({ ...list, active: (list.active + step) % count });
      return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      list.pick(list.items[list.active]);
      return true;
    }
    return false;
  };
  return {
    char: "@",
    debounce: SEARCH_DEBOUNCE_MS,
    items: ({ query, signal }) => searchSunners(query, signal).catch(() => []),
    render: () => ({
      onStart: show,
      onUpdate: show,
      onKeyDown,
      onExit: () => publish(null),
    }),
  };
}

export function useMentionSuggestion() {
  const [list, setList] = useState<MentionListState | null>(null);
  const [suggestion] = useState(() => {
    let current: MentionListState | null = null; // what the plugin's key handler reads
    return createMentionSuggestion(
      (next) => {
        current = next;
        setList(next);
      },
      () => current,
    );
  });
  return { suggestion, list };
}
