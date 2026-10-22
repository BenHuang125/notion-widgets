// Every change Ben can make, as one call each. The page calls these; they write through the store.

import { moveLayer, nextRank, normalizeLayout } from '../core/board';
import { nextGoalColor } from '../core/goals';
import { cardRow, goalRow, layoutRow, segmentRow, trackRow } from '../core/parse';
import type { Card, Goal, IsoDate, LayerId, PaletteKey, Plan, Segment, Track } from '../core/types';
import type { Store } from './store';

export interface CardDraft {
  readonly title: string;
  readonly note: string;
  readonly goalId: string | null;
  readonly month: string;
}

export interface SegmentDraft {
  readonly trackId: string;
  readonly name: string;
  readonly start: string;
  readonly end: string;
  readonly color: PaletteKey;
}

/**
 * Every call returns at once: the change shows on the page immediately and is saved in the
 * background. A failed save is passed to `onError` (the page shows it) and the page falls back
 * to what the server holds.
 */
export interface Actions {
  addGoal(title: string, target: IsoDate): void;
  editGoal(goal: Goal, title: string, target: IsoDate): void;
  deleteGoal(goal: Goal): void;
  addCard(draft: CardDraft): void;
  editCard(card: Card, draft: CardDraft): void;
  setDone(card: Card, doneOn: IsoDate | null): void;
  deleteCard(card: Card): void;
  /** Returns the new track's id right away, so a time range can go in it in the same step. */
  addTrack(name: string): string;
  renameTrack(track: Track, name: string): void;
  deleteTrack(track: Track): void;
  addSegment(draft: SegmentDraft): void;
  editSegment(segment: Segment, draft: SegmentDraft): void;
  deleteSegment(segment: Segment): void;
  moveLayer(id: LayerId, slot: number): void;
}

export function makeActions(
  store: Store,
  plan: () => Plan,
  newId: () => string,
  onError: (e: unknown) => void,
): Actions {
  const bg = (...writes: Promise<void>[]): void => {
    Promise.all(writes).catch(onError);
  };
  const layout = (): ReturnType<typeof normalizeLayout> => normalizeLayout(plan());
  const putCard = (c: Card): Promise<void> => store.put('cards', c.id, cardRow(c));
  return {
    addGoal: (title, target) => {
      const goal: Goal = { id: newId(), title, target, color: nextGoalColor(plan().goals) };
      bg(store.put('goals', goal.id, goalRow(goal)));
    },
    editGoal: (goal, title, target) =>
      bg(store.put('goals', goal.id, goalRow({ ...goal, title, target }))),
    deleteGoal: (goal) => {
      const unlink = plan()
        .cards.filter((c) => c.goalId === goal.id)
        .map((c) => putCard({ ...c, goalId: null }));
      bg(...unlink, store.remove('goals', goal.id));
    },
    addCard: (d) =>
      bg(
        putCard({
          id: newId(),
          ...d,
          state: { kind: 'open' },
          rank: nextRank(plan().cards, d.month),
        }),
      ),
    editCard: (card, d) => {
      const rank = d.month === card.month ? card.rank : nextRank(plan().cards, d.month);
      bg(putCard({ ...card, ...d, rank }));
    },
    setDone: (card, doneOn) =>
      bg(
        putCard({ ...card, state: doneOn === null ? { kind: 'open' } : { kind: 'done', doneOn } }),
      ),
    deleteCard: (card) => bg(store.remove('cards', card.id)),
    addTrack: (name) => {
      const id = newId();
      bg(store.put('tracks', id, trackRow({ id, name })));
      return id;
    },
    renameTrack: (track, name) => bg(store.put('tracks', track.id, trackRow({ ...track, name }))),
    deleteTrack: (track) => {
      const ranges = plan()
        .segments.filter((x) => x.trackId === track.id)
        .map((x) => store.remove('segments', x.id));
      bg(...ranges, store.remove('tracks', track.id));
    },
    addSegment: (d) => {
      const seg: Segment = { id: newId(), ...d };
      bg(store.put('segments', seg.id, segmentRow(seg)));
    },
    editSegment: (seg, d) => bg(store.put('segments', seg.id, segmentRow({ ...seg, ...d }))),
    deleteSegment: (seg) => bg(store.remove('segments', seg.id)),
    moveLayer: (id, slot) => bg(store.putLayout(layoutRow(moveLayer(layout(), id, slot)))),
  };
}
