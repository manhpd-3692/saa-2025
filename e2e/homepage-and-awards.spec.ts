import { expect, request, test, type APIRequestContext } from "@playwright/test";
import {
  AWARD_NAMES,
  AWARD_SLUGS,
  ceremonyUnit,
  countdownTotalMinutes,
  markDocument,
  minutesBetween,
  readCurrentEvent,
  sameDocument,
  vietnamDate,
} from "./support/homepage-fixtures";
import { applyEventScenario, hideAndShowTab, stallEventsRead, waitForCountdownHydration } from "./support/launch-gate-fixtures";
import { runLocalSql } from "./support/local-database";
import { ANONYMOUS, USER_STATE, requireState, stateOrAnonymous } from "./support/test-sessions";

/**
 * F004 Homepage SAA (phase 5) against the running stack: ceremony countdown and event info from
 * the Go event row in every seed state, the fallback, the static homepage content and its links.
 * The event row is switched with the real `backend/db/seeds/*.sql` and put back to `live`.
 * Awards page, Community Standards, sign-in and widths: awards-and-community-standards.spec.ts.
 * Covers SC-005, SC-007..SC-010, FR-101, FR-201..FR-207, FR-403, US001, US002, US005.
 */
test.use({ locale: "vi-VN", storageState: stateOrAnonymous(USER_STATE) });
// SQL runs through `wsl docker`, which can stall for tens of seconds and retries (see e2e/README.md).
const HOOK_TIMEOUT_MS = 150_000;
test.describe.configure({ mode: "serial", timeout: HOOK_TIMEOUT_MS });

let api: APIRequestContext;
const UNITS = ["days", "hours", "minutes"] as const;

test.beforeAll(async () => {
  test.setTimeout(HOOK_TIMEOUT_MS);
  requireState(USER_STATE);
  api = await request.newContext({ storageState: ANONYMOUS });
  applyEventScenario("live");
});

test.afterAll(async () => {
  test.setTimeout(HOOK_TIMEOUT_MS);
  applyEventScenario("live");
  await api.dispose();
});

test("live: hero, ceremony countdown on the server clock, event info, about text, six awards and Kudos (SC-005, SC-007, US001)", async ({ page }) => {
  const event = await readCurrentEvent(api);
  expect(Date.parse(event.startAt)).toBeLessThan(Date.parse(event.serverNow)); // the site is open (status active)
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "ROOT FURTHER" })).toBeVisible();
  await expect(page.getByText("Coming soon", { exact: true })).toBeVisible();
  // SC-005: counts to ceremony_at (start_at is already past), within a minute of the server time.
  const expected = minutesBetween(event.serverNow, event.ceremonyAt);
  expect(Math.abs((await countdownTotalMinutes(page)) - expected)).toBeLessThanOrEqual(1);
  await expect(ceremonyUnit(page, "days")).toContainText("DAYS");

  const info = page.getByTestId("event-info");
  await expect(info).toContainText(`Thời gian:${vietnamDate(event.ceremonyAt)}`);
  await expect(info).toContainText(`Địa điểm:${event.venue}`);
  await expect(info).toContainText(event.livestreamNote!);
  await expect(page.getByTestId("home-about")).toContainText("“A tree with deep roots fears no storm”");
  await expect(page.getByTestId("home-about")).toContainText("“Root Further” đã được chọn để trở thành chủ đề chính thức");

  // FR-206 / BR-001: six cards in catalog order, each "Chi tiết" opening its card on the Awards page.
  const awards = page.getByRole("region", { name: "Hệ thống giải thưởng" });
  await expect(awards.getByRole("heading", { level: 3 })).toHaveText(AWARD_NAMES);
  const details = awards.getByRole("link", { name: /^Chi tiết: / });
  expect(await details.evaluateAll((links) => links.map((a) => a.getAttribute("href")))).toEqual(AWARD_SLUGS.map((slug) => `/awards#${slug}`));
  // FR-204 / FR-207 / US005: the two calls to action and the Kudos block.
  await expect(page.getByRole("link", { name: "ABOUT AWARDS" })).toHaveAttribute("href", "/awards");
  await expect(page.getByRole("link", { name: "ABOUT KUDOS" })).toHaveAttribute("href", "/kudos");
  await expect(page.getByRole("heading", { level: 2, name: "Sun* Kudos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Chi tiết: Sun* Kudos" })).toHaveAttribute("href", "/kudos");

  // FR-403: the countdown keeps updating while the page stays open; nothing redirects (SC-007).
  await waitForCountdownHydration(page);
  await markDocument(page);
  const before = await countdownTotalMinutes(page);
  await page.clock.fastForward("03:00");
  await expect.poll(() => countdownTotalMinutes(page)).toBeLessThanOrEqual(before - 3);
  await expect(page).toHaveURL("/");
  expect(await sameDocument(page)).toBe(true);
});

