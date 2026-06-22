# 行為層（客戶端腳本）

`src/scripts/` 的所有模組都在 **瀏覽器**執行，純 vanilla TS、零框架、零 Node 假設。`Layout.astro` 末尾 `import '../scripts/main'`，Astro 以 `type="module"` 延遲載入，所以執行時 DOM 已就緒。

## 入口：`main.ts`

依序呼叫各模組的 `initXxx()`：

```ts
initTheme();    initSidebar();  initToc();
initPalette();  initPanels();   initLightbox();
```

每個模組都**防禦性**地先找 DOM，找不到就早退（`if (!el) return`），所以缺某塊標記不會整頁壞掉。

## 模組一覽

| 模組 | 職責 | 主要選擇器 |
|------|------|-----------|
| `theme.ts` | 亮 / 暗切換 | `#theme-toggle`、`<html data-theme>` |
| `sidebar.ts` | 目錄樹折疊持久化 + 一鍵展開 / 收合 + 即時 filter | `.tree details`、`#tree-toggle`、`#search` |
| `toc.ts` | 大綱捲動高亮（IntersectionObserver） | `.toc a[data-id]` |
| `palette.ts` | 命令面板（⌘K / Ctrl+Space / `/`） | `#palette`、`#palette-input`、`#palette-list` |
| `panels.ts` | 側欄折疊 + 兩段響應式自動收合 | `.layout`、`#nav-show`、`#toc-show`、`#scrim` |
| `lightbox.ts` | mermaid / 圖片 zoom、pan、放大 | `.mermaid`、`#lightbox*` |

### 共用工具

- `constants.ts` — `STORAGE` 鍵與 `BREAKPOINT`。**單一事實來源**，pre-paint boot 腳本透過 `define:vars` 取用。
- `storage.ts` — 不會 throw 的 `localStorage` 封裝（`getString/setString/getBool/setBool/getJSON/setJSON`）。私密模式 / 停用儲存時靜默退回 fallback。
- `dom.ts` — `escapeHtml()`、`isTyping()`（焦點是否在輸入框）。
- `snippet.ts` — 搜尋結果摘要：第一個命中前後取片段（前 40 / 後 90 字），命中詞包 `<mark>`。

## 主題（`theme.ts` + `ThemeBoot.astro`）

- **初值在 paint 前由 `ThemeBoot.astro`（`is:inline`）設定**：讀 `localStorage[theme]`，無值則跟系統 `prefers-color-scheme`，寫進 `<html data-theme>`。避免閃爍。
- `theme.ts` 只管點擊切換與按鈕字形（☀ / ☾）。

## 響應式折疊（`panels.ts` + `PanelBoot.astro`）

兩段斷點（`constants.ts` 的 `BREAKPOINT`）：

- `toc: (max-width: 1200px)` — 視窗變窄時 **TOC 先收**。
- `nav: (max-width: 820px)` — 再窄 **nav 也收**；此時面板浮在內容上，`#scrim` 當背景、點擊關閉。

規則：**窄螢幕強制收合；否則用 `localStorage` 存的手動偏好**。手動 toggle 會持久化並贏到下次斷點跨越。初始 class 由 `PanelBoot.astro`（`is:inline`）在 paint 前鏡像同一套規則設好；`panels.ts` 再接管 button / fab / media query。窄螢幕下點浮動面板裡的連結會自動關閉該面板（且不污染寬螢幕偏好）。

## 命令面板（`palette.ts`）

開啟：`⌘K` / `Ctrl+K` / `Ctrl+Space`，或非輸入狀態按 `/`；亦可點 header 的 `#palette-trigger`。導航：`↑↓` 移動、`↵` 開啟、`Esc` 關閉。

兩段式搜尋策略：

