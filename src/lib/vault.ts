import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Doc, NavEntry } from './types';
import { renderMarkdown, type WikiResolver } from './markdown';
import { parseWikilink, parentDir } from './text';

// Re-export the content model and tree builder so consumers have a single entry.
export type { Doc, TocEntry, TreeNode, NavEntry, SectionTree } from './types';
export { buildTree, buildSectionTrees } from './tree';

// Vault content is rendered from a local directory you point the site at —
// there is no remote fetch. Provide the path on the startup command with
// `npm run dev --vault=<path>` (npm exports it as npm_config_vault to this
// process), or via the VAULT_ROOT env var. scripts/check-vault.mjs validates it
// before each dev/build/preview.
const flag =
  process.env.npm_config_vault && process.env.npm_config_vault !== 'true'
    ? process.env.npm_config_vault.trim()
    : null;
const rootRaw = flag ?? process.env.VAULT_ROOT?.trim();
if (!rootRaw) {
  throw new Error(
    'No vault directory configured. Run with `npm run dev --vault=<path>` or set VAULT_ROOT.',
  );
}
const ROOT = path.resolve(rootRaw);

// Render the vault as-is: every top-level directory becomes a section and every
// root-level .md file is surfaced directly. Nothing about the structure is
// hardcoded, so the site works for any directory you point it at.
function isHidden(name: string): boolean {
  return name.startsWith('.') || name === 'node_modules';
}

// Slugs, sections, and wikilinks are all '/'-delimited; path.relative yields
// platform separators (backslashes on Windows), so normalize to POSIX.
function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

function walk(dir: string, acc: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (isHidden(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.md')) acc.push(full);
  }
}

function collectFiles(): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (isHidden(entry.name)) continue;
    const full = path.join(ROOT, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

function deriveTitle(data: Record<string, unknown>, body: string, file: string): string {
  if (typeof data.title === 'string' && data.title.trim()) return data.title.trim();
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return path.basename(file, '.md');
}

// First non-heading, non-blockquote paragraph as plain text. Markdown syntax
// (links, emphasis, inline code) stripped so the homepage cards can render it.
function deriveExcerpt(body: string): string {
  const lines = body.split('\n');
  const buf: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (buf.length) break;
      continue;
    }
    if (line.startsWith('#') || line.startsWith('>') || line.startsWith('---')) {
      if (buf.length) break;
      continue;
    }
    buf.push(line);
  }
  return buf
    .join(' ')
    // Obsidian wikilink → its display label (after the pipe, else the target).
    .replace(/\[\[([^\]]+?)\]\]/g, (_m, inner: string) => parseWikilink(inner).label)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function readDoc(file: string, resolveWikilink: WikiResolver): Doc {
  const relPath = toPosix(path.relative(ROOT, file));
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  const slug = relPath.replace(/\.md$/, '');
  const { html, toc } = renderMarkdown(content, relPath, resolveWikilink);
  return {
    relPath,
    slug,
    slugParts: slug.split('/'),
    title: deriveTitle(data, content, file),
    section: relPath.includes('/') ? relPath.split('/')[0] : 'root',
    html,
    excerpt: deriveExcerpt(content),
    toc,
  };
}

// Obsidian wikilinks resolve by either a path suffix (`[[mysql/segment]]`) or
// a bare basename (`[[calculation-pipeline]]`). When multiple files match,
// prefer the one sharing the longest directory prefix with the source doc —
// `[[overview]]` from `rules/.../segment-manager/` should land on its sibling
// `overview.md`, not an unrelated one in another section.
function buildWikiResolver(slugs: string[]): WikiResolver {
  const slugSet = new Set(slugs);
  const byBasename = new Map<string, string[]>();
  for (const slug of slugs) {
    const base = slug.split('/').pop()!.toLowerCase();
    if (!byBasename.has(base)) byBasename.set(base, []);
    byBasename.get(base)!.push(slug);
  }

  const commonPrefixDepth = (a: string, b: string): number => {
    const ap = a.split('/');
    const bp = b.split('/');
    let i = 0;
    while (i < ap.length && i < bp.length && ap[i] === bp[i]) i++;
    return i;
  };

  return (target, fromSlug) => {
    const t = target.replace(/^\/+|\/+$/g, '').replace(/\.md$/i, '');
    if (!t) return null;
    if (slugSet.has(t)) return t;

    const candidates: string[] = [];
    const needle = '/' + t;
    for (const slug of slugs) {
      if (slug.endsWith(needle)) candidates.push(slug);
    }
    if (candidates.length === 0) {
      const base = t.split('/').pop()!.toLowerCase();
      const matches = byBasename.get(base) ?? [];
      candidates.push(...matches);
    }
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const fromDir = parentDir(fromSlug);
    candidates.sort((a, b) => commonPrefixDepth(b, fromDir) - commonPrefixDepth(a, fromDir));
    return candidates[0];
  };
}

let cache: Doc[] | null = null;

/** All vault docs, parsed and rendered. Cached for the build's lifetime. */
export function getDocs(): Doc[] {
  if (cache) return cache;
  const files = collectFiles();
  const slugs = files.map((file) => toPosix(path.relative(ROOT, file)).replace(/\.md$/, ''));
  const resolveWikilink = buildWikiResolver(slugs);
  cache = files
    .map((file) => readDoc(file, resolveWikilink))
    .sort((a, b) => a.relPath.localeCompare(b.relPath));
  return cache;
}

/** Flat doc index for the client-side command palette. */
export function getNavIndex(): NavEntry[] {
  return getDocs().map(({ slug, title, section }) => ({ slug, title, section }));
}
