// End-to-end check of the Notion quote frame (quotes.html + quotes/*.js) in a real browser.
// Desktop width only (Ben 2026-10-22). No personal data: the quotes are the public ones in the page.
//
//   node tests/e2e/quotes.mjs

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
  const path = (req.url ?? '/').split('?')[0];
  if (!/^\/(quotes\.html|quotes\/[a-z]+\.js)$/.test(path)) return res.writeHead(404).end();
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => server.listen(0, ok));
const url = `http://127.0.0.1:${server.address().port}/quotes.html`;

let failed = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` — ${detail}`}`);
  if (!ok) failed++;
}

// PW_CHROMIUM: use an already-installed browser where Playwright cannot download its own
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 240 } });
// Fonts come from Google; the test must not depend on the network.
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
// Errors inside the drawing loop are caught and logged, so watch the console too (blocked fonts aside).
page.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
});

await page.goto(url);
await page.waitForTimeout(1500);
check('loads without script errors', errors.length === 0, errors.join(' | '));

const quote = await page.textContent('#qTop');
check('shows a quote in the dark top half', (quote ?? '').trim().length > 20, quote ?? '');
const colours = await page.evaluate(() => [
  getComputedStyle(document.getElementById('top')).backgroundColor,
  getComputedStyle(document.getElementById('bot')).backgroundColor,
  getComputedStyle(document.getElementById('qBot')).color,
]);
check(
  'dark coffee top, light coffee bottom, walnut text',
  colours[0] === 'rgb(74, 52, 38)' && colours[1] === 'rgb(234, 223, 207)' && colours[2] === 'rgb(106, 74, 52)',
  colours.join(' / '),
);

// Every quote must fit inside its half (padding excluded), at the normal size and in a short embed.
async function fits(p) {
  return p.evaluate(() => {
    const bad = [];
    for (let i = 0; i < QUOTES.length; i++) {
      setQuote(i);
      const pr = panel.getBoundingClientRect();
      for (const el of [qTop, qBot]) {
        const r = el.getBoundingClientRect();
        if (el.scrollWidth > el.parentElement.clientWidth - 68 + 1 || r.bottom > pr.bottom + 0.5 || r.top < pr.top - 0.5)
          bad.push(`${i}:${el.id}`);
      }
    }
    return bad;
  });
}
check('every quote fits inside the frame (1200×240)', (await fits(page)).length === 0, JSON.stringify(await fits(page)));
const short = await ctx.newPage();
await short.setViewportSize({ width: 1200, height: 150 });
await short.goto(url);
await short.waitForTimeout(400);
const shortBad = await fits(short);
check('every quote fits in a short embed (1200×150)', shortBad.length === 0, JSON.stringify(shortBad));
await short.close();

const drawn = await page.evaluate(() => {
  const c = document.getElementById('world');
  const d = c.getContext('2d').getImageData(0, Math.round((G.fy + 4) * DPR), c.width, 2).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
  return n / (d.length / 4);
});
check('the wooden frame is painted across the width', drawn > 0.9, `${drawn}`);

const world = await page.evaluate(() => {
  const at = (h) => worldAt(EPOCH + h * HOUR);
  return { start: at(10).active, house: !!at(80).done.house, garden: at(80).active, later: at(400).active };
});
check(
  'world follows real time: tree first, house done after ~3 days, then renovations',
  world.start === 'tree1' && world.house && world.garden === 'garden' && /repaint|replant/.test(world.later),
  JSON.stringify(world),
);

// The chameleon changes colour with its mood.
const colour = await page.evaluate(async () => {
  S.anger = 0.95;
  await new Promise((r) => setTimeout(r, 2500));
  return S.col.map(Math.round);
});
check('turns red-orange when angry', colour[0] > 150 && colour[1] < 110, JSON.stringify(colour));

// Clicking it answers with a mood bubble.
await page.evaluate(() => {
  S.anger = 0;
  S.react = null;
  S.bubble = null;
});
const box = await page.evaluate(() => {
  const b = spiritBox();
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
});
await page.mouse.click(box.x, box.y);
const bubble = await page.evaluate(() => S.bubble?.e ?? null);
check('clicking it shows a mood bubble', !!bubble, String(bubble));

// It remembers its mood across reopening (saved in this browser).
await page.evaluate(() => {
  S.v = -0.8;
  save();
});
await page.reload();
await page.waitForTimeout(500);
const remembered = await page.evaluate(() => S.v);
check('remembers its mood after reopening', remembered < -0.6, String(remembered));

// Notion can pause requestAnimationFrame in embeds: the timer fallback must keep it alive.
const paused = await ctx.newPage();
await paused.addInitScript(() => {
  window.requestAnimationFrame = () => 0;
});
await paused.goto(url);
const frame = () => paused.evaluate(() => document.getElementById('world').toDataURL());
const f0 = await frame();
await paused.waitForTimeout(1200);
const f1 = await frame();
check('keeps drawing when the browser pauses animation frames', f0 !== f1, 'canvas did not change');

// A broken save must not freeze its mood.
await page.evaluate(() => localStorage.setItem('frame-spirit.v1', JSON.stringify({ v: 'x', anger: 9, lastSeen: Date.now() + 1e9 })));
await page.reload();
await page.waitForTimeout(300);
const sane = await page.evaluate(() => [S.v, S.anger]);
check('ignores a broken or future-dated save', Number.isFinite(sane[0]) && sane[1] >= 0 && sane[1] <= 1, JSON.stringify(sane));

// The glowing bookshelf opens the quote collection inside the frame; adding a quote puts it on the frame at once.
await page.evaluate(() => localStorage.removeItem('quote-shelf.v1'));
await page.reload();
await page.waitForTimeout(500);
const shelf = await page.evaluate(() => {
  const b = shelfBox();
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
});
await page.mouse.click(shelf.x, shelf.y);
await page.waitForTimeout(400);
const opened = await page.evaluate(() => ({
  open: !document.getElementById('shelf').hidden,
  pairs: document.querySelectorAll('#shelfList .pair').length,
  dark: getComputedStyle(document.querySelector('.pair .pd')).backgroundColor,
  light: getComputedStyle(document.querySelector('.pair .pl')).backgroundColor,
}));
check(
  'clicking the bookshelf opens the collection: dark row + light row per quote',
  opened.open && opened.pairs === 4 && opened.dark === 'rgb(74, 52, 38)' && opened.light === 'rgb(234, 223, 207)',
  JSON.stringify(opened),
);
await page.click('#shelfAdd');
await page.keyboard.type('Sample quote for the test.');
await page.keyboard.press('Enter');
await page.keyboard.type('Sample explanation.');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
const firstRow = await page.textContent('#shelfList .pair .ph');
check('a new quote is listed first', firstRow === 'Sample quote for the test.', String(firstRow));
await page.click('#shelfBack');
await page.waitForTimeout(1100);
check('the frame shows the new quote right away', (await page.textContent('#qTop')) === 'Sample quote for the test.');
await page.reload();
await page.waitForTimeout(500);
const kept = await page.evaluate(() => ({ n: QUOTES.length, first: QUOTES[0].h, shown: qTop.textContent }));
check('the collection is kept after reopening', kept.n === 5 && kept.first === 'Sample quote for the test.', JSON.stringify(kept));
// Another tab (same Notion page) adds a quote: this frame switches to it.
const other = await ctx.newPage();
await other.goto(url);
await other.waitForTimeout(300);
await other.evaluate(() => {
  const it = shelfLoad();
  it.unshift({ id: shelfNewId(), h: 'Added in another tab.', b: 'x', at: Date.now() });
  shelfSave(it);
});
await page.waitForTimeout(1100);
check('another tab adding a quote updates this frame', (await page.textContent('#qTop')) === 'Added in another tab.');
await other.close();
// Delete with undo.
await page.evaluate(() => openShelf());
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector('#shelfList .pair .tool[aria-label="Delete quote"]').click());
const afterDel = await page.evaluate(() => shelfLoad().length);
await page.click('#shelfToast .undo');
const afterUndo = await page.evaluate(() => shelfLoad().length);
check('delete removes a quote and undo brings it back', afterDel === 5 && afterUndo === 6, `${afterDel} → ${afterUndo}`);
await page.evaluate(() => closeShelf());
await page.evaluate(() => localStorage.removeItem('quote-shelf.v1'));
check('no errors during the run', errors.length === 0, errors.join(' | '));

await browser.close();
server.close();
if (failed) {
  console.log(`${failed} check(s) failed`);
  process.exit(1);
}
console.log('all quote-frame checks passed');
