// starts the app once the view partials are in the page
import { $, store, M, G, byN, SECS, NODE, OUTE, INE, partOf, loadCards, setData } from './core.js';
import { route } from './router.js';
import { HeroBg, FeatViz } from './views/home.js';
import { Map_ } from './views/map.js';
import { badge } from './views/recall.js';
import { Tour } from './tour.js';
import './theme.js';

Promise.all([fetch('data/manifest.json').then(r => r.json()), fetch('data/graph.json').then(r => r.json())]).then(([m, g]) => {
  setData(m, g);
  M.chapters.forEach(c => { byN[c.n] = c; partOf[c.n] = c.part; c.sections.forEach(s => SECS[s.id] = s); });
  G.nodes.forEach(n => NODE[n.id] = n);
  for (const [a, b, w] of G.edges) { (OUTE[a] = OUTE[a] || []).push([b, w]); (INE[b] = INE[b] || []).push([a, w]); }
  const last = store.get('lastCh', null); if (last != null) $('#readLink').href = '#ch' + last;
  Map_.init(); Map_.chrome(); badge(); HeroBg.init(); FeatViz.init();
  route();
  if (!store.get('toured2', false) && (!location.hash || location.hash === '#home')) setTimeout(() => Tour.start(0), 900);
  loadCards().then(() => { if (Map_.sel) Map_.inspect(Map_.sel); }).catch(() => {});
}).catch(() => { document.querySelector('.stage').insertAdjacentHTML('afterbegin', '<p class="loading" style="padding:40px">The course data didn\'t load. Reload the page to try again.</p>'); });
