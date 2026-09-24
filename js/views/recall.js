// flashcards (spaced repetition) and chapter quizzes
import { $, $$, esc, store, PV, pad2, chLabel, typeset, M, NODE, partOf, CARDS, done, seen, isRead, loadCards } from '../core.js';
import { curView } from '../router.js';

/* ======================= CARDS / SRS ======================= */
const SRS = {
  db: store.get('srs', {}),
  save() { store.set('srs', this.db); },
  due(now = Date.now()) { return Object.entries(this.db).filter(([, v]) => v.d <= now).map(([k]) => k); },
  grade(id, g) {
    const s = this.db[id] || { r: 0, i: 0, e: 2.5, d: 0 };
    const day = 864e5;
    if (g === 0) { s.r = 0; s.i = 0; s.e = Math.max(1.3, s.e - .2); s.d = Date.now() + 60e3; }
    else {
      if (g === 1) { s.i = Math.max(1, (s.i || 1) * 1.2); s.e = Math.max(1.3, s.e - .15); }
      else if (g === 2) { s.i = s.r === 0 ? 1 : s.r === 1 ? 3 : s.i * s.e; }
      else { s.i = s.r === 0 ? 4 : s.i * s.e * 1.3; s.e += .15; }
      s.r++; s.d = Date.now() + s.i * day;
    }
    this.db[id] = s; this.save(); badge();
  },
  preview(id) {
    const s = this.db[id] || { r: 0, i: 0, e: 2.5 };
    const f = d => d < 1 ? '1 min' : d < 30 ? Math.round(d) + 'd' : Math.round(d / 30) + 'mo';
    return ['1 min', f(Math.max(1, (s.i || 1) * 1.2)), f(s.r === 0 ? 1 : s.r === 1 ? 3 : s.i * s.e), f(s.r === 0 ? 4 : s.i * s.e * 1.3)];
  }
};
function badge() { const n = SRS.due().length; const b = $('#dueBadge'); b.hidden = !n; b.textContent = n; }

