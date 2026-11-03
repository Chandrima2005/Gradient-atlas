"""Build the static, crawlable pages that search engines index.

The app itself lives at / and switches pages with #hash links, which Google
treats as one URL. This script writes a real page for the roadmap, each
course, and each chapter, plus sitemap.xml and robots.txt.

Run it from the repository folder after changing anything in data/ or js/tracks.js:
    python tools/build_seo.py
"""
import html
import json
import re
import shutil
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://gradient-atlas.chandrima-das.com'
TODAY = date.today().isoformat()

# app link prefix, data folder, URL folder, chapters to publish (0 and the appendix are bookkeeping)
COURSES = {
    'py': dict(name='Python', dir='data/py/', url='python', pfx='py/', skip=set(),
               lead='Python for data science, from the fundamentals to concurrency, databases and Pydantic.'),
    'ml': dict(name='Machine Learning', dir='data/', url='machine-learning', pfx='', skip={0, 25},
               lead='Every classic machine learning algorithm built from scratch in NumPy, then checked against scikit-learn.'),
}
STAGES = [  # mirrors js/tracks.js
    ('Python', 'py', 'The language everything else is written in, from the basics to concurrency.'),
    ('Python libraries', None, 'The data toolkit: NumPy, pandas, Matplotlib, Seaborn and SciPy.'),
    ('Machine learning', 'ml', 'Every classic algorithm built from scratch, then checked against scikit-learn.'),
    ('Deep learning', None, 'Neural networks, from one neuron to transformers, with PyTorch.'),
    ('Generative AI', None, 'LLMs, prompt engineering, embeddings, RAG, LangChain and agents.'),
]

esc = lambda s: html.escape(str(s), quote=True)
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def clip(s, n=155):
    s = re.sub(r'\s+', ' ', s).strip()
    return s if len(s) <= n else s[:n - 1].rsplit(' ', 1)[0] + '…'


def load(cid):
    c = COURSES[cid]
    c['manifest'] = json.loads((ROOT / c['dir'] / 'manifest.json').read_text(encoding='utf-8'))
    c['chapters'] = [ch for ch in c['manifest']['chapters'] if ch['n'] not in c['skip']]
    for ch in c['chapters']:
        ch['path'] = f"/{c['url']}/{ch['n']:02d}-{slug(ch['title'])}/"


def chapter_url(cid, n, frag=''):
    """Static page for a chapter, or the app when that chapter has no static page."""
    c = COURSES[cid]
    for ch in c['chapters']:
        if ch['n'] == n:
            return ch['path'] + (f'#{frag}' if frag else '')
    return f"/#{c['pfx']}{frag or f'ch{n}'}"


def fix_links(body):
    # same rules as js/router.js: no prefix means the ML course, py/ means Python
    def sub(m):
        cid = 'py' if m.group(1) else 'ml'
        target = m.group(2)
        if target.startswith('ch'):
            return f'href="{chapter_url(cid, int(target[2:]))}"'
        return f'href="{chapter_url(cid, int(re.match(r"s(\d+)", target).group(1)), target)}"'
    body = re.sub(r'href="#(py/)?((?:ch\d+)|(?:s\d+(?:-\d+)+))"', sub, body)
    return body.replace('src="img/', 'src="/img/')


