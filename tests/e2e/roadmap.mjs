// End-to-end check of the built page (dist/) in a real browser, with a stand-in database.
// Example data only: Ben's own plan lives in the published page's database, never here.
//
//   node tests/e2e/roadmap.mjs [screenshot-folder]

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(import.meta.url), '..', '..', '..', 'dist');
const shots = process.argv[2];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.map': 'application/json',
};

const server = createServer(async (req, res) => {
  const path = req.url === '/' ? '/index.html' : (req.url ?? '/').split('?')[0];
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => server.listen(0, ok));
const url = `http://127.0.0.1:${server.address().port}/`;

const SEED = {
  goals: {
    g1: { title: '範例目標 A', target: '2029-12-31', color: 'clay' },
    g2: { title: '範例目標 B', target: '2027-06-30', color: 'slate' },
  },
  cards: {
    c1: {
      title: '已完成的卡',
      note: '',
      goalId: 'g2',
      month: '2026-12',
      doneOn: '2026-09-30',
      rank: 0,
    },
    c2: {
      title: '未完成的卡',
      note: '一行說明',
      goalId: 'g2',
      month: '2027-12',
      doneOn: null,
      rank: 0,
    },
    c3: { title: '別的目標', note: '', goalId: 'g1', month: '2028-12', doneOn: null, rank: 0 },
    bad: { title: 5, month: 'x' },
  },
  tracks: { t1: { name: '學歷' } },
  segments: {
    s1: { trackId: 't1', name: '範例時間段', start: '2017-09', end: '2021-06', color: 'olive' },
  },
};

/** Puts the example plan in this browser's storage, the way the page keeps it. */
function seedStorage(seed) {
  if (sessionStorage.getItem('seeded')) return;
  sessionStorage.setItem('seeded', '1');
  localStorage.setItem('life-roadmap.v1', JSON.stringify({ version: 1, ...seed, layout: null }));
  // Stand-in for a browser that refuses a save.
  const real = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (String(v).includes('存不進去')) throw new Error('儲存空間已滿');
    return real.call(this, k, v);
  };
  window.__saved = () => JSON.parse(localStorage.getItem('life-roadmap.v1'));
}

