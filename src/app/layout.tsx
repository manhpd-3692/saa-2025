import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getRequestLocale } from "@/i18n/get-request-locale";
import { loadDictionary } from "@/i18n/load-dictionary";
import { LocaleProvider } from "@/i18n/locale-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getRequestLocale();
  const dictionary = await loadDictionary(locale, "common");

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider locale={locale} dictionary={dictionary}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
