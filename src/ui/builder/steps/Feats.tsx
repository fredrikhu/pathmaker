import { useState } from 'react';
import type { CharCtl } from '../../Builder';
import { featById, TRAITS } from '../../../content/index';
import type { ChoiceSlot, SlotOption } from '../../../engine/types';
import { WarnTag } from '../bits';

/** Level a feat slot opens at, parsed from its `-L<n>` suffix (bare keys are level 1). */
const slotLevel = (id: string): number => { const m = id.match(/-L(\d+)$/); return m ? Number(m[1]) : 1; };

export function FeatsStep({ ch }: { ch: CharCtl }) {
  const { doc, setDecision, resolution } = ch;
  const featSlots = resolution.slots.filter((s) => s.step === 'feats' && s.id.startsWith('feat'));
  const feats = (doc.decisions['feats'] as Record<string, string | null>) ?? {};
  const [query, setQuery] = useState('');
  const [typeFilter, setType] = useState<'All' | 'combat' | 'general'>('All');
  const [showIllegal, setShowIllegal] = useState(true);
  const [targetSlot, setTargetSlot] = useState<string | null>(null);

  // Union of all feat options (from the widest slot: the 1st-level feat slot).
  const generalSlot = featSlots.find((s) => s.id === 'feat-1') ?? featSlots[0];
  const allOptions: SlotOption[] = generalSlot?.options ?? [];

  const setFeat = (slotKey: string, featId: string | null) => setDecision('feats', { ...feats, [slotKey]: featId });

  const pick = (opt: SlotOption) => {
    if (!opt.legal) return;
    // If already selected somewhere, clear it.
    const existing = Object.entries(feats).find(([, v]) => v === opt.id);
    if (existing) { setFeat(existing[0], null); return; }
    // Route: explicit target if compatible & empty, else the first empty compatible slot by level;
    // never silently overwrite a full set. Combat-only restriction is already baked into slot.options.
    const compatible = (slot: ChoiceSlot) => slot.options.some((o) => o.id === opt.id);
    let key = targetSlot && !feats[targetSlot] && compatible(featSlots.find((s) => s.id === targetSlot)!) ? targetSlot : null;
    if (!key) {
      const sorted = [...featSlots].sort((a, b) => slotLevel(a.id) - slotLevel(b.id));
      key = sorted.find((s) => !feats[s.id] && compatible(s))?.id ?? null;
    }
    if (!key) return; // all compatible slots full — user must clear one
    setFeat(key, opt.id);
    setTargetSlot(null);
  };

  // Feat slots grouped by the level at which they open (parsed from the `-L<n>` key suffix).
  const levelGroups = new Map<number, ChoiceSlot[]>();
  for (const s of featSlots) {
    const l = slotLevel(s.id);
    if (!levelGroups.has(l)) levelGroups.set(l, []);
    levelGroups.get(l)!.push(s);
  }
  const groupLevels = [...levelGroups.keys()].sort((a, b) => a - b);

  const filtered = allOptions.filter((o) => {
    const f = featById.get(o.id)!;
    if (typeFilter !== 'All' && !f.types.includes(typeFilter)) return false;
    if (!showIllegal && !o.legal) return false;
    if (query && !f.name.toLowerCase().includes(query.toLowerCase()) && !f.benefit.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const allFull = featSlots.every((s) => feats[s.id]);

  // Traits
  const traits = (doc.decisions['traits'] as string[]) ?? [];
  const drawback = doc.decisions['drawback'] as string | null;
  const budget = 2 + (drawback ? 1 : 0);
  const toggleTrait = (id: string) => {
    const next = traits.includes(id) ? traits.filter((t) => t !== id) : [...traits, id];
    setDecision('traits', next);
  };

  return (
    <div style={{ maxWidth: 980 }}>
      <h3 style={{ fontSize: 21, margin: '0 0 12px' }}>Feats &amp; traits</h3>

      {groupLevels.map((lvl) => (
        <div key={lvl} style={{ marginBottom: 14 }}>
          {groupLevels.length > 1 && <div className="micro" style={{ marginBottom: 6, color: 'var(--color-accent-300)' }}>Level {lvl}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, maxWidth: 760 }}>
            {levelGroups.get(lvl)!.map((s) => {
              const fid = feats[s.id];
              const isTarget = targetSlot === s.id;
              return (
                <div key={s.id} onClick={() => setTargetSlot(isTarget ? null : s.id)}
                  style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-surface)', cursor: 'pointer', boxShadow: `inset 0 0 0 1px ${fid ? 'var(--color-divider)' : isTarget ? 'var(--color-accent)' : 'var(--color-accent-800)'}` }}>
                  <div className="micro" style={{ marginBottom: 3 }}>{s.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: fid ? 'var(--color-text)' : 'var(--color-neutral-600)' }}>{fid ? featById.get(fid)?.name : (isTarget ? 'Selecting…' : 'Empty')}</span>
                    <span style={{ flex: 1 }} />
                    {fid && <button onClick={(e) => { e.stopPropagation(); setFeat(s.id, null); }} style={{ background: 'transparent', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer', fontSize: 12 }}>✕</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {allFull && <p style={{ fontSize: 11.5, color: 'var(--warn-fg)', marginTop: -6, marginBottom: 12 }}>All feat slots are full — clear one to pick a different feat.</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <input className="input" style={{ width: 230 }} placeholder="Search feats…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['All', 'combat', 'general'] as const).map((t) => (
            <button key={t} onClick={() => setType(t)} style={{ padding: '5px 13px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: `1px solid ${typeFilter === t ? 'var(--color-accent)' : 'var(--color-divider)'}`, background: typeFilter === t ? 'rgba(145,132,217,.12)' : 'transparent', color: typeFilter === t ? 'var(--color-accent-300)' : 'var(--color-text)', fontFamily: 'inherit', textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>
        <button onClick={() => setShowIllegal(!showIllegal)} style={{ padding: '5px 13px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: '1px solid var(--color-divider)', background: 'transparent', color: showIllegal ? 'var(--color-neutral-400)' : 'var(--color-accent-300)', fontFamily: 'inherit' }}>{showIllegal ? 'Illegal shown dimmed' : 'Illegal hidden — show'}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {filtered.map((o) => {
          const f = featById.get(o.id)!;
          const selectedKey = Object.entries(feats).find(([, v]) => v === o.id)?.[0];
          return (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 8, background: 'var(--color-surface)', opacity: o.legal ? 1 : 0.55, boxShadow: `inset 0 0 0 1px ${selectedKey ? 'var(--color-accent)' : 'transparent'}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{f.name}</span>
                  {f.types.map((t) => <span key={t} className="tag tag-neutral" style={{ fontSize: 10 }}>{t}</span>)}
                  {f.reqText !== '—' && <span className="text-muted" style={{ fontSize: 11 }}>Requires {f.reqText}</span>}
                  <WarnTag option={o} />
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-neutral-400)', marginTop: 2 }}>{f.benefit}</div>
                {!o.legal && o.whyNot && <div style={{ fontSize: 11.5, color: 'var(--err)', marginTop: 3 }}>{o.whyNot}</div>}
              </div>
              <button className="btn btn-primary" style={{ fontSize: 11.5, flex: 'none' }} disabled={!o.legal && !selectedKey} onClick={() => pick(o)}>{selectedKey ? '✓ Selected' : 'Select'}</button>
            </div>
          );
        })}
      </div>

      <h3 style={{ fontSize: 18, margin: '28px 0 6px' }}>Traits</h3>
      <p className="text-muted" style={{ fontSize: 12, margin: '0 0 12px' }}>Choose 2 traits from different categories. Taking a drawback grants a third. ({traits.length}/{budget} used)</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
        {TRAITS.map((t) => {
          const selected = t.id === drawback || traits.includes(t.id);
          const isDrawback = t.category === 'drawback';
          return (
            <div key={t.id} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-surface)', boxShadow: `inset 0 0 0 1px ${selected ? 'var(--color-accent)' : 'transparent'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</span>
                <span className="tag tag-neutral" style={{ fontSize: 10 }}>{t.category}</span>
                <span style={{ flex: 1 }} />
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => isDrawback ? setDecision('drawback', drawback === t.id ? null : t.id) : toggleTrait(t.id)}>{selected ? '✓ Taken' : 'Take'}</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-neutral-400)', marginTop: 3, lineHeight: 1.5 }}>{t.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
