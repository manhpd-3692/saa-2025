import type { ReactNode, SVGProps } from "react";
import type { NotificationIcon } from "./build-notification-message";

/**
 * Type icons of the notification rows (Figma 589:9132), drawn as outlines in
 * the design's colours (tokens `notice-*`, primary for the gift). Decorative:
 * the row's text carries the meaning.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Outline({ size = 24, children, ...props }: IconProps) {
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

const KIND_ICON_COLOR: Record<NotificationIcon, string> = {
  mail: "text-notice-mail",
  heart: "text-notice-heart",
  gift: "text-primary",
  star: "text-notice-star",
  warning: "text-notice-warning",
  badge: "text-notice-badge",
};

const KIND_ICON_PATHS: Record<NotificationIcon, ReactNode> = {
  // Envelope with an incoming arrow at its lower right.
  mail: (
    <>
      <path d="M21 12.5V6a1.5 1.5 0 0 0-1.5-1.5h-15A1.5 1.5 0 0 0 3 6v12a1.5 1.5 0 0 0 1.5 1.5h8" />
      <path d="m3.5 5.5 8.5 6 8.5-6" />
      <path d="M22 19h-6m2.5-2.5L16 19l2.5 2.5" />
    </>
  ),
  // Heart open at its lower right, with a plus.
  heart: (
    <>
      <path d="M12.5 20.2 12 20.5l-1.4-1.3C5.4 14.4 2 11.3 2 7.6 2 4.6 4.4 2.3 7.4 2.3c1.8 0 3.5.8 4.6 2.1 1.1-1.3 2.8-2.1 4.6-2.1 3 0 5.4 2.3 5.4 5.3 0 1.4-.5 2.8-1.4 4.1" />
      <path d="M18.5 14.5v7M15 18h7" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12M12 8v13" />
      <path d="M12 8C10.5 4 6.5 4 6.5 6.2 6.5 8 9.5 8 12 8Zm0 0c1.5-4 5.5-4 5.5-1.8C17.5 8 14.5 8 12 8Z" />
    </>
  ),
  star: <path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8Z" />,
  warning: (
    <>
      <path d="M12 3 2 20.5h20Z" />
      <path d="M12 9.5v5M12 17.5v.5" />
    </>
  ),
  // Checked list sheet (all icons collected).
  badge: (
    <>
      <path d="M12 21H5.5A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3h11A2.5 2.5 0 0 1 19 5.5V13" />
      <path d="M7 8h8M7 12h8M7 16h4m3.5 2 2 2 4-4.5" />
    </>
  ),
};

/** 40 px type icon of a row or of the detail window. */
export function NotificationKindIcon({ icon, size = 40 }: { icon: NotificationIcon; size?: number }) {
  return (
    <Outline size={size} className={`shrink-0 ${KIND_ICON_COLOR[icon]}`} data-icon={icon}>
      {KIND_ICON_PATHS[icon]}
    </Outline>
  );
}

/** "Đánh dấu đọc tất cả": three offset lines, as drawn in Figma 589:9152. */
export function MarkAllReadIcon(props: IconProps) {
  return (
    <Outline strokeLinecap="square" {...props}>
      <path d="M8 7.5h12M6 11.5h12M4 15.5h12" />
    </Outline>
  );
}

/** North-east arrow after the inline "Tiêu chuẩn cộng đồng" link. */
export function ExternalArrowIcon(props: IconProps) {
  return (
    <Outline strokeWidth={3} strokeLinecap="square" {...props}>
      <path d="M7 17 17 7M9 7h8v8" />
    </Outline>
  );
}
