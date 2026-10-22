import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { applySeed } from '../../src/roadmap/data/seed';
import type { Persist } from '../../src/roadmap/data/store';

const backup = JSON.stringify({
  version: 1,
  goals: { g: { title: 'A', target: '2030-01-01', color: 'clay' } },
  cards: {},
  tracks: {},
  segments: {},
  layout: null,
});
const encode = (text: string) => `#seed=${deflateRawSync(Buffer.from(text)).toString('base64url')}`;

function fakes(saved: string | null = null) {
  let text = saved;
  const flags = new Map<string, string>();
  const persist: Persist = {
    load: () => text,
    save: (t) => {
      text = t;
    },
    watch: () => () => undefined,
  };
  const store = {
    getItem: (k: string) => flags.get(k) ?? null,
    setItem: (k: string, v: string) => void flags.set(k, v),
  };
  return { persist, store, saved: () => text };
}

describe('seed from the embed address', () => {
  it('fills an empty browser once', async () => {
    const f = fakes();
    expect(await applySeed(encode(backup), f.persist, f.store)).toBe('applied');
    expect(f.saved()).toBe(backup);
  });
  it('never replaces a plan that is already there', async () => {
    const f = fakes('{"version":1}');
    expect(await applySeed(encode(backup), f.persist, f.store)).toBe('skipped');
    expect(f.saved()).toBe('{"version":1}');
  });
  it('is not applied twice (e.g. after Ben empties the plan on purpose)', async () => {
    const f = fakes();
    await applySeed(encode(backup), f.persist, f.store);
    f.persist.save('');
    expect(await applySeed(encode(backup), f.persist, f.store)).toBe('skipped');
  });
  it('ignores other addresses and broken seeds', async () => {
    const f = fakes();
    expect(await applySeed('', f.persist, f.store)).toBe('none');
    expect(await applySeed('#seed=@@@', f.persist, f.store)).toBe('bad');
    expect(await applySeed(encode('not json'), f.persist, f.store)).toBe('bad');
    expect(f.saved()).toBeNull();
  });
});
