// data science pathway (#route): the five stages drawn as one metro map, in the same style as each course's route map.
// Each stage is a coloured line; its stations are the chapters (live stages) or the planned topics (coming soon).
// The lines run back and forth down the page and join with a bend, like one continuous metro line.
import { $, $$, esc, store, COURSES, LC, courseStats } from '../core.js';
import { TRACKS, TRACK } from '../tracks.js';

const hrefOf = t => t.status === 'live' ? t.href : `#route-${t.id}`;
const cut = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
// which course holds a live stage's chapters
const COURSE_OF = { python: 'py', ml: 'ml' };

const Path = {
  built: false, sel: null, rows: null,
  async build() {
    if (this.built) return this.ready; this.built = true;
    this.ready = (async () => {
      // live stages use their real chapter titles; the others use the planned topics
      this.rows = await Promise.all(TRACKS.map(async t => {
        const cid = COURSE_OF[t.id];
        if (t.status === 'live' && cid && COURSES[cid]) {
          const st = await courseStats(cid), first = COURSES[cid].first;
          const done = new Set(store.get(cid === 'ml' ? 'done' : cid + '.done', []));
          return { t, cid, stations: st.titles.map((title, i) => ({ n: first + i, title, done: done.has(first + i) })) };
        }
        return { t, cid: null, stations: t.mods.map((title, i) => ({ n: i + 1, title, done: false })) };
      }));
      this.draw();
    })();
    return this.ready;
  },
  draw() {
    const xL = 262, xR = 1100, y0 = 138, gap = 136, R = 8;
    let s = '';
    this.rows.forEach((row, k) => {
      const { t, stations } = row, y = y0 + k * gap, ltr = k % 2 === 0, n = stations.length, live = t.status === 'live', col = `var(${t.v})`;
      const X = i => { const f = n > 1 ? i / (n - 1) : 0; return ltr ? xL + (xR - xL) * f : xR - (xR - xL) * f; };
      let g = `<g class="line" data-id="${t.id}">`;
      // bend from the previous line's last station down to this line's first
      if (k > 0) { const py = y - gap, xe = ltr ? xL : xR; g += `<path d="M${xe},${py} A${gap / 2},${gap / 2} 0 0 ${ltr ? 0 : 1} ${xe},${y}" fill="none" stroke="${col}" stroke-width="7"/>`; }
      g += `<line x1="${X(0)}" y1="${y}" x2="${X(n - 1)}" y2="${y}" stroke="${col}" stroke-width="7" stroke-linecap="round"/>`;
      // stage name, in the left column
      g += `<a class="stage-name" href="${hrefOf(t)}" aria-label="Stage ${t.n}, ${esc(t.title)}${live ? '' : ', coming soon'}">
        <circle cx="34" cy="${y}" r="15" fill="${live ? col : 'var(--panel)'}" stroke="${col}" stroke-width="3"/>
        <text x="34" y="${y + 4.5}" text-anchor="middle" font-size="13" font-weight="700" fill="${live ? 'var(--panel)' : 'var(--ink)'}">${t.n}</text>
        <text class="nm" x="58" y="${y - 2}" font-size="15" font-weight="700" fill="var(--ink)" style="font-family:var(--f-display)">${esc(t.title)}</text>
        <text x="58" y="${y + 15}" font-size="11" fill="${live ? 'var(--good)' : 'var(--muted)'}">${live ? '● live · ' + esc(t.stats || '') : 'coming soon'}</text></a>`;
      // stations
      stations.forEach((st, i) => {
        const x = X(i), big = i === 0, r = big ? R + 3 : R;
        const href = live && row.cid ? LC(row.cid, 'ch' + st.n) : `#route-${t.id}`;
        g += `<a class="st" href="${href}" aria-label="${esc(t.title + ', ' + st.title)}">`;
        if (big) g += `<circle cx="${x}" cy="${y}" r="${r + 4}" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/>`;
        g += `<circle cx="${x}" cy="${y}" r="${r}" fill="${st.done ? col : 'var(--panel)'}" stroke="${big ? 'var(--ink)' : col}" stroke-width="3" ${live ? '' : 'stroke-dasharray="3 3"'}/>`;
        g += `<text x="${x}" y="${y + 3.5}" text-anchor="middle" font-size="${big ? 10 : 8.5}" font-weight="600" fill="${st.done ? 'var(--panel)' : 'var(--ink)'}">${st.n}</text>`;
        g += `<text class="lbl" transform="translate(${x + 7},${y - r - 7}) rotate(-38)" font-size="11.5" fill="${live ? 'var(--ink-2)' : 'var(--muted)'}">${esc(cut(st.title, 26))}</text></a>`;
      });
      s += g + '</g>';
    });
    const ly = y0 + (this.rows.length - 1) * gap + 62;
    s += `<g transform="translate(262,${ly})" font-size="12" fill="var(--muted)"><circle cx="6" cy="-4" r="7" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/><text x="20" y="0">start of a stage</text><circle cx="176" cy="-4" r="6" fill="var(--panel)" stroke="var(--p1)" stroke-width="3"/><text x="190" y="0">chapter you can open</text><circle cx="376" cy="-4" r="6" fill="var(--panel)" stroke="var(--p3)" stroke-width="3" stroke-dasharray="3 3"/><text x="390" y="0">planned, coming soon</text><circle cx="580" cy="-4" r="6" fill="var(--p1)"/><text x="594" y="0">marked complete</text></g>`;
    const svg = $('#pathSvg'); svg.setAttribute('viewBox', `0 0 1290 ${ly + 22}`); svg.innerHTML = s;
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
