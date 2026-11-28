"use client";

import Link from "next/link";
import { useCallback, useId, useRef, useState } from "react";
import { PencilIcon } from "@/components/shell/shell-icons";
import { useShellActions } from "@/components/shell/shell-actions-context";
import { SunnerAvatar, useCloseOnOutsidePress } from "@/features/kudo-compose/compose-field-parts";
import { useSunnerSearch } from "@/features/kudo-compose/recipient-combobox";
import { useLocale } from "@/i18n/locale-provider";
import { profilePath } from "./kudos-board-api";
import { SearchIcon } from "./kudos-board-icons";

const PILL = "flex h-[72px] items-center gap-4 rounded-full border border-primary-border bg-primary-soft px-6 text-base font-bold text-white backdrop-blur-sm";

/** "Tìm kiếm profile Sunner": find a colleague by name and open the profile (F007). */
function ProfileSearch() {
  const { t } = useLocale();
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { results, failed } = useSunnerSearch(query, open && query.trim().length > 0);
  const close = useCallback(() => setOpen(false), []);
  useCloseOnOutsidePress(ref, open, close);
  const showList = open && query.trim().length > 0;

  return (
    <div ref={ref} className="relative w-[382px]">
      <label className={`${PILL} w-full`}>
        <SearchIcon size={24} className="shrink-0" />
        <input
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listId : undefined}
          aria-label={t("kudos-board.hero.search")}
          placeholder={t("kudos-board.hero.search")}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
          className="w-full bg-transparent text-base font-bold text-white outline-none placeholder:text-white"
        />
      </label>
      {showList && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[320px] overflow-y-auto rounded-panel border border-primary-border bg-menu p-1.5">
          {results === null && <li className="px-4 py-3 text-sm font-bold text-compose-muted">{t("common.loading")}</li>}
          {results?.length === 0 && (
            <li className="px-4 py-3 text-sm font-bold text-white">{t(failed ? "kudos-board.hero.searchError" : "kudos-board.hero.searchEmpty")}</li>
          )}
          {results?.map((sunner) => (
            <li key={sunner.id} role="option" aria-selected={false}>
              <Link href={profilePath(sunner.id)} className="flex items-center gap-3 rounded-control px-3 py-2 text-base font-bold text-white hover:bg-primary-soft">
                <SunnerAvatar name={sunner.name} url={sunner.avatarUrl} size={36} />
                <span className="truncate">{sunner.name}</span>
                {sunner.unitCode && <span className="ml-auto text-sm text-compose-muted">{sunner.unitCode}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * FR-201 key visual of the Live board (Figma 2940:13431 top): "Hệ thống ghi
 * nhận và cảm ơn" over the KUDOS artwork (the logo is part of the image), the
 * "Hôm nay, bạn muốn gửi lời cảm ơn…" pill that opens the write-kudo window
 * (F005), and the Sunner profile search.
 */
export function KudosKeyVisual() {
  const { t } = useLocale();
  const actions = useShellActions();
  return (
    <section className="relative h-[432px]" aria-labelledby="kudos-board-title">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[432px] w-[1440px] -translate-x-1/2 bg-[url(/images/kudos/kudos-key-visual.webp)] bg-no-repeat"
      />
      <div className="relative">
        <h1 id="kudos-board-title" className="pt-[96px] text-4xl font-bold leading-[52px] text-primary">
          {t("kudos-board.hero.title")}
          <span className="sr-only"> {t("kudos-board.hero.logo")}</span>
        </h1>
        <div className="mt-[180px] flex justify-between">
          <button type="button" onClick={() => actions?.runAction("compose")} className={`${PILL} w-[738px] hover:bg-primary-muted`}>
            <PencilIcon size={24} className="shrink-0" />
            {t("kudos-board.hero.compose")}
          </button>
          <ProfileSearch />
        </div>
      </div>
    </section>
  );
}
