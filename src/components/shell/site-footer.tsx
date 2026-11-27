import Link from "next/link";
import { getRequestTranslator } from "@/i18n/get-request-translator";
import { FOOTER_NAV_ITEMS } from "./nav-active-item";
import { SaaLogo } from "./saa-logo";

/**
 * F001 R3 footer of the full shell (homepage footer): logo → Homepage (FR-103),
 * About SAA 2025 / Award Information / Sun* Kudos / Tiêu chuẩn chung (FR-102)
 * and the copyright line. Hovered links take the gold glow of the design.
 */
export async function SiteFooter() {
  const { t } = await getRequestTranslator("shell");
  return (
    <footer className="border-t border-divider">
      <div className="flex items-center px-12 py-10 min-[1440px]:px-[90px]">
        <Link href="/" aria-label={t("shell.home")} className="shrink-0">
          <SaaLogo size="large" />
        </Link>
        <nav aria-label={t("shell.footer.label")} className="ml-6 min-[1440px]:ml-20">
          <ul className="flex items-center gap-4 min-[1440px]:gap-12">
            {FOOTER_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex h-14 items-center rounded-control px-4 text-base font-bold text-white hover:bg-primary-soft hover:text-glow"
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="ml-auto pl-6 text-base font-bold">{t("shell.copyright")}</p>
      </div>
    </footer>
  );
}
