// The "photo of how things are now" (現況照片) for any of Ben's web systems (system-template
// RULES §3, ARCHITECTURE.md §4): a migration step must leave everything a user can see and
// everything the page stores exactly as it was, bit for bit.
//
// This file is the system-neutral engine; each system writes a short scenario file that only
// drives its page through the UI (clicks, typing, files) and names the steps, for example
// the library's tests/athen-snapshot.mjs (BenHuang125/HSG-library). The scenario must not call the page's own functions: they are what a
// migration renames, so a photo taken through them would change when nothing a user sees has.
//
// What is recorded after every step:
// - text: what the user can read in the page (document.body.innerText, whitespace folded)
// - store: every document in the stand-in artifact database (window.__MOCKSTORE, if the system
//   uses a mock runtime), sorted by path
// - local: every localStorage entry, sorted by key
// - calls: every runtime call the step made (window.__MOCKLOG slice: db reads and writes, AI
//   prompts and options, connector calls, downloads)
//   Fields the scenario lists as timing (when a job started, how long it took) are written as a
//   token: they say how fast the machine was, not what the page did.
// - errors: page errors and console errors during the step
// Each part is hashed (SHA-256) and the hashes are compared; the texts are kept in --dump so a
// difference can be read, not just detected.
//
// Determinism: the page runs on a paused fake clock (Playwright clock.install + pauseAt: Date,
// performance.now,
// setTimeout, setInterval, requestAnimationFrame). Page time moves only when the photo moves it:
// every step ends with exactly SETTLE_TICKS ticks of TICK_MS, and after each tick the photo waits,
// in real time, until the page is quiet (no request in flight, nothing changing). So a timer the
// page sets (a debounce, a background job) fires at the same point of the scenario however fast
// or slow the machine is. Math.random is a seeded generator, and the browser build is recorded
// (drawing and Math can differ between Chromium builds). `--twice` runs the whole scenario twice
// and fails if the two photos differ in any step.
// A scenario waits with `wait(ms)` (page time) and `waitFor(selector)`, never page.waitForTimeout:
// real time does not move the page's clock.
//
// Usage (from a scenario file):
//   node tests/<name>-snapshot.mjs                compare with tests/<name>-snapshot.json
//   node tests/<name>-snapshot.mjs --write        record the photo (only on the version before a change)
//   node tests/<name>-snapshot.mjs --twice        also prove two runs give the same photo
//   node tests/<name>-snapshot.mjs --dump <dir>   also write each step's full record, to diff two versions
//   node tests/<name>-snapshot.mjs --app <dir>    photograph another build (default dist/)
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  const globalRoot = require("node:child_process").execSync("npm root -g").toString().trim();
  ({ chromium } = require(`${globalRoot}/playwright`));
}

export const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, "..");
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".map": "application/json", ".pdf": "application/pdf",
};
const STEP_LIMIT_MS = 120000;
const TICK_MS = 100;
const SETTLE_TICKS = 10;
const WAIT_FOR_TICKS = 300;
const QUIET_POLL_MS = 60;
const QUIET_POLLS = 3;
const QUIET_LIMIT_MS = 20000;

const sha = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const sorted = (entries) => entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

/** Serves the built page as the artifact does: dist/ (or --app), vendor/ from the repo, and the
 *  scenario's own extra routes (e.g. /_blob/<id> for stored assets). */
function serve({ app, vendor, routes }) {
  const server = createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html");
    const extra = routes?.(url);
    if (extra) {
      res.writeHead(200, { "content-type": extra.type || "application/octet-stream" });
      res.end(extra.body);
      return;
    }
    const at = url.indexOf("/vendor/");
    const file = at >= 0 ? join(vendor, url.slice(at + "/vendor/".length)) : join(app, url);
    if (!existsSync(file)) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  }).listen(0);
  return { port: server.address().port, close: () => server.close() };
}

