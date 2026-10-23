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

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 240 } });
// Fonts come from Google; the test must not depend on the network.
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

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

const lines = await page.evaluate(() => [qTop.scrollWidth <= qTop.parentElement.clientWidth + 1, qBot.scrollWidth <= qBot.parentElement.clientWidth + 1]);
check('each quote line fits on one line', lines[0] && lines[1], JSON.stringify(lines));

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
const t0 = await paused.evaluate(() => S.t);
await paused.waitForTimeout(1200);
const t1 = await paused.evaluate(() => S.t);
check('keeps moving when the browser pauses animation frames', t1 - t0 > 0.5, `${t0} -> ${t1}`);

await browser.close();
server.close();
if (failed) {
  console.log(`${failed} check(s) failed`);
  process.exit(1);
}
console.log('all quote-frame checks passed');
