import type { ReactNode, SVGProps } from "react";

/**
 * Icons of the Live board and kudo cards, drawn after Figma 2940:13431 and
 * 520:18779. Decorative: the control or text next to each icon carries the meaning.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

function StrokeIcon({ size = 24, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <Icon size={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </Icon>
  );
}

/** Outline paper plane between sender and receiver. */
export function SendArrowIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 4.5 21 12 4 19.5 6.5 12z" />
      <path d="M6.5 12H13" />
    </StrokeIcon>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5A5.5 5.5 0 0 1 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 3 5.5 5.5 0 0 1 22 8.5c0 3.78-3.4 6.86-8.55 11.54z" />
    </Icon>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </StrokeIcon>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 17 17 7M8 7h9v9" stroke="currentColor" strokeWidth={2.5} fill="none" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14" />
    </Icon>
  );
}

export function GiftIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </StrokeIcon>
  );
}

/** Diagonal expand arrows (Spotlight full screen). */
export function ExpandIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" />
    </StrokeIcon>
  );
}

/** Hat and glasses: the placeholder of a masked anonymous sender (DEC-002). */
export function IncognitoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 11h18v1.5H3zM6.5 4.5h11l1.5 6h-14z" />
      <path
        d="M7.5 20a3 3 0 1 1 0-6 3 3 0 0 1 2.9 2.2c1-.5 2.2-.5 3.2 0A3 3 0 1 1 13.5 17c-.9-.6-2.1-.6-3 0A3 3 0 0 1 7.5 20zm0-1.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
        fillRule="evenodd"
      />
    </Icon>
  );
}
