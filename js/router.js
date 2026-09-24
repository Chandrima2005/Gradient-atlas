// hash router: #home, #map, #route, #route-19, #console, #recall, #quiz-13, #review, #ch11, #s11-2-2
import { $, $$, M } from './core.js';
import { Home } from './views/home.js';
import { Map_ } from './views/map.js';
import { Metro } from './views/metro.js';
import { Reader } from './views/reader.js';
import { Recall } from './views/recall.js';
import { Con } from './views/console.js';

/* ======================= router ======================= */
const VIEWS = ['home', 'map', 'metro', 'console', 'recall', 'read'];
let curView = null;
function show(v) {
  curView = v;
  VIEWS.forEach(k => $('#v-' + k).hidden = k !== v);
  $$('.rail a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  if (v === 'map') requestAnimationFrame(() => Map_.resize());
  if (v !== 'read') document.title = 'Gradient Atlas';
}
function route() {
  if (!M) return;
  const h = decodeURIComponent(location.hash.slice(1)) || 'home';
  if (h === 'home') { show('home'); Home.render(); return; }
  let m;
  if (h === 'map') { show('map'); return; }
  if ((m = h.match(/^node-(.+)$/))) { show('map'); Map_.select(m[1], true); return; }
  if (h === 'metro' || h === 'route') { show('metro'); Metro.build(); return; }
  if ((m = h.match(/^route-(\d+)$/))) { show('metro'); Metro.build(); Metro.setRoute(+m[1]); return; }
  if (h === 'console') { show('console'); Con.boot(); return; }
  if (h === 'recall') { show('recall'); Recall.dash(); return; }
  if ((m = h.match(/^quiz-(\d+)$/))) { show('recall'); Recall.quiz(+m[1]); return; }
  if (h === 'review') { show('recall'); Recall.review(); return; }
  if ((m = h.match(/^ch(\d+)$/))) { show('read'); Reader.open(+m[1]); return; }
  if ((m = h.match(/^s(\d+)(?:-\d+)+$/))) { show('read'); Reader.open(+m[1], h); return; }
  show('home'); Home.render();
}
addEventListener('hashchange', route);
const go = h => { if (h !== 'console') document.getElementById('cmd').blur(); if (location.hash.slice(1) === h) route(); else location.hash = h; };

export { VIEWS, curView, show, route, go };
