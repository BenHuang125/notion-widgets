import { describe, expect, it } from 'vitest';
import {
  CAKE_REACH_PX,
  headroom,
  isRoundAge,
  LABEL_HEIGHT_PX,
  LABEL_OFFSET_PX,
  POLE_BASE_PX,
  placeFlags,
} from '../../src/roadmap/core/marks';

/** The rectangle a placed label takes (same geometry as the layout, without padding). */
const label = (x: number, w: number, pole: number, side: 'right' | 'left') => ({
  x0: side === 'right' ? x : x - LABEL_OFFSET_PX - w,
  x1: side === 'right' ? x + LABEL_OFFSET_PX + w : x,
  y0: pole - LABEL_HEIGHT_PX,
  y1: pole,
});
const meets = (a: ReturnType<typeof label>, b: ReturnType<typeof label>) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

describe('flags on the axis', () => {
  it('stays at the base height when nothing is in the way', () => {
    const spots = placeFlags([{ x: 100, labelWidth: 80 }], [1000]);
    expect(spots).toEqual([{ x: 100, pole: POLE_BASE_PX, side: 'right' }]);
  });
  it('keeps a label clear of a cake and the age rising from it', () => {
    for (const cake of [60, 180]) {
      const [spot] = placeFlags([{ x: 100, labelWidth: 120 }], [cake]);
      const box = label(100, 120, spot?.pole ?? 0, spot?.side ?? 'right');
      const overCake = cake + 16 > box.x0 && cake - 16 < box.x1;
      expect(overCake && box.y0 < CAKE_REACH_PX).toBe(false);
    }
    // Cakes on both sides: it has to rise above them.
    const [high] = placeFlags([{ x: 100, labelWidth: 120 }], [60, 180]);
    expect((high?.pole ?? 0) - LABEL_HEIGHT_PX).toBeGreaterThanOrEqual(CAKE_REACH_PX);
  });
  it('keeps labels apart, and above any pole that stands inside a label', () => {
    // Ben's case: three goals within a year, cakes in April.
    const flags = [
      { x: 820, labelWidth: 110 },
      { x: 1000, labelWidth: 120 },
      { x: 1060, labelWidth: 120 },
    ];
    const spots = placeFlags(flags, [700, 920, 1140]);
    const boxes = spots.map((s, i) => label(s.x, flags[i]?.labelWidth ?? 0, s.pole, s.side));
    for (let a = 0; a < boxes.length; a += 1) {
      for (let b = a + 1; b < boxes.length; b += 1) {
        expect(meets(boxes[a]!, boxes[b]!)).toBe(false);
      }
    }
    // No pole stands inside another flag's label below that label.
    spots.forEach((p) => {
      boxes.forEach((b, j) => {
        if (spots[j] === p) return;
        expect(p.x > b.x0 && p.x < b.x1 && p.pole > b.y0).toBe(false);
      });
    });
  });
  it('puts a label on the left when that keeps it low', () => {
    const [left, right] = placeFlags(
      [
        { x: 300, labelWidth: 100 },
        { x: 340, labelWidth: 100 },
      ],
      [],
    );
    expect(right).toEqual({ x: 340, pole: POLE_BASE_PX, side: 'right' });
    expect(left?.side).toBe('left');
    expect(left?.pole).toBe(POLE_BASE_PX);
  });
  it('never hangs a left label over a flag still to be placed', () => {
    const spots = placeFlags(
      [
        { x: 250, labelWidth: 100 },
        { x: 300, labelWidth: 100 },
        { x: 340, labelWidth: 100 },
      ],
      [],
    );
    expect(spots[1]?.side === 'left' && spots[1].pole <= (spots[0]?.pole ?? 0)).toBe(false);
  });
  it('gives the axis enough room for its tallest flag', () => {
    expect(headroom([])).toBe(CAKE_REACH_PX);
    expect(headroom([{ x: 0, pole: 140 }])).toBeGreaterThan(140);
  });
  it('golden cakes on 30, 40 and 50', () => {
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
