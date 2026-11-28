import type { Translate } from "@/i18n/load-translator";
import type { CurrentEvent } from "@/lib/events/events-api";
import { formatEventDate } from "./format-event-date";

const LABEL = "text-base font-bold leading-6";
const VALUE = "text-2xl font-bold leading-8 text-primary";

/**
 * F004 FR-203 event info from the shared event row (D002, AD14): the date of
 * `ceremonyAt`, the venue and the livestream note. A field left empty in the
 * row is left out rather than shown blank.
 */
export function EventInfoBlock({ event, t }: { event: CurrentEvent; t: Translate }) {
  return (
    <div data-testid="event-info" className="mt-4">
      <p className="flex items-baseline gap-[60px]">
        <span className="flex items-baseline gap-1">
          <span className={LABEL}>{t("home.event.time")}</span>
          <time dateTime={event.ceremonyAt} className={VALUE}>
            {formatEventDate(event.ceremonyAt)}
          </time>
        </span>
        {event.venue && (
          <span className="flex items-baseline gap-1">
            <span className={LABEL}>{t("home.event.venue")}</span>
            <span className={VALUE}>{event.venue}</span>
          </span>
        )}
      </p>
      {event.livestreamNote && (
        <p className={`mt-2.5 tracking-[0.5px] ${LABEL}`}>{event.livestreamNote}</p>
      )}
    </div>
  );
}
