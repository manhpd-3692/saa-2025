// Temporary verification script for F010 admin screens. Reads session cookies from disk at
// runtime and never prints them. Writes results JSON to the scratchpad. Delete after use.
const { chromium } = require('@playwright/test');
const fs = require('fs');

const ROOT = 'C:/Users/phan.duc.manh/sourcecode/saa-2025';
const SCR = 'C:/Users/PHANDU~1.MAN/AppData/Local/Temp/claude/23fbeeb88486407b/2dd50bdd-94af-4779-a405-12b95bd71853/scratchpad';
const EVID = ROOT + '/plans/261109-1626-saa-2025-website/evidence/screens';
const API = 'http://localhost:8080';
const results = [];
const badResponses = [];
const consoleErrors = [];

function rec(id, pass, detail) { results.push({ id, status: pass === null ? 'INFO' : pass ? 'PASS' : 'FAIL', detail }); }

function cookieFor(who) {
  const o = JSON.parse(fs.readFileSync(`${ROOT}/playwright/.auth/${who}.json`, 'utf8'));
  const c = o.cookies.find((x) => x.domain === 'localhost');
  return { name: c.name, value: c.value, url: 'http://localhost:3000' };
}
function bearer(who) {
  const o = JSON.parse(fs.readFileSync(`${ROOT}/playwright/.auth/${who}.json`, 'utf8'));
  const c = o.cookies.find((x) => x.domain === 'localhost');
  const json = Buffer.from(c.value.replace(/^base64-/, ''), 'base64url').toString('utf8');
  return JSON.parse(json).access_token;
}
function parseCsvLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',' || ch === ';') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
}
function todayVN() { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }); }
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

async function tableRows(page, name) {
  const rows = page.getByRole('table', { name }).locator('tbody tr');
  const n = await rows.count();
  const out = [];
  for (let i = 0; i < n; i++) out.push(await rows.nth(i).locator('th,td').allInnerTexts());
  return out;
}

