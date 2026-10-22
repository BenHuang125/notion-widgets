// Dragging a row by its handle to a new place above or below the axis.
// A hand-written vertical sort (SortableJS is ~45 KB for what is one short list here).

import type { LayerId } from '../core/types';
import { h } from './dom';

/**
 * Starts a row drag. `rows` is every lane plus the axis, top to bottom; on release `commit`
 * gets the slot in that list without the dragged row (see core moveLayer).
 */
export function dragRow(
  e: PointerEvent,
  id: LayerId,
  row: HTMLElement,
  rows: readonly HTMLElement[],
  commit: (id: LayerId, slot: number) => void,
): void {
  if (e.button !== 0) return;
  e.preventDefault();
  const grip = e.currentTarget as HTMLElement;
  grip.setPointerCapture(e.pointerId);
  const others = rows.filter((r) => r !== row);
  const mids = others.map((r) => {
    const box = r.getBoundingClientRect();
    return box.top + box.height / 2;
  });
  const startY = e.clientY;
  const line = h('div', { class: 'drop-line', 'aria-hidden': 'true' });
  row.parentElement?.append(line);
  row.classList.add('is-moving');
  let slot = slotFor(mids, e.clientY);
  const place = (): void => {
    const parent = row.parentElement?.getBoundingClientRect();
    const before = others[slot - 1]?.getBoundingClientRect();
    const after = others[slot]?.getBoundingClientRect();
    const y =
      before && after ? (before.bottom + after.top) / 2 : (before?.bottom ?? after?.top ?? 0);
    line.style.top = `${y - (parent?.top ?? 0)}px`;
  };
  place();
  const move = (ev: PointerEvent): void => {
    row.style.transform = `translateY(${ev.clientY - startY}px)`;
    slot = slotFor(mids, ev.clientY);
    place();
  };
  const end = (ev: PointerEvent): void => {
    grip.removeEventListener('pointermove', move);
    grip.removeEventListener('pointerup', end);
    grip.removeEventListener('pointercancel', end);
    row.style.transform = '';
    row.classList.remove('is-moving');
    line.remove();
    if (ev.type === 'pointerup') commit(id, slot);
  };
  grip.addEventListener('pointermove', move);
  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);
}

/** How many of the other rows sit above the pointer. */
export const slotFor = (mids: readonly number[], y: number): number =>
  mids.filter((m) => m < y).length;
