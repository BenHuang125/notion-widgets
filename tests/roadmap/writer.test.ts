import { describe, expect, it } from 'vitest';
import { makeWriter } from '../../src/roadmap/data/writer';

/** A write that finishes when the test says so. */
function gate() {
  const log: string[] = [];
  const opens: (() => void)[] = [];
  const write =
    (name: string, fail = false) =>
    () =>
      new Promise<void>((ok, no) => {
        log.push(name);
        opens.push(() => (fail ? no(new Error(name)) : ok()));
      });
  return { log, write, open: () => opens.shift()?.() };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('writer', () => {
  it('sends one write per document at a time and skips values replaced while waiting', async () => {
    const w = makeWriter();
    const g = gate();
    const a = w.send('cards/1', g.write('done'));
    const b = w.send('cards/1', g.write('open'));
    const c = w.send('cards/1', g.write('done again'));
    await tick();
    expect(g.log).toEqual(['done']);
    g.open();
    await a;
    await tick();
    expect(g.log).toEqual(['done', 'done again']);
    g.open();
    await Promise.all([b, c]);
    expect(g.log).toEqual(['done', 'done again']);
  });
  it('lets different documents go out side by side', async () => {
    const w = makeWriter();
    const g = gate();
    void w.send('cards/1', g.write('one'));
    void w.send('cards/2', g.write('two'));
    await tick();
    expect(g.log).toEqual(['one', 'two']);
  });
  it('passes a failure to everyone waiting on that value', async () => {
    const w = makeWriter();
    const g = gate();
    const a = w.send('goals/1', g.write('bad', true));
    g.open();
    await expect(a).rejects.toThrow('bad');
    const b = w.send('goals/1', g.write('good'));
    await tick();
    g.open();
    await expect(b).resolves.toBeUndefined();
  });
});
