// MathJax must be configured before its script loads
window.MathJax = {
  tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']], processEscapes: true },
  svg: { fontCache: 'global' },
  options: { skipHtmlTags: ['script','noscript','style','textarea','pre','code'] },
  startup: { typeset: false, ready() { MathJax.startup.defaultReady(); MathJax.startup.promise.then(() => { window.__mjReady = true; const q = (window.__mjq || []).splice(0); if (q.length) MathJax.typesetPromise(q).catch(() => {}); }); } }
};
