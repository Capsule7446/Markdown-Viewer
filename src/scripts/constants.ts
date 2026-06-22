/** Storage keys and media-query breakpoints used by the client modules.
   This is the single source of truth — never inline these literals elsewhere.

   Panel visibility is width-driven via CSS media queries; the same breakpoint
   values appear literally in `styles/app.css` (`max-width: 1200px` for the TOC,
   `max-width: 820px` for the nav) because CSS can't read these. Keep them in
   sync. JS only needs the nav breakpoint, to reset the drawer when widening. */

export const STORAGE = {
  theme: 'theme',
  treeOpen: 'treeOpen',
} as const;

export const BREAKPOINT = {
  toc: '(max-width: 1200px)',
  nav: '(max-width: 820px)',
} as const;
