"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { fillText } from "./kudo-board-format";
import type { KudoCardData } from "./kudo-card-types";
import { fetchKudo } from "./kudos-board-api";

type Images = KudoCardData["images"];

/**
 * Up to 5 thumbnails in the sender's order (FR-002), from Go-signed URLs of
 * opaque keys (INT-001, R01). When an image fails to load (expired or broken
 * link), the card reads the kudo again once for fresh signed URLs; an image
 * that still fails, or has no URL, shows "Ảnh không khả dụng." in its place.
 */
export function KudoCardImages({ kudoId, images }: { kudoId: string; images: Images }) {
  const { t } = useLocale();
  const [source, setSource] = useState(images);
  const [shown, setShown] = useState(images);
  const [retried, setRetried] = useState(false);
  const [broken, setBroken] = useState<ReadonlySet<number>>(() => new Set());
  const reloading = useRef(false);

  // Fresher card data from the server (refocus, a saved edit) starts over.
  if (images !== source) {
    setSource(images);
    setShown(images);
    setRetried(false);
    setBroken(new Set());
  }

  function failed(index: number) {
    if (retried) {
      setBroken((prev) => new Set(prev).add(index));
      return;
    }
    if (reloading.current) return; // another thumbnail already asked for the fresh card
    reloading.current = true;
    fetchKudo(kudoId)
      .then(
        (fresh) => setShown(fresh.images),
        () => setBroken(new Set(shown.map((_, i) => i))),
      )
      .finally(() => {
        reloading.current = false;
        setRetried(true);
      });
  }

  // An image that failed before hydration fired its error event before React listened.
  const list = useRef<HTMLUListElement>(null);
  const onFailed = useRef(failed);
  useEffect(() => {
    onFailed.current = failed;
  });
  useEffect(() => {
    list.current?.querySelectorAll<HTMLImageElement>("img[data-index]").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) onFailed.current(Number(img.dataset.index));
    });
  }, []);

  if (shown.length === 0) return null;
  const unavailable = t("kudos-board.card.imageUnavailable");
  return (
    <ul ref={list} className="flex gap-4" data-testid="kudo-images">
      {shown.map((image, i) => (
        <li key={i} className="size-[88px] overflow-hidden rounded-panel border border-primary bg-white">
          {image.url && !broken.has(i) ? (
            <Image
              // A new element after the re-read: the image loads again even when the link is unchanged.
              key={`${retried ? "retry" : "first"}:${image.url}`}
              data-index={i}
              src={image.url}
              alt={fillText(t("kudos-board.card.imageAlt"), { n: i + 1 })}
              width={88}
              height={88}
              unoptimized
              onError={() => failed(i)}
              className="size-full object-cover"
            />
          ) : (
            <span
              data-testid="image-unavailable"
              className="flex size-full items-center justify-center bg-primary-hover p-1 text-center text-[11px] font-bold leading-[14px] text-compose-muted"
            >
              {unavailable}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
