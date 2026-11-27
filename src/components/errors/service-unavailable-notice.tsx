import Link from "next/link";
import { getRequestTranslator } from "@/i18n/get-request-translator";

/**
 * Shown by the admin layout when Go `/me` fails or exceeds 5 s (Codex R23):
 * the role is unknown, so neither the admin chrome nor the Forbidden page is
 * right. Reloading retries; the Homepage link leaves the admin area.
 */
export async function ServiceUnavailableNotice() {
  const { t } = await getRequestTranslator("common", "errors");
  return (
    <section role="alert" className="relative flex flex-1 flex-col items-center justify-center gap-8 px-36 py-20 text-center">
      <p className="text-2xl font-bold">{t("error.network")}</p>
      <Link href="/" className="flex h-14 items-center rounded-panel bg-primary px-6 text-lg font-bold text-on-primary">
        {t("errors.backHome")}
      </Link>
    </section>
  );
}
