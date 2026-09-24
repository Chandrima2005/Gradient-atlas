// search + Python-style console and the >>> prompt
import { $, esc, store, PV, pad2, chLabel, typeset, M, G, byN, NODE, OUTE, INE, CARDS, SEARCH, done, isRead, loadCards, loadSearch } from '../core.js';
import { onTheme } from '../theme.js';
import { curView, show, route, go } from '../router.js';
import { Metro } from './metro.js';
import { SRS } from './recall.js';
import { Tour } from '../tour.js';

/* ======================= SEARCH ======================= */
function rank(q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean); const hits = [];
  for (const s of SEARCH) { let sc = 0, ok = true;
    for (const w of terms) { const t = s.lt.includes(w), x = s.lx.includes(w), nn = s.num === w || s.num.startsWith(w + '.'); if (!t && !x && !nn) { ok = false; break; } sc += (nn ? 8 : 0) + (t ? (s.lt.startsWith(w) ? 10 : 7) : 0) + (x ? 1 : 0); }
    if (ok) hits.push({ ...s, sc }); }
  hits.sort((a, b) => b.sc - a.sc || a.c - b.c); hits.terms = terms; return hits;
}
const hl = (t, terms) => { let o = esc(t); for (const w of terms) if (w.length > 1) o = o.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); return o; };

