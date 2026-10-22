# ARCHITECTURE.md — 人生路線圖（第三版）

一區：`src/roadmap/`，入口 `index.ts`（選資料庫、掛上畫面）。
- `core/` 純計算，不碰畫面和時鐘（今天由外面傳入）。
- `data/` 存取介面：`store`（固定介面＋記憶體版）、`db-store`（網頁資料庫，含「先顯示、背景存」的覆蓋層）、
  `writer`（每份文件一次一筆、新值優先）、`actions`（所有改動）。
- `render/` 畫面：外框建一次，`keep` 依資料簽名只換變動的那塊。

照抄的做法：vis-timeline 8.5.4（拖曳門檻、滾輪換算）、Hammer.js 2.0.8（拖曳門檻 9–10px）、
Firestore 的 latency compensation（自己的寫入立即出現在 snapshot，不等伺服器）。

目前分數（1–5）：架構 4、資料處理 4、錯誤處理 4（壞資料列名、存檔失敗 toast 並退回）、
效能 4（打勾到畫面更新約 60ms，不受網路延遲影響）、測試 4（單元＋突變＋整頁）、可維護性 4。
