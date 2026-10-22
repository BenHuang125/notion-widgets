// The roadmap page's one entry: keeps the plan in this browser and draws the page.

import { browserPersist } from './data/local';
import { makeStore } from './data/store';
import { mountApp } from './render/app';

function localToday() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

const root = document.getElementById('roadmap');
if (root) {
  try {
    const store = makeStore(browserPersist());
    mountApp(root, { store, today: localToday, newId: () => crypto.randomUUID() });
  } catch (e) {
    root.textContent = `路線圖沒辦法打開：${e instanceof Error ? e.message : String(e)}`;
  }
}
