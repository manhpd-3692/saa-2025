"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { BoardSectionHeading, SectionEmpty, SectionError, SectionLoading } from "./board-section-parts";
import { FilterDropdown } from "./filter-dropdown";
import { fillText } from "./kudo-board-format";
import { KudoCard } from "./kudo-card";
import type { FilterOptions, HighlightFilter, KudoPage, SectionResult } from "./kudo-card-types";
import { fetchFilterOptions, fetchHighlight, kudoDetailPath } from "./kudos-board-api";
import { ArrowUpRightIcon, ChevronLeftIcon, ChevronRightIcon } from "./kudos-board-icons";
import { useBoardSection } from "./use-board-section";

const CARD_STEP = 552; // card width 528 + gap 24
const CENTER_OFFSET = 352; // the current card at x 552 of the page, as in Figma (track window starts at 200)
const NO_FILTER: HighlightFilter = { hashtagId: null, unitId: null };
const filterKey = (f: HighlightFilter) => `${f.hashtagId ?? ""}|${f.unitId ?? ""}`;

/**
 * A2/A3 HIGHLIGHT KUDOS, the Kudos Quốc Dân top 5 (BR-003, G12): one enlarged
 * card at a time with neighbours peeking at the sides, previous/next disabled
 * at the ends and an "n/5" indicator (FR-202, DEC-001). Hashtag and Phòng ban
 * filters (receiver's unit) re-rank inside the filtered set and reset to the
 * first card (FR-203, FR-204); no match shows an empty state with "clear".
 */
export function HighlightCarousel({ initial, initialOptions }: {
  initial: SectionResult<KudoPage>;
  initialOptions: SectionResult<FilterOptions>;
}) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<HighlightFilter>(NO_FILTER);
  const key = filterKey(filter);
  const highlight = useBoardSection({ key, initialKey: filterKey(NO_FILTER), initial, load: () => fetchHighlight(filter) });
  const options = useBoardSection({ key: "options", initialKey: "options", initial: initialOptions, load: fetchFilterOptions });
  const [position, setPosition] = useState({ key, index: 0 });

  const items = highlight.data?.items ?? [];
  const index = position.key === key ? Math.min(position.index, Math.max(items.length - 1, 0)) : 0;
  const go = (next: number) => setPosition({ key, index: next });

  const hashtagChoices = (options.data?.hashtags ?? []).map((h) => ({ id: h.id, label: `#${h.name}` }));
  const unitChoices = (options.data?.units ?? []).map((u) => ({ id: u.id, label: u.code }));

  return (
    <section aria-labelledby="highlight-title" className="mt-8" data-testid="highlight-section">
      <BoardSectionHeading id="highlight-title" title={t("kudos-board.highlight.title")}>
        <div className="flex gap-2">
          <FilterDropdown
            label={t("kudos-board.filter.hashtag")}
            choices={hashtagChoices}
            value={filter.hashtagId}
            onChange={(hashtagId) => setFilter({ ...filter, hashtagId })}
            testId="filter-hashtag"
          />
          <FilterDropdown
            label={t("kudos-board.filter.unit")}
            choices={unitChoices}
            value={filter.unitId}
            onChange={(unitId) => setFilter({ ...filter, unitId })}
            testId="filter-unit"
          />
        </div>
      </BoardSectionHeading>

      <div className="mt-10">
        {highlight.status === "loading" && <SectionLoading className="mx-auto h-[524px] w-[528px]" />}
        {highlight.status === "error" && <SectionError onRetry={highlight.retry} className="mx-auto h-[524px] w-[528px]" />}
        {highlight.status === "ready" && items.length === 0 && (
          <SectionEmpty message={t("kudos-board.highlight.empty")} className="mx-auto h-[300px] w-[528px]">
            {key !== filterKey(NO_FILTER) && (
              <button type="button" onClick={() => setFilter(NO_FILTER)} className="text-base font-bold text-primary underline">
                {t("kudos-board.highlight.clearFilters")}
              </button>
            )}
          </SectionEmpty>
        )}
        {highlight.status === "ready" && items.length > 0 && (
          <div role="region" aria-roledescription="carousel" aria-label={t("kudos-board.highlight.title")}>
            <div className="relative h-[524px]">
              <button
                type="button"
                aria-label={t("kudos-board.highlight.prev")}
                disabled={index === 0}
                onClick={() => go(index - 1)}
                className="absolute left-[-48px] top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full text-white hover:bg-primary-soft disabled:opacity-30"
              >
                <ChevronLeftIcon size={40} />
              </button>
              <div className="absolute inset-y-0 left-14 w-[1040px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_200px,#000_880px,transparent)]">
                <ul
                  className="flex gap-6 transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(${CENTER_OFFSET - index * CARD_STEP}px)` }}
                >
                  {items.map((card, i) => (
                    <li key={card.id} className="shrink-0" aria-hidden={i !== index} inert={i !== index}>
                      <KudoCard
                        card={card}
                        variant="highlight"
                        actions={
                          <Link href={kudoDetailPath(card.id)} scroll={false} className="flex h-10 items-center gap-1 rounded-control px-2 text-base font-bold hover:bg-primary/40">
                            {t("kudos-board.highlight.viewDetail")}
                            <ArrowUpRightIcon size={20} />
                          </Link>
                        }
                      />
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                aria-label={t("kudos-board.highlight.next")}
                disabled={index >= items.length - 1}
                onClick={() => go(index + 1)}
                className="absolute left-[1092px] top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full text-white hover:bg-primary-soft disabled:opacity-30"
              >
                <ChevronRightIcon size={40} />
              </button>
            </div>
            <div className="mt-10 flex items-center justify-center gap-8">
              <button type="button" aria-label={t("kudos-board.highlight.prev")} disabled={index === 0} onClick={() => go(index - 1)} className="text-white disabled:opacity-30">
                <ChevronLeftIcon size={28} />
              </button>
              <p
                aria-live="polite"
                aria-label={fillText(t("kudos-board.highlight.position"), { current: index + 1, total: items.length })}
                data-testid="highlight-position"
                className="font-bold"
              >
                <span className="text-5xl leading-[56px] text-primary">{index + 1}</span>
                <span className="text-[32px] leading-10 text-compose-muted">/{items.length}</span>
              </p>
              <button type="button" aria-label={t("kudos-board.highlight.next")} disabled={index >= items.length - 1} onClick={() => go(index + 1)} className="text-white disabled:opacity-30">
                <ChevronRightIcon size={28} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
