# notion-widgets
Small widgets embedded in Ben's Notion homepage, plus his standalone life roadmap.

- `quotes.html` — rotating quotes (30s)
- `calendar.html` — mini calendar
- `pond.html` — goldfish pond banner at the top of the Homepage (replaces the cover image); click water to feed, click a fish to scare it
- `src/roadmap/` — 人生路線圖, a standalone page published as a Claude artifact (not in Notion):
  goal rings, a timeline from 2017 to age 50 with birthdays, goal flags and time-range tracks,
  and one column of cards per year. See `CLAUDE.md`.

## Where the roadmap's data lives
In the published page's own database (goals, cards, tracks, segments, meta/layout).
Nothing personal is in this repo, and no Notion key is needed any more.
Build with `python3 build.py`; checks with `npm run check` and `node tests/e2e/roadmap.mjs`.
