import { describe, expect, it } from 'vitest';
import { CAKE_HALF_PX, FLAG_LABEL_PX, isRoundAge, liftFlags } from '../../src/roadmap/core/marks';

describe('flags on the axis', () => {
  it('stays low when nothing is in the way', () => {
    expect(liftFlags([100, 600], [1000])).toEqual([
      { x: 100, level: 0 },
      { x: 600, level: 0 },
    ]);
  });
  it('lifts a flag whose label would run into a cake', () => {
    const cake = 100 + FLAG_LABEL_PX / 2;
    expect(liftFlags([100], [cake])[0]?.level).toBe(1);
    expect(liftFlags([100], [100 + FLAG_LABEL_PX + CAKE_HALF_PX + 1])[0]?.level).toBe(0);
  });
  it('stacks flags whose labels would overlap, keeping the given order in the result', () => {
    const near = 100 + FLAG_LABEL_PX / 2;
    expect(liftFlags([near, 100], []).map((f) => f.level)).toEqual([1, 0]);
    expect(liftFlags([100, 100 + FLAG_LABEL_PX + 20], []).map((f) => f.level)).toEqual([0, 0]);
  });
  it('golden cakes on round birthdays', () => {
    expect([20, 29, 30, 40, 50, 0].map(isRoundAge)).toEqual([
      false,
      false,
      true,
      true,
      true,
      false,
    ]);
  });
});
