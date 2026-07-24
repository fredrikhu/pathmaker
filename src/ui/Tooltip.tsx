import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { BreakdownLine } from '../engine/types';
import { DICTIONARY, type Term } from './dictionary';

export interface CardContent {
  kicker: string;
  title: string;
  body?: string;
  lines?: BreakdownLine[];
  annotations?: string[];
  related?: string[];
}
/** Public alias for callers that build a card to pass to `tip.card(...)`. */
export type TipCard = CardContent;

interface TipState {
  content: CardContent;
  x: number;
  y: number;
  pinned: boolean;
  stack: CardContent[];
}

interface TipApi {
  /** Open a dictionary term. */
  term: (id: string) => (e: React.MouseEvent) => void;
  /** Open an arbitrary breakdown/consequence card. */
  card: (c: CardContent) => (e: React.MouseEvent) => void;
  leave: () => void;
}

const TipCtx = createContext<TipApi | null>(null);

export function useTip(): TipApi {
  const ctx = useContext(TipCtx);
  if (!ctx) throw new Error('useTip outside provider');
  return ctx;
}

function fmt(v: number): string {
  return v >= 0 ? `+${v}` : `−${Math.abs(v)}`;
}

function termToCard(id: string): CardContent {
  const t: Term = DICTIONARY[id] ?? { kicker: 'Term', title: id, body: '' };
  return { kicker: t.kicker, title: t.title, body: t.body, related: t.related };
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);

  const position = (e: React.MouseEvent): { x: number; y: number } => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(10, Math.min(r.left, window.innerWidth - 360));
    let y = r.bottom + 8;
    if (y > window.innerHeight - 250) y = Math.max(10, r.top - 250);
    return { x, y };
  };

  const open = useCallback((content: CardContent, e: React.MouseEvent) => {
    if (e.type !== 'click' && tip?.pinned) return;
    window.clearTimeout(hideTimer.current);
    setTip({ content, ...position(e), pinned: e.type === 'click', stack: [] });
  }, [tip]);

  const term = useCallback((id: string) => (e: React.MouseEvent) => open(termToCard(id), e), [open]);
  const card = useCallback((c: CardContent) => (e: React.MouseEvent) => open(c, e), [open]);

  const leave = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setTip((t) => (t && !t.pinned ? null : t));
    }, 260);
  }, []);

  const close = () => setTip(null);
  const drill = (id: string) => {
    setTip((t) => (t ? { ...t, content: termToCard(id), pinned: true, stack: [...t.stack, t.content] } : t));
  };
  const back = () => {
    setTip((t) => {
      if (!t || t.stack.length === 0) return t;
      const stack = [...t.stack];
      const prev = stack.pop()!;
      return { ...t, content: prev, stack };
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTip(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const c = tip?.content;

  return (
    <TipCtx.Provider value={{ term, card, leave }}>
      {children}
      {tip && c && (
        <div
          style={{ position: 'fixed', left: tip.x, top: tip.y, zIndex: 60 }}
          onMouseEnter={() => window.clearTimeout(hideTimer.current)}
          onMouseLeave={leave}
        >
          <div style={{ width: 330, padding: '13px 15px', borderRadius: 10, background: 'var(--color-surface)', boxShadow: 'var(--shadow-md)', animation: 'tipIn .12s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>{c.kicker}</span>
              <span style={{ flex: 1 }} />
              {tip.stack.length > 0 && (
                <button onClick={back} style={{ background: 'transparent', border: 'none', color: 'var(--color-neutral-400)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>← back</button>
              )}
              {tip.pinned && <span style={{ fontSize: 10, color: 'var(--color-neutral-500)' }}>pinned</span>}
              <button onClick={close} style={{ background: 'transparent', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer', fontSize: 12 }}>✕</button>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 5 }}>{c.title}</div>
            {c.body && <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-neutral-300)' }}>{c.body}</div>}
            {c.lines && c.lines.length > 0 && (
              <div style={{ fontSize: 12.5, lineHeight: 1.75, fontVariantNumeric: 'tabular-nums', color: 'var(--color-neutral-300)', marginTop: c.body ? 8 : 0 }}>
                {c.lines.map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span>{l.label}</span><span>{fmt(l.value)}</span>
                  </div>
                ))}
              </div>
            )}
            {c.annotations && c.annotations.length > 0 && (
              <div style={{ fontSize: 11.5, fontStyle: 'italic', color: 'var(--warn-fg)', marginTop: 8, lineHeight: 1.5 }}>
                {c.annotations.map((a, i) => <div key={i}>{a}</div>)}
              </div>
            )}
            {c.related && c.related.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
                {c.related.map((r) => (
                  <button key={r} onClick={() => drill(r)} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, cursor: 'pointer', border: '1px solid var(--color-accent-700)', background: 'transparent', color: 'var(--color-accent-300)', fontFamily: 'inherit' }}>
                    {DICTIONARY[r]?.title ?? r}
                  </button>
                ))}
              </div>
            )}
            {!tip.pinned && <div style={{ fontSize: 10.5, color: 'var(--color-neutral-500)', marginTop: 8 }}>Click to pin · Esc or ✕ to close</div>}
          </div>
        </div>
      )}
    </TipCtx.Provider>
  );
}

/** Inline dotted term that opens a dictionary tooltip. */
export function TermSpan({ id, children }: { id: string; children: ReactNode }) {
  const tip = useTip();
  return (
    <span className="term" onMouseEnter={tip.term(id)} onMouseLeave={tip.leave} onClick={tip.term(id)}>
      {children}
    </span>
  );
}
