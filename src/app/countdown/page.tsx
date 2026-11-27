import { redirect } from "next/navigation";
import { connection } from "next/server";
import { buildCountdownCopy } from "@/features/countdown/countdown-copy";
import { LaunchCountdown } from "@/features/countdown/launch-countdown";
import { getRequestTranslator } from "@/i18n/get-request-translator";
import { getCurrentEventForPage } from "@/lib/events/events-api";

// The page must decide countdown / Homepage / "Coming soon" from a fresh Go
// read before any markup is sent (FR-102: no countdown markup after the start),
// so it blocks instead of streaming a static shell.
export const instant = false;

/**
 * F003 A2 Countdown - Prelaunch (Figma 2268:35127), a bare route: no header,
 * footer or navigation (FR-203, F001 SC-004). DEC-004:
 * - event started (`status: active`, BR-001) → Homepage (307);
 * - event upcoming → title and the live launch countdown (server clock offset);
 * - no event row, Go error or 5 s timeout → "Coming soon" without digits (FR-204).
 * Language follows the visitor's saved choice, Vietnamese otherwise (D004).
 */
export default async function CountdownPage() {
  await connection(); // the Go read belongs to a real request, never to the build's prerender
  const [event, { locale, t }] = await Promise.all([
    getCurrentEventForPage(),
    getRequestTranslator("countdown"),
  ]);
  if (event?.status === "active") redirect("/");

  return (
    <main className="relative flex min-h-screen flex-col items-center pt-[29.15vh]">
      {/*
        E01 artwork with the E02 gradient already baked in: a low-res crop of the
        reference PNG with the text removed; replace with the real Figma export.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url(/images/countdown/countdown-background.webp)] bg-cover bg-center"
      />
      <div className="relative flex flex-col items-center">
        {event ? (
          <>
            <h1 className="text-4xl font-bold leading-[48px] text-white">{t("countdown.title")}</h1>
            <div className="mt-6">
              <LaunchCountdown
                startAt={event.startAt}
                serverNow={event.serverNow}
                copy={buildCountdownCopy(locale, t)}
              />
            </div>
          </>
        ) : (
          <p role="status" className="text-4xl font-bold leading-[48px] text-white">
            {t("countdown.comingSoon")}
          </p>
        )}
      </div>
    </main>
  );
}
