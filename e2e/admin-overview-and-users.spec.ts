import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test, type Page } from "@playwright/test";
import { accessTokenOf, addDays, API_BASE_URL, directoryEmails, overviewOracle, readCsvDownload, sql, vnToday } from "./support/admin-report-fixtures";
import { setStoredRole } from "./support/local-database";
import { mintLocalSessionCookies } from "./support/local-session-cookies";
import { ADMIN_STATE, ANONYMOUS, DEMO_SUNNER_01 as AN, DEMO_SUNNER_02, requireState, stateOrAnonymous, USER_STATE } from "./support/test-sessions";

/**
 * F010 admin Overview and user directory (phase 11) against the running stack, `live` seed,
 * signed in as `saa.admin.e2e`. Expected numbers come from the database at test time. Covers
 * screen-tracker rows 56–61: FR-001, FR-101..104, FR-201..207, FR-401..403, FR-601, BR-001..008,
 * DEC-001..003, SC-001..004, SC-006, SC-008, SC-009 (browser side). Counting rules, CSV escaping
 * and the authorization matrix are proven in full by the Go tests.
 */
test.use({ locale: "vi-VN", storageState: stateOrAnonymous(ADMIN_STATE) });

const OVERVIEW_HEADER = ["No", "Unit", "Total member", "Total sent kudos", "Total received kudos", "Total users with at least one kudo", "Total received secret box"];
const USERS_HEADER = ["ID", "User", "Email", "Sent Kudos", "Received Kudos", "Total Heart", "Level", "Number of Badges", "Time to get 6 Badges", "Last Logged in", "Role"];

const VI_NAV = ["Tổng quan", "Duyệt nội dung", "Người dùng", "Cài đặt"];
const VI_USER_COLUMNS = [
  "ID", "Người dùng", "Email", "∑ Kudos đã gửi", "∑ Kudos đã nhận", "Tổng tim", "Level", "Số huy hiệu", "Thời gian đạt 6 huy hiệu", "Đăng nhập lần cuối", "Role", "Thao tác",
];

const rangeField = (page: Page) => page.getByTestId("date-range-field");
const tableCells = (page: Page, testId: string) =>
  page.getByTestId(testId).locator("tbody tr").evaluateAll((rows) => rows.map((row) => [...row.querySelectorAll("th, td")].map((cell) => (cell as HTMLElement).innerText.trim())));
const tableEmails = async (page: Page) => (await tableCells(page, "users-table")).map((cells) => cells[2]);
const exportFile = async (page: Page) => {
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-button").click()]);
  return { download, ...(await readCsvDownload(download)) };
};
const choose = async (page: Page, filter: string, option: string) => {
  await page.getByTestId(filter).getByRole("button").click();
  await page.getByRole("menuitemradio", { name: option, exact: true }).click();
};
const tierOf = (senders: number) => (senders >= 21 ? "Legend Hero" : senders >= 10 ? "Super Hero" : senders >= 5 ? "Rising Hero" : senders >= 1 ? "New Hero" : "-");

