/** Small browser-only DOM utilities shared by the UI scripts. */

const HTML_ESCAPE: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

/** Make `s` safe to embed in HTML / data-* attributes. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => HTML_ESCAPE[c]!);
}

/** True when the focus is inside a text-input control. */
export function isTyping(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}
