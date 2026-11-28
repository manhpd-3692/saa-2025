// Round 2 re-verify for F010 admin screens (tracker rows 56-61), vi and en.
// Reads the admin session from disk at runtime; prints results only, never cookies or tokens.
const { chromium } = require('@playwright/test');
const fs = require('fs');

const ROOT = 'C:/Users/phan.duc.manh/sourcecode/saa-2025';
const EVID = ROOT + '/plans/261109-1626-saa-2025-website/evidence/screens';
const OUT = ROOT + '/plans/261109-1626-saa-2025-website/evidence/admin-e2e/round2-results.json';
const results = [];
const rec = (loc, id, status, detail) => { results.push({ loc, id, status, detail }); console.log(`${status}\t${loc}\t${id}\t${String(detail).slice(0, 500)}`); };
const cookieFor = () => { const c = JSON.parse(fs.readFileSync(`${ROOT}/playwright/.auth/admin.json`, 'utf8')).cookies.find((x) => x.domain === 'localhost'); return { name: c.name, value: c.value, url: 'http://localhost:3000' }; };
const texts = async (loc) => (await loc.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
const tableRows = async (page) => { const r = page.getByRole('table').first().locator('tbody tr').filter({ has: page.locator('th') }); const n = await r.count(); const out = []; for (let i = 0; i < n; i++) out.push((await r.nth(i).locator('th,td').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim())); return out; };
const menuOptions = async (page) => { const o = page.getByRole('menuitemradio'); const n = await o.count(); const t = []; for (let i = 0; i < n; i++) t.push((await o.nth(i).innerText()).trim()); return t; };
const waitIdle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900); };

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const loc of ['vi', 'en']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, locale: loc === 'vi' ? 'vi-VN' : 'en-US' });
    await ctx.addCookies([cookieFor(), { name: 'saa_locale', value: loc, url: 'http://localhost:3000' }]);
    const page = await ctx.newPage();
    const apiErr = []; page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/v1/admin')) apiErr.push(`${r.status()} ${r.request().method()} ${r.url().replace(/\?.*/, '')}`); });
    const conErr = []; page.on('console', (m) => { if (m.type() === 'error') conErr.push(m.text().slice(0, 160)); });

    // ---- Row 56: Overview ----
    await page.goto('http://localhost:3000/admin');
    await page.getByRole('table').first().waitFor({ timeout: 30000 });
    await waitIdle(page);
    rec(loc, 'R56.navLinks', 'INFO', JSON.stringify(await texts(page.getByRole('navigation').first().getByRole('link'))));
    rec(loc, 'R56.currentLink', 'INFO', JSON.stringify(await texts(page.locator('nav [aria-current="page"]'))));
    rec(loc, 'R56.h1', 'INFO', JSON.stringify(await texts(page.getByRole('heading', { level: 1 }))));
    rec(loc, 'R56.tableHeaders', 'INFO', JSON.stringify(await texts(page.getByRole('table').first().locator('thead th'))));
    rec(loc, 'R56.rangeButton', 'INFO', JSON.stringify(await texts(page.getByRole('button', { name: /2026-|Date range|Khoảng/ }))));
    rec(loc, 'R56.buttons', 'INFO', JSON.stringify(await texts(page.getByRole('main').getByRole('button'))));
    const ov = await tableRows(page);
    rec(loc, 'R56.rows', ov.length === 6 ? 'PASS' : 'FAIL', `rows=${ov.length} first=${JSON.stringify(ov[0])} CECV1=${JSON.stringify(ov[1])}`);
    await page.screenshot({ path: `${EVID}/admin-overview/r2-overview-${loc}.png`, fullPage: true });

    // Export does not stay busy and downloads
    const exportBtn = page.getByRole('main').getByRole('button').filter({ hasText: /Export|Xuất/ }).first();
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), exportBtn.click()]);
    await dl.saveAs(`${ROOT}/plans/261109-1626-saa-2025-website/evidence/admin-e2e/round2-overview-${loc}.csv`);
    await page.waitForTimeout(1200);
    const busyAfter = await page.getByRole('main').locator('[aria-busy="true"]').count();
    const exportText = (await exportBtn.innerText()).trim();
    rec(loc, 'R56.exportDownloads', 'PASS', `file=${dl.suggestedFilename()}`);
    rec(loc, 'R56.exportNotStuckBusy', busyAfter === 0 && !/đang xuất|exporting/i.test(exportText) ? 'PASS' : 'FAIL', `busyCount=${busyAfter} label="${exportText}"`);

    // ---- Row 57: User directory ----
    await page.goto('http://localhost:3000/admin/users');
    await page.getByRole('table').first().waitFor({ timeout: 30000 });
    await waitIdle(page);
    rec(loc, 'R57.tableHeaders', 'INFO', JSON.stringify(await texts(page.getByRole('table').first().locator('thead th'))));
    rec(loc, 'R57.filterButtons', 'INFO', JSON.stringify(await texts(page.locator('button[aria-haspopup="menu"]'))));
    rec(loc, 'R57.searchBox', 'INFO', JSON.stringify(await texts(page.getByRole('combobox'))) + ' placeholder=' + (await page.getByRole('combobox').first().getAttribute('placeholder')));
    rec(loc, 'R57.pager', 'INFO', JSON.stringify(await texts(page.getByRole('navigation', { name: /Pages|Trang/ }))));
    const u1 = await tableRows(page);
    rec(loc, 'R57.page1Rows', u1.length === 20 ? 'PASS' : 'FAIL', `rows=${u1.length} firstRow=${JSON.stringify(u1[0])}`);
    rec(loc, 'R57.idColumn', 'INFO', JSON.stringify(u1.slice(0, 3).map((r) => r[0])));
    await page.screenshot({ path: `${EVID}/admin-user/r2-user-${loc}.png`, fullPage: true });
    // Filter triggers only: skip row "Actions" menus (no text) and the VN/EN language switcher.
    const menuBtn = page.locator('button[aria-haspopup="menu"]').filter({ hasText: /\S/ }).filter({ hasNotText: /^(VN|EN)$/ });

    // Filter dropdowns: Unit, Level, Role (DOM order), then the menu options
    const dd = [['Unit', 0, 'admin-dropdown-department'], ['Level', 1, 'admin-dropdown-level'], ['Role', 2, 'admin-dropdown-role']];
    for (const [name, idx, slug] of dd) {
      await menuBtn.nth(idx).click(); await page.waitForTimeout(400);
      const opts = await menuOptions(page);
      rec(loc, `R${name}.options`, 'INFO', JSON.stringify(opts));
      const menu = page.getByRole('menu').first();
      await page.screenshot({ path: `${EVID}/${slug}/r2-${slug.replace('admin-dropdown-', 'dropdown-')}-${loc}.png`, clip: { x: 60, y: 170, width: 620, height: 340 } });
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      void menu;
    }
    // behaviour: Unit CECV1
    await menuBtn.nth(0).click(); await page.waitForTimeout(300);
    await page.getByRole('menuitemradio').filter({ hasText: /^CECV1$/ }).click(); await waitIdle(page);
    const cecv1 = await tableRows(page);
    rec(loc, 'R59.unitFilterCECV1', cecv1.length === 5 ? 'PASS' : 'FAIL', `rows=${cecv1.length} (DB 5)`);
    await menuBtn.nth(2).click(); await page.waitForTimeout(300);
    await page.getByRole('menuitemradio').filter({ hasText: /^(Admin|Quản trị)$/ }).click(); await waitIdle(page);
    const cecv1Admin = await tableRows(page);
    rec(loc, 'R61.roleAdminWithUnit', cecv1Admin.length === 0 ? 'PASS' : 'FAIL', `rows=${cecv1Admin.length} (DB 0)`);
    rec(loc, 'R61.emptyStateCopy', 'INFO', JSON.stringify(await texts(page.getByRole('main'))).slice(0, 300));
    await menuBtn.nth(0).click(); await page.waitForTimeout(300);
    await page.getByRole('menuitemradio').first().click(); await waitIdle(page);
    await menuBtn.nth(2).click(); await page.waitForTimeout(300);
    await page.getByRole('menuitemradio').first().click(); await waitIdle(page);
    await page.goto('http://localhost:3000/admin/users'); await page.getByRole('table').first().waitFor({ timeout: 30000 });

    // ---- Row 58: search suggest ----
    const box = page.getByRole('combobox').first();
    await box.fill('Ng'); await page.waitForTimeout(1300);
    const sug = page.locator('[role="listbox"] [role="option"], [role="listbox"] li');
    const sn = await sug.count();
    rec(loc, 'R58.suggestTwoChars', sn > 0 ? 'PASS' : 'FAIL', `options=${sn} first=${sn ? (await sug.first().innerText()).replace(/\s+/g, ' ') : ''}`);
    await page.screenshot({ path: `${EVID}/admin-dropdown-search-user/r2-dropdown-search-user-${loc}.png`, clip: { x: 1000, y: 180, width: 420, height: 320 } });
    await box.press('Escape'); await box.fill('');

    // Suggest 401 check: none expected for a valid session (no request should be 401)
    rec(loc, 'apiErrors', apiErr.length === 0 ? 'PASS' : 'FAIL', JSON.stringify(apiErr));
    rec(loc, 'consoleErrors', conErr.length === 0 ? 'PASS' : 'INFO', JSON.stringify(conErr.slice(0, 5)));
    await ctx.close();
  }
  // ---- Non-admin Forbidden copy in vi and en (rows 56/57 gate) ----
  for (const loc of ['vi', 'en']) {
    const user = JSON.parse(fs.readFileSync(`${ROOT}/playwright/.auth/user.json`, 'utf8')).cookies.find((x) => x.domain === 'localhost');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, locale: loc === 'vi' ? 'vi-VN' : 'en-US' });
    await ctx.addCookies([{ name: user.name, value: user.value, url: 'http://localhost:3000' }, { name: 'saa_locale', value: loc, url: 'http://localhost:3000' }]);
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/admin'); await page.waitForTimeout(2500);
    const h = await texts(page.getByRole('heading', { level: 1 }));
    rec(loc, 'R56.forbiddenForUser', 'INFO', JSON.stringify(h));
    await page.screenshot({ path: `${EVID}/admin-user/r2-forbidden-user-${loc}.png`, fullPage: true });
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
})().catch((e) => { console.error('SCRIPT ERROR', String(e.message).slice(0, 600)); process.exit(1); });
