import type { NavItem } from "@/components/shell/nav-active-item";

/**
 * F010 A7 admin header navigation, rendered by F001's admin layout through the
 * client `NavLinks` (Codex R07). DEC-001: `/admin` → Overview only; each other
 * item is selected on its own path and below. Label "User" per F010 D011.
 * Items whose page is not built yet lead to the 404 page (F001 A8).
 * Created in phase 3; phase 11 owns later edits.
 */
export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { href: "/admin", labelKey: "shell.admin.nav.overview", match: "exact" },
  { href: "/admin/review", labelKey: "shell.admin.nav.review", match: "section" },
  { href: "/admin/users", labelKey: "shell.admin.nav.users", match: "section" },
  { href: "/admin/settings", labelKey: "shell.admin.nav.settings", match: "section" },
];
