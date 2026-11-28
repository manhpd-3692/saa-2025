/** Share of an award card on screen before its menu item turns active (tech spec § 4.6). */
export const ACTIVE_AWARD_VISIBILITY_THRESHOLD = 0.3;

/**
 * F004 DEC-002 scroll-spy rule: the topmost award (in catalog order) that is at
 * least 30 % on screen is active. While no card reaches the threshold, the
 * current item stays active, so the first award is active above the first
 * card (the initial state) and the last one while the Kudos block is in view.
 */
export function pickActiveAward(
  order: readonly string[],
  visibleRatios: Readonly<Record<string, number>>,
  current: string,
): string {
  return order.find((slug) => (visibleRatios[slug] ?? 0) >= ACTIVE_AWARD_VISIBILITY_THRESHOLD) ?? current;
}
