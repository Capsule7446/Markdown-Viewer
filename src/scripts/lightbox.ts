/** Mermaid-diagram (and image) viewer.
 *
 * Each rendered diagram gets a floating toolbar in its bottom-right corner:
 * zoom in / out, pan left / right, reset, and a pop-out button. Zoom and pan
 * transform the inline SVG in place — the figure clips the overflow. The
 * pop-out button opens the full-screen lightbox, which carries the same set of
 * controls (plus close). There is no click-to-zoom; all actions are explicit
 * button presses. */

type View = { scale: number; tx: number; ty: number };

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 6;
const PAN_STEP = 60;

const ICON = {
  in: '+',
  out: '−', // −
  left: '‹', // ‹
  right: '›', // ›
  up: '▲', // ▲
  down: '▼', // ▼
  reset: '↺', // ↺
  pop: '⛶', // ⛶
  close: '✕', // ✕
} as const;

const LABEL = {
  in: '放大',
  out: '縮小',
  left: '左移',
  right: '右移',
  up: '上移',
  down: '下移',
  reset: '重設',
  pop: '彈窗顯示',
  close: '關閉',
} as const;

function reset(v: View): void {
  v.scale = 1;
  v.tx = 0;
  v.ty = 0;
}

function apply(el: HTMLElement | SVGElement, v: View): void {
  el.style.transformOrigin = 'center center';
  el.style.transform = `translate(${v.tx}px, ${v.ty}px) scale(${v.scale})`;
}

/** A bound set of zoom/pan actions over a single target view. */
function makeActions(el: HTMLElement | SVGElement, v: View) {
  const render = () => apply(el, v);
  return {
    render,
    in: () => {
      v.scale = Math.min(ZOOM_MAX, v.scale + ZOOM_STEP);
      render();
    },
    out: () => {
      v.scale = Math.max(ZOOM_MIN, v.scale - ZOOM_STEP);
      render();
    },
    left: () => {
      v.tx += PAN_STEP;
      render();
    },
    right: () => {
      v.tx -= PAN_STEP;
      render();
    },
    up: () => {
      v.ty += PAN_STEP;
      render();
    },
    down: () => {
      v.ty -= PAN_STEP;
      render();
    },
    reset: () => {
      reset(v);
      render();
    },
  };
}

function button(glyph: string, label: string, cls = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls ? `mzoom-btn ${cls}` : 'mzoom-btn';
  b.textContent = glyph;
  b.title = label;
  b.setAttribute('aria-label', label);
  return b;
}

/** Click handler that never bubbles to the backdrop or figure underneath. */
function onTap(b: HTMLButtonElement, fn: () => void): void {
  b.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  });
}

type Actions = ReturnType<typeof makeActions>;
type Ctrl = 'reset' | 'up' | 'left' | 'right' | 'in' | 'down' | 'out';

// The seven fixed controls; CSS grid places each by its mz-* class into a 3×3
// cross. The centre cell is filled separately since it differs by context.
const CONTROLS: ReadonlyArray<{ key: Ctrl; cls: string }> = [
  { key: 'reset', cls: 'mz-reset' },
  { key: 'up', cls: 'mz-up' },
  { key: 'left', cls: 'mz-left' },
  { key: 'right', cls: 'mz-right' },
  { key: 'in', cls: 'mz-in' },
  { key: 'down', cls: 'mz-down' },
  { key: 'out', cls: 'mz-out' },
];

/** Populate a `.mzoom-bar` with the control cluster. The centre button is
    context-specific: in-figure bars pop out to the lightbox; the lightbox bar
    closes. */
function buildBar(bar: HTMLElement, act: Actions, center: { glyph: string; label: string; onClick: () => void }): void {
  for (const { key, cls } of CONTROLS) {
    const b = button(ICON[key], LABEL[key], cls);
    onTap(b, act[key]);
    bar.appendChild(b);
  }
  const c = button(center.glyph, center.label, 'mz-center mzoom-pop');
  onTap(c, center.onClick);
  bar.appendChild(c);
}

/** Attach the in-place toolbar to one mermaid figure. */
function initFigure(fig: HTMLElement, openLightbox: (svg: SVGElement) => void): void {
  const svg = fig.querySelector('svg');
  if (!svg || fig.dataset.mzoom === 'on') return;
  fig.dataset.mzoom = 'on';
  fig.classList.add('mzoom');

  const view: View = { scale: 1, tx: 0, ty: 0 };
  const act = makeActions(svg, view);

  const bar = document.createElement('div');
  bar.className = 'mzoom-bar';
  buildBar(bar, act, { glyph: ICON.pop, label: LABEL.pop, onClick: () => openLightbox(svg) });
  fig.appendChild(bar);
}

export function initLightbox(): void {
  const box = document.getElementById('lightbox');
  const inner = document.getElementById('lightbox-inner');
  const bar = document.getElementById('lightbox-bar');
  const content = document.querySelector<HTMLElement>('.content');
  if (!box || !inner) return;

  const view: View = { scale: 1, tx: 0, ty: 0 };
  let media: HTMLElement | null = null;
  const act = makeActions(inner, view);

  const open = (node: Element) => {
    inner.innerHTML = '';
    media = node.cloneNode(true) as HTMLElement;
    media.style.transform = '';
    inner.appendChild(media);
    reset(view);
    act.render();
    box.hidden = false;
  };
  const close = () => {
    box.hidden = true;
    inner.innerHTML = '';
    media = null;
    reset(view);
  };

  // Build the lightbox toolbar (its empty container lives in Lightbox.astro).
  if (bar) buildBar(bar, act, { glyph: ICON.close, label: LABEL.close, onClick: close });

  // Click the backdrop (but not the diagram or toolbar) to close.
  box.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (!t.closest('#lightbox-inner') && !t.closest('#lightbox-bar')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !box.hidden) close();
  });

  // Scroll wheel zooms in / out.
  box.addEventListener(
    'wheel',
    (e) => {
      if (box.hidden) return;
      e.preventDefault();
      const next = view.scale + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
      view.scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
      act.render();
    },
    { passive: false },
  );

  // Drag the diagram to pan it.
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let baseX = 0;
  let baseY = 0;
  inner.addEventListener('pointerdown', (e) => {
    if (box.hidden) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    baseX = view.tx;
    baseY = view.ty;
    inner.classList.add('dragging');
    inner.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  inner.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    view.tx = baseX + (e.clientX - startX);
    view.ty = baseY + (e.clientY - startY);
    act.render();
  });
  const endDrag = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    inner.classList.remove('dragging');
    try {
      inner.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };
  inner.addEventListener('pointerup', endDrag);
  inner.addEventListener('pointercancel', endDrag);

  // Give every mermaid figure its in-place controls.
  content
    ?.querySelectorAll<HTMLElement>('.mermaid')
    .forEach((fig) => initFigure(fig, open));
}
