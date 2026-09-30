// search + Python-style console and the >>> prompt
import { $, esc, store, PV, pad2, chLabel, typeset, M, G, byN, NODE, OUTE, INE, CARDS, SEARCH, done, isRead, loadCards, loadSearch, COURSES, C, L, LC, inCourse, setCourse } from '../core.js';
import { onTheme } from '../theme.js';
import { curView, show, route, go, goC } from '../router.js';
import { Metro } from './metro.js';
import { SRS } from './recall.js';
import { Tour } from '../tour.js';

/* ======================= SEARCH ======================= */
function rank(q, list = SEARCH) {
  // light stemming so "generators" also finds "Generator"
  const stem = w => w.length > 4 ? w.replace(/ies$/, 'y').replace(/(es|s)$/, '') : w;
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean).map(stem); const hits = [];
  for (const s of list) { let sc = 0, ok = true;
    for (const w of terms) { const t = s.lt.includes(w), x = s.lx.includes(w), nn = s.num === w || s.num.startsWith(w + '.'); if (!t && !x && !nn) { ok = false; break; } sc += (nn ? 8 : 0) + (t ? (s.lt.startsWith(w) ? 10 : 7) : 0) + (x ? 1 : 0); }
    if (ok) hits.push({ ...s, sc }); }
  hits.sort((a, b) => b.sc - a.sc || a.c - b.c); hits.terms = terms; return hits;
}
// search every live course, whichever one is open
const allIdx = {};
async function searchAll() {
  const out = [];
  for (const id of Object.keys(COURSES)) {
    if (!allIdx[id]) { const d = await (await fetch(COURSES[id].dir + 'search.json')).json(); d.forEach(s => { s.lt = s.t.toLowerCase(); s.lx = s.x.toLowerCase(); s.co = id; }); allIdx[id] = d; }
    out.push(...allIdx[id]);
  }
  return out;
}
const routeMap = () => C.id === 'ml' ? 'route-ml' : C.pfx + 'route';
const hl = (t, terms) => { let o = esc(t); for (const w of terms) if (w.length > 1) o = o.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); return o; };

/* ======================= CONSOLE ======================= */
const CMDS = [
  ['help()', 'List every command'],
  ['course("python")', 'Switch the console to "python" or "ml"'],
  ['open(6)', 'Open a chapter, or a section with open("6.2")'],
  ['search("decorator")', 'Search both courses, titles and text'],
  ['refs("9.2")', 'What a section builds on, and what uses it'],
  ['path_to("boosting")', 'Plan a reading route to any chapter'],
  ['chapters(part="IV")', 'List chapters, optionally for one Part'],
  ['quiz(13)', 'Take a quiz built from a chapter\'s tables'],
  ['review()', 'Start a spaced-repetition review session'],
  ['progress()', 'What you\'ve read, completed and memorised'],
  ['route()', 'Open the data science pathway'],
  ['random()', 'Jump to a random section you haven\'t read'],
  ['theme("light")', 'Switch theme: "light" or "dark"'],
  ['tour()', 'Take the guided tour again'],
  ['clear()', 'Clear the console'],
];
const Con = {
  log: $('#log'), booted: false, hist: store.get('hist', []), hi: -1,
  boot() {
    if (this.booted) return; this.booted = true;
    this.log.innerHTML = `<div class="s-empty"><h1 class="h-display">Search</h1><p>Type what you want to search in the box at the top, then press Enter. It looks through every chapter in Python and Machine learning.</p><div class="cmds">${['functions', 'decorators', 'linear regression', 'clustering'].map(c => `<button class="chip" type="button" data-run="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>`;
  },
  // everything typed is treated as a search; the newest results replace the old ones
  async run(src) {
    const q = String(src || '').trim(); if (!q) return;
    if (curView !== 'console') go('console');
    this.boot();
    const h = rank(q, await searchAll());
    const list = h.length ? `<div class="olist">${h.slice(0, 20).map(s => { let x = s.x; const hd = (s.num + ' ' + s.t); if (x.startsWith(hd)) x = x.slice(hd.length).trim(); const p = x.toLowerCase().indexOf(h.terms[0]); if (p > 60) x = '…' + x.slice(p - 50); return `<a href="${LC(s.co, s.id)}"><span class="n">${s.num}</span><span>${hl(s.t, h.terms)}</span><span class="m">${s.co === 'py' ? 'Python' : 'ML'} · Ch ${s.c}</span><span class="x">${hl(x.slice(0, 180), h.terms)}</span></a>`; }).join('')}</div>`
      : `<p class="s-none">Nothing matches "${esc(q)}". Try a single word, like "loops" or "regression".</p>`;
    this.log.innerHTML = `<div class="s-head"><h1 class="h-display">Results for "${esc(q)}"</h1><p>${h.length ? `${h.length} section${h.length > 1 ? 's' : ''}${h.length > 20 ? ', showing the best 20' : ''}` : ''}</p></div>${list}`;
    scrollTo({ top: 0 });
  }
};
document.addEventListener('click', e => { const b = e.target.closest('[data-run]'); if (b) { e.preventDefault(); const c = b.dataset.run; $('#cmd').value = ''; Con.run(c); } });

/* prompt + suggestions */
const cmd = $('#cmd'), sug = $('#suggest'); let sugSel = -1, sugList = [];
function renderSug() { sug.hidden = true; }
cmd.addEventListener('focus', renderSug); cmd.addEventListener('input', () => { sugSel = -1; renderSug(); });
cmd.addEventListener('blur', () => setTimeout(() => sug.hidden = true, 150));
sug.addEventListener('mousedown', e => { const b = e.target.closest('[data-fill]'); if (!b) return; e.preventDefault(); cmd.value = b.dataset.fill; sug.hidden = true; cmd.focus(); cmd.setSelectionRange(cmd.value.indexOf('(') + 1, cmd.value.length - 1); });
cmd.addEventListener('keydown', e => {
  if (!sug.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && sugList.length) { e.preventDefault(); sugSel = (sugSel + (e.key === 'ArrowDown' ? 1 : -1) + sugList.length) % sugList.length; renderSug(); return; }
  if (!sug.hidden && e.key === 'Tab' && sugList.length) { e.preventDefault(); cmd.value = sugList[Math.max(0, sugSel)][0]; sug.hidden = true; cmd.setSelectionRange(cmd.value.indexOf('(') + 1, cmd.value.length - 1); return; }
  if (sug.hidden && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); Con.hi = Math.max(-1, Math.min(Con.hist.length - 1, Con.hi + (e.key === 'ArrowUp' ? 1 : -1))); cmd.value = Con.hi >= 0 ? Con.hist[Con.hi] : ''; return; }
  if (e.key === 'Escape') { sug.hidden = true; cmd.blur(); }
});
$('#repl').addEventListener('submit', e => { e.preventDefault(); if (!sug.hidden && sugSel >= 0) { cmd.value = sugList[sugSel][0]; sug.hidden = true; return; } const v = cmd.value; cmd.value = ''; sug.hidden = true; Con.run(v).then(() => { if (curView !== 'console') cmd.blur(); }); });
document.addEventListener('keydown', e => { if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); cmd.focus(); } });

export { rank, hl, CMDS, Con };
