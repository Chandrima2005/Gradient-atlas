# Gradient Atlas · ML Materials

**Learn classical machine learning by building it, not memorising it.**

🌐 **Live site:** https://gradient-atlas.chandrima-das.com

Gradient Atlas turns a 24-chapter course on classical machine learning into an interactive study app. For each algorithm you see the maths, build it yourself in plain NumPy, then check that your version gives the same answer as scikit-learn.

You can use it in two ways:

- **Learn everything.** Read all 24 chapters in order, from foundations to real-world practice (about 16 hours).
- **Learn one topic fast.** Pick a target, such as Naive Bayes or Gradient Boosting, and the site works out the few chapters you need and skips the rest.

---

## ✨ Features

| View | What it does |
|---|---|
| 🏠 **Home** | Explains the site. Its hero is a network with five clickable hubs, one per feature, and there are quick goal cards under "Only need one thing?" |
| 🧭 **Route** | Pick any chapter as your goal to get the shortest reading route to it, with time estimates and a list of the chapters it skips |
| 🕸️ **Map** | An interactive map of all 439 sections and how they reference each other. You can pan, zoom, pinch and filter by part |
| 📖 **Read** | A chapter reader with typeset maths, highlighted code, figures and clickable cross-references |
| 🧠 **Recall** | Flashcards on a spaced-repetition schedule, plus multiple-choice quizzes for each chapter |
| ⌨️ **Console** | A Python-style command line for moving around the site, e.g. `route(15)`, `search("kernel")`, `quiz(11)` |
| 🎯 **Tour** | A 7-step guided tour of the main parts of the site |
| 🌗 **Themes** | Dark (the default) and light, with progress saved in your browser |

### By the numbers

| Chapters | Sections | Code cells | Figures | Cross-links | Flashcards | Quiz questions |
|---|---|---|---|---|---|---|
| 24 | 439 | 862 | 93 | 833 | 512 | 665 |

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
 │  5. Lay out the map           │  (networkx spring layout)
 │  6. Generate flashcards/quiz  │  (from tables and short code cells)
 └──────────────┬───────────────┘
                ▼
 Static files: index.html + data/*.json + img/*.png
                │
                ▼
 ┌──────────────────────────────┐
 │  Browser (single-page app)   │
 │  Hash router → Home · Route · │
 │  Map · Read · Recall · Console│
 │  fetch() chapter JSON lazily  │
 │  MathJax renders maths        │
 │  localStorage keeps progress  │
 └──────────────────────────────┘
```

- **No backend, no framework.** Everything is vanilla HTML, CSS and JavaScript, served as static files.
- **Lazy loading.** The first load fetches only the manifest and graph. Each chapter's JSON is fetched the first time you open that chapter.
- **Rendering.** The Map is drawn on Canvas 2D and the Route on SVG. MathJax 3 typesets the maths.
- **Progress stays on your device.** Chapters read, flashcard schedules, quiz scores, your route and the theme are all kept in `localStorage` (keys start with `s2s2.`).

---

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
map() / metro()     jump to the Map or the Route view
random()            open a random section
theme()             switch between dark and light
tour()              replay the guided tour
clear()             clear the console
```

---

## 📁 Repository structure

```
.
├── index.html        # the whole app (markup, styles, scripts)
├── data/
│   ├── manifest.json # chapters, parts, sections
│   ├── ch00–ch25.json# chapter content (HTML)
│   ├── graph.json    # map nodes, edges, chapter dependencies
│   ├── cards.json    # flashcards and quiz questions
│   └── search.json   # search index
├── img/              # 93 figures taken from the notebooks
├── CNAME             # custom domain for GitHub Pages
└── .nojekyll         # stops GitHub Pages from running Jekyll
```

---

## 💻 Run locally

The site loads its data with `fetch()`, so it needs a local server. Opening `index.html` by double-clicking will not work.

```bash
# from the repository folder
python -m http.server 8000
```

Then open http://localhost:8000.

---

## 🚀 Deploy

**GitHub Pages** (the current setup)

1. Push the repository to GitHub.
2. Go to **Settings → Pages → Deploy from a branch → `main` / root**.
3. Optionally, add a custom domain. This creates the `CNAME` file.

**Netlify** (an alternative): drag and drop the folder at app.netlify.com/drop, or connect the repo. There is no build command, and the publish directory is `/`.

**Publish an update**

```bash
git add .
git commit -m "Update site"
git push
```

GitHub Pages redeploys within a minute or two.

---

## 📊 Analytics

The site uses Google Analytics 4 to count page views. Each view (e.g. `/home`, `/route`, `/ch11`) is recorded when you change pages. No personal study data is sent anywhere, because your progress stays in your own browser.

---

## 🙏 Credits

- 📝 **Content** created by **Shayan Saha**
- 💻 **Website** designed and developed by **Chandrima Das**, with help from an AI coding assistant

© 2026 Gradient Atlas · ML Materials. All rights reserved.
