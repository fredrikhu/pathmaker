import type { CSSProperties } from 'react';
import type { CharCtl } from '../../Builder';
import type { Ability } from '../../../engine/types';
import { ABILITIES, fmtMod } from '../../../engine/types';
import { fixedHpPerLevel } from '../../../engine/progression';
import { classById } from '../../../content/index';

const ABILITY_INCREASE_LEVELS = new Set([4, 8, 12, 16, 20]);

export function AdvancementStep({ ch }: { ch: CharCtl }) {
  const { doc, setDecision, resolution } = ch;
  const sheet = resolution.sheet;
  const klass = doc.decisions['class'] ? classById.get(doc.decisions['class'] as string) : undefined;
  const hpRolls = (doc.decisions['hp-rolls'] as Record<number, number>) ?? {};
  const increases = (doc.decisions['ability-increases'] as Record<number, Ability>) ?? {};

  if (!klass) {
    return (
      <div style={{ maxWidth: 720 }}>
        <h3 style={{ fontSize: 21, margin: '0 0 8px' }}>Advancement</h3>
        <p className="text-muted" style={{ fontSize: 13 }}>Choose a class first — the level-by-level progression appears here.</p>
      </div>
    );
  }

  const avg = fixedHpPerLevel(klass.hitDie);
  const setHp = (level: number, value: number | null) => {
    const next = { ...hpRolls };
    if (value === null) delete next[level]; else next[level] = value;
    setDecision('hp-rolls', next);
  };
  const setIncrease = (level: number, ability: Ability) => {
    setDecision('ability-increases', { ...increases, [level]: ability });
  };

  const totalHp = sheet.stats['hp:max']?.total ?? 0;

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
        <h3 style={{ fontSize: 21, margin: 0 }}>Advancement</h3>
        <span className="text-muted" style={{ fontSize: 13 }}>{klass.name} {sheet.level} · <span className="num">{totalHp}</span> HP</span>
        {sheet.casterLevel ? <span className="text-muted" style={{ fontSize: 13 }}>· caster level <span className="num">{sheet.casterLevel}</span></span> : null}
      </div>
      <p className="text-muted" style={{ fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>
        Hit points default to the class average ({avg} for a d{klass.hitDie}); type a rolled value to override.
        Ability score increases (levels 4, 8, 12, 16, 20) and a permanent Con boost raise hit points retroactively.
      </p>

      {sheet.spellSlots && sheet.spellSlots.some((n) => n > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap', fontSize: 12.5 }}>
          <span className="micro">Spell slots/day</span>
          {sheet.spellSlots.map((n, lvl) => ({ n, lvl })).filter((s) => s.n > 0).map(({ n, lvl }) => (
            <span key={lvl} style={{ padding: '3px 9px', borderRadius: 6, background: 'var(--color-surface)' }}>
              <span className="text-muted">L{lvl}</span> <span className="num" style={{ fontWeight: 600 }}>{n}</span>
              {sheet.spellsKnown && sheet.spellsKnown[lvl] ? <span className="text-muted"> · {sheet.spellsKnown[lvl]} known</span> : null}
            </span>
          ))}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr className="micro" style={{ textAlign: 'left' }}>
              <th style={cell}>Lvl</th>
              <th style={cell}>BAB</th>
              <th style={cell}>Fort</th>
              <th style={cell}>Ref</th>
              <th style={cell}>Will</th>
              <th style={{ ...cell, minWidth: 220 }}>Features &amp; feats</th>
              <th style={cell}>HP</th>
              <th style={cell}>Ability +1</th>
            </tr>
          </thead>
          <tbody>
            {sheet.progression.map((row) => {
              const gains = [...row.features, ...row.featSlots.map((f) => `▸ ${f}`)];
              return (
                <tr key={row.level} style={{ borderTop: '1px solid rgba(233,233,237,.07)' }}>
                  <td style={{ ...cell, fontWeight: 600 }} className="num">{row.level}</td>
                  <td style={cell} className="num">{fmtMod(row.bab)}</td>
                  <td style={cell} className="num">{fmtMod(row.fort)}</td>
                  <td style={cell} className="num">{fmtMod(row.ref)}</td>
                  <td style={cell} className="num">{fmtMod(row.will)}</td>
                  <td style={{ ...cell, color: 'var(--color-neutral-300)' }}>
                    {gains.length ? gains.join(' · ') : <span className="text-muted">—</span>}
                  </td>
                  <td style={cell}>
                    {row.level === 1 ? (
                      <span className="num" title="Level 1 always takes the maximum hit die">{klass.hitDie}<span className="text-muted" style={{ fontSize: 10 }}> max</span></span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <input className="input" style={{ width: 44, padding: '3px 5px', textAlign: 'center' }} type="number" min={1} max={klass.hitDie}
                          value={hpRolls[row.level] ?? avg}
                          onChange={(e) => {
                            const v = Math.max(1, Math.min(klass.hitDie, Math.round(Number(e.target.value) || avg)));
                            setHp(row.level, v === avg ? null : v);
                          }} />
                        {hpRolls[row.level] != null && hpRolls[row.level] !== avg && (
                          <button className="btn btn-ghost" style={{ fontSize: 10 }} title="Reset to class average" onClick={() => setHp(row.level, null)}>avg</button>
                        )}
                      </span>
                    )}
                  </td>
                  <td style={cell}>
                    {ABILITY_INCREASE_LEVELS.has(row.level) ? (
                      <select className="input" style={{ padding: '3px 5px', fontSize: 12 }}
                        value={increases[row.level] ?? ''}
                        onChange={(e) => setIncrease(row.level, e.target.value as Ability)}>
                        <option value="" disabled>choose…</option>
                        {ABILITIES.map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                      </select>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cell: CSSProperties = { padding: '7px 10px', verticalAlign: 'top', whiteSpace: 'nowrap' };
