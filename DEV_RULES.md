# DEV_RULES.md — 人生路線圖專屬規則

1. 開工先 `git fetch`，以 `origin/main` 為唯一正本（system-template RULES 第 1 節第 2 條）。
2. 測試：`npm run check`（型別、Biome、knip、Vitest）、`python3 build.py --check`、`python3 tests/dupcheck.py`、
   `node tests/e2e/roadmap.mjs`（只測電腦畫面，Ben 2026-10-22 指定；不做手機、深色截圖）。
3. 儲存名稱不准改：localStorage `life-roadmap.v1`、`life-roadmap.seed-applied`；備份格式 version 1。改格式要能讀舊備份。
4. 個人資料不進 repo（repo 公開）：Ben 的資料只在他的瀏覽器（Notion 嵌入那份）；測試用範例資料。
   Ben 2026-10-22 選「只存瀏覽器」：要直接在 Notion 裡用；Claude artifact 嵌不進 Notion，網頁資料庫也要登入。
5. 第一次資料由 Notion 嵌入網址的 `#seed=`（壓縮過的備份）帶入，只在瀏覽器還沒資料、且這份沒用過時套用一次；`#` 後面不會送到 GitHub，網址只在 Ben 的 Notion 頁面上，絕不寫進 repo。
6. 操作要即時：按鈕和對話框不等存檔（`data/actions.ts` 背景存，失敗用 toast 告知並退回）；畫面只重畫資料有變的那一塊（`render/keep.ts`）。
7. 在 Notion 裡是跨網域嵌入，瀏覽器可能暫停畫面更新（requestAnimationFrame）：重畫不准靠它排程（用 microtask）；任何錯誤都要寫在頁面上，不准停在「讀取中」。
8. 上線：合併到 main 後 GitHub Pages 自動更新 `dist/index.html`；Notion HOME 嵌入這個網址。
