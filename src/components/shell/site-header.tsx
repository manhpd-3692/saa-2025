import Link from "next/link";
import { getRequestTranslator } from "@/i18n/get-request-translator";
import { AvatarMenu } from "./avatar-menu";
import { LocaleSwitcher } from "./locale-switcher";
import { MAIN_NAV_ITEMS } from "./nav-active-item";
import { NavLinks } from "./nav-links";
import { NotificationBellSlot } from "./notification-bell-slot";
import { SaaLogo } from "./saa-logo";

/**
 * F001 R1 header of the full shell (Figma 313:9137, homepage header): logo →
 * Homepage (FR-103), three section links (FR-101), then bell, language switch
 * and avatar menu. Sticky rather than fixed so a window under 1280 px scrolls
 * it sideways with the page (R17). Bell and avatar read the session user from
 * `MeRefresher` and hide when there is none (FR-602).
 */
export async function SiteHeader() {
  const { t } = await getRequestTranslator("shell");
  return (
    <header className="sticky top-0 z-40 h-20 bg-header">
      <div className="flex h-full items-center px-36">
        <Link href="/" aria-label={t("shell.home")} className="shrink-0">
          <SaaLogo />
        </Link>
        <div className="ml-16">
          <NavLinks items={MAIN_NAV_ITEMS} labelKey="shell.nav.label" />
        </div>
        <div className="ml-auto flex items-center gap-4">
          <NotificationBellSlot />
          <LocaleSwitcher />
          <AvatarMenu />
        </div>
      </div>
    </header>
  );
}
