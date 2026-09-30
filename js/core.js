// shared helpers, course data and reading progress

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('s2s2.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('s2s2.' + k, JSON.stringify(v)); } catch {} }
};
const PV = { '0': '--p0', 'I': '--p1', 'II': '--p2', 'III': '--p3', 'IV': '--p4', 'V': '--p5', 'VI': '--p6', 'A': '--pA' };
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const pad2 = n => String(n).padStart(2, '0');
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2000); }
function typeset(el) { if (!el) return; const go = () => window.MathJax.typesetPromise([el]).catch(() => {}); if (window.MathJax && MathJax.typesetPromise && window.__mjReady) go(); else (window.__mjq = window.__mjq || []).push(el); }

/* ======================= courses ======================= */
// Each live course has its own data folder, link prefix and progress keys.
// ML keeps the original unprefixed links (#ch11, #route-15) so old bookmarks still work.
const COURSES = {
  py: {
    id: 'py', name: 'Python', stage: 1, dir: 'data/py/', pfx: 'py/', first: 1, last: 20,
    quick: [[6, 'Functions'], [10, 'OOP'], [7, 'Exceptions'], [14, 'Generators'], [17, 'Concurrency'], [20, 'Pydantic']],
    intro: 'Each station is a chapter. Pick the chapter you want to reach and the map shows only the chapters you need first, in order.',
    // programming builds on itself, so any single reference counts and the Basics come first
    rule: { direct: 1, background: 2, advised: t => t >= 5 ? [1, 2, 3, 4].map(n => [n, 'the Python basics everything builds on']) : [] },
  },
  ml: {
    id: 'ml', name: 'Machine learning', stage: 3, dir: 'data/', pfx: '', first: 1, last: 24,
    quick: [[19, 'Gradient boosting'], [16, 'SVMs'], [20, 'Clustering'], [23, 'Hyperparameter tuning'], [24, 'SHAP & deployment'], [13, 'Logistic regression']],
    intro: 'Each station is a chapter. Pick the chapter you want to reach and the map shows only the chapters you need first, in order.',
    rule: { direct: 2, background: 4, advised: t => t >= 11 && t <= 21 ? [[8, 'the book says read first (0.9)'], [9, 'the book says read first (0.9)']] : [] },
  },
};
let C = COURSES.ml;
const L = p => '#' + C.pfx + p;                       // link inside the current course
const LC = (id, p) => '#' + COURSES[id].pfx + p;      // link inside a given course
const K = k => C.id === 'ml' ? k : C.id + '.' + k;    // storage key for the current course
const chLabel = n => C.id === 'ml' && n === 25 ? 'Appendix' : n === 0 ? 'Ch 0' : 'Ch ' + n;
const inCourse = n => n >= C.first && n <= C.last;

let M, G, CARDS = null, SEARCH = null;
const byN = {}, SECS = {}, NODE = {}, OUTE = {}, INE = {}, partOf = {};
const chCache = {};
let done = new Set(), seen = new Set();
const saveSeen = () => store.set(K('seen'), [...seen]);
const saveDone = () => store.set(K('done'), [...done]);
const isRead = id => seen.has(id) || (NODE[id] && done.has(NODE[id].c));

const cache = {};   // per course: { m, g, cards, search }
const getJSON = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
const clear = o => { for (const k in o) delete o[k]; };
async function setCourse(id) {
  if (!COURSES[id]) id = 'ml';
  if (M && C.id === id) return;
  const c = cache[id] = cache[id] || {};
  if (!c.m) [c.m, c.g] = await Promise.all([getJSON(COURSES[id].dir + 'manifest.json'), getJSON(COURSES[id].dir + 'graph.json')]);
  C = COURSES[id]; M = c.m; G = c.g; CARDS = c.cards || null; SEARCH = c.search || null;
  [byN, SECS, NODE, OUTE, INE, partOf].forEach(clear);
  M.chapters.forEach(ch => { byN[ch.n] = ch; partOf[ch.n] = ch.part; ch.sections.forEach(s => SECS[s.id] = s); });
  G.nodes.forEach(n => NODE[n.id] = n);
  for (const [a, b, w] of G.edges) { (OUTE[a] = OUTE[a] || []).push([b, w]); (INE[b] = INE[b] || []).push([a, w]); }
  done = new Set(store.get(K('done'), [])); seen = new Set(store.get(K('seen'), []));
  document.documentElement.dataset.course = id;
}
async function loadCards() { if (CARDS) return CARDS; const id = C.id; const d = await getJSON(C.dir + 'cards.json'); cache[id].cards = d; if (C.id === id) CARDS = d; return d; }
async function loadSearch() { if (SEARCH) return SEARCH; const id = C.id; const d = await getJSON(C.dir + 'search.json'); d.forEach(s => { s.lt = s.t.toLowerCase(); s.lx = s.x.toLowerCase(); }); cache[id].search = d; if (C.id === id) SEARCH = d; return d; }
// headline numbers for a course without switching to it (used by Home and the pathway)
async function courseStats(id) {
  const c = cache[id] = cache[id] || {};
  if (!c.m) [c.m, c.g] = await Promise.all([getJSON(COURSES[id].dir + 'manifest.json'), getJSON(COURSES[id].dir + 'graph.json')]);
  const ch = c.m.chapters.filter(x => x.n >= COURSES[id].first && x.n <= COURSES[id].last);
  const sum = k => ch.reduce((a, x) => a + x[k], 0);
  return { chapters: ch.length, sections: ch.reduce((a, x) => a + x.sections.length, 0), code: sum('code'), minutes: sum('minutes'), titles: ch.map(x => x.title) };
}

export { $, $$, esc, store, PV, css, pad2, chLabel, toast, typeset, M, G, byN, SECS, NODE, OUTE, INE, partOf, CARDS, SEARCH, chCache, done, seen, saveSeen, saveDone, isRead, loadCards, loadSearch, COURSES, C, L, LC, K, inCourse, setCourse, courseStats };
