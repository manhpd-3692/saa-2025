"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isApiError } from "@/lib/api/api-error";
import { useLocale } from "@/i18n/locale-provider";
import { trapTabKey } from "./dialog-focus-trap";
import { getKudoForEdit } from "./kudo-compose-api";
import { KudoComposeForm } from "./kudo-compose-form";
import { initialComposeValues, type ComposeMode, type ComposeValues } from "./kudo-compose-form-state";

type EditLoad = { status: "loading" } | { status: "ready"; initial: ComposeValues } | { status: "failed"; messageKey: string };

function loadFailureKey(error: unknown): string {
  if (!isApiError(error)) return "kudo-compose.loadFailed";
  if (error.status === 401) return "kudo-compose.error.session";
  if (error.code === "not_kudo_author") return "kudo-compose.error.notAuthor";
  if (error.code === "kudo_spam_locked") return "kudo-compose.error.spamLocked";
  if (error.code === "kudo_not_found") return "kudo-compose.error.notFound";
  return "kudo-compose.loadFailed";
}

/**
 * F005 write-kudo window over the current page (FR-101, SCR-write-kudo-modal):
 * an empty form to send a kudo, or — for the author's own kudo — the same
 * form prefilled from GET /kudos/{id}/edit with the recipient locked (FR-102,
 * D004). Loaded lazily by KudoComposeHost (next/dynamic), so the editor
 * bundle is fetched only when the window first opens.
 */
export function KudoComposeModal({ mode, onClose, onSaved }: { mode: ComposeMode; onClose: () => void; onSaved: () => void }) {
  const { t } = useLocale();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const editId = mode.kind === "edit" ? mode.kudoId : null;
  const [edit, setEdit] = useState<EditLoad>({ status: "loading" });

  useEffect(() => {
    if (!editId) return;
    let live = true;
    getKudoForEdit(editId).then(
      (form) => live && setEdit({ status: "ready", initial: initialComposeValues(form) }),
      (error: unknown) => live && setEdit({ status: "failed", messageKey: loadFailureKey(error) }),
    );
    return () => {
      live = false;
    };
  }, [editId]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const initial = mode.kind === "create" ? initialComposeValues() : edit.status === "ready" ? edit.initial : null;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-overlay">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(e) => trapTabKey(e, panel.current)}
        className="mx-auto my-2.5 w-[752px] rounded-dialog bg-compose p-10 text-on-primary focus:outline-none"
      >
        <h2 id={titleId} className="mb-8 text-center text-[32px] font-bold leading-10">
          {t(mode.kind === "edit" ? "kudo-compose.title.edit" : "kudo-compose.title.create")}
        </h2>
        {initial ? (
          <KudoComposeForm mode={mode} initial={initial} onCancel={onClose} onSaved={onSaved} />
        ) : edit.status === "failed" ? (
          <div className="flex flex-col items-center gap-6">
            <p role="alert" className="text-base font-bold text-danger">{t(edit.messageKey)}</p>
            <button type="button" onClick={onClose} className="h-[60px] w-[146px] rounded-control border border-primary-border text-base font-bold">
              {t("kudo-compose.cancel")}
            </button>
          </div>
        ) : (
          <p role="status" className="text-center text-base font-bold text-compose-muted">{t("kudo-compose.loading")}</p>
        )}
      </div>
    </div>
  );
}
