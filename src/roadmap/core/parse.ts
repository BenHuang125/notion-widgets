// Turns stored rows (untrusted) into typed data. A bad row is left out with its reason,
// never patched with a default: the page shows which rows were skipped and why.

import { parseIsoDate, parseYearMonth } from './dates';
import { GOAL_PALETTE } from './goals';
import type { Card, Goal, LayerId, Layout, PaletteKey, Segment, Track } from './types';

export type Row = Readonly<Record<string, unknown>>;
export type Parsed<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly why: string };

const fail = (why: string): { ok: false; why: string } => ({ ok: false, why });

function text(row: Row, key: string, max: number): string {
  const v = row[key];
  if (typeof v !== 'string') throw new Error(`${key} 不是文字`);
  if (v.length > max) throw new Error(`${key} 太長`);
  return v;
}

function color(row: Row, key: string): PaletteKey {
  const v = row[key];
  const hit = GOAL_PALETTE.find((k) => k === v);
  if (!hit) throw new Error(`${key} 不是可用的顏色`);
  return hit;
}

function month(row: Row, key: string): string {
  const v = text(row, key, MAX_SHORT);
  parseYearMonth(v);
  return v;
}

function day(row: Row, key: string): string {
  const v = text(row, key, MAX_SHORT);
  parseIsoDate(v);
  return v;
}

const MAX_SHORT = 40;
const MAX_TITLE = 120;
const MAX_NOTE = 2000;

function guard<T>(make: () => T): Parsed<T> {
  try {
    return { ok: true, value: make() };
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export const parseGoal = (id: string, row: Row): Parsed<Goal> =>
  guard(() => ({
    id,
    title: text(row, 'title', MAX_TITLE),
    target: day(row, 'target'),
    color: color(row, 'color'),
  }));

export const parseCard = (id: string, row: Row): Parsed<Card> =>
  guard(() => {
    const goalId = row.goalId === null ? null : text(row, 'goalId', MAX_SHORT * 2);
    const doneOn = row.doneOn === null ? null : day(row, 'doneOn');
    const rank = row.rank;
    if (typeof rank !== 'number' || !Number.isFinite(rank)) throw new Error('rank 不是數字');
    return {
      id,
      title: text(row, 'title', MAX_TITLE),
      note: text(row, 'note', MAX_NOTE),
      goalId,
      month: month(row, 'month'),
      state: doneOn === null ? { kind: 'open' } : { kind: 'done', doneOn },
      rank,
    };
  });

export const parseTrack = (id: string, row: Row): Parsed<Track> =>
  guard(() => ({ id, name: text(row, 'name', MAX_TITLE) }));

export const parseSegment = (id: string, row: Row): Parsed<Segment> =>
  guard(() => {
    const start = month(row, 'start');
    const end = month(row, 'end');
    if (end < start) throw new Error('結束早於開始');
    return {
      id,
      trackId: text(row, 'trackId', MAX_SHORT * 2),
      name: text(row, 'name', MAX_TITLE),
      start,
      end,
      color: color(row, 'color'),
    };
  });

const LAYER = /^(cakes|flags|track:.+)$/;
const layers = (v: unknown): LayerId[] =>
  Array.isArray(v) ? v.filter((x): x is LayerId => typeof x === 'string' && LAYER.test(x)) : [];

/** A missing or broken layout doc is not an error: the default order is used. */
export const parseLayout = (row: Row | undefined): Layout => ({
  above: layers(row?.above),
  below: layers(row?.below),
});

/** What gets stored for each kind (the inverse of the parsers above). */
export const goalRow = (g: Goal): Row => ({ title: g.title, target: g.target, color: g.color });
export const cardRow = (c: Card): Row => ({
  title: c.title,
  note: c.note,
  goalId: c.goalId,
  month: c.month,
  doneOn: c.state.kind === 'done' ? c.state.doneOn : null,
  rank: c.rank,
});
export const trackRow = (t: Track): Row => ({ name: t.name });
export const segmentRow = (s: Segment): Row => ({
  trackId: s.trackId,
  name: s.name,
  start: s.start,
  end: s.end,
  color: s.color,
});
export const layoutRow = (l: Layout): Row => ({ above: [...l.above], below: [...l.below] });
