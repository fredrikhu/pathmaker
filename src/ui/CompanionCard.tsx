// The companion stat block, rendered as a compact creature card. Shared by the builder's
// Advancement step and the play sheet so the two never drift — the engine has already done every
// piece of arithmetic, and this only lays it out.
//
// On the play sheet it also tracks the creature's own play state, because a companion takes damage
// and is shaken or entangled in its own right. That state belongs to the companion
// (`PlayState.companions[slotId]`): its hit points run through the same `vitals` rules as the
// character's — temporary hit points first, healing that also clears nonlethal damage, a death
// threshold at the *companion's* Constitution score — and its conditions are folded into the block
// by `resolveCompanion`, so the numbers above the chips already include them.

import { ABILITIES, fmtMod, speedLabel, type CompanionBlock, type CompanionPlayState } from '../engine/types';
import { vitals, takeLethal, takeNonlethal, heal } from '../engine/vitals';
import { CONDITIONS, conditionById } from '../content/index';

const KIND_KICKER: Record<CompanionBlock['kind'], string> = {
  animal: 'Animal companion',
  eidolon: 'Eidolon',
  familiar: 'Familiar',
};

/** The companion's own play state plus the way to change it. Absent in the builder, where the card
 *  is a preview of a creature that is not in play yet. */
export interface CompanionTracker {
  state: CompanionPlayState;
  onChange: (next: CompanionPlayState) => void;
}

