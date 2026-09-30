// hash router.
// Site-wide: #home, #route (the five-stage pathway), #route-<stage> (preview of a stage), #console
// Per course: ML links have no prefix (#ch11, #s11-2-2, #route-ml, #route-15, #recall, #quiz-13, #review)
//             Python links start with py/ (#py/ch6, #py/s6-2-1, #py/route, #py/route-6, #py/recall, #py/quiz-6)
import { $, $$, M, C, setCourse } from './core.js';
import { Home } from './views/home.js';
import { Metro } from './views/metro.js';
import { Path } from './views/path.js';
import { TRACK } from './tracks.js';
import { Reader } from './views/reader.js';
import { Recall } from './views/recall.js';
import { Con } from './views/console.js';

/* ======================= router ======================= */
const VIEWS = ['home', 'path', 'metro', 'console', 'recall', 'read'];
let curView = null, ticket = 0;
function show(v) {
  if (v !== curView && v !== 'read') scrollTo({ top: 0, behavior: 'instant' });
  curView = v;
  VIEWS.forEach(k => $('#v-' + k).hidden = k !== v);
  $$('.rail a').forEach(a => a.classList.toggle('on', a.dataset.v === (v === 'path' ? 'metro' : v)));
  if (v !== 'read') document.title = 'Gradient Atlas';
}
async function route() {
  if (!M) return;
  const my = ++ticket;
  let h = decodeURIComponent(location.hash.slice(1)) || 'home', m;
  // site-wide pages
  if (h === 'home') { show('home'); Home.render(); return; }
  if (h === 'route') { show('path'); Path.show(null); return; }
  if (h === 'console') { show('console'); Con.boot(); return; }
  // old map links: #map goes home, #node-c11 opens Chapter 11, #node-s11-2 opens that section
  if (h === 'map') { location.replace('#home'); return; }
  if ((m = h.match(/^node-c(\d+)$/))) { location.replace('#ch' + m[1]); return; }
  if ((m = h.match(/^node-(s\d+(?:-\d+)+)$/))) { location.replace('#' + m[1]); return; }
  if ((m = h.match(/^route-([a-z]+)$/)) && TRACK[m[1]] && m[1] !== 'ml') {
    const t = TRACK[m[1]];
    if (t.status === 'live') { location.replace(t.href); return; }
    show('path'); Path.show(m[1]); return;
  }
  // course pages
  let course = 'ml';
  if ((m = h.match(/^py\/(.*)$/))) { course = 'py'; h = m[1] || 'route'; }
  if (h === 'route-ml' || h === 'metro') h = 'route';
  try { await setCourse(course); } catch { $('.stage').insertAdjacentHTML('afterbegin', '<p class="loading" style="padding:40px">This course didn\'t load. Reload the page to try again.</p>'); return; }
  if (my !== ticket) return;
  $('.rail a[data-v="recall"]').href = '#' + C.pfx + 'recall';
  if (h === 'route') { show('metro'); Metro.build(); return; }
  if ((m = h.match(/^route-(\d+)$/))) { show('metro'); Metro.build(); Metro.setRoute(+m[1]); return; }
  if (h === 'recall') { show('recall'); Recall.dash(); return; }
  if ((m = h.match(/^quiz-(\d+)$/))) { show('recall'); Recall.quiz(+m[1]); return; }
  if (h === 'review') { show('recall'); Recall.review(); return; }
  if ((m = h.match(/^ch(\d+)$/))) { show('read'); Reader.open(+m[1]); return; }
  if ((m = h.match(/^s(\d+)(?:-\d+)+$/))) { show('read'); Reader.open(+m[1], h); return; }
  show('home'); Home.render();
}
addEventListener('hashchange', route);
const go = h => { if (h !== 'console') document.getElementById('cmd').blur(); if (location.hash.slice(1) === h) route(); else location.hash = h; };
// go to a page inside the current course
const goC = p => go(C.pfx + p);

export { VIEWS, curView, show, route, go, goC };
