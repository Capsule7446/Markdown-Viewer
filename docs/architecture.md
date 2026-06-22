# 架構

## 一句話總結

外部 vault 的 `.md` → **build 時**用 Node `fs` 掃描、`marked` 渲染成 HTML、`minisearch` 建索引 → Astro 產出純靜態頁 → **瀏覽器端**只跑一小撮 vanilla TS 綁互動。

## Build-time / runtime 分界（最重要的概念）

整個專案沿著一條線切成兩半，**兩邊不可互相 import**：

| | 內容層 | 行為層 |
|---|--------|--------|
| 目錄 | `src/lib/` | `src/scripts/` |
| 執行環境 | Node（build 時） | 瀏覽器（執行期） |
| 可用 API | `node:fs`、`node:path`、可讀專案外檔案 | DOM、`localStorage`、`fetch` |
| 禁止 | 任何 DOM / `window` 假設 | 任何 Node API 假設 |

兩層之間**唯一的資料橋**是：

1. `<script type="application/json" id="doc-index">`——`CommandPalette.astro` 把 `getNavIndex()` 序列化進去，`scripts/palette.ts` 讀出來。
2. DOM 上的 `id` / `class` / `data-*` 屬性——Astro 元件渲染標記，`scripts/` 靠選擇器綁定。見 [client.md](client.md#dom-契約)。
3. `/search-index.json`——build 時 prerender 的全文索引，`palette.ts` 首次開面板時 lazy fetch。

> ⚠️ 不要從 `src/scripts/` import `src/lib/`，反之亦然。共用的純函式（如分詞器）放在兩邊都能安全 import 的模組：`src/lib/search-config.ts`（純，無 Node/DOM 依賴）、`src/scripts/constants.ts`（給 boot 腳本用）。

## 資料流

```
本地 vault 目錄（--vault=<path> / VAULT_ROOT）
   │  scripts/check-vault.mjs 校驗（predev / prebuild / prepreview）
   ▼
<vault>/  *.md
   │  （build 時，Node）
   ▼
lib/vault.ts  getDocs()
   ├─ collectFiles()          掃描 SECTIONS + ROOT_FILES
   ├─ gray-matter             解析 frontmatter
   ├─ buildWikiResolver()     建 [[wikilink]] 解析器（全 slug 集合）
   ├─ markdown.renderMarkdown()  marked→HTML、改寫 .md 連結、提取 TOC、mermaid→SVG
   ├─ deriveTitle()           frontmatter.title → 首個 # → 檔名
   └─ deriveExcerpt()         首段純文字（首頁卡片用）
        │
        ├──► pages/[...slug].astro     每篇一頁（getStaticPaths）
        ├──► pages/index.astro         首頁卡片（各 section 文件數）
        ├──► pages/search-index.json.ts  lib/search.ts 建 MiniSearch 索引 → /search-index.json
        └──► layouts/Layout.astro
                ├─ buildTree()          扁平 doc list → 巢狀目錄樹（左欄）
                └─ getNavIndex()        命令面板的扁平索引（嵌成 JSON 資料島）
                     │  （執行期，瀏覽器）
                     ▼
              scripts/main.ts  依序 init：theme / sidebar / toc / palette / panels / lightbox
```

## 頁面與路由

| 路由 | 來源 | 說明 |
|------|------|------|
| `/` | `pages/index.astro` | 總覽首頁，各 section 卡片 + 文件數 |
| `/<slug>/` | `pages/[...slug].astro` | 每篇文檔一頁，`getStaticPaths()` 從 `getDocs()` 展開 |
| `/search-index.json` | `pages/search-index.json.ts` | `prerender = true`，build 時序列化 MiniSearch 索引 |

所有頁面共用 `layouts/Layout.astro`，它組合 header、`Sidebar`、`Toc`、`CommandPalette`、`Lightbox`，並注入兩段 pre-paint inline 腳本與 `scripts/main`。

## 為什麼這樣設計

| 決策 | 原因 |
|------|------|
| **Node `fs` 掃描外部目錄**（非 Vite glob、非 `src/content`） | Astro 根在本專案，內容在啟動時指定的外部 vault 目錄。`fs` 跨目錄最穩。 |
| **`marked` 手動渲染** | 內容在 `src/` 外，且需自訂 mermaid / wikilink / 連結改寫 / TOC。 |
| **mermaid build 時出 SVG**（`beautiful-mermaid`） | 零客戶端 JS、零執行期開銷；SVG 內聯暗色 CSS 變數，亮色主題用 CSS `!important` 重新著色。 |
| **主題用 `<html data-theme>` + CSS 變數** | 切換零重繪；pre-paint boot 腳本避免閃爍。 |
| **折疊狀態 JS 驅動 + 兩段斷點** | 純 CSS media query 無法同時處理「手動覆寫 + 持久化 + 浮動展開鈕」。 |
| **搜尋索引 build 時建、客戶端查** | 終端零後端；分詞器兩端共用一套，避免索引與查詢不一致。 |

## 慣例

- **內容層零客戶端假設、行為層零 Node 假設。** 見上方分界表。
- **禁止硬編顏色**（組件 / 頁面），全走 `tokens.css` 的 CSS 變數，否則亮色主題會破。
- 互動靠 DOM 選擇器綁定；**改標記時保持 `id` / `class` / `data-*` 穩定**，否則 `scripts/` 會失聯。見 [client.md](client.md#dom-契約)。
- pre-paint 的 `ThemeBoot` / `PanelBoot` 必須 `is:inline`，但用 Astro `define:vars` 從 `constants.ts` 注入鍵名 / 斷點——**不要在 inline 腳本裡重新硬編字面值**。
