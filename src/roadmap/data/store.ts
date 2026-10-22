// Where the plan is kept. One fixed interface; two adapters:
// - the page's database (published page): every device sees the same plan, no keys needed;
// - in memory (a preview with no database): works, but nothing is kept after a reload.

import { DEFAULT_LAYOUT } from '../core/board';
import {
  type Parsed,
  parseCard,
  parseGoal,
  parseLayout,
  parseSegment,
  parseTrack,
  type Row,
} from '../core/parse';
import type { Card, Goal, Layout, Plan, Segment, Track } from '../core/types';

/** Storage names: never rename them, or Ben's saved data disappears. */
export const COLLECTIONS = ['goals', 'cards', 'tracks', 'segments'] as const;
export type Kind = (typeof COLLECTIONS)[number];
export const LAYOUT_DOC = 'meta/layout';

export interface Snapshot {
  readonly plan: Plan;
  /** Rows that could not be read, with the reason. */
  readonly skipped: readonly string[];
}

export interface Store {
  /** "db" keeps the plan; "memory" loses it on reload (the page says so). */
  readonly mode: 'db' | 'memory';
  subscribe(next: (s: Snapshot) => void, fail: (message: string) => void): () => void;
  put(kind: Kind, id: string, row: Row): Promise<void>;
  remove(kind: Kind, id: string): Promise<void>;
  putLayout(row: Row): Promise<void>;
}

type Rows = Record<Kind, Map<string, Row>>;

const emptyRows = (): Rows => ({
  goals: new Map(),
  cards: new Map(),
  tracks: new Map(),
  segments: new Map(),
});

function collect<T>(
  rows: Map<string, Row>,
  parse: (id: string, row: Row) => Parsed<T>,
  kind: string,
  skipped: string[],
): T[] {
  const out: T[] = [];
  for (const [id, row] of rows) {
    const p = parse(id, row);
    if (p.ok) out.push(p.value);
    else skipped.push(`${kind} ${id}：${p.why}`);
  }
  return out;
}

/** Builds the plan from raw rows; one bad row is skipped and named, the rest still show. */
export function assemble(rows: Rows, layout: Row | undefined): Snapshot {
  const skipped: string[] = [];
  const goals: Goal[] = collect(rows.goals, parseGoal, '目標', skipped);
  const cards: Card[] = collect(rows.cards, parseCard, '卡片', skipped);
  const tracks: Track[] = collect(rows.tracks, parseTrack, '軌道', skipped);
  const segments: Segment[] = collect(rows.segments, parseSegment, '時間段', skipped);
  const stored: Layout = layout ? parseLayout(layout) : DEFAULT_LAYOUT;
  return { plan: { goals, cards, tracks, segments, layout: stored }, skipped };
}

export function memoryStore(): Store {
  const rows = emptyRows();
  let layout: Row | undefined;
  const listeners = new Set<(s: Snapshot) => void>();
  const emit = (): void => {
    const snap = assemble(rows, layout);
    for (const l of listeners) l(snap);
  };
  return {
    mode: 'memory',
    subscribe(next) {
      listeners.add(next);
      next(assemble(rows, layout));
      return () => listeners.delete(next);
    },
    async put(kind, id, row) {
      rows[kind].set(id, row);
      emit();
    },
    async remove(kind, id) {
      rows[kind].delete(id);
      emit();
    },
    async putLayout(row) {
      layout = row;
      emit();
    },
  };
}
