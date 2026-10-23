import { describe, expect, it } from 'vitest';
import {
  cardsByYear,
  DEFAULT_LAYOUT,
  moveLayer,
  nextRank,
  normalizeLayout,
  placeSegments,
  yearEndMonth,
} from '../../src/roadmap/core/board';
import {
  ageInYear,
  birthdays,
  dayLabel,
  daysInMonth,
  FIRST_YEAR,
  LAST_YEAR,
  monthLabel,
  monthStart,
  monthsFromStart,
  parseIsoDate,
  parseYearMonth,
  rangeLabel,
  toIsoDate,
} from '../../src/roadmap/core/dates';
import { goalStatus, nextGoalColor, sortGoals } from '../../src/roadmap/core/goals';
import {
  cardRow,
  parseCard,
  parseGoal,
  parseLayout,
  parseSegment,
} from '../../src/roadmap/core/parse';
import type { Card, Goal, Segment } from '../../src/roadmap/core/types';

const goal = (id: string, target: string, color: Goal['color'] = 'clay', title = id): Goal => ({
  id,
  title,
  target,
  color,
});
const card = (id: string, month: string, extra: Partial<Card> = {}): Card => ({
  id,
  title: id,
  note: '',
  goalId: null,
  month,
  state: { kind: 'open' },
  rank: 0,
  ...extra,
});
const done = (doneOn: string): Card['state'] => ({ kind: 'done', doneOn });

describe('dates', () => {
  it('runs from 2017 to the year Ben turns 50', () => {
    expect(FIRST_YEAR).toBe(2017);
    expect(LAST_YEAR).toBe(2049);
    expect(ageInYear(2026)).toBe(27);
  });
  it('knows month lengths and leap years', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
  });
  it('places dates in months since January 2017', () => {
    expect(monthStart('2017-01')).toBe(0);
    expect(monthStart('2026-12')).toBe(9 * 12 + 11);
    expect(monthsFromStart({ year: 2017, month: 9, day: 1 })).toBe(8);
    expect(monthsFromStart({ year: 2017, month: 9, day: 16 })).toBe(8.5);
  });
  it('puts one cake per year on 20 April', () => {
    const b = birthdays();
    expect(b).toHaveLength(LAST_YEAR - FIRST_YEAR + 1);
    expect(b[0]).toEqual({ year: 2017, age: 18, at: 3 + 19 / 30 });
    expect(b.at(-1)?.age).toBe(50);
  });
  it('refuses malformed values instead of guessing', () => {
    expect(() => parseYearMonth('2026-13')).toThrow();
    expect(() => parseYearMonth('2026-1')).toThrow();
    expect(() => parseIsoDate('2027-02-29')).toThrow();
    expect(parseIsoDate('2028-02-29')).toEqual({ year: 2028, month: 2, day: 29 });
    expect(toIsoDate({ year: 2026, month: 9, day: 3 })).toBe('2026-09-03');
    expect(dayLabel('2026-09-03')).toBe('3 Sep 2026');
    expect(dayLabel('2027-01-31')).toBe('31 Jan 2027');
    expect(monthLabel('2026-12')).toBe('Dec 2026');
    expect(rangeLabel('2017-09', '2021-06')).toBe('Sep 2017 – Jun 2021');
  });
});

describe('goals', () => {
  it('counts only its own cards and is reached when all are ticked', () => {
    const g = goal('g', '2029-12-31');
    const cards = [
      card('a', '2027-12', { goalId: 'g', state: done('2027-03-01') }),
      card('b', '2028-12', { goalId: 'g', state: done('2028-05-02') }),
      card('c', '2028-12', { goalId: 'other' }),
    ];
    expect(goalStatus(g, cards)).toEqual({ kind: 'reached', done: 2, total: 2, on: '2028-05-02' });
    const reopened = [...cards, card('d', '2029-12', { goalId: 'g' })];
    expect(goalStatus(g, reopened)).toEqual({ kind: 'open', done: 2, total: 3 });
  });
  it('is never reached without cards', () => {
    expect(goalStatus(goal('g', '2029-12-31'), [])).toEqual({ kind: 'open', done: 0, total: 0 });
  });
  it('sorts soonest first, ties by title', () => {
    const sorted = sortGoals([
      goal('x', '2030-01-01'),
      goal('b', '2027-06-30', 'clay', 'B'),
      goal('a', '2027-06-30', 'clay', 'A'),
    ]);
    expect(sorted.map((g) => g.id)).toEqual(['a', 'b', 'x']);
  });
  it('gives a new goal the first unused color', () => {
    expect(nextGoalColor([])).toBe('clay');
    expect(nextGoalColor([goal('a', '2027-01-01', 'clay'), goal('b', '2027-01-01', 'slate')])).toBe(
      'olive',
    );
    expect(nextGoalColor([goal('a', '2027-01-01', 'slate')])).toBe('clay');
  });
});