test.describe("Overview (row 56)", () => {
  test("opens on the last 30 days with All first and every unit; figures match a hand count (FR-101..104, BR-001..003, SC-001, SC-006, DEC-001)", async ({ page }) => {
    requireState(ADMIN_STATE);
    const to = vnToday();
    const from = addDays(to, -29);
    await page.goto("/admin");
    const nav = page.getByRole("navigation", { name: "Điều hướng quản trị" });
    await expect(nav.getByRole("link")).toHaveText(VI_NAV);
    await expect(nav.locator('[aria-current="page"]')).toHaveText(["Tổng quan"]);
    await expect(rangeField(page)).toHaveAttribute("aria-label", `Khoảng thời gian: ${from} → ${to}`);

    const rows = await tableCells(page, "overview-table");
    const units = sql(`select string_agg(code, ',' order by name, id) from public.units;`).split(",");
    expect(rows[0]).toEqual(["", "Tất cả", ...overviewOracle(from, to, null)]);
    expect(rows.slice(1).map((cells) => cells.slice(0, 2))).toEqual(units.map((code, i) => [String(i + 1), code]));
    for (const code of ["CECV1", "CECV3", "CECV5"]) {
      expect(rows.find((cells) => cells[1] === code)?.slice(2), code).toEqual(overviewOracle(from, to, code));
    }

    await page.goto("/admin?from=bad&to=2026-13-01"); // FR-104: silently the default range
    await expect(rangeField(page)).toHaveAttribute("aria-label", `Khoảng thời gian: ${from} → ${to}`);
    await expect(page.getByText("Không tải được dữ liệu. Vui lòng thử lại.")).toHaveCount(0);
    await nav.getByRole("link", { name: "Người dùng" }).click();
    await expect(nav.locator('[aria-current="page"]')).toHaveText(["Người dùng"]); // SC-006
  });

  test("the range picker applies a start and an end, refuses an earlier end and keeps the range when closed early (FR-401, BR-006, SM-001, D012)", async ({ page }) => {
    requireState(ADMIN_STATE);
    const today = vnToday();
    const [start, end] = [addDays(today, -10), addDays(today, -3)];
    await page.goto("/admin");
    const dialog = page.getByRole("dialog", { name: "Chọn khoảng thời gian" });
    const day = (iso: string) => dialog.getByRole("button", { name: iso, exact: true }).first();

    await rangeField(page).click();
    await day(start).click();
    await expect(day(addDays(start, -1))).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Áp dụng" })).toBeDisabled();
    await page.keyboard.press("Escape"); // only a start: nothing applied
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL("/admin");

    await rangeField(page).click();
    await day(start).click();
    await day(end).click();
    await dialog.getByRole("button", { name: "Áp dụng" }).click();
    await expect(page).toHaveURL(`/admin?from=${start}&to=${end}`);
    await expect(rangeField(page)).toHaveAttribute("aria-label", `Khoảng thời gian: ${start} → ${end}`);
    expect((await tableCells(page, "overview-table"))[0]).toEqual(["", "Tất cả", ...overviewOracle(start, end, null)]);

    await rangeField(page).click();
    await dialog.getByRole("button", { name: "7 ngày qua" }).click();
    await expect(page).toHaveURL(`/admin?from=${addDays(today, -6)}&to=${today}`);
    expect((await tableCells(page, "overview-table"))[0]).toEqual(["", "Tất cả", ...overviewOracle(addDays(today, -6), today, null)]);
  });

  test("Export downloads the table of the range, BOM first; the file name is readable cross-origin (FR-402, SC-002, SC-008, D004)", async ({ page, context, baseURL }) => {
    requireState(ADMIN_STATE);
    const today = vnToday();
    const from = addDays(today, -13);
    await page.goto(`/admin?from=${from}&to=${today}`);
    const { download, bom, records } = await exportFile(page);
    expect(download.suggestedFilename()).toBe(`saa-overview-${from}_${today}.csv`);
    expect(bom).toBe(true);
    expect(records[0]).toEqual(OVERVIEW_HEADER);
    // The file is language-neutral (English labels, D007): the All row is "All" there, "Tất cả" on screen.
    const screen = await tableCells(page, "overview-table");
    expect(screen[0][1]).toBe("Tất cả");
    expect(records.slice(1)).toEqual(screen.map((cells, i) => (i === 0 ? [cells[0], "All", ...cells.slice(2)] : cells)));

    const token = await accessTokenOf(context, baseURL!);
    const headers = await page.evaluate(async ({ api, bearer, path }) => {
      const res = await fetch(api + path, { headers: { Authorization: `Bearer ${bearer}` } });
      await res.blob();
      return { status: res.status, disposition: res.headers.get("Content-Disposition") };
    }, { api: API_BASE_URL, bearer: token, path: `/api/v1/admin/overview/export?from=${from}&to=${today}` });
    expect(headers).toEqual({ status: 200, disposition: `attachment; filename=saa-overview-${from}_${today}.csv` });
  });

  test("a failed or cut-off export saves no file and offers to try again (SC-009, Codex N11)", async ({ page }) => {
    requireState(ADMIN_STATE);
    const downloads: string[] = [];
    page.on("download", (d) => downloads.push(d.suggestedFilename()));
    await page.goto("/admin");
    const failure = page.getByRole("alert").filter({ hasText: "Xuất file thất bại, vui lòng thử lại." });

    await page.route("**/api/v1/admin/overview/export**", (route) => route.abort("connectionreset"));
    await page.getByTestId("export-button").click();
    await expect(failure).toBeVisible();
    await page.unroute("**/api/v1/admin/overview/export**");

    // Go aborting after the first rows (N11): a local server sends the headers and a few rows,
    // then drops the connection without the terminating chunk.
    const cutOff = createServer((_req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=cut-off.csv",
        "Access-Control-Allow-Origin": new URL(page.url()).origin,
        "Access-Control-Expose-Headers": "Content-Disposition",
      });
      res.write(`${String.fromCharCode(0xfeff)}No,Unit
,All
`);
      setTimeout(() => res.socket?.destroy(), 200);
    });
    await new Promise<void>((resolve) => cutOff.listen(0, "127.0.0.1", resolve));
    const { port } = cutOff.address() as AddressInfo;
    const served = new Promise((resolve) => cutOff.once("request", resolve));
    try {
      await page.route("**/api/v1/admin/overview/export**", (route) => route.continue({ url: `http://127.0.0.1:${port}/export` }));
      await failure.getByRole("button", { name: "Thử lại" }).click();
      await served;
      await expect(page.getByTestId("export-button")).toHaveText("Xuất file"); // the cut-off read has settled
      await expect(failure).toBeVisible();
      expect(downloads).toEqual([]);
    } finally {
      await page.unroute("**/api/v1/admin/overview/export**");
      cutOff.close();
    }

    const [download] = await Promise.all([page.waitForEvent("download"), failure.getByRole("button", { name: "Thử lại" }).click()]);
    expect((await readCsvDownload(download)).records.length).toBe((await tableCells(page, "overview-table")).length + 1);
    await expect(failure).toHaveCount(0);
  });
});

