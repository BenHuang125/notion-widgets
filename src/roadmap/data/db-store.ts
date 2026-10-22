// The database adapter: the page's own db capability (runtime contract 0.2.89).

import type { Row } from '../core/parse';
import { assemble, COLLECTIONS, type Kind, LAYOUT_DOC, type Snapshot, type Store } from './store';
import { makeWriter } from './writer';

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

type Rows = Record<Kind, Map<string, Row>>;

/** Server rows with this page's not-yet-sent values laid on top (`null` = being deleted). */
function withOverlay(rows: Rows, overlay: ReadonlyMap<string, Row | null>): Rows {
  if (overlay.size === 0) return rows;
  const out = {} as Rows;
  for (const kind of COLLECTIONS) out[kind] = new Map(rows[kind]);
  for (const [key, row] of overlay) {
    const [kind, id] = key.split('/') as [Kind, string];
    if (!out[kind] || !id) continue;
    if (row === null) out[kind].delete(id);
    else out[kind].set(id, row);
  }
  return out;
}

/**
 * Listens to every collection and the layout; calls `next` with the server's rows plus the
 * overlay. Returns the redraw trigger (for the overlay) and the stop function.
 */
function listen(
  db: Db,
  overlay: ReadonlyMap<string, Row | null>,
  next: (s: Snapshot) => void,
  fail: (message: string) => void,
): { emit: () => void; stop: () => void } {
  const rows: Rows = { goals: new Map(), cards: new Map(), tracks: new Map(), segments: new Map() };
  let layout: Row | undefined;
  /** Nothing is drawn until every collection has answered once (no half-empty flash). */
  const pending = new Set<string>([...COLLECTIONS, LAYOUT_DOC]);
  const emit = (): void => {
    if (pending.size > 0) return;
    const shown = overlay.has(LAYOUT_DOC) ? (overlay.get(LAYOUT_DOC) ?? undefined) : layout;
    next(assemble(withOverlay(rows, overlay), shown));
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
  return { emit, stop: () => stops.forEach((stop) => stop()) };
}

export function dbStore(db: Db): Store {
  const writer = makeWriter();
  /** Values written here but not yet confirmed: shown at once, dropped once the server has them. */
  const overlay = new Map<string, Row | null>();
  let refresh = (): void => undefined;
  const write = (key: string, row: Row | null, send: () => Promise<void>): Promise<void> => {
    overlay.set(key, row);
    refresh();
    const done = writer.send(key, () => wrap(send()));
    const settle = (): void => {
      // Only clear it if no newer value was written meanwhile.
      if (overlay.get(key) === row) overlay.delete(key);
      refresh();
    };
    done.then(settle, settle);
    return done;
  };
  return {
    mode: 'db',
    subscribe(next, fail) {
      const live = listen(db, overlay, next, fail);
      refresh = live.emit;
      return () => {
        refresh = () => undefined;
        live.stop();
      };
    },
    put: (kind, id, row) =>
      write(`${kind}/${id}`, row, () =>
        db
          .collection(kind)
          .doc(id)
          .set({ ...row }),
      ),
    remove: (kind, id) => write(`${kind}/${id}`, null, () => db.collection(kind).doc(id).delete()),
    putLayout: (row) => write(LAYOUT_DOC, row, () => db.doc(LAYOUT_DOC).set({ ...row })),
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
