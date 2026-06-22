/** Shared content-model types for the vault. */

export interface TocEntry {
  level: number;
  text: string;
  id: string;
}

export interface Doc {
  /** Path relative to vault root, e.g. "rules/common/code_style/java.md". */
  relPath: string;
  /** URL path without extension, e.g. "rules/common/code_style/java". */
  slug: string;
  /** Slug split on "/" — what getStaticPaths consumes. */
  slugParts: string[];
  title: string;
  section: string;
  html: string;
  /** First paragraph as plain text, used as preview/description. */
  excerpt: string;
  /** h2/h3 headings extracted for the right-hand outline. */
  toc: TocEntry[];
}

export interface TreeNode {
  name: string;
  /** Set when this node is itself a document. */
  slug?: string;
  title?: string;
  children: TreeNode[];
}

/** A top-level section (Topic) paired with its second-level tree — i.e. the
   section's own children, so the sidebar can render a tree that starts below
   the section folder itself. Root-level docs are grouped under section 'root'. */
export interface SectionTree {
  section: string;
  nodes: TreeNode[];
}

/** Lightweight doc descriptor handed to the client-side command palette. */
export interface NavEntry {
  slug: string;
  title: string;
  section: string;
}
