# notion-widgets
Small widgets embedded in Ben's Notion homepage, plus his standalone life roadmap.

- `quotes.html` — rotating quotes (30s)
- `calendar.html` — mini calendar
- `pond.html` — goldfish pond banner at the top of the Homepage (replaces the cover image); click water to feed, click a fish to scare it
- `src/roadmap/` → `dist/index.html` — 人生路線圖, embedded in the Notion Homepage:
  goal rings, a timeline from 2017 to age 50 with birthdays, goal flags and time-range tracks,
  and one column of cards per year. See `CLAUDE.md`.

## Where the roadmap's data lives
In Ben's browser (localStorage `life-roadmap.v1`, inside the Notion embed), with a copy/paste backup in the page.
Nothing personal is in this repo, and no key is needed.
Build with `python3 build.py`; checks with `npm run check` and `node tests/e2e/roadmap.mjs`.
