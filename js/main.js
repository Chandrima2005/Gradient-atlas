// Entry point: pull each view's HTML into the page, then load the app modules.
// The modules are imported only after the partials are in place, because several
// of them look up their elements (canvases, console log, recall root) as they load.
const VIEW_FILES = ['home', 'map', 'metro', 'console', 'recall', 'read'];
const stage = document.querySelector('.stage');

try {
  const parts = await Promise.all(VIEW_FILES.map(v => fetch(`views/${v}.html`).then(r => { if (!r.ok) throw new Error(`views/${v}.html: ${r.status}`); return r.text(); })));
  stage.innerHTML = parts.join('\n');
  await import('./boot.js');
} catch (e) {
  console.error(e);
  stage.insertAdjacentHTML('afterbegin', '<p class="loading" style="padding:40px">The page didn\'t load. Reload to try again.</p>');
}
