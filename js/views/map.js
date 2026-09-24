// knowledge map (canvas ring of sections + cross-reference edges)
import { $, esc, PV, css, chLabel, typeset, M, G, byN, NODE, OUTE, INE, partOf, CARDS, isRead } from '../core.js';
import { curView, route } from '../router.js';

/* ======================= MAP ======================= */
const Map_ = {
  cv: $('#mapCv'), s: 300, tx: 0, ty: 0, w: 0, h: 0, sel: null, hov: null, off: new Set(), pal: null, fitted: false, anim: null,
  palette() {
    if (this.pal) return this.pal;
    const p = { ground: css('--ground'), ink: css('--ink'), muted: css('--muted'), line: css('--line'), accent: css('--accent'), panel: css('--panel'), edge: css('--edge'), mono: css('--f-mono'), disp: css('--f-display') };
    p.part = {}; for (const k in PV) p.part[k] = css(PV[k]);
    return this.pal = p;
  },
  resize() {
    const r = this.cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height; this.cv.width = r.width * dpr; this.cv.height = r.height * dpr;
    this.ctx = this.cv.getContext('2d'); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.fitted) this.fit(false);
    this.draw();
  },
  fit(animate = true) {
    const wide = this.w > 900, intro = $('#mapIntro'), ir = wide && !intro.classList.contains('mini') ? intro.getBoundingClientRect().right - this.cv.getBoundingClientRect().left + 10 : 0;
    const avail = this.w - ir;
    const s = wide ? Math.min(avail / 2 - 175, this.h * .4) : Math.min(this.w * .36, this.h * .3);
    const tx = ir + avail / 2, ty = wide ? this.h / 2 - 10 : this.h * .62;
    this.fitted = true;
    if (animate) this.tween(s, tx, ty); else { this.s = s; this.tx = tx; this.ty = ty; }
  },
  tween(s, tx, ty) {
    cancelAnimationFrame(this.anim);
    const a = { s: this.s, tx: this.tx, ty: this.ty }, t0 = performance.now(), D = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 420;
    const step = t => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
      this.s = a.s + (s - a.s) * e; this.tx = a.tx + (tx - a.tx) * e; this.ty = a.ty + (ty - a.ty) * e; this.draw();
      if (k < 1) this.anim = requestAnimationFrame(step); };
    this.anim = requestAnimationFrame(step);
  },
  X(n) { return this.tx + n.x * this.s; }, Y(n) { return this.ty + n.y * this.s; },
  rad(n) { const z = Math.max(.85, Math.min(2.2, this.s / 330)); return (n.hub ? 10 : 2.3 + Math.sqrt(n.in) * 1.25) * (n.hub ? 1 : z); },
  draw() {
    if (!this.ctx || !G) return;
    const c = this.ctx, P = this.palette(), sel = this.sel;
    c.clearRect(0, 0, this.w, this.h);
    // ring
    c.strokeStyle = P.line; c.lineWidth = 1; c.setLineDash([2, 6]);
    c.beginPath(); c.arc(this.tx, this.ty, this.s * 1.0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    const nb = new Set();
    if (sel) { (OUTE[sel] || []).forEach(e => nb.add(e[0])); (INE[sel] || []).forEach(e => nb.add(e[0])); }
    const dimNode = n => this.off.has(partOf[n.c]);
    // edges
    for (const [a, b, w] of G.edges) {
      const A = NODE[a], B = NODE[b]; if (!A || !B) continue;
      let alpha = .075, col = `rgba(${P.edge},`, lw = .8, dash = null;
      if (sel) {
        if (a === sel) { col = P.accent; alpha = .95; lw = 1.8; }
        else if (b === sel) { col = P.ink; alpha = .75; lw = 1.3; dash = [4, 3]; }
        else alpha = .025;
      } else if (dimNode(A) || dimNode(B)) alpha = .02;
      const x1 = this.X(A), y1 = this.Y(A), x2 = this.X(B), y2 = this.Y(B);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, cx = this.tx + (mx - this.tx) * .45, cy = this.ty + (my - this.ty) * .45;
      c.globalAlpha = alpha; c.strokeStyle = col.startsWith('rgba') ? col + '1)' : col; c.lineWidth = lw; c.setLineDash(dash || []);
      c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx, cy, x2, y2); c.stroke();
    }
    c.setLineDash([]); c.globalAlpha = 1;
    // nodes
    for (const n of G.nodes) {
      const col = P.part[partOf[n.c]], r = this.rad(n), x = this.X(n), y = this.Y(n);
      if (x < -20 || y < -20 || x > this.w + 20 || y > this.h + 20) continue;
      let a = dimNode(n) ? .15 : 1;
      if (sel && !(n.id === sel || nb.has(n.id) || n.hub)) a = Math.min(a, .22);
      c.globalAlpha = a;
      if (n.hub) {
        c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = P.ground; c.font = `600 10px ${P.mono}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n.c === 25 ? 'A' : n.c, x, y + .5);
      } else if (isRead(n.id)) {
        c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      } else {
        c.fillStyle = P.ground; c.strokeStyle = col; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke();
      }
      if (n.id === sel || n.id === this.hov) { c.globalAlpha = 1; c.strokeStyle = P.accent; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r + 4, 0, Math.PI * 2); c.stroke(); }
    }
    c.globalAlpha = 1;
    // hub labels, radially outside
    c.font = `600 12px ${P.disp}`; c.textBaseline = 'middle';
    for (const n of G.nodes) {
      if (!n.hub || (this.w < 760 && this.s < 420)) continue;
      const ang = Math.atan2(n.y, n.x), R = this.s * 1.0 + 16;
      const lx = this.tx + Math.cos(ang) * R, ly = this.ty + Math.sin(ang) * R;
      c.globalAlpha = dimNode(n) ? .25 : (sel && NODE[sel] && NODE[sel].c !== n.c ? .55 : .95);
      c.fillStyle = P.ink; c.textAlign = Math.cos(ang) > .15 ? 'left' : Math.cos(ang) < -.15 ? 'right' : 'center';
      const t = n.t.length > 26 ? n.t.slice(0, 25) + '…' : n.t;
      c.fillText(t, lx, ly);
    }
    c.globalAlpha = 1;
    // section labels when zoomed or for neighbourhood
    const showAll = this.s > 900;
    c.font = `500 11px ${P.mono}`; c.textAlign = 'left';
    for (const n of G.nodes) {
      if (n.hub) continue;
      if (!(showAll || n.id === sel || (sel && nb.has(n.id)))) continue;
      const x = this.X(n), y = this.Y(n); if (x < 0 || y < 0 || x > this.w || y > this.h) continue;
      const t = `${n.num} ${n.t.length > 34 ? n.t.slice(0, 33) + '…' : n.t}`;
      c.fillStyle = P.ground; c.globalAlpha = .8; const wv = c.measureText(t).width; c.fillRect(x + this.rad(n) + 4, y - 8, wv + 6, 16);
      c.globalAlpha = 1; c.fillStyle = n.id === sel ? P.accent : P.ink; c.fillText(t, x + this.rad(n) + 7, y);
    }
  },
  hit(px, py) {
    let best = null, bd = 1e9;
    for (const n of G.nodes) { const dx = this.X(n) - px, dy = this.Y(n) - py, d = dx * dx + dy * dy, r = this.rad(n) + 6; if (d < r * r && d < bd) { bd = d; best = n; } }
    return best;
  },
  select(id, pan) {
    if (!NODE[id]) return;
    this.sel = id; this.inspect(id);
    if (this.w < 760) $('#mapIntro').classList.add('mini'), $('#introToggle').textContent = 'Show';
    if (pan) { const n = NODE[id]; const s = Math.max(this.s, 520); const wide = this.w > 900; this.tween(s, (wide ? this.w * .42 : this.w / 2) - n.x * s, (wide ? this.h / 2 : this.h * .3) - n.y * s); }
    this.draw();
  },
  clear() { this.sel = null; $('#insp').hidden = true; this.draw(); },
  inspect(id) {
    const n = NODE[id], ch = byN[n.c], pk = partOf[n.c], el = $('#insp');
    const outs = (OUTE[id] || []).slice().sort((a, b) => b[1] - a[1]), ins = (INE[id] || []).slice().sort((a, b) => b[1] - a[1]);
    const chip = ([oid, w]) => { const o = NODE[oid]; if (!o) return ''; return `<button class="chip" type="button" data-node="${oid}" style="--pc:var(${PV[partOf[o.c]]})"><span class="sw"></span><b>${o.hub ? chLabel(o.c) : o.num}</b>${esc(o.hub ? o.t : o.t).slice(0, 38)}${w > 1 ? ` ×${w}` : ''}</button>`; };
    let snip = '';
    if (!n.hub && CARDS) { const f = CARDS.flash.find(f => f.type === 'concept' && f.sec === id); if (f) snip = f.back; }
    if (n.hub) snip = esc(ch.scope || ch.covers);
    el.style.setProperty('--pc', `var(${PV[pk]})`);
    el.innerHTML = `<div class="insp-head"><div class="where"><span class="sw"></span>${n.hub ? (n.c === 25 ? 'Appendix' : 'Chapter ' + n.c) : 'Section ' + n.num + ' · ' + chLabel(n.c)} ${isRead(id) ? '· <span style="color:var(--good)">read</span>' : ''}</div>
      <h2>${esc(n.hub ? n.t : n.t)}</h2><button class="x" type="button" aria-label="Close">×</button></div>
      <div class="insp-body">
        ${snip ? `<p class="snip">${snip}</p>` : ''}
        <div class="insp-acts" id="inspActs"><a class="btn primary small" href="#${n.hub ? 'ch' + n.c : id}">Read ${n.hub ? 'chapter' : 'section'} →</a>${n.c >= 1 && n.c <= 24 ? `<a class="btn small" href="#route-${n.c}">Route here</a><a class="btn small" href="#quiz-${n.c}">Quiz Ch ${n.c}</a>` : ''}</div>
        <div id="inspBuilds"><h3><i></i>Builds on · ${outs.length}</h3><div class="insp-list">${outs.map(chip).join('') || '<span class="chip" style="cursor:default">Nothing earlier. This is a starting point.</span>'}</div></div>
        <div id="inspUsed"><h3><i class="dash"></i>Used by · ${ins.length}</h3><div class="insp-list">${ins.map(chip).join('') || '<span class="chip" style="cursor:default">No later section points here yet.</span>'}</div></div>
        ${n.hub ? `<div><h3>Sections</h3><div class="insp-list">${ch.sections.filter(s => s.lvl === 3).map(s => chip([s.id, 1])).join('')}</div></div>` : ''}
      </div>`;
    el.hidden = false;
    typeset(el);
    el.querySelector('.x').onclick = () => this.clear();
  },
  init() {
    const cv = this.cv; const pts = new Map(); let moved = false, start = null, pinch = null;
    new ResizeObserver(() => { if (curView === 'map') this.resize(); }).observe(cv);
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); moved = false; start = { x: e.offsetX, y: e.offsetY, tx: this.tx, ty: this.ty };
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: this.s, tx: this.tx, ty: this.ty, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; } });
    cv.addEventListener('pointermove', e => {
      if (pts.has(e.pointerId)) {
        pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
        if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const k = Math.hypot(a.x - b.x, a.y - b.y) / pinch.d; this.zoomAt(pinch.cx, pinch.cy, pinch.s * k, pinch); moved = true; return; }
        const dx = e.offsetX - start.x, dy = e.offsetY - start.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) { moved = true; cv.classList.add('dragging'); this.tx = start.tx + dx; this.ty = start.ty + dy; this.draw(); }
        return;
      }
      const n = this.hit(e.offsetX, e.offsetY); const tip = $('#maptip');
      if ((n && n.id) !== this.hov) { this.hov = n ? n.id : null; this.draw(); }
      cv.style.cursor = n ? 'pointer' : 'grab';
      if (n) { tip.innerHTML = n.hub ? `<b>${chLabel(n.c)}</b> · ${esc(n.t)}` : `<b>${n.num}</b> ${esc(n.t)}<br><span style="opacity:.7">${(OUTE[n.id] || []).length} builds on · ${(INE[n.id] || []).length} used by</span>`; tip.hidden = false; tip.style.left = Math.min(e.offsetX + 14, this.w - 290) + 'px'; tip.style.top = (e.offsetY + 14) + 'px'; }
      else tip.hidden = true;
    });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; cv.classList.remove('dragging');
      if (!moved && e.type === 'pointerup') { const n = this.hit(e.offsetX, e.offsetY); if (n) this.select(n.id); else this.clear(); } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', () => { $('#maptip').hidden = true; if (this.hov) { this.hov = null; this.draw(); } });
    cv.addEventListener('wheel', e => { e.preventDefault(); const k = Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015)); this.zoomAt(e.offsetX, e.offsetY, this.s * k); }, { passive: false });
    $('#zin').onclick = () => this.zoomAt(this.w / 2, this.h / 2, this.s * 1.4, null, true);
    $('#zout').onclick = () => this.zoomAt(this.w / 2, this.h / 2, this.s / 1.4, null, true);
    $('#zfit').onclick = () => this.fit(true);
    $('#insp').addEventListener('click', e => { const b = e.target.closest('[data-node]'); if (b) this.select(b.dataset.node, true); });
    $('#introToggle').onclick = () => { const el = $('#mapIntro'); const mini = el.classList.toggle('mini'); $('#introToggle').textContent = mini ? 'Show' : 'Hide'; $('#introToggle').setAttribute('aria-expanded', !mini); };
  },
  zoomAt(px, py, s, base, animate) {
    s = Math.max(120, Math.min(4200, s)); const b = base || this; const k = s / b.s;
    const tx = px - (px - b.tx) * k, ty = py - (py - b.ty) * k;
    if (animate) this.tween(s, tx, ty); else { this.s = s; this.tx = tx; this.ty = ty; this.draw(); }
  },
  chrome() {
    const top = G.nodes.filter(n => !n.hub).sort((a, b) => b.in - a.in).slice(0, 5);
    $('#top5').innerHTML = top.map(n => `<button type="button" data-node="${n.id}"><span class="n">${n.num}</span><span>${esc(n.t)}</span><span class="k">${n.in} refs</span></button>`).join('');
    $('#top5').onclick = e => { const b = e.target.closest('[data-node]'); if (b) this.select(b.dataset.node, true); };
    $('#mapStat').insertAdjacentHTML('afterbegin', `<b style="color:var(--ink)">${G.nodes.filter(n => !n.hub).length} sections, ${G.edges.reduce((a, e) => a + e[2], 0)} cross-references.</b> `);
    const L = $('#legend');
    L.innerHTML = M.parts.filter(p => p.key !== '0' && p.key !== 'A').map(p => `<button type="button" data-p="${p.key}" style="--pc:var(${PV[p.key]})" aria-pressed="true"><span class="sw"></span>${p.key} · ${p.name}</button>`).join('') +
      `<button class="key" type="button" tabindex="-1" aria-hidden="true"><span class="sw" style="--pc:var(--ink)"></span>read · <span class="sw" style="--pc:transparent;border:1.5px solid var(--ink)"></span>not yet</button>`;
    L.onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; const k = b.dataset.p; this.off.has(k) ? this.off.delete(k) : this.off.add(k); b.classList.toggle('off'); b.setAttribute('aria-pressed', !this.off.has(k)); this.draw(); };
  }
};

export { Map_ };
