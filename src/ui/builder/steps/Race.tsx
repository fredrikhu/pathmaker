import { useState } from 'react';
import type { CharCtl } from '../../Builder';
import { RACES, raceById } from '../../../content/index';
import { OptionCard } from '../bits';
import { useTip } from '../../Tooltip';

export function RaceStep({ ch }: { ch: CharCtl }) {
  const tip = useTip();
  const { doc, setDecision, resolution } = ch;
  const selectedRace = doc.decisions['race'] as string | null;
  const [viewId, setViewId] = useState<string>(selectedRace ?? 'human');
  const view = raceById.get(viewId)!;
  const altSlot = resolution.slots.find((s) => s.id === 'alt-traits');
  const chosenAlts = (doc.decisions['alt-traits'] as string[]) ?? [];
  const heritageSlot = resolution.slots.find((s) => s.id === 'heritage');
  const chosenHeritage = (doc.decisions['heritage'] as string | null) ?? null;

  const selectRace = (id: string) => {
    // Changing race: reset now-invalid alt-traits, floating bonus and heritage so they don't linger.
    if (id !== selectedRace) {
      setDecision('race', id);
      setDecision('alt-traits', []);
      setDecision('floating-bonus', []);
      setDecision('heritage', null);
    }
  };

  // Single-choice: picking the selected heritage again clears it, reverting to the default race.
  const selectHeritage = (id: string) => setDecision('heritage', chosenHeritage === id ? null : id);

  const toggleAlt = (altId: string) => {
    const next = chosenAlts.includes(altId) ? chosenAlts.filter((a) => a !== altId) : [...chosenAlts, altId];
    setDecision('alt-traits', next);
  };

  return (
    <div style={{ display: 'flex', gap: 28, height: '100%' }}>
      <div style={{ flex: 'none', width: 280, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <h3 style={{ fontSize: 21, margin: '0 0 12px' }}>Race</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, overflowY: 'auto', minHeight: 0, paddingRight: 6 }}>
          {RACES.map((r) => (
            <div key={r.id} role="button" tabIndex={0}
              onClick={() => setViewId(r.id)}
              onDoubleClick={() => selectRace(r.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setViewId(r.id); selectRace(r.id); } else if (e.key === ' ') { e.preventDefault(); setViewId(r.id); } }}
              title="Click to preview · double-click or Enter to select"
              className={`pick is-clickable${viewId === r.id ? ' is-sel' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{r.name}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{r.sub}</div>
              </div>
              {selectedRace === r.id && <span style={{ fontSize: 11, color: 'var(--color-accent-300)' }}>✓ selected</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Negative right margin pulls the scroll container into the Builder column's 26px padding so
          its scrollbar sits flush with the pane edge (see Class.tsx). */}
      <div style={{ padding: '4px 26px 4px 0', marginRight: -26, flex: 1, minWidth: 0, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <h3 style={{ fontSize: 24, margin: 0 }}>{view.name}</h3>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => selectRace(view.id)}>
            {selectedRace === view.id ? '✓ Selected' : 'Select race'}
          </button>
        </div>
        {/* Prose keeps a measure-based cap; the structured lists below use the full panel. */}
        <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--color-neutral-300)', maxWidth: '68ch' }}>{view.desc}</p>

        <h6 style={{ margin: '18px 0 8px', color: 'var(--color-neutral-500)' }}>Racial traits</h6>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '92ch' }}>
          {view.traits.map((t) => {
            const open = tip.card({ kicker: 'Racial trait', title: t.name, body: t.desc });
            return (
              <div key={t.id} style={{ fontSize: 13, lineHeight: 1.55 }}>
                <span className="term" onMouseEnter={open} onMouseLeave={tip.leave} onClick={open} style={{ fontWeight: 500 }}>{t.name}</span>
                <span style={{ color: 'var(--color-neutral-400)' }}> — {t.desc}</span>
              </div>
            );
          })}
        </div>

        {view.altTraits.length > 0 && (
          <>
            <h6 style={{ margin: '22px 0 8px', color: 'var(--color-neutral-500)' }}>Alternate racial traits</h6>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 8, alignItems: 'start' }}>
              {view.altTraits.map((a) => {
                const opt = altSlot?.options.find((o) => o.id === a.id);
                if (!opt) return null;
                return (
                  <OptionCard key={a.id} option={opt} selected={chosenAlts.includes(a.id)}
                    onToggle={() => toggleAlt(a.id)} replacesLabel={a.replaces.map((r) => raceById.get(view.id)!.traits.find((t) => t.id === r)?.name ?? r).join(', ')} />
                );
              })}
            </div>
            {view.id !== selectedRace && <p className="text-muted" style={{ fontSize: 11.5, marginTop: 10 }}>Select this race to choose its alternate traits.</p>}
          </>
        )}

        {view.heritages && view.heritages.length > 0 && (
          <>
            <h6 style={{ margin: '22px 0 8px', color: 'var(--color-neutral-500)' }}>Variant heritage</h6>
            <p className="text-muted" style={{ fontSize: 11.5, margin: '0 0 8px' }}>
              Pick one to replace the default ability spread ({view.sub}), the 1/day spell-like ability, and the two skill bonuses. Leave it unpicked for the standard {view.name}.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 8, alignItems: 'start' }}>
              {view.heritages.map((h) => {
                const opt = heritageSlot?.options.find((o) => o.id === h.id);
                const selected = chosenHeritage === h.id;
                const disabled = view.id !== selectedRace;
                return (
                  <div key={h.id} className={`pick${selected ? ' is-sel' : ''}${disabled ? ' is-disabled' : ''}`} style={{ padding: '11px 13px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1 }}>{h.name}</span>
                      <button className="btn btn-ghost" style={{ fontSize: 11.5 }} disabled={disabled} onClick={() => selectHeritage(h.id)}>
                        {selected ? '✓ Chosen' : 'Choose'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                      <span className="tag tag-neutral" style={{ fontSize: 10 }}>{String(opt?.meta?.abilities ?? '')}</span>
                      <span className="tag tag-neutral" style={{ fontSize: 10 }}>SLA: {h.spellLikeAbility.name}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--color-neutral-400)', marginTop: 5, lineHeight: 1.5 }}>{h.desc}</div>
                  </div>
                );
              })}
            </div>
            {view.id !== selectedRace && <p className="text-muted" style={{ fontSize: 11.5, marginTop: 10 }}>Select this race to choose a heritage.</p>}
          </>
        )}
      </div>
    </div>
  );
}
