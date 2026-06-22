# Markdown Viewer — 文檔瀏覽站

把 vault 目錄裡的 Markdown（`rules/` `agents/` `skills/` `docs/` + 根目錄 `CLAUDE.md`）渲染成一個**終端風格、可搜尋、雙主題**的靜態文檔瀏覽站。給團隊內部參考用。

沒有遠端拉取——你在啟動指令上指定一個**本地目錄**,網站就地打包渲染它。路徑為**必填**。

---

## 快速開始

```bash
cd site
npm install
npm run dev --vault=/path/to/vault      # 開發,HMR,http://localhost:4321
npm run build --vault=/path/to/vault    # 產出靜態站到 site/dist/
npm run preview --vault=/path/to/vault  # 預覽 build 結果
```

> 改 vault 目錄裡任何 `.md`,dev 會自動熱更新——內容的 source of truth 永遠是那個目錄,`site/` 不複製、也不寫回檔案。

vault 目錄為**必填**,在啟動指令上用 `--vault=<path>` 指定(也可改用環境變數 `VAULT_ROOT`):

```bash
npm run dev --vault=/path/to/vault
# 或
VAULT_ROOT=/path/to/vault npm run dev
```

> 必須用 `=` 帶路徑(`--vault /path` 會被 npm 吃掉);旗標叫 `--vault` 而非 `--local` 是因為 `--local` 被 npm 佔用。沒給路徑、或路徑不存在,`check-vault.mjs` 會在 `dev` / `build` / `preview` 前直接報錯退出。

---

## 核心設計決策

| 決策 | 原因 |
|------|------|
| **構建時掃描上層目錄**(Node `fs`,非 Vite glob) | Astro 根在 `site/`,要讀 `../` 的 Markdown;Vite glob 跨目錄受限,用 `fs` 最穩。見 `lib/vault.ts` 的 `ROOT`。 |
| **`marked` 手動渲染**(非 Astro 內建 md 管線) | 內容在 `src/` 外,且需要自訂 mermaid / 連結改寫 / TOC 提取。 |
| **mermaid 構建時出 SVG**(`beautiful-mermaid`) | 零客戶端 JS、零執行期開銷;SVG 用內聯 CSS 變數,亮色主題可 `!important` 覆寫重新著色。 |
| **主題用 `<html data-theme>` + CSS 變數** | 切換零重繪成本;boot 腳本在 paint 前設好避免閃爍。 |
| **折疊狀態 JS 驅動 + 兩段斷點** | 純 CSS media query 無法同時處理「手動覆寫 + 持久化 + 浮動展開鈕」。 |

---

## 目錄結構

```
site/
├── astro.config.mjs        # 靜態輸出設定
├── src/
│   ├── pages/
│   │   ├── index.astro          # 總覽首頁(各層卡片 + 文件數)
│   │   ├── [...slug].astro      # 每篇文檔的動態路由(getStaticPaths)
│   │   └── search-index.json.ts # 構建時產出 /search-index.json(全文索引)
│   ├── layouts/
│   │   └── Layout.astro         # 組合所有組件 + 樣式 + 腳本入口(~50 行)
│   ├── components/
│   │   ├── Sidebar.astro        # 左欄:品牌列 + 動作鈕 + 搜尋 + 目錄樹 + 提示
│   │   ├── TreeItem.astro       # 遞迴目錄樹節點(祖先自動展開邏輯在這)
│   │   ├── Toc.astro            # 右欄大綱
│   │   ├── CommandPalette.astro # 搜尋面板 + doc-index 資料島
│   │   ├── Lightbox.astro       # 圖片/圖表放大遮罩
│   │   ├── ThemeBoot.astro      # <head> 內 pre-paint 主題腳本(is:inline)
│   │   └── PanelBoot.astro      # body 內 pre-paint 折疊腳本(is:inline)
│   ├── lib/                     # 構建時(Node)內容層
│   │   ├── types.ts             # Doc / TocEntry / TreeNode / NavEntry
│   │   ├── markdown.ts          # marked 設定:高亮 + mermaid + 連結改寫 + TOC
│   │   ├── tree.ts              # 扁平 doc list → 巢狀目錄樹
│   │   ├── vault.ts             # 掃描檔案 + getDocs() / getNavIndex();re-export 型別
│   │   ├── search.ts            # 構建 MiniSearch 索引(正文轉純文字)並序列化
│   │   └── search-config.ts     # 共享 MiniSearch 設定 + CJK 分詞器(構建/查詢兩端共用)
│   ├── scripts/                 # 客戶端(瀏覽器)行為,每個關注點一個模組
│   │   ├── main.ts              # 入口,依序 init 各模組(被 Layout 的 <script> import)
│   │   ├── constants.ts         # STORAGE key / BREAKPOINT(與 boot 腳本同步)
│   │   ├── storage.ts           # 不會 throw 的 localStorage 封裝
│   │   ├── theme.ts             # 亮/暗切換
│   │   ├── sidebar.ts           # 目錄樹折疊持久化 + 一鍵展開/收合 + 即時 filter
│   │   ├── toc.ts               # 大綱捲動高亮(IntersectionObserver)
│   │   ├── palette.ts           # 命令面板(⌘K / Ctrl+Space / /)
│   │   ├── panels.ts            # 側欄折疊 + 響應式自動收合
│   │   └── lightbox.ts          # 圖片/圖表放大
│   └── styles/
│       ├── tokens.css           # 設計令牌(雙主題 CSS 變數,設計系統)
│       └── app.css              # 基礎/佈局/組件/排版,按區塊組織
```

