// Shared by goals.html and roadmap.html: loads data/plan.json (written by the
// hourly Notion sync) and provides the date helpers both widgets use.
export const BIRTHDAY = { month: 4, day: 20 }; // 20 April
export const NOTION_EDIT_URL = "https://www.notion.so/73bc0de809994db6bfaa5eaea0afa49c";
export const SYNC_NOW_URL = "https://github.com/BenHuang125/notion-widgets/actions/workflows/sync-notion.yml";

export const CATEGORY_COLOR = {
  "HR 職涯": "var(--hr)",
  "創業": "var(--biz)",
  "PhD": "var(--phd)",
};
export const colorFor = (c) => CATEGORY_COLOR[c] ?? "var(--soft)";

// Today as a Taipei calendar date, independent of the viewer's device clock zone.
export function taipeiToday() {
  const s = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function monthsUntil(isoDate, today = taipeiToday()) {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth()) - (target.getDate() < today.getDate() ? 1 : 0);
}

// "27歲 · 2026" -> { age: 27, year: 2026 }
export function parseAge(label) {
  const age = Number(label.match(/(\d+)\s*歲/)?.[1]);
  const year = Number(label.match(/(\d{4})/)?.[1]);
  return { age, year };
}

export async function loadPlan() {
  const res = await fetch("data/plan.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`plan.json ${res.status}`);
  return res.json();
}

// True when the daily stamp is more than two days old, i.e. syncing has stopped.
export function syncLooksStopped(plan, today = taipeiToday()) {
  if (!plan.checkedOn) return true;
  const [y, m, d] = plan.checkedOn.split("-").map(Number);
  return (today - new Date(y, m - 1, d)) / 864e5 > 2;
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
