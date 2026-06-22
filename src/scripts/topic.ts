/** Topic selector: clicking a Topic swaps which section's file tree is shown.
   Purely client-side — no navigation. The initial active Topic is rendered
   server-side, so this only handles subsequent clicks. */
export function initTopicNav(): void {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.topic-nav [data-topic]'));
  const trees = Array.from(document.querySelectorAll<HTMLElement>('[data-topic-tree]'));
  if (!buttons.length) return;

  const show = (topic: string) => {
    buttons.forEach((b) => {
      const on = b.dataset.topic === topic;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    trees.forEach((t) => {
      t.hidden = t.dataset.topicTree !== topic;
    });
  };

  buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.topic ?? '')));
}