test("refocus re-reads the server clock and corrects the digits without leaving the Homepage (SC-009)", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await waitForCountdownHydration(page);
  await markDocument(page);
  const onServerClock = await countdownTotalMinutes(page);
  await page.clock.fastForward("10:00"); // the page clock runs 10 minutes ahead of the server
  await expect.poll(() => countdownTotalMinutes(page)).toBeLessThanOrEqual(onServerClock - 10);
  await hideAndShowTab(page); // status is "active": the ceremony countdown must ignore it
  // The re-read has its own 5 s budget (Codex R23); allow for it on the slow WSL relay.
  await expect.poll(() => countdownTotalMinutes(page), { timeout: 12_000 }).toBeGreaterThanOrEqual(onServerClock - 1);
  await expect(page).toHaveURL("/");
  expect(await sameDocument(page)).toBe(true);
});

test("ceremony a few seconds ahead: the countdown reaches 00 00 00, stops and stays on the Homepage (SC-008)", async ({ page }) => {
  runLocalSql("update public.events set ceremony_at = now() + interval '75 seconds';");
  await page.clock.install();
  await page.goto("/");
  await expect(ceremonyUnit(page, "minutes")).toHaveAttribute("data-value", /^0[01]$/);
  await waitForCountdownHydration(page);
  await markDocument(page);
  await page.clock.fastForward("02:00"); // past the ceremony on the page clock
  for (const name of UNITS) await expect(ceremonyUnit(page, name)).toHaveAttribute("data-value", "00");
  await page.clock.fastForward("05:00");
  for (const name of UNITS) await expect(ceremonyUnit(page, name)).toHaveAttribute("data-value", "00");
  await expect(page).toHaveURL("/");
  expect(await sameDocument(page)).toBe(true);
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(6);
});

test("after-ceremony: the countdown reads 00 00 00 at load and the Homepage stays (SC-008, R16)", async ({ page }) => {
  applyEventScenario("after-ceremony");
  const event = await readCurrentEvent(api);
  await page.goto("/");
  for (const name of UNITS) await expect(ceremonyUnit(page, name)).toHaveAttribute("data-value", "00");
  await expect(page.getByTestId("event-info")).toContainText(vietnamDate(event.ceremonyAt));
  await page.waitForTimeout(1_500);
  await expect(page).toHaveURL("/");
});

test("no event row: countdown and event info show the fallback with retry, the rest renders; retry recovers (SC-010)", async ({ page }) => {
  runLocalSql("delete from public.events;");
  await page.goto("/");
  const fallback = page.getByTestId("event-fallback");
  await expect(fallback).toContainText("Thông tin sự kiện tạm thời không hiển thị được.");
  await expect(page.getByTestId("ceremony-countdown")).toHaveCount(0);
  await expect(page.getByTestId("event-info")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "ROOT FURTHER" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(6);
  await expect(page.getByRole("heading", { level: 2, name: "Sun* Kudos" })).toBeVisible();

  applyEventScenario("live");
  await fallback.getByRole("button", { name: "Thử lại" }).click();
  await expect(ceremonyUnit(page, "days")).toHaveAttribute("data-value", /^1[34]$/);
  await expect(page.getByTestId("event-fallback")).toHaveCount(0);
});

test("a stalled event read: static content first, the fallback after the 5 s budget (SC-010, Codex R23)", async ({ page }) => {
  const lock = await stallEventsRead("select 1;", 9);
  const started = Date.now();
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(6); // streamed before the event panel
  expect(await page.getByTestId("event-fallback").count()).toBe(0);
  await expect(page.getByTestId("event-fallback")).toBeVisible({ timeout: 12_000 });
  expect(Date.now() - started, "the panel waited for the 5 s budget").toBeGreaterThanOrEqual(4_500);
  await lock.released;
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(ceremonyUnit(page, "days")).toBeVisible();
});

test("a homepage award card opens that award on the Awards page; ABOUT AWARDS opens it at the top (US002, FR-102)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Chi tiết: Best Manager" }).click();
  await expect(page).toHaveURL("/awards#best-manager");
  const card = page.getByRole("article", { name: "Best Manager", exact: true });
  await expect.poll(async () => (await card.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(80);
  await expect.poll(async () => (await card.boundingBox())?.y ?? -1).toBeLessThan(200);

  await page.goto("/");
  await page.getByRole("link", { name: "ABOUT AWARDS" }).click();
  await expect(page).toHaveURL("/awards");
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
