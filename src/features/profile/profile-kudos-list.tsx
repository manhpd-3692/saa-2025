"use client";

import { useEffect, useRef } from "react";
import { BoardSectionHeading, SectionLoading } from "@/features/kudos-board/board-section-parts";
import { KudoCard } from "@/features/kudos-board/kudo-card";
import type { KudoPage, SectionResult } from "@/features/kudos-board/kudo-card-types";
import { useLocale } from "@/i18n/locale-provider";
import type { ProfileCounts, ProfileFilter } from "./profile-api";
import { ProfileKudosFilter } from "./profile-kudos-filter";
import { useProfileKudos } from "./use-profile-kudos";

/** "Could not load kudos" with Retry; the cards already shown stay (US002 error path). */
function ListError({ onRetry }: { onRetry: () => void }) {
  const { t } = useLocale();
  return (
    <div role="alert" className="flex items-center justify-center gap-4 rounded-panel border border-primary-border bg-menu px-6 py-4 text-base font-bold text-white">
      {t("profile.list.error")}
      <button type="button" onClick={onRetry} className="h-10 rounded-panel bg-primary px-4 text-on-primary hover:bg-primary-hover">
        {t("common.retry")}
      </button>
    </div>
  );
}

/**
 * KUDOS section of a profile (FR-204..FR-206, FR-302, FR-401, FR-402): the
 * F006 kudo cards newest first, the received/sent dropdown, "Xem thêm" for
 * the next 10 and the empty, loading and error states. After "Xem thêm" the
 * first new card takes focus (screen spec § 9).
 */
export function ProfileKudosList({ userId, counts, initialFilter, initial }: {
  userId: string;
  counts: ProfileCounts | null;
  initialFilter: ProfileFilter;
  initial: SectionResult<KudoPage>;
}) {
  const { t } = useLocale();
  const { filter, items, nextCursor, status, failure, changeFilter, loadMore, retry } = useProfileKudos(userId, initialFilter, initial);
  const list = useRef<HTMLUListElement>(null);
  const focusFrom = useRef<number | null>(null);

  useEffect(() => {
    const from = focusFrom.current;
    if (from === null || items.length <= from) return;
    focusFrom.current = null;
    (list.current?.children[from] as HTMLElement | undefined)?.focus();
  }, [items.length]);

  function more() {
    focusFrom.current = items.length;
    loadMore();
  }

  let body;
  if (items.length === 0) {
    if (status === "loading") body = <SectionLoading className="h-[400px]" />;
    else if (status === "error") body = <ListError onRetry={retry} />;
    else {
      body = (
        <p data-testid="profile-kudos-empty" className="rounded-3xl border border-primary-border bg-menu p-8 text-center text-base font-bold text-white">
          {t("profile.list.empty")}
        </p>
      );
    }
  } else {
    body = (
      <>
        {status === "error" && failure?.kind === "first" && (
          <div className="mb-6">
            <ListError onRetry={retry} />
          </div>
        )}
        <ul
          ref={list}
          data-testid="profile-kudos-list"
          aria-busy={status === "loading"}
          aria-label={t(`profile.filter.${filter}`)}
          className={`flex flex-col gap-6 ${status === "loading" ? "opacity-60" : ""}`}
        >
          {items.map((card) => (
            <li key={card.id} tabIndex={-1} className="rounded-3xl outline-offset-4">
              <KudoCard card={card} variant="feed" />
            </li>
          ))}
        </ul>
        {status === "error" && failure?.kind === "more" ? (
          <div className="mt-6">
            <ListError onRetry={retry} />
          </div>
        ) : (
          nextCursor && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={more}
                disabled={status !== "ready"}
                aria-busy={status === "loadingMore"}
                className="h-14 rounded-panel border border-primary-border bg-primary-soft px-10 text-base font-bold text-white hover:bg-primary-muted disabled:cursor-wait disabled:opacity-60"
              >
                {t("profile.list.loadMore")}
              </button>
            </div>
          )
        )}
      </>
    );
  }

  return (
    <section aria-labelledby="profile-kudos-title" data-testid="profile-kudos-section" className="mt-[120px] w-full">
      <BoardSectionHeading id="profile-kudos-title" title={t("profile.title")}>
        <ProfileKudosFilter value={filter} counts={counts} onChange={changeFilter} />
      </BoardSectionHeading>
      <p role="status" className="sr-only">
        {status === "loading" || status === "loadingMore" ? t("profile.list.loading") : ""}
      </p>
      <div className="mt-10">{body}</div>
    </section>
  );
}
