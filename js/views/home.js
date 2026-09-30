// home page: a short introduction, the four-tools network and the five stages
import { $, $$, esc, css } from '../core.js';
import { curView, go } from '../router.js';
import { TRACKS } from '../tracks.js';

const hrefOf = t => t.status === 'live' ? t.href : `#route-${t.id}`;


/* ======================= FOUR-TOOLS NETWORK ======================= */
const FeatViz = {
  // the four bold hubs: hover to see what each one is, click to go there
  F: [
    { h: '#route', t: 'Pathway', d: 'The five stages, from Python to generative AI.', v: '--p1' },
    { h: '#py/ch1', t: 'Chapters', d: 'Clear notes with short examples you can run.', v: '--p2' },
    { h: '#py/recall', t: 'Flashcards & quizzes', d: 'Practise so it sticks.', v: '--p3' },
    { h: '#console', t: 'Search', d: 'Type any topic to find it in both courses.', v: '--p5' },
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


const Home = {
  built: false,
  render() {
    if (this.built) return; this.built = true;
    FeatViz.init();
    $('#stageGrid').innerHTML = TRACKS.map(t => {
      const live = t.status === 'live';
      return `<li class="stage-card ${live ? 'live' : 'soon'}" style="--pc:var(${t.v})"><a href="${hrefOf(t)}">
        <span class="num">${t.n}</span>
        <h3>${esc(t.title)}</h3>
        <p>${esc(t.sub)}</p>
        <span class="meta">${live ? `<b>● Live</b> · ${esc(t.stats || '')}` : 'Coming soon'}</span>
        <span class="go">${live ? 'Open →' : 'See what\'s planned →'}</span>
      </a></li>`;
    }).join('');
  }
};

export { Home };
