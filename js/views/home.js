// home page: background network, five-tools visual, goals and features
import { $, $$, esc, store, PV, css, pad2, chLabel, M, G, byN, partOf } from '../core.js';
import { curView, route, go } from '../router.js';
import { Metro } from './metro.js';
import { Tour } from '../tour.js';

/* ======================= HOME BACKGROUND NETWORK ======================= */
const HeroBg = {
  cv: null, t0: 0, raf: null, pal: null, palAt: 0, pts: null,
  init() {
    this.cv = $('#heroBg'); if (!this.cv || !G) return;
    let h = 2166136261;
    const rnd = s => { let x = 0; for (const c of s) x = Math.imul(x ^ c.charCodeAt(0), 16777619); return ((x >>> 0) % 1000) / 1000; };
    this.pts = G.nodes.map(n => ({ x: n.x, y: n.y, z: (rnd(n.id) - .5) * (n.hub ? .3 : .9), r: n.hub ? 2.6 : 1.2 + Math.sqrt(n.in) * .35, c: n.c, id: n.id }));
    this.idx = Object.fromEntries(this.pts.map((p, i) => [p.id, i]));
    this.links = G.edges.map(([a, b]) => [this.idx[a], this.idx[b]]).filter(([a, b]) => a != null && b != null);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const loop = t => { this.draw(t); if (!reduce) this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  },
  draw(t) {
    const cv = this.cv; if (curView !== 'home' || document.hidden) return;
    if (this._last && t - this._last < 33) return; this._last = t;
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, r.width, r.height);
    if (!this.pal || t - this.palAt > 1500) { this.palAt = t; this.pal = { edge: css('--edge'), part: Object.fromEntries(Object.keys(PV).map(k => [k, css(PV[k])])) }; }
    const a = (t || 0) / 1000 * .06, ca = Math.cos(a), sa = Math.sin(a), tilt = .35, ct = Math.cos(tilt), st = Math.sin(tilt);
    const wide = r.width > 900, S = (wide ? Math.min(r.width * .42, r.height * .62) : Math.min(r.width * .7, 380));
    const cx = wide ? r.width * .56 : r.width * .5, cy = wide ? r.height * .4 : 360;
    const P = this.pts.map(p => { const x = p.x * ca - p.z * sa, z = p.x * sa + p.z * ca; const y = p.y * ct - z * st, z2 = p.y * st + z * ct; const k = 1 / (1.6 - z2 * .5); return [cx + x * S * k, cy + y * S * k, k, z2]; });
    c.lineWidth = .6; c.strokeStyle = `rgba(${this.pal.edge},.13)`; c.beginPath();
    for (const [i, j] of this.links) { const A = P[i], B = P[j]; c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); }
    c.stroke();
    this.pts.forEach((p, i) => { const q = P[i]; c.globalAlpha = .28 + q[3] * .25; c.fillStyle = this.pal.part[partOf[p.c]]; c.beginPath(); c.arc(q[0], q[1], p.r * q[2] * 1.2, 0, 6.283); c.fill(); });
    c.globalAlpha = 1;
  }
};

