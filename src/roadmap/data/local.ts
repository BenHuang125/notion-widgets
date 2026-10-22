// Keeps the plan in this browser's storage (inside the Notion embed it is the storage for
// this page within Notion). Every read and write is guarded: a browser that refuses storage
// gets `null`, and the page then runs in memory and says so.

import type { Persist } from './store';

/** Storage name: never rename it, or Ben's saved plan is no longer found. */
export const STORAGE_KEY = 'life-roadmap.v1';
const PROBE_KEY = 'life-roadmap.probe';

export function browserPersist(storage: Storage | null = safeLocalStorage()): Persist | null {
  if (!storage) return null;
  try {
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
  } catch {
    return null;
  }
  return {
    load: () => storage.getItem(STORAGE_KEY),
    save: (text) => storage.setItem(STORAGE_KEY, text),
    watch(changed) {
      const onStorage = (e: StorageEvent): void => {
        if (e.key === STORAGE_KEY) changed();
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    },
  };
}

/** Some browsers throw on merely reading `localStorage` (blocked site data). */
export function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
