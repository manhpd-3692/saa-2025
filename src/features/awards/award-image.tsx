"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Framed award artwork (gold hairline and glow are part of the 350 px crop: a
 * 336 px frame plus 7 px of glow per side, so the image overhangs the square
 * box by 7/336 of its width). If the file fails to load, a placeholder with the
 * award name takes the same square so nothing shifts (edge case "Image
 * unavailable"). next/image re-reports errors that happened before hydration.
 */
export function AwardImage({
  src,
  name,
  unavailableLabel,
  className = "",
}: {
  src: string;
  name: string;
  unavailableLabel: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative aspect-square ${className}`}>
      {failed ? (
        <div
          role="img"
          aria-label={`${name}: ${unavailableLabel}`}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[20px] border border-primary-border px-6 text-center"
        >
          <span className="text-xl font-bold text-primary">{name}</span>
          <span className="text-sm">{unavailableLabel}</span>
        </div>
      ) : (
        <span className="absolute -inset-[2.083%]">
          <Image src={src} alt="" fill sizes="350px" onError={() => setFailed(true)} />
        </span>
      )}
    </div>
  );
}
