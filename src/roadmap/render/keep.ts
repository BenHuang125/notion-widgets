// Redraw only what changed. Each piece of the page (a year column, a lane, the goal row) is built
// with a signature of the data it shows; the next redraw reuses the same element when the
// signature is unchanged. So ticking one card rebuilds one column, not the whole board, and
// hover, focus and an ongoing drag elsewhere are left alone.

export interface Keeper {
  /** The element for `key`: the one from last time if `sig` is the same, else a new `build()`. */
  piece(key: string, sig: string, build: () => HTMLElement): HTMLElement;
  /** Forgets pieces not asked for since the last sweep. */
  sweep(): void;
}

export function makeKeeper(): Keeper {
  const cache = new Map<string, { sig: string; node: HTMLElement }>();
  const used = new Set<string>();
  return {
    piece(key, sig, build) {
      used.add(key);
      const hit = cache.get(key);
      if (hit && hit.sig === sig) return hit.node;
      const node = build();
      cache.set(key, { sig, node });
      return node;
    },
    sweep() {
      for (const key of cache.keys()) if (!used.has(key)) cache.delete(key);
      used.clear();
    },
  };
}

/** Puts `nodes` in `parent` in order, touching the page only where something differs. */
export function placeChildren(parent: Element, nodes: readonly Node[]): void {
  const now = parent.childNodes;
  if (now.length === nodes.length && nodes.every((n, i) => now[i] === n)) return;
  parent.replaceChildren(...nodes);
}
