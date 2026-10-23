// Where the flags stand on the axis. Cakes sit on the line at fixed spots; a flag whose label
// would run into a cake, or into another flag's label, is lifted to a higher level instead.

/** A flag's footprint: its pole plus its label to the right (pixels). */
export const FLAG_LABEL_PX = 150;
/** Half a cake's width plus a little air (pixels). */
export const CAKE_HALF_PX = 18;
/** Space left of the pole that a flag keeps clear (pixels). */
const FLAG_LEFT_PX = 8;

export interface FlagSpot {
  readonly x: number;
  /** 0 = normal height; each level lifts the flag (and its label) one step higher. */
  readonly level: number;
}

const overlaps = (a0: number, a1: number, b0: number, b1: number): boolean => a0 < b1 && b0 < a1;

/**
 * Levels for flags at `flagXs` (in that order), given cakes at `cakeXs`.
 * Level 0 is taken only when the label clears every cake; each level holds non-overlapping labels.
 */
export function liftFlags(flagXs: readonly number[], cakeXs: readonly number[]): FlagSpot[] {
  const order = flagXs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  /** Right edge of the last label on each level. */
  const levelEnds: number[] = [];
  const out: FlagSpot[] = new Array(flagXs.length);
  for (const { x, i } of order) {
    const from = x - FLAG_LEFT_PX;
    const to = x + FLAG_LABEL_PX;
    const hitsCake = cakeXs.some((c) => overlaps(from, to, c - CAKE_HALF_PX, c + CAKE_HALF_PX));
    let level = hitsCake ? 1 : 0;
    while ((levelEnds[level] ?? Number.NEGATIVE_INFINITY) > from) level += 1;
    levelEnds[level] = to;
    out[i] = { x, level };
  }
  return out;
}

/** The birthdays Ben marked as special (30, 40, 50) get a golden cake. */
const FIRST_ROUND_AGE = 30;
export const isRoundAge = (age: number): boolean => age >= FIRST_ROUND_AGE && age % 10 === 0;
