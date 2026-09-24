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
const chLabel = n => n === 25 ? 'Appendix' : n === 0 ? 'Ch 0' : 'Ch ' + n;
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2000); }
function typeset(el) { if (!el) return; const go = () => window.MathJax.typesetPromise([el]).catch(() => {}); if (window.MathJax && MathJax.typesetPromise && window.__mjReady) go(); else (window.__mjq = window.__mjq || []).push(el); }

let M, G, byN = {}, SECS = {}, NODE = {}, OUTE = {}, INE = {}, partOf = {};
let CARDS = null, SEARCH = null;
const chCache = {};
let done = new Set(store.get('done', []));
let seen = new Set(store.get('seen', []));
const saveSeen = () => store.set('seen', [...seen]);
const isRead = id => seen.has(id) || (NODE[id] && done.has(NODE[id].c));

async function loadCards() { if (CARDS) return CARDS; CARDS = await (await fetch('data/cards.json')).json(); return CARDS; }
async function loadSearch() { if (SEARCH) return SEARCH; SEARCH = await (await fetch('data/search.json')).json(); SEARCH.forEach(s => { s.lt = s.t.toLowerCase(); s.lx = s.x.toLowerCase(); }); return SEARCH; }
function setData(m, g) { M = m; G = g; }

export { $, $$, esc, store, PV, css, pad2, chLabel, toast, typeset, M, G, byN, SECS, NODE, OUTE, INE, partOf, CARDS, SEARCH, chCache, done, seen, saveSeen, isRead, loadCards, loadSearch, setData };
