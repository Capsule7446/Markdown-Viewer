import type { Doc, TreeNode, SectionTree } from './types';

/** Group the tree by top-level section, returning each section's *children*
   (the second level) rather than the section node itself. The Topic selector
   owns the section label, so the file tree below it starts one level down.
   Top-level documents (no section directory) are collected under 'root'. */
export function buildSectionTrees(docs: Doc[]): SectionTree[] {
  const sections: SectionTree[] = [];
  const rootFiles: TreeNode[] = [];
  for (const node of buildTree(docs)) {
    const isFolder = node.children.length > 0 && !node.slug;
    if (isFolder) sections.push({ section: node.name, nodes: node.children });
    else rootFiles.push(node);
  }
  if (rootFiles.length) sections.push({ section: 'root', nodes: rootFiles });
  return sections;
}

/** Build a nested folder/file tree from the flat doc list, for the sidebar. */
export function buildTree(docs: Doc[]): TreeNode[] {
  const root: TreeNode = { name: '', children: [] };

  for (const doc of docs) {
    let node = root;
    doc.slugParts.forEach((part, i) => {
      const isLeaf = i === doc.slugParts.length - 1;
      let child = node.children.find((c) => c.name === part && !c.slug === !isLeaf);
      if (!child) {
        child = { name: part, children: [] };
        node.children.push(child);
      }
      if (isLeaf) {
        child.slug = doc.slug;
        child.title = doc.title;
      }
      node = child;
    });
  }

  return sortNodes(root.children);
}

/** Folders first, then files; each group alphabetical. */
function sortNodes(nodes: TreeNode[]): TreeNode[] {
  nodes.sort((a, b) => {
    const rank = (n: TreeNode) => (n.children.length > 0 && !n.slug ? 0 : 1);
    const diff = rank(a) - rank(b);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });
  nodes.forEach((n) => sortNodes(n.children));
  return nodes;
}
