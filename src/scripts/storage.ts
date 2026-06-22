/** localStorage access that never throws (private mode, disabled storage…). */

export function getString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function getBool(key: string): boolean {
  return getString(key) === 'true';
}

export function setBool(key: string, value: boolean): void {
  setString(key, String(value));
}

export function getJSON<T>(key: string, fallback: T): T {
  const raw = getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON(key: string, value: unknown): void {
  setString(key, JSON.stringify(value));
}
