# Semiconductor FSE English Tutor (晶圓廠設備工程師雙語學習平台)

[![Cleanroom Verified](https://img.shields.io/badge/Cleanroom-Class_100_Ready-emerald.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](#)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](#)
[![Audio Engine](https://img.shields.io/badge/Acoustic_Engine-Semiconductor_Dictionary-amber.svg)](#)

> 專為半導體晶圓廠設備工程師（FSE, Field Service Engineer）、製程工程師（PE）量身打造的高效能沉浸式英語培訓系統。支援晶圓廠專用縮寫語音合成、3天自動動態題庫更迭、離線本地快取、多重 AI 備援與全系統自我修復監控中心。

---

## 🌟 核心強化系統架構 (Reinforced Systems)

### 1. 晶圓廠專用語音與聲學引擎 (Semiconductor Acoustic Engine)
- **48 組半導體專用縮寫詞庫**：自動識別 `EUV`, `CMP`, `LOTO`, `FOUP`, `ASML`, `OHT`, `PM`, `SECS/GEM` 等縮寫，精確展開字母拼讀或標準發音，拒絕含糊連讀。
- **高噪音抗干擾音訊微調**：高頻音域增強，支援 0.7x ~ 1.2x 變速播放、句段重複朗讀與快捷鍵快速觸發（`Space` / `R`）。

### 2. 雙軌多模型 AI 容災架構 (Dual-Track AI & Resilience)
- **多模型即時容災**：以 `gemini-3.8-flash` 作為高智商主模型，自動容災至 `gemini-3.1-flash-lite`；在斷網或極端狀況下無縫切換至本地預設全套離線題庫。
- **3天動態更迭輪替**：演算法自動計算輪次週期，確保每階段教材持續活化更新。

### 3. 本地儲存自我修復與離線 PWA (Storage Self-Healing & Offline Ready)
- **自動損壞探測與修復**：內建 JSON 完整性驗證機制，遭遇異常寫入或損壞鍵值時自動修復，保護使用者的學習筆記、單字收藏與自檢報告。
- **IndexedDB 音訊與離線快取**：即便在 FAB 無訊號無塵室環境，所有核心功能與教材皆可流暢運行。

### 4. 無塵室極簡緊湊視覺 (Cleanroom Ergonomic Design)
- **緊湊排版與零省略號（No Ellipsis Truncation）**：注音、諧音、音標與晶圓圖解完整排版展開，排版緊湊充實，消除被截斷的 `...` 遮蔽。
- **高對比暗色模式**：針對黃光區（Litho/Photo）、蝕刻（Etch）、薄膜（Thin Film）等 FAB 燈光環境提供最佳護眼對比。

### 5. 全系統強化監控中心 (System Health & Control Hub)
- **即時全系統健康度診斷**：綜合評估儲存健全度、AI 伺服器延遲、聲學引擎狀態與離線快取。
- **一鍵式自癒與發音自測**：提供手動自癒修復、發音引擎硬體檢測與教材輪替按鈕。

### 6. AI 口語跟讀與發音評測中心 (AI Speech Shadowing & Fluency Evaluation)
- **即時麥克風跟讀評測**：使用瀏覽器原生語音感測引擎，即時分析工程師發音、連音與咬字。
- **多維度診斷評分**：計算總分（0-100）、半導體關鍵縮寫捕捉率（EUV/FOUP/CMP/LOTO）與發音流利度建議。
- **慢速 0.7x 與示範音對比**：提供標準音與慢速對照，隨時強化晶圓廠交接與通報口說。

### 7. 四大機台原廠實裝專區 (Fab OEM Equipment Simulation Hub)
- **ASML / Lam Research / Applied Materials (AMAT) / KLA** 四大半導體巨頭深度實裝。
- **原廠 TAC 熱線實況對話**：收錄原廠工程專家與廠內 FSE 的真實英語電話通報音訊。
- **常見警報代碼與英文 SOP**：光阻防塵膜破裂、電漿熄火、研磨頭氣壓過載、微粒暴增等故障英文處置。

### 8. 伺服器持久化資料庫與即時雲端同步 (Server Embedded Persistence DB & Real-Time Sync)
- **原子級寫入保護 (Atomic Staging)**：以臨時暫存與原子級置換機制，杜絕斷電或伺服器重啟造成的檔案損壞。
- **雙向智慧無損合併 (Bi-directional Intelligent Merge)**：自動融合書籤、進度、診斷數據與連續天數，支援跨裝置無縫漫遊。
- **後台自動防抖推播**：工程師每次收藏或完成學習後，系統自動在背景靜默向 `/api/sync/push` 推播同步，並定時於 `data/backups/` 建立快照備份。

---

## 🚀 快捷鍵指南 (Keyboard Navigation)

| 按鍵 | 功能說明 |
| :--- | :--- |
| `1` | 切換至「每日句型特訓 (Daily Drill)」 |
| `2` | 切換至「AI 口語跟讀評測 (Speech Shadowing)」 |
| `3` | 切換至「四大機台實裝 (ASML / LAM / AMAT / KLA)」 |
| `4` | 切換至「晶圓知識庫 (單字/長文/SOS/情境)」 |
| `Space` | 朗讀當前句子 / 音訊播放 |
| `←` / `→` | 切換上一句 / 下一句 |
| `Cmd + K` 或 `Ctrl + K` | 開啟全域指令搜尋面板（可直達所有功能） |
| `?` | 開啟快捷鍵導覽與系統強化入口 |
| `Esc` | 快速關閉任何彈出視窗 |

---

## 🛠 本地開發與構建 (Development & Build)

```bash
# 安裝依賴
npm install

# 啟動全端開發伺服器
npm run dev

# 進行生產構建與型別驗證
npm run build
```

---

## 📄 授權規範 (License)

MIT License. Designed with excellence for Semiconductor Engineers in Taiwan and worldwide.
