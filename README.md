# Gradient Atlas

**Learn data science end to end, from your first line of Python to GenAI.**

🌐 **Live site:** https://gradient-atlas.chandrima-das.com

Gradient Atlas is one data science pathway in five stages: **Python → Python libraries → Machine learning → Deep learning → Generative AI** (LLMs, LangChain). Two stages are live now:

| Stage | Course | Chapters | Reading |
|---|---|---|---|
| 1 | **Python**, from the fundamentals to concurrency, databases and Pydantic | 20 | ~10 h |
| 3 | **Machine learning**: every classic algorithm built in NumPy, then checked against scikit-learn | 24 | ~16 h |

You can use it in two ways:

- **Learn everything.** Follow the stages in order, chapter by chapter.
- **Learn one topic fast.** Pick a target, such as Python decorators or gradient boosting, and the site works out the few chapters you need and skips the rest.

---

## ✨ Features

| View | What it does |
|---|---|
| 🏠 **Home** | Explains the site. Its hero is a network with four clickable hubs, one per feature, and there are quick goal cards under "Only need one thing?" |
| 🧭 **Route** | The pathway drawn as one metro line with five stations. Click a live stage (Python or Machine learning) to open its route map, then pick any chapter as your goal to get the shortest reading route to it |
| 📖 **Read** | Summary first: each chapter opens with a cheat sheet (every section in one line, plus the mistakes to watch for), and the full notes sit underneath, folded one section at a time. Switch between Python and ML in the sidebar |
| 🧠 **Recall** | Flashcards on a spaced-repetition schedule, plus multiple-choice quizzes for each chapter, with a tab for each course |
| ⌨️ **Console** | A Python-style command line. `search("decorator")` searches both courses; `course("python")` or `course("ml")` picks which course `open()`, `quiz()` and `path_to()` use |
| 🎯 **Tour** | A 7-step guided tour of the main parts of the site |
| 🌗 **Themes** | Dark (the default) and light, with progress saved in your browser |

### By the numbers

| Course | Chapters | Sections | Code examples | Flashcards | Quiz questions |
|---|---|---|---|---|---|
| Python | 20 | 184 | 515 | 382 | 207 |
| Machine learning | 24 | 439 | 862 | 512 | 665 |

---

## 🏗️ Architecture

```
 Jupyter notebooks (.ipynb)
          │
          ▼
 ┌──────────────────────────────┐
 │  Build step (Python, offline)│
 │  1. Parse notebook JSON       │
 │  2. Markdown → HTML           │  (LaTeX protected, Pygments code)
 │  3. Link cross-references     │  ("see 8.3", "Chapter 9", "§4.2" …)
 │  4. Build reference graph     │  (833 edges → chapter dependencies)
 │  5. Lay out the home network  │  (networkx spring layout)
 │  6. Generate flashcards/quiz  │  (from tables and short code cells)
 └──────────────┬───────────────┘
                ▼
 Static files: index.html + data/*.json + img/*.png
                │
                ▼
 ┌──────────────────────────────┐
 │  Browser (single-page app)   │
 │  Hash router → Home · Route · │
 │  Read · Recall · Console      │
 │  fetch() chapter JSON lazily  │
 │  MathJax renders maths        │
 │  localStorage keeps progress  │
 └──────────────────────────────┘
```

- **No backend, no framework.** Everything is vanilla HTML, CSS and JavaScript, served as static files.
- **Lazy loading.** The first load fetches only the manifest and graph. Each chapter's JSON is fetched the first time you open that chapter.
- **Rendering.** The home network is drawn on Canvas 2D and the Route on SVG. MathJax 3 typesets the maths.
- **Progress stays on your device.** Chapters read, flashcard schedules, quiz scores, your route and the theme are all kept in `localStorage` (keys start with `s2s2.`).

---

## 🛤️ The data science pathway

`/data-science-roadmap/` shows the five stages. Each stage is set in `js/tracks.js`:

- `status: 'live'` makes the stage open its own route map (Machine learning opens `/machine-learning/`).
- `status: 'soon'` shows a "Coming soon" preview of the planned modules at its own URL, for example `/generative-ai/`. A new stage also needs a URL in `js/paths.js` and `tools/build_seo.py`.

To open a new stage, add its material, then change its `status` to `'live'` and give it an `href`.

## 🧭 How the Route planner works

While building, the pipeline counts how often each chapter refers to earlier chapters. These counts become weighted dependencies, and the Route planner uses them in four steps:

1. **Direct prerequisites** are the earlier chapters the target refers to at least twice.
2. **Background** chapters are the strong dependencies (weight 4 or more) of those direct prerequisites. It looks one level deep only, so the route stays short.
3. **Advised** chapters are 8 (model evaluation) and 9 (bias–variance). They are added for any target from Chapter 11 onwards.
4. **Order.** The chapters are sorted by chapter number and end at the target ★.

