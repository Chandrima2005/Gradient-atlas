// light / dark switch
import { $, store } from './core.js';
import { Map_ } from './views/map.js';
import { Metro } from './views/metro.js';

/* ======================= theme ======================= */
{ const t = store.get('theme', null); if (t) document.documentElement.dataset.theme = t; }
$('#themeBtn').addEventListener('click', () => {
  const r = document.documentElement;
  const cur = r.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  r.dataset.theme = cur === 'dark' ? 'light' : 'dark'; store.set('theme', r.dataset.theme); onTheme();
});
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => onTheme());
function onTheme() { Map_.pal = null; Map_.draw(); if (Metro.built) Metro.render(); }

export { onTheme };
