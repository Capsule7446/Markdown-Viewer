import MiniSearch from 'minisearch';
import { getDocs } from './vault';
import { SEARCH_OPTIONS } from './search-config';

/** Strip rendered HTML down to searchable plain text (drops mermaid SVG guts). */
function htmlToText(html: string): string {
  return html
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Build a MiniSearch index over every doc's title + body and serialize it. */
export function buildSearchIndex(): string {
  const mini = new MiniSearch(SEARCH_OPTIONS);
  mini.addAll(
    getDocs().map((doc, id) => ({
      id,
      slug: doc.slug,
      title: doc.title,
      section: doc.section,
      text: htmlToText(doc.html),
    }))
  );
  return JSON.stringify(mini.toJSON());
}
