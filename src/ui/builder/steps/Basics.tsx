import type { CharCtl } from '../../Builder';
import { ABILITIES, ALIGNMENTS, abilityMod, fmtMod, type Ability, type Alignment } from '../../../engine/types';
import { raceById, deityById, DEITIES, classById } from '../../../content/index';
import { TermSpan, useTip } from '../../Tooltip';

const POINT_BUY_COST: Record<number, number> = { 7: -4, 8: -2, 9: -1, 10: 0, 11: 1, 12: 2, 13: 3, 14: 5, 15: 7, 16: 10, 17: 13, 18: 17 };
const POINT_BUY_TOTAL: Record<string, number> = { pb15: 15, pb20: 20, pb25: 25 };
const METHODS: { id: CharCtl['doc']['abilityMethod']; label: string }[] = [
  { id: 'pb15', label: 'Point buy 15' }, { id: 'pb20', label: 'Point buy 20' }, { id: 'pb25', label: 'Point buy 25' },
  { id: 'roll', label: 'Roll 4d6' }, { id: 'manual', label: 'Manual' },
];
const AB_NAME: Record<Ability, string> = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

function withinOneStep(a: Alignment, b: Alignment): boolean {
  const axis = (al: Alignment): [number, number] => [al.includes('L') ? -1 : al.includes('C') ? 1 : 0, al.includes('G') ? -1 : al.includes('E') ? 1 : 0];
  const [la, ga] = axis(a); const [lb, gb] = axis(b);
  return Math.abs(la - lb) + Math.abs(ga - gb) <= 1;
}

