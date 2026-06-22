import { defineConfig } from 'astro/config';

// Internal Markdown Viewer doc browser. Static site; content is scanned from the
// parent directory at build time (see src/lib/vault.ts), not from src/content,
// so the markdown stays the source of truth and lives where the team edits it.
export default defineConfig({
  site: 'http://localhost:4321',
  build: { format: 'directory' },
  vite: {
    server: {
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 3000,
      },
      // 禁用 overlay 錯誤提示（可選）
      middlewareMode: false,
    },
  },
});
