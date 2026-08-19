import { useState } from 'react';
import type { SlotOption } from '../../engine/types';
import { useTip } from '../Tooltip';

/* Master-detail split (Class, Race): on phones the two panes are full-width panels in a
   horizontal scroll-snap container (.split-step, styles in mobile.css). These helpers slide
   between them; on desktop the container never scrolls horizontally, so both are no-ops. */

/** Slide to the detail panel (and bring the step's top into view) after a list tap. */
export function revealSplitDetail(e: React.MouseEvent): void {
  const root = (e.currentTarget as HTMLElement).closest('.split-step') as HTMLElement | null;
  // The snap style only exists under mobile.css's media query — the reliable "is phone" test
  // (scrollWidth overshoots clientWidth on desktop too, from the −26px scrollbar bleed).
  if (!root || getComputedStyle(root).scrollSnapType === 'none') return;
  root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  root.scrollTo({ left: root.scrollWidth - root.clientWidth, behavior: 'smooth' });
}

/** Slide back to the list panel (the mobile-only back button). */
export function showSplitList(e: React.MouseEvent): void {
  const root = (e.currentTarget as HTMLElement).closest('.split-step') as HTMLElement | null;
  root?.scrollTo({ left: 0, behavior: 'smooth' });
}

/** Tracks which panel a two-panel snap carousel rests on. The container's height is the max
 *  of its panels, so once the carousel settles, the hidden panel gets `.snap-collapsed`
 *  (zero height under mobile.css) and the page height matches the visible panel alone.
 *  During the swipe itself both panels stay expanded so no blank content shows mid-drag.
 *  Desktop never scrolls these containers, so no events fire and the class stays inert. */
export function useSnapPanels(): {
  active: number;
  onScroll: (e: React.UIEvent<HTMLElement>) => void;
  panelClass: (i: number) => string;
} {
  // Position-based, not timer-based: collapsing a panel makes the browser re-evaluate the snap
  // and fire more scroll events, so "quiet for N ms" never comes. Resting exactly on a snap
  // point (0 or max) is stable under those re-fires. The functional bail-out keeps re-renders
  // to the boundary crossings (~3 per swipe).
  const [state, setState] = useState({ active: 0, rest: true });
  const onScroll = (e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const max = el.scrollWidth - el.clientWidth;
    if (max < 40) return; // desktop-sized overshoot (scrollbar bleed), not a carousel
    const x = el.scrollLeft;
    const rest = x < 2 || x > max - 2;
    const active = x > max / 2 ? 1 : 0;
    setState((s) => (s.active === active && s.rest === rest ? s : { active, rest }));
  };
  return {
    active: state.active,
    onScroll,
    panelClass: (i) => (state.rest && i !== state.active ? ' snap-collapsed' : ''),
  };
}

/** Warning tag: would-invalidate consequences or a persistent caution (opposition school). */
export function WarnTag({ option }: { option: SlotOption }) {
  const tip = useTip();
  if (option.wouldInvalidate?.length) {
    const names = option.wouldInvalidate.map((w) => w.decisionName).join(', ');
    const open = tip.card({
      kicker: 'Would raise an Issue',
      title: `Taking ${option.name} orphans:`,
      lines: option.wouldInvalidate.map((w) => ({ label: `${w.slotLabel}: ${w.decisionName}`, value: 0 })),
      body: 'The slot this decision sits in is removed. The decision is not deleted — it becomes an Issue you resolve by picking it up elsewhere or clearing it. No confirmation needed; undo works.',
    });
    return (
      <span className="warn-tag" onMouseEnter={open} onMouseLeave={tip.leave} onClick={open}>⚠ will orphan: {names}</span>
    );
  }
  if (option.caution) {
    return <span className="warn-tag">⚠ {option.caution}</span>;
  }
  return null;
}

/** Selectable option row used by race alt-traits, class choices, etc. */
export function OptionCard({ option, selected, onToggle, replacesLabel }: {
  option: SlotOption;
  selected: boolean;
  onToggle: () => void;
  replacesLabel?: string;
}) {
  const consequence = !!option.wouldInvalidate?.length;
  const cls = `pick${selected ? ' is-sel' : ''}${consequence ? ' is-warn' : ''}${option.legal ? '' : ' is-disabled'}`;
  return (
    <div className={cls} style={{ padding: '11px 13px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{option.name}</span>
        {replacesLabel && <span className="tag tag-neutral" style={{ fontSize: 10 }}>replaces {replacesLabel}</span>}
        <WarnTag option={option} />
        <span style={{ flex: 1 }} />
        <button className="btn btn-ghost" style={{ fontSize: 11.5 }} disabled={!option.legal && !selected} onClick={onToggle}>
          {selected ? '✓ Taken' : 'Take'}
        </button>
      </div>
      {option.desc && <div style={{ fontSize: 12.5, color: 'var(--color-neutral-400)', marginTop: 3, lineHeight: 1.5 }}>{option.desc}</div>}
      {!option.legal && option.whyNot && <div style={{ fontSize: 11.5, color: 'var(--err)', marginTop: 5 }}>{option.whyNot}</div>}
    </div>
  );
}

export function Stepper({ value, onDec, onInc, canDec, canInc }: {
  value: number; onDec: () => void; onInc: () => void; canDec: boolean; canInc: boolean;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <button className="stepper" disabled={!canDec} onClick={onDec}>−</button>
      <span className="num" style={{ width: 22, textAlign: 'center', fontWeight: 600 }}>{value}</span>
      <button className="stepper" disabled={!canInc} onClick={onInc}>+</button>
    </span>
  );
}
