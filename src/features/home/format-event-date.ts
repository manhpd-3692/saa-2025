/** The ceremony takes place in Vietnam; its date is shown in Vietnam time. */
export const EVENT_TIME_ZONE = "Asia/Ho_Chi_Minh";

const EVENT_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: EVENT_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** FR-203 event date as in the design ("26/12/2025"), from the event's `ceremonyAt`. */
export function formatEventDate(iso: string): string {
  return EVENT_DATE_FORMAT.format(new Date(iso));
}
