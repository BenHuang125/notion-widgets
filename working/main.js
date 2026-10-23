// Working calendar — start-up. Projects come from the Notion embed link (#projects=A,B,C);
// a new name there joins the list with the next colour, existing projects keep theirs.
import { startCalendar } from './calendar.js?v=1';
import { mergeProjects, projectsFromHash, uid } from './core.js?v=1';
import { app, showError } from './dom.js?v=1';
import { startSide } from './side.js?v=1';

addEventListener('error', (e) => showError(`Something went wrong: ${e.message}`));
addEventListener('unhandledrejection', (e) => showError(`Something went wrong: ${e.reason}`));

function syncProjects() {
  const names = projectsFromHash(location.hash);
  const before = app.state.projects.length;
  app.state.projects = mergeProjects(app.state.projects, names.length ? names : ['Personal'], uid);
  if (app.state.projects.length !== before) app.commit();
}

try {
  syncProjects();
  startCalendar();
  startSide();
  document.body.classList.add('ready');
} catch (e) {
  showError(`Could not start: ${e.message}`);
}
