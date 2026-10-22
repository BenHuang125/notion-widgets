// The database adapter: the page's own db capability (runtime contract 0.2.89).

import type { Row } from '../core/parse';
import { assemble, COLLECTIONS, type Kind, LAYOUT_DOC, type Snapshot, type Store } from './store';

interface DbError {
  readonly code: string;
  readonly message: string;
}
interface DocSnap {
  readonly id: string;
  readonly exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface QuerySnap {
  readonly docs: readonly DocSnap[];
}
type Unsubscribe = () => void;
interface DocRef {
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  onSnapshot(next: (s: DocSnap) => void, error?: (e: DbError) => void): Unsubscribe;
}
interface CollectionRef {
  doc(id: string): DocRef;
  onSnapshot(next: (s: QuerySnap) => void, error?: (e: DbError) => void): Unsubscribe;
}
export interface Db {
  doc(path: string): DocRef;
  collection(path: string): CollectionRef;
}

const describe = (e: unknown): string => {
  if (e && typeof e === 'object' && 'code' in e) {
    const err = e as DbError;
    return `${err.code}：${err.message}`;
  }
  return e instanceof Error ? e.message : String(e);
};

export function dbStore(db: Db): Store {
  return {
    mode: 'db',
    subscribe(next, fail) {
      const rows: Record<Kind, Map<string, Row>> = {
        goals: new Map(),
        cards: new Map(),
        tracks: new Map(),
        segments: new Map(),
      };
      let layout: Row | undefined;
      /** Nothing is drawn until every collection has answered once (no half-empty flash). */
      const pending = new Set<string>([...COLLECTIONS, LAYOUT_DOC]);
      const emit = (): void => {
        if (pending.size === 0) next(assemble(rows, layout) satisfies Snapshot);
      };
      const onError = (e: DbError): void => fail(`讀取資料失敗（${describe(e)}）`);
      const stops = COLLECTIONS.map((kind) =>
        db.collection(kind).onSnapshot((snap) => {
          rows[kind] = new Map(snap.docs.map((d) => [d.id, d.data() ?? {}]));
          pending.delete(kind);
          emit();
        }, onError),
      );
      stops.push(
        db.doc(LAYOUT_DOC).onSnapshot((snap) => {
          layout = snap.exists ? snap.data() : undefined;
          pending.delete(LAYOUT_DOC);
          emit();
        }, onError),
      );
      return () => {
        for (const stop of stops) stop();
      };
    },
    put: (kind, id, row) =>
      wrap(
        db
          .collection(kind)
          .doc(id)
          .set({ ...row }),
      ),
    remove: (kind, id) => wrap(db.collection(kind).doc(id).delete()),
    putLayout: (row) => wrap(db.doc(LAYOUT_DOC).set({ ...row })),
  };
}

/** Write failures come back with a readable reason for the page's notice. */
async function wrap(p: Promise<void>): Promise<void> {
  try {
    await p;
  } catch (e) {
    throw new Error(`存檔失敗（${describe(e)}）`);
  }
}
