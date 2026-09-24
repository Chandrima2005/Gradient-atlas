// chapter reader + code-cell copy buttons
import { $, $$, esc, store, PV, pad2, chLabel, toast, typeset, M, byN, NODE, OUTE, INE, chCache, done, seen, saveSeen, isRead } from '../core.js';
import { curView, route, go } from '../router.js';
import { Map_ } from './map.js';
import { Metro } from './metro.js';

/* ======================= copy ======================= */
document.addEventListener('click', e => {
  const b = e.target.closest('button.copy'); if (!b) return;
  const t = b.closest('.cell').querySelector('pre.code').innerText;
  const ok = () => { b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy', 1200); };
  try { navigator.clipboard.writeText(t).then(ok, () => toast('Copy was blocked. Select the code and copy it manually.')); } catch { toast('Copy was blocked. Select the code and copy it manually.'); }
});

/* ======================= READER ======================= */
const Reader = {
  cur: null, spy: null,
  async load(n) { if (chCache[n]) return chCache[n]; const r = await fetch(`data/ch${pad2(n)}.json`); if (!r.ok) throw 0; return chCache[n] = await r.json(); },
  async open(n, target) {
    const c = byN[n]; if (!c) return go('map');
    store.set('lastCh', n); $('#readLink').href = '#ch' + n;
    if (this.cur !== n) {
      this.cur = n;
      const inner = $('#rinner'); inner.innerHTML = `<p class="loading">Loading ${chLabel(n)}…</p>`;
      let d; try { d = await this.load(n); } catch { inner.innerHTML = `<p class="loading">${chLabel(n)} didn't load. Check your connection and reload.</p>`; return; }
      if (this.cur !== n) return;
      const idx = M.chapters.findIndex(x => x.n === n), prev = M.chapters[idx - 1], next = M.chapters[idx + 1];
      const part = M.parts.find(p => p.key === c.part);
      inner.parentElement.parentElement.style.setProperty('--pc', `var(${PV[c.part]})`);
      inner.innerHTML = `<header class="rhead"><div class="crumb"><span class="sw"></span>${c.part === '0' ? 'Before you start' : c.part === 'A' ? 'Reference' : 'Part ' + c.part + ' · ' + part.name}<span>·</span><span>~${c.minutes} min</span><span>·</span><span>${c.code} cells</span>${c.figs ? `<span>·</span><span>${c.figs} figures</span>` : ''}</div>
        <h1 class="h-display"><span class="cn">${n === 25 ? 'APPENDIX' : 'CHAPTER ' + pad2(n)}</span>${esc(c.title)}</h1>${c.scope ? `<p class="scope">${c.scope}</p>` : ''}
        <div class="racts"><a class="btn small" href="#node-c${n}">Show on map</a>${n >= 1 && n <= 24 ? `<a class="btn small" href="#route-${n}">Plan a route here</a><a class="btn small" href="#quiz-${n}">Quiz me</a>` : ''}</div></header>
        <div class="body" id="body">${d.html}</div>
        <div class="rend">
          ${n >= 1 && n <= 24 ? `<div class="box"><p>Finished? Marking it complete fills in its station on the route map and its dots on the knowledge map.</p><div class="acts"><button class="btn" type="button" id="doneBtn"></button><a class="btn" href="#quiz-${n}">Take the quiz</a></div></div>` : ''}
          <nav class="pn">${prev ? `<a href="#ch${prev.n}"><small>← ${chLabel(prev.n)}</small><span>${esc(prev.title)}</span></a>` : ''}${next ? `<a class="next" href="#ch${next.n}"><small>${chLabel(next.n)} →</small><span>${esc(next.title)}</span></a>` : ''}</nav>
        </div>`;
      const body = $('#body');
      this.decorate(body);
      typeset(inner);
      this.toc(c);
      this.watch();
      const db = $('#doneBtn');
      if (db) { const paint = () => { db.textContent = done.has(n) ? '✓ Completed' : 'Mark as complete'; db.classList.toggle('is-done', done.has(n)); }; paint();
        db.onclick = () => { done.has(n) ? done.delete(n) : done.add(n); store.set('done', [...done]); paint(); Map_.draw(); if (Metro.built) Metro.render(); toast(done.has(n) ? `${chLabel(n)} marked complete` : `${chLabel(n)} unmarked`); }; }
      document.title = `${chLabel(n)} · ${c.title} — Gradient Atlas`;
    }
    requestAnimationFrame(() => {
      if (target) { const el = document.getElementById(target); if (el) { el.scrollIntoView({ block: 'start' }); return; } }
      scrollTo({ top: 0, behavior: 'instant' });
    });
  },
  decorate(body) {
    $$('h3[id],h4[id],h5[id]', body).forEach(h => {
      const m = h.textContent.match(/^\s*(\d+(?:\.\d+)*)\s/);
      if (m) h.innerHTML = h.innerHTML.replace(m[1], `<span class="hn">${m[1]}</span>`);
      if (!NODE[h.id]) return;
      const o = (OUTE[h.id] || []).filter(e => NODE[e[0]]), i = (INE[h.id] || []).filter(e => NODE[e[0]]);
      if (!o.length && !i.length) return;
      const lnk = ([id]) => { const x = NODE[id]; return `<a href="#${x.hub ? 'ch' + x.c : id}" title="${esc(x.t)}">${x.hub ? chLabel(x.c) : x.num}</a>`; };
      const cap = (arr) => arr.slice(0, 6).map(lnk).join('') + (arr.length > 6 ? `<span>+${arr.length - 6}</span>` : '');
      const d = document.createElement('div'); d.className = 'deps';
      d.innerHTML = (o.length ? `<span class="grp"><span>↰ builds on</span>${cap(o)}</span>` : '') + (i.length ? `<span class="grp"><span>↳ used by</span>${cap(i)}</span>` : '') + `<span class="grp"><a href="#node-${h.id}">◎ map</a></span>`;
      h.after(d);
    });
  },
  toc(c) {
    const el = $('#rtoc');
    el.style.setProperty('--pc', `var(${PV[c.part]})`);
    el.innerHTML = `<label class="eyebrow" for="chsel" style="display:block;margin-bottom:6px">Chapter</label><select id="chsel">${M.chapters.map(x => `<option value="${x.n}" ${x.n === c.n ? 'selected' : ''}>${x.n === 25 ? 'A' : pad2(x.n)} · ${esc(x.title)}${done.has(x.n) ? ' ✓' : ''}</option>`).join('')}</select>
      <div class="links">${c.sections.map(s => `<a href="#${s.id}" class="l${s.lvl} ${isRead(s.id) ? 'seen' : ''}" data-id="${s.id}"><span class="d"></span><span>${s.num} ${esc(s.title)}</span></a>`).join('')}</div>`;
    $('#chsel').onchange = e => go('ch' + e.target.value);
  },
  watch() {
    if (this.spy) this.spy.disconnect();
    const links = {}; $$('#rtoc a[data-id]').forEach(a => links[a.dataset.id] = a);
    let active = null;
    this.spy = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) {
        const id = e.target.id;
        if (active) active.classList.remove('on');
        active = links[id]; if (active) { active.classList.add('on'); active.classList.add('seen'); active.scrollIntoView({ block: 'nearest' }); }
        if (NODE[id] && !seen.has(id)) { seen.add(id); saveSeen(); }
      }
    }, { rootMargin: '-70px 0px -65% 0px' });
    $$('#body h3[id], #body h4[id]').forEach(h => this.spy.observe(h));
  }
};
addEventListener('scroll', () => {
  if (curView !== 'read') return;
  const a = $('.rmain').getBoundingClientRect();
  $('#readbar').style.width = Math.min(100, Math.max(0, -a.top / (a.height - innerHeight) * 100)) + '%';
}, { passive: true });

export { Reader };
