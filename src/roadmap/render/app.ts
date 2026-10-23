// Puts the page together. The frame (goal row, sliding board) is built once; each change
// to the plan redraws, at most once per screen frame, only the pieces whose data changed.

import { cardsByYear, normalizeLayout } from '../core/board';
import { type Day, FIRST_YEAR, toIsoDate, yearCount } from '../core/dates';
import { GOAL_PALETTE, goalStatus } from '../core/goals';
import type { Goal, LayerId, PaletteKey, Plan } from '../core/types';
import { type Actions, makeActions } from '../data/actions';
import type { Snapshot, Store } from '../data/store';
import { axisRow } from './axis';
import { closeDialog } from './dialog';
import { h, icon } from './dom';
import { cardForm, doneForm, goalForm, segmentForm, trackForm } from './forms';
import { goalsRow } from './goals-row';
import { makeKeeper, placeChildren } from './keep';
import { lane, type Scale } from './lanes';
import { dragSlides, wheelSlides } from './pan';
import {
  boardShell,
  laneEvents,
  leftFor,
  scaleFor,
  type TimelineEvents,
  yearColumn,
} from './timeline';

export interface AppDeps {
  readonly store: Store;
  /** Today's local date (the page's only clock). */
  readonly today: () => Day;
  readonly newId: () => string;
}

const EMPTY: Plan = {
  goals: [],
  cards: [],
  tracks: [],
  segments: [],
  layout: { above: [], below: [] },
};

interface State {
  snap: Snapshot;
  loaded: boolean;
  failure: string | null;
}

export function mountApp(root: HTMLElement, deps: AppDeps): () => void {
  const state: State = { snap: { plan: EMPTY, skipped: [] }, loaded: false, failure: null };
  const plan = (): Plan => state.snap.plan;
  const actions = makeActions(deps.store, plan, deps.newId, toast);
  const shell = boardShell();
  const notices = h('div', { class: 'notices' });
  const goalsSlot = h('div', { class: 'goals-slot' });
  const loading = h('p', { class: 'loading' }, '正在讀取你的路線圖…');
  root.replaceChildren(notices, goalsSlot, loading);
  dragSlides(shell.board);
  wheelSlides(shell.board, '.lanes');
  const reached = reachedWatch();
  const draw = drawer({ root, deps, actions, state, shell, notices, goalsSlot, loading, reached });
  let queued = false;
  /**
   * Several changes in one step = one redraw, right after the step (a microtask). Not tied to
   * screen frames: inside Notion the page is a cross-origin frame, and browsers may hold back
   * animation frames there (Safari until the frame is clicked), which left it stuck on loading.
   */
  const schedule = (): void => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      draw();
    });
  };
  const stop = deps.store.subscribe(
    (s) => {
      state.snap = s;
      state.loaded = true;
      state.failure = null;
      schedule();
    },
    (message) => {
      state.failure = message;
      schedule();
    },
  );
  window.addEventListener('resize', schedule);
  schedule();
  return () => {
    stop();
    closeDialog();
    window.removeEventListener('resize', schedule);
  };
}

/** Notices goals that turn reached between drawings, so their flag can rise once. */
interface ReachedWatch {
  update(plan: Plan): ReadonlySet<string>;
}

function reachedWatch(): ReachedWatch {
  let before: Set<string> | null = null;
  return {
    update(plan) {
      const now = new Set(
        plan.goals.filter((g) => goalStatus(g, plan.cards).kind === 'reached').map((g) => g.id),
      );
      // The first drawing only takes note: flags already reached do not rise on page open.
      const fresh = before ? new Set([...now].filter((id) => !before?.has(id))) : new Set<string>();
      before = now;
      return fresh;
    },
  };
}

interface DrawParts {
  readonly root: HTMLElement;
  readonly deps: AppDeps;
  readonly actions: Actions;
  readonly state: State;
  readonly shell: ReturnType<typeof boardShell>;
  readonly notices: HTMLElement;
  readonly goalsSlot: HTMLElement;
  readonly loading: HTMLElement;
  readonly reached: ReachedWatch;
}

