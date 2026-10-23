// The roadmap page's one entry: keeps the plan in this browser and draws the page.
// Any failure is written into the page with its reason, so it never sits on "loading".

import { browserPersist, safeLocalStorage } from './data/local';
import { applySeed } from './data/seed';
import { makeStore } from './data/store';
import { mountApp } from './render/app';

/** The first-load data never holds the page up for longer than this. */
const SEED_WAIT_MS = 2000;

function localToday() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

const describe = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function showFailure(root: HTMLElement, e: unknown): void {
  const p = document.createElement('p');
  p.className = 'notice is-bad';
  p.setAttribute('role', 'alert');
  p.textContent = `路線圖出錯了：${describe(e)}。請重新整理 Notion（⌘R）；還是不行就把這行字截圖給 Claude。`;
  root.prepend(p);
}

async function start(root: HTMLElement): Promise<void> {
  const persist = browserPersist();
  const timeout = new Promise<'late'>((ok) => setTimeout(() => ok('late'), SEED_WAIT_MS));
  await Promise.race([
    applySeed(location.hash, persist, persist ? safeLocalStorage() : null),
    timeout,
  ]);
  const store = makeStore(persist);
  mountApp(root, { store, today: localToday, newId: () => crypto.randomUUID() });
}

const root = document.getElementById('roadmap');
if (root) {
  window.addEventListener('error', (e) => showFailure(root, e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => showFailure(root, e.reason));
  start(root).catch((e: unknown) => showFailure(root, e));
}
