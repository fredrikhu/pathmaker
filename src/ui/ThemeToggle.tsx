import { useSyncExternalStore } from 'react';
import { getThemePref, setThemePref, subscribeTheme, type ThemePref } from './theme';

const OPTS: { key: ThemePref; label: string; glyph: string }[] = [
  { key: 'light', label: 'Light', glyph: '☀' },
  { key: 'dark', label: 'Dark', glyph: '☾' },
  { key: 'system', label: 'System', glyph: '◐' },
];

/** Light / Dark / System segmented switch. Persists via the theme controller. */
export function ThemeToggle() {
  const pref = useSyncExternalStore(subscribeTheme, getThemePref, () => 'system' as ThemePref);
  return (
    <div role="group" aria-label="Theme"
      style={{ display: 'inline-flex', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {OPTS.map((o, i) => {
        const active = pref === o.key;
        return (
          <button key={o.key} type="button" onClick={() => setThemePref(o.key)}
            aria-pressed={active} title={`${o.label} theme`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px',
              fontFamily: 'inherit', fontSize: 12, cursor: 'pointer', border: 'none',
              borderLeft: i === 0 ? 'none' : '1px solid var(--color-divider)',
              background: active ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)' : 'transparent',
              color: active ? 'var(--color-accent)' : 'var(--color-text)',
              boxShadow: active ? 'inset 0 0 0 1px var(--color-accent)' : 'none',
            }}>
            <span aria-hidden="true" style={{ fontSize: 13 }}>{o.glyph}</span>{o.label}
          </button>
        );
      })}
    </div>
  );
}