function drawer(p: DrawParts): () => void {
  const keeper = makeKeeper();
  const events = boardEvents(
    () => p.state.snap.plan,
    p.actions,
    () => toIsoDate(p.deps.today()),
  );
  const lanesEvents = laneEvents(p.shell.lanes, events);
  let shownWidth = 0;
  return () => {
    const today = p.deps.today();
    placeChildren(p.notices, noticeList(p.state, p.deps.store.mode));
    if (!p.state.loaded) return;
    const scale = scaleFor(p.root.clientWidth);
    const plan = p.state.snap.plan;
    const firstShow = !p.shell.board.isConnected;
    if (firstShow) p.loading.replaceWith(p.shell.board);
    const share = p.shell.board.scrollLeft / Math.max(1, p.shell.board.scrollWidth);
    drawGoals(p, keeper, plan, toIsoDate(today));
    p.shell.inner.style.width = `${yearCount() * scale.yearWidth}px`;
    drawLanes(p, keeper, plan, scale, today, events, lanesEvents);
    drawColumns(p, keeper, plan, scale, events);
    keeper.sweep();
    if (firstShow) p.shell.board.scrollLeft = leftFor(today.year, scale);
    else if (scale.yearWidth !== shownWidth)
      p.shell.board.scrollLeft = share * p.shell.board.scrollWidth;
    shownWidth = scale.yearWidth;
  };
}

function drawGoals(p: DrawParts, keeper: ReturnType<typeof makeKeeper>, plan: Plan, today: string) {
  const sig = JSON.stringify([today, plan.goals, plan.cards.map((c) => [c.goalId, c.state])]);
  const old = p.goalsSlot.querySelector<HTMLElement>('[data-scroll="goals"]');
  const node = keeper.piece('goals', sig, () =>
    goalsRow(plan.goals, plan.cards, today, {
      onAdd: () => goalForm(p.actions, null, today),
      onOpen: (g) => goalForm(p.actions, g, today),
    }),
  );
  const fresh = node.querySelector<HTMLElement>('[data-scroll="goals"]');
  if (old && fresh && old !== fresh) fresh.scrollLeft = old.scrollLeft;
  placeChildren(p.goalsSlot, [node]);
}

function laneSig(id: LayerId, plan: Plan, width: number): string {
  const trackId = id.slice('track:'.length);
  const track = plan.tracks.find((t) => t.id === trackId);
  return JSON.stringify([width, track, plan.segments.filter((x) => x.trackId === trackId)]);
}

function drawLanes(
  p: DrawParts,
  keeper: ReturnType<typeof makeKeeper>,
  plan: Plan,
  scale: Scale,
  today: Day,
  events: TimelineEvents,
  lanesEvents: ReturnType<typeof laneEvents>,
): void {
  const order = normalizeLayout(plan);
  const w = scale.yearWidth;
  // normalizeLayout only lists tracks that exist, so every id builds a row.
  const row = (id: LayerId): HTMLElement =>
    keeper.piece(
      `lane:${id}`,
      laneSig(id, plan, w),
      () => lane(id, plan, scale, lanesEvents) ?? h('div'),
    );
  const progress = plan.cards.map((c) => [c.goalId, c.state]);
  const axisSig = JSON.stringify([w, toIsoDate(today), plan.goals, progress]);
  const celebrate = p.reached.update(plan);
  const rows = [
    ...order.above.map(row),
    keeper.piece('axis', axisSig, () => axisRow({ plan, scale, today, celebrate }, events)),
    ...order.below.map(row),
  ];
  placeChildren(p.shell.lanes, rows);
}

function drawColumns(
  p: DrawParts,
  keeper: ReturnType<typeof makeKeeper>,
  plan: Plan,
  scale: Scale,
  events: TimelineEvents,
): void {
  const byYear = cardsByYear(plan.cards);
  const goals = new Map<string, Goal>(plan.goals.map((g) => [g.id, g]));
  const cols: HTMLElement[] = [];
  for (let i = 0; i < yearCount(); i += 1) {
    const year = FIRST_YEAR + i;
    const cards = byYear.get(year) ?? [];
    const used = cards.map((c) => (c.goalId ? goals.get(c.goalId) : undefined));
    const sig = JSON.stringify([scale.yearWidth, cards, used]);
    cols.push(
      keeper.piece(`col:${year}`, sig, () => yearColumn(year, cards, goals, scale, events)),
    );
  }
  placeChildren(p.shell.columns, cols);
}

