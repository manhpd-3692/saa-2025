"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDismissablePopover } from "@/components/shell/use-dismissable-popover";
import { loginHref } from "@/features/admin/admin-call-failure";
import { fillText } from "@/features/kudos-board/kudo-board-format";
import { useLocale } from "@/i18n/locale-provider";
import { goApiBrowser } from "@/lib/api/go-api-browser";
import { runKudoDecision, type DecisionPost } from "./kudo-decision";
import { RestoreIcon, WarningTriangleIcon } from "./moderation-icons";
import type { KudoModeration } from "./moderation-api";

const post: DecisionPost = (path, body) => goApiBrowser(path, { method: "POST", body });

const BUTTON =
  "flex h-[30px] items-center gap-1.5 whitespace-nowrap rounded-control border border-white/10 bg-[#191d1b] px-2.5 text-xs font-medium text-primary hover:border-primary-border disabled:cursor-wait disabled:opacity-60";

/**
 * Row action (Figma "Action - Public" 773:26295 / "Action - Spam" 773:26373,
 * FR-305): a Public row offers Mark Spam behind one inline confirmation (D003),
 * a Spam row offers Un Spam at once. The version the admin saw goes as
 * `expectedVersion`; the button is disabled while saving, so a double click
 * writes once. A 409 refreshes the row to Go's current one with a short
 * message (E16); a vanished kudo reloads the table (C03); 401 → Login, 403 →
 * the page reloads into Forbidden; any other failure keeps the row.
 */
export function KudoActionMenu({ kudoId, title, row, onRow }: {
  kudoId: string;
  title: string;
  row: KudoModeration;
  onRow: (row: KudoModeration) => void;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const { open, setOpen, ref } = useDismissablePopover<HTMLDivElement>();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<"stale" | "error" | null>(null);
  const toSpam = row.status === "public";
  const action = t(toSpam ? "moderation.action.markSpam" : "moderation.action.markPublic");

  async function decide() {
    setOpen(false);
    setPending(true);
    setNotice(null);
    const outcome = await runKudoDecision(kudoId, row, post);
    setPending(false);
    switch (outcome.kind) {
      case "changed":
      case "stale":
        onRow(outcome.row);
        if (outcome.kind === "stale") setNotice("stale");
        return;
      case "reload":
      case "forbidden":
        router.refresh();
        return;
      case "sign-in":
        router.push(loginHref(window.location.pathname + window.location.search));
        return;
      case "error":
        setNotice("error");
    }
  }

  return (
    <div ref={ref} className="relative flex flex-col items-center gap-1.5">
      <button
        type="button"
        data-popover-trigger
        data-testid="kudo-action"
        aria-label={fillText(t("moderation.action.forKudo"), { action, title })}
        aria-haspopup={toSpam ? "dialog" : undefined}
        aria-expanded={toSpam ? open : undefined}
        disabled={pending}
        onClick={() => (toSpam ? setOpen(!open) : void decide())}
        className={BUTTON}
      >
        {toSpam ? <WarningTriangleIcon size={14} /> : <RestoreIcon size={14} />}
        {action}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={action}
          className="absolute right-0 top-full z-30 mt-2 w-64 rounded-panel border border-primary-border bg-menu p-4 text-left text-sm text-white"
        >
          <p>{t("moderation.confirm.message")}</p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="h-8 rounded-control px-3 hover:bg-primary-muted">
              {t("moderation.confirm.no")}
            </button>
            <button
              type="button"
              data-testid="kudo-action-confirm"
              onClick={() => void decide()}
              className="h-8 rounded-control bg-primary px-3 font-medium text-on-primary hover:bg-primary-hover"
            >
              {t("moderation.confirm.yes")}
            </button>
          </div>
        </div>
      )}
      {notice && (
        <p role="status" data-testid="kudo-action-notice" className={`text-center text-xs ${notice === "stale" ? "text-notice-warning" : "text-danger"}`}>
          {t(notice === "stale" ? "moderation.notice.stale" : "moderation.notice.error")}
        </p>
      )}
    </div>
  );
}
