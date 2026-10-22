// Which cards go in which year column, and in what order; and lane order around the axis.

import { MONTHS_PER_YEAR, monthStart, parseYearMonth } from './dates';
import type { Card, LayerId, Layout, Plan, Segment, Track } from './types';

/** Cards grouped by year, each year sorted by month then rank. */
export function cardsByYear(cards: readonly Card[]): Map<number, Card[]> {
  const out = new Map<number, Card[]>();
  for (const c of cards) {
    const { year } = parseYearMonth(c.month);
    const list = out.get(year) ?? [];
    list.push(c);
    out.set(year, list);
  }
  for (const list of out.values()) {
    list.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : a.rank - b.rank));
  }
  return out;
}

/** A new card goes last in its month. */
export function nextRank(cards: readonly Card[], month: string): number {
  let max = -1;
  for (const c of cards) if (c.month === month && c.rank > max) max = c.rank;
  return max + 1;
}

/** The default month for a card added under a year: December (Ben's year-end targets). */
export const yearEndMonth = (year: number): string => `${year}-${MONTHS_PER_YEAR}`;

export const DEFAULT_LAYOUT: Layout = { above: ['flags', 'cakes'], below: [] };

const trackLayer = (t: Track): LayerId => `track:${t.id}`;

/**
 * The stored layout, cleaned up: unknown layers dropped, missing ones added
 * (built-ins just above the axis, tracks below), each layer exactly once.
 */
export function normalizeLayout(plan: Pick<Plan, 'layout' | 'tracks'>): Layout {
  const known = new Set<LayerId>(['cakes', 'flags', ...plan.tracks.map(trackLayer)]);
  const seen = new Set<LayerId>();
  const keep = (list: readonly LayerId[]): LayerId[] =>
    list.filter((id) => {
      if (!known.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  const above = keep(plan.layout.above);
  const below = keep(plan.layout.below);
  for (const id of ['flags', 'cakes'] as const) if (!seen.has(id)) above.push(id);
  for (const t of plan.tracks) if (!seen.has(trackLayer(t))) below.push(trackLayer(t));
  return { above, below };
}

/**
 * Moves one layer to a slot in the single list "above…, AXIS, below…".
 * `slot` counts positions in that list without the moved layer; the axis takes one.
 */
export function moveLayer(layout: Layout, id: LayerId, slot: number): Layout {
  const above = layout.above.filter((x) => x !== id);
  const below = layout.below.filter((x) => x !== id);
  if (slot <= above.length) {
    above.splice(Math.max(0, slot), 0, id);
  } else {
    below.splice(Math.min(below.length, slot - above.length - 1), 0, id);
  }
  return { above, below };
}

/** A segment placed in its track: `row` is the sub-row so ranges in one track never overlap. */
export interface PlacedSegment {
  readonly segment: Segment;
  readonly from: number;
  /** Exclusive end, in months since the start. */
  readonly to: number;
  readonly row: number;
}

/** Lays out one track's segments, earliest first, each in the first sub-row where it fits. */
export function placeSegments(segments: readonly Segment[]): {
  placed: PlacedSegment[];
  rows: number;
} {
  const ends: number[] = [];
  const sorted = [...segments].sort((a, b) => monthStart(a.start) - monthStart(b.start));
  const placed = sorted.map((segment) => {
    const from = monthStart(segment.start);
    const to = Math.max(from, monthStart(segment.end)) + 1;
    let row = ends.findIndex((end) => end <= from);
    if (row < 0) row = ends.length;
    ends[row] = to;
    return { segment, from, to, row };
  });
  return { placed, rows: Math.max(1, ends.length) };
}