---

## 資料流

```
vault 目錄 *.md  (--vault=<path> / VAULT_ROOT)
   │  (構建時, Node)
   ▼
lib/vault.ts  getDocs()
   ├─ collectFiles()         掃描 rules/agents/skills/docs + CLAUDE.md
   ├─ matter()               解析 frontmatter
   ├─ markdown.renderMarkdown()  marked→HTML, 改寫 .md 連結, 提取 TOC, 渲染 mermaid SVG
   └─ deriveTitle()          frontmatter.title → 首個 # → 檔名
        │
        ├──► pages/[...slug].astro   每篇一頁, 傳 doc.html / doc.toc 給 Layout
        ├──► Layout: buildTree()     建左欄目錄樹
        └──► Layout: getNavIndex()   命令面板的扁平索引(嵌成 JSON 資料島)
                │  (執行期, 瀏覽器)
                ▼
        scripts/main.ts  綁定互動(主題/折疊/搜尋/大綱/lightbox)
```

關鍵:`lib/` 在**構建時**跑(Node API),`scripts/` 在**瀏覽器**跑。兩者唯一的資料橋是 `<script type="application/json" id="doc-index">`(命令面板用)與 DOM 上的 `data-*` 屬性。

---

## 常見修改怎麼做

- **改配色 / 主題** → 只動 `styles/tokens.css` 的兩個 `:root` 區塊。新增語意色記得兩個主題都加。
- **改版面寬度 / 斷點** → 兩側欄固定寬與正文 grid 在 `styles/app.css` 的 `.layout`;斷點數值在 `scripts/constants.ts` 的 `BREAKPOINT`(boot 腳本走 `define:vars` 自動同步);CSS `@media (max-width: 820px)` 是唯一仍需手動同步的字面值(media query 不能讀變數)。
- **加一種 Markdown 渲染**(例如新 code fence 類型)→ `lib/markdown.ts` 的 `marked.use({ renderer })`。
- **調 mermaid 配色** → `lib/markdown.ts` 的 `MERMAID_OPTS`(暗色基準);亮色覆寫在 `styles/app.css` 的 `:root[data-theme="light"] .content .mermaid svg`。
- **加客戶端互動** → 在 `scripts/` 新增 `initXxx()` 模組,於 `scripts/main.ts` 呼叫。需要持久化就用 `scripts/storage.ts`,key 註冊到 `constants.ts`。
- **調全文搜尋**(分詞 / 排序 / 索引欄位)→ `lib/search-config.ts`。**改分詞器要重新 build**(索引與查詢必須同一套);CJK 用按字 + bigram,Latin 用前綴 + 輕模糊。`palette.ts` 首次開面板時 lazy fetch `/search-index.json`,未載入前回退標題/路徑子串比對。
- **掃描更多目錄** → `lib/vault.ts` 的 `SECTIONS` / `ROOT_FILES`。
- **改首頁卡片** → `pages/index.astro` 的 `sections` 陣列。

---

## 慣例

- **內容層(`lib/`)零客戶端假設**,純 Node;**行為層(`scripts/`)零 Node 假設**,純瀏覽器。
- 樣式全走 CSS 變數,**禁止**在組件/頁面硬編顏色(否則亮色主題會破)。
- 所有互動靠 DOM 的 `id` / `class` / `data-*` 綁定;改標記時保持這些選擇器穩定,否則 `scripts/` 會失聯。
- pre-paint 的 `ThemeBoot` / `PanelBoot` 必須 `is:inline`,但用 Astro `define:vars` 從 `scripts/constants.ts` 注入鍵名/斷點,所以仍是單一來源;不要在這兩個 inline 腳本裡重新硬編字面值。

---

## 相依套件

| 套件 | 用途 |
|------|------|
| `astro` | 靜態站框架 |
| `marked` + `marked-highlight` | Markdown → HTML |
| `highlight.js` | 程式碼語法 token(配色由 `--hl-*` 變數驅動,非內建主題) |
| `beautiful-mermaid` | 構建時 mermaid → SVG |
| `minisearch` | 全文搜尋(構建時建索引,客戶端查詢) |
| `gray-matter` | frontmatter 解析 |
