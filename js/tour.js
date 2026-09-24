// guided tour
import { $, $$, store, typeset, G, SECS, NODE, done } from './core.js';
import { curView, route, go } from './router.js';
import { Home } from './views/home.js';
import { Map_ } from './views/map.js';
import { Recall } from './views/recall.js';

/* ======================= GUIDED TOUR ======================= */
const Tour = (() => {
  const SECS = ['Welcome', 'Start here', 'Get around', 'Done'];
  let steps = [], i = 0, active = false, loop = null, poll = null, doneFlag = false, lastKey = '', entered = -1;
  let spot, blocks, pulse, card, dock;
  const W = () => innerWidth, H = () => innerHeight, mobile = () => innerWidth < 760;

  /* ---------- helpers that put the site into the state a step needs ---------- */
  const TOP = () => G.nodes.filter(n => !n.hub).sort((a, b) => b.in - a.in)[0].id;
  const view = v => { if (curView !== v) go(v === 'read' ? 'ch1' : v); };
  const goGoals = () => go('route');
  const introOpen = () => { const el = $('#mapIntro'); if (el.classList.contains('mini')) { el.classList.remove('mini'); $('#introToggle').textContent = 'Hide'; } };
  const mapClean = () => { Map_.clear(); Map_.fitted = false; Map_.resize(); };
  const partsOn = () => { $$('#legend [data-p].off').forEach(b => b.click()); };
  const el = s => () => { const e = typeof s === 'function' ? s() : $(s); return e && e.getClientRects().length ? e : null; };
  const nodeRect = id => () => { const n = NODE[id]; if (!n || !Map_.ctx) return null; const r = Map_.cv.getBoundingClientRect(); const x = r.left + Map_.X(n), y = r.top + Map_.Y(n); return { left: x - 20, top: y - 20, width: 40, height: 40 }; };
  const ringRect = () => { if (!Map_.ctx) return null; const r = Map_.cv.getBoundingClientRect(); const s = Map_.s * 1.04; return { left: r.left + Map_.tx - s, top: r.top + Map_.ty - s, width: 2 * s, height: 2 * s }; };
  const union = (...sels) => () => { const rs = sels.map(s => $(s)).filter(Boolean).map(e => e.getBoundingClientRect()); if (!rs.length) return null; const l = Math.min(...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top)), rr = Math.max(...rs.map(r => r.right)), b = Math.max(...rs.map(r => r.bottom)); return { left: l, top: t, width: rr - l, height: b - t }; };
  const entries = () => $$('#log .entry').length;
  let entryBase = 0;

  steps = [
    { sec: 'Welcome', center: true, welcome: true,
      title: 'Welcome to Gradient Atlas',
      body: `<p>Study notes for <b>classical machine learning</b>: 24 chapters where you build each algorithm yourself, then check it against scikit-learn, the library used at work.</p><p>This quick tour shows you the few things you need. It takes about 30 seconds.</p>`,
      before() { view('home'); scrollTo({ top: 0 }); } },
    { sec: 'Start here', target: el('#ctaRoute'),
      title: 'Start here',
      body: `<p><b>Plan my study route</b> opens the route planner. Pick the chapter you want to reach and it shows only the chapters you need first, in order, with how long each takes.</p>`,
      before() { view('home'); scrollTo({ top: 0 }); } },
    { sec: 'Start here', target: el('#featGrid'),
      title: 'Five ways to study',
      body: `<p>Plan a route, read the chapters, practise with flashcards, explore how ideas connect, or jump anywhere from the console. Use whichever suits you today.</p>`,
      before() { view('home'); } },
    { sec: 'Start here', target: el('#goalGrid'),
      title: 'Only need one thing?',
      body: `<p>These are the most popular goals. Click one and you skip straight to the shortest route for it.</p>`,
      before() { view('home'); } },
    { sec: 'Get around', target: el('.rail'),
      title: 'Switch pages here',
      body: `<p>Home, Map, Route, Console, Recall and Read are always one click away.</p>`,
      before() { view('home'); } },
    { sec: 'Get around', target: el('#repl .repl-in'),
      title: 'Or just type',
      body: `<p>Type a topic like <code>decision trees</code> and press Enter to find it. This box works on every page.</p>`,
      before() { view('home'); } },
    { sec: 'Done', center: true, finale: true,
      title: 'You\'re all set',
      body: `<p>The easiest way to begin is to plan a route and follow it. New to all of this? Chapter 1 starts from zero.</p><p>Replay this tour any time from the <b>?</b> button at the top.</p>`,
      before() { view('home'); scrollTo({ top: 0 }); } },
  ];

  /* ---------- DOM ---------- */
  function build() {
    if (spot) return;
    spot = document.createElement('div'); spot.className = 'tour-spot'; document.body.appendChild(spot);
    blocks = [0, 1, 2, 3].map(() => { const b = document.createElement('div'); b.className = 'tour-block'; b.addEventListener('click', nudge); document.body.appendChild(b); return b; });
    pulse = document.createElement('div'); pulse.className = 'tour-pulse'; pulse.hidden = true; document.body.appendChild(pulse);
    card = document.createElement('div'); card.className = 'tour-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-live', 'polite'); document.body.appendChild(card);
    dock = document.createElement('div'); dock.className = 'tour-dock'; document.body.appendChild(dock);
    dock.addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      const a = b.dataset.t; if (a === 'next') next(); else if (a === 'prev') prev(); else if (a === 'skip') end(); else if (a === 'jump') jump(+b.dataset.i);
    });
    card.addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      const a = b.dataset.t;
      if (a === 'next') next(); else if (a === 'skip') end();
      else if (a === 'ch1') { end(); go('ch1'); } else if (a === 'goals') { end(); goGoals(); } else if (a === 'map') { end(); go('map'); } else if (a === 'metro') { end(); go('metro'); }
    });
  }
  function nudge() { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); if (!pulse.hidden) { pulse.classList.remove('boost'); void pulse.offsetWidth; pulse.classList.add('boost'); } }

  function dockHTML() {
    const s = steps[i];
    const segs = SECS.map(name => {
      const idx = steps.map((st, k) => st.sec === name ? k : -1).filter(k => k >= 0);
      const doneN = idx.filter(k => k < i).length + (s.sec === name ? 1 : 0);
      const first = idx[0];
      return `<button type="button" class="seg ${s.sec === name ? 'cur' : ''} ${idx.every(k => k < i) ? 'done' : ''}" data-t="jump" data-i="${first}" style="flex:${idx.length + 3}" aria-label="Jump to ${name}"><span class="tbar"><i style="width:${doneN / idx.length * 100}%"></i></span><span class="nm">${name}</span></button>`;
    }).join('');
    const isAction = s.action && !doneFlag;
    return `<button type="button" class="t-skip" data-t="skip">Skip tour</button>
      <div class="segs">${segs}</div>
      <span class="t-count">${i + 1}/${steps.length}</span>
      <button type="button" class="t-btn" data-t="prev" ${i === 0 ? 'disabled' : ''} aria-label="Previous step">← Back</button>
      <button type="button" class="t-btn primary" data-t="next">${i === steps.length - 1 ? 'Finish' : isAction ? 'Do it for me →' : 'Next →'}</button>`;
  }
  function cardHTML() {
    const s = steps[i];
    const art = s.welcome ? `<svg class="t-art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="44" fill="none" stroke="var(--line-2)" stroke-dasharray="2 5"/>${[...Array(12)].map((_, k) => { const a = k / 12 * Math.PI * 2 - Math.PI / 2; return `<circle cx="${60 + 44 * Math.cos(a)}" cy="${60 + 44 * Math.sin(a)}" r="${k % 3 === 0 ? 5 : 3}" fill="var(${['--p1', '--p2', '--p3', '--p4', '--p5', '--p6'][k % 6]})"/>`; }).join('')}<path class="chord c1" d="M60 16 Q60 60 98 82"/><path class="chord c2" d="M22 82 Q60 60 98 38"/><path class="chord c3" d="M38 22 Q60 60 60 104"/></svg>` : '';
    const hint = s.action ? (doneFlag ? `<div class="t-hint ok">✓ Nice, that's it.</div>` : `<div class="t-hint"><span class="dotp"></span>Your turn. Click the glowing spot.</div>`) : '';
    const foot = s.welcome ? `<div class="t-acts"><button type="button" class="btn primary" data-t="next">Show me (30 sec) →</button><button type="button" class="btn" data-t="skip">Skip, I'll explore</button></div>`
      : s.finale ? `<div class="t-acts"><button type="button" class="btn primary" data-t="goals">Plan my study route →</button><button type="button" class="btn" data-t="ch1">Start Chapter 1</button></div>` : '';
    return `${art}<div class="t-sec">${s.sec === 'Welcome' || s.sec === 'Done' ? 'Gradient Atlas · ML Materials' : s.sec + ' · ' + (steps.filter(x => x.sec === s.sec).indexOf(s) + 1) + ' of ' + steps.filter(x => x.sec === s.sec).length}</div><h3>${s.title}</h3><div class="t-body">${s.body}</div>${hint}${foot}`;
  }

  /* ---------- layout: spotlight hole, click blockers, pulse, card position ---------- */
  function rectOf(s) {
    if (s.center || !s.target) return null;
    const t = s.target(); if (!t) return null;
    const r = t.getBoundingClientRect ? t.getBoundingClientRect() : t;
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  function layout() {
    if (!active) return;
    const s = steps[i];
    let r = rectOf(s);
    const pad = s.round ? 6 : 8;
    let hole;
    if (r) {
      const vis = { l: Math.max(4, r.left - pad), t: Math.max(4, r.top - pad), r: Math.min(W() - 4, r.left + r.width + pad), b: Math.min(H() - 4, r.top + r.height + pad) };
      hole = { x: vis.l, y: vis.t, w: Math.max(0, vis.r - vis.l), h: Math.max(0, vis.b - vis.t) };
      if (s.round) { const d = Math.max(hole.w, hole.h); hole = { x: hole.x + hole.w / 2 - d / 2, y: hole.y + hole.h / 2 - d / 2, w: d, h: d }; }
    } else hole = { x: W() / 2, y: H() / 2, w: 0, h: 0 };
    const key = [i, Math.round(hole.x), Math.round(hole.y), Math.round(hole.w), Math.round(hole.h), W(), H(), doneFlag].join(',');
    Object.assign(spot.style, { left: hole.x + 'px', top: hole.y + 'px', width: hole.w + 'px', height: hole.h + 'px', borderRadius: s.round ? '50%' : '12px' });
    spot.classList.toggle('ring', !!r);
    // blockers: let clicks through the hole only on action steps
    const open = s.action && r && !doneFlag;
    const hx = open ? hole.x : 0, hy = open ? hole.y : 0, hw = open ? hole.w : 0, hh = open ? hole.h : 0;
    const set = (b, x, y, w, h) => Object.assign(b.style, { left: x + 'px', top: y + 'px', width: Math.max(0, w) + 'px', height: Math.max(0, h) + 'px' });
    if (open) {
      set(blocks[0], 0, 0, W(), hy); set(blocks[1], 0, hy + hh, W(), H() - hy - hh);
      set(blocks[2], 0, hy, hx, hh); set(blocks[3], hx + hw, hy, W() - hx - hw, hh);
    } else { set(blocks[0], 0, 0, W(), H()); set(blocks[1], 0, 0, 0, 0); set(blocks[2], 0, 0, 0, 0); set(blocks[3], 0, 0, 0, 0); }
    // pulse
    if (s.action && r && !doneFlag) { pulse.hidden = false; pulse.style.left = (r.left + r.width / 2) + 'px'; pulse.style.top = (r.top + r.height / 2) + 'px'; }
    else pulse.hidden = true;
    const dockTop = !!r && hole.y + hole.h > H() - (mobile() ? 150 : 96) && hole.y > 150;
    dock.classList.toggle('top', dockTop);
    if (key + dockTop === lastKey) return; lastKey = key + dockTop;
    placeCard(r ? { left: hole.x, top: hole.y, right: hole.x + hole.w, bottom: hole.y + hole.h, width: hole.w, height: hole.h } : null, s);
  }
  function placeCard(r, s) {
    const dt = dock.classList.contains('top');
    const dockH = dt ? 16 : dock.offsetHeight + 28 + (mobile() ? 64 : 0);
    const minY = dt ? 58 + dock.offsetHeight + 24 : 70;
    const cw = card.offsetWidth, ch = card.offsetHeight, gap = 18, m = 16;
    let x, y;
    if (!r) { x = (W() - cw) / 2; y = Math.max(m + 56, (H() - dockH - ch) / 2); }
    else if (mobile()) {
      x = (W() - cw) / 2;
      const cy = r.top + r.height / 2;
      y = cy > H() * .45 ? minY : H() - dockH - ch - 8;
    } else {
      const fitsR = r.right + gap + cw < W() - m, fitsL = r.left - gap - cw > m + 84, fitsB = r.bottom + gap + ch < H() - dockH, fitsA = r.top - gap - ch > minY;
      const clampY = v => Math.max(minY, Math.min(v, H() - dockH - ch));
      const clampX = v => Math.max(m + 84, Math.min(v, W() - cw - m));
      if (s.inside || (r.width > W() * .6 && r.height > H() * .5)) { x = r.right - cw - 28; y = r.top + 28; }
      else if (fitsR) { x = r.right + gap; y = clampY(r.top + r.height / 2 - ch / 2); }
      else if (fitsL) { x = r.left - gap - cw; y = clampY(r.top + r.height / 2 - ch / 2); }
      else if (fitsB) { x = clampX(r.left + r.width / 2 - cw / 2); y = r.bottom + gap; }
      else if (fitsA) { x = clampX(r.left + r.width / 2 - cw / 2); y = r.top - gap - ch; }
      else { x = r.right - cw - 28; y = r.top + 28; }
      x = Math.max(m, Math.min(x, W() - cw - m));
    }
    card.style.left = x + 'px'; card.style.top = Math.max(r ? minY : 8, y) + 'px';
  }

  /* ---------- flow ---------- */
  function render() {
    const s = steps[i];
    card.className = 'tour-card' + (s.center ? ' center' : '') + (s.welcome ? ' welcome' : '');
    card.innerHTML = cardHTML(); dock.innerHTML = dockHTML();
    card.classList.remove('enter'); void card.offsetWidth; card.classList.add('enter');
    lastKey = ''; layout();
    typeset(card);
  }
  async function enter(k, dir = 1) {
    i = Math.max(0, Math.min(steps.length - 1, k)); doneFlag = false; entered = i;
    const s = steps[i];
    if (s.skip && s.skip() && i > 0 && i < steps.length - 1) return enter(i + dir, dir);
    clearInterval(poll);
    try { s.before && s.before(); } catch (e) {}
    render();
    // scroll target into view once it exists
    setTimeout(() => { const t = s.target && s.target(); if (t && t.scrollIntoView && !t.closest?.('.bar,.rail')) { const r = t.getBoundingClientRect(); if (r.top < 60 || r.bottom > H() - 100) t.scrollIntoView({ block: r.height > H() * .6 ? 'start' : 'center', behavior: 'smooth' }); } }, 250);
    if (s.action) poll = setInterval(() => {
      if (!active || entered !== i || doneFlag) return;
      if (s.done()) { doneFlag = true; clearInterval(poll); card.innerHTML = cardHTML(); dock.innerHTML = dockHTML(); lastKey = ''; layout(); setTimeout(() => { if (active && entered === i) next(); }, 900); }
    }, 150);
  }
  function next() {
    const s = steps[i];
    if (s.action && !doneFlag) { try { s.doIt(); } catch (e) {} doneFlag = true; clearInterval(poll); setTimeout(() => active && enter(i + 1), 500); card.innerHTML = cardHTML(); dock.innerHTML = dockHTML(); lastKey = ''; layout(); return; }
    if (i >= steps.length - 1) return end();
    enter(i + 1);
  }
  function prev() { if (i > 0) enter(i - 1, -1); }
  function jump(k) { enter(k); }
  function onKey(e) {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); end(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  }
  function start(at = 0) {
    build(); active = true; document.body.classList.add('touring');
    requestAnimationFrame(() => spot.classList.add('on'));
    addEventListener('keydown', onKey, true);
    addEventListener('resize', layout);
    loop = setInterval(layout, 120);
    enter(at);
  }
  function end() {
    active = false; clearInterval(loop); clearInterval(poll);
    removeEventListener('keydown', onKey, true); removeEventListener('resize', layout);
    store.set('toured2', true);
    spot.classList.remove('on'); document.body.classList.remove('touring');
    [card, dock, pulse, ...blocks].forEach(e => e.hidden = true);
    setTimeout(() => { [spot, card, dock, pulse, ...blocks].forEach(e => e.remove()); spot = null; }, 450);
    partsOn();
  }
  return { start, end, get active() { return active; } };
})();
$('#tourBtn').addEventListener('click', () => { if (!Tour.active) Tour.start(0); });

export { Tour };
