# 專案開發待辦事項 (TODO List)

## 核心功能優化
- [ ] **企業一鍵建立自動化 (Super Admin)**
    - [ ] 註冊新企業時，自動執行資料庫初始化 (SQL Schema Init)。
    - [ ] 自動生成該企業的初始管理員帳號。
    - [ ] (進階) 對接 Turso API，實現自動申請資料庫網址與 Token。

- [ ] **手機生物辨識登入 (WebAuthn)**
    - [ ] 後端整合 `@simplewebauthn/server` 處理公鑰存儲與驗證。
    - [ ] 前端實作 FaceID / 指紋辨識介面與綁定流程。
    - [ ] 支援多設備憑證管理（使用者可移除舊手機的綁定）。

## 系統功能擴充
- [ ] **勞健保保費級距表系統**
    - [ ] 建立級距表資料庫模型。
    - [ ] 開發級距表維護界面。
    - [ ] 整合進薪資計算引擎 (Payroll Engine)。

## UI/UX 優化
- [ ] **通知中心增強**
    - [ ] 增加更多業務場景的自動通知。
- [ ] **跨瀏覽器相容性測試**
    - [ ] 驗證 Chrome, Safari, Edge 在「科技感儀表板」上的渲染一致性。

## 股市即時追蹤系統 (規劃中)
*詳細設計請參見 [實施與功能規劃方案](file:///C:/Users/spfst/.gemini/antigravity/brain/e627e659-8721-471c-bdc8-f2d1610d76de/artifacts/stock_dashboard_plan.md)*
- [ ] **核心即時追蹤看板 (PoC 階段)**
    - [ ] 設計深色磨砂玻璃感 (Glassmorphism) 看盤面板與極致動態特效。
    - [ ] 整合 TradingView 互動式 K 線與多週期指標。
    - [ ] 串接免鑰匙即時 API，實現自訂個股追蹤大盤清單。
- [ ] **智慧警示觸發與推送系統**
    - [ ] 實作複合指標警示條件（股價變動率、均線交叉、RSI超買超賣）。
    - [ ] 開發 Node.js 背景監控與 Line Notify / Telegram 機器人推播通知。
- [ ] **模擬帳戶投資組合與 AI 輿情分析**
    - [ ] 建立虛擬資產帳戶並繪製損益 (PnL) 曲線圖。
    - [ ] 對接 Gemini 進行財報法說會亮點提煉與新聞多空溫度計分析。

---
## 家庭記帳開發 (Family Expense Tracker)
- **Vercel 帳號**: huichinyu1@gmail.com
- **GitHub 帳號**: huichinyu1@gmail.com

---
*最後更新時間：2026-05-20*
