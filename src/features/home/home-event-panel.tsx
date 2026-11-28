import { connection } from "next/server";
import { buildCountdownCopy } from "@/features/countdown/countdown-copy";
import { getRequestTranslator } from "@/i18n/get-request-translator";
import { getCurrentEventForPage } from "@/lib/events/events-api";
import { CeremonyCountdown } from "./ceremony-countdown";
import { EventFallbackRetry } from "./event-fallback-retry";
import { EventInfoBlock } from "./event-info-block";

/** Height of the countdown and event info together, kept by the placeholder and the fallback. */
const PANEL_MIN_HEIGHT = "min-h-[262px]";

/**
 * F004 A1/A2 dynamic part of the Homepage: a fresh Go read of the current
 * event (no-store, 5 s, Codex R23) per request, streamed inside a Suspense
 * boundary so the static content never waits for it. With an event: "Coming
 * soon", the ceremony countdown (the shared F003 display at 2/3 size, as in
 * the design) and the event info. Without one (no row, error, timeout): the
 * fallback with retry (SC-010).
 */
export async function HomeEventPanel() {
  await connection(); // a real request's Go read, never the build's prerender
  const [event, { locale, t }] = await Promise.all([
    getCurrentEventForPage(),
    getRequestTranslator("home", "countdown", "common"),
  ]);
  if (!event) return <EventFallbackRetry message={t("home.event.unavailable")} retryLabel={t("common.retry")} />;

  return (
    <div className={PANEL_MIN_HEIGHT}>
      <p className="text-2xl font-bold leading-8">{t("countdown.comingSoon")}</p>
      <div data-testid="ceremony-countdown" className="mt-5 [zoom:0.6667]">
        {/* Remount on every server read: the countdown keeps `serverNow` in state, so a soft
            refresh with a new `serverNow`/`ceremonyAt` must re-anchor the clock (review W1). */}
        <CeremonyCountdown
          key={event.serverNow}
          ceremonyAt={event.ceremonyAt}
          serverNow={event.serverNow}
          copy={buildCountdownCopy(locale, t)}
        />
      </div>
      <EventInfoBlock event={event} t={t} />
    </div>
  );
}

/** Suspense fallback: holds the panel's space while the event is read. */
export function HomeEventPanelPlaceholder() {
  return <div aria-hidden="true" className={PANEL_MIN_HEIGHT} />;
}
