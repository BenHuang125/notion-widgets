// The board: rows above the axis, the axis itself (years, today's snail), rows below it,
// and one column of cards per year. Everything slides sideways together.

import { cardsByYear, normalizeLayout, yearEndMonth } from '../core/board';
import {
  type Day,
  FIRST_YEAR,
  MONTHS_PER_YEAR,
  monthsFromStart,
  toYearMonth,
  yearCount,
} from '../core/dates';
import type { LayerId, Plan, Segment, Track } from '../core/types';
import { type CardEvents, cardView } from './cards';
import { h, icon, s } from './dom';
import { lane, type Scale } from './lanes';
import { dragRow } from './reorder';

/** How many years fill the screen width. */
export const YEARS_IN_VIEW = 6;
/** Narrow screens show fewer years rather than squeezing cards below this width. */
const MIN_YEAR_PX = 168;

export interface TimelineEvents extends CardEvents {
  readonly onAddCard: (month: string) => void;
  readonly onAxis: (month: string, x: number, y: number) => void;
  readonly onSegment: (segment: Segment) => void;
  readonly onTrack: (track: Track) => void;
  readonly onMoveLayer: (id: LayerId, slot: number) => void;
}

export function scaleFor(viewWidth: number): Scale {
  const yearWidth = Math.max(MIN_YEAR_PX, viewWidth / YEARS_IN_VIEW);
  return { yearWidth, x: (months) => (months / MONTHS_PER_YEAR) * yearWidth };
}

/** Today's marker: a small snail facing forward, crawling (gently) along the axis. */
function snail(): SVGElement {
  return s(
    'svg',
    { viewBox: '0 0 44 26', class: 'snail', 'aria-hidden': 'true' },
    s(
      'g',
      { class: 'snail-body' },
      s('path', {
        d:
          'M2 24.5c0-2 2-3 5-3h24c3 0 5-2.2 6.2-5.6l1-2.6c.6-1.6 3-1.4 3.2.3' +
          'c.4 3.2-.6 6.6-2.8 8.8c-1.9 1.9-4.6 2.6-7.6 2.6H4c-1.2 0-2-.2-2-.5z',
      }),
      s('path', { d: 'M37.8 13.6l-1.4-6.2M40 13.8l1-6.3', class: 'snail-horn' }),
      s('circle', { cx: 36.3, cy: 6.8, r: 1.3 }),
      s('circle', { cx: 41.2, cy: 7, r: 1.3 }),
    ),
    s(
      'g',
      { class: 'snail-shell' },
      s('circle', { cx: 19, cy: 13.5, r: 9.5 }),
      s('path', {
        d: 'M19 13.5a2.4 2.4 0 1 1 2.4 2.4a4.8 4.8 0 0 1-4.8-4.8a7.2 7.2 0 0 1 7.2-7.2',
        class: 'snail-spiral',
      }),
    ),
  );
}

function axis(scale: Scale, today: Day, events: TimelineEvents): HTMLElement {
  const nowX = scale.x(monthsFromStart(today));
  const years = h('div', { class: 'axis-years' });
  for (let i = 0; i < yearCount(); i += 1) {
    const year = FIRST_YEAR + i;
    years.append(
      h(
        'span',
        {
          class: `axis-year${year === today.year ? ' is-now' : ''}`,
          style: `left:${i * scale.yearWidth}px;width:${scale.yearWidth}px`,
        },
        String(year),
      ),
    );
  }
  const line = h(
    'button',
    { type: 'button', class: 'axis-line', 'aria-label': '在時間軸上新增時間段或軌道' },
    h('span', { class: 'axis-past', style: `width:${nowX}px` }),
  );
  line.addEventListener('click', (e) => {
    const box = line.getBoundingClientRect();
    const months = Math.max(
      0,
      Math.floor(((e.clientX - box.left) / scale.yearWidth) * MONTHS_PER_YEAR),
    );
    const year = FIRST_YEAR + Math.floor(months / MONTHS_PER_YEAR);
    events.onAxis(toYearMonth(year, (months % MONTHS_PER_YEAR) + 1), e.clientX, e.clientY);
  });
  const now = h('span', { class: 'now', style: `left:${nowX}px`, title: '今天' }, snail());
  return h('div', { class: 'axis', 'data-layer': 'axis' }, line, now, years);
}

function columns(plan: Plan, scale: Scale, events: TimelineEvents): HTMLElement {
  const byYear = cardsByYear(plan.cards);
  const goals = new Map(plan.goals.map((g) => [g.id, g]));
  const wrap = h('div', { class: 'columns' });
  for (let i = 0; i < yearCount(); i += 1) {
    const year = FIRST_YEAR + i;
    const col = h('div', { class: 'col', style: `width:${scale.yearWidth}px` });
    for (const c of byYear.get(year) ?? []) {
      col.append(cardView(c, c.goalId ? goals.get(c.goalId) : undefined, events));
    }
    const add = h(
      'button',
      { type: 'button', class: 'add-card hover-only' },
      icon('plus'),
      `新增 ${year} 年卡片`,
    );
    add.addEventListener('click', () => events.onAddCard(yearEndMonth(year)));
    col.append(add);
    wrap.append(col);
  }
  return wrap;
}

export function timeline(
  plan: Plan,
  scale: Scale,
  today: Day,
  events: TimelineEvents,
): HTMLElement {
  const inner = h('div', {
    class: 'board-inner',
    style: `width:${yearCount() * scale.yearWidth}px`,
  });
  const order = normalizeLayout(plan);
  const rows: HTMLElement[] = [];
  const laneEvents = {
    onSegment: events.onSegment,
    onTrack: events.onTrack,
    onGrip: (id: LayerId, row: HTMLElement, e: PointerEvent) =>
      dragRow(e, id, row, rows, events.onMoveLayer),
  };
  const addLanes = (ids: readonly LayerId[]): void => {
    for (const id of ids) {
      const row = lane(id, plan, scale, laneEvents);
      if (row) rows.push(row);
    }
  };
  addLanes(order.above);
  rows.push(axis(scale, today, events));
  addLanes(order.below);
  const lanes = h('div', { class: 'lanes', 'data-wheel': 'slide' }, ...rows);
  inner.append(lanes, columns(plan, scale, events));
  return h('div', { class: 'board', 'data-scroll': 'board', 'aria-label': '時間軸' }, inner);
}

/** The scroll position that puts `year` in the first column. */
export const leftFor = (year: number, scale: Scale): number =>
  (year - FIRST_YEAR) * scale.yearWidth;