**Example: learning only Naive Bayes (Chapter 15)**

```
Direct      → 2, 6, 8, 13      (referenced 2+ times by Ch 15)
Background  → 4, 10, 11        (strong deps of Ch 6 and Ch 13)
Advised     → 9
Route       → 2 → 4 → 6 → 8 → 9 → 10 → 11 → 13 → ★15   ≈ 6 h, 15 chapters skipped
```

---

## 🧠 Spaced repetition

| Answer | Next review |
|---|---|
| Again | in 1 minute |
| Hard | interval × 1.2 |
| Good | 1 day → 3 days → interval × ease |
| Easy | 4 days, or interval × ease × 1.3 |

A card counts as **mastered** once its interval reaches 21 days.

---

## ⌨️ Console commands

```
help()              list commands
open(11)            open a chapter or section, e.g. open("8.3")
search("kernel")    full-text search
refs("15")          what a chapter links to and from
route(19)           plan the shortest route to a chapter   (alias: path_to)
chapters(part="IV") list chapters in a part
quiz(11)            start a chapter quiz
review()            review flashcards that are due
progress()          show your progress
metro()             jump to the Route view
random()            open a random section
theme()             switch between dark and light
tour()              replay the guided tour
clear()             clear the console
```

---

## 📁 Repository structure

```
.
├── index.html        # page shell: header, menu, and links to the files below (also the template for every page)
├── views/            # the HTML for each page (home, pathway, route map, reader…)
├── css/              # styles, one file per page
├── js/               # app code: core.js (courses and data), router.js, paths.js (URLs), tracks.js, views/
├── data/             # Machine learning course
│   ├── manifest.json # chapters, parts, sections
│   ├── ch00–ch25.json# chapter content (HTML)
│   ├── graph.json    # section graph and chapter dependencies
│   ├── cards.json    # flashcards and quiz questions
│   ├── search.json   # search index
│   └── py/           # Python course: the same files, ch01–ch20
├── img/              # 93 figures taken from the notebooks
├── tools/            # build_seo.py (writes the pages below) and serve.py (local server)
├── data-science-roadmap/, python-for-data-science/, machine-learning/,
│   python-libraries/, deep-learning/, generative-ai/   # written by tools/build_seo.py
├── sitemap.xml, robots.txt                          # written by tools/build_seo.py
└── vercel.json       # clean URLs: pages without their own file get index.html
```

---

## 💻 Run locally

The site loads its data with `fetch()`, so it needs a local server. Opening `index.html` by double-clicking will not work. Use `tools/serve.py` rather than `python -m http.server`: like Vercel, it gives pages such as `/search/` the app.

```bash
# from the repository folder
python tools/serve.py
```

Then open http://localhost:8000.

---

## 🚀 Deploy

**Vercel** (the current setup) deploys every push to `main`. There is no build command, and the output directory is the repository root. `vercel.json` sends any page without its own file (such as `/search/` or `/machine-learning/quiz-13/`) to `index.html`, and redirects the old `/python/` pages.

GitHub Pages has no such rewrites, so those pages would show a 404 there.

**Publish an update**

```bash
git add .
git commit -m "Update site"
git push
```

Vercel redeploys within a minute or two.

---

## 🔎 Search engine pages

Every page has a normal URL, such as `/data-science-roadmap/`, `/python-for-data-science/`, `/generative-ai/` or `/machine-learning/11-linear-regression/`. Old `/#…` links are converted when they load. `js/paths.js` maps URLs to the views.

`tools/build_seo.py` writes each of those pages from `index.html`, with its own title, description, canonical link, structured data and text, so search engines can read it before any JavaScript runs. On course and stage pages that text stays visible under the route map. The script also writes `js/slugs.js`, `sitemap.xml` and `robots.txt`.

Run it again after changing `index.html`, anything in `data/`, or the stages in `js/tracks.js`, and commit the output:

```bash
python tools/build_seo.py
```

---

## 📊 Analytics

The site uses Google Analytics 4 to count page views. Each page (e.g. `/`, `/data-science-roadmap/`, `/machine-learning/11-linear-regression/`) is recorded when you change pages. No personal study data is sent anywhere, because your progress stays in your own browser.

---

## 🙏 Credits

- 📝 **Content** created by **Shayan Saha** (Machine learning) and **Sayan Porey** (Python)
- 💻 **Website** designed and developed by **Chandrima Das**, with help from an AI coding assistant

© 2026 Gradient Atlas · ML Materials. All rights reserved.
