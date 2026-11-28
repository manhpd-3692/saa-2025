"use client";

import Mention from "@tiptap/extension-mention";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/i18n/locale-provider";
import { CONTENT_MAX_CHARS } from "./kudo-input-schema";
import { LinkBox } from "./link-box";
import { MentionSuggestionList } from "./mention-suggestion-list";
import { RichTextToolbar } from "./rich-text-toolbar";
import { useMentionSuggestion } from "./use-mention-suggestion";
import { visibleTextLength } from "./visible-text-length";

/**
 * Stored mentions come back from Go as `<span data-type="mention" data-id>@Name</span>`
 * (the sanitizer keeps no data-label), so the label falls back to the shown text.
 */
const KudoMention = Mention.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      label: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-label") ?? element.textContent?.replace(/^@/, "") ?? null,
        renderHTML: (attributes: { label?: string | null }) => (attributes.label ? { "data-label": attributes.label } : {}),
      },
    };
  },
});

// Only what the Go sanitizer keeps (ALG-001): no headings, code, bullet lists, rules or underline.
const EDITOR_CLASS =
  "min-h-[200px] px-6 py-1.5 text-base font-bold leading-6 text-on-primary focus:outline-none [&_a]:text-primary-border [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-primary-border [&_blockquote]:pl-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:font-black [&_.mention]:text-primary-border";

/**
 * F005 rich text (FR-203, FR-204, FR-209): Tiptap with the allowed formatting,
 * `@` mentions fed by the Sunner search, the link box, and the 0/1,000 counter.
 * The counter counts the editor's HTML with the shared ALG-002 metric, exactly
 * as Go counts the stored text (Codex R20, N07).
 */
export function RichTextEditor({ value, onChange, invalid, labelId }: {
  value: string;
  onChange: (html: string) => void;
  invalid: boolean;
  labelId: string;
}) {
  const { t, locale } = useLocale();
  const { suggestion, list } = useMentionSuggestion();
  const [linkText, setLinkText] = useState<string | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        bulletList: false,
        horizontalRule: false,
        underline: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      KudoMention.configure({ HTMLAttributes: { class: "mention" }, suggestion }),
    ],
    content: value,
    editorProps: { attributes: { class: EDITOR_CLASS, role: "textbox", "aria-multiline": "true", "aria-labelledby": labelId } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });
  // From the controlled value, not useEditorState: that hook keeps its first snapshot
  // (editor still null, immediatelyRender: false) until the first transaction, and
  // content given at creation emits none, so a prefilled edit looked empty (M2).
  // onUpdate reports "" exactly when the editor is empty.
  const isEmpty = value === "";

  useEffect(() => {
    editor?.view.dom.setAttribute("aria-invalid", String(invalid));
  }, [editor, invalid]);

  const count = visibleTextLength(value);
  const format = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US");

  function openLinkBox() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    setLinkText(editor.state.doc.textBetween(from, to, " "));
  }

  /** Hủy / Escape in the link box: focus goes back to where the user was writing. */
  function closeLinkBox() {
    setLinkText(null);
    editor?.commands.focus();
  }

  function insertLink(text: string, href: string) {
    setLinkText(null);
    editor?.chain().focus().insertContent({ type: "text", text, marks: [{ type: "link", attrs: { href } }] }).insertContent(" ").run();
  }

  return (
    <div className="flex flex-col">
      <RichTextToolbar editor={editor} onLink={openLinkBox} />
      <div className={`relative rounded-b-panel border bg-white ${invalid ? "border-danger" : "border-primary-border"}`} data-testid="kudo-editor">
        {isEmpty && (
          <p aria-hidden="true" className="pointer-events-none absolute left-6 top-1.5 text-base font-bold text-compose-muted">
            {t("kudo-compose.editor.placeholder")}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
      <div className="mt-1 flex items-start justify-between gap-4 text-base font-bold">
        <span className="text-on-primary">{t("kudo-compose.editor.mentionHint")}</span>
        <span
          data-testid="content-counter"
          aria-label={t("kudo-compose.editor.counter")}
          className={count > CONTENT_MAX_CHARS ? "text-danger" : "text-compose-muted"}
        >
          {format.format(count)}/{format.format(CONTENT_MAX_CHARS)}
        </span>
      </div>
      {list && <MentionSuggestionList state={list} />}
      {linkText !== null &&
        createPortal(<LinkBox initialText={linkText} onSave={insertLink} onCancel={closeLinkBox} />, document.body)}
    </div>
  );
}
