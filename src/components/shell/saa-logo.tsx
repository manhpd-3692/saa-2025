import Image from "next/image";

/** Native size of the logo crop in public/images/brand (low-res, from Figma exports). */
const LOGO = { src: "/images/brand/saa-logo.png", width: 71, height: 65 } as const;

const SIZES = {
  /** Sunner header and minimal chrome: 52 × 48. */
  header: "h-12 w-[52px]",
  /** Footer and admin header: 69 × 63. */
  large: "h-[63px] w-[69px]",
} as const;

/** Sun* Annual Awards 2025 logo. `alt` is empty when a labelled link wraps it. */
export function SaaLogo({ size = "header", alt = "" }: { size?: keyof typeof SIZES; alt?: string }) {
  return (
    <Image
      src={LOGO.src}
      width={LOGO.width}
      height={LOGO.height}
      alt={alt}
      priority
      className={`${SIZES[size]} object-contain`}
    />
  );
}