// Runs in the page before any of its scripts. Besides the seeded Math.random, it counts the page's
// work that finishes off the main thread (fetch, reading a Blob or a response body, compression streams read through a Response, hashing, canvas toBlob): the photo waits
// for that count to reach 0 before it moves the clock, so a slow machine cannot reorder it
// against the page's timers.
function determinism() {
  let pending = 0;
  Object.defineProperty(window, "__pending", { get: () => pending });
  const track = (proto, name) => {
    const real = proto?.[name];
    if (typeof real !== "function") return;
    proto[name] = function (...args) {
      pending += 1;
      let out;
      try {
        out = real.apply(this, args);
      } catch (e) {
        pending -= 1;
        throw e;
      }
      return Promise.resolve(out).finally(() => {
        pending -= 1;
      });
    };
  };
  // fetch is counted in the page too: the test's own record of requests arrives a moment late
  track(window, "fetch");
  for (const name of ["arrayBuffer", "text", "bytes"]) track(Blob.prototype, name);
  for (const name of ["arrayBuffer", "text", "json", "blob", "bytes"]) track(Response.prototype, name);
  for (const name of ["digest", "importKey", "encrypt", "decrypt", "sign"]) track(SubtleCrypto.prototype, name);
  const toBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (done, ...args) {
    pending += 1;
    return toBlob.call(this, (blob) => {
      pending -= 1;
      done(blob);
    }, ...args);
  };
  if (!globalThis.__seededRandom) {
    let state = 42;
    Math.random = () => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state / 2147483648;
    };
  }
}

async function record(page) {
  return page.evaluate(() => {
    const fold = (s) => String(s).replace(/\s+/g, " ").trim();
    const store = window.__MOCKSTORE
      ? [...window.__MOCKSTORE.entries()].map(([k, v]) => [k, JSON.stringify(v)])
      : [];
    const local = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        local.push([k, localStorage.getItem(k)]);
      }
    } catch {
      local.push(["(localStorage unavailable)", ""]);
    }
    return {
      text: fold(document.body.innerText),
      store,
      local,
      callsAt: (window.__MOCKLOG || []).length,
    };
  });
}

/** Real-time wait until the page is quiet: no request in flight and the runtime log, the visible
 *  text and the store unchanged for QUIET_POLLS polls in a row. */
async function quiet(page, inflight) {
  const start = Date.now();
  let last = "";
  let same = 0;
  while (Date.now() - start < QUIET_LIMIT_MS) {
    const now = await page
      .evaluate(() => {
        const t = document.body.innerText;
        let h = 0;
        for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
        return `${window.__pending ?? 0}|${(window.__MOCKLOG || []).length}|${window.__MOCKSTORE?.size ?? 0}|${t.length}|${h}`;
      })
      .catch(() => "");
    same = now === last && now.startsWith("0|") && inflight.size === 0 ? same + 1 : 0;
    last = now;
    if (same >= QUIET_POLLS) return;
    await new Promise((r) => setTimeout(r, QUIET_POLL_MS));
  }
}

/** Moves the page's clock forward by `ms` in ticks, letting the page go quiet after each one. */
async function advance(page, inflight, ms) {
  for (let t = 0; t < ms; t += TICK_MS) {
    // quiet first: what the last action started (a fetch, a read) finishes before time moves
    await quiet(page, inflight);
    await page.clock.runFor(TICK_MS);
  }
  await quiet(page, inflight);
}

/**
 * Takes one photo.
 * @param {object} o
 * @param {string} o.name           photo name: tests/<name>-snapshot.json
 * @param {number} o.time           the fixed clock (ms since epoch)
 * @param {Array<[Function, any]>} o.init   extra init scripts with their argument (e.g. a mock runtime)
 * @param {(url: string) => ({type?: string, body: any} | null)} [o.routes]
 * @param {(t: {page, step, wait, waitFor, here}) => Promise<void>} o.scenario  drives the page
 *   through its UI; calls step(name, fn); waits with wait(ms) and waitFor(selector[, "visible"])
 * @param {string[]} [o.browserArgs]
 * @param {{width: number, height: number}} [o.viewport]
 * @param {string} [o.timezoneId]  the page's time zone (default Asia/Taipei, Ben's own). Without it
 *   the page takes the machine's zone: a photo taken in Taipei shows 10:00 where GitHub (UTC) shows 02:00.
 * @param {string} [o.locale]  the page's language and formats (default en-US), for the same reason
 * @param {string} [o.host]  served under this host name (some pages pick their mode from it)
 * @param {Array<[RegExp, string]>} [o.timing]  only the fields that measure the machine: a global
 *   pattern whose group 1 (the field's name) is kept and whose value becomes the token, e.g.
 *   [/("startedAt":)\d+/g, "<time>"]. Keep it narrow: a field listed here is no longer compared.
 */
