// Working calendar — pure helpers and storage (no screen code here).
// Data lives only in Ben's browser (the Notion embed); nothing personal is ever written to this repo.

export const STORE_KEY = 'working.v1'; // do not rename: Ben's data sits under this name
const DAY_MS = 864e5;
const WEEK_DAYS = 7;
const GOLDEN = 137.508;

/* ---------- dates (English day-month-year, like the roadmap) ---------- */
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export function today() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
export const fmt = (d, opts) => d.toLocaleDateString('en-GB', opts);
export const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

/** Monday-first grid of whole weeks covering the month of `first`. */
export function monthCells(first) {
  const lead = (first.getDay() + 6) % WEEK_DAYS;
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const rows = Math.ceil((lead + daysIn) / WEEK_DAYS);
  const start = addDays(first, -lead);
  return Array.from({ length: rows * WEEK_DAYS }, (_, i) => addDays(start, i));
}

/* ---------- review weeks: Week 1 = Fri 4 Sep 2026 – Thu 10 Sep ---------- */
const WEEK1 = new Date(2026, 8, 4);
export const weekOf = (d) => Math.floor(Math.round((d - WEEK1) / DAY_MS) / WEEK_DAYS) + 1;
export const weekStart = (n) => addDays(WEEK1, (n - 1) * WEEK_DAYS);

/* ---------- project colours: the roadmap's muted set, fixed by the order a project arrived ---------- */
const PALETTE = ['#c49a80', '#7e8fa6', '#8c9a6e', '#c48e8e', '#6f9a97', '#c7a55a', '#9a7fa0', '#5f8a73', '#8a8f9c', '#bfae8e'];
export function projectColor(order) {
  if (order < PALETTE.length) return PALETTE[order];
  const hue = Math.round((30 + order * GOLDEN) % 360); // beyond ten: same softness, new hue
  return `hsl(${hue} 18% 62%)`;
}

/**
 * Projects from the Notion embed link (the part after # never reaches GitHub):
 *   #projects=個人,<notionId>|Library|HSG 研究圖書館,…
 * Each item is `name`, or `notionId|name` for a row of the Notion 專案 Projects database,
 * optionally followed by `|old name` aliases so a project renamed in Notion keeps its events.
 * Each item is URI-encoded on its own, so names may contain commas.
 */
export function projectsFromHash(hash) {
  const m = /(?:^#|&)projects=([^&]*)/.exec(hash || '');
  if (!m) return [];
  return m[1].split(',').map((raw) => {
    const parts = safeDecode(raw).split('|').map((s) => s.trim());
    const nid = /^[0-9a-f]{32}$/i.test(parts[0]) ? parts.shift().toLowerCase() : null;
    return { nid, name: parts[0] ?? '', aliases: parts.slice(1).filter(Boolean) };
  }).filter((p) => p.name);
}
function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Brings the saved projects in line with the link. A project is matched by its Notion id first,
 * then by name or an old name; a match is renamed in place (same id, order and colour, so its events
 * follow). New projects join at the end with the next colour. Projects missing from the link are
 * hidden from the menu, not deleted, so old events keep their colour.
 */
export function mergeProjects(projects, items, makeId) {
  const out = projects.map((p) => ({ ...p }));
  const used = new Set();
  const free = (p) => !used.has(p.id);
  for (const it of items) {
    let p = it.nid ? out.find((q) => q.nid === it.nid) : undefined;
    p ??= out.find((q) => free(q) && !q.nid && q.name === it.name);
    p ??= out.find((q) => free(q) && !q.nid && it.aliases.includes(q.name));
    if (!p) {
      p = { id: makeId(), name: it.name, order: out.length };
      out.push(p);
    }
    p.name = it.name;
    if (it.nid) p.nid = it.nid;
    delete p.hidden;
    used.add(p.id);
  }
  if (items.length) for (const p of out) if (!used.has(p.id)) p.hidden = true;
  return out;
}

/* ---------- storage ---------- */
export const emptyState = () => ({ v: 1, projects: [], events: [], todos: {}, reviews: {} });
export function readState(storage) {
  try {
    const s = JSON.parse(storage.getItem(STORE_KEY));
    return s && s.v === 1 ? s : emptyState();
  } catch {
    return emptyState();
  }
}
export function writeState(storage, s) {
  try {
    storage.setItem(STORE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
export const uid = () =>
  globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
