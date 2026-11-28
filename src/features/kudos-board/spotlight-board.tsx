"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { BoardSectionHeading, SectionError, SectionLoading } from "./board-section-parts";
import { fillText, formatCount, formatTickerTime, normalizeSearchText } from "./kudo-board-format";
import type { SectionResult, SpotlightData } from "./kudo-card-types";
import { fetchSpotlight, profilePath } from "./kudos-board-api";
import { ExpandIcon, SearchIcon } from "./kudos-board-icons";
import { layoutCloud } from "./spotlight-cloud-layout";
import { useBoardSection } from "./use-board-section";

const NAME_SIZE = ["", "text-[10px]", "text-[11px]", "text-xs", "text-sm", "text-base"];

/**
 * A4 SPOTLIGHT BOARD (FR-205, FR-206): the public kudos counter, a word cloud
 * of receivers sized by kudos received (ALG-002; each name opens the profile)
 * and the latest receivers. Search runs on the loaded names, ignoring case and
 * Vietnamese accents (BR-004): matches are emphasized, the rest dimmed.
 */
export function SpotlightBoard({ initial }: { initial: SectionResult<SpotlightData> }) {
  const { locale, t } = useLocale();
  const { data, status, retry } = useBoardSection({ key: "spotlight", initialKey: "spotlight", initial, load: fetchSpotlight });
  const [query, setQuery] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const placed = useMemo(() => layoutCloud(data?.names ?? []), [data]);
  const needle = normalizeSearchText(query);
  const matches = needle ? placed.filter((n) => normalizeSearchText(n.name).includes(needle)) : [];
  const matched = new Set(matches.map((n) => n.userId));

  return (
    <section aria-labelledby="spotlight-title" className="mt-[132px]" data-testid="spotlight-section">
      <BoardSectionHeading id="spotlight-title" title={t("kudos-board.spotlight.title")} />
      <div className="mt-16">
        {status === "loading" && <SectionLoading className="h-[548px]" />}
        {status === "error" && <SectionError onRetry={retry} className="h-[548px]" />}
        {status === "ready" && data && (
          <div ref={panel} className="relative h-[548px] overflow-hidden rounded-[40px] border border-primary-border bg-menu">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[url(/images/home/home-key-visual.webp)] bg-[position:-350px_-230px] bg-no-repeat opacity-40 [mask-image:linear-gradient(to_top,#000,transparent_80%)]" />
            <div className="relative flex h-[70px] items-center px-6">
              <label className="flex h-[38px] w-[218px] items-center gap-2 rounded-full border border-primary-border bg-primary-soft px-3">
                <SearchIcon size={18} className="shrink-0 text-white" />
                <span className="sr-only">{t("kudos-board.spotlight.searchLabel")}</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("kudos-board.spotlight.search")}
                  data-testid="spotlight-search"
                  className="w-full bg-transparent text-xs font-bold text-white outline-none placeholder:text-white/80"
                />
              </label>
              <p className="absolute left-1/2 -translate-x-1/2 text-4xl font-bold leading-[44px] text-white" data-testid="spotlight-total">
                {fillText(t("kudos-board.spotlight.total"), { count: formatCount(data.total, locale) })}
              </p>
            </div>
            <p aria-live="polite" className="absolute left-6 top-[66px] text-xs font-bold text-primary" data-testid="spotlight-search-status">
              {needle ? (matches.length === 0 ? t("kudos-board.spotlight.noResult") : fillText(t("kudos-board.spotlight.matches"), { count: matches.length })) : ""}
            </p>
            {placed.length === 0 ? (
              <p className="relative mt-40 text-center text-base font-bold text-white">{t("kudos-board.spotlight.empty")}</p>
            ) : (
              <ul aria-label={t("kudos-board.spotlight.names")} className="absolute inset-x-10 bottom-4 top-[86px]">
                {placed.map((n) => (
                  <li key={n.userId} className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
                    <Link
                      href={profilePath(n.userId)}
                      title={fillText(t("kudos-board.spotlight.kudosCount"), { name: n.name, count: n.count })}
                      data-match={matched.has(n.userId) || undefined}
                      className={`font-bold transition-opacity hover:underline ${
                        matched.has(n.userId)
                          ? `${NAME_SIZE[NAME_SIZE.length - 1]} text-compose-link`
                          : `${NAME_SIZE[n.step]} text-white ${needle ? "opacity-30" : ""}`
                      }`}
                    >
                      {n.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {/* Oldest line on top, faded; the newest at the bottom (Figma ticker). */}
            <ol className="absolute bottom-6 left-12 flex flex-col text-sm font-bold leading-5 text-white" data-testid="spotlight-recent">
              {[...data.recent].reverse().map((r, i, lines) => (
                <li key={`${r.receiverId}-${r.createdAt}`} style={{ opacity: (i + 1) / lines.length }}>
                  <span className="text-white/80">{formatTickerTime(r.createdAt)}</span>{" "}
                  {fillText(t("kudos-board.spotlight.recent"), { name: r.receiverName })}
                </li>
              ))}
            </ol>
            <button
              type="button"
              aria-label={t("kudos-board.spotlight.fullscreen")}
              onClick={() => void panel.current?.requestFullscreen?.()}
              className="absolute bottom-6 right-10 text-white hover:text-primary"
            >
              <ExpandIcon size={22} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
