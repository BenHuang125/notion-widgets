// Working calendar — month grid, hover card, drag to move, event dialog.
import { addDays, dayKey, fmt, monthCells, monthStart, parseKey, projectColor, today, uid } from './core.js?v=1';
import { $, app, h, say } from './dom.js?v=1';

const MAX_CHIPS = 3;
const DRAG_START_PX = 8; // same threshold as the roadmap (vis-timeline)
const HOVER_DELAY_MS = 140;
const KEY_STEP = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const view = { month: monthStart(today()) };

const project = (id) => app.state.projects.find((p) => p.id === id) ?? app.state.projects[0];
const eventsOn = (k) => app.state.events.filter((e) => e.date === k);
const findEvent = (id) => app.state.events.find((e) => e.id === id);

/* ---------- grid ---------- */
function chip(ev) {
  const p = project(ev.projectId);
  const el = h('button', { type: 'button', className: 'chip', 'data-id': ev.id },
    h('i', { className: 'dot' }), h('span', { className: 't' }, ev.title));
  el.style.setProperty('--c', projectColor(p?.order ?? 0));
  el.setAttribute('aria-label', `${ev.title}. Enter to edit, Alt + arrow keys to move.`);
  return el;
}
function dayCell(d, todayKey) {
  const k = dayKey(d);
  const list = eventsOn(k);
  const cls = ['day', d.getMonth() !== view.month.getMonth() && 'other', k === todayKey && 'today'];
  const cell = h('div', { className: cls.filter(Boolean).join(' '), 'data-date': k },
    h('div', { className: 'num' }, h('b', {}, String(d.getDate())), h('span', { className: 'plus' }, '+')));
  for (const ev of list.slice(0, MAX_CHIPS)) cell.append(chip(ev));
  if (list.length > MAX_CHIPS)
    cell.append(h('button', { type: 'button', className: 'more', 'data-more': k }, `+${list.length - MAX_CHIPS} more`));
  return cell;
}
export function renderCalendar() {
  $('calTitle').textContent = fmt(view.month, { month: 'long', year: 'numeric' });
  const heads = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((t) => h('div', { className: 'dow' }, t));
  const todayKey = dayKey(today());
  $('grid').replaceChildren(...heads, ...monthCells(view.month).map((d) => dayCell(d, todayKey)));
}
function shiftMonth(n) {
  const m = view.month;
  view.month = n === 0 ? monthStart(today()) : new Date(m.getFullYear(), m.getMonth() + n, 1);
  renderCalendar();
}

/* ---------- hover card: popover + CSS anchor positioning (JS fallback for older browsers) ---------- */
const hover = { timer: 0, anchor: null, native: globalThis.CSS?.supports?.('anchor-name: --x') };
function hoverContent(ev) {
  const p = project(ev.projectId);
  const dot = h('i', { className: 'dot' });
  dot.style.setProperty('--c', projectColor(p?.order ?? 0));
  return [
    h('div', { className: 'hc-proj' }, dot, p?.name ?? ''),
    h('div', { className: 'hc-title' }, ev.title),
    h('div', { className: 'hc-date' }, fmt(parseKey(ev.date), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })),
    h('div', { className: 'hc-body' }, ev.body || ''),
  ];
}
function placeByScript(chipEl, card) {
  const r = chipEl.getBoundingClientRect();
  const below = r.bottom + 6 + card.offsetHeight < innerHeight;
  card.style.left = `${Math.max(8, Math.min(r.left, innerWidth - card.offsetWidth - 8))}px`;
  card.style.top = `${below ? r.bottom + 6 : r.top - card.offsetHeight - 6}px`;
}
function showHover(chipEl) {
  const ev = findEvent(chipEl.dataset.id);
  const card = $('hovercard');
  if (!ev || drag.active) return;
  card.replaceChildren(...hoverContent(ev));
  if (hover.anchor) hover.anchor.style.anchorName = '';
  hover.anchor = chipEl;
  chipEl.style.anchorName = '--hover-ev';
  if (!card.matches(':popover-open')) card.showPopover();
  if (!hover.native) placeByScript(chipEl, card);
}
function hoverSoon(chipEl) {
  clearTimeout(hover.timer);
  hover.timer = setTimeout(() => showHover(chipEl), HOVER_DELAY_MS);
}
export function hideHover() {
  clearTimeout(hover.timer);
  const card = $('hovercard');
  if (card.matches(':popover-open')) card.hidePopover();
}

/* ---------- drag to move: pointer events, one path for mouse, pen and touch ---------- */
const drag = { active: false, start: null, chipEl: null, ghost: null, target: null };
function dragDown(e, chipEl) {
  if (e.button !== 0) return;
  Object.assign(drag, { start: { x: e.clientX, y: e.clientY }, chipEl });
  chipEl.setPointerCapture(e.pointerId);
}
function lift() {
  hideHover();
  drag.active = true;
  drag.ghost = drag.chipEl.cloneNode(true);
  drag.ghost.classList.add('ghost');
  drag.ghost.style.width = `${drag.chipEl.offsetWidth}px`;
  document.body.append(drag.ghost);
  drag.chipEl.classList.add('lifted');
}
function dragMove(e) {
  if (!drag.chipEl) return;
  if (!drag.active && Math.hypot(e.clientX - drag.start.x, e.clientY - drag.start.y) > DRAG_START_PX) lift();
  if (!drag.active) return;
  drag.ghost.style.transform = `translate(${e.clientX - 16}px, ${e.clientY - 10}px)`;
  const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('.day') ?? null;
  if (cell === drag.target) return;
  drag.target?.classList.remove('drop');
  drag.target = cell;
  cell?.classList.add('drop');
}
function dragReset() {
  drag.ghost?.remove();
  drag.chipEl?.classList.remove('lifted');
  drag.target?.classList.remove('drop');
  Object.assign(drag, { active: false, chipEl: null, ghost: null, target: null });
}
function dragUp() {
  const { active, chipEl, target } = drag;
  dragReset();
  if (!chipEl) return;
  if (!active) openEditor({ id: chipEl.dataset.id });
  else if (target) moveEvent(chipEl.dataset.id, target.dataset.date);
}
function moveEvent(id, date) {
  const ev = findEvent(id);
  if (!ev || !date || ev.date === date) return;
  ev.date = date;
  app.commit();
  renderCalendar();
  say(`Moved ${ev.title} to ${fmt(parseKey(date), { day: 'numeric', month: 'long' })}`);
  document.querySelector(`.chip[data-id="${id}"]`)?.focus();
}
function keyboardMove(e, chipEl) {
  const step = KEY_STEP[e.key];
  if (!step || !e.altKey) return;
  e.preventDefault();
  const ev = findEvent(chipEl.dataset.id);
  const to = addDays(parseKey(ev.date), step);
  view.month = monthStart(to);
  moveEvent(ev.id, dayKey(to));
}

