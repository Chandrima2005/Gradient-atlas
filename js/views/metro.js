// route planner (metro map)
import { $, esc, store, PV, pad2, chLabel, M, G, byN, partOf, done } from '../core.js';
import { route, go } from '../router.js';
import { rank } from './console.js';

/* ======================= METRO ======================= */
const Metro = {
  built: false, target: null, pos: {},
  build() {
    if (this.built) return; this.built = true;
    const sel = $('#dest');
    sel.innerHTML = `<option value="">Choose a chapter…</option>` + M.chapters.filter(c => c.n >= 1 && c.n <= 24).map(c => `<option value="${c.n}">${pad2(c.n)} · ${esc(c.title)}</option>`).join('');
    sel.onchange = () => sel.value ? go('route-' + sel.value) : this.setRoute(null);
    $('#clearRoute').onclick = () => { this.setRoute(null); history.replaceState(null, '', '#route'); };
    const Q = [[19, 'Gradient boosting'], [16, 'SVMs'], [20, 'Clustering'], [23, 'Hyperparameter tuning'], [24, 'SHAP & deployment'], [13, 'Logistic regression']];
    $('#quick').innerHTML = Q.map(([n, l]) => `<a class="chip" href="#route-${n}"><b>→</b>${l}</a>`).join('');
    // interchange strength: incoming refs from other parts
    this.xin = {};
    for (const a in G.deps) for (const b in G.deps[a]) if (partOf[+a] !== partOf[+b]) this.xin[b] = (this.xin[b] || 0) + G.deps[a][b];
    const top = Object.entries(this.xin).filter(([n]) => +n > 0 && +n < 25).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => +e[0]);
    this.inter = new Set(top);
    // layout
    const order = M.chapters.map(c => c.n); const rows = M.parts.map(p => p.key);
    let x = 50, prevPart = null;
    for (const n of order) { const p = partOf[n]; if (prevPart !== null) x += p !== prevPart ? 64 : 40; this.pos[n] = { x, y: 160 + rows.indexOf(p) * 52 }; prevPart = p; }
    this.target = store.get('route', null);
    this.render();
  },
  compute(t) {
    const stops = new Map();
    const add = (n, kind, why) => { if (n === t || n <= 0 || n >= 25) return; const cur = stops.get(n); const rank = { direct: 3, advised: 2, background: 1 }; if (!cur || rank[kind] > rank[cur.kind]) stops.set(n, { n, kind, why }); };
    const direct = Object.entries(G.deps[t] || {}).filter(([c, w]) => +c < t && w >= 2);
    direct.forEach(([c, w]) => add(+c, 'direct', `Ch ${t} points here ${w}×`));
    const seenB = new Set();
    const walk = (n, via, d) => { if (d > 3) return; for (const [c, w] of Object.entries(G.deps[n] || {})) { if (+c < n && w >= 4 && !seenB.has(+c)) { seenB.add(+c); add(+c, 'background', `needed by Ch ${n}`); } } };
    direct.forEach(([c]) => walk(+c, t, 1));
    if (t >= 11 && t <= 21) { add(8, 'advised', 'the book says read first (0.9)'); add(9, 'advised', 'the book says read first (0.9)'); }
    const list = [...stops.values()].sort((a, b) => a.n - b.n);
    list.push({ n: t, kind: 'target', why: 'your destination' });
    return list;
  },
  setRoute(t) { this.target = t; store.set('route', t); if (t) $('#dest').value = t; else $('#dest').value = ''; this.render(); },
  render() {
    const svg = $('#metroSvg'), P = this.pos, rt = this.target ? this.compute(this.target) : null, on = rt ? new Set(rt.map(s => s.n)) : null;
    const col = n => `var(${PV[partOf[n]]})`;
    let s = '';
    // trunk segments
    const order = M.chapters.map(c => c.n);
    for (let i = 0; i < order.length - 1; i++) {
      const a = P[order[i]], b = P[order[i + 1]]; const c = col(order[i + 1]);
      let d;
      if (a.y === b.y) d = `M${a.x},${a.y} H${b.x}`;
      else { const dy = b.y - a.y, dx = b.x - a.x, flat = (dx - dy) / 2; d = `M${a.x},${a.y} H${a.x + flat} L${b.x - flat},${b.y} H${b.x}`; }
      const dim = on && !(on.has(order[i]) && on.has(order[i + 1])) ? .28 : 1;
      s += `<path d="${d}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="${dim}"/>`;
    }
    // line names at left of each row
    for (const p of M.parts) { const first = P[p.chapters[0]]; if (p.key === '0' || p.key === 'A') continue; s += `<text x="${first.x - 16}" y="${first.y + 4}" text-anchor="end" font-size="11" fill="${`var(${PV[p.key]})`}" font-weight="600">${p.key}</text>`; }
    // route ribbon
    if (rt && rt.length > 1) {
      const pts = rt.map(r => `${P[r.n].x},${P[r.n].y}`).join(' ');
      s += `<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="1 7" stroke-linecap="round" opacity=".95"/>`;
    }
    // stations
    rt && rt.forEach((r, i) => r.i = i + 1);
    const rmap = rt ? Object.fromEntries(rt.map(r => [r.n, r])) : {};
    for (const n of order) {
      const p = P[n], c = byN[n], big = this.inter.has(n), r = big ? 12.5 : 9.5, isOn = !on || on.has(n), isDone = done.has(n);
      const title = c.title.length > 30 ? c.title.slice(0, 29) + '…' : c.title;
      s += `<g class="st" tabindex="0" role="link" data-n="${n}" aria-label="${esc(chLabel(n) + ' ' + c.title)}" opacity="${isOn ? 1 : .32}">`;
      if (big) s += `<circle cx="${p.x}" cy="${p.y}" r="${r + 4}" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/>`;
      s += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${isDone ? col(n) : 'var(--panel)'}" stroke="${n === this.target ? 'var(--accent)' : (big ? 'var(--ink)' : col(n))}" stroke-width="${n === this.target ? 4 : 3}"/>`;
      s += `<text x="${p.x}" y="${p.y + 3.5}" text-anchor="middle" font-size="${big ? 10.5 : 9}" font-weight="600" fill="${isDone ? 'var(--panel)' : 'var(--ink)'}">${n === 25 ? 'A' : n}</text>`;
      s += `<text class="lbl" transform="translate(${p.x + 8},${p.y - r - 8}) rotate(-38)" font-size="13.5" fill="var(--ink-2)">${esc(title)}</text>`;
      if (rmap[n] && rmap[n].kind !== 'target') s += `<g transform="translate(${p.x + 9},${p.y + 12})"><rect width="18" height="16" rx="4" fill="var(--accent)"/><text x="9" y="11.5" text-anchor="middle" font-size="10" font-weight="700" fill="var(--accent-ink)">${rmap[n].i}</text></g>`;
      s += `</g>`;
    }
    // legend
    s += `<g transform="translate(40,566)" font-size="12" fill="var(--muted)"><circle cx="6" cy="-4" r="7" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/><text x="20" y="0">interchange: most relied on by other Parts</text><circle cx="366" cy="-4" r="6" fill="var(--p1)"/><text x="378" y="0">marked complete</text><rect x="520" y="-12" width="16" height="15" rx="4" fill="var(--accent)"/><text x="542" y="0">stop number on your route</text></g>`;
    svg.innerHTML = s;
    svg.onclick = e => { const g = e.target.closest('.st'); if (g) go('ch' + g.dataset.n); };
    svg.onkeydown = e => { const g = e.target.closest('.st'); if (g && e.key === 'Enter') go('ch' + g.dataset.n); };
    this.itin(rt);
  },
  itin(rt) {
    const el = $('#itin');
    if (!rt) {
      const hubs = [...this.inter].sort((a, b) => a - b);
      el.innerHTML = `<div class="eyebrow">No route yet</div><h2>Where are you heading?</h2><p class="sum">Choose a destination above, or start from an interchange:</p>
        <ol class="stops">${hubs.map(n => `<li style="--pc:var(${PV[partOf[n]]})"><span class="dot">${n}</span><div><a href="#ch${n}">${esc(byN[n].title)}</a><small>${this.xin[n]} references from other Parts · ${byN[n].minutes} min</small></div></li>`).join('')}</ol>`;
      return;
    }
    const left = rt.filter(r => !done.has(r.n));
    const mins = left.reduce((a, r) => a + byN[r.n].minutes, 0);
    const next = left[0];
    el.innerHTML = `<div class="eyebrow">Route to Chapter ${this.target}</div><h2>${esc(byN[this.target].title)}</h2>
      <p class="sum">${rt.length} stops · ${left.length} left · about ${Math.floor(mins / 60)}h ${pad2(mins % 60)}m of reading</p>
      <ol class="stops">${rt.map((r, i) => `<li class="${done.has(r.n) ? 'done' : ''} ${r.kind === 'target' ? 'target' : ''}" style="--pc:var(${PV[partOf[r.n]]})"><span class="dot">${r.kind === 'target' ? '★' : i + 1}</span><div><a href="#ch${r.n}">${pad2(r.n)} · ${esc(byN[r.n].title)}</a><small><span class="kind">${r.kind}</span>${esc(r.why)} · ${byN[r.n].minutes} min${done.has(r.n) ? ' · ✓ done' : ''}</small></div></li>`).join('')}</ol>
      ${next ? `<a class="btn primary" href="#ch${next.n}">Start at ${chLabel(next.n)} →</a>` : `<p class="sum" style="color:var(--good)">Every stop is marked complete.</p>`}`;
  }
};

export { Metro };
