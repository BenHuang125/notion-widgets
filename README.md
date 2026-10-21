# notion-widgets
Small widgets embedded in Ben's Notion homepage.
- `quotes.html` — rotating quotes (30s)
- `calendar.html` — mini calendar
- `roadmap.html` — five-year plan: goal rings on top, Path of life (ages 27 → 32) below

## Where the goal data comes from
Content is edited in Notion, never in code: the tables **五年目標** and **人生路線圖**
(under Plan of my Life). `.github/workflows/sync-notion.yml` runs hourly (and on demand),
reads both tables with the official Notion SDK (`scripts/sync-notion.mjs`, API 2025-09-03),
and commits `data/plan.json`, which `roadmap.html` reads via `plan.js`.

- Needs the repo secret `NOTION_TOKEN` (a read-only Notion integration shared with both tables).
- Without the secret the sync skips and the widgets keep the last data.
- The file gets one date stamp per day; if it is over 2 days old the roadmap shows a warning.
