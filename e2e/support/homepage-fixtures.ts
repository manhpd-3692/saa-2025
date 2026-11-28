/**
 * Helpers for the F004 Homepage / Awards / Community Standards spec: read the current event from
 * the public Go endpoint, read the ceremony countdown digits, and the expected design copy
 * (independent of the app's catalog module, so the spec is a real oracle).
 */
import type { APIRequestContext, Page } from "@playwright/test";

export const AWARD_SLUGS = ["top-talent", "top-project", "top-project-leader", "best-manager", "signature-2025-creator", "mvp"];
export const AWARD_NAMES = ["Top Talent", "Top Project", "Top Project Leader", "Best Manager", "Signature 2025 - Creator", "MVP (Most Valuable Person)"];
export const MENU_LABELS = ["Top Talent", "Top Project", "Top Project Leader", "Best Manager", "Signature 2025 - Creator", "MVP"];
/** Prize values per award as written in the design (BR-001 configuration). */
export const AWARD_PRIZES = [["7.000.000 VNĐ"], ["15.000.000 VNĐ"], ["7.000.000 VNĐ"], ["10.000.000 VNĐ"], ["5.000.000 VNĐ", "8.000.000 VNĐ"], ["15.000.000 VNĐ"]];
export const AWARD_QUANTITIES = ["10", "02", "03", "01", "01", "01"];

export interface EventReading {
  startAt: string;
  ceremonyAt: string;
  serverNow: string;
  venue: string | null;
  livestreamNote: string | null;
}

export async function readCurrentEvent(api: APIRequestContext): Promise<EventReading> {
  const apiBase = process.env.E2E_API_BASE_URL ?? "http://localhost:8080";
  const response = await api.get(`${apiBase}/api/v1/events/current`);
  if (!response.ok()) throw new Error(`events/current answered ${response.status()}`);
  return response.json();
}

/** Whole minutes from `from` to `to` (ISO), as the countdown floors them. */
export const minutesBetween = (fromIso: string, toIso: string) =>
  Math.max(0, Math.floor((Date.parse(toIso) - Date.parse(fromIso)) / 60_000));

/** dd/MM/yyyy in Vietnam time, as the event info shows `ceremonyAt`. */
export const vietnamDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

export const ceremonyUnit = (page: Page, name: "days" | "hours" | "minutes") =>
  page.getByTestId("ceremony-countdown").locator(`[data-unit="${name}"]`);

/** The ceremony countdown as total minutes (days × 1440 + hours × 60 + minutes). */
export async function countdownTotalMinutes(page: Page): Promise<number> {
  const [days, hours, minutes] = await Promise.all(
    (["days", "hours", "minutes"] as const).map(async (name) => Number(await ceremonyUnit(page, name).getAttribute("data-value"))),
  );
  return days * 1440 + hours * 60 + minutes;
}

export const markDocument = (page: Page) => page.evaluate(() => Object.assign(window, { __sameDocument: true }));
export const sameDocument = (page: Page) => page.evaluate(() => (window as { __sameDocument?: boolean }).__sameDocument === true);

/** The menu label currently marked `aria-current` on the Awards page. */
export const activeMenuLabel = (page: Page) =>
  page.getByRole("navigation", { name: "Hệ thống giải thưởng" }).locator('[aria-current="true"]').innerText();
