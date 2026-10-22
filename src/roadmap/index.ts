// The roadmap page's one entry: picks where the plan is kept and draws the page.

import { type Db, dbStore } from './data/db-store';
import { memoryStore, type Store } from './data/store';
import { mountApp } from './render/app';

interface ClaudeHost {
  use(name: 'db'): Promise<Db | null>;
}

/** The page's database when the viewer serves one; otherwise a working, unsaved copy. */
async function pickStore(): Promise<Store> {
  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  try {
    const db = host ? await host.use('db') : null;
    return db ? dbStore(db) : memoryStore();
  } catch (e) {
    console.error('roadmap: database unavailable', e);
    return memoryStore();
  }
}

function localToday() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

async function start(root: HTMLElement): Promise<void> {
  const store = await pickStore();
  mountApp(root, { store, today: localToday, newId: () => crypto.randomUUID() });
}

const root = document.getElementById('roadmap');
if (root) {
  start(root).catch((e: unknown) => {
    root.textContent = `路線圖沒辦法打開：${e instanceof Error ? e.message : String(e)}`;
  });
}