function noticeList(state: State, mode: Store['mode']): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (state.failure) {
    out.push(h('p', { class: 'notice is-bad', role: 'alert' }, state.failure));
  }
  if (mode === 'memory') {
    out.push(
      h(
        'p',
        { class: 'notice is-bad' },
        '這個瀏覽器不讓網頁存資料：可以試用，但重新整理後改動不會保留。',
      ),
    );
  }
  const plan = state.snap.plan;
  if (state.loaded && !plan.goals.length && !plan.cards.length && !plan.tracks.length) {
    out.push(h('p', { class: 'notice' }, '還沒有資料：滑到目標列右邊按「＋」新增第一個目標。'));
  }
  const skipped = state.snap.skipped;
  if (skipped.length) {
    out.push(
      h(
        'p',
        { class: 'notice is-bad' },
        `有 ${skipped.length} 筆資料讀不懂，先不顯示：${skipped.join('；')}`,
      ),
    );
  }
  return out;
}

/** A new track's color: the first one no track uses yet. */
function nextTrackColor(plan: Plan): PaletteKey {
  const used = new Set(plan.tracks.map((t) => t.color));
  return GOAL_PALETTE.find((k) => !used.has(k)) ?? GOAL_PALETTE[0] ?? 'clay';
}

/** Built once; every handler reads the current plan when it runs, never a stale copy. */
function boardEvents(plan: () => Plan, actions: Actions, today: () => string): TimelineEvents {
  return {
    onTick: (card) => {
      if (card.state.kind === 'done') actions.setDone(card, null);
      else doneForm(actions, card, today());
    },
    onOpen: (card) => cardForm(actions, plan().goals, card, card.month),
    onAddCard: (month) => cardForm(actions, plan().goals, null, month),
    onAxis: (month, x, y) =>
      axisMenu(x, y, [
        [
          '新增時間段',
          () =>
            segmentForm(actions, {
              tracks: plan().tracks,
              segment: null,
              start: month,
              newTrackColor: nextTrackColor(plan()),
            }),
        ],
        ['新增軌道', () => trackForm(actions, null, nextTrackColor(plan()))],
      ]),
    onSegment: (segment) =>
      segmentForm(actions, {
        tracks: plan().tracks,
        segment,
        start: segment.start,
        newTrackColor: nextTrackColor(plan()),
      }),
    onTrack: (track) => trackForm(actions, track, track.color),
    onGoal: (goal) => goalForm(actions, goal, today()),
    onMoveLayer: (id, slot) => actions.moveLayer(id, slot),
  };
}

function axisMenu(x: number, y: number, items: readonly [string, () => void][]): void {
  document.querySelector('.menu')?.remove();
  const menu = h('div', { class: 'menu', role: 'menu', style: `left:${x}px;top:${y}px` });
  for (const [label, run] of items) {
    const b = h('button', { type: 'button', role: 'menuitem' }, icon('plus'), label);
    b.addEventListener('click', () => {
      menu.remove();
      run();
    });
    menu.append(b);
  }
  const away = (e: Event): void => {
    if (menu.contains(e.target as Node)) return;
    menu.remove();
    document.removeEventListener('pointerdown', away, true);
  };
  document.addEventListener('pointerdown', away, true);
  document.body.append(menu);
  menu.querySelector('button')?.focus();
}

/** A failed save, shown at the bottom of the screen until clicked. */
export function toast(e: unknown): void {
  const text = e instanceof Error ? e.message : String(e);
  const el = h('p', { class: 'toast', role: 'alert' }, `${text}。畫面已改回資料庫裡的內容。`);
  document.body.append(el);
  el.addEventListener('click', () => el.remove());
}