export function BasicsStep({ ch }: { ch: CharCtl }) {
  const tip = useTip();
  const { doc, setDecision } = ch;
  const method = doc.abilityMethod;
  const isPB = method in POINT_BUY_TOTAL;
  const base = doc.decisions['ability-base'] as Record<Ability, number>;
  const raceId = doc.decisions['race'] as string | null;
  const race = raceId ? raceById.get(raceId) : undefined;
  const floating = (doc.decisions['floating-bonus'] as Ability[]) ?? [];
  const dualTalent = ((doc.decisions['alt-traits'] as string[]) ?? []).includes('human-dual-talent');
  const alignment = doc.decisions['alignment'] as Alignment | null;
  const deityId = (doc.decisions['deity'] as string | null) ?? 'none';
  const classId = doc.decisions['class'] as string | null;
  const klass = classId ? classById.get(classId) : undefined;

  const spent = ABILITIES.reduce((a, ab) => a + (POINT_BUY_COST[base[ab]] ?? 0), 0);
  const poolTotal = POINT_BUY_TOTAL[method] ?? 0;
  const poolLeft = poolTotal - spent;

  // The floating +2 applies only up to the allowed count (Dual Talent → 2, else 1). Any
  // leftover picks (e.g. after dropping Dual Talent) are shown as "excess" and don't apply,
  // matching the engine — which also raises an Issue to remove them.
  const cap = dualTalent ? 2 : 1;
  const appliedFloat = floating.slice(-cap);
  const racialFor = (ab: Ability): number => {
    if (!race) return 0;
    if (race.abilityMods === 'choice') return appliedFloat.includes(ab) ? 2 : 0;
    return race.abilityMods[ab] ?? 0;
  };
  const finalScore = (ab: Ability) => base[ab] + racialFor(ab);

  const setBase = (ab: Ability, delta: number) => {
    if (method === 'roll' || method === 'manual') {
      const v = base[ab] + delta;
      if (v < 3 || v > 18) return;
      setDecision('ability-base', { ...base, [ab]: v });
      return;
    }
    if (!isPB) return;
    const v = base[ab] + delta;
    if (v < 7 || v > 18) return;
    const cost = (POINT_BUY_COST[v] ?? 0) - (POINT_BUY_COST[base[ab]] ?? 0);
    if (cost > poolLeft) return;
    setDecision('ability-base', { ...base, [ab]: v });
  };

  const toggleFloating = (ab: Ability) => {
    const cap = dualTalent ? 2 : 1;
    let next = floating.includes(ab) ? floating.filter((x) => x !== ab) : [...floating, ab];
    if (next.length > cap) next = next.slice(next.length - cap);
    setDecision('floating-bonus', next);
  };

  const setMethod = (m: CharCtl['doc']['abilityMethod']) => {
    ch.patch((d) => ({ ...d, abilityMethod: m, updatedAt: new Date().toISOString() }));
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, maxWidth: 1120 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 'none', width: 280 }}>
        <h3 style={{ fontSize: 21, margin: 0 }}>Basics</h3>
        <div className="field">
          <label>Character name</label>
          <input className="input" value={doc.name} onChange={(e) => ch.patch((d) => ({ ...d, name: e.target.value }))} />
        </div>
        <div className="field">
          <label>Alignment <TermSpan id="alignment">?</TermSpan></label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, width: 210 }}>
            {ALIGNMENTS.map((al) => {
              const conflict = !!klass?.alignment && !klass.alignment.includes(al);
              const selected = alignment === al;
              // Hard-disable only for single-alignment classes (paladin = LG). The currently
              // selected cell always stays clickable, so changing class never silently rewrites
              // your alignment — the conflict shows as an Issue instead.
              const hardLock = !!klass?.alignment && klass.alignment.length === 1;
              const disabled = hardLock && conflict && !selected;
              const border = selected ? (conflict ? 'var(--warn)' : 'var(--color-accent)') : 'var(--color-divider)';
              const bg = selected ? (conflict ? 'var(--warn-bg)' : 'rgba(145,132,217,.12)') : 'transparent';
              const open = tip.card({
                kicker: conflict ? (disabled ? 'Not available' : 'Would raise an Issue') : 'Alignment',
                title: al,
                body: conflict
                  ? `A ${klass!.name.toLowerCase()} must be ${klass!.alignment!.join(' / ')}.` + (disabled ? '' : ` You can still choose ${al} — the conflict appears as an Issue, and nothing is lost if you change class later.`)
                  : `Set alignment to ${al}.`,
              });
              return (
                <button key={al} disabled={disabled} onClick={() => setDecision('alignment', al)}
                  onMouseEnter={conflict ? open : undefined} onMouseLeave={conflict ? tip.leave : undefined}
                  style={{ position: 'relative', padding: '8px 0', borderRadius: 7, border: `1px solid ${border}`, background: bg, color: 'var(--color-text)', fontSize: 12, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, fontFamily: 'inherit' }}>
                  {al}
                  {conflict && !disabled && <span style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: 999, background: 'var(--warn)' }} />}
                </button>
              );
            })}
          </div>
          {alignment && klass?.alignment && !klass.alignment.includes(alignment) && (
            <div style={{ fontSize: 11, color: 'var(--warn-fg)', marginTop: 6 }}>⚠ {klass.name} requires {klass.alignment.join(' / ')} — this shows as an Issue.</div>
          )}
        </div>
        <div className="field">
          <label>Deity <TermSpan id="deity">?</TermSpan></label>
          <select className="input" value={deityId} onChange={(e) => setDecision('deity', e.target.value)}>
            {DEITIES.map((d) => {
              const conflict = !!alignment && d.id !== 'none' && !withinOneStep(alignment, d.alignment);
              return <option key={d.id} value={d.id}>{d.name}{d.id !== 'none' ? ` (${d.alignment})` : ''}{conflict ? ' · ⚠ conflicts' : ''}</option>;
            })}
          </select>
          {(() => {
            const d = deityById.get(deityId);
            if (d && d.id !== 'none' && alignment && !withinOneStep(alignment, d.alignment))
              return <div style={{ fontSize: 11, color: 'var(--warn-fg)', marginTop: 6 }}>⚠ {d.name} ({d.alignment}) is more than one step from {alignment}.</div>;
            return null;
          })()}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 620 }}>
        <h3 style={{ fontSize: 21, margin: '0 0 12px' }}><TermSpan id="ability">Ability scores</TermSpan></h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '0 0 14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {METHODS.map((m) => (
              <button key={m.id} onClick={() => setMethod(m.id)}
                style={{ padding: '7px 12px', fontSize: 13, cursor: 'pointer', background: 'transparent', border: 'none', borderLeft: '1px solid var(--color-divider)', color: method === m.id ? 'var(--color-accent)' : 'var(--color-text)', boxShadow: method === m.id ? 'inset 0 0 0 1px var(--color-accent)' : 'none', fontFamily: 'inherit' }}>
                {m.label}
              </button>
            ))}
          </div>
          {isPB && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 110, height: 5, borderRadius: 3, background: 'var(--color-neutral-800)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((spent / poolTotal) * 100)}%`, height: '100%', background: poolLeft < 0 ? 'var(--err)' : 'var(--color-accent)' }} />
              </div>
              <span onMouseEnter={tip.term('pointbuy')} onMouseLeave={tip.leave} onClick={tip.term('pointbuy')} className="term" style={{ fontSize: 12, color: poolLeft < 0 ? 'var(--err)' : 'var(--color-accent-300)' }}>{poolLeft} of {poolTotal} points left</span>
              {ABILITIES.some((ab) => base[ab] !== 10) && (
                <button className="btn btn-ghost" style={{ fontSize: 11.5 }} title="Set every score back to 10"
                  onClick={() => setDecision('ability-base', { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 })}>↺ Reset</button>
              )}
            </div>
          )}
          {method === 'roll' && <span className="text-muted" style={{ fontSize: 12 }}>Enter your rolled scores with the steppers (4d6 drop lowest, range 3–18).</span>}
          {method === 'manual' && <span className="text-muted" style={{ fontSize: 12 }}>Manual entry — no pool, range 3–18.</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '150px 130px 60px 110px 60px 50px', gap: 8, padding: '0 4px 7px' }} className="micro">
          <span>Ability</span><span>Base</span><span>Cost</span><span><TermSpan id="racial">Racial</TermSpan></span><span>Score</span><span><TermSpan id="mod">Mod</TermSpan></span>
        </div>
        {ABILITIES.map((ab) => {
          const isFloatRace = race?.abilityMods === 'choice';
          const rv = racialFor(ab);
          const isExcessFloat = isFloatRace && rv === 0 && floating.includes(ab); // selected but over the cap
          return (
            <div key={ab} style={{ display: 'grid', gridTemplateColumns: '150px 130px 60px 110px 60px 50px', gap: 8, alignItems: 'center', padding: '7px 4px', borderBottom: '1px solid var(--color-divider)' }}>
              <span style={{ fontSize: 14 }}>{AB_NAME[ab]} <span className="text-muted" style={{ fontSize: 11 }}>{ab.toUpperCase()}</span></span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <button className="stepper" style={{ width: 26, height: 26 }} onClick={() => setBase(ab, -1)}>−</button>
                <span className="num" style={{ width: 22, textAlign: 'center', fontWeight: 600 }}>{base[ab]}</span>
                <button className="stepper" style={{ width: 26, height: 26 }} onClick={() => setBase(ab, 1)}>+</button>
              </span>
              <span className="num" style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>{isPB ? (POINT_BUY_COST[base[ab]] ?? 0) : '—'}</span>
              <span>
                {!race ? <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                  : isFloatRace ? (
                    <button onClick={() => toggleFloating(ab)}
                      title={isExcessFloat ? 'Extra pick — not applied. Click to remove.' : undefined}
                      style={rv ? { background: 'var(--color-accent-800)', color: 'var(--color-accent-100)', padding: '3px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: 'none', fontFamily: 'inherit' }
                        : isExcessFloat ? { background: 'var(--warn-bg)', color: 'var(--warn-fg)', padding: '3px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: 'none', fontFamily: 'inherit' }
                        : { color: 'var(--color-neutral-500)', background: 'transparent', border: '1px dashed var(--color-neutral-500)', padding: '3px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {rv ? `+2 ${race.name}` : isExcessFloat ? '⚠ +2 remove' : 'set +2'}
                    </button>
                  ) : <span className="num" style={{ fontSize: 13, color: rv ? 'var(--color-text)' : 'var(--color-neutral-500)' }}>{rv ? fmtMod(rv) : '—'}</span>}
              </span>
              <span className="num" style={{ fontSize: 16, fontWeight: 600 }}>{finalScore(ab)}</span>
              <span className="num" style={{ fontSize: 14, color: 'var(--color-accent-300)' }}>{fmtMod(abilityMod(finalScore(ab)))}</span>
            </div>
          );
        })}
        <p className="text-muted" style={{ fontSize: 11.5, marginTop: 12, maxWidth: 560 }}>
          {race?.abilityMods === 'choice'
            ? `${race.name}s gain +2 to ${dualTalent ? 'two abilities' : 'one ability'} — click a racial cell to move it. `
            : race ? `${race.name} racial modifiers are applied automatically. ` : 'Pick a race to see racial modifiers. '}
          Watch the strip above react — nothing is locked, come back anytime.
        </p>
      </div>
    </div>
  );
}
