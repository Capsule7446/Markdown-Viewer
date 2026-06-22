/** Table-of-contents behaviour: highlight the entry for the heading in view,
   copy a deep link from any entry's copy button, and drive the collapsed
   dropdown shown at medium widths. */
export function initToc(): void {
  initTocCopy();
  initTocInline();
  initTocHighlight();
}

/** Copy `<origin><path>#anchor` for any `.toc-copy` button. Delegated on the
   document so it covers both the full TOC and the collapsed dropdown. */
function initTocCopy(): void {
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.toc-copy');
    if (!btn) return;
    e.preventDefault();
    const anchor = btn.dataset.anchor;
    if (!anchor) return;
    const url = new URL(`#${anchor}`, location.href).href;
    void navigator.clipboard
      ?.writeText(url)
      .then(() => {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 1200);
      })
      .catch(() => {});
  });
}

/** Open/close the collapsed TOC dropdown; close it on pick or outside click. */
function initTocInline(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.toc-inline-toggle');
  const panel = document.getElementById('toc-inline-panel');
  if (!toggle || !panel) return;

  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  // Following a link closes it; clicking copy keeps it open.
  panel.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  });
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.toc-inline')) setOpen(false);
  });
}

/** Mark the entry whose heading is in view as active across both the full TOC
   and the dropdown, and mirror its label into the dropdown toggle. */
function initTocHighlight(): void {
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('.toc a, .toc-inline a')
  );
  if (!links.length) return;
  const currentLabel = document.querySelector<HTMLElement>('.toc-inline-current');

  const ids = Array.from(new Set(links.map((a) => a.dataset.id).filter(Boolean) as string[]));
  const targets = ids
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);

  const setActive = (id: string) => {
    links.forEach((a) => a.classList.toggle('active', a.dataset.id === id));
    const match = links.find((a) => a.dataset.id === id);
    if (currentLabel && match) currentLabel.textContent = match.textContent;
  };

  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(entry.target.id);
      }
    },
    { rootMargin: '0px 0px -75% 0px', threshold: 0 }
  );
  targets.forEach((t) => spy.observe(t));
}
