// Puts the whole page together and redraws it whenever the stored plan changes.

import { type Day, toIsoDate } from '../core/dates';
import { GOAL_PALETTE } from '../core/goals';
import type { PaletteKey, Plan } from '../core/types';
import { type Actions, makeActions } from '../data/actions';
import type { Snapshot, Store } from '../data/store';
import { closeDialog } from './dialog';
import { h, icon } from './dom';
import { cardForm, doneForm, goalForm, segmentForm, trackForm } from './forms';
import { goalsRow } from './goals-row';
import { dragSlides, wheelSlides } from './pan';
import { leftFor, scaleFor, type TimelineEvents, timeline } from './timeline';

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

export function mountApp(root: HTMLElement, deps: AppDeps): () => void {
  let snap: Snapshot = { plan: EMPTY, skipped: [] };
  let loaded = false;
  let failure: string | null = null;
  let firstBoard = true;
  const actions = makeActions(deps.store, () => snap.plan, deps.newId);
  const draw = (): void => {
    const scrolls = keepScroll(root);
    root.replaceChildren(...page(snap, loaded, failure, deps, actions, root.clientWidth));
    wire(root, deps, firstBoard && loaded);
    if (loaded) firstBoard = false;
    scrolls();
  };
  const stop = deps.store.subscribe(
    (s) => {
      snap = s;
      loaded = true;
      failure = null;
      draw();
    },
    (message) => {
      failure = message;
      draw();
    },
  );
  let pending = 0;
  const onResize = (): void => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(draw);
  };
  window.addEventListener('resize', onResize);
  draw();
  return () => {
    stop();
    closeDialog();
    window.removeEventListener('resize', onResize);
  };
}

function page(
  snap: Snapshot,
  loaded: boolean,
  failure: string | null,
  deps: AppDeps,
  actions: Actions,
  width: number,
) {
  const today = toIsoDate(deps.today());
  const { plan } = snap;
  const notices = noticeList(snap, failure, deps.store.mode);
  const head = h(
    'header',
    { class: 'top' },
    h('h1', {}, '人生路線圖'),
    h('p', { class: 'sub' }, subline(deps.today())),
  );
  if (!loaded) return [head, ...notices, h('p', { class: 'loading' }, '正在讀取你的路線圖…')];
  const goals = goalsRow(plan.goals, plan.cards, today, {
    onAdd: () => goalForm(actions, null, today),
    onOpen: (g) => goalForm(actions, g, today),
  });
  const board = timeline(plan, scaleFor(width), deps.today(), boardEvents(plan, actions, today));
  return [head, ...notices, goals, board];
}

function subline(today: Day): string {
  return `${today.year} 年 ${today.month} 月 ${today.day} 日`;
}

function noticeList(snap: Snapshot, failure: string | null, mode: Store['mode']): HTMLElement[] {
  const out: HTMLElement[] = [];
  if (failure) out.push(h('p', { class: 'notice is-bad', role: 'alert' }, failure));
  if (mode === 'memory') {
    out.push(
      h('p', { class: 'notice' }, '這個畫面沒有連上資料庫：可以試用，但重新整理後改動不會保留。'),
    );
  }
  if (snap.skipped.length) {
    out.push(
      h(
        'p',
        { class: 'notice is-bad' },
        `有 ${snap.skipped.length} 筆資料讀不懂，先不顯示：${snap.skipped.join('；')}`,
      ),
    );
  }
  return out;
}

function nextSegmentColor(plan: Plan): PaletteKey {
  const used = new Set(plan.segments.map((x) => x.color));
  return GOAL_PALETTE.find((k) => !used.has(k)) ?? GOAL_PALETTE[0] ?? 'clay';
}

function boardEvents(plan: Plan, actions: Actions, today: string): TimelineEvents {
  return {
    onTick: (card) => {
      if (card.state.kind === 'done') void actions.setDone(card, null).catch(toast);
      else doneForm(actions, card, today);
    },
    onOpen: (card) => cardForm(actions, plan.goals, card, card.month),
    onAddCard: (month) => cardForm(actions, plan.goals, null, month),
    onAxis: (month, x, y) =>
      axisMenu(x, y, [
        [
          '新增時間段',
          () =>
            segmentForm(actions, {
              tracks: plan.tracks,
              segment: null,
              start: month,
              color: nextSegmentColor(plan),
            }),
        ],
        ['新增軌道', () => trackForm(actions, null)],
      ]),
    onSegment: (segment) =>
      segmentForm(actions, {
        tracks: plan.tracks,
        segment,
        start: segment.start,
        color: segment.color,
      }),
    onTrack: (track) => trackForm(actions, track),
    onMoveLayer: (id, slot) => void actions.moveLayer(id, slot).catch(toast),
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

/** A short message at the bottom of the screen (used for failed saves outside a dialog). */
export function toast(e: unknown): void {
  const text = e instanceof Error ? e.message : String(e);
  const el = h('p', { class: 'toast', role: 'alert' }, text);
  document.body.append(el);
  el.addEventListener('click', () => el.remove());
}

function keepScroll(root: HTMLElement): () => void {
  // Kept as a share of the full width, so a resized window keeps the same years in view.
  const saved = [...root.querySelectorAll<HTMLElement>('[data-scroll]')].map(
    (el) => [el.dataset.scroll, el.scrollLeft / Math.max(1, el.scrollWidth)] as const,
  );
  return () => {
    for (const [name, share] of saved) {
      const el = root.querySelector<HTMLElement>(`[data-scroll="${name}"]`);
      if (el) el.scrollLeft = share * el.scrollWidth;
    }
  };
}

function wire(root: HTMLElement, deps: AppDeps, first: boolean): void {
  const board = root.querySelector<HTMLElement>('[data-scroll="board"]');
  const goals = root.querySelector<HTMLElement>('[data-scroll="goals"]');
  if (board) {
    dragSlides(board);
    wheelSlides(board, '.lanes');
    if (first) board.scrollLeft = leftFor(deps.today().year, scaleFor(root.clientWidth));
  }
  if (goals) dragSlides(goals);
}
