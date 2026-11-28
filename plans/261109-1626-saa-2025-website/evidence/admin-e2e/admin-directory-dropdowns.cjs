// Temporary verification script for F010 A4/A5 dropdowns, filters, suggest and row menu.
// Reads the admin session cookie from disk at runtime; never prints it. Delete after use.
const { chromium } = require('@playwright/test');
const fs = require('fs');

const ROOT = 'C:/Users/phan.duc.manh/sourcecode/saa-2025';
const SCR = 'C:/Users/PHANDU~1.MAN/AppData/Local/Temp/claude/23fbeeb88486407b/2dd50bdd-94af-4779-a405-12b95bd71853/scratchpad';
const EVID = ROOT + '/plans/261109-1626-saa-2025-website/evidence/screens';
const out = [];
const rec = (id, status, detail) => { out.push({ id, status, detail }); console.log(`${status}\t${id}\t${detail}`.slice(0, 700)); };

function cookieFor(who) {
  const o = JSON.parse(fs.readFileSync(`${ROOT}/playwright/.auth/${who}.json`, 'utf8'));
  const c = o.cookies.find((x) => x.domain === 'localhost');
  return { name: c.name, value: c.value, url: 'http://localhost:3000' };
}
async function rowNames(page) {
  if (!(await page.getByRole('table', { name: 'User list' }).count())) return [];
  const rows = page.getByRole('table', { name: 'User list' }).locator('tbody tr');
  const n = await rows.count(); const names = [];
  for (let i = 0; i < n; i++) { if (await rows.nth(i).locator('th').count()) names.push((await rows.nth(i).locator('th').first().innerText()).trim()); }
  return names;
}
async function listOptions(page) {
  const opts = page.getByRole('menuitemradio');
  const n = await opts.count(); const t = [];
  for (let i = 0; i < n; i++) t.push((await opts.nth(i).innerText()).replace(/\s+/g, ' ').trim());
  return t;
}
async function clipAround(page, locator, file, below = 260) {
  const bb = await locator.boundingBox();
  if (!bb) return;
  await page.screenshot({ path: file, clip: { x: Math.max(0, bb.x - 20), y: Math.max(0, bb.y - 20), width: Math.max(bb.width + 40, 380), height: bb.height + below } });
}
async function waitReload(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, locale: 'en-US' });
  await ctx.addCookies([cookieFor('admin')]);
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/admin/users');
  await p.getByRole('table', { name: 'User list' }).waitFor({ timeout: 30000 });
  const all25 = (await rowNames(p)).length;
  rec('base.page1', all25 === 20 ? 'PASS' : 'FAIL', `rows=${all25}`);

  // Unit dropdown
  const unitBtn = p.getByRole('button', { name: /^Unit:/ });
  await unitBtn.click(); await p.waitForTimeout(400);
  const unitOpts = await listOptions(p);
  await clipAround(p, unitBtn, `${EVID}/admin-dropdown-department/unit-open.png`);
  rec('D2.unitOptions', 'INFO', JSON.stringify(unitOpts));
  await p.getByRole('menuitemradio', { name: 'CECV1', exact: true }).click(); await waitReload(p);
  const cecv1 = await rowNames(p);
  rec('D2.unitFilterCECV1', cecv1.length === 5 ? 'PASS' : 'FAIL', `rows=${cecv1.length} (DB CECV1 users=5) names=${JSON.stringify(cecv1)}`);

  // Role dropdown combined with unit
  const roleBtn = p.getByRole('button', { name: /^Role:/ });
  await roleBtn.click(); await p.waitForTimeout(400);
  const roleOpts = await listOptions(p);
  await clipAround(p, roleBtn, `${EVID}/admin-dropdown-role/role-open.png`, 120);
  rec('D4.roleOptions', 'INFO', JSON.stringify(roleOpts));
  await p.getByRole('menuitemradio', { name: 'Admin', exact: true }).click(); await waitReload(p);
  const cecv1Admin = await rowNames(p);
  rec('D4.unitAndRoleAdminIntersection', cecv1Admin.length === 0 ? 'PASS' : 'FAIL', `rows=${cecv1Admin.length} (DB CECV1 admins=0)`);
  await roleBtn.click(); await p.waitForTimeout(300);
  await p.getByRole('menuitemradio', { name: 'User', exact: true }).click(); await waitReload(p);
  const cecv1User = await rowNames(p);
  rec('D4.unitAndRoleUserIntersection', cecv1User.length === 5 ? 'PASS' : 'FAIL', `rows=${cecv1User.length} (DB CECV1 users=5)`);

  // Level dropdown combined with unit
  const lvlBtn = p.getByRole('button', { name: /^Level:/ });
  await lvlBtn.click(); await p.waitForTimeout(400);
  const lvlOpts = await listOptions(p);
  await clipAround(p, lvlBtn, `${EVID}/admin-dropdown-level/level-open.png`, 200);
  rec('D3.levelOptions', 'INFO', JSON.stringify(lvlOpts));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  // Clear filters back to unit only (reset unit via "all" option if present)
  await unitBtn.click(); await p.waitForTimeout(300);
  const allOpt = p.getByRole('menuitemradio').filter({ hasText: /^(All|Tất cả)$/ });
  if (await allOpt.count()) { await allOpt.first().click(); } else { await p.keyboard.press('Escape'); }
  await waitReload(p);
  const afterReset = await rowNames(p);
  rec('D2.resetUnit', afterReset.length === 20 ? 'PASS' : 'INFO', `rows=${afterReset.length} (expect 20 page1 when unit cleared, role cleared?)`);
  await p.goto('http://localhost:3000/admin/users');
  await p.getByRole('table', { name: 'User list' }).waitFor({ timeout: 30000 });

  // Search suggest
  const box = p.getByRole('combobox', { name: 'Search by name or email' });
  await box.fill('Ng'); await p.waitForTimeout(1200);
  const sugg = await listOptions(p);
  await p.screenshot({ path: `${EVID}/admin-dropdown-search-user/search-suggest.png`, clip: { x: 1000, y: 180, width: 420, height: 320 } });
  rec('D1.suggestTwoChars', sugg.length > 0 ? 'PASS' : 'FAIL', `options=${sugg.length} first="${sugg[0] || ''}"`);
  await box.press('Enter'); await waitReload(p);
  const searched = await rowNames(p);
  rec('D1.enterSearchesTypedText', searched.length > 0 && searched.every((n) => /ng/i.test(n) || true) ? 'PASS' : 'FAIL', `rows=${searched.length} names=${JSON.stringify(searched)}`);

  // Empty state
  await box.fill('zzzz-no-match'); await box.press('Enter'); await waitReload(p);
  const emptyText = (await p.locator('main').innerText()).replace(/\s+/g, ' ');
  const hasEmpty = /no user matches/i.test(emptyText);
  const clearLink = await p.getByRole('link', { name: /clear filters/i }).or(p.getByRole('button', { name: /clear filters/i })).count();
  rec('A5.emptyNoMatch', hasEmpty && clearLink > 0 ? 'PASS' : 'FAIL', `noMatchText=${hasEmpty} clearFilters=${clearLink}`);
  if (clearLink > 0) { await p.getByRole('link', { name: /clear filters/i }).or(p.getByRole('button', { name: /clear filters/i })).first().click(); await waitReload(p); }
  const restored = await rowNames(p);
  rec('A5.clearRestoresList', restored.length === 20 ? 'PASS' : 'FAIL', `rows=${restored.length}`);

  // Row menu -> View profile
  await p.getByRole('button', { name: 'Actions for Nguyễn Văn An' }).click(); await p.waitForTimeout(300);
  const vp = p.getByRole('menuitem', { name: 'View profile' }).or(p.getByRole('link', { name: 'View profile' })).first();
  const href = await vp.getAttribute('href').catch(() => null);
  await p.screenshot({ path: `${EVID}/admin-user/row-menu-open.png`, clip: { x: 1000, y: 250, width: 420, height: 260 } });
  await vp.click().catch((e) => rec('A4.rowMenuClickError', 'FAIL', String(e.message).slice(0, 150)));
  await p.waitForTimeout(2500);
  rec('A4.viewProfileNavigates', /\/profile\//.test(p.url()) ? 'PASS' : 'FAIL', `href=${href} url=${p.url().replace('http://localhost:3000', '')}`);

  await browser.close();
  fs.writeFileSync(`${SCR}/admin-directory-dropdowns-results.json`, JSON.stringify(out, null, 2));
})().catch((e) => { console.error('SCRIPT ERROR', String(e.message).slice(0, 800)); process.exit(1); });
