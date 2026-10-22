# DEV_RULES.md — 人生路線圖專屬規則

1. 開工先 `git fetch`，以 `origin/main` 為唯一正本（system-template RULES 第 1 節第 2 條）。
2. 測試：`npm run check`（型別、Biome、knip、Vitest）、`python3 build.py --check`、`python3 tests/dupcheck.py`、
   `node tests/e2e/roadmap.mjs`（只測電腦畫面，Ben 2026-10-22 指定；不做手機、深色截圖）。
3. 儲存名稱不准改：db collection `goals`、`cards`、`tracks`、`segments`，文件 `meta/layout`。
4. 個人資料不進 repo（repo 公開）：Ben 的目標、卡片、時間段只在 artifact 資料庫；測試用範例資料。
5. 操作要即時：按鈕和對話框不等存檔（`data/actions.ts` 一律背景存，失敗用 toast 告知並退回）；
   同一份文件一次只送一筆、新值蓋舊值（`data/writer.ts`）；畫面只重畫資料有變的那一塊（`render/keep.ts`）。
   新功能照這三條寫，不在按鈕裡 `await` 存檔。
6. 發布：artifact 宣告 `{db:{}, user:{}}`；之後重新發布省略 `capabilities`（保留原設定）。
