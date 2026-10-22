// Ben's first data, handed in through the Notion embed's address (#seed=…), so nothing has to be
// pasted by hand. The part after # never leaves the browser (it is not sent to GitHub), and the
// address lives only on Ben's own Notion page, never in this public repo.
// It is used once: only when this browser has no plan yet and this seed was never applied.

import { fromBackup, type Persist } from './store';

/** Storage name: never rename it, or the seed would be applied again. */
export const SEED_DONE_KEY = 'life-roadmap.seed-applied';
const SEED_PREFIX = '#seed=';
/** The seed is remembered by its last characters (enough to tell seeds apart, short to store). */
const SEED_TAG_LENGTH = 16;

async function inflate(b64url: string): Promise<string> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

/**
 * Applies the seed in `hash` when this browser has no plan and has not used this seed before.
 * Returns what happened, for the page's notice; never throws (a bad seed just is not used).
 */
export async function applySeed(
  hash: string,
  persist: Persist | null,
  flags: Pick<Storage, 'getItem' | 'setItem'> | null,
): Promise<'none' | 'applied' | 'skipped' | 'bad'> {
  if (!hash.startsWith(SEED_PREFIX) || !persist || !flags) return 'none';
  const code = hash.slice(SEED_PREFIX.length);
  try {
    if (persist.load() || flags.getItem(SEED_DONE_KEY) === code.slice(-SEED_TAG_LENGTH))
      return 'skipped';
    const text = await inflate(code);
    fromBackup(text);
    persist.save(text);
    flags.setItem(SEED_DONE_KEY, code.slice(-SEED_TAG_LENGTH));
    return 'applied';
  } catch (e) {
    console.error('roadmap: seed not used', e);
    return 'bad';
  }
}
