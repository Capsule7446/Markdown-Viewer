import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import { renderMermaidSVG } from 'beautiful-mermaid';
import type { TocEntry } from './types';
import { parseWikilink, parentDir } from './text';

// Terminal palette handed to beautiful-mermaid so diagrams match the dark
// theme; the light theme re-tints them via CSS overrides (see styles/app.css).
const MERMAID_OPTS = {
  fg: '#d8d8d8',
  line: '#6a6a6a',
  accent: '#e3b341',
  muted: '#8a8a8a',
  surface: '#171a1f',
  border: '#2a2a2a',
  font: '"SF Mono", Menlo, Consolas, monospace',
  transparent: true,
} as const;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

export type WikiResolver = (target: string, fromSlug: string) => string | null;

// Replace [[target]] / [[target|label]] with resolved anchors. The vault
// convention is `[[X]]` (backtick-wrapped) for visual emphasis; render those
// as <code><a></code> so they stay code-styled AND clickable. Bare [[X]]
// becomes a plain <a>. Fenced code blocks are skipped so example markdown
// in docs survives untouched. Unresolved links render with a dashed underline.
function preprocessWikilinks(src: string, fromSlug: string, resolve: WikiResolver): string {
  const renderLink = (rawInner: string, wrapCode: boolean): string => {
    const { target, label, anchor } = parseWikilink(rawInner);
    const slug = resolve(target, fromSlug);
    const html = slug
      ? `<a class="wikilink" href="/${slug}/${anchor ? '#' + anchor : ''}">${escapeHtml(label)}</a>`
      : `<span class="wikilink wikilink--broken" title="未解析: ${escapeHtml(target)}">${escapeHtml(label)}</span>`;
    return wrapCode ? `<code class="wikilink-code">${html}</code>` : html;
  };

  const parts = src.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part; // fenced code blocks pass through
      const backticked = part.replace(/`\[\[([^\]\n`]+?)\]\]`/g, (_m, raw: string) =>
        renderLink(raw, true)
      );
      return backticked.replace(/\[\[([^\]\n]+?)\]\]/g, (_m, raw: string) => renderLink(raw, false));
    })
    .join('');
}

// marked instance with syntax highlighting. `language-xxx` classes drive the
// highlight.js token palette styled in styles/app.css.
const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  })
);

// ```mermaid fences become inline SVG at build time; every other language
// returns false to fall through to the highlighter above.
marked.use({
  renderer: {
    code({ text, lang }) {
      if ((lang ?? '').trim().toLowerCase() !== 'mermaid') return false;
      try {
        return `<figure class="mermaid">${renderMermaidSVG(text, MERMAID_OPTS)}</figure>`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return `<pre class="mermaid-error"># mermaid render failed: ${msg}\n${escapeHtml(text)}</pre>`;
      }
    },
  },
});

/** Rewrite intra-vault .md links so they resolve to site routes. */
function rewriteLinks(html: string, fromRelPath: string): string {
  const fromDir = parentDir(fromRelPath);
  return html.replace(/href="([^"]+)"/g, (full, href: string) => {
    if (/^(https?:|mailto:|#|\/)/.test(href)) return full;
    const [target, anchor] = href.split('#');
    if (!target.endsWith('.md')) return full;
    const resolved = normalizePath(fromDir ? `${fromDir}/${target}` : target);
    const slug = resolved.replace(/\.md$/, '');
    return `href="/${slug}/${anchor ? '#' + anchor : ''}"`;
  });
}

/** Resolve "a/b/../c" style relative segments without depending on node:path. */
function normalizePath(p: string): string {
  const out: string[] = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') out.pop();
    else out.push(seg);
  }
  return out.join('/');
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

/** Add ids to h2/h3 and collect them as a table of contents. */
function extractToc(html: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  const used = new Map<string, number>();
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_full, lvl: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    let id = slugify(text);
    const seen = used.get(id) ?? 0;
    used.set(id, seen + 1);
    if (seen) id = `${id}-${seen}`;
    toc.push({ level: Number(lvl), text, id });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });
  return { html: out, toc };
}

/** Render markdown body to HTML, rewriting links and extracting a TOC. */
export function renderMarkdown(
  content: string,
  relPath: string,
  resolveWikilink?: WikiResolver
): { html: string; toc: TocEntry[] } {
  const fromSlug = relPath.replace(/\.md$/, '');
  const source = resolveWikilink ? preprocessWikilinks(content, fromSlug, resolveWikilink) : content;
  const rendered = marked.parse(source, { async: false }) as string;
  return extractToc(rewriteLinks(rendered, relPath));
}
