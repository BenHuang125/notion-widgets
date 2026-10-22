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

export interface Actions {
  addGoal(title: string, target: IsoDate): Promise<void>;
  editGoal(goal: Goal, title: string, target: IsoDate): Promise<void>;
  deleteGoal(goal: Goal): Promise<void>;
  addCard(draft: CardDraft): Promise<void>;
  editCard(card: Card, draft: CardDraft): Promise<void>;
  setDone(card: Card, doneOn: IsoDate | null): Promise<void>;
  deleteCard(card: Card): Promise<void>;
  addTrack(name: string): Promise<string>;
  renameTrack(track: Track, name: string): Promise<void>;
  deleteTrack(track: Track): Promise<void>;
  addSegment(draft: SegmentDraft): Promise<void>;
  editSegment(segment: Segment, draft: SegmentDraft): Promise<void>;
  deleteSegment(segment: Segment): Promise<void>;
  moveLayer(id: LayerId, slot: number): Promise<void>;
}

export function makeActions(store: Store, plan: () => Plan, newId: () => string): Actions {
  const layout = (): ReturnType<typeof normalizeLayout> => normalizeLayout(plan());
  const putCard = (c: Card): Promise<void> => store.put('cards', c.id, cardRow(c));
  return {
    addGoal: (title, target) => {
      const goal: Goal = { id: newId(), title, target, color: nextGoalColor(plan().goals) };
      return store.put('goals', goal.id, goalRow(goal));
    },
    editGoal: (goal, title, target) =>
      store.put('goals', goal.id, goalRow({ ...goal, title, target })),
    deleteGoal: async (goal) => {
      for (const c of plan().cards) if (c.goalId === goal.id) await putCard({ ...c, goalId: null });
      await store.remove('goals', goal.id);
    },
    addCard: (d) =>
      putCard({
        id: newId(),
        ...d,
        state: { kind: 'open' },
        rank: nextRank(plan().cards, d.month),
      }),
    editCard: (card, d) => {
      const rank = d.month === card.month ? card.rank : nextRank(plan().cards, d.month);
      return putCard({ ...card, ...d, rank });
    },
    setDone: (card, doneOn) =>
      putCard({ ...card, state: doneOn === null ? { kind: 'open' } : { kind: 'done', doneOn } }),
    deleteCard: (card) => store.remove('cards', card.id),
    addTrack: async (name) => {
      const id = newId();
      await store.put('tracks', id, trackRow({ id, name }));
      return id;
    },
    renameTrack: (track, name) => store.put('tracks', track.id, trackRow({ ...track, name })),
    deleteTrack: async (track) => {
      for (const s of plan().segments)
        if (s.trackId === track.id) await store.remove('segments', s.id);
      await store.remove('tracks', track.id);
    },
    addSegment: (d) => {
      const s: Segment = { id: newId(), ...d };
      return store.put('segments', s.id, segmentRow(s));
    },
    editSegment: (s, d) => store.put('segments', s.id, segmentRow({ ...s, ...d })),
    deleteSegment: (s) => store.remove('segments', s.id),
    moveLayer: (id, slot) => store.putLayout(layoutRow(moveLayer(layout(), id, slot))),
  };
}
