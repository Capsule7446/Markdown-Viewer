# 開發者文檔

這裡是 **Markdown Viewer 文檔瀏覽站**（`markdown-viewer`）本身的開發文檔——說明這個 Astro 專案怎麼運作、怎麼改、有哪些約定。

> 想看「網站渲染出來的內容」怎麼編輯？那些 Markdown 不在這個 repo，住在你啟動時用 `--vault=<path>` 指定的本地目錄。見 [configuration.md](configuration.md#編輯-vault-內容) 與專案根的 `CLAUDE.md`。

## 這個專案是什麼

一個 **Astro 靜態站**，把外部 vault 的 Markdown（`agents/` `business_logic/` `docs/` `skills/` `standard/` `storage/` `workflow/` 以及根目錄 `CLAUDE.md`）渲染成終端風格、可全文搜尋、雙主題的文檔瀏覽站。

- 內容是 **build 時**從啟動指令指定的本地 vault 目錄（`--vault=<path>` / `VAULT_ROOT`，由 `scripts/check-vault.mjs` 校驗）掃描的，不放在 `src/content`。
- 輸出純靜態檔，**零執行期框架 JS**（mermaid 在 build 時就出 SVG，搜尋索引也是 build 時建好）。
- Markdown 是唯一事實來源，本專案只負責渲染。

## 文檔導覽

| 文件 | 內容 |
|------|------|
| [architecture.md](architecture.md) | 整體架構、build-time / runtime 分界、資料流 |
| [build-pipeline.md](build-pipeline.md) | 內容層（`src/lib/`）：vault 掃描、Markdown 渲染、wikilink、搜尋索引 |
| [client.md](client.md) | 行為層（`src/scripts/`）：客戶端模組與 **DOM 契約** |
| [configuration.md](configuration.md) | vault 來源、環境變數、Astro 設定、編輯內容 |
| [module-reference.md](module-reference.md) | 逐檔速查表 |

## 30 秒上手

```bash
npm install
npm run dev --vault=/path/to/vault      # 先校驗目錄 → astro dev → http://localhost:4321
npm run build --vault=/path/to/vault    # 靜態輸出到 dist/
npm run preview --vault=/path/to/vault  # 預覽 build 結果
```

需要 **Node >= 24**。沒有設定 lint / test script。完整指令與環境變數見 [configuration.md](configuration.md)。

## 最常見的修改入口

| 想做的事 | 改哪裡 |
|----------|--------|
| 配色 / 主題 | `src/styles/tokens.css`（兩個 `:root` 區塊都要改） |
| 掃描更多 vault 目錄 | `src/lib/vault.ts` 的 `SECTIONS` / `ROOT_FILES` |
| 首頁卡片 | `src/pages/index.astro` 的 `sections` 陣列 |
| 加一種 Markdown 渲染 | `src/lib/markdown.ts` |
| 調全文搜尋（分詞 / 排序） | `src/lib/search-config.ts`（**改分詞器要重 build**） |
| 加客戶端互動 | 在 `src/scripts/` 新增 `initXxx()`，於 `main.ts` 呼叫 |
| 版面寬度 / 斷點 | `src/styles/app.css` + `src/scripts/constants.ts` 的 `BREAKPOINT` |

詳細展開見各分頁。
