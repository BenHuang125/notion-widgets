// Backup: the plan lives in this browser only, so Ben can copy it out and paste it back
// (another computer, a cleared browser). Pasting asks once more, showing what gets replaced.

import type { Plan } from '../core/types';
import { fromBackup, type Store } from '../data/store';
import { fieldProblem, openDialog } from './dialog';
import { h } from './dom';

const count = (p: { goals: number; cards: number; segments: number }): string =>
  `${p.goals} 個目標、${p.cards} 張卡片、${p.segments} 段時間段`;

function copyButton(area: HTMLTextAreaElement): HTMLButtonElement {
  const b = h('button', { type: 'button', class: 'btn btn-plain' }, '複製');
  b.addEventListener('click', () => {
    area.select();
    navigator.clipboard?.writeText(area.value).then(
      () => {
        b.textContent = '已複製';
      },
      () => {
        b.textContent = '已選取，按 ⌘C 複製';
      },
    );
  });
  return b;
}

function confirmImport(store: Store, text: string, plan: Plan): void {
  const next = fromBackup(text);
  const now = {
    goals: plan.goals.length,
    cards: plan.cards.length,
    segments: plan.segments.length,
  };
  const incoming = {
    goals: next.rows.goals.size,
    cards: next.rows.cards.size,
    segments: next.rows.segments.size,
  };
  openDialog(
    '用備份取代目前的內容？',
    [
      h('p', {}, `目前：${count(now)}`),
      h('p', { class: 'dlg-lead' }, `換成：${count(incoming)}`),
      h('p', {}, '目前的內容會被取代，取代前可以先按「取消」把目前的內容複製起來。'),
    ],
    [
      { label: '取消', kind: 'plain', run: () => undefined },
      {
        label: '取代',
        kind: 'danger',
        run: async () => {
          await store.importText(text);
          return undefined;
        },
      },
    ],
  );
}

export function backupDialog(store: Store, plan: Plan): void {
  const out = h('textarea', { rows: 5, readonly: true, id: 'backup-out', class: 'mono' });
  out.value = store.exportText();
  out.addEventListener('focus', () => out.select());
  const paste = h('textarea', {
    rows: 5,
    id: 'backup-in',
    class: 'mono',
    placeholder: '把之前複製的備份貼在這裡',
  });
  openDialog(
    '備份',
    [
      h(
        'p',
        {},
        '路線圖存在這台電腦的瀏覽器裡。偶爾複製一份存起來，換電腦或清掉瀏覽器資料時貼回來。',
      ),
      h(
        'div',
        { class: 'field' },
        h('label', { for: 'backup-out' }, '目前的內容'),
        out,
        copyButton(out),
      ),
      h('div', { class: 'field' }, h('label', { for: 'backup-in' }, '貼上備份'), paste),
    ],
    [
      { label: '關閉', kind: 'plain', run: () => undefined },
      {
        label: '用貼上的備份',
        kind: 'primary',
        run: () => {
          const text = paste.value.trim() || fieldProblem('請先貼上備份');
          confirmImport(store, text, plan);
          return false;
        },
      },
    ],
  );
}