test.describe("User directory (rows 57–61)", () => {
  test("lists 20 Sunners a page by name with the twelve columns, the pager and a clamped page (FR-201, FR-204, FR-207, D013, DEC-003)", async ({ page }) => {
    requireState(ADMIN_STATE);
    const all = directoryEmails();
    await page.goto("/admin/users");
    await expect(page.getByTestId("users-table").locator("thead th")).toHaveText([
      ...VI_USER_COLUMNS,
    ]);
    expect(await tableEmails(page)).toEqual(all.slice(0, 20));
    const pager = page.getByTestId("admin-pager");
    await expect(pager).toContainText(`1–20 trên ${all.length} người dùng`);
    await pager.getByRole("link", { name: "Trang 2" }).click();
    await expect(page).toHaveURL("/admin/users?page=2");
    await expect.poll(() => tableEmails(page)).toEqual(all.slice(20, 40));
    await page.goto("/admin/users?page=99");
    expect(await tableEmails(page)).toEqual(all.slice(Math.floor((all.length - 1) / 20) * 20));

    // An's row against the database: weighted hearts (BR-008), F008 tier, six badges with the time (ALG-003).
    const [sent, received, senders, hearts, seconds] = sql(`select concat_ws('|',
        (select count(*) from public.kudos where sender_id = '${AN.userId}' and status = 'public'),
        (select count(*) from public.kudos where receiver_id = '${AN.userId}' and status = 'public'),
        (select count(distinct sender_id) from public.kudos where receiver_id = '${AN.userId}' and status = 'public'),
        (select coalesce(sum(hs.heart_total), 0) from public.kudos k join public.kudo_heart_state hs on hs.kudo_id = k.id
           where k.receiver_id = '${AN.userId}' and k.status = 'public'),
        (select floor(extract(epoch from max(f) - min(f))) from (select min(opened_at) f from public.secret_boxes
           where user_id = '${AN.userId}' and opened_at is not null group by icon) x));`).split("|").map(Number);
    await page.goto(`/admin/users?q=${AN.email}`);
    const minutes = Math.floor(seconds / 60);
    const sixBadges = `${Math.floor(minutes / 1440)} ngày ${Math.floor((minutes % 1440) / 60)} giờ ${minutes % 60} phút`;
    const [cells] = await tableCells(page, "users-table");
    expect([...cells.slice(0, 9), cells[10]]).toEqual([
      AN.userId.slice(0, 8), AN.name, AN.email, String(sent), String(received), String(hearts), tierOf(senders), "6", sixBadges, "User",
    ]);
    await expect(page.getByTestId("users-table").getByRole("combobox")).toHaveCount(0); // Role is text only (FR-206)
  });

  test("Unit, Level and Role narrow the list together; no match shows the empty state with Clear filters (FR-202, BR-005, DEC-002, SC-003)", async ({ page }) => {
    requireState(ADMIN_STATE);
    await page.goto("/admin/users");
    await choose(page, "filter-unit", "CECV1");
    await expect(page).toHaveURL(/\/admin\/users\?unit=[0-9a-f-]{36}$/);
    await expect.poll(() => tableEmails(page)).toEqual(directoryEmails("un.code = 'CECV1'"));

    await choose(page, "filter-role", "Admin");
    await expect(page).toHaveURL(/unit=.+&role=admin$/);
    await expect(page.getByTestId("users-empty")).toHaveText(/Không có người dùng nào khớp bộ lọc\.\s*Xóa bộ lọc/);
    expect(directoryEmails("un.code = 'CECV1' and u.role = 'admin'")).toEqual([]);
    await page.getByRole("link", { name: "Xóa bộ lọc" }).click();
    await expect(page).toHaveURL("/admin/users");

    await choose(page, "filter-level", "Legend Hero");
    await expect.poll(() => tableEmails(page)).toEqual(directoryEmails(
      `(select count(distinct k.sender_id) from public.kudos k where k.receiver_id = u.id and k.status = 'public') > 20`,
    ));
    await choose(page, "filter-level", "Tất cả");
    await expect(page).toHaveURL("/admin/users");
    await choose(page, "filter-role", "Admin");
    await expect.poll(() => tableEmails(page)).toEqual(directoryEmails("u.role = 'admin'"));
    expect(await tableEmails(page)).toContain("saa.admin.e2e@sun-asterisk.com");
  });

  test("the search box suggests from two characters, picks a Sunner by email and searches typed text on Enter (FR-203, BR-005, SC-003)", async ({ page }) => {
    requireState(ADMIN_STATE);
    await page.goto("/admin/users");
    const box = page.getByRole("combobox", { name: "Tìm theo tên hoặc email" });
    const options = page.getByRole("listbox", { name: "Gợi ý người dùng" }).getByRole("option");
    await box.fill("D");
    await page.waitForTimeout(600);
    await expect(page.getByRole("listbox")).toHaveCount(0);

    await box.fill("Dương");
    const expected = directoryEmails("u.name ilike '%Dương%' or u.email ilike '%Dương%'", 8);
    await expect(options).toHaveCount(expected.length);
    for (const [i, email] of expected.entries()) await expect(options.nth(i)).toContainText(email);
    await options.first().click();
    await expect(page).toHaveURL(`/admin/users?q=${encodeURIComponent(expected[0])}`);
    await expect.poll(() => tableEmails(page)).toEqual([expected[0]]);

    await box.fill("sunner0");
    await box.press("Enter");
    await expect(page).toHaveURL("/admin/users?q=sunner0");
    await expect.poll(() => tableEmails(page)).toEqual(directoryEmails("u.name ilike '%sunner0%' or u.email ilike '%sunner0%'"));
  });

  test("a 401 on the suggestions goes to Login with the way back, like every admin call (review W2)", async ({ page }) => {
    requireState(ADMIN_STATE);
    await page.goto("/admin/users?role=user");
    await page.route(
      (url) => url.pathname === "/api/v1/admin/users" && url.searchParams.get("pageSize") === "8",
      (route) => route.fulfill({ status: 401, contentType: "application/json", body: '{"error":{"code":"unauthorized","message":"expired"}}' }),
    );
    const login = page.waitForRequest((request) => new URL(request.url()).pathname === "/login");
    await page.getByRole("combobox", { name: "Tìm theo tên hoặc email" }).fill("Dương");
    expect(new URL((await login).url()).searchParams.get("next")).toBe("/admin/users?role=user");
  });

  test("Export holds every match of the filters, not one page, with the table's cells (FR-403, US006, SC-003)", async ({ page }) => {
    requireState(ADMIN_STATE);
    const all = directoryEmails();
    expect(all.length).toBeGreaterThan(20);
    await page.goto("/admin/users");
    const { download, bom, records } = await exportFile(page);
    expect(download.suggestedFilename()).toBe(`saa-users-${vnToday()}.csv`);
    expect(bom).toBe(true);
    expect(records[0]).toEqual(USERS_HEADER);
    expect(records.slice(1).map((r) => r[2])).toEqual(all);
    const [cells] = await tableCells(page, "users-table");
    const first = records[1];
    expect([first[0], first[1], first[2], first[3], first[4], first[5], first[7], first[10]])
      .toEqual([cells[0], cells[1], cells[2], cells[3], cells[4], cells[5], cells[7], cells[10]]);
    expect(first[6] || "-").toBe(cells[6]);

    await page.goto("/admin/users?q=Dương");
    const filtered = await exportFile(page);
    expect(filtered.records.slice(1).map((r) => r[2])).toEqual(await tableEmails(page));
  });

  test("the row menu offers View profile only and opens the Sunner's profile (FR-205, D008)", async ({ page }) => {
    requireState(ADMIN_STATE);
    await page.goto(`/admin/users?q=${DEMO_SUNNER_02.email}`);
    await page.getByRole("button", { name: `Thao tác cho ${DEMO_SUNNER_02.name}` }).click();
    await expect(page.getByRole("menu").getByRole("menuitem")).toHaveText(["Xem trang cá nhân"]);
    await page.getByRole("menuitem", { name: "Xem trang cá nhân" }).click();
    await expect(page).toHaveURL(`/profile/${DEMO_SUNNER_02.userId}`);
  });
});

