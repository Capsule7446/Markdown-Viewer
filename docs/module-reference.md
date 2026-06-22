# 模組速查

逐檔速查表。詳細行為見 [build-pipeline.md](build-pipeline.md)（`lib/`）與 [client.md](client.md)（`scripts/`）。

## `src/lib/` — 內容層（Node，build 時）

| 檔案 | 匯出 | 職責 |
|------|------|------|
| `vault.ts` | `getDocs()`、`getNavIndex()`、re-export 型別與 `buildTree` | pipeline 入口：掃描檔案、解析、渲染、快取 |
| `types.ts` | `Doc`、`TocEntry`、`TreeNode`、`NavEntry` | 共享內容模型型別 |
| `markdown.ts` | `renderMarkdown()`、`WikiResolver` | marked 設定、mermaid、wikilink 前處理、連結改寫、TOC 提取 |
| `text.ts` | `parseWikilink()`、`parentDir()` | 純字串工具（marked + vault 共用） |
| `tree.ts` | `buildTree()` | 扁平 doc list → 巢狀目錄樹（資料夾優先排序） |
| `search.ts` | `buildSearchIndex()` | HTML→純文字、建 MiniSearch 索引並序列化 |
| `search-config.ts` | `tokenize()`、`processTerm()`、`SEARCH_OPTIONS`、`searchParams()` | **純**模組，build / 客戶端兩端共用的分詞器與查詢設定 |

## `src/scripts/` — 行為層（瀏覽器，執行期）

| 檔案 | 匯出 | 職責 |
|------|------|------|
| `main.ts` | — | 入口，依序 init 各模組 |
| `constants.ts` | `STORAGE`、`BREAKPOINT` | localStorage 鍵與斷點（單一事實來源） |
| `storage.ts` | `getString/setString/getBool/setBool/getJSON/setJSON` | 不會 throw 的 localStorage 封裝 |
| `dom.ts` | `escapeHtml()`、`isTyping()` | 瀏覽器端 DOM 小工具 |
| `theme.ts` | `initTheme()` | 亮 / 暗切換 |
| `sidebar.ts` | `initSidebar()` | 目錄樹折疊持久化 + 展開 / 收合全部 + 即時 filter |
| `toc.ts` | `initToc()` | 大綱捲動高亮（IntersectionObserver） |
| `palette.ts` | `initPalette()` | 命令面板：即時標題比對 + lazy 全文索引 |
| `panels.ts` | `initPanels()` | 側欄折疊 + 兩段響應式 |
| `lightbox.ts` | `initLightbox()` | mermaid / 圖片 zoom、pan、放大 |
| `snippet.ts` | `buildSnippet()` | 搜尋結果摘要 + `<mark>` 高亮 |

## `src/pages/` — 路由

| 檔案 | 路由 | 說明 |
|------|------|------|
| `index.astro` | `/` | 總覽首頁；`sections` 陣列 + 各 section 文件數 |
| `[...slug].astro` | `/<slug>/` | 每篇文檔一頁，`getStaticPaths()` 展開 |
| `search-index.json.ts` | `/search-index.json` | `prerender=true`，輸出序列化索引 |

## `src/layouts/` 與 `src/components/`

| 檔案 | 角色 | 暴露的 DOM 契約 |
|------|------|-----------------|
| `layouts/Layout.astro` | 組合 header / sidebar / toc / palette / lightbox + 注入腳本 | `#palette-trigger`、`#theme-toggle`、`.layout[data-has-toc]`、`#nav-show`、`#toc-show`、`#scrim` |
| `components/Sidebar.astro` | 左欄：動作鈕 + 篩選框 + 目錄樹 + 提示 | `#tree`、`#search`、`#tree-toggle`、`#nav-collapse` |
| `components/TreeItem.astro` | 遞迴目錄樹節點（祖先自動展開、後代可搜文字） | `.tree-item[data-search]`、`details[data-path][data-ancestor]` |
| `components/Toc.astro` | 右欄大綱 | `.toc a[data-id]`、`#toc-collapse` |
| `components/CommandPalette.astro` | 搜尋面板 + `doc-index` JSON 資料島 | `#palette`、`#palette-input`、`#palette-list`、`#doc-index` |
| `components/Lightbox.astro` | 放大遮罩（工具列由 JS 填充） | `#lightbox`、`#lightbox-inner`、`#lightbox-bar` |
| `components/ThemeBoot.astro` | pre-paint 主題（`is:inline` + `define:vars`） | 設 `<html data-theme>` |
| `components/PanelBoot.astro` | pre-paint 折疊（`is:inline` + `define:vars`） | 設 `.layout` 折疊 class |

## `src/styles/`

| 檔案 | 內容 |
|------|------|
| `tokens.css` | 設計令牌：雙主題 CSS 變數（**唯一可放顏色的地方**），含 `--hl-*` 高亮 token 色 |
| `app.css` | 基礎 / 佈局 / 組件 / 排版；mermaid 亮色覆寫；`@media (max-width: 820px)` 唯一手動同步的斷點字面值 |

## 根目錄

| 檔案 | 內容 |
|------|------|
| `astro.config.mjs` | 靜態輸出設定（`build.format: 'directory'`、HMR） |
| `scripts/check-vault.mjs` | build 前解析並校驗 vault 目錄（`--vault=` / `VAULT_ROOT`） |
| `package.json` | 依賴、scripts、`engines.node >= 24` |
| `CLAUDE.md` | 給 Claude Code 的專案指引 |
| `README.md` | 專案總覽（繁中），含設計決策表 |
