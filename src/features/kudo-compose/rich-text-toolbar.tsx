"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { BoldIcon, ItalicIcon, LinkIcon, OrderedListIcon, QuoteIcon, StrikeIcon } from "./compose-icons";

/** Community standards page (F004, FR-210). */
const STANDARDS_PATH = "/community-standards";

type Action = "bold" | "italic" | "strike" | "orderedList" | "link" | "quote";

const BUTTONS: { action: Action; Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }> }[] = [
  { action: "bold", Icon: BoldIcon },
  { action: "italic", Icon: ItalicIcon },
  { action: "strike", Icon: StrikeIcon },
  { action: "orderedList", Icon: OrderedListIcon },
  { action: "link", Icon: LinkIcon },
  { action: "quote", Icon: QuoteIcon },
];

const MARK_OF: Record<Action, string> = {
  bold: "bold",
  italic: "italic",
  strike: "strike",
  orderedList: "orderedList",
  link: "link",
  quote: "blockquote",
};

/**
 * FR-203 toolbar (Figma 520:11602): Bold, Italic, Strikethrough, numbered
 * list, link (opens the "Thêm đường dẫn" box) and quote, then the
 * "Tiêu chuẩn cộng đồng" link, which opens the standards in a new tab (FR-210).
 */
export function RichTextToolbar({ editor, onLink }: { editor: Editor | null; onLink: () => void }) {
  const { t } = useLocale();
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      Object.fromEntries(BUTTONS.map(({ action }) => [action, e?.isActive(MARK_OF[action]) ?? false])) as Record<Action, boolean>,
  });

  function run(action: Action) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (action === "bold") chain.toggleBold().run();
    else if (action === "italic") chain.toggleItalic().run();
    else if (action === "strike") chain.toggleStrike().run();
    else if (action === "orderedList") chain.toggleOrderedList().run();
    else if (action === "quote") chain.toggleBlockquote().run();
    else onLink();
  }

  return (
    <div role="toolbar" aria-label={t("kudo-compose.toolbar.label")} className="flex h-10 overflow-hidden rounded-t-panel border border-b-0 border-primary-border">
      {BUTTONS.map(({ action, Icon }) => (
        <button
          key={action}
          type="button"
          aria-label={t(`kudo-compose.toolbar.${action}`)}
          aria-pressed={active?.[action] ?? false}
          disabled={!editor}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run(action)}
          className={`flex w-14 shrink-0 items-center justify-center border-r border-primary-border text-on-primary hover:bg-compose-active ${active?.[action] ? "bg-compose-active" : ""}`}
        >
          <Icon size={20} />
        </button>
      ))}
      <Link
        href={STANDARDS_PATH}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-1 items-center justify-center text-base font-bold text-compose-link underline underline-offset-2"
      >
        {t("kudo-compose.standards")}
      </Link>
    </div>
  );
}