/** A label/number pair, the unit this card is built out of. */
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div title={hint} style={{ minWidth: 54 }}>
      <div className="micro" style={{ fontSize: 9.5, opacity: 0.7 }}>{label}</div>
      <div className="num" style={{ fontSize: 16, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export function CompanionCard({ c, play }: { c: CompanionBlock; play?: CompanionTracker }) {
  // The class's own name for the companion leads; the kind is only added when it says something
  // more ("Mount · Animal companion"), never when the label already contains it ("Fused Eidolon").
  const kind = KIND_KICKER[c.kind];
  const kicker = c.label.toLowerCase().includes(kind.toLowerCase()) ? c.label : `${c.label} · ${kind}`;
  const evo = c.evolutions;
  // Every rule about what the numbers mean is the engine's; this reads the verdict.
  const vit = play
    ? vitals({ maxHp: c.hp, hpDamage: play.state.hpDamage, tempHp: play.state.tempHp, nonlethal: play.state.nonlethal, conScore: c.abilities.con })
    : null;
  const damage = (n: number) =>
    play?.onChange({ ...play.state, ...(n >= 0 ? takeLethal(play.state, n) : heal(play.state, -n)) });
  const hpColor = !vit ? undefined
    : vit.status === 'healthy' ? undefined
      : vit.status === 'staggered' ? 'var(--warn-fg)' : 'var(--err)';
  const active = play?.state.conditions ?? [];
  const toggleCondition = (id: string) => play?.onChange({
    ...play.state,
    conditions: active.includes(id) ? active.filter((x) => x !== id) : [...active, id],
  });

  return (
    <div className="mat-panel" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div className="micro">{kicker}</div>
        <div style={{ fontSize: 17, fontFamily: 'var(--font-heading)', fontWeight: 'var(--font-heading-weight)' as never }}>{c.name}</div>
        <span className="text-muted" style={{ fontSize: 11.5 }}>
          {c.size} · {c.hd} HD{c.hitDie ? ` (d${c.hitDie})` : ''} · effective level {c.level} ({c.className})
        </span>
      </div>

      {/* The numbers you reach for at the table, in the order a stat block prints them. */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label="HP" value={vit ? `${vit.current}/${c.hp}` : String(c.hp)}
          hint={vit ? `maximum ${c.hp}; dead at ${vit.deathAt} (its Constitution score)` : undefined} />
        <Stat label="AC" value={String(c.ac)} hint={`touch ${c.touch}, flat-footed ${c.flatFooted}, natural armour +${c.naturalArmor}`} />
        <Stat label="Touch" value={String(c.touch)} />
        <Stat label="Flat" value={String(c.flatFooted)} />
        <Stat label="Fort" value={fmtMod(c.fort)} />
        <Stat label="Ref" value={fmtMod(c.ref)} />
        <Stat label="Will" value={fmtMod(c.will)} />
        <Stat label="BAB" value={fmtMod(c.bab)} />
        <Stat label="CMB" value={fmtMod(c.cmb)} />
        <Stat label="CMD" value={String(c.cmd)} />
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        {ABILITIES.map((a) => (
          <div key={a} style={{ minWidth: 46 }}>
            <div className="micro" style={{ fontSize: 9.5, opacity: 0.7 }}>{a.toUpperCase()}</div>
            <div className="num" style={{ fontSize: 14 }}>
              {c.abilities[a]} <span style={{ color: 'var(--color-accent-300)' }}>{fmtMod(c.mods[a])}</span>
            </div>
          </div>
        ))}
      </div>

      {play && vit && (
        <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--color-divider)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="micro" style={{ marginRight: 2 }}>Hit points</span>
            <span className="num" style={{ fontSize: 20, fontWeight: 700, color: hpColor }}>{vit.current}</span>
            <span className="text-muted" style={{ fontSize: 12 }}>/ {c.hp}</span>
            {play.state.tempHp > 0 && <span style={{ fontSize: 11.5, color: 'var(--color-accent-300)' }}>+{play.state.tempHp} temp</span>}
            <button className="btn btn-secondary" style={{ fontSize: 11.5 }} onClick={() => damage(5)}>−5</button>
            <button className="btn btn-secondary" style={{ fontSize: 11.5 }} onClick={() => damage(1)}>−1</button>
            <button className="btn btn-secondary" style={{ fontSize: 11.5 }} onClick={() => damage(-1)}>+1</button>
            <button className="btn btn-secondary" style={{ fontSize: 11.5 }} onClick={() => damage(-5)}>+5</button>
            <button className="btn btn-secondary" style={{ fontSize: 11.5 }}
              title="take 5 nonlethal damage — tracked apart from hit points, and lethal once it reaches its maximum"
              onClick={() => play.onChange({ ...play.state, ...takeNonlethal(play.state, 5, c.hp) })}>−5 nl</button>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5 }}>
              <span className="text-muted">Temp</span>
              <input className="input" style={{ width: 46, padding: '2px 4px', textAlign: 'center', fontSize: 11.5 }}
                type="number" min={0} value={play.state.tempHp}
                onChange={(e) => play.onChange({ ...play.state, tempHp: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5 }}>
              <span className="text-muted">Nonlethal</span>
              <input className="input" style={{ width: 46, padding: '2px 4px', textAlign: 'center', fontSize: 11.5 }}
                type="number" min={0} value={play.state.nonlethal}
                onChange={(e) => play.onChange({ ...play.state, nonlethal: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            </label>
            <button className="btn btn-ghost" style={{ fontSize: 11 }} title="clear all damage — more than a night's rest heals"
              onClick={() => play.onChange({ ...play.state, hpDamage: 0, nonlethal: 0 })}>full</button>
          </div>
          {vit.status !== 'healthy' && (
            <div style={{ fontSize: 11.5, marginTop: 5, color: vit.status === 'staggered' ? 'var(--warn-fg)' : 'var(--err)' }}>
              <strong style={{ textTransform: 'capitalize' }}>{vit.status}</strong> — {vit.note}
              {vit.stabilize && ` DC ${vit.stabilize.dc} Con check to stabilize, at ${fmtMod(vit.stabilize.penalty)}.`}
            </div>
          )}
          {vit.nonlethalIsLethal && vit.status !== 'dead' && (
            <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
              Nonlethal damage has reached its maximum — further nonlethal damage counts as lethal.
            </div>
          )}

          {/* The creature's own conditions. A wolf can be entangled while its druid is not, so these
              are its own — and their penalties are already in the numbers above. */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
            <span className="micro" style={{ marginRight: 2 }}>Conditions</span>
            {CONDITIONS.map((cond) => {
              const on = active.includes(cond.id);
              return (
                <button key={cond.id} onClick={() => toggleCondition(cond.id)} title={cond.desc}
                  style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10.5, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1px solid ${on ? 'var(--warn-fg)' : 'var(--color-divider)'}`,
                    background: on ? 'var(--warn)' : 'transparent',
                    color: on ? 'var(--warn-fg)' : 'var(--color-neutral-400)' }}>
                  {cond.name}
                </button>
              );
            })}
          </div>
          {active.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--color-neutral-400)', marginTop: 6, lineHeight: 1.6 }}>
              <span style={{ color: 'var(--warn-fg)' }}>Folded into the numbers above.</span>{' '}
              {active.map((id) => conditionById.get(id)?.desc).filter(Boolean).join(' ')}
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 12.5, marginBottom: 10 }}>
        <span className="micro" style={{ marginRight: 8 }}>Speed</span>{speedLabel(c.speed)}
      </div>

      {c.attacks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div className="micro" style={{ marginBottom: 6 }}>Attacks</div>
          {c.attacks.map((a) => (
            <div key={a.name} style={{ fontSize: 13, marginBottom: 3 }}>
              {a.name} <span className="num" style={{ fontWeight: 600, color: 'var(--color-accent-300)' }}>{fmtMod(a.bonus)}</span>
              {' '}<span className="num">({a.damage})</span>
              {a.notes.length > 0 && <span className="text-muted" style={{ fontSize: 11.5 }}> — {a.notes.join('; ')}</span>}
            </div>
          ))}
        </div>
      )}

      {evo && (
        <div style={{ fontSize: 12.5, marginBottom: 10 }}>
          <span className="micro" style={{ marginRight: 8 }}>Evolutions</span>
          <span className="num" style={{ color: evo.spent > evo.budget ? 'var(--warn-fg)' : 'var(--color-accent-300)' }}>
            {evo.spent}/{evo.budget} points
          </span>
          <span className="text-muted"> · {evo.attackCount}/{evo.maxAttacks} attacks</span>
          {evo.free.length > 0 && <span className="text-muted"> · free: {evo.free.join(', ')}</span>}
        </div>
      )}

      {/* What the creature has that is not a number: table specials, senses, the skill/feat budget. */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
        {[...c.special, ...c.senses].map((s) => (
          <span key={s} style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11.5, background: 'var(--color-neutral-800)' }}>{s}</span>
        ))}
        {c.skillRanks > 0 && <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11.5, background: 'var(--color-neutral-800)' }}>{c.skillRanks} skill ranks</span>}
        {c.feats > 0 && <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11.5, background: 'var(--color-neutral-800)' }}>{c.feats} feats</span>}
        {c.tricks !== undefined && <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11.5, background: 'var(--color-neutral-800)' }}>{c.tricks} bonus tricks</span>}
        {c.intelligence !== undefined && <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11.5, background: 'var(--color-neutral-800)' }}>Int {c.intelligence}</span>}
      </div>

      {c.pendingAbilityIncreases > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--color-accent-300)', marginBottom: 6 }}>
          {c.pendingAbilityIncreases} ability score increase{c.pendingAbilityIncreases === 1 ? '' : 's'} to assign (+1 each).
        </div>
      )}

      {c.notes.length > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--color-neutral-400)', lineHeight: 1.6 }}>
          {c.notes.map((n) => <div key={n}>{n}</div>)}
        </div>
      )}
    </div>
  );
}
