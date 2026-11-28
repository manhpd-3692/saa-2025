"use client";

import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { CloseIcon } from "@/components/shell/shell-icons";
import { useLocale } from "@/i18n/locale-provider";
import { borderFor, FieldMessage, INPUT_CLASS } from "./compose-field-parts";
import { LinkIcon } from "./compose-icons";
import { trapTabKey } from "./dialog-focus-trap";
import { normalizeLinkUrl } from "./link-url";

/**
 * F005 FR-209 "Thêm đường dẫn" (Figma 1002:12917): link text and web address,
 * inserted into the message as a link. Only http(s) is accepted, as the Go
 * sanitizer keeps no other scheme (ALG-001).
 */
export function LinkBox({ initialText, onSave, onCancel }: {
  initialText: string;
  onSave: (text: string, href: string) => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const titleId = useId();
  const form = useRef<HTMLFormElement>(null);
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState("");
  const [invalid, setInvalid] = useState(false);

  function save(event: FormEvent) {
    event.preventDefault();
    const href = normalizeLinkUrl(url);
    if (!href) {
      setInvalid(true);
      return;
    }
    onSave(text.trim() || href, href);
  }

  function onKeyDown(event: KeyboardEvent) {
    trapTabKey(event, form.current);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay" onKeyDown={onKeyDown}>
      <form ref={form} role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={save} className="flex w-[752px] flex-col gap-8 rounded-dialog bg-compose p-10">
        <h3 id={titleId} className="text-[32px] font-bold leading-10 text-on-primary">
          {t("kudo-compose.link.title")}
        </h3>
        <div className="flex items-center gap-4">
          <label htmlFor={`${titleId}-text`} className="shrink-0 whitespace-nowrap text-[22px] font-bold text-on-primary">
            {t("kudo-compose.link.text")}
          </label>
          <input id={`${titleId}-text`} autoFocus value={text} onChange={(e) => setText(e.target.value)} className={`${INPUT_CLASS} border-primary-border`} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-4">
            <label htmlFor={`${titleId}-url`} className="shrink-0 whitespace-nowrap text-[22px] font-bold text-on-primary">
              {t("kudo-compose.link.url")}
            </label>
            <input
              id={`${titleId}-url`}
              type="text"
              inputMode="url"
              value={url}
              aria-invalid={invalid}
              onChange={(e) => {
                setUrl(e.target.value);
                setInvalid(false);
              }}
              className={`${INPUT_CLASS} ${borderFor(invalid)}`}
            />
          </div>
          {invalid && <FieldMessage>{t("kudo-compose.link.invalidUrl")}</FieldMessage>}
        </div>
        <div className="flex gap-6">
          <button type="button" onClick={onCancel} className="flex h-[60px] w-[146px] items-center justify-center gap-2 rounded-control border border-primary-border text-base font-bold text-on-primary hover:bg-compose-active">
            {t("kudo-compose.cancel")}
            <CloseIcon size={24} />
          </button>
          <button type="submit" className="flex h-[60px] flex-1 items-center justify-center gap-2 rounded-panel bg-primary text-[22px] font-bold text-on-primary hover:bg-primary-hover">
            {t("kudo-compose.link.save")}
            <LinkIcon size={22} />
          </button>
        </div>
      </form>
    </div>
  );
}
