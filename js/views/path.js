// data science pathway: the five stages drawn as one metro line on #route
import { $, esc } from '../core.js';
import { TRACKS, TRACK } from '../tracks.js';

// split text into lines of at most n characters
const wrap = (s, n) => { const out = []; let cur = ''; for (const w of s.split(' ')) { if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; };
const hrefOf = t => t.status === 'live' ? t.href : `#route-${t.id}`;

const Path = {
  built: false, sel: null, mode: null,
  build() {
    if (this.built) return; this.built = true;
    new ResizeObserver(() => { const m = this.pickMode(); if (m !== this.mode) this.render(); }).observe($('#pway'));
    this.render();
  },
  pickMode() { return $('#pway').clientWidth < 760 ? 'v' : 'h'; },
  render() {
    this.mode = this.pickMode();
    $('#pway').innerHTML = this.mode === 'h' ? this.horizontal() : this.vertical();
    this.mark();
  },
  // label block for one stage. side: 1 = below / right, -1 = above / left
  label(t, x, y, side, anchor, width) {
    const live = t.status === 'live', lh = 17;
    const sub = wrap(t.sub, width);
    const rows = [
      `<text class="pl-k" x="${x}" y="0">STAGE ${t.n} · <tspan class="${live ? 'pl-live' : ''}">${live ? '● LIVE' : 'COMING SOON'}</tspan></text>`,
      `<text class="pl-t" x="${x}" y="25">${esc(t.title)}</text>`,
      ...sub.map((l, i) => `<text class="pl-s" x="${x}" y="${47 + i * lh}">${esc(l)}</text>`),
      `<text class="pl-m" x="${x}" y="${55 + sub.length * lh}">${live ? esc(t.stats) : t.mods.length + ' planned stops'}</text>`,
      `<text class="pl-go" x="${x}" y="${77 + sub.length * lh}">${live ? 'Open route map →' : 'Preview route →'}</text>`,
    ];
    const h = 77 + sub.length * lh;
    const top = side > 0 ? y : y - h;
    return `<g transform="translate(0,${top})" text-anchor="${anchor}">${rows.join('')}</g>`;
  },
  station(t, x, y) {
    const live = t.status === 'live';
    return `${live ? `<circle class="pl-pulse" cx="${x}" cy="${y}" r="18" fill="none" stroke="var(${t.v})" stroke-width="3"/>` : ''}
      <circle cx="${x}" cy="${y}" r="18" fill="${live ? `var(${t.v})` : 'var(--ground)'}" stroke="var(${t.v})" stroke-width="6"/>
      <text class="pl-n" x="${x}" y="${y + 5}" text-anchor="middle" fill="${live ? 'var(--ground)' : 'var(--ink)'}">${t.n}</text>`;
  },
  // one track segment per stage; stages still being written get hollow stops
  track(pts, t) {
    const [a, b] = pts;
    return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="var(${t.v})" stroke-width="10" stroke-linecap="round"/>`;
  },
  stops(t, from, to, horiz) {
    const n = t.mods.length; let s = '';
    for (let k = 0; k < n; k++) {
      const f = (k + 1) / (n + 1), v = (from + (to - from) * f).toFixed(1);
      s += `<circle class="pl-stop" ${horiz ? `cx="${v}" cy="${this.Y}"` : `cx="${this.X}" cy="${v}"`} r="3.2"><title>${esc(t.mods[k])}</title></circle>`;
    }
    return s;
  },
  horizontal() {
    const Y = this.Y = 300, x0 = 90, zone = 238, last = x0 + zone * (TRACKS.length - 1), end = last + 225;
    let s = '';
    TRACKS.forEach((t, i) => {
      const a = i === 0 ? 30 : x0 + zone * i, b = i === TRACKS.length - 1 ? end : x0 + zone * (i + 1);
      s += this.track([[a, Y], [b, Y]], t);
    });
    // terminus
    s += `<rect x="${end - 3}" y="${Y - 15}" width="6" height="30" rx="3" fill="var(${TRACKS[TRACKS.length - 1].v})"/>`;
    TRACKS.forEach((t, i) => {
      const x = x0 + zone * i, side = i % 2 === 0 ? 1 : -1, nx = i === TRACKS.length - 1 ? end : x + zone;
      const ly = Y + side * 36;
      s += `<a class="pl-st ${t.status}" data-id="${t.id}" href="${hrefOf(t)}" aria-label="Stage ${t.n}, ${esc(t.title)}${t.status === 'live' ? '' : ', coming soon'}">
        <line class="pl-lead" x1="${x}" y1="${Y + side * 24}" x2="${x}" y2="${ly}" stroke="var(${t.v})"/>
        ${this.stops(t, x + 24, nx - 24, true)}${this.station(t, x, Y)}
        <g style="--pc:var(${t.v})">${this.label(t, x - 2, ly + side * 12, side, 'start', 30)}</g>
      </a>`;
    });
    return `<svg viewBox="0 140 1300 330" role="img" aria-label="Data science pathway: five stages on one line">${s}</svg>`;
  },
  vertical() {
    const X = this.X = 30, gap = 210, y0 = 40, H = y0 + gap * TRACKS.length - 40;
    let s = '';
    TRACKS.forEach((t, i) => {
      const a = i === 0 ? 14 : y0 + gap * i, b = i === TRACKS.length - 1 ? H - 10 : y0 + gap * (i + 1);
      s += this.track([[X, a], [X, b]], t);
    });
    s += `<rect x="${X - 18}" y="${H - 13}" width="36" height="6" rx="3" fill="var(${TRACKS[TRACKS.length - 1].v})"/>`;
    TRACKS.forEach((t, i) => {
      const y = y0 + gap * i, ny = i === TRACKS.length - 1 ? H - 10 : y + gap;
      s += `<a class="pl-st ${t.status}" data-id="${t.id}" href="${hrefOf(t)}" aria-label="Stage ${t.n}, ${esc(t.title)}">
        ${this.stops(t, y + 24, ny - 24, false)}${this.station(t, X, y)}
        <g style="--pc:var(${t.v})">${this.label(t, 66, y - 16, 1, 'start', 30)}</g>
      </a>`;
    });
    return `<svg class="pl-v" viewBox="0 0 360 ${H}" role="img" aria-label="Data science pathway: five stages on one line">${s}</svg>`;
  },
  mark() { document.querySelectorAll('#pway .pl-st').forEach(a => a.classList.toggle('sel', a.dataset.id === this.sel)); },
  show(id) {
    this.sel = id; this.build(); this.mark();
    const box = $('#pdetail'), t = TRACK[id];
    if (!t || t.status === 'live') { box.hidden = true; return; }
    const next = TRACKS.find(x => x.status === 'live');
    box.style.setProperty('--pc', `var(${t.v})`);
    box.innerHTML = `<div class="eyebrow">Stage ${t.n} · route preview · coming soon</div><h2>${esc(t.title)}</h2>
      <p class="note">${esc(t.sub)} The material for this stage is on its way. This is the planned route, and it may change once the chapters are published.</p>
      <ol class="pline">${t.mods.map((m, i) => `<li><span class="d">${i + 1}</span><span class="t">${esc(m)}</span></li>`).join('')}</ol>
      <div class="acts"><a class="btn" href="#route">← All stages</a>${next ? `<a class="btn primary" href="${next.href}">Meanwhile, start ${esc(next.title)} →</a>` : ''}</div>`;
    box.hidden = false;
    requestAnimationFrame(() => box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  },
};

export { Path };