function track(page, label) {
  page.on('response', (r) => { const s = r.status(); if (s >= 400 && r.url().includes('/api/v1/admin')) badResponses.push(`${label} ${s} ${r.request().method()} ${r.url().replace(/\?.*/, '')}`); });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${label}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => consoleErrors.push(`${label} pageerror: ${String(e.message).slice(0, 200)}`));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const vp = { width: 1440, height: 1024 };
  const today = todayVN();
  const defFrom = addDays(today, -29);

  // ---------- ADMIN ----------
  const ctxA = await browser.newContext({ viewport: vp, locale: 'en-US', acceptDownloads: true });
  await ctxA.addCookies([cookieFor('admin')]);
  const pa = await ctxA.newPage();
  track(pa, 'admin');

  await pa.goto('http://localhost:3000/admin');
  await pa.getByRole('table', { name: 'Figures by unit' }).waitFor({ timeout: 30000 });
  const heads = await pa.getByRole('table', { name: 'Figures by unit' }).locator('thead th').allInnerTexts();
  rec('A1.headers', JSON.stringify(heads) === JSON.stringify(['No', 'Unit', 'Total member', 'Total sent kudos', 'Total received kudos', 'Total users with at least one kudo', 'Total received secret box']), JSON.stringify(heads));
  const ovRows = await tableRows(pa, 'Figures by unit');
  rec('A1.rowsAllFirst', ovRows.length === 6 && /All/.test(ovRows[0][1] || ovRows[0][0]), `rows=${ovRows.length} first=${JSON.stringify(ovRows[0])}`);
  const dateBtn = await pa.getByRole('button', { name: /^Date range:/ }).innerText();
  rec('A1.defaultRange30d', dateBtn.includes(defFrom) && dateBtn.includes(today), `button="${dateBtn.replace(/\s+/g, ' ')}" expected ${defFrom}..${today}`);

  // Export overview: download + response headers
  const expRespP = pa.waitForResponse((r) => r.url().includes('/api/v1/admin/overview/export'), { timeout: 30000 });
  const [dlO] = await Promise.all([pa.waitForEvent('download', { timeout: 30000 }), pa.getByRole('button', { name: 'Export' }).first().click()]);
  const expResp = await expRespP;
  const cdO = expResp.headers()['content-disposition'] || '';
  rec('A1.exportStatus200', expResp.status() === 200, `status=${expResp.status()}`);
  rec('A1.contentDispositionReadable', /filename=/.test(cdO), `header="${cdO}"`);
  const pathO = `${SCR}/admin-overview-export.csv`;
  await dlO.saveAs(pathO);
  rec('A1.filename', /\.csv$/.test(dlO.suggestedFilename()), `suggested="${dlO.suggestedFilename()}"`);
  const bufO = fs.readFileSync(pathO);
  const bomO = bufO[0] === 0xef && bufO[1] === 0xbb && bufO[2] === 0xbf;
  rec('A1.utf8Bom', bomO, `first3=${bufO.slice(0, 3).toString('hex')}`);
  const linesO = bufO.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.length);
  const csvHead = parseCsvLine(linesO[0]);
  rec('A1.csvHeaders', true, `headers=${JSON.stringify(csvHead)}`);
  const csvRows = linesO.slice(1).map(parseCsvLine);
  // Compare numeric figures of each table row against CSV row (by position)
  const mism = [];
  for (let i = 0; i < ovRows.length; i++) {
    const t = ovRows[i]; const c = csvRows[i] || [];
    const tNums = t.slice(-5).map((x) => x.trim()); const cNums = c.slice(-5).map((x) => x.trim());
    if (JSON.stringify(tNums) !== JSON.stringify(cNums)) mism.push(`row${i}: table=${JSON.stringify(tNums)} csv=${JSON.stringify(cNums)}`);
  }
  rec('A1.csvEqualsTable', mism.length === 0 && csvRows.length === ovRows.length, `csvRows=${csvRows.length} tableRows=${ovRows.length} mismatches=${JSON.stringify(mism)}`);
  rec('A1.csvSample', null, JSON.stringify(linesO.slice(0, 3)));

  // Invalid / reversed range falls back to default
  await pa.goto('http://localhost:3000/admin?from=bad');
  await pa.getByRole('table', { name: 'Figures by unit' }).waitFor({ timeout: 30000 });
  const b1 = await pa.getByRole('button', { name: /^Date range:/ }).innerText();
  rec('A1.invalidFromFallsBack', b1.includes(defFrom) && b1.includes(today), `button="${b1.replace(/\s+/g, ' ')}"`);
  await pa.goto(`http://localhost:3000/admin?from=${today}&to=${defFrom}`);
  await pa.getByRole('table', { name: 'Figures by unit' }).waitFor({ timeout: 30000 });
  const b2 = await pa.getByRole('button', { name: /^Date range:/ }).innerText();
  rec('A1.reversedRangeFallsBack', b2.includes(defFrom) && b2.includes(today), `button="${b2.replace(/\s+/g, ' ')}"`);

  // Users directory
  await pa.goto('http://localhost:3000/admin/users');
  await pa.getByRole('table', { name: 'User list' }).waitFor({ timeout: 30000 });
  const uHeads = await pa.getByRole('table', { name: 'User list' }).locator('thead th').allInnerTexts();
  rec('A4.headers', uHeads.length === 12, JSON.stringify(uHeads));
  const page1 = await tableRows(pa, 'User list');
  rec('A4.page1Rows20', page1.length === 20, `rows=${page1.length}`);
  const names1 = page1.map((r) => (r[1] || '').trim());
  rec('A4.page1Sorted', JSON.stringify(names1) === JSON.stringify([...names1].sort((a, b) => a.localeCompare(b, 'vi'))), `first=${names1[0]} last=${names1[names1.length - 1]}`);
  const pager1 = await pa.getByText(/of \d+ users/).first().innerText().catch((e) => 'NOT FOUND');
  rec('A4.pagerTotal25', /of 25 users/.test(pager1), `pager="${pager1}"`);
  await pa.getByRole('link', { name: 'Next page' }).click();
  await pa.waitForTimeout(1500);
  const page2 = await tableRows(pa, 'User list');
  rec('A4.page2Rows5', page2.length === 5, `rows=${page2.length} first=${page2[0] && page2[0][1]}`);
  const hasNoOverlap = !page2.some((r) => names1.includes((r[1] || '').trim()));
  rec('A4.pagesNoOverlap', hasNoOverlap, '');

  // Export users (all matching rows, not just page)
  const expUP = pa.waitForResponse((r) => r.url().includes('/api/v1/admin/users/export'), { timeout: 30000 });
  await pa.goto('http://localhost:3000/admin/users');
  await pa.getByRole('table', { name: 'User list' }).waitFor({ timeout: 30000 });
  const [dlU] = await Promise.all([pa.waitForEvent('download', { timeout: 30000 }), pa.getByRole('button', { name: 'Export' }).first().click()]);
  const expRespU = await expUP.catch(() => null);
  const cdU = expRespU ? expRespU.headers()['content-disposition'] || '' : '(no response captured)';
  rec('A4.exportContentDisposition', !!expRespU && /filename=/.test(cdU), `header="${cdU}"`);
  const pathU = `${SCR}/admin-users-export.csv`;
  await dlU.saveAs(pathU);
  rec('A4.exportFilename', /\.csv$/.test(dlU.suggestedFilename()), `suggested="${dlU.suggestedFilename()}"`);
  const bufU = fs.readFileSync(pathU);
  rec('A4.exportBom', bufU[0] === 0xef && bufU[1] === 0xbb && bufU[2] === 0xbf, `first3=${bufU.slice(0, 3).toString('hex')}`);
  const linesU = bufU.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.length);
  const uCsvHead = parseCsvLine(linesU[0]);
  rec('A4.exportRowCount25', linesU.length - 1 === 25, `dataRows=${linesU.length - 1} headers=${JSON.stringify(uCsvHead)}`);
  const formulaCells = linesU.slice(1).flatMap((l) => parseCsvLine(l)).filter((c) => /^[=+\-@]/.test(c));
  rec('A4.formulaGuardNoRawFormulaCells', formulaCells.length === 0, `leadingFormulaChars=${formulaCells.length}`);
  rec('A4.csvSampleUsers', null, JSON.stringify(linesU.slice(0, 2)));

  // Search suggestions
  const box = pa.getByRole('combobox', { name: 'Search by name or email' });
  await box.fill('N');
  await pa.waitForTimeout(1200);
  const sug1 = await pa.locator('[role="listbox"] [role="option"], [role="listbox"] li, [role="listbox"] button').count();
  await box.fill('Ng');
  await pa.waitForTimeout(1200);
  const sug2 = await pa.locator('[role="listbox"] [role="option"], [role="listbox"] li, [role="listbox"] button').count();
  rec('A5.suggestMinTwoChars', sug1 === 0 && sug2 > 0, `oneChar=${sug1} twoChars=${sug2}`);
  await box.fill('');
  await box.press('Escape');

  // Row menu
  await pa.getByRole('button', { name: /^Actions for / }).first().click();
  const viewProfile = pa.getByRole('menuitem', { name: 'View profile' }).or(pa.getByRole('link', { name: 'View profile' }));
  const vpCount = await viewProfile.count();
  rec('A4.rowMenuViewProfile', vpCount > 0, `items=${vpCount}`);
  await pa.keyboard.press('Escape');

  // Role-only text (no change control)
  const roleSelects = await pa.locator('table[aria-label="User list"] select, table[aria-label="User list"] [role="combobox"]').count().catch(() => 0);
  rec('A4.roleNoControl', roleSelects === 0, `roleControls=${roleSelects}`);

  await pa.screenshot({ path: `${EVID}/admin-user/user-admin-run.png`, fullPage: true });
  await pa.goto('http://localhost:3000/admin');
  await pa.getByRole('table', { name: 'Figures by unit' }).waitFor({ timeout: 30000 });
  await pa.screenshot({ path: `${EVID}/admin-overview/overview-admin-run.png`, fullPage: true });

  // API checks with admin bearer (in memory only)
  const tokA = bearer('admin');
  const hA = { Authorization: `Bearer ${tokA}` };
  const apiO = await pa.request.get(`${API}/api/v1/admin/overview`, { headers: hA });
  rec('API.overview.admin200', apiO.status() === 200, `status=${apiO.status()}`);
  const apiU = await pa.request.get(`${API}/api/v1/admin/users?role=admin`, { headers: hA });
  const uj = await apiU.json().catch(() => ({}));
  const items = uj.items || uj.users || uj.rows || [];
  rec('API.users.roleAdminFilter', apiU.status() === 200 && items.every((x) => (x.role || '').toLowerCase() === 'admin'), `status=${apiU.status()} n=${items.length}`);

  // ---------- NON-ADMIN ----------
  const ctxU = await browser.newContext({ viewport: vp, locale: 'en-US' });
  await ctxU.addCookies([cookieFor('user')]);
  const pu = await ctxU.newPage();
  track(pu, 'user');
  for (const p of ['/admin', '/admin/users']) {
    await pu.goto('http://localhost:3000' + p);
    await pu.waitForTimeout(2500);
    const body = (await pu.locator('body').innerText()).replace(/\s+/g, ' ');
    const forbidden = /forbidden|no access|do not have access|403/i.test(body);
    const leaked = /sunner0\d\.demo@|Figures by unit|User list/.test(await pu.content());
    rec(`FR601.userPage${p}`, forbidden && !leaked, `url=${pu.url().replace('http://localhost:3000', '')} text="${body.slice(0, 160)}" dataLeak=${leaked}`);
  }
  await pu.screenshot({ path: `${EVID}/admin-user/forbidden-user-run.png`, fullPage: true });
  const tokU = bearer('user');
  const hU = { Authorization: `Bearer ${tokU}` };
  for (const ep of ['/api/v1/admin/overview', '/api/v1/admin/overview/export', '/api/v1/admin/users', '/api/v1/admin/users/export']) {
    const r = await pu.request.get(API + ep, { headers: hU });
    rec(`FR601.api403${ep}`, r.status() === 403, `status=${r.status()}`);
  }

  // ---------- SIGNED OUT ----------
  const ctxS = await browser.newContext({ viewport: vp, locale: 'en-US' });
  const ps = await ctxS.newPage();
  await ps.goto('http://localhost:3000/admin');
  await ps.waitForTimeout(3000);
  rec('signedOut.adminToLogin', /\/login/.test(ps.url()), `url=${ps.url().replace('http://localhost:3000', '')}`);

  // ---------- VIETNAMESE ----------
  const ctxV = await browser.newContext({ viewport: vp, locale: 'vi-VN' });
  await ctxV.addCookies([cookieFor('admin'), { name: 'saa_locale', value: 'vi', url: 'http://localhost:3000' }]);
  const pv = await ctxV.newPage();
  await pv.goto('http://localhost:3000/admin');
  await pv.getByRole('table').first().waitFor({ timeout: 30000 }).catch(() => {});
  const vText = (await pv.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
  rec('FR002.viLocale', null, `main="${vText}"`);

  await browser.close();
  results.push({ id: '_badAdminApiResponses', status: 'INFO', detail: badResponses });
  results.push({ id: '_consoleErrors', status: 'INFO', detail: consoleErrors });
  fs.writeFileSync(`${SCR}/admin-verify-results.json`, JSON.stringify(results, null, 2));
  for (const r of results) console.log(`${r.status}\t${r.id}\t${typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail)}`.slice(0, 600));
})().catch((e) => { console.error('SCRIPT ERROR', String(e.message).slice(0, 800)); process.exit(1); });
