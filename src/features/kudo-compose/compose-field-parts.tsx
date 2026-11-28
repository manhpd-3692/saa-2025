"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { PlusIcon } from "./compose-icons";

/**
 * Shared pieces of the write-kudo window (Figma 520:11602): field labels with
 * the red required mark, inputs, the "+ Hashtag / + Image" add buttons, the
 * dark dropdown panel and Sunner avatars. Values read from the 1440 px frames.
 */

export const INPUT_CLASS =
  "h-14 w-full rounded-panel border bg-white px-6 text-base font-bold text-on-primary placeholder:text-compose-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-border";

export const DROPDOWN_PANEL_CLASS = "absolute z-30 rounded-panel border border-primary-border bg-menu p-1.5 shadow-lg";

export function borderFor(invalid: boolean): string {
  return invalid ? "border-danger" : "border-primary-border";
}

export function FieldLabel({ htmlFor, id, required, children }: { htmlFor?: string; id?: string; required?: boolean; children: ReactNode }) {
  const Tag = htmlFor ? "label" : "span";
  return (
    <Tag htmlFor={htmlFor} id={id} className="shrink-0 whitespace-nowrap text-[22px] font-bold leading-7 text-on-primary">
      {children}
      {required && (
        <span aria-hidden="true" className="ml-0.5 align-top text-base text-danger">
          *
        </span>
      )}
    </Tag>
  );
}

export function FieldMessage({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-2 text-sm font-bold text-danger">
      {children}
    </p>
  );
}

/** "+ Hashtag / Tối đa 5" and "+ Image / Tối đa 5" (Figma add buttons). */
export function AddButton({ label, hint, disabled, onClick, expanded, testId }: {
  label: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
  expanded?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      aria-expanded={expanded}
      onClick={onClick}
      // Figma: 6 px inset, 20 px plus, 6 px gap, 8 px right — "Image" is 98 px wide, so five
      // thumbnails and the button share one row (M1).
      className="flex h-12 shrink-0 items-center gap-1.5 rounded-panel border border-primary-border bg-white pl-1.5 pr-2 text-left hover:bg-compose disabled:cursor-not-allowed disabled:opacity-50"
    >
      <PlusIcon size={20} className="text-primary-border" />
      <span className="flex flex-col leading-tight">
        <span className="text-base font-bold text-on-primary">{label}</span>
        <span className="text-[11px] font-bold text-compose-muted">{hint}</span>
      </span>
    </button>
  );
}

export function SunnerAvatar({ name, url, size = 48 }: { name: string; url: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-primary-border text-lg font-bold text-white"
    >
      {url && !broken ? (
        <Image src={url} alt="" width={size} height={size} unoptimized referrerPolicy="no-referrer" onError={() => setBroken(true)} className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

/** Closes a popover on a pointer press outside `ref` while it is open. */
export function useCloseOnOutsidePress(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [ref, open, close]);
}
