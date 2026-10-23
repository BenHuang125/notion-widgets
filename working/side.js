// Working calendar — the day box (to-dos, separate from the calendar) and the weekly review.
import { addDays, dayKey, fmt, today, uid, weekOf, weekStart } from './core.js?v=1';
import { $, app, h } from './dom.js?v=1';

const SAVE_DELAY_MS = 300;
const TEXT_COLOURS = [['1', 'Ink', '--ink'], ['2', 'Brown', '--brown'], ['3', 'Rose', '--t-rose'], ['4', 'Moss', '--p-moss'], ['5', 'Slate', '--t-slate'], ['6', 'Grey', '--soft']];

/* ---------- day box ---------- */
const day = { date: today() };
const todosOf = (d) => {
  app.state.todos[dayKey(d)] ??= [];
  return app.state.todos[dayKey(d)];
};
function todoRow(t) {
  return h('li', { className: `todo${t.done ? ' done' : ''}`, 'data-id': t.id },
    h('input', { type: 'checkbox', checked: t.done, 'aria-label': t.text }),
    h('span', { className: 'tx' }, t.text),
    h('button', { type: 'button', className: 'del', 'aria-label': `Delete ${t.text}` }, '×'));
}
function renderDay() {
  const d = day.date;
  const list = app.state.todos[dayKey(d)] ?? [];
  $('tdWeekday').textContent = fmt(d, { weekday: 'long' });
  $('tdDate').textContent = fmt(d, { day: 'numeric', month: 'long', year: 'numeric' });
  $('tdToday').hidden = dayKey(d) === dayKey(today());
  $('tdCount').textContent = list.length ? `${list.filter((t) => t.done).length}/${list.length}` : '';
  const sorted = [...list].sort((a, b) => a.done - b.done);
  $('todoList').replaceChildren(...(sorted.length ? sorted.map(todoRow) : [h('li', { className: 'empty' }, 'Nothing planned')]));
}
function onTodoClick(e) {
  const row = e.target.closest('.todo');
  if (!row) return;
  const items = todosOf(day.date);
  const t = items.find((x) => x.id === row.dataset.id);
  if (e.target.matches('input')) t.done = e.target.checked;
  else if (e.target.closest('.del')) items.splice(items.indexOf(t), 1);
  else return;
  app.commit();
  renderDay();
}
function wireDay() {
  $('todoForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('todoInput').value.trim();
    if (!text) return;
    todosOf(day.date).push({ id: uid(), text, done: false });
    $('todoInput').value = '';
    app.commit();
    renderDay();
  });
  $('todoList').addEventListener('click', onTodoClick);
  const go = (n) => {
    day.date = n === 0 ? today() : addDays(day.date, n);
    renderDay();
  };
  $('tdPrev').onclick = () => go(-1);
  $('tdNext').onclick = () => go(1);
  $('tdToday').onclick = () => go(0);
}

/* ---------- weekly review: a bullet list Ben types into, with his own text colours ---------- */
const rv = { week: Math.max(1, weekOf(today())), timer: 0 };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function inline(node) {
  let out = '';
  for (const n of node.childNodes) {
    if (n.nodeType === Node.TEXT_NODE) out += esc(n.nodeValue);
    else if (n.nodeName === 'BR') out += '<br>';
    else if (n.nodeName === 'SPAN' && /^[2-6]$/.test(n.dataset.c ?? '')) out += `<span data-c="${n.dataset.c}">${inline(n)}</span>`;
    else out += inline(n);
  }
  return out;
}
/** Keeps only list items, line breaks and colour spans — nothing else survives a save or a load. */
export function cleanList(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return [...tpl.content.querySelectorAll('li')].map((li) => `<li>${inline(li) || '<br>'}</li>`).join('');
}
function markBlank() {
  $('review').classList.toggle('blank', $('review').textContent.trim() === '');
}
function renderReview() {
  const s = weekStart(rv.week);
  const range = (d) => fmt(d, { day: 'numeric', month: 'short' });
  $('rvWeek').textContent = `Week ${rv.week}`;
  $('rvRange').textContent = `${range(s)} – ${range(addDays(s, 6))}`;
  $('rvPrev').disabled = rv.week <= 1;
  $('review').innerHTML = cleanList(app.state.reviews[rv.week] ?? '') || '<li><br></li>';
  markBlank();
}
function saveReview() {
  clearTimeout(rv.timer);
  app.state.reviews[rv.week] = cleanList($('review').innerHTML);
  app.commit();
}
const saveSoon = () => {
  clearTimeout(rv.timer);
  rv.timer = setTimeout(saveReview, SAVE_DELAY_MS);
};
function colourRange(r, c) {
  const frag = r.extractContents();
  for (const s of frag.querySelectorAll('span[data-c]')) s.replaceWith(...s.childNodes);
  if (c === '1') return r.insertNode(frag);
  const span = h('span', { 'data-c': c });
  span.append(frag);
  r.insertNode(span);
}
function applyColour(c) {
  const sel = getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const ul = $('review');
  if (!ul.contains(range.commonAncestorContainer)) return;
  const parts = [...ul.children].filter((li) => range.intersectsNode(li)).map((li) => {
    const r = document.createRange();
    r.selectNodeContents(li);
    if (li.contains(range.startContainer)) r.setStart(range.startContainer, range.startOffset);
    if (li.contains(range.endContainer)) r.setEnd(range.endContainer, range.endOffset);
    return r;
  });
  for (const r of parts) colourRange(r, c);
  sel.removeAllRanges();
  saveSoon();
}
function wireReview() {
  const swatches = TEXT_COLOURS.map(([c, name, token]) => {
    const b = h('button', { type: 'button', className: 'swatch', title: name, 'aria-label': `Text colour ${name}`, 'data-c': c });
    b.style.setProperty('--c', `var(${token})`);
    return b;
  });
  $('palette').replaceChildren(...swatches);
  $('palette').addEventListener('pointerdown', (e) => e.preventDefault()); // keep the text selection
  $('palette').addEventListener('click', (e) => e.target.closest('.swatch') && applyColour(e.target.closest('.swatch').dataset.c));
  const ul = $('review');
  ul.addEventListener('input', () => {
    if (!ul.querySelector('li')) ul.innerHTML = '<li><br></li>';
    markBlank();
    saveSoon();
  });
  ul.addEventListener('paste', (e) => {
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  });
  const go = (n) => {
    saveReview();
    rv.week = Math.max(1, rv.week + n);
    renderReview();
  };
  $('rvPrev').onclick = () => go(-1);
  $('rvNext').onclick = () => go(1);
}

export function startSide() {
  wireDay();
  wireReview();
  renderDay();
  renderReview();
}
