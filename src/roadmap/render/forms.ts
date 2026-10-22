// The forms Ben fills in: goal, card, time range, track, and "when did you finish this?".

import { FIRST_YEAR, LAST_YEAR, MONTHS_PER_YEAR, parseYearMonth, toYearMonth } from '../core/dates';
import { GOAL_PALETTE } from '../core/goals';
import type { Card, Goal, PaletteKey, Segment, Track } from '../core/types';
import type { Actions, CardDraft, SegmentDraft } from '../data/actions';
import { type DialogAction, fieldProblem, openDialog } from './dialog';
import { h, paletteColor } from './dom';

let fieldSeq = 0;
const fid = (name: string): string => {
  fieldSeq += 1;
  return `f-${name}-${fieldSeq}`;
};

function field(label: string, control: HTMLElement): HTMLElement {
  const id = control.id || fid('x');
  control.id = id;
  return h('div', { class: 'field' }, h('label', { for: id }, label), control);
}

const textInput = (value: string, required = true): HTMLInputElement =>
  h('input', { type: 'text', value, required, autocomplete: 'off', id: fid('t') });

function required(input: HTMLInputElement | HTMLTextAreaElement, name: string): string {
  const v = input.value.trim();
  return v || fieldProblem(`請填寫${name}`);
}

/** Year + month as two lists: works the same in every browser (month inputs do not). */
function monthPicker(value: string): { el: HTMLElement; read: () => string } {
  const { year, month } = parseYearMonth(value);
  const years = h('select', { 'aria-label': '年', id: fid('y') });
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y += 1) {
    years.append(h('option', { value: y, selected: y === year }, `${y} 年`));
  }
  const months = h('select', { 'aria-label': '月', id: fid('m') });
  for (let m = 1; m <= MONTHS_PER_YEAR; m += 1) {
    months.append(h('option', { value: m, selected: m === month }, `${m} 月`));
  }
  return {
    el: h('div', { class: 'pair' }, years, months),
    read: () => toYearMonth(Number(years.value), Number(months.value)),
  };
}

const dateInput = (value: string): HTMLInputElement =>
  h('input', { type: 'date', value, required: true, min: `${FIRST_YEAR}-01-01`, id: fid('d') });

function readDate(input: HTMLInputElement): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(input.value) ? input.value : fieldProblem('請選一個日期');
}

/** Deleting asks once more, naming what goes, before anything is removed. */
const del = (label: string, what: string, run: () => Promise<void>): DialogAction => ({
  label,
  kind: 'danger',
  run: () => {
    openDialog(
      '確定要刪除嗎？',
      [h('p', { class: 'dlg-lead' }, what), h('p', {}, '刪除後無法復原。')],
      [
        { label: '不刪', kind: 'plain', run: () => undefined },
        {
          label,
          kind: 'danger',
          run: async () => {
            await run();
            return undefined;
          },
        },
      ],
    );
    return false;
  },
});

const cancel: DialogAction = { label: '取消', kind: 'plain', run: () => undefined };

export function goalForm(actions: Actions, goal: Goal | null, today: string): void {
  const title = textInput(goal?.title ?? '');
  const target = dateInput(goal?.target ?? today);
  const save: DialogAction = {
    label: goal ? '儲存' : '新增目標',
    kind: 'primary',
    run: async () => {
      const t = required(title, '標題');
      const d = readDate(target);
      await (goal ? actions.editGoal(goal, t, d) : actions.addGoal(t, d));
      return undefined;
    },
  };
  const extra = goal
    ? [
        del('刪除目標', `目標「${goal.title}」；連到它的卡片會保留，但不再算進任何目標。`, () =>
          actions.deleteGoal(goal),
        ),
      ]
    : [];
  openDialog(
    goal ? '編輯目標' : '新增目標',
    [field('標題', title), field('達成時間', target)],
    [...extra, cancel, save],
  );
}

function goalSelect(goals: readonly Goal[], chosen: string | null): HTMLSelectElement {
  const sel = h('select', { id: fid('g') }, h('option', { value: '' }, '（不連到目標）'));
  for (const g of goals)
    sel.append(h('option', { value: g.id, selected: g.id === chosen }, g.title));
  return sel;
}

export function cardForm(
  actions: Actions,
  goals: readonly Goal[],
  card: Card | null,
  month: string,
): void {
  const title = textInput(card?.title ?? '');
  const note = h('textarea', { rows: 3, id: fid('n') });
  note.value = card?.note ?? '';
  const goal = goalSelect(goals, card?.goalId ?? null);
  const when = monthPicker(card?.month ?? month);
  const read = (): CardDraft => ({
    title: required(title, '標題'),
    note: note.value.trim(),
    goalId: goal.value || null,
    month: when.read(),
  });
  const save: DialogAction = {
    label: card ? '儲存' : '新增卡片',
    kind: 'primary',
    run: async () => {
      const d = read();
      await (card ? actions.editCard(card, d) : actions.addCard(d));
      return undefined;
    },
  };
  const extra = card
    ? [del('刪除卡片', `卡片「${card.title}」`, () => actions.deleteCard(card))]
    : [];
  const body = [
    field('標題', title),
    field('內容', note),
    field('目標', goal),
    field('時間', when.el),
  ];
  openDialog(card ? '編輯卡片' : '新增卡片', body, [...extra, cancel, save]);
}

