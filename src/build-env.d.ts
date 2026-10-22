// Build-time constants put in by tools/bundle.mjs (esbuild `define`).

/**
 * Each worker's published file name, by worker name (a file `<name>.worker.ts` anywhere in a
 * region). Start one with `new Worker(new URL(__WORKERS__.name, import.meta.url), { type: 'module' })`.
 */
declare const __WORKERS__: Readonly<Record<string, string>>;
