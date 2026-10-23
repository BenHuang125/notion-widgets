// Working calendar — start-up. Projects come from the Notion embed link (#projects=A,B,C);
// a new name there joins the list with the next colour, existing projects keep theirs.
import { startCalendar } from './calendar.js?v=2';
import { mergeProjects, projectsFromHash, uid } from './core.js?v=2';
import { app, showError } from './dom.js?v=2';
import { startSide } from './side.js?v=2';

addEventListener('error', (e) => showError(`Something went wrong: ${e.message}`));
addEventListener('unhandledrejection', (e) => showError(`Something went wrong: ${e.reason}`));

function syncProjects() {
  const items = projectsFromHash(location.hash);
  const before = JSON.stringify(app.state.projects);
  app.state.projects = mergeProjects(app.state.projects, items.length ? items : [{ nid: null, name: 'Personal', aliases: [] }], uid);
  if (JSON.stringify(app.state.projects) !== before) app.commit();
}

try {
  syncProjects();
  startCalendar();
  startSide();
  document.body.classList.add('ready');
} catch (e) {
  showError(`Could not start: ${e.message}`);
}
