"use client";

import Image from "next/image";
import { useRef } from "react";
import { CloseIcon } from "@/components/shell/shell-icons";
import { useLocale } from "@/i18n/locale-provider";
import { AddButton } from "./compose-field-parts";
import type { ComposeImage } from "./kudo-compose-form-state";
import { IMAGE_TYPES } from "./kudo-input-schema";

/**
 * F005 A4/A8 images (Figma 520:11602): up to 5 thumbnails, each removable.
 * Files upload as soon as they are picked; a failed upload offers retry and
 * remove. A sixth or unsupported file is refused with a message (FR-206); the
 * stored object is checked again by Go at send (R03).
 */
export function ImageAttachmentGrid({ images, notice, onAdd, onRemove, onRetry }: {
  images: ComposeImage[];
  notice: string | null;
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  onRetry: (key: string) => void;
}) {
  const { t } = useLocale();
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* One row as in the frames: at most 5 thumbnails (80 px, 16 px apart) and the 98 px add button. */}
      <div className="flex flex-nowrap items-center gap-4">
        {images.map((img, i) => (
          <figure key={img.key} data-testid="image-thumb" data-status={img.status} className="relative size-20 shrink-0">
            <div className="size-full overflow-hidden rounded-control border border-primary bg-white">
              {img.previewUrl && (
                <Image src={img.previewUrl} alt={`${t("kudo-compose.image.alt")} ${i + 1}`} width={80} height={80} unoptimized className="size-full object-cover" />
              )}
            </div>
            {img.status === "uploading" && (
              <span role="status" aria-label={t("kudo-compose.image.uploading")} className="absolute inset-0 flex items-center justify-center rounded-control bg-white/60">
                <span className="size-6 animate-spin rounded-full border-2 border-primary-border border-t-transparent" />
              </span>
            )}
            {img.status === "failed" && (
              <button
                type="button"
                onClick={() => onRetry(img.key)}
                className="absolute inset-0 flex items-center justify-center rounded-control bg-on-primary/70 text-xs font-bold text-white"
              >
                {t("kudo-compose.image.retry")}
              </button>
            )}
            <button
              type="button"
              aria-label={`${t("kudo-compose.image.remove")} ${i + 1}`}
              onClick={() => onRemove(img.key)}
              className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-danger text-white"
            >
              <CloseIcon size={14} />
            </button>
          </figure>
        ))}
        <AddButton label={t("kudo-compose.image.add")} hint={t("kudo-compose.image.max")} onClick={() => input.current?.click()} testId="image-add" />
        <input
          ref={input}
          type="file"
          multiple
          accept={IMAGE_TYPES.join(",")}
          data-testid="image-input"
          className="hidden"
          onChange={(e) => {
            onAdd([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>
      {images.some((img) => img.status === "failed") && <p className="text-sm font-bold text-danger">{t("kudo-compose.image.failed")}</p>}
      {notice && (
        <p role="alert" className="text-sm font-bold text-danger">
          {t(notice)}
        </p>
      )}
    </div>
  );
}
