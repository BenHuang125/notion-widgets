// End-to-end check of the Notion "Working" calendar (working.html + working/*.js) in a real browser.
// Desktop width only. Example data only (the repo is public; Ben's own data lives in his browser).
//
//   node tests/e2e/working.mjs

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
  const path = (req.url ?? '/').split('?')[0];
  if (!/^\/(working\.html|working\/[a-z]+\.js)$/.test(path)) return res.writeHead(404).end();
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => server.listen(0, ok));
const base = `http://127.0.0.1:${server.address().port}/working.html`;

let failed = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` — ${detail}`}`);
  if (!ok) failed++;
}

const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
// a same-month day other than today, so the event stays on the visible month
const other = new Date(today.getFullYear(), today.getMonth(), today.getDate() === 15 ? 16 : 15);
const week = Math.floor(Math.round((today - new Date(2026, 8, 4)) / 864e5) / 7) + 1;

// PW_CHROMIUM: use an already-installed browser where Playwright cannot download its own
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${base}#projects=Alpha,Beta`);
await page.waitForSelector('body.ready');

// month grid and today
check('month title shows this month', (await page.textContent('#calTitle')).includes(String(today.getFullYear())));
check('today is marked', (await page.locator('.day.today').getAttribute('data-date')) === key(today));
check('no project legend on the page', (await page.locator('.legend').count()) === 0);

// add an event by clicking a day
await page.click(`.day[data-date="${key(today)}"] .num`);
check('clicking a day opens the dialog', await page.isVisible('#evDlg'));
check('project menu lists the embed projects', (await page.locator('#evProject option').allTextContents()).join() === 'Alpha,Beta');
await page.fill('#evTitle', 'Write summary');
await page.fill('#evBody', 'Three papers');
await page.selectOption('#evProject', { label: 'Beta' });
await page.click('#evForm .primary');
const chip = page.locator(`.day[data-date="${key(today)}"] .chip`, { hasText: 'Write summary' });
check('saved event shows its title on the day', (await chip.count()) === 1);
check('dialog closed after save', !(await page.isVisible('#evDlg')));

// hover card
await chip.hover();
await page.waitForTimeout(300);
const card = await page.textContent('#hovercard');
check('hover card shows title, project and details', card.includes('Write summary') && card.includes('Beta') && card.includes('Three papers'));

// drag to another day
const from = await chip.boundingBox();
const to = await page.locator(`.day[data-date="${key(other)}"]`).boundingBox();
await page.mouse.move(from.x + 10, from.y + 5);
await page.mouse.down();
await page.mouse.move(from.x + 30, from.y + 20, { steps: 4 });
await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
await page.mouse.up();
const moved = page.locator(`.day[data-date="${key(other)}"] .chip`, { hasText: 'Write summary' });
check('dragging moves the event to the new day', (await moved.count()) === 1);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('working.v1')).events[0].date);
check('the move is saved', stored === key(other), stored);
check('a drag does not open the dialog', !(await page.isVisible('#evDlg')));

// delete (asks once)
await moved.click();
await page.click('#evDelete');
check('delete asks to confirm first', (await page.textContent('#evDelete')) === 'Confirm delete');
await page.click('#evDelete');
check('confirmed delete removes the event', (await page.locator('.chip').count()) === 0);

// day to-dos are separate from the calendar
await page.fill('#todoInput', 'Buy coffee');
await page.press('#todoInput', 'Enter');
check('to-do added for today', (await page.locator('.todo .tx').allTextContents()).includes('Buy coffee'));
await page.click('.todo input');
check('ticking marks it done', (await page.locator('.todo.done').count()) === 1);
check('to-dos never appear on the calendar', (await page.locator('.chip').count()) === 0);
await page.click('#tdNext');
check('next day starts empty', (await page.locator('.todo').count()) === 0);
check('Today button appears away from today', await page.isVisible('#tdToday'));

// weekly review
check('review shows this week number', (await page.textContent('#rvWeek')) === `Week ${week}`);
await page.click('#review');
await page.keyboard.type('Finished the calendar');
await page.evaluate(() => {
  const li = document.querySelector('#review li');
  const r = document.createRange();
  r.setStart(li.firstChild, 0);
  r.setEnd(li.firstChild, 8);
  getSelection().removeAllRanges();
  getSelection().addRange(r);
});
await page.click('.swatch[data-c="2"]');
check('colour wraps the selected words', (await page.locator('#review span[data-c="2"]').textContent()) === 'Finished');
await page.waitForTimeout(400);

// reload: everything is still there, a new project keeps old colours
const dotBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('working.v1')).projects.map((p) => p.order).join());
await page.goto(`${base}#projects=Alpha,Beta,Gamma`);
await page.reload();
await page.waitForSelector('body.ready');
check('review text kept after reload', (await page.textContent('#review')).includes('Finished the calendar'));
check('day opens on today again', (await page.isVisible('#tdToday')) === false);
const orders = await page.evaluate(() => JSON.parse(localStorage.getItem('working.v1')).projects.map((p) => `${p.name}:${p.order}`).join());
check('new project joins at the end, old ones keep their colour', orders === 'Alpha:0,Beta:1,Gamma:2', `${dotBefore} -> ${orders}`);

// Notion 專案 rows: matched by Notion id, renamed in place (old name as alias the first time), removed ones hidden
const N1 = 'a'.repeat(32);
const N2 = 'b'.repeat(32);
const projectsSaved = () => page.evaluate(() => JSON.parse(localStorage.getItem('working.v1')).projects);
const menu = async () => {
  await page.click(`.day[data-date="${key(today)}"]`);
  const names = await page.locator('#evProject option').allTextContents();
  await page.keyboard.press('Escape');
  return names.join();
};
const betaId = (await projectsSaved()).find((p) => p.name === 'Beta').id;
const link = (items) => `${base}#projects=${items.map(encodeURIComponent).join(',')}`;
await page.goto(link(['Alpha', `${N1}|Beta two|Beta`, `${N2}|Gamma`]));
await page.reload();
await page.waitForSelector('body.ready');
let ps = await projectsSaved();
check('renamed project keeps its id and colour', ps.find((p) => p.nid === N1)?.id === betaId && ps.find((p) => p.nid === N1)?.order === 1, JSON.stringify(ps));
check('menu shows the new names', (await menu()) === 'Alpha,Beta two,Gamma', await menu());
await page.goto(link(['Alpha', `${N1}|Beta, renamed again`]));
await page.reload();
await page.waitForSelector('body.ready');
ps = await projectsSaved();
check('a later rename follows the Notion id (comma in a name is fine)', ps.find((p) => p.id === betaId)?.name === 'Beta, renamed again', JSON.stringify(ps));
check('a project removed in Notion leaves the menu but keeps its data', (await menu()) === 'Alpha,Beta, renamed again' && ps.some((p) => p.name === 'Gamma' && p.hidden), JSON.stringify(ps));
check('no script errors', errors.length === 0, errors.join(' | '));
check('no error bar shown', !(await page.isVisible('#err')));

await browser.close();
server.close();
if (failed) {
  console.log(`${failed} check(s) failed`);
  process.exit(1);
}
console.log('all checks passed');
