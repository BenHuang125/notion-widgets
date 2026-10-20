// Reads Ben's two Notion tables (五年目標, 人生路線圖) and writes data/plan.json
// for goals.html and roadmap.html. Runs in GitHub Actions; the token never
// reaches the browser. Uses the official SDK (API version 2025-09-03, data sources).
import { Client, collectPaginatedAPI, isFullPage } from "@notionhq/client";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const SOURCES = {
  goals: "a432a3d7-82ab-4db1-93c3-e5a985751d0f",
  milestones: "2725d999-9a0d-4e71-adf6-7fb3bbf72068",
};
const OUT = new URL("../data/plan.json", import.meta.url);

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.log("NOTION_TOKEN is not set; keeping the existing data/plan.json.");
  process.exit(0);
}
const notion = new Client({ auth: token });

const text = (p) => (p?.title ?? p?.rich_text ?? []).map((t) => t.plain_text).join("").trim();
const select = (p) => p?.select?.name ?? null;
const date = (p) => p?.date?.start ?? null;
const ids = (p) => (p?.relation ?? []).map((r) => r.id.replaceAll("-", ""));

async function rows(dataSourceId) {
  const results = await collectPaginatedAPI(notion.dataSources.query, { data_source_id: dataSourceId });
  return results.filter(isFullPage);
}

const [goalPages, milestonePages] = await Promise.all([rows(SOURCES.goals), rows(SOURCES.milestones)]);

const milestones = milestonePages
  .map((pg) => {
    const p = pg.properties;
    return {
      id: pg.id.replaceAll("-", ""),
      name: text(p["名稱"]),
      age: select(p["年紀"]),
      category: select(p["類別"]),
      done: p["完成"]?.checkbox === true,
      date: date(p["目標日期"]),
      note: text(p["備註"]),
      goals: ids(p["目標"]),
    };
  })
  .filter((m) => m.name)
  .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));

const goals = goalPages
  .map((pg) => {
    const p = pg.properties;
    const id = pg.id.replaceAll("-", "");
    const linked = milestones.filter((m) => m.goals.includes(id));
    return {
      id,
      name: text(p["名稱"]),
      category: select(p["類別"]),
      date: date(p["目標日期"]),
      done: linked.filter((m) => m.done).length,
      total: linked.length,
    };
  })
  .filter((g) => g.name)
  .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));

// Column order follows the option order of the 年紀 select in Notion.
const ds = await notion.dataSources.retrieve({ data_source_id: SOURCES.milestones });
const ages = (ds.properties["年紀"]?.select?.options ?? []).map((o) => o.name);

const content = { ages, goals, milestones };
const now = new Date();
// Taipei calendar date. It changes once a day, so the file gets at most one
// "still running" commit per day: the widget uses it to warn if syncing stops,
// and the commit counts as repo activity for GitHub's 60-day schedule rule.
const checkedOn = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });

let previous = {};
try {
  previous = JSON.parse(await readFile(OUT, "utf8"));
} catch {}
const { checkedOn: prevChecked, updatedAt: prevUpdated, ...prevContent } = previous;
const changed = JSON.stringify(prevContent) !== JSON.stringify(content);

if (!changed && prevChecked === checkedOn) {
  console.log("No changes in Notion.");
  process.exit(0);
}
await mkdir(new URL("../data/", import.meta.url), { recursive: true });
const updatedAt = changed || !prevUpdated ? now.toISOString() : prevUpdated;
await writeFile(OUT, JSON.stringify({ checkedOn, updatedAt, ...content }, null, 2) + "\n");
console.log(changed ? `Updated: ${goals.length} goals, ${milestones.length} milestones.` : "Daily check stamp.");