test.describe("copy per language (FR-002)", () => {
  test("with saa_locale=vi both pages read Vietnamese, with en English (Figma VN keeps Level, Role, Admin, User)", async ({ page, context, baseURL }) => {
    requireState(ADMIN_STATE);
    const pages = [
      {
        locale: "vi",
        nav: ["Điều hướng quản trị", VI_NAV],
        overview: ["Tổng quan", ["STT", "Đơn vị", "Tổng thành viên", "Tổng Kudos đã gửi", "Tổng Kudos đã nhận", "Số người có ít nhất 1 Kudos", "Tổng Secret Box đã nhận"], "Xuất file", "30 ngày qua"],
        users: ["Người dùng", VI_USER_COLUMNS, ["Phòng ban", "Chọn phòng ban"], ["Level", "Chọn Level"], ["Role", "Chọn Role"], "Tìm kiếm"],
      },
      {
        locale: "en",
        nav: ["Admin navigation", ["Overview", "Review content", "User", "Settings"]],
        overview: ["Overview", ["No", "Unit", "Total member", "Total sent kudos", "Total received kudos", "Total users with at least one kudo", "Total received secret box"], "Export", "Last 30 days"],
        users: ["User", ["ID", "User", "Email", "∑ sent Kudos", "∑ Received Kudos", "Total Heart", "Level", "Number of Badges", "Time to get 6 Badges", "Last Logged in", "Role", "Actions"], ["Unit", "Select unit"], ["Level", "Select Level"], ["Role", "Select Role"], "Search"],
      },
    ] as const;
    for (const copy of pages) {
      await context.addCookies([{ name: "saa_locale", value: copy.locale, url: baseURL! }]);
      await page.goto("/admin");
      await expect(page.locator("html")).toHaveAttribute("lang", copy.locale);
      await expect(page.getByRole("navigation", { name: copy.nav[0] }).getByRole("link")).toHaveText([...copy.nav[1]]);
      const [title, columns, exportLabel, quickRange] = copy.overview;
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await expect(page.getByTestId("overview-table").locator("thead th")).toHaveText([...columns]);
      await expect(page.getByTestId("export-button")).toHaveText(exportLabel);
      await rangeField(page).click();
      await expect(page.getByRole("dialog").getByRole("button", { name: quickRange })).toHaveAttribute("aria-pressed", "true");
      await page.keyboard.press("Escape");

      await page.goto("/admin/users");
      const [usersTitle, userColumns, unit, level, role, search] = copy.users;
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(usersTitle);
      await expect(page.getByTestId("users-table").locator("thead th")).toHaveText([...userColumns]);
      for (const [testId, [label, placeholder]] of [["filter-unit", unit], ["filter-level", level], ["filter-role", role]] as const) {
        await expect(page.getByTestId(testId)).toHaveText(`${label}${placeholder}`);
      }
      await expect(page.getByRole("combobox")).toHaveAttribute("placeholder", search);
    }
  });
});

