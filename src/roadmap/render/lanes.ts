// The rows around the axis: birthday cakes, goal flags, and the time-range tracks.
// Every row can be dragged (by its handle) above or below the axis.

import { placeSegments } from '../core/board';
import { birthdays, dayLabel, monthsFromStart, parseIsoDate, rangeLabel } from '../core/dates';
import { goalStatus } from '../core/goals';
import type { LayerId, Plan, Segment, Track } from '../core/types';
import { h, icon, paletteColor, s } from './dom';

/** Months to pixels on the board. */
export interface Scale {
  readonly yearWidth: number;
  x(months: number): number;
}

export interface LaneEvents {
  readonly onSegment: (segment: Segment) => void;
  readonly onTrack: (track: Track) => void;
  readonly onGrip: (id: LayerId, lane: HTMLElement, e: PointerEvent) => void;
}

const SEGMENT_ROW_PX = 26;
/** The track's name sits on its own line above the bars, so it never covers a short bar. */
const TRACK_LABEL_PX = 18;

function cake(age: number): SVGElement {
  return s(
    'svg',
    { viewBox: '0 0 24 24', class: 'cake', 'aria-hidden': 'true' },
    s('path', { d: 'M12 3.2c1 1.1 1 2.1 0 2.8c-1-.7-1-1.7 0-2.8z', class: 'cake-flame' }),
    s('rect', { x: 11.3, y: 6.4, width: 1.4, height: 3.6, rx: 0.5, class: 'cake-candle' }),
    s('rect', { x: 4.5, y: 10, width: 15, height: 4.6, rx: 1.6, class: 'cake-top' }),
    s('rect', { x: 3.5, y: 14, width: 17, height: 6.2, rx: 1.6, class: 'cake-base' }),
    s('title', {}, `${age} 歲生日`),
  );
}

function cakesLane(scale: Scale): HTMLElement {
  const lane = h('div', { class: 'lane-body' });
  for (const b of birthdays()) {
    lane.append(
      h(
        'span',
        { class: 'mark cake-mark', style: `left:${scale.x(b.at)}px` },
        cake(b.age),
        h('span', { class: 'mark-label' }, `${b.age} 歲`),
      ),
    );
  }
  return lane;
}

function flag(color: string): SVGElement {
  return s(
    'svg',
    { viewBox: '0 0 24 24', class: 'flag', 'aria-hidden': 'true' },
    s('path', { d: 'M6 21V3.5', class: 'flag-pole' }),
    s('path', { d: 'M6.6 4h11.2l-2.6 4 2.6 4H6.6z', style: `fill:${color}`, class: 'flag-cloth' }),
  );
}

function flagsLane(plan: Plan, scale: Scale): HTMLElement {
  const lane = h('div', { class: 'lane-body' });
  for (const goal of plan.goals) {
    const st = goalStatus(goal, plan.cards);
    if (st.kind !== 'reached') continue;
    const at = scale.x(monthsFromStart(parseIsoDate(goal.target)));
    lane.append(
      h(
        'span',
        { class: 'mark flag-mark', style: `left:${at}px` },
        flag(paletteColor(goal.color)),
        h(
          'span',
          { class: 'flag-text' },
          h('b', {}, goal.title),
          h('span', {}, `完成 ${dayLabel(st.on)}`),
        ),
      ),
    );
  }
  return lane;
}

function trackLane(track: Track, plan: Plan, scale: Scale, events: LaneEvents): HTMLElement {
  const mine = plan.segments.filter((x) => x.trackId === track.id);
  const { placed, rows } = placeSegments(mine);
  const lane = h('div', {
    class: 'lane-body track-body',
    style: `height:${TRACK_LABEL_PX + rows * SEGMENT_ROW_PX}px`,
  });
  for (const p of placed) {
    const left = scale.x(p.from);
    const bar = h(
      'button',
      {
        type: 'button',
        class: 'segment',
        style: `left:${left}px;width:${scale.x(p.to) - left}px;top:${TRACK_LABEL_PX + p.row * SEGMENT_ROW_PX}px;--c:${paletteColor(p.segment.color)}`,
        title: `${p.segment.name}（${rangeLabel(p.segment.start, p.segment.end)}）`,
      },
      h('span', { class: 'segment-name' }, p.segment.name),
      h('span', { class: 'segment-range' }, rangeLabel(p.segment.start, p.segment.end)),
    );
    bar.addEventListener('click', () => events.onSegment(p.segment));
    lane.append(bar);
  }
  const name = h('button', { type: 'button', class: 'track-name' }, track.name);
  name.addEventListener('click', () => events.onTrack(track));
  lane.append(name);
  return lane;
}

const LABELS: Record<'cakes' | 'flags', string> = { cakes: '生日', flags: '目標里程碑' };

export function lane(
  id: LayerId,
  plan: Plan,
  scale: Scale,
  events: LaneEvents,
): HTMLElement | null {
  let body: HTMLElement;
  let label: string;
  if (id === 'cakes' || id === 'flags') {
    body = id === 'cakes' ? cakesLane(scale) : flagsLane(plan, scale);
    label = LABELS[id];
  } else {
    const track = plan.tracks.find((t) => `track:${t.id}` === id);
    if (!track) return null;
    body = trackLane(track, plan, scale, events);
    label = track.name;
  }
  const grip = h(
    'button',
    {
      type: 'button',
      class: 'grip hover-only',
      'aria-label': `拖曳調整「${label}」的位置`,
      'data-nodrag': true,
    },
    icon('grip'),
  );
  const row = h('div', { class: `lane lane-${id.split(':')[0]}`, 'data-layer': id }, grip, body);
  grip.addEventListener('pointerdown', (e) => events.onGrip(id, row, e));
  return row;
}
