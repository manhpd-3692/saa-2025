import type { ReactNode } from "react";
import { getRequestTranslator } from "@/i18n/get-request-translator";
import { LocaleSwitcher } from "./locale-switcher";
import { SaaLogo } from "./saa-logo";

/**
 * F001 minimal chrome (DEC-002, Codex R07, C01) for Login, 403 and 404, with or
 * without a session: logo and language switch on top, copyright at the bottom,
 * no nav, bell, avatar or FAB, and no `/me` call. The root is the positioning
 * context, so a page may paint full-bleed artwork behind the translucent bar
 * with an `absolute inset-0` layer.
 */
export async function MinimalChrome({ children }: { children: ReactNode }) {
  const { t } = await getRequestTranslator("common", "shell");
  return (
    // overflow-x-clip: wide artwork layers never widen the page (desktop min width, R17).
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <header className="relative z-10 flex h-20 items-center justify-between bg-header px-36">
        <SaaLogo alt={t("app.name")} />
        <LocaleSwitcher />
      </header>
      {/* Not positioned: a page's `absolute inset-0` art layer spans the whole root. */}
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="relative z-10 border-t border-divider py-8 text-center text-base font-bold leading-6">
        {t("shell.copyright")}
      </footer>
    </div>
  );
}
