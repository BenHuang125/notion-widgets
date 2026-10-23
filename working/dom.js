// Working calendar — shared app state and small DOM helpers.
import { readState, writeState } from './core.js?v=2';

const storage = (() => {
  try {
    return globalThis.localStorage;
  } catch {
    return null; // storage blocked: keep working in memory
  }
})();

export const app = {
  state: storage ? readState(storage) : { v: 1, projects: [], events: [], todos: {}, reviews: {} },
  commit() {
    if (storage && !writeState(storage, this.state)) showError('Could not save in this browser.');
  },
};

export const $ = (id) => document.getElementById(id);

/** Element with properties (or attributes for names that are not properties) and children. */
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k in el && !k.includes('-')) el[k] = v;
    else el.setAttribute(k, v);
  }
  el.append(...kids.filter((x) => x != null));
  return el;
}

export const say = (msg) => {
  $('live').textContent = msg;
};

export function showError(msg) {
  const bar = $('err');
  bar.textContent = msg;
  bar.hidden = false;
}
