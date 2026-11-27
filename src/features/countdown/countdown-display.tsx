import { COUNTDOWN_UNITS, describeRemaining, type CountdownCopy } from "./countdown-copy";
import { SevenSegmentDigit } from "./seven-segment-digit";
import { padUnit, type RemainingTimeParts } from "./split-remaining-time";

/**
 * Shared pure countdown (F003 A4, reused by the F004 ceremony countdown, Codex
 * R08): days / hours / minutes as glass digit boxes with their labels, plus a
 * polite live region that reads the time in full words when a minute changes
 * (E09). No timers, no redirects, no event status. Sizes from the 1512 px
 * reference: 77 x 123 px boxes, 21 px between boxes, 60 px between units.
 */
export function CountdownDisplay({ parts, copy }: { parts: RemainingTimeParts; copy: CountdownCopy }) {
  return (
    <div>
      <div aria-hidden="true" className="flex gap-[60px]">
        {COUNTDOWN_UNITS.map((unit) => {
          const value = padUnit(parts[unit]);
          return (
            <div key={unit} data-unit={unit} data-value={value} className="flex flex-col gap-[21px]">
              <div className="flex gap-[21px]">
                {value.split("").map((digit, index) => (
                  <DigitBox key={index} digit={digit} />
                ))}
              </div>
              <span className="text-4xl font-bold leading-[48px] text-white">{copy.labels[unit]}</span>
            </div>
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {describeRemaining(parts, copy)}
      </p>
    </div>
  );
}

/**
 * Glass box: half-opaque white-to-clear gradient with a gold hairline and a
 * 24.96 px backdrop blur; browsers without backdrop blur get a solid
 * semi-transparent fill underneath instead (AD14).
 */
function DigitBox({ digit }: { digit: string }) {
  return (
    <div className="relative flex h-[123px] w-[77px] items-center justify-center pt-[5px] text-white">
      <span className="absolute inset-0 rounded-lg [@supports_not_(backdrop-filter:blur(1px))]:bg-page/80" />
      <span className="absolute inset-0 rounded-lg border border-primary/80 bg-linear-to-b from-white to-white/10 opacity-50 backdrop-blur-[24.96px]" />
      <span className="relative">
        <SevenSegmentDigit digit={digit} />
      </span>
    </div>
  );
}
