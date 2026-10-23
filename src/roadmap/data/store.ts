// Where the plan is kept. One fixed interface; the same rows either kept in this browser
// (Ben's choice, 2026-10-22: the page lives inside Notion, no account or key) or, when the
// browser refuses storage, only in memory (the page says so).

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

export interface Snapshot {
  readonly plan: Plan;
  /** Rows that could not be read, with the reason. */
  readonly skipped: readonly string[];
}

export interface Store {
  /** "local" keeps the plan in this browser; "memory" loses it on reload (the page says so). */
  readonly mode: 'local' | 'memory';
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

/** Backup format version; a newer backup is refused rather than half-read. */
const BACKUP_VERSION = 1;

interface Contents {
  rows: Rows;
  layout: Row | undefined;
}

export function toBackup(c: Contents): string {
  const out: Record<string, unknown> = { version: BACKUP_VERSION };
  for (const kind of COLLECTIONS) out[kind] = Object.fromEntries(c.rows[kind]);
  out.layout = c.layout ?? null;
  return JSON.stringify(out, null, 1);
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Reads backup text. Rows inside are checked later (bad ones are listed, not dropped silently). */
export function fromBackup(text: string): Contents {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('這段文字不是備份（格式看不懂）');
  }
  if (!isObject(raw) || raw.version !== BACKUP_VERSION) {
    throw new Error('這段文字不是這個版本的路線圖備份');
  }
  const rows = emptyRows();
  for (const kind of COLLECTIONS) {
    const group = raw[kind] ?? {};
    if (!isObject(group)) throw new Error(`備份裡的 ${kind} 格式不對`);
    for (const [id, row] of Object.entries(group)) {
      if (isObject(row)) rows[kind].set(id, row);
    }
  }
  return { rows, layout: isObject(raw.layout) ? raw.layout : undefined };
}

/** Where the backup text is kept between visits. */
export interface Persist {
  load(): string | null;
  /** Throws when the browser refuses (full, blocked). */
  save(text: string): void;
  /** Calls `changed` when another open copy of the page saved. */
  watch(changed: () => void): () => void;
}

/** One store over rows in memory; with `persist`, every change is saved and reloads keep it. */
export function makeStore(persist: Persist | null): Store {
  let c: Contents = { rows: emptyRows(), layout: undefined };
  /** Set when the saved data could not be read: saving then would overwrite it, so nothing is. */
  let unreadable: string | null = null;
  const listeners = new Set<(s: Snapshot) => void>();
  const emit = (): void => {
    const snap = assemble(c.rows, c.layout);
    for (const l of listeners) l(snap);
  };
  const reload = (): void => {
    const text = persist?.load();
    if (text) c = fromBackup(text);
  };
  const commit = async (change: () => void): Promise<void> => {
    if (unreadable) throw new Error(`先不存檔，以免蓋掉讀不出來的資料（${unreadable}）`);
    const before = c;
    c = { rows: cloneRows(c.rows), layout: c.layout };
    change();
    emit();
    try {
      persist?.save(toBackup(c));
    } catch (e) {
      c = before;
      emit();
      throw new Error(`這台電腦的瀏覽器不讓存檔（${e instanceof Error ? e.message : String(e)}）`);
    }
  };
  return {
    mode: persist ? 'local' : 'memory',
    subscribe(next, fail) {
      const load = (): void => {
        try {
          reload();
          unreadable = null;
        } catch (e) {
          unreadable = e instanceof Error ? e.message : String(e);
          fail(`存在這台電腦的資料讀不出來：${unreadable}。為了不蓋掉它，先不存任何改動。`);
        }
      };
      load();
      listeners.add(next);
      next(assemble(c.rows, c.layout));
      const stopWatch = persist?.watch(() => {
        load();
        emit();
      });
      return () => {
        listeners.delete(next);
        stopWatch?.();
      };
    },
    put: (kind, id, row) => commit(() => c.rows[kind].set(id, row)),
    remove: (kind, id) => commit(() => c.rows[kind].delete(id)),
    putLayout: (row) =>
      commit(() => {
        c.layout = row;
      }),
  };
}

const cloneRows = (rows: Rows): Rows => ({
  goals: new Map(rows.goals),
  cards: new Map(rows.cards),
  tracks: new Map(rows.tracks),
  segments: new Map(rows.segments),
});
