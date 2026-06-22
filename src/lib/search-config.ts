/** Shared MiniSearch configuration. Pure (no Node/DOM deps) so the exact same
   tokenizer drives both the build-time index and the client-side query — they
   MUST match or a serialized index won't search correctly. */

import type { Options } from 'minisearch';

const CJK = /[㐀-鿿\u{20000}-\u{2a6df}]/u;
const CJK_RUN = new RegExp(`${CJK.source}+`, 'gu');

/** Latin → words; CJK → per-character + bigrams (so spaceless 中文 matches). */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const lower = text.toLowerCase();
  for (const m of lower.matchAll(/[a-z0-9_]+/g)) tokens.push(m[0]);
  for (const run of lower.match(CJK_RUN) ?? []) {
    for (let i = 0; i < run.length; i++) {
      tokens.push(run[i]);
      if (i + 1 < run.length) tokens.push(run.slice(i, i + 2));
    }
  }
  return tokens;
}

export function processTerm(term: string): string {
  return term.toLowerCase();
}

export const SEARCH_OPTIONS: Options = {
  fields: ['title', 'text'],
  storeFields: ['slug', 'title', 'section', 'text'],
  tokenize,
  processTerm,
};

/** Per-query search options. CJK is matched exactly (no fuzzy/prefix, which
   would explode on single-char tokens); Latin gets prefix + light fuzzy. */
export function searchParams(query: string) {
  const cjk = CJK.test(query);
  return {
    prefix: !cjk,
    fuzzy: cjk ? false : 0.2,
    combineWith: 'AND' as const,
    boost: { title: 2 },
  };
}
