# notion-widgets
Small widgets embedded in Ben's Notion homepage.
- `quotes.html` — rotating quotes (30s)
- `calendar.html` — mini calendar
- `roadmap.html` — five-year plan: goal rings on top, Path of life (ages 27 → 32) below
- `pond.html` — goldfish pond banner at the top of the Homepage (replaces the cover image); click water to feed, click a fish to scare it

## Where the goal data comes from
Content is edited in Notion, never in code: the tables **五年目標** and **人生路線圖**
(under Plan of my Life). `.github/workflows/sync-notion.yml` runs by hand (the widget's update button opens it),
reads both tables with the official Notion SDK (`scripts/sync-notion.mjs`, API 2025-09-03),
and commits `data/plan.json`, which `roadmap.html` reads via `plan.js`.

- Needs the repo secret `NOTION_TOKEN` (a read-only Notion integration shared with both tables).
- Without the secret the run fails with a clear message; the widget keeps the last data.
- The widget adds a timestamp to the data URL so GitHub Pages' 10-minute cache doesn't hide new data.
