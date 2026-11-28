"use client";

import { useState } from "react";
import { formatLastLogin } from "@/features/admin/admin-table-format";
import { useLocale } from "@/i18n/locale-provider";
import { KudoActionMenu } from "./kudo-action-menu";
import { shortKudoId, type KudoModeration, type ReviewKudo, type ReviewPerson } from "./moderation-api";
import { splitSearchMatches } from "./search-match-highlight";
import { StatusPill } from "./status-pill";

const DASH = "-";
const CELL = "px-3 py-4 align-middle";

function Highlighted({ text, query }: { text: string; query: string }) {
  return splitSearchMatches(text, query).map((run, i) =>
    run.match ? (
      <mark key={i} className="bg-transparent text-danger underline underline-offset-2">
        {run.text}
      </mark>
    ) : (
      run.text
    ),
  );
}

function Person({ person, anonymous }: { person: ReviewPerson | null; anonymous?: boolean }) {
  const { t } = useLocale();
  return (
    <>
      <span className="break-words">{person?.name ?? DASH}</span>
      {anonymous && (
        <span
          data-testid="anonymous-marker"
          title={t("moderation.anonymousHint")}
          className="mt-1 block w-fit rounded-control border border-primary-border px-1.5 text-xs text-primary"
        >
          {t("moderation.anonymous")}
        </span>
      )}
    </>
  );
}

/**
 * One Review content row (FR-101): short ID, the real sender with the
 * Anonymous marker (BR-004), receiver, title in capitals over the body's
 * start with the searched text marked, hashtags (a dash without), the
 * weighted hearts, time, the status pill and the row action. The moderation
 * state lives here so a decision or a 409 refresh updates the pill, the
 * offered action and the row tint at once (a Spam row is lighter, as in
 * Figma 722:16251); the row stays until the next load even when a filter
 * would hide it now (edge case "no flicker").
 */
export function ReviewTableRow({ item, query }: { item: ReviewKudo; query: string }) {
  const { t, locale } = useLocale();
  const [row, setRow] = useState<KudoModeration>({
    status: item.status, moderationVersion: item.moderationVersion, moderatedBy: item.moderatedBy, moderatedAt: item.moderatedAt,
  });
  const time = formatLastLogin(item.createdAt);
  return (
    <tr
      data-testid="review-row"
      data-kudo-id={item.id}
      data-status={row.status}
      data-version={row.moderationVersion}
      className={`border-b border-divider last:border-b-0 ${row.status === "spam" ? "bg-page" : "bg-menu"}`}
    >
      <td className={`${CELL} text-center`}>{shortKudoId(item.id)}</td>
      <td className={CELL}>
        <Person person={item.sender} anonymous={item.isAnonymous} />
      </td>
      <td className={CELL}>
        <Person person={item.receiver} />
      </td>
      <td className={CELL}>
        <p className="line-clamp-1 font-bold uppercase">
          <Highlighted text={item.title} query={query} />
        </p>
        <p className="line-clamp-4">
          <Highlighted text={item.excerpt} query={query} />
        </p>
      </td>
      <td className={`${CELL} text-xs leading-5`}>
        {item.hashtags.length === 0 ? DASH : item.hashtags.map((tag) => <span key={tag} className="block truncate">#{tag}</span>)}
      </td>
      <td className={`${CELL} text-center`}>{new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(item.heartTotal)}</td>
      <td className={`${CELL} text-center leading-6`}>
        {time.date}
        <br />
        {time.time}
      </td>
      <td className={`${CELL} text-center`}>
        <StatusPill status={row.status} label={t(`moderation.status.${row.status}`)} />
      </td>
      <td className={CELL}>
        <KudoActionMenu kudoId={item.id} title={item.title} row={row} onRow={setRow} />
      </td>
    </tr>
  );
}
