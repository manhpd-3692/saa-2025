import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { getRequestLocale } from "@/i18n/get-request-locale";
import { loadDictionaries } from "@/i18n/load-dictionary";
import { CLIENT_NAMESPACES } from "@/i18n/locale-config";
import { LocaleProvider } from "@/i18n/locale-provider";
import "./globals.css";

// Design font for body text and buttons; the Vietnamese subset carries the diacritics.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sun* Annual Awards 2025",
  description: "Sun* Annual Awards 2025",
};

// <html lang> needs the request locale (cookie / Accept-Language), which is runtime
// data, so the whole app is allowed to block instead of prerendering a static shell
// (Cache Components). Add per-route <Suspense>/loading.tsx boundaries where streaming helps.
export const instant = false;

// Root layout: <html lang>, <body>, fonts and the locale provider only (F001 A6).
// Chrome lives in the route-group layouts; no per-user data is fetched here.
// Desktop only (R17): below 1260 px CSS width (a 1280 px window minus a classic
// scrollbar) the page keeps its layout and scrolls sideways.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getRequestLocale();
  const dictionary = await loadDictionaries(locale, CLIENT_NAMESPACES);

  return (
    <html lang={locale} className={`${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full min-w-[1260px] flex-col">
        <LocaleProvider locale={locale} dictionary={dictionary}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
