"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/i18n/locale-provider";
import { findActiveNavHref, type NavItem } from "./nav-active-item";

const VARIANTS = {
  /** Sunner header (Figma 313:9137): 14 px bold, underline 14 px above the bar's edge. */
  main: {
    list: "gap-6",
    link: "h-20 text-sm font-bold after:bottom-[14px]",
  },
  /** Admin header (F010 A7, admin-overview frame): 16 px medium on an 88 px bar. */
  admin: {
    list: "gap-4 min-[1440px]:gap-12",
    link: "h-[88px] text-base font-medium after:bottom-4",
  },
} as const;

/**
 * F001 A2 NavLinks: a layout cannot read the pathname (it does not re-render),
 * so this client island marks exactly one item as current with
 * `aria-current="page"`, gold text and an underline (FR-101, F010 DEC-001).
 */
export function NavLinks({
  items,
  labelKey,
  variant = "main",
}: {
  items: readonly NavItem[];
  /** Dictionary key of the nav landmark's label. */
  labelKey: string;
  variant?: keyof typeof VARIANTS;
}) {
  const pathname = usePathname();
  const { t } = useLocale();
  const active = findActiveNavHref(items, pathname);
  const style = VARIANTS[variant];

  return (
    <nav aria-label={t(labelKey)}>
      <ul className={`flex items-center ${style.list}`}>
        {items.map((item) => {
          const current = item.href === active;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`relative flex items-center px-4 transition-colors after:absolute after:inset-x-0 after:h-px ${style.link} ${
                  current ? "text-primary text-glow after:bg-primary" : "text-white hover:text-primary"
                }`}
              >
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