1. **即時**：標題 / 路徑子串比對（`titleFilter`），用內嵌的 `#doc-index` JSON 資料島，零延遲。
2. **精修**：首次開面板時 lazy `fetch('/search-index.json')` 載入 MiniSearch 全文索引（`ensureIndex`）。載入後若使用者還在同一 query，就用 `fullTextSearch` 重繪。索引載入失敗則永久退回標題 / 路徑比對。

查詢參數來自共享的 `searchParams()`（見 [build-pipeline.md](build-pipeline.md#全文搜尋)）。

## Lightbox / Mermaid 縮放（`lightbox.ts`）

- 每個 `.mermaid` figure 右下角加浮動工具列（3×3 十字：縮放、四向平移、重設，中央按鈕彈出 lightbox）。zoom / pan 直接 transform 內聯 SVG，figure 裁切溢出。
- Lightbox（`#lightbox`）：同一套控制 + 關閉；額外支援滾輪縮放、拖曳平移（pointer events）、`Esc` / 點背景關閉。
- 沒有 click-to-zoom，全是顯式按鈕。常數：`ZOOM_STEP 0.25`、範圍 `0.25–6`、`PAN_STEP 60`。

---

## DOM 契約

`src/lib/` 渲染標記、`src/scripts/` 靠下列選擇器綁定。**改 Astro 元件標記時必須保持這些穩定**，否則對應腳本會靜默失聯。

### ID

| ID | 元件 | 使用者 |
|----|------|--------|
| `palette` / `palette-input` / `palette-list` | `CommandPalette.astro` | `palette.ts` |
| `doc-index` | `CommandPalette.astro`（JSON 島） | `palette.ts` |
| `palette-trigger` | `Layout.astro`（header） | `palette.ts` |
| `theme-toggle` | `Layout.astro` | `theme.ts` |
| `tree` / `search` / `tree-toggle` | `Sidebar.astro` | `sidebar.ts` |
| `nav-collapse` | `Sidebar.astro` | `panels.ts` |
| `toc-collapse` | `Toc.astro` | `panels.ts` |
| `nav-show` / `toc-show` / `scrim` | `Layout.astro`（浮動鈕 / 背景） | `panels.ts` |
| `lightbox` / `lightbox-inner` / `lightbox-bar` | `Lightbox.astro` | `lightbox.ts` |

### Class

| Class | 意義 | 使用者 |
|-------|------|--------|
| `.layout`（`data-has-toc`） | 版面容器 | `panels.ts`、`PanelBoot` |
| `.nav-collapsed` / `.toc-collapsed` | 折疊狀態 | `panels.ts`、`PanelBoot` |
| `.tree details`（`data-path`、`data-ancestor`） | 目錄樹資料夾 | `sidebar.ts` |
| `li.tree-item`（`data-search`） | 樹節點，含後代可搜文字 | `sidebar.ts` |
| `.toc a`（`data-id`） | 大綱連結 → 標題 id | `toc.ts` |
| `.mermaid` / `.content` | 圖表 figure / 內文容器 | `lightbox.ts` |
| `.wikilink` / `.wikilink--broken` / `.wikilink-code` | wikilink 樣式 | `app.css` |

### `data-*` 與 `<html data-theme>`

- `<html data-theme="light|dark">` — 主題開關，CSS 變數據此切換。
- `.layout[data-has-toc]` — 該頁是否有 TOC（影響 toc 折疊邏輯與 fab）。
- `.tree details[data-path]` — 資料夾路徑，折疊狀態持久化的 key。
- `.tree details[data-ancestor="true"]` — 是否為目前文件的祖先（自動展開、且不被持久化邏輯覆寫）。
- `li.tree-item[data-search]` — 該節點 + 全後代的標題 / 路徑（小寫），即時 filter 比對用。
- `.toc a[data-id]` — 對應的標題 element id。

### localStorage 鍵（`constants.ts` 的 `STORAGE`）

`theme`、`treeOpen`（資料夾開合的 `Record<path, bool>`）、`navCollapsed`、`tocCollapsed`。
