// The goal rings at the top: soonest target on the left, four in view, the rest by sliding.

import { slashDate as slash } from '../core/dates';
import { type GoalStatus, goalStatus, sortGoals } from '../core/goals';
import type { Card, Goal } from '../core/types';
import { h, icon, paletteColor, s } from './dom';
import { wheelSlides } from './pan';

const RING_SIZE = 60;
const RING_RADIUS = 25;
const RING_STROKE = 5;
const HALF = RING_SIZE / 2;
const START_ANGLE = -90;
const TWO_PI = 2 * Math.PI;

export interface GoalsRowEvents {
  readonly onAdd: () => void;
  readonly onOpen: (goal: Goal) => void;
}

function ring(goal: Goal, st: GoalStatus): SVGElement {
  const length = TWO_PI * RING_RADIUS;
  const share = st.total ? st.done / st.total : 0;
  const center = { cx: HALF, cy: HALF, r: RING_RADIUS, fill: 'none', 'stroke-width': RING_STROKE };
  const arc =
    share > 0
      ? s('circle', {
          ...center,
          class: 'arc',
          stroke: paletteColor(goal.color),
          'stroke-linecap': 'round',
          'stroke-dasharray': `${(length * share).toFixed(1)} ${length.toFixed(1)}`,
          transform: `rotate(${START_ANGLE} ${HALF} ${HALF})`,
        })
      : null;
  return s(
    'svg',
    { viewBox: `0 0 ${RING_SIZE} ${RING_SIZE}`, class: 'ring', 'aria-hidden': 'true' },
    s('circle', { ...center, class: 'ring-track' }),
    arc,
    s(
      'text',
      { x: HALF, y: HALF, class: 'ring-num', 'dominant-baseline': 'central' },
      `${st.done}/${st.total}`,
    ),
  );
}

function statusLine(goal: Goal, st: GoalStatus, today: string): HTMLElement {
  if (st.kind === 'reached') return h('span', { class: 'reached' }, `已達成 ${slash(st.on)}`);
  const late = goal.target < today;
  return h(
    'span',
    { class: late ? 'late' : '' },
    `目標 ${slash(goal.target)}${late ? '（已過）' : ''}`,
  );
}

function goalTile(goal: Goal, cards: readonly Card[], today: string, events: GoalsRowEvents) {
  const st = goalStatus(goal, cards);
  const tile = h(
    'button',
    {
      type: 'button',
      class: `goal${st.kind === 'reached' ? ' is-reached' : ''}`,
      style: `--c:${paletteColor(goal.color)}`,
      'aria-label': `${goal.title}，完成 ${st.done}/${st.total} 項，點一下編輯`,
    },
    ring(goal, st),
    h(
      'span',
      { class: 'goal-text' },
      h('span', { class: 'goal-title' }, goal.title),
      h(
        'span',
        { class: 'goal-sub' },
        `完成 ${st.done}/${st.total} 項`,
        h('br'),
        statusLine(goal, st, today),
      ),
    ),
  );
  tile.addEventListener('click', () => events.onOpen(goal));
  return tile;
}

export function goalsRow(
  goals: readonly Goal[],
  cards: readonly Card[],
  today: string,
  events: GoalsRowEvents,
) {
  const list = h('div', { class: 'goals-scroll', 'data-scroll': 'goals' });
  const sorted = sortGoals(goals);
  for (const g of sorted) list.append(goalTile(g, cards, today, events));
  if (!sorted.length) {
    list.append(h('p', { class: 'empty' }, '還沒有目標。滑到右邊按「＋」新增第一個。'));
  }
  const add = h(
    'button',
    { type: 'button', class: 'add-goal hover-only', 'aria-label': '新增目標' },
    icon('plus'),
  );
  add.addEventListener('click', events.onAdd);
  wheelSlides(list);
  return h('section', { class: 'goals', 'aria-label': '目標' }, list, add);
}
