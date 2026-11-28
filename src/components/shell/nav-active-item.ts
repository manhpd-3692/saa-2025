/**
 * Navigation items and the active-item rule shared by the header, footer and
 * admin header (F001 A2, F010 A7 DEC-001). Pure, so it is unit-tested; the
 * client `NavLinks` applies it to `usePathname()` (layouts cannot, R07).
 */
export interface NavItem {
  href: string;
  /** Dictionary key of the label (resolved by the server component that renders the links). */
  labelKey: string;
  /** `exact`: only the href itself; `section`: the href and every path below it. */
  match: "exact" | "section";
  /** Other path prefixes that belong to this item's section. */
  alsoUnder?: readonly string[];
}

/**
 * Header items (FR-101); the logo and footer reuse the same destinations. A
 * teammate's profile `/profile/<id>` belongs to Sun* Kudos, whose cards lead
 * there (Figma 362:5097); the own profile `/profile` selects nothing (362:5037).
 */
export const MAIN_NAV_ITEMS: readonly NavItem[] = [
  { href: "/", labelKey: "shell.nav.about", match: "exact" },
  { href: "/awards", labelKey: "shell.nav.awards", match: "section" },
  { href: "/kudos", labelKey: "shell.nav.kudos", match: "section", alsoUnder: ["/profile/"] },
];

/** Footer items (FR-102): the header destinations plus Community Standards. */
export const FOOTER_NAV_ITEMS: readonly NavItem[] = [
  ...MAIN_NAV_ITEMS,
  { href: "/community-standards", labelKey: "shell.footer.standards", match: "section" },
];

function matches(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  if (item.match === "section" && pathname.startsWith(`${item.href}/`)) return true;
  return item.alsoUnder?.some((prefix) => pathname.startsWith(prefix)) ?? false;
}

/** The single selected href for `pathname`, or null: the longest matching item wins. */
export function findActiveNavHref(items: readonly NavItem[], pathname: string): string | null {
  let active: NavItem | null = null;
  for (const item of items) {
    if (matches(item, pathname) && (!active || item.href.length > active.href.length)) active = item;
  }
  return active?.href ?? null;
}
