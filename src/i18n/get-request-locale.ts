import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE_NAME, type Locale } from "./locale-config";
import { resolveLocale } from "./resolve-locale";

/**
 * Locale of the current request (A6): cookie -> Accept-Language -> `vi`.
 * Reads request APIs, so call it from a dynamic (Suspense-wrapped) boundary.
 */
export async function getRequestLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
}
