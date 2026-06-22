#!/usr/bin/env node
// Resolve and validate the vault directory to render. The site renders whatever
// local directory you point it at — there is no remote fetch. Provide the path
// on the startup command with `npm run dev --vault=<path>` (npm exports it as
// npm_config_vault to this script and to Astro), or via the VAULT_ROOT env var.

import fs from 'node:fs';
import path from 'node:path';

// npm mangles the bare/space form (`--vault /path`) into the literal "true";
// reject it so the `=` spelling is the only accepted one.
const flag = process.env.npm_config_vault?.trim();
if (flag === 'true') {
  console.error(
    '[vault] --vault needs a path via "=", e.g. npm run dev --vault=/path/to/vault',
  );
  process.exit(1);
}

const raw = flag || process.env.VAULT_ROOT?.trim();
if (!raw) {
  console.error(
    '[vault] No vault directory given. Pass one on the command:\n' +
      '          npm run dev --vault=/path/to/vault\n' +
      '        or set the VAULT_ROOT environment variable.',
  );
  process.exit(1);
}

const vaultDir = path.resolve(raw);
if (!fs.existsSync(vaultDir) || !fs.statSync(vaultDir).isDirectory()) {
  console.error(`[vault] Not a directory: ${vaultDir}`);
  process.exit(1);
}

console.log(`[vault] Rendering ${vaultDir}`);
