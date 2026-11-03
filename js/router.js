// router: every page has a normal URL (see js/paths.js), and the code below works on route keys.
// Site-wide: home, route (the five-stage pathway), route-<stage> (preview of a stage), console
// Per course: ML keys have no prefix (ch11, s11-2-2, route-ml, route-15, recall, quiz-13, review)
//             Python keys start with py/ (py/ch6, py/s6-2-1, py/route, py/route-6, py/recall, py/quiz-6)
import { $, $$, M, C, setCourse } from './core.js';
import { toPath, toKey, isKey } from './paths.js';
import { Home } from './views/home.js';
import { Metro } from './views/metro.js';
import { Path } from './views/path.js';
import { TRACK } from './tracks.js';
import { Reader } from './views/reader.js';
import { Recall } from './views/recall.js';
import { Con } from './views/console.js';

// an old /#key link becomes its normal URL before anything reads the address
if (location.pathname === '/' && isKey(location.hash.slice(1))) history.replaceState(null, '', toPath(toKey()));

/* ======================= router ======================= */
const VIEWS = ['home', 'path', 'metro', 'console', 'recall', 'read'];
let curView = null, ticket = 0;
// a page written for this address already has the right title for search engines, so keep it until the first navigation
// (search, quizzes and old /#key links get the home page instead, so they set their own)
const canon = document.querySelector('link[rel="canonical"]');
let served = !!canon && new URL(canon.href).pathname === location.pathname;
const setTitle = t => { if (!served) document.title = t; };
function show(v) {
  if (v !== curView && v !== 'read') scrollTo({ top: 0, behavior: 'instant' });
  curView = v;
  VIEWS.forEach(k => $('#v-' + k).hidden = k !== v);
  $$('.rail a').forEach(a => a.classList.toggle('on', a.dataset.v === (v === 'path' ? 'metro' : v)));
  if (v !== 'read' && v !== 'path') setTitle(TITLES[v]());
}
const TITLES = {
  home: () => 'Gradient Atlas: Data Science Roadmap, Python, Machine Learning & GenAI',
  metro: () => C.id === 'py' ? 'Python for Data Science: Free Course | Gradient Atlas' : 'Machine Learning for Data Science: Free Course | Gradient Atlas',
  console: () => 'Search | Gradient Atlas',
  recall: () => `${C.name} Flashcards and Quizzes | Gradient Atlas`,
};
const STAGE_TITLES = {
  libs: 'Python Libraries for Data Science: NumPy, pandas, Matplotlib | Gradient Atlas',
  dl: 'Deep Learning Roadmap: Neural Networks to Transformers | Gradient Atlas',
  genai: 'Generative AI Roadmap: LLMs, RAG and LangChain | Gradient Atlas',
};
const replace = k => { history.replaceState(null, '', toPath(k)); route(); };
async function route() {
  if (!M) return;
  const my = ++ticket;
  let h = toKey(), m;
  // the text the server sent for search engines stays only on the page it describes
  const seo = $('#seo'); if (seo && seo.dataset.key !== h) seo.remove();
  // site-wide pages
  if (h === 'home') { show('home'); Home.render(); return; }
  if (h === 'route') { show('path'); setTitle('Data Science Roadmap 2026: Python to Generative AI | Gradient Atlas'); Path.show(null); return; }
  if (h === 'console') { show('console'); Con.boot(); return; }
  // old map links: #map goes home, #node-c11 opens Chapter 11, #node-s11-2 opens that section
  if (h === 'map') { replace('home'); return; }
  if ((m = h.match(/^node-c(\d+)$/))) { replace('ch' + m[1]); return; }
  if ((m = h.match(/^node-(s\d+(?:-\d+)+)$/))) { replace(m[1]); return; }
  if ((m = h.match(/^route-([a-z]+)$/)) && TRACK[m[1]] && m[1] !== 'ml') {
    const t = TRACK[m[1]];
    if (t.status === 'live') { replace(t.href); return; }
    show('path'); setTitle(STAGE_TITLES[t.id] || `${t.title} | Gradient Atlas`); Path.show(m[1]); return;
  }
  // course pages
  let course = 'ml';
  if ((m = h.match(/^py\/(.*)$/))) { course = 'py'; h = m[1] || 'route'; }
  if (h === 'route-ml' || h === 'metro') h = 'route';
  try { await setCourse(course); } catch { $('.stage').insertAdjacentHTML('afterbegin', '<p class="loading" style="padding:40px">This course didn\'t load. Reload the page to try again.</p>'); return; }
  if (my !== ticket) return;
  $('.rail a[data-v="recall"]').href = toPath(C.pfx + 'recall');
  if (h === 'route') { show('metro'); Metro.build(); return; }
  if ((m = h.match(/^route-(\d+)$/))) { show('metro'); Metro.build(); Metro.setRoute(+m[1]); return; }
  if (h === 'recall') { show('recall'); Recall.dash(); return; }
  if ((m = h.match(/^quiz-(\d+)$/))) { show('recall'); Recall.quiz(+m[1]); return; }
  if (h === 'review') { show('recall'); Recall.review(); return; }
  if ((m = h.match(/^ch(\d+)$/))) { show('read'); Reader.open(+m[1]); return; }
  if ((m = h.match(/^s(\d+)(?:-\d+)+$/))) { show('read'); Reader.open(+m[1], h); return; }
  show('home'); Home.render();
}
addEventListener('popstate', () => { served = false; route(); dispatchEvent(new Event('pageview')); });
const go = h => {
  if (h !== 'console') document.getElementById('cmd').blur();
  served = false;
  if (toKey() !== h) history.pushState(null, '', toPath(h));
  route();
  dispatchEvent(new Event('pageview'));
};
// go to a page inside the current course
const goC = p => go(C.pfx + p);

// links inside the site open in the app instead of reloading the page.
// Older markup (chapter notes, flashcards) still links with #keys, so those count too.
document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]'); if (!a || a.target || a.hasAttribute('download')) return;
  const href = a.getAttribute('href');
  let key = null;
  if (href[0] === '#') { if (isKey(href.slice(1))) key = href.slice(1); }
  else { const u = new URL(a.href); if (u.origin === location.origin && !/\.\w+$/.test(u.pathname)) key = toKey(u); }
  if (key == null) return;
  e.preventDefault();
  go(key);
});

export { VIEWS, curView, show, route, go, goC, setTitle };
