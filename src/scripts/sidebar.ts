import { STORAGE } from './constants';
import { getJSON, setJSON } from './storage';

type FolderState = Record<string, boolean>;

/** Persist each folder's open/closed state across navigations. The current
   doc's ancestors always start open; other folders restore the saved
   preference. (Folders live across every Topic's tree, so this covers all.) */
export function initSidebar(): void {
  const folders = Array.from(document.querySelectorAll<HTMLDetailsElement>('.tree details'));
  if (!folders.length) return;

  const state = getJSON<FolderState>(STORAGE.treeOpen, {});
  const persist = () => setJSON(STORAGE.treeOpen, state);
  const pathOf = (d: HTMLDetailsElement) => d.dataset.path ?? '';
  const isAncestor = (d: HTMLDetailsElement) => d.dataset.ancestor === 'true';

  folders.forEach((d) => {
    d.open = isAncestor(d) || (pathOf(d) in state ? state[pathOf(d)] : false);
    // Persist only deliberate user clicks; setTimeout lets <details> flip first.
    d.querySelector('summary')?.addEventListener('click', () => {
      setTimeout(() => {
        state[pathOf(d)] = d.open;
        persist();
      }, 0);
    });
  });
}
