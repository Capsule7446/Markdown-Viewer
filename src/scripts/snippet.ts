import { escapeHtml } from './dom';

/** Characters kept before / after the first query hit when building an excerpt. */
const BEFORE = 40;
const AFTER = 90;

/** HTML-safe excerpt of `text` around the first query hit, with each query
   term wrapped in `<mark>`. Returns empty string when query has no terms. */
export function buildSnippet(text: string, query: string): string {
  const terms = uniqueTerms(query);
  if (!terms.length) return '';

  const lower = text.toLowerCase();
  const hit = firstHit(lower, terms);
  const start = Math.max(0, hit - BEFORE);
  const end = Math.min(text.length, hit + AFTER);

  const lead = start > 0 ? '…' : '';
  const trail = end < text.length ? '…' : '';
  return lead + highlight(escapeHtml(text.slice(start, end)), terms) + trail;
}

/** Lowercased, de-duplicated terms ordered longest-first so nested matches
   (e.g. "log" inside "logger") highlight the longer one. */
function uniqueTerms(query: string): string[] {
  return [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))].sort(
    (a, b) => b.length - a.length
  );
}

function firstHit(haystackLower: string, terms: string[]): number {
  let at = -1;
  for (const t of terms) {
    const p = haystackLower.indexOf(t);
    if (p >= 0 && (at < 0 || p < at)) at = p;
  }
  return at < 0 ? 0 : at;
}

function highlight(html: string, terms: string[]): string {
  let out = html;
  for (const t of terms) {
    out = out.replace(new RegExp(escapeRegex(t), 'gi'), (m) => `<mark>${m}</mark>`);
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