const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-22T12:00:00+08:00'));
  await page.addInitScript(seedStorage, SEED);
  await page.goto(url);
  await page.waitForSelector('.goal');

  const goalTitles = await page.$$eval('.goal-title', (els) => els.map((e) => e.textContent));
  check(goalTitles.join() === '範例目標 B,範例目標 A', 'goals sorted soonest first');
  check(
    (await page.textContent('.notice.is-bad'))?.includes('卡片 bad') === true,
    'bad row reported',
  );
  check((await page.locator('.notice.is-bad').count()) === 1, 'one notice for the unreadable row');
  check((await page.locator('.axis-year.is-now').textContent()) === '2026', 'current year marked');
  const firstVisible = await page.$eval('[data-scroll="board"]', (b) => b.scrollLeft);
  const yearW = await page.$eval('.col', (c) => c.getBoundingClientRect().width);
  check(Math.abs(firstVisible - 9 * yearW) < 2, 'opens with this year in the first column');
  check(
    Math.abs(yearW - (await page.$eval('#roadmap', (r) => r.clientWidth)) / 6) < 2,
    'six years in view',
  );
  if (shots) await page.screenshot({ path: `${shots}/roadmap-desktop.png`, fullPage: true });

  // Tick the open card of goal B: asks for the date, then the goal is reached and a flag shows.
  await page.click('.card:not(.is-done) .tick >> nth=0');
  await page.fill('.dlg input[type=date]', '2026-10-20');
  await page.click('.dlg .btn-primary');
  await page.waitForSelector('.flag-mark');
  check(
    (await page.textContent('.flag-text')).includes('2026/10/20'),
    'flag shows the last tick date',
  );
  check((await page.locator('.card.is-done').count()) === 2, 'card shows as done');
  // Untick: back to open, flag goes away.
  await page.click('.card.is-done .tick >> nth=1');
  await page.waitForFunction(() => !document.querySelector('.flag-mark'));
  check(true, 'unticking removes the flag');

  // Add a goal: lands in the right place, gets the next unused color.
  await page.hover('.goals');
  await page.click('.add-goal');
  await page.fill('.dlg input[type=text]', '範例目標 C');
  await page.fill('.dlg input[type=date]', '2028-01-01');
  await page.click('.dlg .btn-primary');
  await page.waitForFunction(() => document.querySelectorAll('.goal').length === 3);
  const titles = await page.$$eval('.goal-title', (els) => els.map((e) => e.textContent));
  check(titles[1] === '範例目標 C', 'new goal sorted by date');
  check(
    (await page.evaluate(
      () => Object.values(window.__saved().goals).find((g) => g.title === '範例目標 C').color,
    )) === 'olive',
    'new goal gets next color',
  );

  // Add a card under 2030 with a goal and a month.
  await page.hover('.col >> nth=13');
  await page.click('.col >> nth=13 >> .add-card');
  await page.fill('.dlg input[type=text]', '新卡片');
  await page.selectOption('.dlg select >> nth=0', { label: '範例目標 C' });
  await page.selectOption('.dlg .pair select >> nth=1', '3');
  await page.click('.dlg .btn-primary');
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.card-title')].some((e) => e.textContent === '新卡片'),
  );
  const month = await page.evaluate(
    () => Object.values(window.__saved().cards).find((c) => c.title === '新卡片').month,
  );
  check(month === '2030-03', 'card stored with its month');

  // Move the track lane above the axis by dragging its handle.
  const grip = page.locator('.lane-track .grip');
  await page.hover('.lane-track');
  const box = await grip.boundingBox();
  const top = await page.locator('.lane-flags').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 5, top.y - 4, { steps: 8 });
  await page.mouse.up();
  await page.waitForFunction(() => window.__saved().layout?.above?.[0]?.startsWith('track:'));
  check(true, 'track moved above the axis');

  // Drag the board: it slides, and the click at the end does not open a card.
  const board = page.locator('[data-scroll="board"]');
  const before = await board.evaluate((b) => b.scrollLeft);
  const col = await page.locator('.columns').boundingBox();
  await page.mouse.move(640, col.y + 20);
  await page.mouse.down();
  await page.mouse.move(400, col.y + 20, { steps: 6 });
  await page.mouse.up();
  check((await board.evaluate((b) => b.scrollLeft)) > before, 'dragging slides the board');
  check((await page.locator('.dlg').count()) === 0, 'drag does not open a dialog');

  // A refused save: the card shows at once, then goes away again with a message.
  await page.hover('.col >> nth=12');
  await page.click('.col >> nth=12 >> .add-card');
  await page.fill('.dlg input[type=text]', '存不進去');
  await page.click('.dlg .btn-primary');
  check((await page.locator('.dlg').count()) === 0, 'dialog closes without waiting for the save');
  await page.waitForSelector('.toast');
  check(
    (await page.textContent('.toast')).includes('儲存空間已滿'),
    'failed save is shown with its reason',
  );
  await page.waitForFunction(
    () => ![...document.querySelectorAll('.card-title')].some((e) => e.textContent === '存不進去'),
  );
  check(true, 'failed card is taken back off the page');

  await page.click('.toast');

  // Kept in the browser: a reload shows the same plan.
  await page.reload();
  await page.waitForSelector('.goal');
  check((await page.locator('.goal').count()) === 3, 'plan survives a reload');

  // Backup: copy out, paste back (asks first, shows what gets replaced).
  await page.click('.backup-btn');
  const text = await page.inputValue('#backup-out');
  check(text.includes('範例目標 C'), 'backup holds the plan');
  const one = JSON.parse(text);
  one.goals = { only: { title: '只有一個', target: '2030-01-01', color: 'teal' } };
  await page.fill('#backup-in', JSON.stringify(one));
  await page.click('.dlg .btn-primary');
  check(
    (await page.textContent('.dlg')).includes('換成：1 個目標'),
    'paste asks first with counts',
  );
  await page.click('.dlg .btn-danger');
  await page.waitForFunction(() => document.querySelectorAll('.goal').length === 1);
  check(true, 'pasted backup replaces the plan');
  await page.click('.backup-btn');
  await page.fill('#backup-in', '不是備份');
  await page.click('.dlg .btn-primary');
  check((await page.textContent('.dlg-error')).includes('不是備份'), 'wrong paste is refused');

  check(errors.length === 0, `no page errors ${errors.join(' | ')}`);
} finally {
  await browser.close();
  server.close();
}
if (fails.length) {
  console.error(`${fails.length} failed`);
  process.exit(1);
}