test.describe("as a Sunner without the admin role", () => {
  test.use({ storageState: stateOrAnonymous(USER_STATE) });

  test("both pages show the Forbidden page and every admin endpoint answers 403, or 401 without a token (FR-601, BR-007, SC-004)", async ({ page, context, baseURL, request }) => {
    requireState(USER_STATE);
    for (const path of ["/admin", "/admin/users"]) {
      await page.goto(path);
      await expect(page.getByTestId("forbidden-page")).toBeVisible();
      await expect(page.getByTestId("users-table")).toHaveCount(0);
    }
    const token = await accessTokenOf(context, baseURL!);
    for (const path of ["/api/v1/admin/overview", "/api/v1/admin/overview/export", "/api/v1/admin/users?q=a&pageSize=8", "/api/v1/admin/users/export"]) {
      const asUser = await request.get(API_BASE_URL + path, { headers: { Authorization: `Bearer ${token}` } });
      expect(asUser.status(), path).toBe(403);
      expect(await asUser.text(), path).not.toContain("@sun-asterisk.com");
      expect((await request.get(API_BASE_URL + path)).status(), path).toBe(401);
    }
  });
});

test.describe("an admin demoted while the admin page is open", () => {
  test.use({ storageState: ANONYMOUS });

  test("the next admin call answers 403 and the page turns into the Forbidden page (P3 review W3)", async ({ page, context, baseURL }) => {
    test.setTimeout(120_000); // role changes go through `wsl docker`
    await context.addCookies(mintLocalSessionCookies(DEMO_SUNNER_02, baseURL!));
    try {
      expect(setStoredRole(DEMO_SUNNER_02.email, "admin")).toBe("admin");
      await page.goto("/admin/users");
      await expect(page.getByTestId("users-table")).toBeVisible();
      expect(setStoredRole(DEMO_SUNNER_02.email, "user")).toBe("user");
      await page.getByTestId("export-button").click();
      await expect(page.getByTestId("forbidden-page")).toBeVisible();
    } finally {
      setStoredRole(DEMO_SUNNER_02.email, "user");
    }
  });
});
