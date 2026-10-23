# CLAUDE.md — 人生路線圖

Ben 的 人生路線圖。**公開** repo：`BenHuang125/notion-widgets`（Ben 2026-10-22 指定放這裡；裡面也有 Notion 首頁的名言、月曆小工具）。網頁：https://benhuang125.github.io/notion-widgets/dist/index.html （嵌在 Ben 的 Notion HOME；舊 artifact https://claude.ai/artifact/LSk6zZYxGN4FtnCFn58kGr 已不用）。回報用繁體中文。

**通用做法不寫在這裡。** 先連結 `BenHuang125/system-template`，讀 `RULES.md` 照做。本檔只放這個系統專屬的東西。

## 這個系統專屬
- 開 PR：`gh api repos/BenHuang125/notion-widgets/pulls -f base=main -f head=<分支> -f title=… -f body=…`
- 回覆 Issue：`gh api repos/BenHuang125/notion-widgets/issues/<n>/comments -f body=…`
- 寫法：第三版（system-template 的 `ARCHITECTURE.md`）。本系統照抄的範本 repo、目標資料夾、搬遷進度：`ARCHITECTURE.md`。
- 模組目錄：`src/roadmap/`
  - `core/`：純計算（`dates` 日期與年紀、`goals` 進度與配色、`board` 卡片分欄與上下層順序、`marks` 小旗避開蛋糕、`parse` 讀檢資料）
  - `data/`：`store` 存取介面與備份格式、`local` 瀏覽器儲存、`seed` 第一次從嵌入網址帶入資料、`actions` 每個可做的改動
  - `render/`：`app` 組頁、`axis` 時間軸（蛋糕、小旗、蝸牛）、`keep` 只重畫變動處、`goals-row` 目標圈、`timeline` 時間軸與卡片欄、`lanes` 上下各層、`cards`、`forms`、`dialog`、`pan` 拖曳與滾輪、`reorder` 拖曳換層
  - `style.css`：整頁樣式（build.py 內嵌進主頁）
- 首頁語錄框：`quotes.html` 與 `quotes/`（`data` 書架上收藏的語錄與儲存；`core` 時間、世界進度、需求與活動；`chameleon` 變色龍與魔法光點；`scene` 畫框、天空、房子樹池塘、發光書架、主迴圈；`shelf` 點書架打開的語錄收藏），見 `DEV_RULES.md` 第 12 條。
- Notion「Working」頁日曆：`working.html` 與 `working/`（`core` 日期、週次、專案配色、存取；`dom` 共用狀態；`calendar` 月曆、滑過小框、拖移、新增對話框；`side` 當天代辦、週回顧；`main` 啟動），見 `DEV_RULES.md` 第 14 條。
- 測試清單、儲存名稱、模組規則：見 `DEV_RULES.md`。
- 絕對不能進 repo 的個人資料：Ben 的目標、卡片、時間段（只存在他瀏覽器裡，Notion 內嵌的那份）。repo 是公開的，測試只用範例資料。
- 儲存名稱（不准改）：localStorage `life-roadmap.v1`，備份格式 version 1（goals、cards、tracks、segments、layout）。
- 範本參考：拖曳／滾輪照 vis-timeline 8.5.4 與 Hammer.js 的做法（門檻 8px、行模式 ×40）；換層自寫（不引入 SortableJS）；月份用兩個下拉選單（Safari／Firefox 桌面版不支援 month 輸入框）。
