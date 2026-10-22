// One card on the board: tick box top-left, title, note, month; completed cards fade and show
// the day they were finished at the bottom right.

import { parseYearMonth, slashDate } from '../core/dates';
import type { Card, Goal } from '../core/types';
import { h, icon, paletteColor } from './dom';

export interface CardEvents {
  readonly onTick: (card: Card) => void;
  readonly onOpen: (card: Card) => void;
}

const NEUTRAL = 'var(--line-strong)';

export function cardView(card: Card, goal: Goal | undefined, events: CardEvents): HTMLElement {
  const done = card.state.kind === 'done';
  const { month } = parseYearMonth(card.month);
  const tick = h(
    'button',
    {
      type: 'button',
      class: 'tick',
      'aria-pressed': done ? 'true' : 'false',
      'aria-label': done
        ? `「${card.title}」已完成，按一下改回未完成`
        : `把「${card.title}」標記為完成`,
    },
    done ? icon('check') : null,
  );
  tick.addEventListener('click', () => events.onTick(card));
  const body = h(
    'button',
    { type: 'button', class: 'card-body', 'aria-label': `編輯「${card.title}」` },
    h('span', { class: 'card-title' }, card.title),
    card.note ? h('span', { class: 'card-note' }, card.note) : null,
    h(
      'span',
      { class: 'card-foot' },
      h('span', { class: 'card-month' }, `${month} 月${goal ? ` · ${goal.title}` : ''}`),
      card.state.kind === 'done'
        ? h('span', { class: 'card-done' }, `完成 ${slashDate(card.state.doneOn)}`)
        : null,
    ),
  );
  body.addEventListener('click', () => events.onOpen(card));
  return h(
    'article',
    {
      class: `card${done ? ' is-done' : ''}`,
      style: `--c:${goal ? paletteColor(goal.color) : NEUTRAL}`,
    },
    tick,
    body,
  );
}
