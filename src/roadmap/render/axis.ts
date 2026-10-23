// The axis: one band holding the year line, a birthday cake on every 20 April, a flag at every
// goal's target date, and the snail marking today. All movement is CSS animation (screen-frame
// callbacks are held back inside Notion); this file only places things.

import {
  birthdays,
  type Day,
  dayLabel,
  FIRST_YEAR,
  MONTHS_PER_YEAR,
  monthsFromStart,
  parseIsoDate,
  toIsoDate,
  toYearMonth,
  yearCount,
} from '../core/dates';
import { goalStatus } from '../core/goals';
import { isRoundAge, liftFlags } from '../core/marks';
import type { Goal, Plan } from '../core/types';
import { h, paletteColor, s } from './dom';
import type { Scale } from './lanes';

export interface AxisEvents {
  readonly onAxis: (month: string, x: number, y: number) => void;
  readonly onGoal: (goal: Goal) => void;
}

/** Height of the band with no lifted flags; each lifted level adds one step. */
const BAND_PX = 96;
const LEVEL_PX = 24;
/** Each cake's smoke starts at a different moment, so they never puff together. */
const SMOKE_STAGGER_S = 0.9;
const SMOKE_PATTERN = 5;

function cake(age: number, index: number): HTMLElement {
  const svg = s(
    'svg',
    { viewBox: '0 0 28 30', class: 'cake', 'aria-hidden': 'true' },
    s('ellipse', { cx: 14, cy: 4.6, rx: 1.9, ry: 3.1, class: 'cake-flame' }),
    s('rect', { x: 13.1, y: 7.4, width: 1.8, height: 6, rx: 0.6, class: 'cake-candle' }),
    s('path', { d: 'M5 13.2h18a2 2 0 0 1 2 2v3.2H3v-3.2a2 2 0 0 1 2-2z', class: 'cake-top' }),
    s('path', {
      d: 'M3 18.4c2 1.6 3.6 1.6 5.5 0s3.6-1.6 5.5 0 3.6 1.6 5.5 0 3.6-1.6 5.5 0',
      class: 'cake-drip',
    }),
    s('rect', { x: 2, y: 18.4, width: 24, height: 9.6, rx: 2.2, class: 'cake-base' }),
  );
  const delay = `${((index % SMOKE_PATTERN) * SMOKE_STAGGER_S).toFixed(1)}s`;
  return h(
    'span',
    {
      class: `cake-mark${isRoundAge(age) ? ' is-round' : ''}`,
      title: `${age} yrs`,
      style: `--delay:${delay}`,
    },
    h('span', { class: 'smoke', 'aria-hidden': 'true' }, `${age} yrs`),
    svg,
  );
}

function flagSvg(): SVGElement {
  return s(
    'svg',
    { viewBox: '0 0 30 20', class: 'flag-cloth', 'aria-hidden': 'true' },
    s('path', { d: 'M0 1.5c6-2.2 11 2.4 17 0.6s9-1.6 12 0.4v13c-3-2-6-2.2-12-0.4S6 13 0 15.2z' }),
  );
}

function flagMark(goal: Goal, plan: Plan, x: number, level: number, celebrate: boolean) {
  const st = goalStatus(goal, plan.cards);
  const reached = st.kind === 'reached';
  const status = reached ? `完成 ${dayLabel(st.on)}` : '尚未完成';
  const tip = `${goal.title} · ${st.done}/${st.total} · 目標 ${dayLabel(goal.target)}`;
  const mark = h(
    'button',
    {
      type: 'button',
      class: `flag-mark${reached ? ' is-reached' : ''}${celebrate ? ' just-reached' : ''}`,
      style: `left:${x}px;--level:${level};--c:${paletteColor(goal.color)}`,
      title: tip,
      'aria-label': `${goal.title}，${status}，點一下編輯目標`,
    },
    h('span', { class: 'flag-pole' }),
    flagSvg(),
    h('span', { class: 'flag-text' }, h('b', {}, goal.title), h('span', {}, status)),
  );
  return mark;
}

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

function years(scale: Scale, today: Day): HTMLElement {
  const wrap = h('div', { class: 'axis-years' });
  for (let i = 0; i < yearCount(); i += 1) {
    const year = FIRST_YEAR + i;
    wrap.append(
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
  return wrap;
}

function line(scale: Scale, nowX: number, events: AxisEvents): HTMLElement {
  const el = h(
    'button',
    {
      type: 'button',
      class: 'axis-line',
      'aria-label': '在時間軸上新增時間段或軌道',
      style: `--month:${scale.yearWidth / MONTHS_PER_YEAR}px`,
    },
    h('span', { class: 'axis-past', style: `width:${nowX}px` }),
  );
  el.addEventListener('click', (e) => {
    const box = el.getBoundingClientRect();
    const months = Math.max(
      0,
      Math.floor(((e.clientX - box.left) / scale.yearWidth) * MONTHS_PER_YEAR),
    );
    const year = FIRST_YEAR + Math.floor(months / MONTHS_PER_YEAR);
    events.onAxis(toYearMonth(year, (months % MONTHS_PER_YEAR) + 1), e.clientX, e.clientY);
  });
  return el;
}

export interface AxisInput {
  readonly plan: Plan;
  readonly scale: Scale;
  readonly today: Day;
  /** Goals that became reached since the last drawing: their flag rises once. */
  readonly celebrate: ReadonlySet<string>;
}

export function axisRow(input: AxisInput, events: AxisEvents): HTMLElement {
  const { plan, scale, today } = input;
  const nowX = scale.x(monthsFromStart(today));
  const cakes = birthdays();
  const cakeXs = cakes.map((b) => scale.x(b.at));
  const goals = plan.goals;
  const spots = liftFlags(
    goals.map((g) => scale.x(monthsFromStart(parseIsoDate(g.target)))),
    cakeXs,
  );
  const top = Math.max(0, ...spots.map((p) => p.level));
  const band = h('div', {
    class: 'axis',
    'data-layer': 'axis',
    style: `height:${BAND_PX + top * LEVEL_PX}px`,
  });
  const thisYear = (today.year - FIRST_YEAR) * scale.yearWidth;
  band.append(
    h('span', { class: 'axis-now-band', style: `left:${thisYear}px;width:${scale.yearWidth}px` }),
    line(scale, nowX, events),
    years(scale, today),
  );
  cakes.forEach((b, i) => {
    const c = cake(b.age, i);
    c.style.left = `${cakeXs[i]}px`;
    band.append(c);
  });
  goals.forEach((g, i) => {
    const spot = spots[i];
    if (!spot) return;
    const f = flagMark(g, plan, spot.x, spot.level, input.celebrate.has(g.id));
    f.addEventListener('click', () => events.onGoal(g));
    band.append(f);
  });
  band.append(
    h(
      'span',
      { class: 'now', style: `left:${nowX}px`, title: `Today · ${dayLabel(toIsoDate(today))}` },
      snail(),
    ),
  );
  return band;
}
