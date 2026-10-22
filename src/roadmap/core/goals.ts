// Goal progress, completion and ordering, worked out from the cards.

import { compareDays } from './dates';
import type { Card, Goal, IsoDate, PaletteKey } from './types';

/** Tried in this order: neighbours in the list are far apart in hue. */
export const GOAL_PALETTE: readonly PaletteKey[] = [
  'clay',
  'slate',
  'olive',
  'rose',
  'teal',
  'ochre',
  'plum',
  'moss',
  'dusk',
  'sand',
];

/** The first palette color no goal uses yet; when all are taken, the least used one. */
export function nextGoalColor(goals: readonly Goal[]): PaletteKey {
  const uses = new Map<PaletteKey, number>(GOAL_PALETTE.map((k) => [k, 0]));
  for (const g of goals) uses.set(g.color, (uses.get(g.color) ?? 0) + 1);
  let best: PaletteKey = GOAL_PALETTE[0] ?? 'clay';
  let fewest = Number.POSITIVE_INFINITY;
  for (const key of GOAL_PALETTE) {
    const n = uses.get(key) ?? 0;
    if (n < fewest) {
      best = key;
      fewest = n;
    }
  }
  return best;
}

export type GoalStatus =
  | { readonly kind: 'open'; readonly done: number; readonly total: number }
  /** Every card done: the flag shows on the target date with the last tick's date. */
  | {
      readonly kind: 'reached';
      readonly done: number;
      readonly total: number;
      readonly on: IsoDate;
    };

export function goalStatus(goal: Goal, cards: readonly Card[]): GoalStatus {
  const mine = cards.filter((c) => c.goalId === goal.id);
  let last: IsoDate | null = null;
  let done = 0;
  for (const c of mine) {
    if (c.state.kind !== 'done') continue;
    done += 1;
    if (last === null || compareDays(c.state.doneOn, last) > 0) last = c.state.doneOn;
  }
  const total = mine.length;
  if (total > 0 && done === total && last !== null)
    return { kind: 'reached', done, total, on: last };
  return { kind: 'open', done, total };
}

/** Soonest target first; same date keeps title order so the row never jumps around. */
export function sortGoals(goals: readonly Goal[]): Goal[] {
  return [...goals].sort(
    (a, b) => compareDays(a.target, b.target) || a.title.localeCompare(b.title, 'zh-Hant'),
  );
}
