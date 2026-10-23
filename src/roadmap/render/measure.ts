// Text widths for flag labels, measured with the same fonts the page uses (a canvas measures
// without touching the page). Falls back to a generous estimate if canvas is unavailable.

const TITLE_FONT =
  '600 12.5px -apple-system, "Segoe UI", "PingFang TC", "Noto Sans TC", sans-serif';
const STATUS_FONT = '11px -apple-system, "Segoe UI", "PingFang TC", "Noto Sans TC", sans-serif';
/** Per character, when nothing can be measured: wide (CJK) and narrow (Latin, digits). */
const WIDE_PX = 13;
const NARROW_PX = 7.5;
const WIDE_FROM = 0x2e80;

let ctx: CanvasRenderingContext2D | null | undefined;

function context(): CanvasRenderingContext2D | null {
  if (ctx === undefined) {
    try {
      ctx = document.createElement('canvas').getContext('2d');
    } catch {
      ctx = null;
    }
  }
  return ctx;
}

function estimate(text: string): number {
  let w = 0;
  for (const ch of text) w += (ch.codePointAt(0) ?? 0) >= WIDE_FROM ? WIDE_PX : NARROW_PX;
  return w;
}

function width(text: string, font: string): number {
  const c = context();
  if (!c) return estimate(text);
  c.font = font;
  return c.measureText(text).width;
}

/** The wider of a flag label's two lines. */
export const labelWidth = (title: string, status: string): number =>
  Math.ceil(Math.max(width(title, TITLE_FONT), width(status, STATUS_FONT)));
