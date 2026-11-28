"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { PencilIcon } from "@/components/shell/shell-icons";
import { useShellActions } from "@/components/shell/shell-actions-context";
import { useLocale } from "@/i18n/locale-provider";
import { CopyLinkButton } from "./copy-link-button";
import { HashtagGroup } from "./hashtag-group";
import { HeartSlot } from "./heart-slot";
import { fillText, formatKudoTime } from "./kudo-board-format";
import { KudoCardImages } from "./kudo-card-images";
import { KudoCardPeople } from "./kudo-card-people";
import type { KudoCardData } from "./kudo-card-types";
import { kudoDetailPath } from "./kudos-board-api";

export type KudoCardVariant = "feed" | "highlight" | "detail";

const SHELL: Record<KudoCardVariant, string> = {
  feed: "w-full rounded-3xl p-10",
  highlight: "h-[524px] w-[528px] rounded-2xl border-4 border-primary px-6 py-6",
  detail: "w-[680px] rounded-3xl p-10",
};
const CONTENT: Record<KudoCardVariant, string> = {
  feed: "line-clamp-4 text-xl leading-8",
  highlight: "line-clamp-2 text-xl leading-8",
  detail: "text-2xl leading-8",
};
// Sanitized HTML from Go (F005 R20): paragraphs, lists, links, mentions.
const RICH_TEXT = "[&_a]:underline [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6";

/**
 * The one kudo card (FR-002, F006 § 4.1) in three variants: `feed` (All
 * Kudos), `highlight` (carousel, Figma kudo-card) and `detail` (View Kudo).
 * Title and content open the detail (FR-102) over the board; the sender's own
 * public kudo carries the edit pencil that opens F005's window (FR-104).
 * `actions` holds the variant's extra footer controls ("Xem chi tiết", "Đóng").
 */
export function KudoCard({ card, variant, actions }: { card: KudoCardData; variant: KudoCardVariant; actions?: ReactNode }) {
  const { t } = useLocale();
  const router = useRouter();
  const shell = useShellActions();
  const href = kudoDetailPath(card.id);
  const canEdit = card.isOwn && card.status === "public" && variant !== "highlight";

  function openDetail(event: MouseEvent<HTMLDivElement>) {
    if (variant === "detail" || (event.target as HTMLElement).closest("a")) return;
    router.push(href, { scroll: false });
  }

  return (
    <article
      data-testid={`kudo-card-${variant}`}
      data-kudo-id={card.id}
      aria-labelledby={`kudo-title-${variant}-${card.id}`}
      className={`flex flex-col bg-compose text-on-primary ${SHELL[variant]}`}
    >
      <div className={variant === "detail" ? "border-t border-primary pt-4" : ""}>
        <KudoCardPeople card={card} />
      </div>
      <div className="mt-4 border-t border-primary pt-4">
        <time dateTime={card.createdAt} className="text-base font-bold leading-6 text-compose-muted">
          {formatKudoTime(card.createdAt)}
        </time>
      </div>
      <div className="relative mt-4 flex items-center justify-center px-10">
        <h3 id={`kudo-title-${variant}-${card.id}`} className={`text-center text-base font-bold uppercase leading-6 ${variant === "detail" ? "" : "truncate"}`}>
          {variant === "detail" ? card.title : (
            <Link href={href} scroll={false} aria-label={fillText(t("kudos-board.card.open"), { title: card.title })} className="hover:underline">
              {card.title}
            </Link>
          )}
        </h3>
        {canEdit && (
          <button
            type="button"
            aria-label={t("kudos-board.card.edit")}
            data-testid="kudo-edit"
            onClick={() => shell?.runAction("compose", { kudoId: card.id })}
            className="absolute right-0 flex size-10 items-center justify-center rounded-control hover:bg-primary/40"
          >
            <PencilIcon size={28} />
          </button>
        )}
      </div>
      <div
        onClick={openDetail}
        className={`mt-4 rounded-panel border border-primary bg-primary-hover px-6 py-6 ${variant === "detail" ? "" : "cursor-pointer"}`}
      >
        <div
          className={`text-justify font-bold ${CONTENT[variant]} ${RICH_TEXT}`}
          dangerouslySetInnerHTML={{ __html: card.contentHtml }}
        />
      </div>
      {variant !== "highlight" && card.images.length > 0 && (
        <div className="mt-4">
          <KudoCardImages kudoId={card.id} images={card.images} />
        </div>
      )}
      {card.hashtags.length > 0 && (
        <div className="mt-4">
          <HashtagGroup hashtags={card.hashtags} lines={variant === "highlight" ? 1 : variant === "feed" ? 2 : undefined} />
        </div>
      )}
      <div className={`flex items-center gap-6 border-t border-primary pt-4 ${variant === "highlight" ? "mt-auto" : "mt-4"}`}>
        <HeartSlot kudoId={card.id} heart={card.heart} />
        <div className="ml-auto flex items-center gap-4">
          <CopyLinkButton kudoId={card.id} />
          {actions}
        </div>
      </div>
    </article>
  );
}