export function doneForm(actions: Actions, card: Card, today: string): void {
  const on = dateInput(today);
  openDialog(
    '確認完成',
    [h('p', { class: 'dlg-lead' }, card.title), field('完成日期', on)],
    [
      cancel,
      {
        label: '確認完成',
        kind: 'primary',
        run: async () => {
          await actions.setDone(card, readDate(on));
          return undefined;
        },
      },
    ],
  );
}

function swatches(chosen: PaletteKey): { el: HTMLElement; read: () => PaletteKey } {
  let value = chosen;
  const group = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': '顏色' });
  for (const key of GOAL_PALETTE) {
    const b = h('button', {
      type: 'button',
      class: 'swatch',
      role: 'radio',
      'aria-checked': key === value ? 'true' : 'false',
      'aria-label': SWATCH_NAMES[key],
      style: `--sw:${paletteColor(key)}`,
    });
    b.addEventListener('click', () => {
      value = key;
      for (const x of group.children) x.setAttribute('aria-checked', x === b ? 'true' : 'false');
    });
    group.append(b);
  }
  return { el: group, read: () => value };
}

const SWATCH_NAMES: Record<PaletteKey, string> = {
  clay: '咖啡',
  slate: '霧藍',
  olive: '橄欖綠',
  rose: '玫瑰',
  teal: '青綠',
  ochre: '赭黃',
  plum: '梅紫',
  moss: '苔綠',
  dusk: '暮灰',
  sand: '沙色',
};

export interface SegmentFormInput {
  readonly tracks: readonly Track[];
  readonly segment: Segment | null;
  readonly start: string;
  readonly color: PaletteKey;
}

function trackPicker(tracks: readonly Track[], chosen: string | null) {
  const NEW = '__new__';
  const sel = h('select', { id: fid('tr') });
  for (const t of tracks)
    sel.append(h('option', { value: t.id, selected: t.id === chosen }, t.name));
  sel.append(h('option', { value: NEW, selected: tracks.length === 0 }, '＋ 新軌道…'));
  const name = textInput('', false);
  name.placeholder = '新軌道名稱，例如：學歷';
  const sync = (): void => {
    name.hidden = sel.value !== NEW;
  };
  sel.addEventListener('change', sync);
  sync();
  const read = async (actions: Actions): Promise<string> =>
    sel.value === NEW ? actions.addTrack(required(name, '新軌道名稱')) : sel.value;
  return { el: h('div', { class: 'stack' }, sel, name), read };
}

export function segmentForm(actions: Actions, input: SegmentFormInput): void {
  const seg = input.segment;
  const name = textInput(seg?.name ?? '');
  const track = trackPicker(input.tracks, seg?.trackId ?? input.tracks[0]?.id ?? null);
  const start = monthPicker(seg?.start ?? input.start);
  const end = monthPicker(seg?.end ?? input.start);
  const color = swatches(seg?.color ?? input.color);
  const save: DialogAction = {
    label: seg ? '儲存' : '新增時間段',
    kind: 'primary',
    run: async () => {
      const n = required(name, '名稱');
      if (end.read() < start.read()) fieldProblem('結束不能早於開始');
      const d: SegmentDraft = {
        trackId: await track.read(actions),
        name: n,
        start: start.read(),
        end: end.read(),
        color: color.read(),
      };
      await (seg ? actions.editSegment(seg, d) : actions.addSegment(d));
      return undefined;
    },
  };
  const body = [
    field('名稱', name),
    field('軌道', track.el),
    field('開始', start.el),
    field('結束（含當月）', end.el),
    field('顏色', color.el),
  ];
  const extra = seg
    ? [del('刪除時間段', `時間段「${seg.name}」`, () => actions.deleteSegment(seg))]
    : [];
  openDialog(seg ? '編輯時間段' : '新增時間段', body, [...extra, cancel, save]);
}

export function trackForm(actions: Actions, track: Track | null): void {
  const name = textInput(track?.name ?? '');
  const save: DialogAction = {
    label: track ? '儲存' : '新增軌道',
    kind: 'primary',
    run: async () => {
      const n = required(name, '名稱');
      await (track ? actions.renameTrack(track, n) : actions.addTrack(n));
      return undefined;
    },
  };
  const extra = track
    ? [del('刪除軌道', `軌道「${track.name}」和裡面所有的時間段`, () => actions.deleteTrack(track))]
    : [];
  openDialog(track ? '編輯軌道' : '新增軌道', [field('名稱', name)], [...extra, cancel, save]);
}
