// End-to-end check of the HOME four-photo wall (photos.html) in a real browser.
// Desktop width only. Example images only (the repo is public; Ben's photos live in his browser).
//
//   node tests/e2e/photos.mjs

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const server = createServer(async (req, res) => {
  if ((req.url ?? '/').split('?')[0] !== '/photos.html') return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(await readFile(join(root, 'photos.html')));
});
await new Promise((ok) => server.listen(0, ok));
const url = `http://127.0.0.1:${server.address().port}/photos.html`;

let failed = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` — ${detail}`}`);
  if (!ok) failed++;
}

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.clock.install();
await page.goto(url);
await page.waitForFunction(() => document.querySelectorAll('.tile .layer img').length === 4);

check('four tiles in a 2×2 grid', (await page.locator('.tile').count()) === 4);
check('example photos fill all four tiles', (await page.locator('.tile .layer').count()) === 4);
check('example notice shown', await page.locator('#demo').isVisible());

// make three small distinct images to upload
const files = await page.evaluate(async () => {
  const out = [];
  for (const col of ['#6B5A4D', '#D1C0A7', '#AFA391']) {
    const c = document.createElement('canvas');
    c.width = 300;
    c.height = 200;
    const x = c.getContext('2d');
    x.fillStyle = col;
    x.fillRect(0, 0, 300, 200);
    out.push(c.toDataURL('image/png').split(',')[1]);
  }
  return out;
});
await page.locator('#open').click();
await page.locator('#file').setInputFiles(
  files.map((b, i) => ({ name: `p${i}.png`, mimeType: 'image/png', buffer: Buffer.from(b, 'base64') })),
);
await page.waitForFunction(() => document.querySelectorAll('.thumb').length === 3);
check('upload: three photos in the pool', (await page.locator('.thumb').count()) === 3);
check('upload: counter reads 3 / 20', (await page.locator('#count').textContent()) === '3 / 20');
check('upload: example notice gone', !(await page.locator('#demo').isVisible()));
await page.clock.runFor(4000);
check('upload: three tiles show photos, one stays empty', (await page.locator('.tile.blank').count()) === 1);

// stored in the browser: survives a reload
await page.reload();
await page.waitForFunction(() => document.querySelectorAll('.tile .layer img').length === 3);
check('reload: photos kept', (await page.locator('#n').textContent()) === '3 / 20');

// rotation every 30 s: tiles change order (random), and the set stays the same three photos
const before = await page.$$eval('.tile', (t) => t.map((x) => x.dataset.id).join());
let changed = false;
for (let i = 0; i < 6 && !changed; i++) {
  await page.clock.runFor(30000);
  await page.clock.runFor(4000);
  changed = (await page.$$eval('.tile', (t) => t.map((x) => x.dataset.id).join())) !== before;
}
check('rotation: tiles change after 30 s', changed);
check('rotation: old layers are cleared', (await page.locator('.layer').count()) === 3);

// delete one
await page.locator('#open').click();
await page.locator('.thumb').first().hover();
await page.locator('.thumb .del').first().click();
await page.waitForFunction(() => document.querySelectorAll('.thumb').length === 2);
check('delete: pool has two', (await page.locator('#count').textContent()) === '2 / 20');

check('no script errors', errors.length === 0, errors.join(' | '));
await browser.close();
server.close();
if (failed) {
  console.log(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nall passed');