/* ---------- event dialog (native <dialog>) ---------- */
const editor = { id: null };
function syncDot() {
  $('evDot').style.setProperty('--c', projectColor(project($('evProject').value)?.order ?? 0));
}
function openEditor({ id, date }) {
  hideHover();
  $('dayDlg').close();
  const ev = id ? findEvent(id) : null;
  editor.id = ev?.id ?? null;
  $('evMode').textContent = ev ? 'Edit event' : 'New event';
  $('evTitle').value = ev?.title ?? '';
  $('evBody').value = ev?.body ?? '';
  $('evDate').value = ev?.date ?? date;
  const chosen = ev?.projectId ?? app.state.projects[0]?.id;
  $('evProject').replaceChildren(...app.state.projects.map((p) =>
    h('option', { value: p.id, selected: p.id === chosen }, p.name)));
  syncDot();
  $('evDelete').hidden = !ev;
  disarm();
  $('evDlg').showModal();
  $('evTitle').focus();
}
function saveEditor(e) {
  e.preventDefault();
  const data = { title: $('evTitle').value.trim(), body: $('evBody').value.trim(), projectId: $('evProject').value, date: $('evDate').value };
  if (!data.title || !data.date) return;
  if (editor.id) Object.assign(findEvent(editor.id), data);
  else app.state.events.push({ id: uid(), ...data });
  app.commit();
  $('evDlg').close();
  view.month = monthStart(parseKey(data.date));
  renderCalendar();
  say(`Saved ${data.title}`);
}
function disarm() {
  $('evDelete').classList.remove('armed');
  $('evDelete').textContent = 'Delete';
}
function deleteClick() {
  const b = $('evDelete');
  if (!b.classList.contains('armed')) {
    b.classList.add('armed');
    b.textContent = 'Confirm delete';
    return;
  }
  app.state.events = app.state.events.filter((e) => e.id !== editor.id);
  app.commit();
  $('evDlg').close();
  renderCalendar();
  say('Event deleted');
}
function openDayList(k) {
  $('dayDlgTitle').textContent = fmt(parseKey(k), { weekday: 'long', day: 'numeric', month: 'long' });
  $('dayDlgList').replaceChildren(...eventsOn(k).map((ev) => {
    const c = chip(ev);
    c.addEventListener('click', () => openEditor({ id: ev.id }));
    return c;
  }));
  $('dayDlgAdd').onclick = () => openEditor({ date: k });
  $('dayDlg').showModal();
}

/* ---------- wiring ---------- */
function onGridClick(e) {
  const more = e.target.closest('.more');
  if (more) return openDayList(more.dataset.more);
  const c = e.target.closest('.chip');
  if (c) return e.detail === 0 ? openEditor({ id: c.dataset.id }) : undefined; // keyboard Enter
  const cell = e.target.closest('.day');
  if (cell) openEditor({ date: cell.dataset.date });
}
function wireGrid() {
  const g = $('grid');
  const chipOf = (e) => e.target.closest?.('.chip');
  g.addEventListener('pointerdown', (e) => chipOf(e) && dragDown(e, chipOf(e)));
  g.addEventListener('pointermove', dragMove);
  g.addEventListener('pointerup', dragUp);
  g.addEventListener('pointercancel', dragReset);
  g.addEventListener('click', onGridClick);
  g.addEventListener('keydown', (e) => chipOf(e) && keyboardMove(e, chipOf(e)));
  g.addEventListener('pointerover', (e) => chipOf(e) && !drag.active && hoverSoon(chipOf(e)));
  g.addEventListener('pointerout', (e) => chipOf(e) && !e.relatedTarget?.closest?.('.chip') && hideHover());
  g.addEventListener('focusin', (e) => chipOf(e) && showHover(chipOf(e)));
  g.addEventListener('focusout', hideHover);
}
function wireDialogs() {
  $('evForm').addEventListener('submit', saveEditor);
  $('evProject').addEventListener('change', syncDot);
  $('evDelete').addEventListener('click', deleteClick);
  $('evCancel').onclick = () => $('evDlg').close();
  $('evClose').onclick = () => $('evDlg').close();
  $('dayDlgClose').onclick = () => $('dayDlg').close();
  for (const d of [$('evDlg'), $('dayDlg')]) d.addEventListener('click', (e) => e.target === d && d.close());
}
export function startCalendar() {
  $('calPrev').onclick = () => shiftMonth(-1);
  $('calNext').onclick = () => shiftMonth(1);
  $('calToday').onclick = () => shiftMonth(0);
  wireGrid();
  wireDialogs();
  renderCalendar();
}
