"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import { useLocale } from "@/i18n/locale-provider";
import { iconImage, SECRET_BOX_IMAGES, type SecretBoxIcon } from "./gamification-config";

/** What the 557 x 557 picture of the secret box window shows (Figma 1466:*, 2995:*, standby frames). */
export type SecretBoxPicture =
  | { kind: "closed"; sparkle: boolean; shaking?: boolean; dimmed?: boolean }
  | { kind: "revealed"; icon: SecretBoxIcon }
  | { kind: "completed"; icons: readonly SecretBoxIcon[] }
  | { kind: "message"; children: ReactNode };

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Box shake while opening (Web Animations; none under reduced motion). */
function useShake(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active || !ref.current || prefersReducedMotion()) return;
    const frames = [0, -4, 4, -3, 3, -1, 0].map((deg) => ({ transform: `rotate(${deg}deg)` }));
    const animation = ref.current.animate(frames, { duration: 600, iterations: Infinity });
    return () => animation.cancel();
  }, [active]);
  return ref;
}

/** Revealed icon rising out of the box (none under reduced motion). */
function usePopIn<T extends HTMLElement>(key: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    ref.current.animate(
      [
        { transform: "translateY(120px) scale(0.3)", opacity: 0 },
        { transform: "translateY(0) scale(1)", opacity: 1 },
      ],
      { duration: 600, easing: "cubic-bezier(0.2, 0.8, 0.2, 1.1)" },
    );
  }, [key]);
  return ref;
}

const PICTURE = { width: 557, height: 557, unoptimized: true } as const;

function Closed({ sparkle, shaking = false, dimmed = false }: { sparkle: boolean; shaking?: boolean; dimmed?: boolean }) {
  const ref = useShake(shaking);
  return (
    <div ref={ref} className={dimmed ? "opacity-50" : undefined} data-picture={shaking ? "opening" : sparkle ? "closed-sparkle" : "closed"}>
      <Image src={sparkle && !shaking ? SECRET_BOX_IMAGES.closedSparkle : SECRET_BOX_IMAGES.closed} alt="" {...PICTURE} />
    </div>
  );
}

function Revealed({ icon }: { icon: SecretBoxIcon }) {
  const ref = usePopIn<HTMLDivElement>(icon);
  return (
    <div className="relative" data-picture="revealed" data-icon={icon}>
      <Image src={SECRET_BOX_IMAGES.opened} alt="" {...PICTURE} />
      {/* Same place and size as the icon in the standby frame (center 282,136, 184 px). */}
      <div ref={ref} className="absolute left-[190px] top-[44px] size-[184px] rounded-full">
        <Image src={iconImage(icon, "large")} alt="" width={184} height={184} unoptimized className="rounded-full" />
      </div>
    </div>
  );
}

/** The set is complete (BR-010): the six collected icons over the open box, as the result frames. */
function Completed({ icons }: { icons: readonly SecretBoxIcon[] }) {
  const ref = usePopIn<HTMLUListElement>("completed");
  return (
    <div className="relative" data-picture="completed">
      <Image src={SECRET_BOX_IMAGES.opened} alt="" {...PICTURE} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgb(255_234_158/0.35),transparent_60%)]" />
      <ul ref={ref} className="absolute left-1/2 top-[40px] grid -translate-x-1/2 grid-cols-3 gap-x-6 gap-y-4">
        {icons.map((icon) => (
          <li key={icon} className="rounded-full shadow-[0_0_24px_6px_rgb(255_234_158/0.55)]">
            <Image src={iconImage(icon, "large")} alt="" width={104} height={104} unoptimized className="rounded-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The picture area; `onOpen` makes it the "click the box" control (FR-205). */
export function SecretBoxStage({ picture, onOpen, openLabel }: { picture: SecretBoxPicture; onOpen?: () => void; openLabel?: string }) {
  const { t } = useLocale();
  const content =
    picture.kind === "closed" ? (
      <Closed sparkle={picture.sparkle} shaking={picture.shaking} dimmed={picture.dimmed} />
    ) : picture.kind === "revealed" ? (
      <Revealed icon={picture.icon} />
    ) : picture.kind === "completed" ? (
      <Completed icons={picture.icons} />
    ) : (
      <div className="flex size-full flex-col items-center justify-center gap-4 bg-black/40 px-10 text-center">{picture.children}</div>
    );
  const frame = "relative mx-auto size-[557px] overflow-hidden";
  if (!onOpen) return <div className={frame} data-testid="secret-box-picture">{content}</div>;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={openLabel ?? t("gamification.box.open")}
      data-testid="secret-box-picture"
      className={`${frame} block cursor-pointer outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary`}
    >
      {content}
    </button>
  );
}
