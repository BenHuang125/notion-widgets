// The roadmap page's one entry: keeps the plan in this browser and draws the page.

import { browserPersist, safeLocalStorage } from './data/local';
import { applySeed } from './data/seed';
import { makeStore } from './data/store';
import { mountApp } from './render/app';

function localToday() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

async function start(root: HTMLElement): Promise<void> {
  const persist = browserPersist();
  await applySeed(location.hash, persist, persist ? safeLocalStorage() : null);
  const store = makeStore(persist);
  mountApp(root, { store, today: localToday, newId: () => crypto.randomUUID() });
}

const root = document.getElementById('roadmap');
if (root) {
  start(root).catch((e: unknown) => {
    root.textContent = `路線圖沒辦法打開：${e instanceof Error ? e.message : String(e)}`;
  });
}
