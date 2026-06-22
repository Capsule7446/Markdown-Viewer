# 設定與環境

## 需求

- **Node >= 24**（`package.json` 的 `engines` 強制；`@types/node` 也對齊 24）。
- 一個放著 Markdown 的本地 vault 目錄（啟動時用 `--vault=<path>` 指定）。沒有遠端拉取，**不需要 git**。

## npm scripts

| 指令 | 做什麼 |
|------|--------|
| `npm run check-vault` | 解析並校驗 vault 目錄（存在性），印出 `[vault] Rendering <dir>` |
| `npm run dev` | `predev`（check）→ `astro dev`，HMR @ http://localhost:4321 |
| `npm run build` | `prebuild`（check）→ 靜態輸出到 `dist/` |
| `npm run preview` | `prepreview`（check）→ 預覽 build 結果 |

`predev` / `prebuild` / `prepreview` 生命週期勾子讓 **每次 dev / build / preview 前都先校驗目錄**；目錄沒給或不存在就直接報錯退出。

> 都要帶 vault 路徑：`npm run dev --vault=/path/to/vault`（build / preview 同理），或用 `VAULT_ROOT` 環境變數。

## vault 來源解析

內容不在本 repo，住在你啟動時指定的本地目錄。`scripts/check-vault.mjs` 與 `src/lib/vault.ts` 用**同一套**優先序決定 vault root：

1. **`--vault=<path>` CLI 旗標** — npm 把它導出成 `npm_config_vault` 給整個 run 的每個生命週期 script，所以 check 步驟與 Astro 看到同一路徑。意思是「**就地渲染這個本地目錄**」。

   ```bash
   npm run dev --vault=/path/to/vault   # build / preview 同理
   ```

   - 必須用 `=`；裸 / 空格形式（`--vault /path`）會被 npm 吃成字串 `"true"`，腳本會拒絕並報錯。
   - 旗標叫 `--vault` 而非 `--local`，因為 `--local` 被 npm 佔用。

2. **`VAULT_ROOT` 環境變數** — `--vault=` 的環境變數等價物。

兩者都沒給 → **報錯退出**（沒有預設目錄）。

## 環境變數

| 變數 | 預設 | 作用 |
|------|------|------|
| `VAULT_ROOT` | — | 指定 vault 目錄路徑（`--vault=` 的等價物） |
| `npm_config_vault` | — | 由 `--vault=` 自動設定，一般不手動給 |

## check 行為（`scripts/check-vault.mjs`）

- 解析 `--vault=` / `VAULT_ROOT` → 絕對路徑。
- 路徑沒給 → 報錯並列出用法後 `exit(1)`。
- 路徑不是存在的目錄 → 印 `[vault] Not a directory: <dir>` 後 `exit(1)`。
- 通過 → 印 `[vault] Rendering <dir>`。

> 這個腳本只**讀取/校驗**，不會 clone、fetch、reset 或寫入任何檔案。

## 編輯 vault 內容

網站渲染的 Markdown 就是你用 `--vault=` / `VAULT_ROOT` 指定的那個目錄裡的檔案，不在本 repo。直接改那個目錄裡的 `.md` 即可——`npm run dev` 重啟（或執行中的 HMR）就會反映。本專案只渲染該目錄，**不會寫回或同步**它。

## Astro 設定（`astro.config.mjs`）

- `site: 'http://localhost:4321'`
- `build.format: 'directory'` — 路由出成 `/<slug>/index.html`（乾淨網址）。
- Vite HMR：`ws` @ `localhost:3000`。

沒有設定 lint / test script。
