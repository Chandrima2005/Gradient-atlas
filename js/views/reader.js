// chapter reader
import { $, $$, esc, store, PV, pad2, chLabel, toast, typeset, M, byN, NODE, chCache, done, seen, saveSeen, saveDone, isRead, COURSES, C, L, LC, K, inCourse } from '../core.js';
import { curView, route, go, goC } from '../router.js';
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
  async load(n) { const k = C.id + ':' + n; if (chCache[k]) return chCache[k]; const r = await fetch(`${C.dir}ch${pad2(n)}.json`); if (!r.ok) throw 0; return chCache[k] = await r.json(); },
  async open(n, target) {
    const c = byN[n]; if (!c) return go('home');
    store.set(K('lastCh'), n); store.set('lastRead', C.pfx + 'ch' + n); 
    const key = C.id + ':' + n;
    if (this.cur !== key) {
      this.cur = key;
      const inner = $('#rinner'); inner.innerHTML = `<p class="loading">Loading ${chLabel(n)}…</p>`;
      let d; try { d = await this.load(n); } catch { inner.innerHTML = `<p class="loading">${chLabel(n)} didn't load. Check your connection and reload.</p>`; return; }
      if (this.cur !== key) return;
      const idx = M.chapters.findIndex(x => x.n === n), prev = M.chapters[idx - 1], next = M.chapters[idx + 1];
      const part = M.parts.find(p => p.key === c.part), real = inCourse(n);
      inner.parentElement.parentElement.style.setProperty('--pc', `var(${PV[c.part]})`);
      inner.innerHTML = `<header class="rhead"><div class="crumb"><span class="sw"></span>${C.name}<span>·</span>${c.part === '0' ? 'Before you start' : c.part === 'A' ? 'Reference' : 'Part ' + c.part + ' · ' + part.name}<span>·</span><span>~${c.minutes} min</span><span>·</span><span>${c.code} examples</span></div>
        <h1 class="h-display"><span class="cn">${C.id === 'ml' && n === 25 ? 'APPENDIX' : 'CHAPTER ' + pad2(n)}</span>${esc(c.title)}</h1>${c.scope ? `<p class="scope">${c.scope}</p>` : ''}
        <div class="racts">${real ? `<a class="btn small" href="${L('route-' + n)}">Plan a route here</a><a class="btn small" href="${L('quiz-' + n)}">Quiz me</a>` : ''}</div></header>
        <div class="body" id="body">${d.html}</div>
        <div class="rend">
          ${real ? `<div class="box"><p>Finished? Marking it complete fills in its station on the route map.</p><div class="acts"><button class="btn" type="button" id="doneBtn"></button><a class="btn" href="${L('quiz-' + n)}">Take the quiz</a></div></div>` : ''}
          <nav class="pn">${prev ? `<a href="${L('ch' + prev.n)}"><small>← ${chLabel(prev.n)}</small><span>${esc(prev.title)}</span></a>` : ''}${next ? `<a class="next" href="${L('ch' + next.n)}"><small>${chLabel(next.n)} →</small><span>${esc(next.title)}</span></a>` : ''}</nav>
        </div>`;
      const body = $('#body');
      this.decorate(body);
      typeset(inner);
      this.toc(c);
      this.watch();
      const db = $('#doneBtn');
      if (db) { const paint = () => { db.textContent = done.has(n) ? '✓ Completed' : 'Mark as complete'; db.classList.toggle('is-done', done.has(n)); }; paint();
        db.onclick = () => { done.has(n) ? done.delete(n) : done.add(n); saveDone(); paint(); if (Metro.built) Metro.render(); toast(done.has(n) ? `${chLabel(n)} marked complete` : `${chLabel(n)} unmarked`); }; }
      document.title = `${chLabel(n)} · ${c.title} — Gradient Atlas`;
    }
    requestAnimationFrame(() => {
      if (target) { const el = document.getElementById(target); if (el) { const d = el.closest('details.sec'); if (d) d.open = true; (el.classList.contains('anchor') && d ? d : el).scrollIntoView({ block: 'start' }); return; } }
      scrollTo({ top: 0, behavior: 'instant' });
    });
  },
  decorate(body) {
    $$('h3[id],h4[id],h5[id]', body).forEach(h => {
      const m = h.textContent.match(/^\s*(\d+(?:\.\d+)*)\s/);
      if (m) h.innerHTML = h.innerHTML.replace(m[1], `<span class="hn">${m[1]}</span>`);
    });
  },
  toc(c) {
    const el = $('#rtoc');
    el.style.setProperty('--pc', `var(${PV[c.part]})`);
    const tabs = `<div class="ctabs" role="tablist" aria-label="Course">${Object.values(COURSES).sort((a, b) => a.stage - b.stage).map(x => `<a role="tab" href="${LC(x.id, 'ch' + store.get(x.id === 'ml' ? 'lastCh' : x.id + '.lastCh', x.first))}" class="${x.id === C.id ? 'on' : ''}" aria-selected="${x.id === C.id}">${x.id === 'ml' ? 'ML' : x.name}</a>`).join('')}</div>`;
    el.innerHTML = `${tabs}<select id="chsel" aria-label="${C.name} chapter">${M.chapters.map(x => `<option value="${x.n}" ${x.n === c.n ? 'selected' : ''}>${C.id === 'ml' && x.n === 25 ? 'A' : pad2(x.n)} · ${esc(x.title)}${done.has(x.n) ? ' ✓' : ''}</option>`).join('')}</select>
      <div class="links">${c.sections.map(s => `<a href="${L(s.id)}" class="l${s.lvl} ${isRead(s.id) ? 'seen' : ''}" data-id="${s.id}"><span class="d"></span><span>${s.num} ${esc(s.title)}</span></a>`).join('')}</div>`;
    $('#chsel').onchange = e => goC('ch' + e.target.value);
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
