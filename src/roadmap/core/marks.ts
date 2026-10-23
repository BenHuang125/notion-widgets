// Where the flags stand on the axis, so that no label touches a cake, the age rising from it,
// another flag's pole or another label. Everything is measured in pixels above the line.
//
// Flags are placed right to left, each at the lowest height where its label fits. A label on
// the right of its pole can only cross poles further right (already placed, heights known). A
// label may also go on the left — the axis stays lower that way — but only where no flag still
// to be placed stands under it, so a later pole can never cut through it.

/** The tallest a cake reaches, smoke and age text included. */
export const CAKE_REACH_PX = 64;
/** Half a cake's width plus a little air. */
export const CAKE_HALF_PX = 16;
/** A label: two lines (title, status) — its height, and how far right of the pole it starts. */
export const LABEL_HEIGHT_PX = 36;
export const LABEL_OFFSET_PX = 32;
/** Pole heights tried, lowest first: the base, then one step at a time. */
export const POLE_BASE_PX = 44;
export const POLE_STEP_PX = 20;
/** Air kept around labels and poles. */
const PAD_PX = 6;
const POLE_HALF_PX = 3;
/** A safety stop; real plans never come close. */
const MAX_LEVEL = 40;

export interface FlagInput {
  readonly x: number;
  /** The label's text width (the wider of its two lines). */
  readonly labelWidth: number;
}

export type Side = 'right' | 'left';

export interface FlagSpot {
  readonly x: number;
  /** Pole height above the line. */
  readonly pole: number;
  /** Which side of the pole the cloth and label go. */
  readonly side: Side;
}

interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

const hit = (a: Box, b: Box): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

const labelBox = (f: FlagInput, pole: number, side: Side): Box => {
  const reach = LABEL_OFFSET_PX + f.labelWidth + PAD_PX;
  return {
    x0: side === 'right' ? f.x - PAD_PX : f.x - reach,
    x1: side === 'right' ? f.x + reach : f.x + PAD_PX,
    y0: pole - LABEL_HEIGHT_PX - PAD_PX / 2,
    y1: pole + PAD_PX,
  };
};

const poleBox = (x: number, pole: number): Box => ({
  x0: x - POLE_HALF_PX,
  x1: x + POLE_HALF_PX,
  y0: 0,
  y1: pole,
});

export const cakeBox = (x: number): Box => ({
  x0: x - CAKE_HALF_PX,
  x1: x + CAKE_HALF_PX,
  y0: 0,
  y1: CAKE_REACH_PX,
});

/** Pole heights for `flags` (same order), clear of `cakeXs` and of each other. */
export function placeFlags(flags: readonly FlagInput[], cakeXs: readonly number[]): FlagSpot[] {
  const blocked: Box[] = cakeXs.map(cakeBox);
  const out: FlagSpot[] = new Array(flags.length);
  const order = flags.map((f, i) => ({ f, i })).sort((a, b) => b.f.x - a.f.x || a.i - b.i);
  order.forEach(({ f, i }, k) => {
    /** Flags still to place (further left): a left-side label must not hang over them. */
    const waiting = order.slice(k + 1).map((o) => o.f.x);
    const spot = lowestSpot(f, blocked, waiting);
    blocked.push(labelBox(f, spot.pole, spot.side), poleBox(f.x, spot.pole));
    out[i] = spot;
  });
  return out;
}

function lowestSpot(f: FlagInput, blocked: readonly Box[], waiting: readonly number[]): FlagSpot {
  for (let level = 0; level < MAX_LEVEL; level += 1) {
    const pole = POLE_BASE_PX + level * POLE_STEP_PX;
    for (const side of ['right', 'left'] as const) {
      const box = labelBox(f, pole, side);
      const overWaiting = side === 'left' && waiting.some((x) => x > box.x0 && x < box.x1);
      if (!overWaiting && !blocked.some((b) => hit(box, b))) return { x: f.x, pole, side };
    }
  }
  return { x: f.x, pole: POLE_BASE_PX + MAX_LEVEL * POLE_STEP_PX, side: 'right' };
}

/** The space the axis needs above its line: the tallest flag (with its label) or a cake. */
export const headroom = (spots: readonly FlagSpot[]): number =>
  Math.max(CAKE_REACH_PX, ...spots.map((s) => s.pole + PAD_PX));

/** The birthdays Ben marked as special (30, 40, 50) get a golden cake. */
const FIRST_ROUND_AGE = 30;
export const isRoundAge = (age: number): boolean => age >= FIRST_ROUND_AGE && age % 10 === 0;
