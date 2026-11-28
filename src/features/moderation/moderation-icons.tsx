import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = ({ size = 16, ...props }: IconProps) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  "aria-hidden": true,
  ...props,
});

/** "Mark Spam" (Figma 773:26295): an outlined warning triangle. */
export function WarningTriangleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 2 21h20L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 10v5M12 17.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** "Un Spam" (Figma 773:26373): a restore arrow around an exclamation mark. */
export function RestoreIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4.5v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4.5M12 15.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** The alert overlay's large warning sign (Figma 3127:24672): a rounded filled triangle with a cut-out "!". */
export function AlertSignIcon(props: IconProps) {
  return (
    <svg {...base({ ...props, viewBox: "0 0 120 108" })}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M51.3 6.5a10 10 0 0 1 17.4 0l48.6 84.3a10 10 0 0 1-8.7 15H11.4a10 10 0 0 1-8.7-15L51.3 6.5ZM60 31a6 6 0 0 0-6 6v28a6 6 0 0 0 12 0V37a6 6 0 0 0-6-6Zm0 50a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z"
        fill="currentColor"
      />
    </svg>
  );
}
