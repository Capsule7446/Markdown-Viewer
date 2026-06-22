/** Pure string helpers shared by the build-time markdown + vault pipeline. */

export interface Wikilink {
  /** Link target with any #anchor and surrounding slashes stripped. */
  target: string;
  /** Display text: the part after `|`, or the target when none given. */
  label: string;
  /** The #anchor portion of the target, if any. */
  anchor?: string;
}

/** Parse the interior of an Obsidian `[[...]]` wikilink. Inside Markdown
    tables the pipe separator is escaped as `\|`, so unescape it before
    splitting on the first pipe. */
export function parseWikilink(rawInner: string): Wikilink {
  const inner = rawInner.replace(/\\\|/g, '|');
  const pipe = inner.indexOf('|');
  const rawTarget = (pipe >= 0 ? inner.slice(0, pipe) : inner).trim();
  const rawLabel = pipe >= 0 ? inner.slice(pipe + 1).trim() : undefined;
  const [target, anchor] = rawTarget.split('#');
  return { target: target.trim(), label: (rawLabel ?? target).trim(), anchor };
}

/** Directory portion of a slug/relative path ('' when there's no directory). */
export function parentDir(p: string): string {
  return p.includes('/') ? p.replace(/\/[^/]+$/, '') : '';
}
