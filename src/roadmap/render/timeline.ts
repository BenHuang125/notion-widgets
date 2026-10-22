// The board: rows above the axis, the axis itself (years, today's snail), rows below it,
// and one column of cards per year. Everything slides sideways together.

import { yearEndMonth } from '../core/board';
import {
  type Day,
  FIRST_YEAR,
  MONTHS_PER_YEAR,
  monthsFromStart,
  toYearMonth,
  yearCount,
} from '../core/dates';
import type { Card, Goal, LayerId, Segment, Track } from '../core/types';
import { type CardEvents, cardView } from './cards';
import { h, icon, s } from './dom';
import type { Scale } from './lanes';
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

export function axisRow(scale: Scale, today: Day, events: TimelineEvents): HTMLElement {
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

/** One year's column of cards, with its (hover) add button at the bottom. */
export function yearColumn(
  year: number,
  cards: readonly Card[],
  goals: ReadonlyMap<string, Goal>,
  scale: Scale,
  events: TimelineEvents,
): HTMLElement {
  const col = h('div', { class: 'col', style: `width:${scale.yearWidth}px` });
  for (const c of cards) {
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
  return col;
}

export interface BoardShell {
  readonly board: HTMLElement;
  readonly inner: HTMLElement;
  readonly lanes: HTMLElement;
  readonly columns: HTMLElement;
}

/** The sliding sheet itself: built once; its rows and columns are swapped in as they change. */
export function boardShell(): BoardShell {
  const lanes = h('div', { class: 'lanes' });
  const columns = h('div', { class: 'columns' });
  const inner = h('div', { class: 'board-inner' }, lanes, columns);
  const board = h('div', { class: 'board', 'data-scroll': 'board', 'aria-label': '時間軸' }, inner);
  return { board, inner, lanes, columns };
}

/** The handlers a lane needs; dragging a row looks up the current rows when the drag starts. */
export function laneEvents(lanes: HTMLElement, events: TimelineEvents) {
  return {
    onSegment: events.onSegment,
    onTrack: events.onTrack,
    onGrip: (id: LayerId, row: HTMLElement, e: PointerEvent) =>
      dragRow(e, id, row, [...lanes.children] as HTMLElement[], events.onMoveLayer),
  };
}

/** The scroll position that puts `year` in the first column. */
export const leftFor = (year: number, scale: Scale): number =>
  (year - FIRST_YEAR) * scale.yearWidth;
