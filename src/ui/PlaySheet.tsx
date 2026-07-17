import { loadCharacter } from '../storage/store';
import { newCharacter } from '../engine/character';
import { emptyPlayState, fmtMod, abilityMod, type PlayState } from '../engine/types';
import { CONDITIONS, conditionById, SPELLS, spellById, classById, skillById } from '../content/index';
import { useCharacter } from './useCharacter';
import { useTip } from './Tooltip';
import { navigate } from './App';

const SPELL_LEVEL = (l: number) => (l === 0 ? '0' : String(l));
const attackLabel = (bonuses: number[]) => bonuses.map(fmtMod).join('/');

export function PlaySheet({ id }: { id: string }) {
  const initial = loadCharacter(id) ?? newCharacter(id);
  const ch = useCharacter(initial);
  const tip = useTip();
  const { doc, resolution } = ch;
  const sheet = resolution.sheet;
  const play: PlayState = doc.play ?? emptyPlayState();

  // Open a stat's breakdown card (reuses the builder StatStrip tooltip infra).
  const statTip = (key: string, shown: string) => {
    const st = sheet.stats[key];
    return st ? tip.card({ kicker: 'Breakdown', title: `${st.label} ${shown}`, lines: st.lines, annotations: st.annotations }) : undefined;
  };

  // Functional update — reads the freshest play state so rapid clicks don't clobber each other.
  const updatePlay = (fn: (p: PlayState) => Partial<PlayState>) =>
    ch.patch((d) => { const p = { ...emptyPlayState(), ...d.play }; return { ...d, play: { ...p, ...fn(p) } }; });
  const setPlay = (patch: Partial<PlayState>) => updatePlay(() => patch);

  const maxHp = sheet.stats['hp:max']?.total ?? 0;
  const currentHp = maxHp - play.hpDamage;
  const damage = (n: number) => updatePlay((p) => {
    // Damage hits temp HP first, then real HP; healing reduces hpDamage (never above max).
    let remaining = n;
    let temp = p.tempHp;
    if (n > 0 && temp > 0) { const absorbed = Math.min(temp, remaining); temp -= absorbed; remaining -= absorbed; }
    return { hpDamage: Math.max(0, p.hpDamage + remaining), tempHp: temp };
  });

  const slots = sheet.spellSlots ?? [];
  const hasSlots = slots.some((n) => n > 0);
  const usedAt = (l: number) => play.usedSlots[l] ?? 0;
  const setUsed = (l: number, v: number) => updatePlay((p) => ({ usedSlots: { ...p.usedSlots, [l]: Math.max(0, v) } }));

  // Prepared casters (wizard/cleric/druid/magus/witch…) prepare specific spells into their slots.
  const klass = doc.decisions['class'] ? classById.get(doc.decisions['class'] as string) : undefined;
  const sc = klass?.spellcasting;
  const isPrepared = !!sc && sc.kind !== 'spontaneous';
  const spellsOnList = sc ? SPELLS.filter((s) => s.lists.includes(sc.list as never)) : [];
  const rawBook = doc.decisions['spell-picks'];
  const spellbook: Record<number, string[]> = Array.isArray(rawBook) ? { 1: rawBook as string[] } : ((rawBook as Record<number, string[]>) ?? {});
  // The pool preparable at a spell level: the whole class list (prepared-list) or the spellbook (book).
  const preparablePool = (level: number) =>
    (sc?.kind === 'prepared-book' ? (spellbook[level] ?? []).map((id) => spellById.get(id)!).filter(Boolean) : spellsOnList.filter((s) => s.level === level))
      .slice().sort((a, b) => a.name.localeCompare(b.name));

  const preparedAt = (l: number) => play.prepared?.[l] ?? [];
  const castAt = (l: number) => play.castPrepared?.[l] ?? [];
  const setPreparedAt = (l: number, i: number, spell: string) =>
    updatePlay((p) => { const arr = [...(p.prepared?.[l] ?? [])]; arr[i] = spell; return { prepared: { ...p.prepared, [l]: arr } }; });
  const toggleCast = (l: number, i: number) =>
    updatePlay((p) => { const set = new Set(p.castPrepared?.[l] ?? []); set.has(i) ? set.delete(i) : set.add(i); return { castPrepared: { ...p.castPrepared, [l]: [...set] } }; });

  const castMod = sc ? abilityMod(sheet.stats[`ability:${sc.ability}`]?.total ?? 10) : 0;
  const dcNote = `save DC 10 + spell level ${fmtMod(castMod)}`;

  const rest = () => setPlay({ hpDamage: 0, nonlethal: 0, tempHp: 0, usedSlots: {}, usedPools: {}, castPrepared: {} });

  const pools = sheet.pools;
  const usedPoolAt = (id: string) => play.usedPools[id] ?? 0;
  const setUsedPool = (id: string, v: number, max: number) =>
    updatePlay((p) => ({ usedPools: { ...p.usedPools, [id]: Math.max(0, Math.min(max, v)) } }));
  // Delta-based (reads fresh state) so rapid spend/restore clicks accumulate correctly.
  const adjustPool = (id: string, delta: number, max: number) =>
    updatePlay((p) => ({ usedPools: { ...p.usedPools, [id]: Math.max(0, Math.min(max, (p.usedPools[id] ?? 0) + delta)) } }));

  const ranks = (doc.decisions['skill-ranks'] as Record<string, number>) ?? {};
  const trainedSkills = sheet.skillIds.filter((sid) => (ranks[sid] ?? 0) > 0);

  const conditions = play.conditions;
  const toggleCondition = (id: string) =>
    updatePlay((p) => ({ conditions: p.conditions.includes(id) ? p.conditions.filter((x) => x !== id) : [...p.conditions, id] }));

  const hpColor = currentHp <= 0 ? 'var(--err)' : currentHp <= maxHp / 4 ? 'var(--warn-fg)' : 'var(--color-accent-300)';

  return (
    <div style={{ minHeight: '100vh', maxWidth: 920, margin: '0 auto', padding: '16px 24px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate({ name: 'roster' })}>← Roster</button>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{doc.name}</div>
          <div className="text-muted" style={{ fontSize: 13 }}>{sheet.summaryLine}</div>
        </div>
        <span style={{ flex: 1 }} />
        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => navigate({ name: 'builder', id })}>Edit build</button>
        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => navigate({ name: 'sheet', id })}>Sheet</button>
        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={rest} title="Clear damage and expended slots">🌙 Rest</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
        {/* HP tracker */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 18 }}>
          <div className="micro" style={{ marginBottom: 8 }}>Hit Points</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="num" style={{ fontSize: 44, fontWeight: 700, color: hpColor }}>{currentHp}</span>
            <span className="text-muted" style={{ fontSize: 18, cursor: 'pointer' }}
              onMouseEnter={statTip('hp:max', String(maxHp))} onMouseLeave={tip.leave} onClick={statTip('hp:max', String(maxHp))}
              title="max HP breakdown">/ {maxHp}</span>
            {play.tempHp > 0 && <span style={{ fontSize: 14, color: 'var(--color-accent-300)' }}>+{play.tempHp} temp</span>}
          </div>
          {currentHp <= 0 && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 2 }}>{currentHp <= -maxHp ? 'Dead' : 'Dying / disabled'}</div>}
          <div style={{ height: 8, borderRadius: 4, background: 'var(--color-neutral-800)', overflow: 'hidden', margin: '12px 0' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, (currentHp / maxHp) * 100))}%`, height: '100%', background: hpColor, transition: 'width .15s' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => damage(5)}>−5</button>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => damage(1)}>−1</button>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => damage(-1)}>+1</button>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => damage(-5)}>+5</button>
            <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setPlay({ hpDamage: 0 })}>full</button>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="text-muted">Temp HP</span>
              <input className="input" style={{ width: 52, padding: '3px 5px', textAlign: 'center' }} type="number" min={0} value={play.tempHp}
                onChange={(e) => setPlay({ tempHp: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="text-muted">Nonlethal</span>
              <input className="input" style={{ width: 52, padding: '3px 5px', textAlign: 'center' }} type="number" min={0} value={play.nonlethal}
                onChange={(e) => setPlay({ nonlethal: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            </label>
          </div>
        </div>

        {/* Quick defenses / offense (read-only from the sheet) */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 18 }}>
          <div className="micro" style={{ marginBottom: 10 }}>At a glance</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 8px' }}>
            {([['AC', 'ac', false], ['Touch', 'ac:touch', false], ['FF', 'ac:ff', false], ['Fort', 'save:fort', true], ['Ref', 'save:ref', true], ['Will', 'save:will', true], ['BAB', 'bab', true], ['Init', 'init', true], ['CMD', 'cmd', false]] as const).map(([label, key, mod]) => {
              const st = sheet.stats[key]; if (!st) return null;
              const shown = mod ? fmtMod(st.total) : String(st.total);
              const open = statTip(key, shown);
              return (
                <div key={key} onMouseEnter={open} onMouseLeave={tip.leave} onClick={open} style={{ cursor: 'pointer' }}>
                  <div className="micro">{label}</div>
                  <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{shown}</div>
                </div>
              );
            })}
          </div>
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 12 }}>Speed {sheet.speed.base} ft{sheet.casterLevel ? ` · caster level ${sheet.casterLevel}` : ''}</div>
        </div>
      </div>

      {/* Attacks (per equipped/carried weapon) */}
      {sheet.attacks.length > 0 && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 18, marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <div className="micro">Attacks</div>
            <span className="text-muted" style={{ fontSize: 11.5 }}>iteratives from BAB · hover an attack bonus for its breakdown · situational feats/magic not folded</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sheet.attacks.map((atk) => {
              const label = attackLabel(atk.bonuses);
              const open = tip.card({
                kicker: atk.kind === 'ranged' ? 'Ranged attack' : 'Melee attack',
                title: `${atk.name} ${label}`,
                lines: atk.attackLines,
                body: `Damage ${atk.damage} · crit ${atk.crit} · ${atk.dmgType}${atk.range ? ` · range ${atk.range} ft` : ''}`,
                annotations: atk.notes,
              });
              return (
                <div key={`${atk.slot}:${atk.id}`} onMouseEnter={open} onMouseLeave={tip.leave} onClick={open}
                  style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', cursor: 'pointer', padding: '4px 0', borderBottom: '1px solid rgba(233,233,237,.05)' }}>
                  <span style={{ width: 150, fontSize: 13.5, fontWeight: 500 }}>
                    {atk.name}
                    {atk.slot !== 'main' && <span className="text-muted" style={{ fontSize: 10.5, marginLeft: 5 }}>{atk.slot === 'off' ? 'off-hand' : 'carried'}</span>}
                  </span>
                  <span className="num" style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-accent-300)', minWidth: 84 }}>{label}</span>
                  <span className="num" style={{ fontSize: 13 }}>{atk.damage}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>{atk.crit} · {atk.dmgType}{atk.kind === 'ranged' && atk.range ? ` · ${atk.range} ft` : ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Skills (trained) */}
      {trainedSkills.length > 0 && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 18, marginTop: 18 }}>
          <div className="micro" style={{ marginBottom: 10 }}>Skills</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {trainedSkills.map((sid) => {
              const shown = fmtMod(sheet.stats[`skill:${sid}`]?.total ?? 0);
              const open = statTip(`skill:${sid}`, shown);
              return (
                <span key={sid} onMouseEnter={open} onMouseLeave={tip.leave} onClick={open}
                  style={{ padding: '5px 11px', borderRadius: 999, fontSize: 12.5, background: 'var(--color-neutral-800)', cursor: 'pointer' }}>
                  {skillById.get(sid)?.name} <span className="num" style={{ fontWeight: 600, color: 'var(--color-accent-300)' }}>{shown}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Resource pools */}
      {pools.length > 0 && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 18, marginTop: 18 }}>
          <div className="micro" style={{ marginBottom: 12 }}>Resources</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pools.map((pool) => {
              const used = usedPoolAt(pool.id);
              const remaining = pool.max - used;
              return (
                <div key={pool.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ width: 148, fontSize: 13, fontWeight: 500 }}>{pool.name}</span>
                  {pool.max <= 10 ? (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {Array.from({ length: pool.max }).map((_, i) => {
                        const spent = i < used;
                        return (
                          <button key={i} title={spent ? 'restore' : 'spend'}
                            onClick={() => setUsedPool(pool.id, spent ? i : i + 1, pool.max)}
                            style={{ width: 22, height: 22, borderRadius: 6, cursor: 'pointer', border: '1px solid var(--color-divider)', background: spent ? 'transparent' : 'var(--color-accent)', opacity: spent ? 0.5 : 1 }} />
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <button className="stepper" style={{ width: 26, height: 26 }} disabled={remaining <= 0} onClick={() => adjustPool(pool.id, 1, pool.max)}>−</button>
                      <button className="stepper" style={{ width: 26, height: 26 }} disabled={used <= 0} onClick={() => adjustPool(pool.id, -1, pool.max)}>+</button>
                    </div>
                  )}
                  <span className="num" style={{ fontSize: 14, fontWeight: 600, color: remaining <= 0 ? 'var(--warn-fg)' : undefined }}>{remaining}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>/ {pool.max} {pool.unit}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conditions */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 18, marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div className="micro">Conditions</div>
          {conditions.length > 0 && <span className="text-muted" style={{ fontSize: 11.5 }}>active penalties are folded into the stats above</span>}
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {CONDITIONS.map((c) => {
            const on = conditions.includes(c.id);
            return (
              <button key={c.id} onClick={() => toggleCondition(c.id)} title={c.desc}
                style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1px solid ${on ? 'var(--warn-fg)' : 'var(--color-divider)'}`,
                  background: on ? 'var(--warn)' : 'transparent',
                  color: on ? 'var(--warn-fg)' : 'var(--color-text)' }}>
                {c.name}
              </button>
            );
          })}
        </div>
        {conditions.length > 0 && (
          <div style={{ fontSize: 11.5, color: 'var(--color-neutral-400)', marginTop: 10, lineHeight: 1.6 }}>
            {conditions.map((id) => conditionById.get(id)?.desc).filter(Boolean).join(' ')}
          </div>
        )}
      </div>

      {/* Spontaneous casters: generic slot pips */}
      {hasSlots && !isPrepared && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 18, marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <div className="micro">Spell slots / day</div>
            <span className="text-muted" style={{ fontSize: 11.5 }}>{dcNote} · tap a pip to expend</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {slots.map((total, level) => {
              if (total <= 0) return null;
              const used = usedAt(level);
              return (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="micro" style={{ width: 62 }}>{level === 0 ? 'Cantrips' : `Level ${SPELL_LEVEL(level)}`}</span>
                  {level === 0 ? (
                    <span className="text-muted" style={{ fontSize: 12 }}>at will</span>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {Array.from({ length: total }).map((_, i) => {
                          const spent = i < used;
                          return (
                            <button key={i} title={spent ? 'restore' : 'expend'}
                              onClick={() => setUsed(level, spent ? i : i + 1)}
                              style={{ width: 22, height: 22, borderRadius: 6, cursor: 'pointer', border: '1px solid var(--color-divider)', background: spent ? 'transparent' : 'var(--color-accent)', opacity: spent ? 0.5 : 1 }} />
                          );
                        })}
                      </div>
                      <span className="num text-muted" style={{ fontSize: 12 }}>{total - used}/{total}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prepared casters: prepare a spell into each slot, then tick as cast */}
      {hasSlots && isPrepared && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 18, marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <div className="micro">Prepared spells</div>
            <span className="text-muted" style={{ fontSize: 11.5 }}>
              {dcNote} · {sc?.kind === 'prepared-book' ? 'prepare from your spellbook' : 'prepare from your class list'}, then tick as cast · cantrips at-will
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {slots.map((total, level) => {
              if (total <= 0 || level === 0) return null;
              const pool = preparablePool(level);
              const prep = preparedAt(level);
              const cast = new Set(castAt(level));
              return (
                <div key={level}>
                  <div className="micro" style={{ marginBottom: 6 }}>Level {level} · <span className="num">{total - cast.size}</span>/{total} unspent</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                    {Array.from({ length: total }).map((_, i) => {
                      const casted = cast.has(i);
                      const filled = !!prep[i];
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <select className="input" style={{ flex: 1, padding: '4px 6px', fontSize: 12, opacity: casted ? 0.5 : 1, textDecoration: casted ? 'line-through' : 'none' }}
                            value={prep[i] ?? ''} onChange={(e) => setPreparedAt(level, i, e.target.value)}>
                            <option value="">— empty —</option>
                            {pool.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                          </select>
                          <button className="btn btn-ghost" style={{ fontSize: 11, flex: 'none', color: casted ? 'var(--color-accent-300)' : undefined }}
                            disabled={!filled} title={casted ? 'restore' : 'mark cast'} onClick={() => toggleCast(level, i)}>
                            {casted ? '↺' : 'cast'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {sc?.kind === 'prepared-book' && Object.values(spellbook).flat().length === 0 && (
            <p className="text-muted" style={{ fontSize: 11.5, marginTop: 10 }}>Your spellbook is empty — add spells in the builder's Spells step, then prepare them here.</p>
          )}
        </div>
      )}

      <p className="text-muted" style={{ fontSize: 11, marginTop: 16 }}>Play state (HP, conditions, resources, prepared/expended spells) is saved with the character. Rest clears damage, resources, and cast spells.</p>
    </div>
  );
}
