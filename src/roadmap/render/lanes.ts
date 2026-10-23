// The time-range tracks around the axis. Every track can be dragged (by its handle) above or
// below the axis. Cakes and flags are drawn on the axis itself (axis.ts).

import { placeSegments } from '../core/board';
import { rangeLabel } from '../core/dates';
import type { LayerId, Plan, Segment, Track } from '../core/types';
import { h, icon, paletteColor } from './dom';

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
        style: `left:${left}px;width:${scale.x(p.to) - left}px;top:${TRACK_LABEL_PX + p.row * SEGMENT_ROW_PX}px;--c:${paletteColor(track.color)}`,
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

export function lane(
  id: LayerId,
  plan: Plan,
  scale: Scale,
  events: LaneEvents,
): HTMLElement | null {
  const track = plan.tracks.find((t) => `track:${t.id}` === id);
  if (!track) return null;
  const body = trackLane(track, plan, scale, events);
  const label = track.name;
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
  const row = h('div', { class: 'lane lane-track', 'data-layer': id }, grip, body);
  grip.addEventListener('pointerdown', (e) => events.onGrip(id, row, e));
  return row;
}
