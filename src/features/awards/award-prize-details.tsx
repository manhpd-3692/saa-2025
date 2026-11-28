import type { Translate } from "@/i18n/load-translator";
import { formatAwardQuantity, formatVnd, type Award, type AwardPrize } from "./award-catalog";
import { AwardDiamondIcon, AwardMedalIcon } from "./award-icons";

const LABEL = "text-2xl font-bold leading-8 text-primary";
const FIGURE = "text-4xl font-bold leading-[44px]";
const NOTE = "text-sm font-bold leading-5";

/**
 * Quantity and prize rows of an award card (FR-303): "Số lượng giải thưởng"
 * with the zero-padded count and its unit, then "Giá trị giải thưởng". The
 * dual-prize variant (Signature 2025 - Creator, BR-002, FR-304) shows the
 * individual and the team value separated by an "Hoặc" rule.
 */
export function AwardPrizeDetails({ award, t }: { award: Award; t: Translate }) {
  return (
    <>
      {/* Below 1440 px the count may drop under the label rather than squeeze it. */}
      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-divider py-8">
        <span className="flex items-center gap-4 whitespace-nowrap">
          <AwardDiamondIcon className="shrink-0" />
          <span className={LABEL}>{t("awards.quantity")}</span>
        </span>
        <span className="flex items-center gap-2.5">
          <span data-testid="award-quantity" className={FIGURE}>
            {formatAwardQuantity(award.quantity)}
          </span>
          {/* A narrow box, as in the design: the unit wraps under itself ("Cá / nhân"). */}
          <span className={`w-[58px] ${NOTE}`}>{t(`awards.unit.${award.unit}`)}</span>
        </span>
      </div>
      {award.prizes.map((prize, index) => (
        <div key={prize.note ?? index}>
          {index > 0 && (
            <div className="mt-8 flex items-center gap-2 text-sm font-bold leading-5 text-divider">
              <span>{t("awards.or")}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-divider" />
            </div>
          )}
          <PrizeValue prize={prize} t={t} />
        </div>
      ))}
    </>
  );
}

function PrizeValue({ prize, t }: { prize: AwardPrize; t: Translate }) {
  return (
    <div className="pt-8">
      <p className="flex items-center gap-4">
        <AwardMedalIcon className="shrink-0" />
        <span className={LABEL}>{t("awards.value")}</span>
      </p>
      <p data-testid="award-prize" className={`mt-4 ${FIGURE}`}>
        {formatVnd(prize.valueVnd)}
      </p>
      {prize.note && <p className={`mt-4 ${NOTE}`}>{t(`awards.prize.note.${prize.note}`)}</p>}
    </div>
  );
}