export async function takePhoto(o, app) {
  const vendor = join(ROOT, "vendor");
  const srv = serve({ app, vendor, routes: o.routes });
  const hostArgs = o.host ? [`--host-resolver-rules=MAP ${o.host} 127.0.0.1`] : [];
  const browser = await chromium.launch({ args: [...hostArgs, ...(o.browserArgs || [])] });
  const context = await browser.newContext({
    viewport: o.viewport || { width: 1400, height: 900 },
    timezoneId: o.timezoneId || "Asia/Taipei",
    locale: o.locale || "en-US",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const allowed = new RegExp(`^https?://(127\\.0\\.0\\.1${o.host ? `|${o.host.replace(/\./g, "\\.")}` : ""})[:/]`);
  await page.route((u) => !allowed.test(u.href), (r) => r.abort());
  for (const [fn, arg] of o.init || []) await page.addInitScript(fn, arg);
  await page.addInitScript(determinism);
  // install() starts a clock that still moves with real time; pauseAt() stops it, so from here on
  // only runFor() moves it
  const PAUSE_LEAD_MS = 1000;
  await page.clock.install({ time: o.time - PAUSE_LEAD_MS });
  await page.clock.pauseAt(o.time);
  const inflight = new Set();
  page.on("request", (r) => inflight.add(r));
  page.on("requestfinished", (r) => inflight.delete(r));
  page.on("requestfailed", (r) => inflight.delete(r));
  const wait = (ms) => advance(page, inflight, ms);
  const waitFor = async (selector, state = "attached") => {
    for (let i = 0; i < WAIT_FOR_TICKS; i++) {
      const el = await page.$(selector);
      const visible = el && (state !== "visible" || (await el.isVisible()));
      if (el && visible) return;
      await advance(page, inflight, TICK_MS);
    }
    throw new Error(`${selector} did not appear`);
  };
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|fonts\.g/.test(m.text())) errors.push(m.text());
  });
  page.on("dialog", (d) => d.accept());
  const steps = [];
  let callsAt = 0;
  const step = async (name, fn) => {
    const e0 = errors.length;
    let threw = "";
    try {
      await Promise.race([
        fn(),
        new Promise((_, no) => setTimeout(() => no(new Error(`step over ${STEP_LIMIT_MS} ms`)), STEP_LIMIT_MS)),
      ]);
    } catch (e) {
      threw = String(e.message).split("\n")[0];
    }
    await advance(page, inflight, TICK_MS * SETTLE_TICKS);
    const r = await record(page);
    const calls = await page.evaluate((at) => (window.__MOCKLOG || []).slice(at), callsAt).catch(() => []);
    callsAt = r.callsAt;
    // the test server's port changes on every run: it is the one thing a page may echo back
    // (its own address) that is not part of what it does
    // ...and the scenario's `timing` fields: values that say how fast this machine was, not
    // what the page did (when a background job started, how many milliseconds a step took).
    const portFree = (t) => {
      let out = String(t).split(`:${srv.port}`).join(":<port>");
      for (const [re, token] of o.timing || []) out = out.replace(re, (_m, key) => `${key}${token}`);
      return out;
    };
    const full = {
      text: portFree(r.text),
      store: sorted(r.store.map(([k, v]) => [portFree(k), portFree(v)])),
      local: sorted(r.local.map(([k, v]) => [portFree(k), portFree(v)])),
      calls: calls.map((c) => portFree(JSON.stringify(c))),
      errors: errors.slice(e0).map(portFree),
      threw,
    };
    steps.push({ name, full });
    process.stdout.write(`  · ${name}${threw ? `  (threw: ${threw})` : ""}\n`);
  };
  await page.goto(`http://${o.host || "127.0.0.1"}:${srv.port}/index.html`, { waitUntil: "load" });
  await quiet(page, inflight);
  await o.scenario({ page, step, wait, waitFor, here: HERE });
  const version = browser.version();
  await browser.close();
  srv.close();
  return { browser: version, steps };
}

