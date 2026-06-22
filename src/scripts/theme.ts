import { STORAGE } from './constants';
import { setString } from './storage';

/** Wire the light/dark toggle. The initial value is set pre-paint by the boot
   script in Layout.astro; here we only handle clicks and the button glyph. */
export function initTheme(): void {
  const button = document.getElementById('theme-toggle');
  if (!button) return;
  const root = document.documentElement;

  const refresh = () => {
    const light = root.dataset.theme === 'light';
    button.textContent = light ? '☾' : '☀';
    button.title = light ? '切換暗色主題' : '切換亮色主題';
  };

  button.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    setString(STORAGE.theme, next);
    refresh();
  });

  refresh();
}
