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
12. 首頁語錄框（`quotes.html`＋`quotes/data.js`、`core.js`、`chameleon.js`、`scene.js`、`shelf.js`，依序載入、共用變數）：語錄不寫死在程式裡，存在 localStorage `quote-shelf.v1`（不准改名；`items` 每句 id、h 深色行、b 淺色行、at 加入時間），點畫框右上的發光書架在同一個框裡打開收藏新增／修改／刪除，最新的排最前、框上馬上換成新加的那句；還沒存過時用 `data.js` 的四句起始語錄；世界進度（房子、樹…）只由真實時間推算（`worldAt`，起點台北 2026-10-23），不靠存檔；心情與摸摸次數存 localStorage `frame-spirit.v1`（不准改名）；改這裡跑 `node tests/e2e/quotes.mjs`；改程式要把 `quotes.html` 的 `?v=` 和 Notion 嵌入網址的 `?v=` 一起加 1。Notion 嵌入網址要等 PR 合併、網站確認是新版後才改（先改的話 Notion 會抓到舊版並暫存；2026-10-23 發生過，嵌入網址的 `?v=` 可以比程式的大，只要每次都加大）。
13. 上線：合併到 main 後 GitHub Pages 自動更新 `dist/index.html`；Notion HOME 嵌入這個網址。
14. Working 頁日曆（`working.html`＋`working/*.js`，ES module）：資料只存 localStorage `working.v1`（不准改名；events、todos 以日期分、reviews 以週次分、projects）；
    專案從 Notion 嵌入網址 `#projects=` 帶入（`#` 後不送 GitHub，專案名不寫進 repo）：每項各自 URI 編碼、逗號分隔，格式 `名稱` 或 `Notion頁面id|名稱|舊名…`；先用 Notion id 對、再用名稱或舊名對，對到就原地改名（id、顏色、事件不變），新的接在最後，網址裡沒有的只從選單藏起來、資料保留（`core.js` 的 `mergeProjects`）；
    嵌入網址照 Notion「專案 Projects」資料庫（collection://004c5855-6db5-48a0-923c-dc988e3aefc6）更新：「個人」固定在最前、沒有 id；已有的 id 保留順序與舊名，新的接在最後；網址前段加 `?v=` 讓瀏覽器拿新版程式；
    代辦和日曆完全分開；週回顧 Week 1 = 2026-09-04（週五起算）；字體與顏色沿用路線圖（`--serif` 數字、`--sans` 文字），只有淺色；
    改這裡跑 `node tests/e2e/working.mjs`（沙盒下載不到瀏覽器時加 `PW_CHROMIUM=<已安裝的 chromium 路徑>`）；改程式要把各檔 import 與 `working.html` 的 `?v=` 一起加 1。
15. 首頁四宮格照片牆（`photos.html`，單一檔案）：照片只存在瀏覽器 IndexedDB `photo-wall.v2`（store `photos`，每筆 id、blob、added；不准改名），最多 20 張，存之前縮到長邊 1600px；每 30 秒隨機挑 4 張（先挑畫面上沒有的），四格依序換（從下往上掀開＋慢慢收回放大）；只有 4 張以下時改成換位置；
    顏色只用 Ben 指定的四色（#6B5A4D、#D1C0A7、#F9EED8、#AFA391）；沒照片時顯示用這四色畫的範例（不存）；滑過右下角「照片」打開照片庫上傳／刪除（選檔、Ctrl+V、拖進來）；
    計時用 setInterval 和 CSS 轉場，不用 requestAnimationFrame（Notion 內嵌會暫停它）；改這裡跑 `node tests/e2e/photos.mjs`；改程式要把 Notion 嵌入網址的 `?v=` 加 1。