const PARTS = ["text", "store", "local", "calls", "errors", "threw"];
const hashes = (photo) =>
  photo.steps.map((s) => ({
    name: s.name,
    ...Object.fromEntries(PARTS.map((p) => [p, sha(JSON.stringify(s.full[p]))])),
  }));

function compare(want, got) {
  const out = [];
  const n = Math.max(want.length, got.length);
  for (let i = 0; i < n; i++) {
    const a = want[i];
    const b = got[i];
    if (!a || !b || a.name !== b.name) {
      out.push(`step ${i + 1}: expected "${a?.name}", got "${b?.name}"`);
      continue;
    }
    const differs = PARTS.filter((p) => a[p] !== b[p]);
    if (differs.length) out.push(`step ${i + 1} "${a.name}": ${differs.join(", ")} differ`);
  }
  return out;
}

function dump(dir, photo, tag) {
  mkdirSync(dir, { recursive: true });
  photo.steps.forEach((s, i) => {
    const file = join(dir, `${tag}-${String(i + 1).padStart(2, "0")}.json`);
    writeFileSync(file, `${JSON.stringify({ name: s.name, ...s.full }, null, 1)}\n`);
  });
}

/** Command-line entry for a scenario file. */
export async function main(o) {
  const args = process.argv.slice(2);
  const flag = (f) => args.includes(f);
  const value = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
  const app = resolve(value("--app") || join(ROOT, "dist"));
  const file = join(HERE, `${o.name}-snapshot.json`);
  const problems = [];
  console.log(`photo of ${app}`);
  const a = await takePhoto(o, app);
  if (value("--dump")) dump(value("--dump"), a, "a");
  const ha = hashes(a);
  for (const s of a.steps) {
    if (s.full.errors.length) problems.push(`step "${s.name}" had errors: ${s.full.errors.join(" / ").slice(0, 300)}`);
    if (s.full.threw) problems.push(`step "${s.name}" threw: ${s.full.threw}`);
  }
  if (flag("--twice")) {
    console.log("second run");
    const b = await takePhoto(o, app);
    if (value("--dump")) dump(value("--dump"), b, "b");
    for (const d of compare(ha, hashes(b))) problems.push(`two runs differ: ${d}`);
  }
  if (flag("--write")) {
    if (problems.length) {
      for (const p of problems) console.log(`FAIL  ${p}`);
      console.log("not written: the photo must be clean and repeatable");
      process.exitCode = 1;
      return;
    }
    writeFileSync(file, `${JSON.stringify({ browser: a.browser, steps: ha }, null, 1)}\n`);
    console.log(`written ${file}: ${ha.length} steps`);
    return;
  }
  if (!existsSync(file)) problems.push(`${file} is missing (record it with --write on the version before the change)`);
  else {
    const want = JSON.parse(readFileSync(file, "utf8"));
    if (want.browser !== a.browser) console.log(`note: photo taken with ${want.browser}, this browser is ${a.browser}`);
    for (const d of compare(want.steps, ha)) problems.push(d);
  }
  for (const p of problems) {
    console.log(`FAIL  ${p}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=${o.name}-snapshot::${p.slice(0, 900)}`);
  }
  console.log(`${o.name}-snapshot: ${problems.length ? "DIFFERENT" : "identical"} (${ha.length} steps)`);
  if (problems.length) process.exitCode = 1;
}
