// data science pathway (#route): the five stages drawn as one metro map, in the same style as each course's route map.
// One station per stage; the chapters inside each stage live on that stage's own route map.
import { $, $$, esc } from '../core.js';
import { TRACKS, TRACK } from '../tracks.js';

const hrefOf = t => t.status === 'live' ? t.href : `#route-${t.id}`;

const Path = {
  built: false, sel: null,
  async build() {
    if (!this.built) { this.built = true; this.draw(); }
  },
  // five stations, one per stage, joined the same way as the Parts on a course route map:
  // each stage sits one row lower, reached by a short horizontal run and a 45° diagonal
  draw() {
    const x0 = 150, dx = 210, y0 = 150, dy = 76, r = 17;
    const P = TRACKS.map((t, k) => ({ t, x: x0 + k * dx, y: y0 + k * dy }));
    let s = '';
    // lead-in before stage 1 and a terminus after stage 5
    const first = P[0], last = P[P.length - 1], endX = last.x + 150;
    s += `<g class="line" data-id="${first.t.id}"><path d="M60,${first.y} H${first.x}" stroke="var(${first.t.v})" stroke-width="8" stroke-linecap="round" fill="none"/></g>`;
    P.forEach((p, k) => {
      if (!k) return;
      const a = P[k - 1], flat = (p.x - a.x - (p.y - a.y)) / 2;
      s += `<g class="line" data-id="${p.t.id}"><path d="M${a.x},${a.y} H${a.x + flat} L${p.x - flat},${p.y} H${p.x}" fill="none" stroke="var(${p.t.v})" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    });
    s += `<g class="line" data-id="${last.t.id}"><path d="M${last.x},${last.y} H${endX}" stroke="var(${last.t.v})" stroke-width="8" stroke-linecap="round" fill="none"/><rect x="${endX - 3}" y="${last.y - 14}" width="6" height="28" rx="3" fill="var(${last.t.v})"/></g>`;
    // stations
    P.forEach(({ t, x, y }) => {
      const live = t.status === 'live', col = `var(${t.v})`;
      s += `<g class="line" data-id="${t.id}"><a class="st" href="${hrefOf(t)}" aria-label="Stage ${t.n}, ${esc(t.title)}${live ? '' : ', coming soon'}">
        <circle cx="${x}" cy="${y}" r="${r + 6}" fill="var(--panel)" stroke="var(--ink)" stroke-width="2.5"/>
        <circle cx="${x}" cy="${y}" r="${r}" fill="${live ? col : 'var(--panel)'}" stroke="${col}" stroke-width="4" ${live ? '' : 'stroke-dasharray="4 4"'}/>
        <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="${live ? 'var(--panel)' : 'var(--ink)'}">${t.n}</text>
        <text class="lbl" transform="translate(${x + 14},${y - r - 16}) rotate(-38)" font-size="19" font-weight="700" fill="var(--ink)" style="font-family:var(--f-display)">${esc(t.title)}</text>
        <text x="${x}" y="${y + r + 26}" text-anchor="middle" font-size="13.5" fill="${live ? 'var(--good)' : 'var(--muted)'}">${live ? '● live' : 'coming soon'}</text>
        ${live ? `<text x="${x}" y="${y + r + 44}" text-anchor="middle" font-size="12.5" fill="var(--muted)">${esc(t.stats || '')}</text>` : ''}
      </a></g>`;
    });
    const ly = last.y + 104;
    s += `<g transform="translate(60,${ly})" font-size="13" fill="var(--muted)"><circle cx="8" cy="-4" r="8" fill="var(--p1)" stroke="var(--p1)" stroke-width="3"/><text x="24" y="0">live: open its route map</text><circle cx="228" cy="-4" r="8" fill="var(--panel)" stroke="var(--p3)" stroke-width="3" stroke-dasharray="3 3"/><text x="244" y="0">coming soon: see what's planned</text></g>`;
    const svg = $('#pathSvg'); svg.setAttribute('viewBox', `0 0 ${endX + 40} ${ly + 24}`); svg.innerHTML = s;
    this.mark();
  },
  // highlight one stage's line (or none)
  focus(id) {
    const svg = $('#pathSvg'); if (!svg) return;
    svg.classList.toggle('focus', !!id);
    $$('#pathSvg .line').forEach(g => g.classList.toggle('on', g.dataset.id === id));
  },
  mark() { this.focus(this.sel); this.itin(); },
  itin() {
    const el = $('#pitin'), t = this.sel && TRACK[this.sel];
    if (!t || t.status === 'live') {
      const live = TRACKS.filter(x => x.status === 'live').length;
      el.innerHTML = `<h2>Five stages</h2><p class="sum">${live} live · ${TRACKS.length - live} coming soon</p>
        <ol class="stops">${TRACKS.map(x => `<li data-id="${x.id}" style="--pc:var(${x.v})"><span class="dot">${x.n}</span><div><a href="${hrefOf(x)}">${esc(x.title)}</a><small>${esc(x.sub)}</small>${x.status === 'live' ? `<a class="go" href="${x.href}">Open route map →</a>` : `<small class="soon">Coming soon · ${x.mods.length} planned stops</small>`}</div></li>`).join('')}</ol>`;
      $$('#pitin li[data-id]').forEach(li => { li.onmouseenter = () => this.focus(li.dataset.id); li.onmouseleave = () => this.focus(this.sel); });
      return;
    }
    const next = TRACKS.find(x => x.status === 'live');
    el.innerHTML = `<h2>${esc(t.title)}</h2><p class="sum">Stage ${t.n} · coming soon · ${t.mods.length} planned stops</p>
      <ol class="stops">${t.mods.map((m, i) => `<li style="--pc:var(${t.v})"><span class="dot">${i + 1}</span><div><span style="font-family:var(--f-display);font-weight:600;font-size:15px">${esc(m)}</span><small>planned</small></div></li>`).join('')}</ol>
      <div class="acts"><a class="btn small" href="#route">← All stages</a>${next ? `<a class="btn primary small" href="${next.href}">Start ${esc(next.title)} →</a>` : ''}</div>`;
  },
  async show(id) {
    this.sel = id || null;
    await this.build();
    this.mark();
  },
};

export { Path };
