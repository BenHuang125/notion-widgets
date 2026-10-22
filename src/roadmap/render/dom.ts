// Small helpers for building the page. Text always goes in as text, never as HTML.

type Attrs = Readonly<Record<string, string | number | boolean | null | undefined>>;
type Child = Node | string | null | undefined | false;

/** An HTML element with attributes and children; `false`/`null` attributes are left out. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

export function append(el: Element, children: readonly Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c);
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** An SVG element (shapes are built as nodes, so no markup strings reach the page). */
export function s(tag: string, attrs: Attrs = {}, ...children: Child[]): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

/** An icon from the fixed set below, drawn in the current text color. */
export function icon(name: IconName, label?: string): SVGElement {
  const svg = s('svg', {
    viewBox: '0 0 24 24',
    class: `ico ico-${name}`,
    'aria-hidden': label ? null : 'true',
    role: label ? 'img' : null,
    'aria-label': label ?? null,
  });
  for (const d of ICONS[name]) {
    svg.append(s('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8 }));
  }
  svg.querySelectorAll('path').forEach((p) => {
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
  });
  return svg;
}

export type IconName = 'plus' | 'check' | 'grip' | 'close' | 'trash';

const ICONS: Record<IconName, readonly string[]> = {
  plus: ['M12 5v14', 'M5 12h14'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  grip: ['M9 6h.01', 'M15 6h.01', 'M9 12h.01', 'M15 12h.01', 'M9 18h.01', 'M15 18h.01'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13'],
};

/** The palette key as a CSS color (each key is a token in the page's style sheet). */
export const paletteColor = (key: string): string => `var(--p-${key})`;