/* ======================= CONSOLE ======================= */
const CMDS = [
  ['help()', 'List every command'],
  ['open(11)', 'Open a chapter, or a section with open("11.3")'],
  ['search("lasso")', 'Search all section titles and text'],
  ['refs("9.2")', 'What a section builds on, and what uses it'],
  ['path_to("boosting")', 'Plan a reading route to any chapter'],
  ['chapters(part="IV")', 'List chapters, optionally for one Part'],
  ['quiz(13)', 'Take a quiz built from a chapter\'s tables'],
  ['review()', 'Start a spaced-repetition review session'],
  ['progress()', 'What you\'ve read, completed and memorised'],
  ['map("11.2")', 'Show the knowledge map, optionally focused on a section'],
  ['route()', 'Open the route planner'],
  ['random()', 'Jump to a random section you haven\'t read'],
  ['theme("light")', 'Switch theme: "light" or "dark"'],
  ['tour()', 'Take the guided tour again'],
  ['clear()', 'Clear the console'],
];
const Con = {
  log: $('#log'), booted: false, hist: store.get('hist', []), hi: -1,
  boot() {
    if (this.booted) return; this.booted = true;
    const nSec = G.nodes.filter(n => !n.hub).length;
    this.log.innerHTML = `<pre class="banner"><b>Gradient Atlas 2.0</b> · ML Materials (classical ML only) [numpy · scikit-learn]
${M.chapters.length - 2} chapters · ${nSec} sections · ${G.edges.length} cross-reference links loaded
Type <b>help()</b> at the &gt;&gt;&gt; prompt at the top, or click a command:</pre><div class="cmds">${['help()', 'chapters(part="IV")', 'search("kernel trick")', 'refs("2.8.3")', 'path_to("gradient boosting")', 'progress()'].map(c => `<button class="chip" type="button" data-run='${esc(c)}'>${esc(c)}</button>`).join('')}</div><p class="hint">Tip: press / anywhere to focus the prompt. ↑ and ↓ recall earlier commands.</p>`;
  },
  print(input, html, err) {
    this.boot();
    const e = document.createElement('div'); e.className = 'entry';
    e.innerHTML = `<div class="in">${esc(input)}</div><div class="out ${err ? 'err' : ''}">${html}</div>`;
    this.log.appendChild(e); typeset(e);
    requestAnimationFrame(() => e.scrollIntoView({ block: 'end', behavior: 'smooth' }));
  },
  parse(src) {
    let s = src.trim().replace(/^ml\./, '');
    const m = s.match(/^([a-z_]+)\s*\((.*)\)\s*$/is);
    if (!m) return { fn: s.includes(' ') || !/^[a-z_]+$/i.test(s) ? 'search' : s, args: s.includes(' ') || !/^[a-z_]+$/i.test(s) ? [s] : [], kw: {} };
    const args = [], kw = {}; const re = /\s*(?:([a-z_]+)\s*=\s*)?("([^"]*)"|'([^']*)'|(-?\d+(?:\.\d+)*)|([A-Za-z_]+))\s*(?:,|$)/gy;
    let t, body = m[2].trim();
    if (body) { while ((t = re.exec(body)) !== null) { const v = t[3] ?? t[4] ?? t[5] ?? t[6]; if (t[1]) kw[t[1]] = v; else args.push(v); if (re.lastIndex >= body.length) break; } }
    return { fn: m[1].toLowerCase(), args, kw };
  },
  resolveTarget(a) {
    if (a == null) return null; a = String(a).trim();
    if (/^\d+$/.test(a)) return byN[+a] ? { ch: +a } : null;
    if (/^\d+(\.\d+)+$/.test(a)) { const id = 's' + a.replace(/\./g, '-'); if (NODE[id]) return { sec: id }; const p = a.split('.'); while (p.length > 1) { p.pop(); const k = 's' + p.join('-'); if (NODE[k]) return { sec: k }; } return byN[+a.split('.')[0]] ? { ch: +a.split('.')[0] } : null; }
    return null;
  },
  async run(src) {
    src = src.trim(); if (!src) return;
    this.hist = [src, ...this.hist.filter(h => h !== src)].slice(0, 40); store.set('hist', this.hist); this.hi = -1;
    const { fn, args, kw } = this.parse(src);
    const nav = h => { go(h); };
    const out = (h, err) => { if (curView !== 'console') go('console'); setTimeout(() => this.print(src, h, err), 0); };
    try {
      switch (fn) {
        case 'help': return out(`<table class="helpt">${CMDS.map(([c, d]) => `<tr><td><button class="chip" type="button" data-run='${esc(c)}'>${esc(c)}</button></td><td>${d}</td></tr>`).join('')}</table>`);
        case 'clear': this.log.innerHTML = ''; this.booted = false; this.boot(); if (curView !== 'console') go('console'); return;
        case 'open': case 'read': { const t = this.resolveTarget(args[0] ?? kw.n);
          if (!t) { if (args[0]) return this.run(`path_to("${args[0]}")`.replace('path_to', 'search')); return out(`TypeError: open() needs a chapter number or section like "11.3"`, true); }
          return nav(t.sec || 'ch' + t.ch); }
        case 'map': { const t = this.resolveTarget(args[0]); if (t) return nav('node-' + (t.sec || 'c' + t.ch)); return nav('map'); }
        case 'metro': return nav('route');
        case 'tour': case 'onboarding': Tour.start(0); return;
        case 'review': return nav('review');
        case 'quiz': { const n = +(args[0] ?? kw.chapter); if (!byN[n] || n < 1 || n > 24) return out(`ValueError: quiz() needs a chapter from 1 to 24, e.g. quiz(13)`, true); return nav('quiz-' + n); }
        case 'theme': { const v = String(args[0] || '').toLowerCase(); if (v !== 'light' && v !== 'dark') return out(`ValueError: theme() takes "light" or "dark"`, true); document.documentElement.dataset.theme = v; store.set('theme', v); onTheme(); return out(`<p>theme set to "${v}"</p>`); }
        case 'chapters': { const p = kw.part || args[0]; const parts = p ? M.parts.filter(x => x.key.toLowerCase() === String(p).toLowerCase()) : M.parts;
          if (!parts.length) return out(`KeyError: part="${esc(p)}". Parts are I, II, III, IV, V, VI.`, true);
          return out(parts.map(pp => `<p style="margin:10px 0 4px;color:var(${PV[pp.key]})">${pp.key === '0' ? '# before you start' : pp.key === 'A' ? '# reference' : '# Part ' + pp.key + ' · ' + esc(pp.name)}</p><div class="olist">${pp.chapters.map(n => { const c = byN[n]; return `<a href="#ch${n}"><span class="n">${n === 25 ? 'A' : pad2(n)}</span><span>${esc(c.title)}${done.has(n) ? ' <span style="color:var(--good)">✓</span>' : ''}</span><span class="m">${c.minutes} min · ${c.sections.length} sec</span></a>`; }).join('')}</div>`).join(''));
        }
        case 'search': { const q = args[0] ?? kw.q ?? ''; if (!q.trim()) return out(`search() needs some text, e.g. search("hinge loss")`, true);
          await loadSearch(); const h = rank(q);
          if (!h.length) return out(`<p>No section matches "${esc(q)}". Try one word, like "lasso" or "recall".</p>`);
          return out(`<p>${h.length} section${h.length > 1 ? 's' : ''} match "${esc(q)}"${h.length > 12 ? ', top 12:' : ':'}</p><div class="olist">${h.slice(0, 12).map(s => { let x = s.x; const hd = (s.num + ' ' + s.t); if (x.startsWith(hd)) x = x.slice(hd.length).trim(); const p = x.toLowerCase().indexOf(h.terms[0]); if (p > 60) x = '…' + x.slice(p - 50); return `<a href="#${s.id}"><span class="n">${s.num}</span><span>${hl(s.t, h.terms)}</span><span class="m">${chLabel(s.c)}</span><span class="x">${hl(x.slice(0, 180), h.terms)}</span></a>`; }).join('')}</div>`);
        }
        case 'refs': { const t = this.resolveTarget(args[0]); if (!t) return out(`refs() needs a section like "9.2" or a chapter number`, true);
          const id = t.sec || 'c' + t.ch, n = NODE[id]; const li = arr => arr.length ? `<div class="olist">${arr.sort((a, b) => b[1] - a[1]).map(([o, w]) => { const x = NODE[o]; return x ? `<a href="#${x.hub ? 'ch' + x.c : o}"><span class="n">${x.hub ? chLabel(x.c) : x.num}</span><span>${esc(x.t)}</span><span class="m">${w > 1 ? '×' + w : ''}</span></a>` : ''; }).join('')}</div>` : '<p>(none)</p>';
          return out(`<p><b style="color:var(--ink)">${n.hub ? chLabel(n.c) : n.num} ${esc(n.t)}</b> · <a href="#node-${id}">show on map</a></p><p style="color:var(--accent)">builds on:</p>${li([...(OUTE[id] || [])])}<p style="margin-top:10px">used by:</p>${li([...(INE[id] || [])])}`);
        }
        case 'path_to': case 'route': { if (fn === 'route' && !args.length && !kw.target) return nav('route'); let a = args[0] ?? kw.target; let t = this.resolveTarget(a); let n = t ? (t.ch || NODE[t.sec].c) : null;
          if (!n && a) { await loadSearch(); const h = rank(String(a)).filter(s => s.c >= 1 && s.c <= 24); if (h.length) { const votes = {}; h.slice(0, 10).forEach((s, i) => votes[s.c] = (votes[s.c] || 0) + s.sc / (i + 1)); n = +Object.entries(votes).sort((x, y) => y[1] - x[1])[0][0]; } }
          if (!n || n < 1 || n > 24) return out(`LookupError: no chapter found for ${esc(JSON.stringify(a ?? ''))}. Try path_to(19) or path_to("clustering").`, true);
          Metro.build(); const rt = Metro.compute(n); const mins = rt.filter(r => !done.has(r.n)).reduce((s, r) => s + byN[r.n].minutes, 0);
          return out(`<p>Route to <b style="color:var(--ink)">${chLabel(n)} ${esc(byN[n].title)}</b>: ${rt.length} stops, about ${Math.floor(mins / 60)}h ${pad2(mins % 60)}m unread</p><div class="olist">${rt.map((r, i) => `<a href="#ch${r.n}"><span class="n">${r.kind === 'target' ? '★' : i + 1}. ${pad2(r.n)}</span><span>${esc(byN[r.n].title)}${done.has(r.n) ? ' <span style="color:var(--good)">✓</span>' : ''}</span><span class="m">${r.kind} · ${esc(r.why)}</span></a>`).join('')}</div><div class="cmds"><a class="chip" href="#route-${n}"><b>→</b>view on the route map</a></div>`);
        }
        case 'progress': { await loadCards().catch(() => {}); const nSec = G.nodes.filter(n => !n.hub).length; const rd = G.nodes.filter(n => !n.hub && isRead(n.id)).length;
          const bar = (k, t) => { const w = 28, f = Math.round(k / Math.max(1, t) * w); return `<span style="color:var(--accent)">${'█'.repeat(f)}</span><span style="color:var(--line-2)">${'░'.repeat(w - f)}</span>`; };
          return out(`<pre style="margin:0;font-family:var(--f-mono);line-height:1.8">chapters complete  ${bar(done.size, 24)}  ${[...done].filter(n => n >= 1 && n <= 24).length}/24
sections read      ${bar(rd, nSec)}  ${rd}/${nSec}
cards in rotation  ${bar(Object.keys(SRS.db).length, CARDS ? CARDS.flash.length : 1)}  ${Object.keys(SRS.db).length}/${CARDS ? CARDS.flash.length : '?'}
cards due now      ${SRS.due().length}</pre>`); }
        case 'random': { const pool = G.nodes.filter(n => !n.hub && !isRead(n.id) && n.c >= 1 && n.c <= 24); if (!pool.length) return out('<p>You have read every section.</p>'); const n = pool[Math.floor(Math.random() * pool.length)]; return nav(n.id); }
        default: {
          const near = CMDS.map(c => c[0].split('(')[0]).filter(c => c.startsWith(fn.slice(0, 2)));
          return out(`NameError: name '${esc(fn)}' is not defined.${near.length ? ` Did you mean ${near.map(c => `<button class="chip" type="button" data-run='${c}()'>${c}()</button>`).join(' ')}?` : ' Type help() for the list.'}`, true);
        }
      }
    } catch (e) { out(`Error: ${esc(e.message || e)}`, true); }
  }
};
document.addEventListener('click', e => { const b = e.target.closest('[data-run]'); if (b) { e.preventDefault(); const c = b.dataset.run; $('#cmd').value = ''; Con.run(c); } });

/* prompt + suggestions */
const cmd = $('#cmd'), sug = $('#suggest'); let sugSel = -1, sugList = [];
function renderSug() {
  const v = cmd.value.trim().replace(/^ml\./, '').toLowerCase();
  sugList = CMDS.filter(([c]) => !v || c.toLowerCase().startsWith(v.split('(')[0]) || c.toLowerCase().includes(v)).slice(0, 7);
  if (v.includes('(') || !sugList.length || document.activeElement !== cmd) { sug.hidden = true; return; }
  sugSel = Math.min(sugSel, sugList.length - 1);
  sug.innerHTML = sugList.map(([c, d], i) => `<button type="button" class="${i === sugSel ? 'sel' : ''}" data-fill="${esc(c)}">${esc(c)}<span>${esc(d)}</span></button>`).join('');
  sug.hidden = false;
}
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
