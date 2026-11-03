"""Write a real page for every URL that search engines should index.

Every page is index.html with its own title, description, canonical link, structured
data and text, so /python-for-data-science/ opens the Python route map and
/machine-learning/11-linear-regression/ opens that chapter, and both are readable
before any JavaScript runs. Also writes js/slugs.js (chapter URL names for
js/paths.js), sitemap.xml and robots.txt.

Run it from the repository folder after changing index.html, anything in data/, or js/tracks.js:
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
SHELL = (ROOT / 'index.html').read_text(encoding='utf-8')

# URLs and route keys must match js/paths.js; titles must match js/router.js and js/views/reader.js
COURSES = {
    'py': dict(name='Python for Data Science', short='Python', dir='data/py/', url='/python-for-data-science/', pfx='py/', key='py/route',
               title='Python for Data Science: Free Course | Gradient Atlas',
               lead='Learn Python for data science, from the fundamentals to OOP, generators, concurrency, databases and Pydantic.'),
    'ml': dict(name='Machine Learning', short='Machine learning', dir='data/', url='/machine-learning/', pfx='', key='route-ml',
               title='Machine Learning for Data Science: Free Course | Gradient Atlas',
               lead='Every classic machine learning algorithm built from scratch in NumPy, then checked against scikit-learn.'),
}
STAGE_URL = {'python': COURSES['py']['url'], 'libs': '/python-libraries/', 'ml': COURSES['ml']['url'],
             'dl': '/deep-learning/', 'genai': '/generative-ai/'}
STAGE_PAGE = {  # the stages that are not live yet
    'libs': ('Python Libraries for Data Science: NumPy, pandas, Matplotlib | Gradient Atlas',
             'Python libraries for data science',
             'NumPy, pandas, Matplotlib, Seaborn and SciPy: the data toolkit every data scientist uses after learning Python.'),
    'dl': ('Deep Learning Roadmap: Neural Networks to Transformers | Gradient Atlas',
           'Deep learning roadmap',
           'A deep learning roadmap from a single neuron to transformers: backpropagation, optimisers, PyTorch, CNNs, RNNs and attention.'),
    'genai': ('Generative AI Roadmap: LLMs, RAG and LangChain | Gradient Atlas',
              'Generative AI roadmap',
              'A generative AI roadmap for data scientists: how LLMs work, tokens and embeddings, prompt engineering, vector databases, RAG, LangChain and agents.'),
}
ROADMAP_TITLE = 'Data Science Roadmap 2026: Python to Generative AI | Gradient Atlas'
OUT_DIRS = ['data-science-roadmap', 'python', 'python-for-data-science', 'machine-learning', 'python-libraries', 'deep-learning', 'generative-ai']

esc = lambda s: html.escape(str(s), quote=True)
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
ORG = {'@type': 'Organization', 'name': 'Gradient Atlas', 'url': BASE + '/'}


def clip(s, n=155):
    s = re.sub(r'\s+', ' ', s).strip()
    return s if len(s) <= n else s[:n - 1].rsplit(' ', 1)[0] + '…'


def read_tracks():
    """The five stages, read from js/tracks.js so the two never disagree."""
    src = (ROOT / 'js/tracks.js').read_text(encoding='utf-8')
    out = []
    for block in re.findall(r'\{\s*id:.*?\n  \}', src, re.S):
        get = lambda k: re.search(k + r":\s*'((?:[^'\\]|\\.)*)'", block).group(1).replace("\\'", "'")
        out.append(dict(id=get('id'), n=int(re.search(r'n:\s*(\d+)', block).group(1)), title=get('title'), sub=get('sub'),
                        live="status: 'live'" in block,
                        mods=re.findall(r"'((?:[^'\\]|\\.)*)'", re.search(r'mods:\s*\[(.*?)\]', block, re.S).group(1))))
    return out


def load(cid):
    c = COURSES[cid]
    c['manifest'] = json.loads((ROOT / c['dir'] / 'manifest.json').read_text(encoding='utf-8'))
    c['chapters'] = c['manifest']['chapters']
    for ch in c['chapters']:
        ch['slug'] = f"{ch['n']:02d}-{slug(ch['title'])}"
        ch['path'] = f"{c['url']}{ch['slug']}/"


def chapter_url(cid, n, frag=''):
    ch = next(x for x in COURSES[cid]['chapters'] if x['n'] == n)
    return ch['path'] + (f'#{frag}' if frag else '')


def fix_links(body):
    # the notes link with #keys (no prefix: ML, py/: Python), the same rule as js/paths.js
    def sub(m):
        cid, target = ('py' if m.group(1) else 'ml'), m.group(2)
        if target.startswith('ch'):
            return f'href="{chapter_url(cid, int(target[2:]))}"'
        return f'href="{chapter_url(cid, int(re.match(r"s(\d+)", target).group(1)), target)}"'
    body = re.sub(r'href="#(py/)?((?:ch\d+)|(?:s\d+(?:-\d+)+))"', sub, body)
    return body.replace('src="img/', 'src="/img/')


def crumbs(*items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': BASE + p} for i, (n, p) in enumerate(items)]}


def page(path, title, desc, body, ld, key=None):
    """index.html with this page's head tags and text. With a key, the text stays visible under the app's view."""
    head = f'''<!-- seo:start  written by tools/build_seo.py -->
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
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<!-- seo:end -->'''
    attrs = f' data-key="{esc(key)}"' if key else ''
    main = f'<!-- page:start -->\n<section class="sdoc" id="seo"{attrs}>\n{body}\n</section>\n<!-- page:end -->'
    out = re.sub(r'<!-- seo:start.*?<!-- seo:end -->', lambda _: head, SHELL, count=1, flags=re.S)
    out = re.sub(r'<!-- page:start -->.*?<!-- page:end -->', lambda _: main, out, count=1, flags=re.S)
    f = ROOT / path.strip('/') / 'index.html'
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(out, encoding='utf-8')


def build_roadmap(tracks):
    lis = []
    for t in tracks:
        url = STAGE_URL[t['id']]
        if t['live']:
            c = next(c for c in COURSES.values() if c['url'] == url)
            mins = sum(ch['minutes'] for ch in c['chapters'])
            more = f'{len(c["chapters"])} free chapters · about {round(mins / 60)} hours'
        else:
            more = 'Coming soon'
        lis.append(f'<li><h3><a href="{url}">Stage {t["n"]}: {esc(t["title"])}</a></h3><p>{esc(t["sub"])}</p>'
                   f'<p class="meta">{esc(more)} · {esc(", ".join(t["mods"][:6]))}…</p></li>')
    body = f'''<h1>Data science roadmap: from Python to generative AI</h1>
<p class="lead">A free, step-by-step data science roadmap. Work through five stages in order, from your first line of Python to machine learning, deep learning and generative AI. Each stage builds on the one before it, and each has its own route map that shows only the chapters you need.</p>
<ol class="stagelist">{''.join(lis)}</ol>'''
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'ItemList', 'name': 'Data science roadmap', 'itemListOrder': 'https://schema.org/ItemListOrderAscending',
         'itemListElement': [{'@type': 'ListItem', 'position': t['n'], 'name': t['title'], 'url': BASE + STAGE_URL[t['id']]} for t in tracks]},
        crumbs(('Gradient Atlas', '/'), ('Data science roadmap', '/data-science-roadmap/'))]}
    page('/data-science-roadmap/', ROADMAP_TITLE,
         'A free, step-by-step data science roadmap for 2026: Python, Python libraries, machine learning, deep learning and generative AI, one stage at a time.',
         body, ld, key='route')


def build_stage(t, tracks):
    title, h1, lead = STAGE_PAGE[t['id']]
    first = next(x for x in tracks if x['live'])
    body = f'''<h1>{esc(h1)}</h1>
<p class="lead">{esc(lead)} This is stage {t['n']} of the five-stage <a href="/data-science-roadmap/">data science roadmap</a>.</p>
<h2>What this stage covers</h2>
<ol>{''.join(f'<li>{esc(m)}</li>' for m in t['mods'])}</ol>
<p>The chapters for this stage are being written. Meanwhile, start with <a href="{STAGE_URL[first['id']]}">stage {first['n']}: {esc(first['title'])}</a>.</p>'''
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'ItemList', 'name': h1, 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': m} for i, m in enumerate(t['mods'])]},
        crumbs(('Gradient Atlas', '/'), ('Data science roadmap', '/data-science-roadmap/'), (h1, STAGE_URL[t['id']]))]}
    page(STAGE_URL[t['id']], title, clip(lead), body, ld, key='route-' + t['id'])


def build_course(cid):
    c = COURSES[cid]
    parts = {p['key']: p['name'] for p in c['manifest']['parts']}
    rows, last = [], None
    for ch in c['chapters']:
        if ch['part'] != last:
            rows.append(('</ol>' if last is not None else '') + f'<h2>{esc(parts[ch["part"]])}</h2><ol class="chlist">')
            last = ch['part']
        rows.append(f'<li><a href="{ch["path"]}">{esc(ch["title"])}</a><span>{esc(ch["scope"] or ch["covers"])}</span></li>')
    rows.append('</ol>')
    mins = sum(ch['minutes'] for ch in c['chapters'])
    desc = clip(f'{c["lead"]} {len(c["chapters"])} free chapters with examples, flashcards and quizzes.')
    body = f'''<h1>{esc(c["name"])}: a free course</h1>
<p class="lead">{esc(c["lead"])} {len(c["chapters"])} chapters, about {round(mins / 60)} hours of reading. Part of the <a href="/data-science-roadmap/">data science roadmap</a>.</p>
{''.join(rows)}'''
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'Course', 'name': c['name'], 'description': desc, 'url': BASE + c['url'],
         'provider': ORG, 'isAccessibleForFree': True, 'inLanguage': 'en',
         'offers': {'@type': 'Offer', 'category': 'Free', 'price': 0, 'priceCurrency': 'USD'},
         'hasCourseInstance': {'@type': 'CourseInstance', 'courseMode': 'online', 'courseWorkload': f'PT{round(mins / 60)}H'},
         'hasPart': [{'@type': 'LearningResource', 'name': ch['title'], 'url': BASE + ch['path']} for ch in c['chapters']]},
        crumbs(('Gradient Atlas', '/'), ('Data science roadmap', '/data-science-roadmap/'), (c['name'], c['url']))]}
    page(c['url'], c['title'], desc, body, ld, key=c['key'])


def build_chapters(cid):
    c = COURSES[cid]
    for ch in c['chapters']:
        d = json.loads((ROOT / c['dir'] / f'ch{ch["n"]:02d}.json').read_text(encoding='utf-8'))
        title = f'{ch["title"]} – {c["name"]} Chapter {ch["n"]} | Gradient Atlas'
        desc = clip(ch['scope'] or ch['covers'] or f'{ch["title"]}, chapter {ch["n"]} of the free {c["name"]} course.')
        body = f'''<p class="crumb"><a href="/data-science-roadmap/">Data science roadmap</a> › <a href="{c["url"]}">{esc(c["name"])}</a> › Chapter {ch["n"]}</p>
<h1>{esc(ch["title"])}</h1>
{f'<p class="lead">{esc(ch["scope"])}</p>' if ch["scope"] else ''}
<article class="body">{fix_links(d["html"])}</article>'''
        ld = {'@context': 'https://schema.org', '@graph': [
            {'@type': 'LearningResource', 'name': ch['title'], 'headline': ch['title'], 'description': desc,
             'url': BASE + ch['path'], 'learningResourceType': 'Course chapter', 'inLanguage': 'en',
             'isAccessibleForFree': True, 'timeRequired': f'PT{ch["minutes"]}M', 'publisher': ORG,
             'isPartOf': {'@type': 'Course', 'name': c['name'], 'url': BASE + c['url'], 'provider': ORG}},
            crumbs(('Gradient Atlas', '/'), ('Data science roadmap', '/data-science-roadmap/'), (c['name'], c['url']),
                   (ch['title'], ch['path']))]}
        page(ch['path'], title, desc, body, ld)


def write_slugs():
    data = {cid: {ch['n']: ch['slug'] for ch in c['chapters']} for cid, c in COURSES.items()}
    (ROOT / 'js/slugs.js').write_text(
        '// chapter URL names, written by tools/build_seo.py from data/*/manifest.json. Do not edit by hand.\n'
        f'export const SLUG = {json.dumps(data, ensure_ascii=False)};\n', encoding='utf-8')


def build_sitemap(tracks):
    urls = ['/', '/data-science-roadmap/'] + [STAGE_URL[t['id']] for t in tracks]
    urls += [ch['path'] for c in COURSES.values() for ch in c['chapters']]
    (ROOT / 'sitemap.xml').write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + ''.join(f'  <url><loc>{BASE}{u}</loc><lastmod>{TODAY}</lastmod></url>\n' for u in urls)
        + '</urlset>\n', encoding='utf-8')
    (ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {BASE}/sitemap.xml\n', encoding='utf-8')
    return len(urls)


if __name__ == '__main__':
    for d in OUT_DIRS:  # start clean so renamed chapters don't leave old pages behind
        shutil.rmtree(ROOT / d, ignore_errors=True)
    tracks = read_tracks()
    for cid in COURSES:
        load(cid)
    write_slugs()
    build_roadmap(tracks)
    for t in tracks:
        if not t['live']:
            build_stage(t, tracks)
    for cid in COURSES:
        build_course(cid)
        build_chapters(cid)
    print(f'sitemap.xml: {build_sitemap(tracks)} URLs')
