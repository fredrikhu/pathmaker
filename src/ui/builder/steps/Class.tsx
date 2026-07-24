import { useState } from 'react';
import type { CharCtl } from '../../Builder';
import { CLASSES, classById } from '../../../content/index';
import type { ChoiceSlot } from '../../../engine/types';
import { OptionCard, Stepper } from '../bits';
import type { SlotOption } from '../../../engine/types';
import { effectiveClass, readDecisions } from '../../../engine/resolve';
import { useTip } from '../../Tooltip';

export function ClassStep({ ch }: { ch: CharCtl }) {
  const tip = useTip();
  const { doc, setDecision, resolution } = ch;
  const selectedClass = doc.decisions['class'] as string | null;
  const [viewId, setViewId] = useState<string>(selectedClass ?? 'fighter');
  const view = classById.get(viewId)!;
  const alignment = doc.decisions['alignment'] as import('../../../engine/types').Alignment | null;
  // The alignment restriction is the *effective* one for the class actually taken — the Martial
  // Artist lifts the monk's, so browsing to your own class must not still warn about it.
  const viewAlignment = viewId === selectedClass
    ? effectiveClass(view, readDecisions(doc)).alignment
    : view.alignment;
  const conflict = !!viewAlignment && !!alignment && !viewAlignment.includes(alignment);

  const classChoices = (doc.decisions['class-choices'] as Record<string, string[]>) ?? {};
  const setChoice = (slotId: string, value: string[]) => setDecision('class-choices', { ...classChoices, [slotId]: value });
  const classSlots = resolution.slots.filter((s) => s.step === 'class');
  const archetype = (doc.decisions['archetype'] as string | null) ?? null;
  // Selecting a different class clears any archetype — an archetype belongs to one class.
  const selectClass = (id: string) => {
    if (id === selectedClass) return;
    setDecision('class', id);
    setDecision('archetype', null);
  };

  const favored = doc.decisions['favored-class'] as string | null;
  const fcb = doc.decisions['fcb'] as string | null;

  // Level-1 feature preview. Normally the class's own `features1` copy; when an archetype is
  // selected on the selected class, derive them through `effectiveClass` so swapped features
  // (e.g. Bladebound's Arcane Pool) show here too, matching the Advancement/Sheet views.
  const level1Features = (() => {
    if (view.id === selectedClass && archetype) {
      const eff = effectiveClass(view, readDecisions(doc));
      const lvl1 = (eff.features ?? []).filter((f) => f.level === 1);
      if (lvl1.length) return lvl1.map((f) => ({ id: f.id, name: f.name, desc: f.desc }));
    }
    return view.features1;
  })();

  const toggleChoice = (slot: ChoiceSlot, optId: string) => {
    const cur = classChoices[slot.id] ?? [];
    if (slot.multi) {
      const next = cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId].slice(-slot.count);
      setChoice(slot.id, next);
    } else {
      setChoice(slot.id, cur[0] === optId ? [] : [optId]);
    }
  };

  // Point-buy slots (eidolon evolutions) store one array entry per purchase, so a repeatable
  // evolution can appear several times. Add/remove a single occurrence.
  const addOne = (slotId: string, optId: string) => setChoice(slotId, [...(classChoices[slotId] ?? []), optId]);
  const removeOne = (slotId: string, optId: string) => {
    const cur = classChoices[slotId] ?? [];
    const i = cur.lastIndexOf(optId);
    if (i < 0) return;
    setChoice(slotId, [...cur.slice(0, i), ...cur.slice(i + 1)]);
  };

  return (
    <div style={{ display: 'flex', gap: 28, height: '100%' }}>
      <div style={{ flex: 'none', width: 280, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <h3 style={{ fontSize: 21, margin: '0 0 12px' }}>Class</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', minHeight: 0, paddingRight: 6 }}>
          {CLASSES.map((c) => (
            <div key={c.id} role="button" tabIndex={0}
              onClick={() => setViewId(c.id)}
              onDoubleClick={() => selectClass(c.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setViewId(c.id); selectClass(c.id); } else if (e.key === ' ') { e.preventDefault(); setViewId(c.id); } }}
              title="Click to preview · double-click or Enter to select"
              className={`pick is-clickable${viewId === c.id ? ' is-sel' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{c.sub}</div>
              </div>
              {selectedClass === c.id && <span style={{ fontSize: 11, color: 'var(--color-accent-300)' }}>✓ selected</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Negative right margin pulls the scroll container into the Builder column's 26px padding so
          its scrollbar sits flush with the pane edge, matching the steps that scroll as a whole. */}
      <div style={{ padding: '4px 26px 4px 0', marginRight: -26, flex: 1, minWidth: 0, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 24, margin: 0 }}>{view.name}</h3>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => selectClass(view.id)}>
            {selectedClass === view.id ? '✓ Selected' : 'Select class'}
          </button>
          {conflict && (() => {
            const open = tip.card({ kicker: 'Would raise an Issue', title: `${view.name} requires ${viewAlignment!.join(' / ')}`, body: `Your alignment is ${alignment}. You can still select ${view.name} — the conflict surfaces as an Issue pointing at both slots, and either can change to resolve it.` });
            return <span className="warn-tag" onMouseEnter={open} onMouseLeave={tip.leave} onClick={open}>⚠ conflicts with alignment {alignment}</span>;
          })()}
        </div>
        <div style={{ display: 'flex', gap: 22, margin: '8px 0 12px', fontSize: 12.5, color: 'var(--color-neutral-300)', flexWrap: 'wrap' }}>
          <span>Hit die <strong>d{view.hitDie}</strong></span>
          <span><TermBab /> <strong>{view.bab === 'full' ? '+1/level' : view.bab === 'threequarter' ? '3/4' : '1/2'}</strong></span>
          <span>Good saves <strong>{view.goodSaves.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}</strong></span>
          <span>Skill ranks <strong>{view.skillRanks} + Int</strong></span>
        </div>
        {view.id === selectedClass && view.archetypes && view.archetypes.length > 0 && (
          <div style={{ margin: '2px 0 14px' }}>
            <label className="micro" style={{ display: 'block', marginBottom: 5 }}>Archetype</label>
            <select className="input" style={{ maxWidth: 340 }} value={archetype ?? ''}
              onChange={(e) => setDecision('archetype', e.target.value || null)}>
              <option value="">Standard {view.name} — no archetype</option>
              {view.archetypes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {(() => {
              const a = view.archetypes!.find((x) => x.id === archetype);
              return a ? (
                <p style={{ fontSize: 12.5, color: 'var(--color-neutral-400)', margin: '6px 0 0', maxWidth: '68ch' }}>
                  {a.desc} <span className="text-muted">Swaps {a.replaces.length} class feature{a.replaces.length === 1 ? '' : 's'} for its own — see them in the Advancement table.</span>
                </p>
              ) : null;
            })()}
          </div>
        )}
        {/* Body prose keeps a measure-based cap so lines stay readable on a wide window; the
            structured lists below are free to use the full panel. */}
        <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--color-neutral-300)', maxWidth: '68ch' }}>{view.desc}</p>

        <h6 style={{ margin: '18px 0 8px', color: 'var(--color-neutral-500)' }}>Level 1 features</h6>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '92ch' }}>
          {level1Features.map((f) => (
            <div key={f.id} style={{ fontSize: 13, lineHeight: 1.55 }}><span style={{ fontWeight: 500 }}>{f.name}</span> <span style={{ color: 'var(--color-neutral-400)' }}>— {f.desc}</span></div>
          ))}
        </div>

        {/* Favored class comes before the (often long) class-choice list so it stays easy to find. */}
        {selectedClass === view.id && (
          <>
            <h6 style={{ margin: '22px 0 8px', color: 'var(--color-neutral-500)' }}>
              <span className="term" onMouseEnter={tip.term('favored')} onMouseLeave={tip.leave} onClick={tip.term('favored')}>Favored class</span>
            </h6>
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

        {selectedClass === view.id && classSlots.length > 0 && (
          <>
            <h6 style={{ margin: '22px 0 8px', color: 'var(--color-neutral-500)' }}>Class choices</h6>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {classSlots.map((slot) => (
                <ChoiceSlotView key={slot.id} slot={slot} onToggle={toggleChoice} onAdd={addOne} onRemove={removeOne} />
              ))}
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

/** One class-choice slot: search box when the list is long, and unselectable options
 *  (e.g. domains a deity doesn't grant) sorted to the bottom. Closed lists only —
 *  feats keep their natural order elsewhere. */
function ChoiceSlotView({ slot, onToggle, onAdd, onRemove }: {
  slot: ChoiceSlot;
  onToggle: (slot: ChoiceSlot, id: string) => void;
  onAdd?: (slotId: string, id: string) => void;
  onRemove?: (slotId: string, id: string) => void;
}) {
  const [q, setQ] = useState('');
  const many = slot.options.length > 8;
  const query = q.trim().toLowerCase();
  const pointBuy = slot.pointBudget != null;
  const options = slot.options
    .filter((o) => !query || o.name.toLowerCase().includes(query))
    .slice()
    // Point-buy lists read best grouped by cost (cheap first); others keep legal-first, illegal sink.
    .sort((a, b) => pointBuy
      ? (Number(b.legal) - Number(a.legal)) || (Number(a.meta?.cost ?? 0) - Number(b.meta?.cost ?? 0)) || a.name.localeCompare(b.name)
      : Number(b.legal) - Number(a.legal));

  return (
    <div>
      <div style={{ fontSize: 12.5, marginBottom: 6 }}>
        {slot.label}{' '}
        {pointBuy
          ? <span className="text-muted" style={{ color: (slot.pointsSpent ?? 0) > slot.pointBudget! ? 'var(--warn)' : undefined }}>({slot.pointsSpent ?? 0}/{slot.pointBudget} points)</span>
          : <span className="text-muted">({slot.selected.length}/{slot.count})</span>}
      </div>
      {many && (
        <input className="input" style={{ width: 220, marginBottom: 8 }} placeholder={`Search ${slot.label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} />
      )}
      {/* Auto-fill grid: one column when narrow, more as the panel widens — long option lists
          (33 blessings/domains) otherwise stack into a very tall scroll. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 6, alignItems: 'start' }}>
        {options.map((o) => {
          if (pointBuy) {
            const count = slot.selected.filter((x) => x === o.id).length;
            // Repeatable evolutions get a stepper (0..n); one-shot ones a take/remove toggle.
            return o.meta?.multi === 1
              ? <EvolutionStepperRow key={o.id} option={o} count={count} onAdd={() => onAdd!(slot.id, o.id)} onRemove={() => onRemove!(slot.id, o.id)} />
              : <OptionCard key={o.id} option={o} selected={count > 0} onToggle={() => (count > 0 ? onRemove!(slot.id, o.id) : onAdd!(slot.id, o.id))} />;
          }
          return <OptionCard key={o.id} option={o} selected={slot.selected.includes(o.id)} onToggle={() => onToggle(slot, o.id)} />;
        })}
      </div>
    </div>
  );
}

/** A repeatable point-buy option (eidolon evolution taken more than once): stepper instead of a
 *  take/untake button. Mirrors OptionCard's styling. */
function EvolutionStepperRow({ option, count, onAdd, onRemove }: {
  option: SlotOption; count: number; onAdd: () => void; onRemove: () => void;
}) {
  return (
    <div className={`pick${count > 0 ? ' is-sel' : ''}${option.legal ? '' : ' is-disabled'}`} style={{ padding: '11px 13px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{option.name}</span>
        <span className="tag tag-neutral" style={{ fontSize: 10 }}>repeatable</span>
        <span style={{ flex: 1 }} />
        <Stepper value={count} onDec={onRemove} onInc={onAdd} canDec={count > 0} canInc={option.legal} />
      </div>
      {option.desc && <div style={{ fontSize: 12.5, color: 'var(--color-neutral-400)', marginTop: 3, lineHeight: 1.5 }}>{option.desc}</div>}
      {!option.legal && option.whyNot && <div style={{ fontSize: 11.5, color: 'var(--err)', marginTop: 5 }}>{option.whyNot}</div>}
    </div>
  );
}
