// Sliding left and right: drag with the mouse (with a little glide after letting go),
// trackpad swipes, and Shift + wheel. Clicks on cards still work: a press only becomes a
// drag after it has moved a few pixels, and the click that ends a drag is swallowed.

/** Dead zone before a press becomes a drag (Hammer.js and drag-scroll libraries use 9–10). */
const DRAG_START_PX = 8;
/** Speed kept per frame after letting go (about 60 frames a second). */
const GLIDE_KEEP = 0.94;
/** Below this speed (px per ms) the glide stops. */
const GLIDE_STOP = 0.02;
const FRAME_MS = 16;
/** Only the most recent moves count toward the release speed. */
const SPEED_WINDOW_MS = 80;
/** Line-mode wheels (Firefox): pixels per line, as vis-timeline does. */
const LINE_PX = 40;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

/**
 * Where a drag never starts: typing fields and handles with their own drag. Buttons (cards)
 * are fine: under the dead zone it stays a click, past it the click is swallowed.
 */
const INTERACTIVE = 'input, select, textarea, [data-nodrag]';

export interface Clock {
  now(): number;
  frame(cb: () => void): number;
  cancel(id: number): void;
}

export const browserClock: Clock = {
  now: () => performance.now(),
  frame: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
};

/** Mouse wheels report lines in Firefox; make every wheel a pixel count. */
export function wheelPixels(delta: number, mode: number, pageWidth: number): number {
  if (mode === DOM_DELTA_LINE) return delta * LINE_PX;
  if (mode === DOM_DELTA_PAGE) return delta * pageWidth;
  return delta;
}

/**
 * An up/down wheel slides `el` sideways — only while it can still move that way,
 * so at either end the page scrolls as usual. With `onlyOver`, only over those parts.
 */
export function wheelSlides(el: HTMLElement, onlyOver?: string): void {
  el.addEventListener(
    'wheel',
    (e) => {
      if (onlyOver && !(e.target as Element).closest(onlyOver)) return;
      // deltaMode must be read before the deltas, or Firefox reports pixels for line wheels.
      const mode = e.deltaMode;
      // Sideways swipes and Shift+wheel (turned into deltaX by the OS) scroll natively; Ctrl = zoom.
      if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const before = el.scrollLeft;
      el.scrollLeft += wheelPixels(e.deltaY, mode, el.clientWidth);
      if (el.scrollLeft !== before) e.preventDefault();
    },
    { passive: false },
  );
}

interface DragState {
  readonly id: number;
  readonly startX: number;
  readonly startLeft: number;
  dragging: boolean;
  samples: { t: number; x: number }[];
}

/** Drag-to-slide with a glide. Returns a function that removes the listeners. */
export function dragSlides(el: HTMLElement, clock: Clock = browserClock): () => void {
  let drag: DragState | null = null;
  let stopGlide = (): void => undefined;
  let dropClickTrap = (): void => undefined;
  const down = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if ((e.target as Element).closest(INTERACTIVE)) return;
    stopGlide();
    dropClickTrap();
    drag = {
      id: e.pointerId,
      startX: e.clientX,
      startLeft: el.scrollLeft,
      dragging: false,
      samples: [],
    };
  };
  const move = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.startX;
    if (!drag.dragging && Math.abs(dx) < DRAG_START_PX) return;
    if (!drag.dragging) {
      drag.dragging = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
    }
    el.scrollLeft = drag.startLeft - dx;
    const t = clock.now();
    drag.samples = [...drag.samples.filter((p) => t - p.t < SPEED_WINDOW_MS), { t, x: e.clientX }];
  };
  const up = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return;
    const was = drag;
    drag = null;
    if (!was.dragging) return;
    el.classList.remove('is-dragging');
    dropClickTrap = swallowNextClick(el);
    stopGlide = startGlide(el, releaseSpeed(was.samples), clock);
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', () => stopGlide(), { passive: true });
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    stopGlide();
  };
}

/** Pixels per millisecond over the last few moves (positive = pointer went right). */
export function releaseSpeed(samples: readonly { t: number; x: number }[]): number {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last || last.t === first.t) return 0;
  return (last.x - first.x) / (last.t - first.t);
}

/** Starts the glide; the returned function stops it. */
function startGlide(el: HTMLElement, speed: number, clock: Clock): () => void {
  let v = speed;
  let id = 0;
  const step = (): void => {
    if (Math.abs(v) < GLIDE_STOP) return;
    el.scrollLeft -= v * FRAME_MS;
    v *= GLIDE_KEEP;
    id = clock.frame(step);
  };
  id = clock.frame(step);
  return () => clock.cancel(id);
}

/** Swallows the click that ends a drag; the returned function removes the trap if none came. */
function swallowNextClick(el: HTMLElement): () => void {
  const stop = (e: Event): void => {
    e.stopPropagation();
    e.preventDefault();
  };
  el.addEventListener('click', stop, { capture: true, once: true });
  return () => el.removeEventListener('click', stop, { capture: true });
}
