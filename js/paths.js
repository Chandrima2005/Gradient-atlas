// normal URLs for every page, and the route keys js/router.js reads.
// A key is what the old #hash links held: home, route, console, route-genai, ch11, s11-2, quiz-13, py/ch6, py/recall …
// No py/ prefix means the machine learning course, as before.
import { SLUG } from './slugs.js';

const BASE = { ml: '/machine-learning/', py: '/python-for-data-science/' };
const STAGE = { python: BASE.py, libs: '/python-libraries/', ml: BASE.ml, dl: '/deep-learning/', genai: '/generative-ai/' };
const SITE = { home: '/', map: '/', route: '/data-science-roadmap/', console: '/search/' };

// key → path
function toPath(key) {
  if (SITE[key]) return SITE[key];
  let m;
  if ((m = key.match(/^route-([a-z]+)$/)) && STAGE[m[1]]) return STAGE[m[1]];
  let cid = 'ml', k = key;
  if ((m = key.match(/^py\/(.*)$/))) { cid = 'py'; k = m[1] || 'route'; }
  const base = BASE[cid];
  if (k === 'route' || k === 'metro') return base;
  if ((m = k.match(/^route-(\d+)$/))) return base + '?goal=' + m[1];
  if ((m = k.match(/^ch(\d+)$/))) return base + (SLUG[cid][m[1]] || m[1]) + '/';
  if ((m = k.match(/^s(\d+)(?:-\d+)+$/))) return base + (SLUG[cid][m[1]] || m[1]) + '/#' + k;
  return base + k + '/';
}

// location → key
function toKey(loc = location) {
  const p = loc.pathname.replace(/\/index\.html$/, '/').replace(/\/?$/, '/');
  // old links such as /#py/route or /#ch11 still work
  if (p === '/' && loc.hash.length > 1) return decodeURIComponent(loc.hash.slice(1));
  for (const [k, v] of Object.entries(SITE)) if (p === v && k !== 'map') return k;
  for (const [id, v] of Object.entries(STAGE)) if (p === v && !Object.values(BASE).includes(v)) return 'route-' + id;
  for (const [cid, base] of Object.entries(BASE)) {
    if (!p.startsWith(base)) continue;
    const pfx = cid === 'py' ? 'py/' : '', rest = p.slice(base.length).replace(/\/$/, '');
    const goal = new URLSearchParams(loc.search).get('goal');
    if (!rest) return goal ? pfx + 'route-' + goal : cid === 'py' ? 'py/route' : 'route-ml';
    const m = rest.match(/^(\d+)(?:-|$)/);
    if (m) { const sec = loc.hash.slice(1); return pfx + (/^s\d+(-\d+)+$/.test(sec) ? sec : 'ch' + +m[1]); }
    return pfx + rest;
  }
  return 'home';
}

// is a #fragment one of the old route links (and not an ordinary in-page anchor)?
const isKey = k => /^(py\/)?(home|map|route|metro|console|recall|review|ch\d+|s\d+(-\d+)+|route-\w+|quiz-\d+)$/.test(k) || k === 'py/';

export { toPath, toKey, isKey };
