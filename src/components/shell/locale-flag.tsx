import type { Locale } from "@/i18n/locale-config";

/** 20×15 flag shown next to the language code (Figma 721:4942). Decorative. */
export function LocaleFlag({ locale }: { locale: Locale }) {
  return locale === "vi" ? <VietnamFlag /> : <UnitedKingdomFlag />;
}

function VietnamFlag() {
  return (
    <svg width="20" height="15" viewBox="0 0 30 20" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect width="30" height="20" fill="#DA251D" />
      <polygon
        fill="#FFFF00"
        points="15,4 16.35,8.15 20.71,8.15 17.18,10.71 18.53,14.85 15,12.29 11.47,14.85 12.82,10.71 9.29,8.15 13.65,8.15"
      />
    </svg>
  );
}

function UnitedKingdomFlag() {
  return (
    <svg width="20" height="15" viewBox="0 0 60 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
      <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}