def page(path, title, desc, body, ld, math=False):
    head_math = ('<script src="/js/mathjax-config.js"></script>\n'
                 '<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.js" async></script>\n') if math else ''
    # the shared config has typeset off and works through a queue, as js/core.js typeset() does
    foot_math = ("<script>(window.__mjq = window.__mjq || []).push(document.querySelector('.sdoc .body'));"
                 " if (window.__mjReady) MathJax.typesetPromise(window.__mjq.splice(0)).catch(() => {});</script>\n") if math else ''
    out = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{BASE}{path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Gradient Atlas">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{BASE}{path}">
<meta property="og:image" content="{BASE}/icon-512.png">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#2563eb">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XEG5R5YZ7V"></script>
<script>window.dataLayer = window.dataLayer || []; function gtag(){{dataLayer.push(arguments);}} gtag('js', new Date()); gtag('config', 'G-XEG5R5YZ7V');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=JetBrains+Mono:wght@400;500;600&display=swap">
<script>try {{ const t = JSON.parse(localStorage.getItem('s2s2.theme')); if (t) document.documentElement.dataset.theme = t; }} catch {{}}</script>
<link rel="stylesheet" href="/css/base.css">
<link rel="stylesheet" href="/css/reader.css">
<link rel="stylesheet" href="/css/static.css">
{head_math}<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body class="static">
<header class="sbar"><a class="sbrand" href="/"><b>Gradient Atlas</b><small>Data science pathway</small></a>
<nav><a href="/data-science-roadmap/">Roadmap</a><a href="/python/">Python</a><a href="/machine-learning/">Machine learning</a></nav></header>
<main class="sdoc">
{body}
</main>
<footer class="sfoot">
<span>© 2026 Gradient Atlas. All rights reserved.</span>
<span>Content by <b>Shayan Saha</b> &amp; <b>Sayan Porey</b> · Website by <b>Chandrima Das</b></span>
</footer>
{foot_math}</body>
</html>
'''
    f = ROOT / path.strip('/') / 'index.html'
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(out, encoding='utf-8')


ORG = {'@type': 'Organization', 'name': 'Gradient Atlas', 'url': BASE + '/'}


def crumbs(*items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': BASE + p} for i, (n, p) in enumerate(items)]}


def build_roadmap():
    lis = []
    for i, (name, cid, sub) in enumerate(STAGES, 1):
        if cid:
            c = COURSES[cid]
            mins = sum(ch['minutes'] for ch in c['chapters'])
            link = f'<a href="/{c["url"]}/">{len(c["chapters"])} chapters · ~{round(mins / 60)} h →</a>'
        else:
            link = '<span class="soon">Coming soon</span>'
        lis.append(f'<li><h2>Stage {i}: {esc(name)}</h2><p>{esc(sub)}</p><p>{link}</p></li>')
    body = f'''<p class="crumb"><a href="/">Home</a> › Data science roadmap</p>
<h1>Data Science Roadmap: a free pathway from Python to Generative AI</h1>
<p class="lead">This is a step-by-step data science route map. Work through five stages in order, from your first line of Python to machine learning, deep learning and generative AI. Each stage builds on the one before it.</p>
<ol class="stagelist">{''.join(lis)}</ol>
<h2>How to use this pathway</h2>
<p><b>To learn everything,</b> follow the stages in order, chapter by chapter. <b>To learn one topic fast,</b> open the <a href="/#route">interactive route map</a>, pick the chapter you want, such as gradient boosting or Python decorators, and it shows only the chapters you need to read first.</p>
<p class="cta"><a class="sbtn" href="/#route">Open the interactive route map →</a></p>'''
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'ItemList', 'name': 'Data science roadmap', 'itemListOrder': 'https://schema.org/ItemListOrderAscending',
         'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n,
                              **({'url': f"{BASE}/{COURSES[cid]['url']}/"} if cid else {})}
                             for i, (n, cid, _) in enumerate(STAGES)]},
        crumbs(('Home', '/'), ('Data science roadmap', '/data-science-roadmap/'))]}
    page('/data-science-roadmap/', 'Data Science Roadmap 2026: Free Pathway from Python to ML & GenAI | Gradient Atlas',
         'A free, step-by-step data science roadmap and route map: Python, Python libraries, machine learning, deep learning and generative AI, one stage at a time.',
         body, ld)


def build_course(cid):
    c = COURSES[cid]
    parts = {p['key']: p['name'] for p in c['manifest']['parts']}
    rows, last = [], None
    for ch in c['chapters']:
        if ch['part'] != last:
            if last is not None:
                rows.append('</ol>')
            rows.append(f'<h2>{esc(parts[ch["part"]])}</h2><ol class="chlist" start="{ch["n"]}">')
            last = ch['part']
        rows.append(f'<li><a href="{ch["path"]}">{esc(ch["title"])}</a><span>{esc(ch["scope"])}</span></li>')
    rows.append('</ol>')
    mins = sum(ch['minutes'] for ch in c['chapters'])
    title = f'Free {c["name"]} Course for Data Science: {len(c["chapters"])} Chapters | Gradient Atlas'
    desc = clip(f'{c["lead"]} {len(c["chapters"])} free chapters, about {round(mins / 60)} hours of reading, with examples, flashcards and quizzes.')
    body = f'''<p class="crumb"><a href="/">Home</a> › <a href="/data-science-roadmap/">Data science roadmap</a> › {esc(c["name"])}</p>
<h1>{esc(c["name"])} for data science: a free course</h1>
<p class="lead">{esc(c["lead"])} {len(c["chapters"])} chapters, about {round(mins / 60)} hours of reading.</p>
<p class="cta"><a class="sbtn" href="/#{c["pfx"]}route">Open the {esc(c["name"].lower())} route map →</a></p>
{''.join(rows)}'''
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'Course', 'name': f'{c["name"]} for data science', 'description': desc, 'url': f'{BASE}/{c["url"]}/',
         'provider': ORG, 'isAccessibleForFree': True, 'inLanguage': 'en',
         'offers': {'@type': 'Offer', 'category': 'Free', 'price': 0, 'priceCurrency': 'USD'},
         'hasCourseInstance': {'@type': 'CourseInstance', 'courseMode': 'online', 'courseWorkload': f'PT{round(mins / 60)}H'},
         'hasPart': [{'@type': 'LearningResource', 'name': ch['title'], 'url': BASE + ch['path']} for ch in c['chapters']]},
        crumbs(('Home', '/'), ('Data science roadmap', '/data-science-roadmap/'), (c['name'], f'/{c["url"]}/'))]}
    page(f'/{c["url"]}/', title, desc, body, ld)


def build_chapters(cid):
    c = COURSES[cid]
    chs = c['chapters']
    for i, ch in enumerate(chs):
        d = json.loads((ROOT / c['dir'] / f'ch{ch["n"]:02d}.json').read_text(encoding='utf-8'))
        prev, nxt = (chs[i - 1] if i else None), (chs[i + 1] if i + 1 < len(chs) else None)
        pn = ''.join([f'<a href="{prev["path"]}">← {esc(prev["title"])}</a>' if prev else '<span></span>',
                      f'<a href="{nxt["path"]}">{esc(nxt["title"])} →</a>' if nxt else ''])
        toc = ''.join(f'<li class="l{s["lvl"]}"><a href="#{s["id"]}">{esc(s["num"])} {esc(s["title"])}</a></li>'
                      for s in ch['sections'] if s['lvl'] <= 3)
        title = f'{ch["title"]} – {c["name"]} Chapter {ch["n"]} | Gradient Atlas'
        desc = clip(ch['scope'] or ch['covers'] or f'{ch["title"]}, chapter {ch["n"]} of the free {c["name"]} course.')
        body = f'''<p class="crumb"><a href="/">Home</a> › <a href="/data-science-roadmap/">Roadmap</a> › <a href="/{c["url"]}/">{esc(c["name"])}</a> › Chapter {ch["n"]}</p>
<h1><small>{esc(c["name"])} · Chapter {ch["n"]}</small>{esc(ch["title"])}</h1>
{f'<p class="lead">{esc(ch["scope"])}</p>' if ch["scope"] else ''}
<p class="cta"><a class="sbtn" href="/#{c["pfx"]}ch{ch["n"]}">Read in the interactive reader, with quizzes and flashcards →</a></p>
<nav class="stoc" aria-label="Sections"><ol>{toc}</ol></nav>
<article class="body">{fix_links(d["html"])}</article>
<nav class="spn">{pn}</nav>'''
        ld = {'@context': 'https://schema.org', '@graph': [
            {'@type': 'LearningResource', 'name': ch['title'], 'headline': ch['title'], 'description': desc,
             'url': BASE + ch['path'], 'learningResourceType': 'Course chapter', 'inLanguage': 'en',
             'isAccessibleForFree': True, 'timeRequired': f'PT{ch["minutes"]}M', 'publisher': ORG,
             'isPartOf': {'@type': 'Course', 'name': f'{c["name"]} for data science', 'url': f'{BASE}/{c["url"]}/', 'provider': ORG}},
            crumbs(('Home', '/'), ('Data science roadmap', '/data-science-roadmap/'), (c['name'], f'/{c["url"]}/'),
                   (ch['title'], ch['path']))]}
        page(ch['path'], title, desc, body, ld, math=True)


def build_sitemap():
    urls = ['/', '/data-science-roadmap/'] + [f'/{c["url"]}/' for c in COURSES.values()]
    urls += [ch['path'] for c in COURSES.values() for ch in c['chapters']]
    (ROOT / 'sitemap.xml').write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + ''.join(f'  <url><loc>{BASE}{u}</loc><lastmod>{TODAY}</lastmod></url>\n' for u in urls)
        + '</urlset>\n', encoding='utf-8')
    (ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {BASE}/sitemap.xml\n', encoding='utf-8')
    return len(urls)


if __name__ == '__main__':
    for c in COURSES.values():  # start clean so renamed chapters don't leave old pages behind
        shutil.rmtree(ROOT / c['url'], ignore_errors=True)
    for cid in COURSES:
        load(cid)
    build_roadmap()
    for cid in COURSES:
        build_course(cid)
        build_chapters(cid)
    print(f'sitemap.xml: {build_sitemap()} URLs')
