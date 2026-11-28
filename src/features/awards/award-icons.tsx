import type { ReactNode, SVGProps } from "react";

/**
 * Line icons of the award pages, drawn after the shapes in the Figma frames
 * (Homepage SAA 2167:9026, Hệ thống giải 313:8436). Decorative: the text next
 * to each icon carries the meaning.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function StrokeIcon({ size = 24, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Target with an arrow: menu items and award titles. */
export function AwardTargetIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M20.6 10.4a9 9 0 1 1-7-7" />
      <path d="M16.4 11.2a4.5 4.5 0 1 1-3.6-3.6" />
      <path d="M12 12l7-7" />
      <path d="M16.2 4.6 19 2v3h3l-2.6 2.8" />
    </StrokeIcon>
  );
}

/** Cut gem: "Số lượng giải thưởng". */
export function AwardDiamondIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth={1.8} {...props}>
      <path d="M6.5 3.5h11L22 9l-10 12L2 9z" />
      <path d="M2 9h20M9.5 3.5 8 9l4 12 4-12-1.5-5.5" />
    </StrokeIcon>
  );
}

/** Rosette with ribbons: "Giá trị giải thưởng". */
export function AwardMedalIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="9" r="6.5" />
      <circle cx="12" cy="9" r="2.5" />
      <path d="M8.5 14.5V22l3.5-2 3.5 2v-7.5" />
    </StrokeIcon>
  );
}

/** North-east arrow on "Chi tiết" links and the hero buttons. */
export function ArrowUpRightIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth={2.6} {...props}>
      <path d="M7 17 17 7M8.5 7H17v8.5" />
    </StrokeIcon>
  );
}
