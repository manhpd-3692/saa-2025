"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { SectionEmpty, SectionError, SectionLoading } from "./board-section-parts";
import { KudoCard } from "./kudo-card";
import type { KudoPage, SectionResult } from "./kudo-card-types";
import { useAllKudosFeed } from "./use-all-kudos-feed";

/** The next page is requested this far before the sentinel scrolls into view. */
const SENTINEL_MARGIN = "600px";

/**
 * A5 ALL KUDOS (FR-207, SM-001, DEC-003): public kudos newest first; a
 * sentinel near the end asks for the next page; an inline Retry keeps the
 * loaded cards when a page fails; a quiet end marker follows the last card.
 */
export function AllKudosFeed({ initial }: { initial: SectionResult<KudoPage> }) {
  const { t } = useLocale();
  const { items, nextCursor, status, loadMore, retry } = useAllKudosFeed(initial);
  const sentinel = useRef<HTMLDivElement>(null);

  // Re-armed after every page, so a sentinel still in view asks for the next one.
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore();
    }, { rootMargin: SENTINEL_MARGIN });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, items.length, status]);

  if (items.length === 0) {
    if (status === "loading") return <SectionLoading className="h-[760px]" />;
    if (status === "error") return <SectionError onRetry={retry} className="h-[320px]" />;
    return <SectionEmpty message={t("kudos-board.feed.empty")} className="h-[320px]" />;
  }

  return (
    <div data-testid="all-kudos-feed">
      <ul aria-label={t("kudos-board.feed.title")} className="flex flex-col gap-6">
        {items.map((card) => (
          <li key={card.id}>
            <KudoCard card={card} variant="feed" />
          </li>
        ))}
      </ul>
      {nextCursor === null ? (
        <p data-testid="feed-end" className="mt-10 text-center text-base font-bold text-compose-muted">
          {t("kudos-board.feed.end")}
        </p>
      ) : status === "error" ? (
        <div role="alert" className="mt-6 flex items-center justify-center gap-4 text-base font-bold text-white">
          {t("kudos-board.feed.loadMoreError")}
          <button type="button" onClick={retry} className="h-10 rounded-panel bg-primary px-4 text-on-primary hover:bg-primary-hover">
            {t("common.retry")}
          </button>
        </div>
      ) : (
        <div ref={sentinel} role="status" data-testid="feed-sentinel" className="mt-6 flex h-12 items-center justify-center text-base font-bold text-compose-muted">
          {status === "loadingMore" ? t("kudos-board.feed.loadingMore") : ""}
        </div>
      )}
    </div>
  );
}
