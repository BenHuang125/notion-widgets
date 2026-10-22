// @ts-check
// Bundles every region of src/ (a folder with an index.ts: src/<region>/index.ts) into the files
// the page publishes, and prints them as JSON on stdout for build.py, which writes them to dist/js/
// and points the page's module scripts at the entries (system-template ARCHITECTURE.md §3).
// Copied unchanged into every system from system-template template/tools/bundle.mjs; nothing
// here names a region.
//
// - One entry per region: js/<region>.<hash>.js. Regions use each other (every region reaches the
//   data layer), so the build splits out what they share into js/chunk-<hash>.js files: bundled
//   one by one, a shared region would be copied into several bundles and become several separate,
//   unconnected copies of the same state.
// - A region loaded only when it is needed (reading files, the 3D room) is `import()`ed by the
//   region that needs it; with splitting, esbuild gives it its own file and the import points at
//   it. Bundles and chunks all sit in js/, and an import inside a module is relative to that
//   module's own file, so the paths hold wherever the page is served.
// - Workers: every src/<region>/**/<name>.worker.ts is its own bundle js/<name>.<hash>.js (no
//   splitting: a worker loads alone). Regions get the file names as the build-time constant
//   `__WORKERS__` ({name: "<name>.<hash>.js"}, declared in src/build-env.d.ts) and start one with
//   `new Worker(new URL(__WORKERS__.name, import.meta.url), { type: 'module' })`.
// - Names are esbuild's content hashes, so a changed file gets a new name and an unchanged one
//   keeps its name (a publish only adds the files that changed).
// - Every file has an external source map with the TypeScript inside, so errors name the source.
// - Deterministic: nothing is written here (`write: false`) and the output folder given to esbuild
//   is always <repo>/dist/js, whatever folder build.py is writing to, so the same sources give
//   byte-identical files on every run and machine (`build.py --check` relies on it).
// - Everything the page uses is bundled: the artifact's pages may only load from themselves.
//
// Usage: node tools/bundle.mjs <src dir>     → {"regions": {...}, "workers": {...}, "files": [...]}
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const outdir = join(root, 'dist', 'js');
const WORKER = /\.worker\.ts$/;
/** Region and worker names: build.py and split.py find the files by this shape. */
const NAME = /^[a-z][a-z0-9-]*$/;

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** @param {string} srcDir @returns {string[]} region names, sorted */
export function regionsIn(srcDir) {
  if (!existsSync(srcDir)) return [];
  return readdirSync(srcDir)
    .filter((name) => existsSync(join(srcDir, name, 'index.ts')))
    .sort();
}

/** @type {import('esbuild').BuildOptions} */
const COMMON = {
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  outdir,
  absWorkingDir: root,
  // packages (zod, preact…) come from this repo even when the sources are a copy elsewhere
  // (the build tests bundle a copy in a temp folder)
  nodePaths: [join(root, 'node_modules')],
  minify: true,
  sourcemap: 'linked',
  sourcesContent: true,
  legalComments: 'none',
  charset: 'utf8',
  logLevel: 'silent',
  write: false,
  loader: { '.css': 'text' },
};

/**
 * @param {import('esbuild').OutputFile[]} outputs
 * @returns {{path: string, text: string}[]}
 */
const asFiles = (outputs) =>
  outputs
    .map((f) => ({ path: `js/${relative(outdir, f.path).split('\\').join('/')}`, text: f.text }))
    .sort((a, b) => (a.path < b.path ? -1 : 1));

/** @param {string} kind @param {string} name */
function checkName(kind, name) {
  if (!NAME.test(name) || name === 'chunk') {
    throw new Error(`bundle: ${kind} name "${name}" must be lowercase letters, digits and -`);
  }
}

/**
 * Each worker alone (no splitting: a worker loads by itself).
 * @param {string} srcDir @param {string[]} regions
 * @returns {Promise<{workers: Record<string, string>, files: {path: string, text: string}[]}>}
 */
async function bundleWorkers(srcDir, regions) {
  const sources = regions
    .flatMap((r) => walk(join(srcDir, r)))
    .filter((p) => WORKER.test(p))
    .sort();
  /** @type {Record<string, string>} */
  const workers = {};
  const files = [];
  for (const source of sources) {
    const name = source.replace(/^.*[\\/]/, '').replace(WORKER, '');
    checkName('worker', name);
    if (workers[name]) throw new Error(`bundle: two workers are named ${name}`);
    if (regions.includes(name))
      throw new Error(`bundle: worker ${name} has the same name as a region`);
    const out = await build({
      ...COMMON,
      entryPoints: { [name]: source },
      entryNames: '[name].[hash]',
    });
    const made = asFiles(out.outputFiles ?? []);
    const code = made.find((f) => f.path.endsWith('.js'));
    if (!code) throw new Error(`bundle: no code for worker ${name}`);
    workers[name] = code.path.slice('js/'.length);
    files.push(...made);
  }
  return { workers, files };
}

/**
 * @param {string} srcDir
 * @returns {Promise<{regions: Record<string, string>, workers: Record<string, string>,
 *   files: {path: string, text: string}[]}>}
 */
export async function bundle(srcDir) {
  const regions = regionsIn(srcDir);
  for (const r of regions) checkName('region', r);
  const { workers, files } = await bundleWorkers(srcDir, regions);
  if (!regions.length) return { regions: {}, workers, files };
  const entryPoints = Object.fromEntries(regions.map((r) => [r, join(srcDir, r, 'index.ts')]));
  const out = await build({
    ...COMMON,
    entryPoints,
    splitting: true,
    entryNames: '[name].[hash]',
    chunkNames: 'chunk-[hash]',
    metafile: true,
    define: { __WORKERS__: JSON.stringify(workers) },
  });
  /** @type {Record<string, string>} */
  const names = {};
  for (const [path, meta] of Object.entries(out.metafile?.outputs ?? {})) {
    const at = meta.entryPoint ? resolve(root, meta.entryPoint) : '';
    const region = regions.find((r) => at === entryPoints[r]);
    if (region) names[region] = `js/${relative(outdir, resolve(root, path)).split('\\').join('/')}`;
  }
  files.push(...asFiles(out.outputFiles ?? []));
  return { regions: names, workers, files };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = await bundle(resolve(process.argv[2] ?? join(root, 'src')));
  process.stdout.write(JSON.stringify(out));
}
