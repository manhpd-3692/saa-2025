"use client";

import { useState } from "react";
import { SearchIcon } from "@/features/admin/admin-icons";
import { useLocale } from "@/i18n/locale-provider";

/**
 * Search by content (Figma 832:13197, FR-205): the title or the body's text,
 * case-insensitive (BR-001). Enter or the magnifier searches; an empty search
 * clears `q`. No suggestions: the table itself is the result.
 */
export function ReviewSearchBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const { t } = useLocale();
  const [text, setText] = useState(initial);
  const submit = () => {
    if (text.trim() !== initial) onSearch(text.trim());
  };
  return (
    <div className="relative w-[360px] self-end" data-testid="review-search">
      <input
        type="search"
        aria-label={t("moderation.search.label")}
        placeholder={t("moderation.search.placeholder")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        className="h-12 w-full rounded-panel border border-divider bg-white pl-4 pr-12 text-sm text-on-primary placeholder:text-compose-muted focus:border-primary focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <button type="button" aria-label={t("moderation.search.submit")} onClick={submit} className="absolute right-3 top-3 text-on-primary">
        <SearchIcon size={24} />
      </button>
    </div>
  );
}
