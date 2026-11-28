import type { SVGProps } from "react";

/** Inline icons of the admin reports (range field, calendar, search, row menu). Decorative. */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </Icon>
  );
}

/** The row Actions "⋯" in a ring (Figma 773:26403). */
export function MoreCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18.2a8.2 8.2 0 1 1 0-16.4 8.2 8.2 0 0 1 0 16.4z" />
      <circle cx="7.5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="16.5" cy="12" r="1.5" />
    </Icon>
  );
}

export function ChevronIcon({ direction, ...props }: IconProps & { direction: "left" | "right" }) {
  return (
    <Icon {...props}>
      <path d={direction === "left" ? "M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" : "M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z"} />
    </Icon>
  );
}

export function DoubleChevronIcon({ direction, ...props }: IconProps & { direction: "left" | "right" }) {
  return (
    <Icon {...props}>
      <path
        d={
          direction === "left"
            ? "M18.41 7.41 17 6l-6 6 6 6 1.41-1.41L13.83 12zM12.41 7.41 11 6l-6 6 6 6 1.41-1.41L7.83 12z"
            : "M5.59 16.59 7 18l6-6-6-6-1.41 1.41L10.17 12zM11.59 16.59 13 18l6-6-6-6-1.41 1.41L16.17 12z"
        }
      />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4z" />
    </Icon>
  );
}
