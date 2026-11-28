import { Suspense } from "react";
import { KeyVisualBackdrop } from "@/components/key-visual-backdrop";
import { SunKudosPromoBlock } from "@/features/awards/sun-kudos-promo-block";
import { HomeAboutSection } from "@/features/home/home-about-section";
import { HomeAwardsSection } from "@/features/home/home-awards-section";
import { HomeEventPanel, HomeEventPanelPlaceholder } from "@/features/home/home-event-panel";
import { HomeHero } from "@/features/home/home-hero";
import { getRequestTranslator } from "@/i18n/get-request-translator";

// The shell layout drops this segment when the profile is missing (it renders only
// ProfileRecoveryRedirect, N06), so it cannot be validated for instant navigation.
export const instant = false;

/**
 * F004 A1 Homepage SAA `/` (Figma 2167:9026), the landing page once the event
 * has started (FR-101; the proxy gates it before the start and without a
 * session). Static content renders at once; the event panel (ceremony
 * countdown and event info) streams in from a per-request Go read, so a slow
 * or missing event never holds back the rest of the page (SC-010).
 */
export default async function HomePage() {
  const { locale, t } = await getRequestTranslator("home", "awards");
  return (
    <div className="relative px-36 pb-[124px]">
      <KeyVisualBackdrop visual="home" fadeFrom={940} />
      <div className="relative">
        <HomeHero
          t={t}
          eventPanel={
            <Suspense fallback={<HomeEventPanelPlaceholder />}>
              <HomeEventPanel />
            </Suspense>
          }
        />
        <HomeAboutSection t={t} />
        <HomeAwardsSection locale={locale} t={t} />
        <SunKudosPromoBlock t={t} className="mx-auto mt-[136px] max-w-[1120px]" />
      </div>
    </div>
  );
}
