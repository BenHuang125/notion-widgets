// One write at a time per document (the database's rule), newest wins.
// Writes to different documents go out side by side. If a document gets a new value while its
// previous write is still on the way, the in-between values are skipped: only the newest is sent
// next. Ticking and unticking a card quickly therefore costs at most two writes, never a pile-up.

export type Write = () => Promise<void>;

interface Slot {
  /** The newest write still to send, if any. */
  next: Write | null;
  /** Everyone waiting on a value that has not been sent yet. */
  waiting: { ok: () => void; fail: (e: unknown) => void }[];
  busy: boolean;
}

export interface Writer {
  /** Queues `write` for document `key`; resolves when it (or a newer value) is saved. */
  send(key: string, write: Write): Promise<void>;
}

export function makeWriter(): Writer {
  const slots = new Map<string, Slot>();
  const pump = async (key: string, slot: Slot): Promise<void> => {
    slot.busy = true;
    while (slot.next) {
      const write = slot.next;
      const waiting = slot.waiting;
      slot.next = null;
      slot.waiting = [];
      try {
        await write();
        for (const w of waiting) w.ok();
      } catch (e) {
        for (const w of waiting) w.fail(e);
      }
    }
    slot.busy = false;
    slots.delete(key);
  };
  return {
    send(key, write) {
      const slot = slots.get(key) ?? { next: null, waiting: [], busy: false };
      slots.set(key, slot);
      slot.next = write;
      const done = new Promise<void>((ok, fail) => slot.waiting.push({ ok, fail }));
      if (!slot.busy) void pump(key, slot);
      return done;
    },
  };
}
