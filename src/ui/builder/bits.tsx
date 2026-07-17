import type { SlotOption } from '../../engine/types';
import { useTip } from '../Tooltip';

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
  const ring = selected
    ? (consequence ? 'var(--warn)' : 'var(--color-accent)')
    : 'transparent';
  return (
    <div style={{ padding: '11px 13px', borderRadius: 8, background: 'var(--color-surface)', opacity: option.legal ? 1 : 0.55, boxShadow: `inset 0 0 0 1px ${ring}` }}>
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
