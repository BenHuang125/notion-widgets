// The board: track rows above the axis, the axis (axis.ts), track rows below it, and one
// column of cards per year. Everything slides sideways together.

import { yearEndMonth } from '../core/board';
import { FIRST_YEAR, MONTHS_PER_YEAR } from '../core/dates';
import type { Card, Goal, LayerId, Segment, Track } from '../core/types';
import type { AxisEvents } from './axis';
import { type CardEvents, cardView } from './cards';
import { h, icon } from './dom';
import type { Scale } from './lanes';
import { dragRow } from './reorder';

/** How many years fill the screen width. */
export const YEARS_IN_VIEW = 6;
/** Narrow screens show fewer years rather than squeezing cards below this width. */
const MIN_YEAR_PX = 120;

export interface TimelineEvents extends CardEvents, AxisEvents {
  readonly onAddCard: (month: string) => void;
  readonly onSegment: (segment: Segment) => void;
  readonly onTrack: (track: Track) => void;
  readonly onMoveLayer: (id: LayerId, slot: number) => void;
}

export function scaleFor(viewWidth: number): Scale {
  const yearWidth = Math.max(MIN_YEAR_PX, viewWidth / YEARS_IN_VIEW);
  return { yearWidth, x: (months) => (months / MONTHS_PER_YEAR) * yearWidth };
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
