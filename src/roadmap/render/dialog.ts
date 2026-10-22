// One dialog at a time (a second one replaces the first). Native alert/confirm are blocked in
// the artifact frame, so every confirmation is built here.

import { h, icon } from './dom';

export interface DialogAction {
  readonly label: string;
  readonly kind: 'primary' | 'danger' | 'plain';
  /** Return false to keep the dialog open (e.g. a field is missing). Errors show in the dialog. */
  readonly run: () => Promise<boolean | undefined> | boolean | undefined;
}

let current: { close: () => void } | null = null;

export function closeDialog(): void {
  current?.close();
}

export function openDialog(
  title: string,
  body: readonly Node[],
  actions: readonly DialogAction[],
): void {
  closeDialog();
  const error = h('p', { class: 'dlg-error', role: 'alert', hidden: true });
  const titleId = `dlg-title-${Date.now()}`;
  const panel = h(
    'form',
    { class: 'dlg', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h('header', { class: 'dlg-head' }, h('h2', { id: titleId }, title)),
    h('div', { class: 'dlg-body' }, ...body),
    error,
  );
  const close = h(
    'button',
    { type: 'button', class: 'icon-btn dlg-x', 'aria-label': '關閉' },
    icon('close'),
  );
  panel.querySelector('.dlg-head')?.append(close);
  const foot = h('footer', { class: 'dlg-foot' });
  panel.append(foot);
  const shade = h('div', { class: 'shade' }, panel);
  const finish = (): void => {
    shade.remove();
    document.removeEventListener('keydown', onKey);
    current = null;
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') finish();
  };
  for (const a of actions) foot.append(actionButton(a, error, finish));
  close.addEventListener('click', finish);
  shade.addEventListener('pointerdown', (e) => {
    if (e.target === shade) finish();
  });
  panel.addEventListener('submit', (e) => {
    e.preventDefault();
    foot.querySelector<HTMLButtonElement>('.btn-primary')?.click();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(shade);
  current = { close: finish };
  panel.querySelector<HTMLElement>('input, select, textarea')?.focus();
}

function actionButton(a: DialogAction, error: HTMLElement, finish: () => void): HTMLButtonElement {
  const btn = h('button', { type: 'button', class: `btn btn-${a.kind}` }, a.label);
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    error.hidden = true;
    try {
      const keep = (await a.run()) === false;
      if (!keep) finish();
    } catch (e) {
      error.textContent = e instanceof Error ? e.message : String(e);
      error.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
  return btn;
}

/** Shows a problem inside the open dialog without closing it. */
export function fieldProblem(message: string): never {
  throw new Error(message);
}
