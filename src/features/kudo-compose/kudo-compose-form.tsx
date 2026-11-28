"use client";

import { useId } from "react";
import { CloseIcon } from "@/components/shell/shell-icons";
import { useLocale } from "@/i18n/locale-provider";
import { AnonymousToggle } from "./anonymous-toggle";
import { borderFor, FieldLabel, FieldMessage, INPUT_CLASS } from "./compose-field-parts";
import { SaveIcon, SendIcon } from "./compose-icons";
import { HashtagPicker } from "./hashtag-picker";
import { ImageAttachmentGrid } from "./image-attachment-grid";
import { useKudoComposeForm, type ComposeMode, type ComposeValues } from "./kudo-compose-form-state";
import type { FieldError, KudoField } from "./kudo-input-schema";
import { RecipientCombobox } from "./recipient-combobox";
import { RichTextEditor } from "./rich-text-editor";

/** Dictionary key of the message under a refused field; `required` on recipient, message and hashtag uses the summary. */
const FIELD_MESSAGES: Record<string, string> = {
  "title:required": "kudo-compose.error.titleRequired",
  "title:too_long": "kudo-compose.error.titleTooLong",
  "title:invalid": "kudo-compose.error.titleInvalid",
  "contentHtml:too_long": "kudo-compose.error.contentTooLong",
  "hashtags:invalid": "kudo-compose.error.hashtagsInvalid",
  "hashtags:too_long": "kudo-compose.error.hashtagsInvalid",
  "hashtags:too_many": "kudo-compose.error.hashtagsTooMany",
  "receiverId:self_kudo": "kudo-compose.error.selfKudo",
  "receiverId:unavailable": "kudo-compose.error.recipientUnavailable",
  "images:too_many": "kudo-compose.image.refused",
};
const SUMMARY_FIELDS: readonly KudoField[] = ["receiverId", "contentHtml", "hashtags"];

function messageFor(errors: FieldError[], field: KudoField): string | null {
  const error = errors.find((e) => e.field === field);
  return error ? (FIELD_MESSAGES[`${field}:${error.code}`] ?? null) : null;
}

/**
 * Body of the write-kudo window (Figma 520:11602, states 828:13433 / 1612:5056,
 * error 662:13035, edit 1949:13746): recipient, Danh hiệu, rich text, hashtags,
 * images, anonymous tick, Hủy and Gửi (Lưu when editing). Errors mark their
 * fields and keep every value (FR-208, FR-402).
 */
export function KudoComposeForm({ mode, initial, onCancel, onSaved }: {
  mode: ComposeMode;
  initial: ComposeValues;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t } = useLocale();
  const id = useId();
  const form = useKudoComposeForm(mode, initial, onSaved);
  const { values, errors } = form;
  const editing = mode.kind === "edit";
  const invalid = (field: KudoField) => errors.some((e) => e.field === field);
  const missing = errors.some((e) => e.code === "required" && SUMMARY_FIELDS.includes(e.field));

  function cancel() {
    form.discardUnsaved();
    onCancel();
  }

  return (
    // Escape cancels like Hủy unless an open list (mention, dropdown, link box) already handled it.
    <div
      className="flex flex-col gap-8"
      data-testid="kudo-compose-form"
      data-mode={mode.kind}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !e.defaultPrevented) cancel();
      }}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-4">
          <FieldLabel id={`${id}-recipient`} required>{t("kudo-compose.recipient.label")}</FieldLabel>
          <RecipientCombobox value={values.recipient} onChange={(s) => form.change("recipient", s, "receiverId")} locked={editing} invalid={invalid("receiverId")} labelId={`${id}-recipient`} />
        </div>
        {messageFor(errors, "receiverId") && <FieldMessage>{t(messageFor(errors, "receiverId") as string)}</FieldMessage>}
      </div>

      <div className="flex items-start gap-4">
        <div className="flex h-14 items-center">
          <FieldLabel htmlFor={`${id}-title`} required>{t("kudo-compose.titleField.label")}</FieldLabel>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <input
            id={`${id}-title`}
            value={values.title}
            aria-invalid={invalid("title")}
            placeholder={t("kudo-compose.titleField.placeholder")}
            onChange={(e) => form.change("title", e.target.value, "title")}
            className={`${INPUT_CLASS} ${borderFor(invalid("title"))}`}
          />
          {messageFor(errors, "title") && <FieldMessage>{t(messageFor(errors, "title") as string)}</FieldMessage>}
          <p className="mt-2.5 text-base font-bold leading-6 text-compose-muted">
            {t("kudo-compose.titleField.example")}
            <br />
            {t("kudo-compose.titleField.hint")}
          </p>
        </div>
      </div>

      <div className="flex flex-col">
        <span id={`${id}-content`} className="sr-only">{t("kudo-compose.editor.label")}</span>
        <RichTextEditor value={values.contentHtml} onChange={(html) => form.change("contentHtml", html, "contentHtml")} invalid={invalid("contentHtml")} labelId={`${id}-content`} />
        {messageFor(errors, "contentHtml") && <FieldMessage>{t(messageFor(errors, "contentHtml") as string)}</FieldMessage>}
      </div>

      <div className="flex flex-col">
        <div className="flex items-start gap-4">
          <div className="flex h-12 items-center">
            <FieldLabel id={`${id}-hashtags`} required>{t("kudo-compose.hashtag.label")}</FieldLabel>
          </div>
          <HashtagPicker value={values.hashtags} onChange={(names) => form.change("hashtags", names, "hashtags")} invalid={invalid("hashtags")} labelId={`${id}-hashtags`} />
        </div>
        {messageFor(errors, "hashtags") && <FieldMessage>{t(messageFor(errors, "hashtags") as string)}</FieldMessage>}
      </div>

      <div className="flex items-center gap-4">
        <FieldLabel>{t("kudo-compose.image.label")}</FieldLabel>
        <ImageAttachmentGrid images={values.images} notice={form.imageNotice ?? messageFor(errors, "images")} onAdd={form.addFiles} onRemove={form.removeImage} onRetry={form.retryImage} />
      </div>

      <AnonymousToggle checked={values.isAnonymous} onChange={(checked) => form.change("isAnonymous", checked)} />

      {(missing || form.problem) && (
        <p role="alert" data-testid="compose-error" className="text-base font-bold text-danger">
          {missing ? t("kudo-compose.error.missing") : t(form.problem as string)}
        </p>
      )}

      <div className="flex gap-6">
        <button type="button" onClick={cancel} className="flex h-[60px] w-[146px] shrink-0 items-center justify-center gap-2 rounded-control border border-primary-border text-base font-bold text-on-primary hover:bg-compose-active">
          {t("kudo-compose.cancel")}
          <CloseIcon size={24} />
        </button>
        <button
          type="button"
          disabled={form.submitting}
          onClick={() => void form.submit()}
          className="flex h-[60px] flex-1 items-center justify-center gap-2 rounded-panel bg-primary text-[22px] font-bold text-on-primary hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60"
        >
          {form.submitting ? t("kudo-compose.submitting") : t(editing ? "kudo-compose.submit.edit" : "kudo-compose.submit.create")}
          {editing ? <SaveIcon size={22} /> : <SendIcon size={22} />}
        </button>
      </div>
    </div>
  );
}
