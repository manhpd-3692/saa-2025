import type { Locale } from "./locale-config";

/**
 * Copy held in typed content modules (award catalog, community standards) rather
 * than JSON dictionaries. Vietnamese is the master; a language without its own
 * text shows the Vietnamese one (F004 FR-002, D004). Only copy supplied by the
 * design goes in here: no invented translations.
 */
export interface LocalizedText {
  readonly vi: string;
  readonly en?: string;
}

export function pickLocalized(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.vi;
}