const Recall = {
  root: $('#recallRoot'), keyH: null,
  setKeys(fn) { if (this.keyH) removeEventListener('keydown', this.keyH); this.keyH = fn; if (fn) addEventListener('keydown', fn); },
  async dash() {
    this.setKeys(null);
    const r = this.root; r.innerHTML = `<p class="loading">Loading cards…</p>`;
    try { await loadCards(); } catch { r.innerHTML = `<p class="loading">Cards didn't load. Reload the page to try again.</p>`; return; }
    const qbest = store.get('qbest', {});
    const due = SRS.due().length, total = CARDS.flash.length, learning = Object.values(SRS.db).filter(v => v.i < 21).length, mastered = Object.values(SRS.db).filter(v => v.i >= 21).length;
    const newPool = this.newPool().length;
    r.innerHTML = `<div class="recall-head"><div><div class="eyebrow">Recall · spaced repetition</div><h1 class="h-display">Reading it once isn't knowing it.</h1>
      <p>${total} flashcards and ${CARDS.quiz.length} quiz questions, all generated from the chapters' own tables, code outputs and section openings. New cards come from what you've already read. Review intervals grow each time you remember a card, and shrink when you don't.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn primary" href="#review">Review ${due ? due + ' due' : ''}${due && newPool ? ' + ' : ''}${newPool ? Math.min(newPool, 12) + ' new' : ''}${!due && !newPool ? 'cards' : ''} →</a></div></div>
      <div class="tiles"><div class="tile hot"><b>${due}</b><span>due now</span></div><div class="tile"><b>${newPool}</b><span>new from your reading</span></div><div class="tile"><b>${learning}</b><span>learning</span></div><div class="tile"><b>${mastered}</b><span>mastered (21d+)</span></div></div>
      <div class="eyebrow" style="margin-bottom:10px">By chapter · card mastery and best quiz score</div>
      <div class="mastery">${M.chapters.filter(c => c.n >= 1 && c.n <= 24).map(c => {
        const cards = CARDS.flash.filter(f => f.c === c.n), m = cards.filter(f => SRS.db[f.id] && SRS.db[f.id].i >= 7).length, nq = CARDS.quiz.filter(q => q.c === c.n).length;
        const pct = cards.length ? Math.round(m / cards.length * 100) : 0;
        return `<div class="mcell" style="--pc:var(${PV[c.part]})"><div class="t"><span class="n">${pad2(c.n)}</span><b>${esc(c.title)}</b></div><div class="meter"><i style="width:${pct}%"></i></div>
          <div class="row"><span>${pct}% of ${cards.length} cards</span><span>quiz best ${qbest[c.n] != null ? qbest[c.n] + '%' : '—'}</span></div>
          <div class="acts"><a class="btn small" href="#quiz-${c.n}">Quiz (${Math.min(8, nq)})</a><button class="btn small" type="button" data-cards="${c.n}">Cards</button></div></div>`;
      }).join('')}</div>`;
    r.onclick = e => { const b = e.target.closest('[data-cards]'); if (b) this.review(+b.dataset.cards); };
  },
  newPool(ch) {
    const readCh = new Set([...done, ...[...seen].map(id => NODE[id] && NODE[id].c).filter(Boolean)]);
    return CARDS.flash.filter(f => !SRS.db[f.id] && (ch ? f.c === ch : (readCh.has(f.c) && (f.type === 'code' || isRead(f.sec)))));
  },
  async review(ch) {
    await loadCards();
    const byId = Object.fromEntries(CARDS.flash.map(f => [f.id, f]));
    let q = SRS.due().map(id => byId[id]).filter(Boolean);
    if (ch) q = q.filter(f => f.c === ch);
    let fresh = this.newPool(ch);
    if (!q.length && !fresh.length && !ch) fresh = CARDS.flash.filter(f => f.c === 1 && !SRS.db[f.id]);
    q = q.concat(fresh.slice(0, 12));
    this.runCards(q, ch);
  },
  runCards(q, ch) {
    const r = this.root; let i = 0, flipped = false, tally = [0, 0, 0, 0];
    const render = () => {
      if (i >= q.length) {
        this.setKeys(null);
        r.innerHTML = `<div class="session"><div class="card done-card"><div class="eyebrow">Session complete</div><b>${q.length ? q.length + ' cards' : 'Nothing due'}</b><p style="margin:0;color:var(--ink-2)">${q.length ? `Again ${tally[0]} · Hard ${tally[1]} · Good ${tally[2]} · Easy ${tally[3]}` : 'Read a few sections and new cards will appear here.'}</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><a class="btn" href="#recall">Back to Recall</a><a class="btn primary" href="#map">Explore the map</a></div></div></div>`;
        return;
      }
      const f = q[i], n = NODE[f.sec], pv = SRS.preview(f.id);
      r.innerHTML = `<div class="session"><div class="sess-top"><a class="btn small" href="#recall">← Recall</a><span class="sess-prog"><i style="width:${i / q.length * 100}%"></i></span><span>${i + 1} / ${q.length}${ch ? ' · ' + chLabel(ch) : ''}</span></div>
        <div class="card" style="--pc:var(${PV[partOf[f.c]]})"><div class="tag"><span class="k">${f.type === 'code' ? 'Predict the output' : 'Explain it'}</span><span class="sw"></span><span>${n ? n.num + ' ' + esc(n.t) : chLabel(f.c)}</span>${SRS.db[f.id] ? '' : '<span style="color:var(--accent)">new</span>'}</div>
        ${f.type === 'code' ? `<pre class="code"><code>${f.front.replace(/^<code>|<\/code>$/g, '')}</code></pre>` : `<p class="q">${esc(f.front.replace(/^[\d.]+\s/, ''))}</p><p style="margin:0;color:var(--muted);font-family:var(--f-mono);font-size:12px">Say what this section is about and why it matters, then check.</p>`}
        ${flipped ? `<div class="back">${f.type === 'code' ? `<pre class="out-text" style="padding:12px 14px;max-height:none">${f.back}</pre>` : f.back}<p style="margin:10px 0 0"><a class="chip" href="#${f.sec}">Read ${n ? n.num : 'section'} →</a></p></div>
          <div class="grades">${['Again', 'Hard', 'Good', 'Easy'].map((g, k) => `<button type="button" data-g="${k}">${g} <kbd>${k + 1}</kbd><small>${pv[k]}</small></button>`).join('')}</div>`
          : `<button class="btn primary" type="button" id="flip" style="justify-self:start">Show answer <kbd style="border-color:transparent;color:inherit">Space</kbd></button>`}
        </div></div>`;
      typeset(r);
      const fl = $('#flip', r); if (fl) { fl.onclick = () => { flipped = true; render(); }; fl.focus(); }
      $$('[data-g]', r).forEach(b => b.onclick = () => grade(+b.dataset.g));
    };
    const grade = g => { SRS.grade(q[i].id, g); tally[g]++; if (g === 0) q.push(q[i]); i++; flipped = false; render(); };
    this.setKeys(e => { if (curView !== 'recall' || document.activeElement === $('#cmd')) return; if (!flipped && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); flipped = true; render(); } else if (flipped && /^[1-4]$/.test(e.key)) grade(+e.key - 1); });
    render();
  },
  async quiz(ch) {
    await loadCards();
    const pool = CARDS.quiz.filter(q => q.c === ch);
    for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
    const qs = pool.slice(0, 8); const r = this.root; let i = 0, score = 0, answered = null;
    if (!qs.length) { r.innerHTML = `<div class="session"><div class="card done-card"><b>No quiz yet</b><p>${chLabel(ch)} has no tables to build questions from.</p><a class="btn" href="#recall">Back</a></div></div>`; return; }
    const render = () => {
      if (i >= qs.length) {
        this.setKeys(null);
        const pct = Math.round(score / qs.length * 100), best = store.get('qbest', {}); if (best[ch] == null || pct > best[ch]) { best[ch] = pct; store.set('qbest', best); }
        r.innerHTML = `<div class="session"><div class="card done-card"><div class="eyebrow">${chLabel(ch)} quiz</div><b>${score} / ${qs.length}</b><p style="margin:0;color:var(--ink-2)">${pct >= 75 ? 'Solid. Flashcards will keep it that way.' : 'Worth another pass through the sections you missed.'}</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn" type="button" id="again">Try again</button><a class="btn" href="#ch${ch}">Reread ${chLabel(ch)}</a><a class="btn primary" href="#recall">Back to Recall</a></div></div></div>`;
        $('#again').onclick = () => this.quiz(ch); return;
      }
      const q = qs[i], n = NODE[q.sec];
      r.innerHTML = `<div class="session"><div class="sess-top"><a class="btn small" href="#recall">← Recall</a><span class="sess-prog"><i style="width:${i / qs.length * 100}%"></i></span><span>${i + 1} / ${qs.length} · score ${score}</span></div>
        <div class="card" style="--pc:var(${PV[partOf[ch]]})"><div class="tag"><span class="k">Quiz · ${chLabel(ch)}</span><span class="sw"></span><span>${n ? n.num + ' ' + esc(n.t) : ''}</span></div>
        <p class="q">Which ${q.h0 ? '<em style="font-style:normal;color:var(--accent)">' + esc(q.h0) + '</em>' : 'row'} matches these clues?</p>
        <dl class="clues">${q.clues.map(([k, v]) => `<div><dt>${esc(k || '—')}</dt><dd>${v}</dd></div>`).join('')}</dl>
        <div class="opts">${q.opts.map((o, k) => `<button type="button" data-o="${k}" ${answered != null ? 'disabled' : ''} class="${answered != null ? (k === q.a ? 'right' : k === answered ? 'wrong' : '') : ''}"><kbd>${k + 1}</kbd><span>${o}</span></button>`).join('')}</div>
        ${answered != null ? `<div class="feedback">${answered === q.a ? '<span class="ok">✓ Correct</span>' : '<span class="no">✗ Not quite</span>'}${n ? `<a class="chip" href="#${q.sec}">See ${n.num} →</a>` : ''}<button class="btn primary small" type="button" id="nextQ">Next <kbd style="border-color:transparent;color:inherit">Enter</kbd></button></div>` : ''}
        </div></div>`;
      typeset(r);
      $$('[data-o]', r).forEach(b => b.onclick = () => pick(+b.dataset.o));
      const nx = $('#nextQ', r); if (nx) { nx.onclick = next; nx.focus(); }
    };
    const pick = k => { if (answered != null) return; answered = k; if (k === qs[i].a) score++; render(); };
    const next = () => { i++; answered = null; render(); };
    this.setKeys(e => { if (curView !== 'recall' || document.activeElement === $('#cmd')) return; if (answered == null && /^[1-4]$/.test(e.key)) pick(+e.key - 1); else if (answered != null && e.key === 'Enter') { e.preventDefault(); next(); } });
    render();
  }
};

export { SRS, badge, Recall };
