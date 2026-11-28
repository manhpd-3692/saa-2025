import type { CSSProperties } from "react";

/** Key-visual crops in public/images, at their natural (1x Figma) size. */
const KEY_VISUALS = {
  home: { src: "/images/home/home-key-visual.webp", width: 1512, height: 1320 },
  awards: { src: "/images/awards/awards-key-visual.webp", width: 1440, height: 547 },
  communityStandards: {
    src: "/images/community-standards/community-standards-key-visual.webp",
    width: 1440,
    height: 400,
  },
} as const;

/** Wider windows than the art soften its side edges (static class names for Tailwind). */
const EDGE_FADE_CLASS = {
  1440: "min-[1441px]:[--key-visual-edge:96px]",
  1512: "min-[1513px]:[--key-visual-edge:96px]",
} as const;

/**
 * Decorative "Root Further" artwork behind the top of a page (Homepage, Awards,
 * Community Standards). The crops come from the Figma reference PNGs with the
 * copy painted out (replace them with real Figma exports when available), so
 * they are painted at natural size: the page text lands on the spots it covered
 * in the design. `align` names the edge the text is laid out from; `fadeFrom`
 * fades the art out towards its bottom edge from that height (px).
 */
export function KeyVisualBackdrop({
  visual,
  align = "center",
  fadeFrom,
}: {
  visual: keyof typeof KEY_VISUALS;
  align?: "center" | "left";
  fadeFrom?: number;
}) {
  const { src, width, height } = KEY_VISUALS[visual];
  const masks = [
    "linear-gradient(to right, transparent, #000 var(--key-visual-edge, 0px), #000 calc(100% - var(--key-visual-edge, 0px)), transparent)",
  ];
  if (fadeFrom !== undefined) masks.push(`linear-gradient(to bottom, #000 ${fadeFrom}px, transparent ${height}px)`);
  const style: CSSProperties = {
    width,
    height,
    backgroundImage: `url(${src})`,
    maskImage: masks.join(", "),
    maskComposite: "intersect",
  };

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" style={{ height }}>
      <div
        style={style}
        className={`absolute top-0 bg-no-repeat ${EDGE_FADE_CLASS[width]} ${
          align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
        }`}
      />
    </div>
  );
}