describe('board', () => {
  it('groups cards by year, in month then rank order', () => {
    const by = cardsByYear([
      card('late', '2027-12'),
      card('second', '2027-03', { rank: 1 }),
      card('first', '2027-03', { rank: 0 }),
      card('next', '2028-01'),
    ]);
    expect(by.get(2027)?.map((c) => c.id)).toEqual(['first', 'second', 'late']);
    expect(by.get(2028)?.map((c) => c.id)).toEqual(['next']);
  });
  it('adds new cards last in their month, defaulting to December', () => {
    expect(
      nextRank([card('a', '2027-12', { rank: 4 }), card('b', '2027-11', { rank: 9 })], '2027-12'),
    ).toBe(5);
    expect(nextRank([], '2027-12')).toBe(0);
    expect(yearEndMonth(2030)).toBe('2030-12');
  });
  it('keeps every track exactly once, new tracks below the axis', () => {
    const tracks = [{ id: 't1', name: '學歷', color: 'olive' as const }];
    expect(normalizeLayout({ layout: DEFAULT_LAYOUT, tracks })).toEqual({
      above: [],
      below: ['track:t1'],
    });
    const messy = {
      above: ['track:t1' as const, 'track:t1' as const, 'track:gone' as const],
      below: [],
    };
    expect(normalizeLayout({ layout: messy, tracks })).toEqual({ above: ['track:t1'], below: [] });
  });
  it('moves a track across the axis', () => {
    const layout = { above: ['track:a' as const], below: ['track:b' as const, 'track:c' as const] };
    expect(moveLayer(layout, 'track:c', 0)).toEqual({
      above: ['track:c', 'track:a'],
      below: ['track:b'],
    });
    expect(moveLayer(layout, 'track:a', 1)).toEqual({
      above: [],
      below: ['track:a', 'track:b', 'track:c'],
    });
    expect(moveLayer(layout, 'track:a', 0)).toEqual(layout);
    // The slot just above the axis stays above it.
    expect(moveLayer(layout, 'track:b', 1)).toEqual({
      above: ['track:a', 'track:b'],
      below: ['track:c'],
    });
    expect(moveLayer(layout, 'track:b', 99)).toEqual({
      above: ['track:a'],
      below: ['track:c', 'track:b'],
    });
  });
  it('stacks overlapping ranges into sub-rows', () => {
    const seg = (id: string, start: string, end: string): Segment => ({
      id,
      trackId: 't',
      name: id,
      start,
      end,
    });
    const { placed, rows } = placeSegments([
      seg('uni', '2017-09', '2021-06'),
      seg('job', '2021-06', '2023-01'),
      seg('after', '2021-07', '2022-01'),
    ]);
    expect(rows).toBe(2);
    expect(placed.map((p) => [p.segment.id, p.row])).toEqual([
      ['uni', 0],
      ['job', 1],
      ['after', 0],
    ]);
    expect(placed[0]?.to).toBe(monthStart('2021-06') + 1);
  });
});

describe('stored rows', () => {
  it('round-trips a card', () => {
    const c = card('c', '2027-12', { goalId: 'g', state: done('2027-06-01'), note: '說明' });
    expect(parseCard('c', cardRow(c))).toEqual({ ok: true, value: c });
  });
  it('names the problem with a bad row', () => {
    expect(parseCard('x', { title: 3 })).toEqual({ ok: false, why: 'goalId 不是文字' });
    expect(parseGoal('g', { title: 'A', target: '2027-02-30', color: 'clay' }).ok).toBe(false);
    expect(parseGoal('g', { title: 'A', target: '2027-02-28', color: 'red' }).ok).toBe(false);
    const backwards = { trackId: 't', name: 'n', start: '2020-01', end: '2019-01' };
    expect(parseSegment('s', backwards)).toEqual({ ok: false, why: '結束早於開始' });
  });
  it('reads a layout loosely', () => {
    expect(parseLayout(undefined)).toEqual({ above: [], below: [] });
    // Old layouts listed cakes and flags rows; those now live on the axis and are dropped.
    expect(parseLayout({ above: ['cakes', 'flags', 'track:a', 7, 'nope'], below: 'x' })).toEqual({
      above: ['track:a'],
      below: [],
    });
  });
});
