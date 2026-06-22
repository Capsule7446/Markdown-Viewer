# 內容層（build-time pipeline）

`src/lib/` 的所有模組都在 **Node、build 時**執行。它們把 vault 的 Markdown 轉成 Astro 頁面需要的資料結構。

## 入口：`getDocs()`（`lib/vault.ts`）

整條 pipeline 的單一入口，回傳所有 `Doc`，並在 build 生命週期內快取（`cache`）。

```
getDocs()
  ├─ collectFiles()                  掃描檔案路徑
  ├─ buildWikiResolver(slugs)        用全部 slug 建 [[wikilink]] 解析器
  └─ 每個檔案 readDoc():
       ├─ gray-matter 解析 frontmatter
       ├─ renderMarkdown()           → { html, toc }
       ├─ deriveTitle()              標題
       └─ deriveExcerpt()           首段純文字
     最後依 relPath 排序
```

另有 `getNavIndex()`：把 `getDocs()` 投影成 `{ slug, title, section }[]`，給命令面板用。

### 掃描哪些檔案

```ts
const SECTIONS = ['agents','business_logic','docs','skills','standard','storage','workflow'];
const ROOT_FILES = ['CLAUDE.md'];
```

- `walk()` 遞迴每個 section 目錄，收集 `.md`，跳過 `.` 開頭與 `node_modules`。
- **缺目錄會靜默跳過**（`fs.existsSync` 守衛）。若 build「成功」但零文件，多半是 vault root 指錯——先看 `[vault] Rendering <dir>` log。
- **要掃更多目錄就改這兩個常數。**

### vault root 解析

`ROOT` 依序取（見 [configuration.md](configuration.md)）：

1. `npm_config_vault`（`--vault=<path>` CLI 旗標，非字串 `"true"`）
2. `VAULT_ROOT` 環境變數

兩者都沒給 → `getDocs()` 載入時 throw（沒有預設目錄）。

### `Doc` 資料模型（`lib/types.ts`）

```ts
interface Doc {
  relPath: string;     // "standard/code_style/java.md"
  slug: string;        // "standard/code_style/java"
  slugParts: string[]; // getStaticPaths 消費
  title: string;
  section: string;     // 第一段路徑，或 "root"
  html: string;        // 渲染後 HTML
  excerpt: string;     // 首段純文字（首頁卡片）
  toc: TocEntry[];     // h2/h3
}
```

### 標題與摘要的衍生規則

- `deriveTitle()`：`frontmatter.title` → 內文首個 `# 標題` → 檔名。
- `deriveExcerpt()`：第一段非標題 / 非引用 / 非 `---` 的文字，剝掉 Markdown 語法（wikilink 取 label、連結取文字、去除 `` ` `` `**` `*`）。

## Markdown 渲染（`lib/markdown.ts`）

`renderMarkdown(content, relPath, resolveWikilink?)` → `{ html, toc }`，順序是：

1. **`preprocessWikilinks()`** — 在丟給 marked **之前**處理 `[[...]]`（見下）。
2. **`marked.parse()`** — `marked` + `marked-highlight` + `highlight.js`；```mermaid 圍欄走自訂 renderer。
3. **`rewriteLinks()`** — 把內部 `.md` 連結改寫成站內路由。
4. **`extractToc()`** — 給 `<h2>`/`<h3>` 加 id 並收集成 TOC。

### 程式碼高亮

`markedHighlight` 用 `highlight.js`，class 是 `hljs language-xxx`。**配色不是 hljs 內建主題**，而是 `styles/app.css` 用 `--hl-*` 變數驅動 token 顏色，所以兩個主題都能套。

### Mermaid

```mermaid 圍欄在 build 時用 `beautiful-mermaid` 的 `renderMermaidSVG()` 出內聯 SVG，包在 `<figure class="mermaid">`。配色用 `MERMAID_OPTS`（暗色基準）；亮色主題在 `styles/app.css` 的 `:root[data-theme="light"] .content .mermaid svg` 重新著色。渲染失敗會 fallback 成 `<pre class="mermaid-error">`。其他語言的 `code()` renderer 回傳 `false`，落回上面的 highlighter。

### 連結改寫 `rewriteLinks()`

只改寫指向 `.md` 的相對連結（外部 `http(s):` / `mailto:` / `#` / 絕對 `/` 全部放行）。相對路徑用內建的 `normalizePath()`（處理 `../`，不依賴 `node:path`，因為這段邏輯也要能在純環境跑），轉成 `/<slug>/#anchor`。

## Obsidian Wikilinks（`lib/markdown.ts` + `lib/vault.ts` + `lib/text.ts`）

vault 用 Obsidian 風格 `[[target]]` / `[[target|label]]` / `[[target#anchor]]` 互連。

### 解析（`parseWikilink`，`lib/text.ts`）

拆出 `target` / `label` / `anchor`。表格內 `\|` 跳脫的 pipe 會先還原再切。

### 解析目標 slug（`buildWikiResolver`，`lib/vault.ts`）

1. 完整 slug 命中 → 直接用。
2. 路徑後綴命中（`[[mysql/segment]]`）→ 收集所有以 `/target` 結尾的 slug。
3. 否則用 basename（`[[overview]]`）→ 收集同名檔。
4. 多個候選時，**取與來源 doc 目錄共同前綴最長者**——所以 `[[overview]]` 會落在同資料夾的兄弟檔，而非別處同名檔。
5. 全無命中 → `null`。

### 渲染（`preprocessWikilinks`，`lib/markdown.ts`）

- 圍欄程式碼區塊整段跳過（文件裡的範例 Markdown 不被動到）。
- `` `[[X]]` ``（反引號包裹）→ `<code class="wikilink-code"><a class="wikilink">`，保留 code 樣式又可點。
- 裸 `[[X]]` → 純 `<a class="wikilink">`。
- 未解析 → `<span class="wikilink wikilink--broken">`（虛線底線、hover 顯示「未解析」）。

## 全文搜尋

### 共享設定（`lib/search-config.ts`）— 純模組，兩端共用

> ⚠️ 這個檔被 **build 端**（`lib/search.ts`）與 **客戶端**（`scripts/palette.ts`）同時 import。分詞器必須一致，否則序列化的索引查不到東西。**改分詞器一定要重 build。**

- `tokenize()`：Latin → `[a-z0-9_]+` 字詞；CJK → **逐字 + bigram**（讓無空格中文也能 match）。
- `SEARCH_OPTIONS`：索引 `title` + `text`，store `slug/title/section/text`。
- `searchParams(query)`：CJK 走精確（無 prefix / fuzzy，否則單字 token 會爆炸）；Latin 走 `prefix + fuzzy 0.2`；一律 `AND`；`title` boost ×2。

### 建索引（`lib/search.ts`）

`buildSearchIndex()` 把每篇 `doc.html` 用 `htmlToText()` 剝成純文字（丟掉 mermaid SVG、style、HTML 標籤、還原 entity），餵進 `MiniSearch` 再 `JSON.stringify`。由 `pages/search-index.json.ts`（`prerender = true`）輸出成 `/search-index.json`。

客戶端怎麼用這個索引，見 [client.md](client.md#命令面板-palettets)。

## 目錄樹（`lib/tree.ts`）

`buildTree(docs)` 把扁平 `Doc[]` 依 `slugParts` 疊成巢狀 `TreeNode[]`。排序規則：**資料夾在前、檔案在後，各組字母序**（`sortNodes`）。左欄 `Sidebar` / `TreeItem` 消費。
