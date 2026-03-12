# YouTube Music Bot - React Frontend

這是 YouTube Music Bot 的 React + TypeScript 前端，使用 COSS UI 風格設計。

## 技術棧

- **React 19** - UI 框架
- **TypeScript** - 類型安全
- **Vite** - 構建工具
- **Tailwind CSS v4** - 樣式框架
- **Zustand** - 狀態管理
- **Base UI** - 無樣式組件基礎

## 開發

### 安裝依賴

```bash
npm install
```

### 開發模式

```bash
npm run dev
```

前端會在 http://localhost:5173 啟動，並自動代理 API 請求到後端 http://localhost:3000。

**注意**：開發時需要同時啟動後端服務器：

```bash
# 在另一個終端
cd ..
bun run dev
```

### 構建

```bash
npm run build
```

構建產物會輸出到 `dist/` 目錄。

## 生產部署

在根目錄執行：

```bash
# 構建前端和後端
npm run build:all

# 啟動生產服務器
npm run start
```

生產模式下，後端會直接提供前端靜態文件，訪問 http://localhost:3000 即可。

## 專案結構

```
src/
├── components/
│   ├── ui/              # 基礎 UI 組件（Button, Input, Slider 等）
│   ├── layout/          # 布局組件（Header, MainLayout）
│   ├── search/          # 搜尋相關組件
│   ├── player/          # 播放器組件
│   ├── queue/           # 播放佇列組件
│   └── lyrics/          # 歌詞顯示組件
├── hooks/               # 自定義 Hooks（useWebSocket, useLyricSync）
├── stores/              # Zustand 狀態管理
├── services/            # API 服務層
├── types/               # TypeScript 類型定義
├── utils/               # 工具函數
└── lib/                 # 庫函數（cn 等）
```

## 功能特色

- ✅ 實時 WebSocket 連接狀態顯示
- ✅ 音樂搜尋與播放佇列管理
- ✅ 播放器控制（播放/暫停/跳過）
- ✅ 進度條拖曳和音量調整
- ✅ 同步歌詞顯示（自動滾動）
- ✅ 響應式設計（支援桌面和移動端）
- ✅ 深色模式支援
- ✅ Toast 通知提示

## 設計系統

本專案遵循 COSS UI 設計規範：

- 使用 Tailwind CSS 進行樣式管理
- 組件採用 copy-paste 模式，完全可定制
- 保持與 COSS UI 一致的色系和間距
- 遵循無障礙（a11y）最佳實踐

## 瀏覽器支援

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT
