# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Astro-based static site that renders a local vault directory's Markdown (`rules/`, `agents/`, `skills/`, `docs/`, plus root `CLAUDE.md`) as a terminal-styled, searchable, dual-theme doc browser. There is no remote fetch — you point the site at a directory on the startup command and it packages/renders it as-is. Provide the path with `npm run dev --vault=<path>` (npm exports it as `npm_config_vault` to both `scripts/check-vault.mjs` and Astro; must use `=`, and it's named `--vault` because npm reserves `--local`) or via the `VAULT_ROOT` env var. The path is required: `check-vault.mjs` runs before `dev` / `build` / `preview` and exits with an error if no directory is given or it doesn't exist. The vault directory is the source of truth — this project only renders it.

Read `README.md` first — it has the architecture, data flow, common modification recipes, and conventions. This file only covers what's not in there.

## Commands

```bash
npm install
npm run dev      # astro dev — HMR at http://localhost:4321
npm run build    # static output → dist/
npm run preview  # serve the built site
```

No lint or test scripts are configured.

## Architectural anchors

- **Vault root resolution**: `src/lib/vault.ts` reads the directory from the `--vault=<path>` flag (`npm_config_vault`) or `VAULT_ROOT`, and throws if neither is set. Missing *section* directories inside the vault are silently skipped (`fs.existsSync` guard), so if the build "succeeds" with zero docs, `--vault` / `VAULT_ROOT` probably points at the wrong directory — check the `[vault] Rendering <dir>` log line first.
- **Build-time vs runtime split is load-bearing**: `src/lib/` runs in Node at build time (uses `fs`, can read outside the project); `src/scripts/` runs only in the browser. The only data bridge is the `<script type="application/json" id="doc-index">` island and `data-*` attributes. Don't import across this boundary.
- **Two pre-paint inline scripts** (`ThemeBoot.astro`, `PanelBoot.astro`) must stay `is:inline` to run before first paint and avoid flashing. They receive their storage keys / breakpoints from `src/scripts/constants.ts` via Astro `define:vars` — don't inline literals into them.
- **Search index uses a custom CJK tokenizer** in `src/lib/search-config.ts`, shared between build-time indexing and client-side query. Changing the tokenizer requires a rebuild; build and query must agree.
- **No hardcoded colors** anywhere outside `src/styles/tokens.css` — both themes live in that file as CSS variable sets. Mermaid SVGs need their light-mode overrides in `src/styles/app.css` because they're inlined with the dark palette baked in.

## Editing the vault content

The Markdown shown by this site lives in whatever directory you pass via `--vault=<path>` / `VAULT_ROOT`, not in this repo. Edit the `.md` files in that directory directly; `npm run dev` picks the changes up on restart (HMR also reacts to edits while running). This project only renders the directory — it never writes to or syncs it.
