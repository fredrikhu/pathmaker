// Theme controller — Light / Dark / System, persisted in localStorage.
//
// The single source of truth for the *rendered* theme is the `data-theme`
// attribute on <html> (styles live under :root[data-theme="dark"]). The user's
// *preference* is 'system' | 'light' | 'dark'; when it's 'system' we resolve the
// concrete theme from the OS here in JS (and keep it in sync as the OS changes),
// so the CSS never needs a prefers-color-scheme branch. A tiny inline script in
// index.html applies the same resolution before first paint to avoid a flash.

export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'pathmaker:theme';
const mql = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePref(): ThemePref {
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

export function resolvedTheme(pref: ThemePref = getThemePref()): 'light' | 'dark' {
  return pref === 'system' ? (mql().matches ? 'dark' : 'light') : pref;
}

function apply(pref: ThemePref): void {
  document.documentElement.dataset.theme = resolvedTheme(pref);
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function setThemePref(pref: ThemePref): void {
  if (pref === 'system') localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, pref);
  apply(pref);
  notify();
}

/** Subscribe to preference changes (for React's useSyncExternalStore). */
export function subscribeTheme(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Call once at startup: re-assert the attribute and follow the OS while on 'system'. */
export function initTheme(): void {
  apply(getThemePref());
  mql().addEventListener('change', () => {
    if (getThemePref() === 'system') { apply('system'); notify(); }
  });
}
