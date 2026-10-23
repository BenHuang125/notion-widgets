import { describe, expect, it } from 'vitest';
import { fromBackup, makeStore, type Persist, type Snapshot } from '../../src/roadmap/data/store';

function memoryPersist(start: string | null = null) {
  let text = start;
  let refuse = false;
  const persist: Persist = {
    load: () => text,
    save: (t) => {
      if (refuse) throw new Error('full');
      text = t;
    },
    watch: () => () => undefined,
  };
  return { persist, saved: () => text, refuse: () => (refuse = true) };
}

const goal = { title: 'A', target: '2030-01-01', color: 'clay' };

describe('store kept in the browser', () => {
  it('saves every change and loads it back', async () => {
    const m = memoryPersist();
    const a = makeStore(m.persist);
    a.subscribe(
      () => undefined,
      () => undefined,
    );
    await a.put('goals', 'g', goal);
    const b = makeStore(m.persist);
    let snap: Snapshot | undefined;
    b.subscribe(
      (s) => (snap = s),
      () => undefined,
    );
    expect(snap?.plan.goals.map((g) => g.title)).toEqual(['A']);
  });
  it('takes a refused save back off the page', async () => {
    const m = memoryPersist();
    const store = makeStore(m.persist);
    const seen: number[] = [];
    store.subscribe(
      (s) => seen.push(s.plan.goals.length),
      () => undefined,
    );
    m.refuse();
    await expect(store.put('goals', 'g', goal)).rejects.toThrow('full');
    expect(seen).toEqual([0, 1, 0]);
  });
  it('never overwrites saved data it could not read', async () => {
    const m = memoryPersist('{broken');
    const store = makeStore(m.persist);
    const fails: string[] = [];
    store.subscribe(
      () => undefined,
      (msg) => fails.push(msg),
    );
    expect(fails).toHaveLength(1);
    await expect(store.put('goals', 'g', goal)).rejects.toThrow('先不存檔');
    expect(m.saved()).toBe('{broken');
  });
  it('saves in the format it reads back, and refuses text that is not one', async () => {
    const m = memoryPersist();
    const store = makeStore(m.persist);
    store.subscribe(
      () => undefined,
      () => undefined,
    );
    await store.put('goals', 'g', goal);
    expect(fromBackup(m.saved() ?? '').rows.goals.get('g')).toEqual(goal);
    expect(() => fromBackup('hello')).toThrow('不是備份');
    expect(() => fromBackup('{"version":2}')).toThrow('版本');
    expect(makeStore(null).mode).toBe('memory');
  });
});
