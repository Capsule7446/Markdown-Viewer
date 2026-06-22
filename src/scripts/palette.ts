import MiniSearch, { type SearchResult } from 'minisearch';
import { SEARCH_OPTIONS, searchParams } from '../lib/search-config';
import { escapeHtml, isTyping } from './dom';
import { buildSnippet } from './snippet';

interface NavEntry {
  slug: string;
  title: string;
  section: string;
}
/** Shape of every record stored in the MiniSearch index. */
interface IndexedDoc extends NavEntry {
  text: string;
}
/** What the palette renders — `text` is only present for index-backed hits. */
interface Result extends NavEntry {
  text?: string;
}

const INDEX_URL = '/search-index.json';

/** Read the JSON data island the CommandPalette component embeds. */
function loadNavIndex(): NavEntry[] {
  const raw = document.getElementById('doc-index')?.textContent;
  if (!raw) return [];
  try {
    return JSON.parse(raw) as NavEntry[];
  } catch {
    return [];
  }
}

/** Project a MiniSearch hit into the narrowed Result shape we render. */
function asResult(hit: SearchResult): Result {
  const doc = hit as unknown as IndexedDoc;
  return { slug: doc.slug, title: doc.title, section: doc.section, text: doc.text };
}

/** Command palette: "/" to open; Esc to close; ↑↓↵ to navigate.
   Title/path filtering is instant; the full-text MiniSearch index is fetched
   lazily on first open and refines the result list once it arrives. */
export function initPalette(): void {
  const palette = document.getElementById('palette');
  const input = document.getElementById('palette-input') as HTMLInputElement | null;
  const list = document.getElementById('palette-list');
  if (!palette || !input || !list) return;

  const docs = loadNavIndex();

  // ---- search engine (state) ----
  let mini: MiniSearch | null = null;
  let loading: Promise<void> | null = null;

  const ensureIndex = (): Promise<void> => {
    if (loading) return loading;
    loading = fetch(INDEX_URL)
      .then((r) => r.text())
      .then((json) => {
        mini = MiniSearch.loadJSON(json, SEARCH_OPTIONS);
      })
      .catch(() => {
        /* keep mini null — title/path fallback stays in effect */
      });
    return loading;
  };

  const titleFilter = (q: string): Result[] => {
    const needle = q.toLowerCase();
    return docs.filter((d) => `${d.title} ${d.slug}`.toLowerCase().includes(needle));
  };
  const fullTextSearch = (q: string): Result[] =>
    mini!.search(q, searchParams(q)).map(asResult);

  // ---- view state ----
  let matches: Result[] = docs;
  let active = 0;
  let query = '';

  const renderItem = (d: Result, i: number): string => {
    const slug = escapeHtml(d.slug);
    const snip = d.text && query.trim() ? `<span class="pl-snip">${buildSnippet(d.text, query)}</span>` : '';
    return `<li class="${i === active ? 'sel' : ''}" data-slug="${slug}">
      <div class="pl-row">
        <span class="pl-title">${escapeHtml(d.title)}</span>
        <span class="pl-path">${slug}</span>
      </div>${snip}
    </li>`;
  };
  const render = () => {
    list.innerHTML = matches.map(renderItem).join('');
  };
  const ensureSelectionVisible = () =>
    list.querySelector('li.sel')?.scrollIntoView({ block: 'nearest' });

  const run = (q: string) => {
    query = q;
    matches = !q.trim() ? docs : mini ? fullTextSearch(q) : titleFilter(q);
    active = 0;
    render();
    // Refine with full-text once the index lands — only if the user hasn't
    // moved on to a different query in the meantime.
    if (q.trim() && !mini) {
      ensureIndex().then(() => {
        if (query === q && mini) {
          matches = fullTextSearch(q);
          active = 0;
          render();
        }
      });
    }
  };

  // ---- open/close + navigation ----
  const open = () => {
    palette.hidden = false;
    input.value = '';
    run('');
    input.focus();
    ensureIndex(); // warm cache so the first keystroke can search body text
  };
  const close = () => {
    palette.hidden = true;
  };
  const go = () => {
    const d = matches[active];
    if (d) location.href = `/${d.slug}/`;
  };
  const move = (delta: number) => {
    active = Math.max(0, Math.min(matches.length - 1, active + delta));
    render();
    ensureSelectionVisible();
  };

  // ---- key bindings ----
  document.addEventListener('keydown', (e) => {
    if (palette.hidden) {
      if (e.key === '/' && !isTyping()) {
        e.preventDefault();
        open();
      }
      return;
    }
    switch (e.key) {
      case 'Escape':
        close();
        return;
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        return;
      case 'Enter':
        e.preventDefault();
        go();
        return;
    }
  });

  document.getElementById('palette-trigger')?.addEventListener('click', () => {
    palette.hidden ? open() : close();
  });

  input.addEventListener('input', () => run(input.value));
  list.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLLIElement>('li');
    if (li?.dataset.slug) location.href = `/${li.dataset.slug}/`;
  });
  palette.addEventListener('click', (e) => {
    if (e.target === palette) close();
  });
}
