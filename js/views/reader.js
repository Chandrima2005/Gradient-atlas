// chapter reader: a cheat sheet first, then the full notes folded section by section
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

// first sentence of a paragraph, as plain text
const firstSentence = (t, max = 190) => {
  t = t.replace(/\s+/g, ' ').trim();
  const m = t.match(/^(.{30,}?[.!?])(\s|$)(?=[A-Z(`*"“]|$)/);
  let s = m ? m[1] : t;
  if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '') + '…';
  return s;
};

/* ======================= READER ======================= */
const Reader = {
  cur: null, spy: null,
  async load(n) { const k = C.id + ':' + n; if (chCache[k]) return chCache[k]; const r = await fetch(`${C.dir}ch${pad2(n)}.json`); if (!r.ok) throw 0; return chCache[k] = await r.json(); },
  async open(n, target) {
    const c = byN[n]; if (!c) return go('home');
    store.set(K('lastCh'), n); store.set('lastRead', C.pfx + 'ch' + n); $('#readLink').href = L('ch' + n);
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
        <section class="cheat" id="cheat" aria-label="Chapter summary"></section>
        <div class="notes-head"><h2>Full notes</h2><div><button class="btn small" type="button" id="openAll">Open all</button><button class="btn small" type="button" id="closeAll">Close all</button></div></div>
        <div class="body" id="body">${d.html}</div>
        <div class="rend">
          ${real ? `<div class="box"><p>Finished? Marking it complete fills in its station on the route map.</p><div class="acts"><button class="btn" type="button" id="doneBtn"></button><a class="btn" href="${L('quiz-' + n)}">Take the quiz</a></div></div>` : ''}
          <nav class="pn">${prev ? `<a href="${L('ch' + prev.n)}"><small>← ${chLabel(prev.n)}</small><span>${esc(prev.title)}</span></a>` : ''}${next ? `<a class="next" href="${L('ch' + next.n)}"><small>${chLabel(next.n)} →</small><span>${esc(next.title)}</span></a>` : ''}</nav>
        </div>`;
      const body = $('#body');
      this.decorate(body);
      this.fold(body);
      this.cheat(c, body);
      typeset(inner);
      this.toc(c);
      this.watch();
      $('#openAll').onclick = () => $$('#body details.sec').forEach(x => x.open = true);
      $('#closeAll').onclick = () => $$('#body details.sec').forEach(x => x.open = false);
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
  // wrap each top-level section (h3) and everything after it in a <details>
  fold(body) {
    // split any text block that holds a section heading so the heading starts its own block
    $$(':scope > .md', body).forEach(md => {
      $$(':scope > h3', md).forEach(h => {
        if (h === md.firstElementChild) return;
        const before = document.createElement('div'); before.className = md.className;
        while (md.firstChild !== h) before.appendChild(md.firstChild);
        md.before(before);
      });
    });
    const kids = [...body.children]; let cur = null;
    for (const k of kids) {
      const h = k.matches('.md') && k.firstElementChild && k.firstElementChild.matches('h3[id]') ? k.firstElementChild : null;
      if (h) {
        cur = document.createElement('details'); cur.className = 'sec'; cur.dataset.id = h.id;
        const sum = document.createElement('summary'); sum.innerHTML = `<span class="st">${h.innerHTML}</span><span class="meta"></span>`;
        cur.append(sum); k.before(cur); h.remove();
        const inner = document.createElement('div'); inner.className = 'sec-in'; cur.append(inner);
        // keep the id target: an anchor at the top of the section
        const a = document.createElement('span'); a.id = h.id; a.className = 'anchor'; inner.append(a);
        if (k.childNodes.length) inner.append(k); else k.remove();
        continue;
      }
      if (cur) cur.lastElementChild.append(k);
    }
    $$('details.sec', body).forEach(d => {
      const cells = $$('.cell', d).length, subs = $$('h4[id]', d).length;
      d.querySelector('.meta').textContent = [subs ? `${subs} part${subs > 1 ? 's' : ''}` : '', cells ? `${cells} example${cells > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
      d.addEventListener('toggle', () => {
        if (!d.open) return;
        [d.dataset.id, ...$$('h4[id]', d).map(x => x.id)].forEach(id => { if (NODE[id]) seen.add(id); }); saveSeen();
        $$('#rtoc a[data-id]').forEach(a => a.classList.toggle('seen', isRead(a.dataset.id)));
      });
    });
  },
  // the chapter's cheat sheet: what each section is about, plus the mistakes to watch for
  cheat(c, body) {
    const secs = $$('details.sec', body).map(d => {
      const p = $$('.sec-in p', d).find(x => !x.closest('.callout') && x.textContent.trim().length > 40);
      return { id: d.dataset.id, num: (SECS_NUM(c, d.dataset.id)), title: d.querySelector('summary .st').textContent.replace(/^\s*[\d.]+\s*/, ''), line: p ? firstSentence(p.textContent.replace(/^\s*Scope:\s*/i, '')) : '' };
    });
    const traps = $$('.callout.mistake', body).map(x => {
      const d = x.closest('details.sec'); let t = x.textContent.replace(/^\s*Common mistake[s]?\s*[—:-]*\s*/i, '');
      return { id: d ? d.dataset.id : null, t: firstSentence(t, 150) };
    }).filter(x => x.t).slice(0, 6);
    $('#cheat').innerHTML = `<div class="ch-top"><p>The chapter in ${secs.length} ideas. Click one to open its full notes below.</p></div>
      <ol class="ideas">${secs.map(s => `<li><a href="${L(s.id)}"><span class="n">${esc(s.num)}</span><span class="t">${esc(s.title)}</span>${s.line ? `<span class="l">${esc(s.line)}</span>` : ''}</a></li>`).join('')}</ol>
      ${traps.length ? `<div class="traps"><h3>Watch out for</h3><ul>${traps.map(t => `<li>${t.id ? `<a href="${L(t.id)}">${esc(t.t)}</a>` : esc(t.t)}</li>`).join('')}</ul></div>` : ''}`;
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
        const id = e.target.dataset.id || e.target.id;
        if (active) active.classList.remove('on');
        active = links[id]; if (active) { active.classList.add('on'); active.scrollIntoView({ block: 'nearest' }); }
      }
    }, { rootMargin: '-70px 0px -65% 0px' });
    $$('#body details.sec, #body h4[id]').forEach(h => this.spy.observe(h));
  }
};
// section number for an id like s6-2 -> "6.2"
function SECS_NUM(c, id) { const s = c.sections.find(x => x.id === id); return s ? s.num : id.slice(1).replace(/-/g, '.'); }

addEventListener('scroll', () => {
  if (curView !== 'read') return;
  const a = $('.rmain').getBoundingClientRect();
  $('#readbar').style.width = Math.min(100, Math.max(0, -a.top / (a.height - innerHeight) * 100)) + '%';
}, { passive: true });

export { Reader };
