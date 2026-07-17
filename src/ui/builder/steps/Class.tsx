import { useState } from 'react';
import type { CharCtl } from '../../Builder';
import { CLASSES, classById } from '../../../content/index';
import type { ChoiceSlot } from '../../../engine/types';
import { OptionCard } from '../bits';
import { useTip } from '../../Tooltip';

export function ClassStep({ ch }: { ch: CharCtl }) {
  const tip = useTip();
  const { doc, setDecision, resolution } = ch;
  const selectedClass = doc.decisions['class'] as string | null;
  const [viewId, setViewId] = useState<string>(selectedClass ?? 'fighter');
  const view = classById.get(viewId)!;
  const alignment = doc.decisions['alignment'] as import('../../../engine/types').Alignment | null;
  const conflict = !!view.alignment && !!alignment && !view.alignment.includes(alignment);

  const classChoices = (doc.decisions['class-choices'] as Record<string, string[]>) ?? {};
  const setChoice = (slotId: string, value: string[]) => setDecision('class-choices', { ...classChoices, [slotId]: value });
  const classSlots = resolution.slots.filter((s) => s.step === 'class');

  const favored = doc.decisions['favored-class'] as string | null;
  const fcb = doc.decisions['fcb'] as string | null;

  const toggleChoice = (slot: ChoiceSlot, optId: string) => {
    const cur = classChoices[slot.id] ?? [];
    if (slot.multi) {
      const next = cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId].slice(-slot.count);
      setChoice(slot.id, next);
    } else {
      setChoice(slot.id, cur[0] === optId ? [] : [optId]);
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, maxWidth: 1120 }}>
      <div style={{ flex: 'none', width: 280 }}>
        <h3 style={{ fontSize: 21, margin: '0 0 12px' }}>Class</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {CLASSES.map((c) => (
            <div key={c.id} onClick={() => setViewId(c.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface)', cursor: 'pointer', boxShadow: `inset 0 0 0 1px ${viewId === c.id ? 'var(--color-accent)' : 'transparent'}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{c.sub}</div>
              </div>
              {selectedClass === c.id && <span style={{ fontSize: 11, color: 'var(--color-accent-300)' }}>✓ selected</span>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '4px 0', flex: 1, minWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 24, margin: 0 }}>{view.name}</h3>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setDecision('class', view.id)}>
            {selectedClass === view.id ? '✓ Selected' : 'Select class'}
          </button>
          {conflict && (() => {
            const open = tip.card({ kicker: 'Would raise an Issue', title: `${view.name} requires ${view.alignment!.join(' / ')}`, body: `Your alignment is ${alignment}. You can still select ${view.name} — the conflict surfaces as an Issue pointing at both slots, and either can change to resolve it.` });
            return <span className="warn-tag" onMouseEnter={open} onMouseLeave={tip.leave} onClick={open}>⚠ conflicts with alignment {alignment}</span>;
          })()}
        </div>
        <div style={{ display: 'flex', gap: 22, margin: '8px 0 12px', fontSize: 12.5, color: 'var(--color-neutral-300)', flexWrap: 'wrap' }}>
          <span>Hit die <strong>d{view.hitDie}</strong></span>
          <span><TermBab /> <strong>{view.bab === 'full' ? '+1/level' : view.bab === 'threequarter' ? '3/4' : '1/2'}</strong></span>
          <span>Good saves <strong>{view.goodSaves.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}</strong></span>
          <span>Skill ranks <strong>{view.skillRanks} + Int</strong></span>
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--color-neutral-300)', maxWidth: 620 }}>{view.desc}</p>

        <h6 style={{ margin: '18px 0 8px', color: 'var(--color-neutral-500)' }}>Level 1 features</h6>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 620 }}>
          {view.features1.map((f) => (
            <div key={f.id} style={{ fontSize: 13, lineHeight: 1.55 }}><span style={{ fontWeight: 500 }}>{f.name}</span> <span style={{ color: 'var(--color-neutral-400)' }}>— {f.desc}</span></div>
          ))}
        </div>

        {selectedClass === view.id && classSlots.length > 0 && (
          <>
            <h6 style={{ margin: '22px 0 8px', color: 'var(--color-neutral-500)' }}>Class choices</h6>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 620 }}>
              {classSlots.map((slot) => (
                <div key={slot.id}>
                  <div style={{ fontSize: 12.5, marginBottom: 6 }}>{slot.label} <span className="text-muted">({slot.selected.length}/{slot.count})</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {slot.options.map((o) => (
                      <OptionCard key={o.id} option={o} selected={slot.selected.includes(o.id)} onToggle={() => toggleChoice(slot, o.id)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {selectedClass === view.id && (
          <>
            <h6 style={{ margin: '22px 0 8px', color: 'var(--color-neutral-500)' }}>Favored class</h6>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" style={{ fontSize: 12, ...(favored === view.id ? { color: 'var(--color-accent)', borderColor: 'var(--color-accent)' } : {}) }} onClick={() => setDecision('favored-class', view.id)}>
                {favored === view.id ? '✓ ' : ''}{view.name} is my favored class
              </button>
              {favored === view.id && (
                <div style={{ display: 'inline-flex', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  {[{ id: 'hp', label: '+1 HP' }, { id: 'skill', label: '+1 skill rank' }].map((o) => (
                    <button key={o.id} onClick={() => setDecision('fcb', o.id)}
                      style={{ padding: '7px 12px', fontSize: 12.5, cursor: 'pointer', background: 'transparent', border: 'none', borderLeft: '1px solid var(--color-divider)', color: fcb === o.id ? 'var(--color-accent)' : 'var(--color-text)', boxShadow: fcb === o.id ? 'inset 0 0 0 1px var(--color-accent)' : 'none', fontFamily: 'inherit' }}>{o.label}</button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TermBab() {
  const tip = useTip();
  return <span className="term" onMouseEnter={tip.term('bab')} onMouseLeave={tip.leave} onClick={tip.term('bab')}>BAB</span>;
}
