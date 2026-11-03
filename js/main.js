// Entry point: pull each view's HTML into the page, then load the app modules.
// The modules are imported only after the partials are in place, because several
// of them look up their elements (canvases, console log, recall root) as they load.
const VIEW_FILES = ['home', 'path', 'metro', 'console', 'recall', 'read'];
const stage = document.querySelector('.stage');

try {
  const parts = await Promise.all(VIEW_FILES.map(v => fetch(`/views/${v}.html`).then(r => { if (!r.ok) throw new Error(`views/${v}.html: ${r.status}`); return r.text(); })));
  // a course or stage page's own text (written by tools/build_seo.py) stays under the view; the router drops it on the next page
  const seo = stage.querySelector('#seo[data-key]');
  stage.innerHTML = parts.join('\n');
  if (seo) stage.append(seo);
  await import('./boot.js');
} catch (e) {
  console.error(e);
  stage.insertAdjacentHTML('afterbegin', '<p class="loading" style="padding:40px">The page didn\'t load. Reload to try again.</p>');
}
