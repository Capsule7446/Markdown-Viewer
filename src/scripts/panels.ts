import { BREAKPOINT } from './constants';

/** Panel visibility is width-driven by CSS: the TOC drops at <=1200px and the
   sidebar at <=820px. The only interactive piece left is the narrow-screen nav
   drawer — the header ☰ slides the sidebar in over a scrim. Nothing persists. */
export function initPanels(): void {
  const toggle = document.getElementById('nav-toggle');
  const scrim = document.getElementById('scrim');
  const sidebar = document.querySelector<HTMLElement>('.sidebar');
  if (!toggle) return;

  const setOpen = (open: boolean) => {
    document.body.classList.toggle('nav-open', open);
    if (scrim) scrim.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  toggle.addEventListener('click', () =>
    setOpen(!document.body.classList.contains('nav-open'))
  );
  scrim?.addEventListener('click', () => setOpen(false));
  // Following a link inside the drawer dismisses it.
  sidebar?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  });
  // Reset the drawer when the viewport grows past the nav breakpoint.
  window.matchMedia(BREAKPOINT.nav).addEventListener('change', (e) => {
    if (!e.matches) setOpen(false);
  });
}
