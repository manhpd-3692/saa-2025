import Link from "next/link";
import type { ReactNode } from "react";
import { ADMIN_NAV_ITEMS } from "@/features/admin/admin-nav-items";
import { getRequestTranslator } from "@/i18n/get-request-translator";
import { AvatarMenu } from "./avatar-menu";
import { LocaleSwitcher } from "./locale-switcher";
import { NavLinks } from "./nav-links";
import { NotificationBellSlot } from "./notification-bell-slot";
import { SaaLogo } from "./saa-logo";

/**
 * F001 admin chrome (DEC-002, admin-overview frame): grey bar with the logo and
 * "ADMIN", F010's nav items through `NavLinks` (A7), then bell, language switch
 * and avatar; grey page; copyright at the bottom. Rendered by
 * `app/admin/layout.tsx` for admins only; Go `RequireAdmin` guards the data.
 */
export async function AdminChrome({ children }: { children: ReactNode }) {
  const { t } = await getRequestTranslator("shell");
  return (
    <div className="flex min-h-screen flex-col bg-admin-page">
      <header className="sticky top-0 z-40 flex h-[88px] items-center bg-admin-header px-36">
        <Link href="/" aria-label={t("shell.home")} className="flex shrink-0 items-center gap-1.5">
          <SaaLogo size="large" />
          <span className="border-l border-white/60 pl-1.5 text-base leading-5 text-primary">{t("shell.admin.badge")}</span>
        </Link>
        <div className="ml-10 min-[1440px]:ml-[106px]">
          <NavLinks items={ADMIN_NAV_ITEMS} labelKey="shell.admin.nav.label" variant="admin" />
        </div>
        <div className="ml-auto flex items-center gap-4">
          <NotificationBellSlot />
          <LocaleSwitcher />
          <AvatarMenu />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="py-4 text-center text-base text-on-primary">{t("shell.copyright")}</footer>
    </div>
  );
}
