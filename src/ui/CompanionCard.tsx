// The companion stat block, rendered as a compact creature card. Shared by the builder's
// Advancement step and the play sheet so the two never drift — the engine has already done every
// piece of arithmetic, and this only lays it out.

import { ABILITIES, fmtMod, speedLabel, type CompanionBlock } from '../engine/types';

const KIND_KICKER: Record<CompanionBlock['kind'], string> = {
  animal: 'Animal companion',
  eidolon: 'Eidolon',
  familiar: 'Familiar',
};

/** A label/number pair, the unit this card is built out of. */
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div title={hint} style={{ minWidth: 54 }}>
      <div className="micro" style={{ fontSize: 9.5, opacity: 0.7 }}>{label}</div>
      <div className="num" style={{ fontSize: 16, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export function CompanionCard({ c }: { c: CompanionBlock }) {
  // The class's own name for the companion leads; the kind is only added when it says something
  // more ("Mount · Animal companion"), never when the label already contains it ("Fused Eidolon").
  const kind = KIND_KICKER[c.kind];
  const kicker = c.label.toLowerCase().includes(kind.toLowerCase()) ? c.label : `${c.label} · ${kind}`;
  const evo = c.evolutions;

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
        <Stat label="HP" value={String(c.hp)} />
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
