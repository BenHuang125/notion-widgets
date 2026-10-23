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
8. 日期一律英文月份、日月年：一天 `30 Sep 2026`（`dayLabel`）、一個月 `Sep 2017`（`monthLabel`）、區間 `Sep 2017 – Jun 2021`（`rangeLabel`），都在 `core/dates.ts`，不在別處自己組日期字。
9. 顏色屬於軌道（`Track.color`），時間段沒有自己的顏色；舊資料的軌道沒顏色時沿用它時間段以前存的顏色（`store.ts` 的 `trackFallbacks`）。
10. 小旗排版在 `core/marks.ts`：由右往左放，每支取最低高度，文字可放旗桿左右；左邊只在下方沒有還沒放的旗子時才用；改這裡要跑 `tests/roadmap/marks.test.ts`。
11. GitHub Pages 會讓瀏覽器把主頁留 10 分鐘：主頁裡的小程式打開時用 `cache: no-store` 問伺服器目前的程式檔，不同就換網址重開一次；所以上線後不用改 Notion 嵌入網址。
12. 首頁語錄框（`quotes.html`＋`quotes/core.js`、`chameleon.js`、`scene.js`，依序載入、共用變數）：世界進度（房子、樹…）只由真實時間推算（`worldAt`，起點台北 2026-10-23），不靠存檔；心情與摸摸次數存 localStorage `frame-spirit.v1`（不准改名）；改這裡跑 `node tests/e2e/quotes.mjs`；改程式要把 `quotes.html` 的 `?v=` 和 Notion 嵌入網址的 `?v=` 一起加 1。
13. 上線：合併到 main 後 GitHub Pages 自動更新 `dist/index.html`；Notion HOME 嵌入這個網址。
14. Working 頁日曆（`working.html`＋`working/*.js`，ES module）：資料只存 localStorage `working.v1`（不准改名；events、todos 以日期分、reviews 以週次分、projects）；
    專案從 Notion 嵌入網址 `#projects=` 帶入（`#` 後不送 GitHub，專案名不寫進 repo）：每項各自 URI 編碼、逗號分隔，格式 `名稱` 或 `Notion頁面id|名稱|舊名…`；先用 Notion id 對、再用名稱或舊名對，對到就原地改名（id、顏色、事件不變），新的接在最後，網址裡沒有的只從選單藏起來、資料保留（`core.js` 的 `mergeProjects`）；
    嵌入網址由排程任務「Working 日曆專案同步」照 Notion「專案 Projects」資料庫更新（「個人」固定在最前、沒有 id）；
    代辦和日曆完全分開；週回顧 Week 1 = 2026-09-04（週五起算）；字體與顏色沿用路線圖（`--serif` 數字、`--sans` 文字），只有淺色；
    改這裡跑 `node tests/e2e/working.mjs`（沙盒下載不到瀏覽器時加 `PW_CHROMIUM=<已安裝的 chromium 路徑>`）；改程式要把各檔 import 與 `working.html` 的 `?v=` 一起加 1。