/* ======================= HOME FEATURE VIRUS ======================= */
const FeatViz = {
  F: [
    { h: '#route', t: 'Route planner', d: 'Pick a goal, get only the chapters you need, in order.', v: '--p1' },
    { h: '#ch1', t: 'Chapter reader', d: 'The notes: maths, code and real output, chapter by chapter.', v: '--p2' },
    { h: '#recall', t: 'Flashcards & quizzes', d: '512 cards and 665 questions built from the notes.', v: '--p3' },
    { h: '#map', t: 'Map of ideas', d: 'See how all 439 sections link to each other.', v: '--p4' },
    { h: '#console', t: 'Quick console', d: 'Type a topic or command and jump straight there.', v: '--p5' },
  ],
  init() {
    const cv = $('#featViz'); if (!cv) return; this.cv = cv;
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const K = this.F.length; this.nodes = []; this.hubs = [];
    this.F.forEach((f, k) => {
      const a = -Math.PI / 2 + k * 2 * Math.PI / K;
      this.hubs.push({ k, a, r: .8 });
      const sw = 2 * Math.PI / K;
      for (let i = 0; i < 95; i++) { const rr = .5 + Math.sqrt(rnd()) * .56, da = (rnd() - .5) * sw * .98; this.nodes.push({ k, a: a + da, r: rr, s: 1.8 + rnd() * rnd() * 7.5, ph: rnd() * 6.28 }); }
    });
    this.edges = [];
    for (let i = 0; i < 320; i++) { const A = Math.floor(rnd() * this.nodes.length), B = Math.floor(rnd() * this.nodes.length); if (this.nodes[A].k !== this.nodes[B].k || rnd() < .15) this.edges.push([A, B]); }
    this.hov = -1;
    $('#fvLegend').innerHTML = this.F.map((f, k) => `<a href="${f.h}" data-k="${k}" style="--pc:var(${f.v})"><i></i>${f.t}</a>`).join('');
    $('#fvLegend').addEventListener('mouseover', e => { const a = e.target.closest('[data-k]'); this.hov = a ? +a.dataset.k : -1; });
    $('#fvLegend').addEventListener('mouseleave', () => this.hov = -1);
    const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointermove', e => { const [x, y] = pos(e); this.setHov(this.hit(x, y)); });
    cv.addEventListener('pointerleave', () => this.setHov(-1));
    cv.addEventListener('click', e => { const [x, y] = pos(e); const k = this.hit(x, y); if (k >= 0) go(this.F[k].h.slice(1)); });
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const loop = t => { this.draw(reduce ? 0 : t); if (!reduce) requestAnimationFrame(loop); else setTimeout(() => requestAnimationFrame(loop), 500); };
    requestAnimationFrame(loop);
  },
  setHov(k) {
    if (k === this.hov && this._tipK === k) return; this.hov = k; this._tipK = k;
    this.cv.style.cursor = k >= 0 ? 'pointer' : 'default';
    $$('#fvLegend a').forEach(a => a.classList.toggle('on', +a.dataset.k === k));
  },
  hit(x, y) { if (!this.H) return -1; for (let k = 0; k < this.H.length; k++) { const [hx, hy, hr] = this.H[k]; if ((x - hx) ** 2 + (y - hy) ** 2 < (hr + 10) ** 2) return k; } return -1; },
  draw(t) {
    if (curView !== 'home' || document.hidden) return;
    if (this._l && t && t - this._l < 30) return; this._l = t;
    const cv = this.cv, r = cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, r.width, r.height);
    if (!this.pal || (t - (this.palAt || 0)) > 1500) { this.palAt = t; this.pal = { edge: css('--edge'), ground: css('--ground'), ink: css('--ink'), col: this.F.map(f => css(f.v)), mono: css('--f-mono') }; }
    const P = this.pal, W = r.width, Hh = r.height, cx = W / 2, cy = Hh / 2, R = Math.min(W, Hh) * .42, rot = (t || 0) / 1000 * .035;
    const xy = (a, rr) => [cx + Math.cos(a + rot) * rr * R, cy + Math.sin(a + rot) * rr * R];
    const pts = this.nodes.map(n => xy(n.a + Math.sin((t || 0) / 2400 + n.ph) * .012, n.r));
    // ring
    c.strokeStyle = `rgba(${P.edge},.10)`; c.lineWidth = 1; c.setLineDash([2, 6]); c.beginPath(); c.arc(cx, cy, R * 1.0, 0, 6.283); c.stroke(); c.setLineDash([]);
    // edges
    for (const [a, b] of this.edges) {
      const A = pts[a], B = pts[b], ka = this.nodes[a].k, kb = this.nodes[b].k, on = this.hov >= 0 && (ka === this.hov || kb === this.hov);
      c.strokeStyle = on ? P.col[this.hov] : `rgba(${P.edge},1)`; c.globalAlpha = this.hov >= 0 ? (on ? .45 : .04) : .1; c.lineWidth = on ? 1.1 : .7;
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
      c.beginPath(); c.moveTo(A[0], A[1]); c.quadraticCurveTo(cx + (mx - cx) * .3, cy + (my - cy) * .3, B[0], B[1]); c.stroke();
    }
    // small outline nodes
    this.nodes.forEach((n, i) => {
      const [x, y] = pts[i]; c.globalAlpha = this.hov >= 0 && n.k !== this.hov ? .25 : .95;
      c.fillStyle = P.ground; c.strokeStyle = P.col[n.k]; c.lineWidth = 1.5;
      c.beginPath(); c.arc(x, y, n.s, 0, 6.283); c.fill(); c.stroke();
    });
    // bold hubs
    this.H = this.hubs.map(h => { const [x, y] = xy(h.a, h.r); return [x, y, Math.max(15, R * .085)]; });
    this.H.forEach(([x, y, hr], k) => {
      const hot = k === this.hov, pulse = (((t || 0) / 1000 + k * .4) % 2.4) / 2.4;
      c.globalAlpha = this.hov >= 0 && !hot ? .45 : 1;
      c.strokeStyle = P.col[k]; c.lineWidth = 2; c.globalAlpha *= (1 - pulse) * .8;
      c.beginPath(); c.arc(x, y, hr + pulse * hr * 1.4, 0, 6.283); c.stroke();
      c.globalAlpha = this.hov >= 0 && !hot ? .5 : 1;
      c.fillStyle = P.col[k]; c.beginPath(); c.arc(x, y, hot ? hr * 1.18 : hr, 0, 6.283); c.fill();
      c.fillStyle = P.ground; c.font = `700 ${Math.round(hr * .8)}px ${P.mono}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(k + 1, x, y + 1);
    });
    c.globalAlpha = 1;
    const tip = $('#fvTip');
    if (this.hov >= 0 && this._tipK === this.hov) {
      const [x, y, hr] = this.H[this.hov], f = this.F[this.hov];
      tip.innerHTML = `<b>${f.t}</b><span>${f.d}</span>`; tip.hidden = false;
      tip.style.left = Math.max(125, Math.min(W - 125, x)) + 'px'; tip.style.top = (y - hr) + 'px';
    } else tip.hidden = true;
  }
};
/* ======================= HOME ======================= */
const Home = {
  built: false,
  GOALS: [
    { n: 11, ico: '↗', t: 'Predict a number', eg: 'House prices, next month\'s sales, delivery times.' },
    { n: 13, ico: '✓', t: 'Answer yes or no', eg: 'Spam or not, will a customer leave, pass or fail.' },
    { n: 17, ico: '⤷', t: 'Make rules you can explain', eg: 'If-this-then-that decisions anyone can read.' },
    { n: 19, ico: '▲', t: 'Win on spreadsheet data', eg: 'The go-to method for tabular problems at work.' },
    { n: 20, ico: '◎', t: 'Find natural groups', eg: 'Customer segments and similar items, no labels needed.' },
    { n: 21, ico: '!', t: 'Spot the odd ones out', eg: 'Fraud, faulty sensors, and items bought together.' },
    { n: 22, ico: '⚖', t: 'Handle messy, unbalanced data', eg: 'Rare classes, and the leaks that fake a good score.' },
    { n: 24, ico: '⇪', t: 'Explain and ship a model', eg: 'Why it predicted that, and keeping it healthy live.' },
  ],
  FEATS: [
    { h: '#route', tag: 'Plan', t: 'Route planner', p: 'Pick a destination and follow only the chapters you need, in order.', go: 'Plan a route', ic: '<path d="M3 6h7l4 6h7M3 18h5l4-6"/><circle cx="3" cy="6" r="1.5"/><circle cx="21" cy="12" r="1.5"/><circle cx="12" cy="12" r="2.2"/><circle cx="3" cy="18" r="1.5"/>' },
    { h: '#ch1', tag: 'Read', t: 'Chapter reader', p: 'Clear notes with the maths, the code and its real output. Each heading shows what it builds on.', go: 'Read Chapter 1', ic: '<path d="M3 5.5C6 4 9 4 12 6c3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5z"/><path d="M12 6v13.5"/>' },
    { h: '#recall', tag: 'Remember', t: 'Flashcards & quizzes', p: '512 cards and 665 questions made from the notes. Cards come back just before you would forget them.', go: 'Practise now', ic: '<rect x="4" y="6" width="13" height="15" rx="2"/><path d="M8 3h10a2 2 0 0 1 2 2v12"/><path d="m7.5 14 2 2 4-4.5"/>' },
    { h: '#map', tag: 'Explore', t: 'Map of ideas', p: 'See how all 439 sections link together, and which ideas everything else relies on.', go: 'Open the map', ic: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="3.5" r="1.6"/><circle cx="19" cy="15" r="1.6"/><circle cx="6" cy="17" r="1.6"/><path d="M12 5.1 18 14M7.4 16.2 17.4 15"/>' },
    { h: '#console', tag: 'Jump', t: 'Quick console', p: 'Type “lasso” or open(11) in the box at the top of any page to go straight there.', go: 'Try the console', ic: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="m7 9 3 3-3 3M12.5 15H17"/>' },
  ],
  fmt(m) { return m >= 60 ? `${Math.floor(m / 60)}h ${pad2(m % 60)}m` : `${m} min`; },
  render() {
    if (!this.built) {
      this.built = true;
      $('#goalGrid').innerHTML = this.GOALS.map(g => {
        const rt = Metro.compute(g.n), c = byN[g.n];
        const mins = rt.reduce((a, r) => a + byN[r.n].minutes, 0);
        const dots = rt.map((r, i) => (i ? '<b></b>' : '') + `<i class="${r.kind === 'target' ? 't' : ''}" style="--c:var(${PV[partOf[r.n]]})" title="Ch ${r.n} · ${esc(byN[r.n].title)}"></i>`).join('');
        return `<a class="goal" href="#route-${g.n}" style="--pc:var(${PV[c.part]})"><span class="ico" aria-hidden="true">${g.ico}</span><h3>${g.t}</h3><p class="eg">${g.eg}</p><p class="dest"><span>Ends at</span> Ch ${g.n} · ${esc(c.title)}</p><div class="minir" aria-hidden="true">${dots}</div><div class="foot"><span>${rt.length} chapters · ${this.fmt(mins)}</span><em>Route →</em></div></a>`;
      }).join('');
      $('#featGrid').innerHTML = this.FEATS.map(f => `<a class="feat" href="${f.h}"><svg viewBox="0 0 24 24" aria-hidden="true">${f.ic}</svg><span class="tag2">${f.tag}</span><h3>${f.t}</h3><p>${f.p}</p><span class="go">${f.go} →</span></a>`).join('');
      const sel = $('#goalSel');
      sel.innerHTML = `<option value="">Choose a chapter…</option>` + M.chapters.filter(c => c.n >= 1 && c.n <= 24).map(c => `<option value="${c.n}">${pad2(c.n)} · ${esc(c.title)}</option>`).join('');
      sel.onchange = () => { if (sel.value) go('route-' + sel.value); };
      $('#ctaRoute').onclick = () => go('route');
      $('#homeTour').onclick = () => { if (!Tour.active) { scrollTo({ top: 0 }); Tour.start(0); } };
      const st = $('#homeStats');
      const nSec = G.nodes.filter(n => !n.hub).length, nCode = M.chapters.reduce((a, c) => a + c.code, 0), hrs = Math.round(M.chapters.filter(c => c.n >= 1 && c.n <= 24).reduce((a, c) => a + c.minutes, 0) / 60);
      st.innerHTML = `<div><b>24</b><span>chapters</span></div><div><b>${nSec}</b><span>short sections</span></div><div><b>${nCode}</b><span>runnable code cells</span></div><div><b>512</b><span>flashcards</span></div><div><b>~${hrs} h</b><span>of reading</span></div>`;
    }
    const last = store.get('lastCh', null), r = $('#homeResume');
    if (last != null && byN[last]) { r.innerHTML = `Welcome back. <a href="#ch${last}">Continue ${chLabel(last)}: ${esc(byN[last].title)} →</a>`; r.hidden = false; }
    const rt = store.get('route', null);
    if (rt && byN[rt]) { r.innerHTML += `${r.hidden ? '' : '<br>'}Your route: <a href="#route-${rt}">heading to ${chLabel(rt)} →</a>`; r.hidden = false; }
  }
};

export { HeroBg, FeatViz, Home };
