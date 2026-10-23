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

/** Project names from the Notion embed link: #projects=A,B,C (the part after # never reaches GitHub). */
export function projectsFromHash(hash) {
  const m = /(?:^#|&)projects=([^&]*)/.exec(hash || '');
  if (!m) return [];
  return decodeURIComponent(m[1]).split(',').map((s) => s.trim()).filter(Boolean);
}

/** Adds new names at the end; existing projects keep their order (and so their colour). */
export function mergeProjects(projects, names, makeId) {
  const known = new Set(projects.map((p) => p.name));
  const added = names.filter((n) => !known.has(n));
  return projects.concat(added.map((name, i) => ({ id: makeId(), name, order: projects.length + i })));
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
