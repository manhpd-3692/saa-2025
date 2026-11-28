import type { SVGProps } from "react";

/**
 * Inline icons of the write-kudo window, drawn to the shapes in
 * docs/figma-refs/user/write-kudo*.png. Decorative: callers label the control.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export function BoldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 4h6.2a4.3 4.3 0 0 1 3 7.4A4.5 4.5 0 0 1 13.8 20H7V4zm3 3v3.5h3.1a1.75 1.75 0 0 0 0-3.5H10zm0 6.5V17h3.6a1.75 1.75 0 0 0 0-3.5H10z" />
    </Icon>
  );
}

export function ItalicIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 4h8v3h-2.8l-3.4 10H15v3H7v-3h2.8l3.4-10H10z" />
    </Icon>
  );
}

export function StrikeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 11h16v2H4zM12.3 4c2.6 0 4.4 1.3 4.9 3.4l-2.5.6c-.3-1.1-1.2-1.6-2.5-1.6-1.4 0-2.4.6-2.4 1.6 0 .4.2.8.6 1H7c-.2-.4-.3-.9-.3-1.4C6.7 5.6 9 4 12.3 4zm2.3 10.5h2.8c.2.4.3.9.3 1.4 0 2.4-2.3 4.1-5.6 4.1-2.8 0-4.8-1.4-5.3-3.6l2.5-.6c.3 1.2 1.3 1.8 2.8 1.8 1.5 0 2.6-.6 2.6-1.7 0-.6-.2-1-.1-1.4z" />
    </Icon>
  );
}

export function OrderedListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 5h12v2H9zm0 6h12v2H9zm0 6h12v2H9zM4 4h1.5v4H4.5V5.2H4zm-.2 7.4c.2-.7.8-1.1 1.5-1.1.9 0 1.5.5 1.5 1.3 0 .5-.3.9-.8 1.3l-.6.5h1.4v.9H3.8v-.8l1.5-1.3c.3-.3.4-.5.4-.7 0-.3-.2-.4-.4-.4-.3 0-.5.2-.5.5zM3.8 17h1.3c.3 0 .5-.2.5-.4s-.2-.4-.5-.4c-.3 0-.5.1-.5.4h-.9c0-.8.6-1.2 1.4-1.2.9 0 1.4.4 1.4 1 0 .4-.2.7-.5.8.4.1.6.4.6.8 0 .7-.6 1.2-1.5 1.2s-1.5-.5-1.5-1.2h.9c0 .3.2.4.6.4.3 0 .5-.2.5-.4 0-.3-.2-.4-.6-.4h-.5z" />
    </Icon>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <Icon fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...props}>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" />
    </Icon>
  );
}

export function QuoteIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h6v6.5c0 3-1.6 5-4.6 5.5l-.5-1.6c1.6-.5 2.3-1.5 2.4-2.9H4zm10 0h6v6.5c0 3-1.6 5-4.6 5.5l-.5-1.6c1.6-.5 2.3-1.5 2.4-2.9H14z" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z" />
    </Icon>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Icon fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" {...props}>
      <path d="M4 4l17 8-17 8 3-8z" />
      <path d="M7 12h6" />
    </Icon>
  );
}

export function SaveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v14h14V8.8L15.2 5H15v4H7V5zm4 0v2h4V5zm3 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
    </Icon>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm-1.2 13.6 6.3-6.3-1.4-1.4-4.9 4.9-2.3-2.3-1.4 1.4z" />
    </Icon>
  );
}
