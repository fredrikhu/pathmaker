import { Fragment, useMemo, type CSSProperties } from 'react';
import type { CharCtl } from '../../Builder';
import type { Ability } from '../../../engine/types';
import { ABILITIES, fmtMod } from '../../../engine/types';
import { fixedHpPerLevel } from '../../../engine/progression';
import { resolve } from '../../../engine/resolve';
import { CLASSES, classById, raceById } from '../../../content/index';
import { useTip } from '../../Tooltip';

type FcbChoice = 'hp' | 'skill' | 'alt';

const ABILITY_INCREASE_LEVELS = new Set([4, 8, 12, 16, 20]);

export function AdvancementStep({ ch }: { ch: CharCtl }) {
  const { doc, setDecision, resolution } = ch;
  const sheet = resolution.sheet;
  const tip = useTip();

  // Preview the whole 1–20 progression so you can see what later levels bring before committing.
  // Rows above the current target level are read-only (raise your level to edit them). Resolving at
  // 20 assumes future levels continue in the class you'd otherwise take — a planning view, not a lock.
  const previewProg = useMemo(
    () => (doc.level >= 20 ? sheet.progression : resolve({ ...doc, level: 20 }).sheet.progression),
    [doc, sheet.progression],
  );
  // Class-feature descriptions (per class) for the hover tooltips in the Features column.
  const featureDesc = useMemo(() => {
    const byClass = new Map<string, Map<string, string>>();
    for (const c of CLASSES) {
      const m = new Map<string, string>();
      for (const f of [...c.features1, ...(c.features ?? [])]) if (!m.has(f.name)) m.set(f.name, f.desc);
      byClass.set(c.id, m);
    }
    return byClass;
  }, []);
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

  // Per-level favored-class bonus (only when your favored class is this class).
  const favored = !!doc.decisions['favored-class'] && doc.decisions['favored-class'] === doc.decisions['class'];
  const overallFcb = (doc.decisions['fcb'] as FcbChoice | null) ?? null;
  const fcbByLevel = (doc.decisions['fcb-by-level'] as Record<number, FcbChoice>) ?? {};
  const setFcb = (level: number, val: FcbChoice) => setDecision('fcb-by-level', { ...fcbByLevel, [level]: val });
  // The race's alternative favored-class bonus for the favored class, if it has one.
  const raceForFcb = doc.decisions['race'] ? raceById.get(doc.decisions['race'] as string) : undefined;
  const fcbAlt = favored ? raceForFcb?.favoredClassBonuses?.[doc.decisions['class'] as string] : undefined;

  // The hit die belongs to the class taken at that level, not to the primary class.
  const dieAt = (level: number) => {
    const id = sheet.progression.find((r) => r.level === level)?.classId;
    return (id ? classById.get(id)?.hitDie : undefined) ?? klass.hitDie;
  };
  const rollHp = (level: number) => setHp(level, 1 + Math.floor(Math.random() * dieAt(level)));
  const rollAll = () => {
    const next = { ...hpRolls };
    for (let l = 2; l <= sheet.level; l++) next[l] = 1 + Math.floor(Math.random() * dieAt(l));
    setDecision('hp-rolls', next);
  };

  // Multiclassing: which class was taken at each character level. Stored as a full array so a
  // later level's class doesn't shift when an earlier one changes.
  const storedClassLevels = (doc.decisions['class-levels'] as (string | null)[] | undefined) ?? [];
  const classAt = (level: number) => storedClassLevels[level - 1] ?? (doc.decisions['class'] as string);
  const setClassAt = (level: number, id: string) => {
    const next = Array.from({ length: sheet.level }, (_, i) => storedClassLevels[i] ?? (doc.decisions['class'] as string));
    next[level - 1] = id;
    setDecision('class-levels', next);
  };
  // "Fighter 5 / Wizard 1" — read off the resolved rows so the UI does no counting of its own.
  const classSummary = sheet.progression.reduce<{ name: string; n: number }[]>((acc, r) => {
    if (!r.className) return acc;
    const hit = acc.find((x) => x.name === r.className);
    if (hit) hit.n += 1; else acc.push({ name: r.className, n: 1 });
    return acc;
  }, []).map((x) => `${x.name} ${x.n}`).join(' / ');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
        <h3 style={{ fontSize: 21, margin: 0 }}>Advancement</h3>
        <span className="text-muted" style={{ fontSize: 13 }}>{classSummary || `${klass.name} ${sheet.level}`} · <span className="num">{totalHp}</span> HP</span>
        {sheet.casting.map((b) => (
          <span key={b.classId} className="text-muted" style={{ fontSize: 13 }}>
            · {sheet.casting.length > 1 ? `${b.className} ` : ''}caster level <span className="num">{b.casterLevel}</span>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px', flexWrap: 'wrap' }}>
        <p className="text-muted" style={{ fontSize: 12, margin: 0, lineHeight: 1.5, maxWidth: '86ch' }}>
          1st level takes the maximum hit die; later levels default to that class's average (e.g. {avg} for a
          d{klass.hitDie}). Roll 🎲 or type a value to override any level. Ability score increases (levels 4, 8, 12, 16, 20)
          and a permanent Con boost raise hit points retroactively. Change the class on any level after the 1st to
          multiclass — each class keeps its own hit die, skill ranks, features and caster level.
        </p>
        {sheet.level > 1 && (
          <button className="btn btn-secondary" style={{ fontSize: 12 }} title={`Roll 1d${klass.hitDie} for levels 2–${sheet.level}`}
            onClick={rollAll}>🎲 Roll levels 2–{sheet.level}</button>
        )}
      </div>

      {/* One row per casting class — the two progressions are never merged into one. */}
      {sheet.casting.filter((b) => b.slots?.some((n) => n > 0)).map((b) => (
        <div key={b.classId} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap', fontSize: 12.5 }}>
          <span className="micro">{sheet.casting.length > 1 ? `${b.className} slots/day` : 'Spell slots/day'}</span>
          {b.slots!.map((n, lvl) => ({ n, lvl })).filter((s) => s.n > 0).map(({ n, lvl }) => (
            <span key={lvl} style={{ padding: '3px 9px', borderRadius: 6, background: 'var(--color-surface)' }}>
              <span className="text-muted">L{lvl}</span> <span className="num" style={{ fontWeight: 600 }}>{n}</span>
              {b.known && b.known[lvl] ? <span className="text-muted"> · {b.known[lvl]} known</span> : null}
              {/* The arcanist prepares a different number than it can cast. */}
              {b.preparedPerLevel && b.preparedPerLevel[lvl] ? <span className="text-muted"> · {b.preparedPerLevel[lvl]} prep</span> : null}
            </span>
          ))}
        </div>
      ))}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr className="micro" style={{ textAlign: 'left' }}>
              <th style={cell}>Lvl</th>
              <th style={{ ...cell, minWidth: 130 }}>Class</th>
              <th style={cell}>BAB</th>
              <th style={cell}>Fort</th>
              <th style={cell}>Ref</th>
              <th style={cell}>Will</th>
              <th style={{ ...cell, minWidth: 220 }}>Features &amp; feats</th>
              <th style={cell}>HP</th>
              {favored && <th style={cell}>FCB</th>}
              <th style={cell}>Ability +1</th>
            </tr>
          </thead>
          <tbody>
            {previewProg.map((row) => {
              const isFuture = row.level > doc.level;
              const descs = row.classId ? featureDesc.get(row.classId) : undefined;
              const featureCell = (row.features.length || row.featSlots.length) ? (
                <span>
                  {row.features.map((name, i) => {
                    const d = descs?.get(name);
                    const open = d ? tip.card({ kicker: 'Class feature', title: name, body: d }) : undefined;
                    return (
                      <span key={`f${i}`}>
                        {i > 0 ? ' · ' : ''}
                        {open
                          ? <span className="term" onMouseEnter={open} onMouseLeave={tip.leave} onClick={open}>{name}</span>
                          : name}
                      </span>
                    );
                  })}
                  {row.featSlots.map((f, i) => (
                    <span key={`s${i}`} className="text-muted">{(row.features.length || i > 0) ? ' · ' : ''}▸ {f}</span>
                  ))}
                </span>
              ) : <span className="text-muted">—</span>;
              return (
                <Fragment key={row.level}>
                  {isFuture && row.level === doc.level + 1 && (
                    <tr>
                      <td colSpan={favored ? 10 : 9} style={{ padding: '10px 10px 4px' }}>
                        <span className="micro" style={{ color: 'var(--color-accent)' }}>Preview — what later levels bring. Raise your level to edit these.</span>
                      </td>
                    </tr>
                  )}
                <tr style={{ borderTop: '1px solid var(--color-divider)', opacity: isFuture ? 0.6 : 1 }}>
                  <td style={{ ...cell, fontWeight: 600 }} className="num">{row.level}</td>
                  <td style={cell}>
                    {/* Pick the class taken at this level. Level 1 stays tied to the Class step,
                        so there is only ever one place to set the character's first class. */}
                    {isFuture || row.level === 1 ? (
                      <span className="text-muted">{row.className}</span>
                    ) : (
                      <select className="input" style={{ fontSize: 11.5, padding: '2px 4px', width: '100%' }}
                        value={classAt(row.level) ?? ''} onChange={(e) => setClassAt(row.level, e.target.value)}>
                        {CLASSES.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}{c.id === classAt(row.level) && row.classLevel ? ` ${row.classLevel}` : ''}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td style={cell} className="num">{fmtMod(row.bab)}</td>
                  <td style={cell} className="num">{fmtMod(row.fort)}</td>
                  <td style={cell} className="num">{fmtMod(row.ref)}</td>
                  <td style={cell} className="num">{fmtMod(row.will)}</td>
                  <td style={{ ...cell, color: 'var(--color-neutral-300)', whiteSpace: 'normal', minWidth: 220 }}>
                    {featureCell}
                  </td>
                  <td style={cell}>
                    {isFuture ? (
                      <span className="text-muted num" title="Average for this class — editable once you reach this level">
                        {row.level === 1 ? dieAt(row.level) : fixedHpPerLevel(dieAt(row.level))}
                      </span>
                    ) : (() => {
                      // 1st level defaults to the max die (RAW); later levels to the class average.
                      // The die is that of the class taken at *this* level, not the primary class.
                      const die = dieAt(row.level);
                      const fallback = row.level === 1 ? die : fixedHpPerLevel(die);
                      const overridden = hpRolls[row.level] != null && hpRolls[row.level] !== fallback;
                      return (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <input className="input" style={{ width: 44, padding: '3px 5px', textAlign: 'center' }} type="number" min={1} max={die}
                            value={hpRolls[row.level] ?? fallback}
                            onChange={(e) => {
                              const v = Math.max(1, Math.min(die, Math.round(Number(e.target.value) || fallback)));
                              setHp(row.level, v === fallback ? null : v);
                            }} />
                          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 5px' }}
                            title={`Roll 1d${die}`} onClick={() => rollHp(row.level)}>🎲</button>
                          {overridden && (
                            <button className="btn btn-ghost" style={{ fontSize: 10 }}
                              title={row.level === 1 ? 'Reset to max hit die' : 'Reset to class average'}
                              onClick={() => setHp(row.level, null)}>{row.level === 1 ? 'max' : 'avg'}</button>
                          )}
                        </span>
                      );
                    })()}
                  </td>
                  {favored && (
                    <td style={cell}>
                      {/* The bonus is earned only on levels taken in the favored class. */}
                      {isFuture || row.classId !== doc.decisions['favored-class'] ? <span className="text-muted">—</span> : (
                        <select className="input" style={{ padding: '3px 5px', fontSize: 12 }}
                          value={fcbByLevel[row.level] ?? overallFcb ?? ''}
                          onChange={(e) => setFcb(row.level, e.target.value as FcbChoice)}>
                          <option value="" disabled>choose…</option>
                          <option value="hp">+1 HP</option>
                          <option value="skill">+1 skill</option>
                          {fcbAlt && <option value="alt">Racial alt</option>}
                        </select>
                      )}
                    </td>
                  )}
                  <td style={cell}>
                    {!ABILITY_INCREASE_LEVELS.has(row.level) ? (
                      <span className="text-muted">—</span>
                    ) : isFuture ? (
                      <span className="num" style={{ color: 'var(--color-accent-300)' }} title="Ability score increase — choose when you reach this level">+1</span>
                    ) : (
                      <select className="input" style={{ padding: '3px 5px', fontSize: 12 }}
                        value={increases[row.level] ?? ''}
                        onChange={(e) => setIncrease(row.level, e.target.value as Ability)}>
                        <option value="" disabled>choose…</option>
                        {ABILITIES.map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {fcbAlt && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-neutral-400)', maxWidth: '80ch' }}>
          <span style={{ fontWeight: 500, color: 'var(--color-neutral-300)' }}>Racial favored-class alternative:</span>{' '}
          {fcbAlt.desc}. {fcbAlt.fraction ? `Takes ${fcbAlt.fraction} selections for one whole benefit.` : ''}
          {sheet.favoredClassAlt && (
            <span style={{ color: 'var(--color-accent-300)' }}>
              {' '}Taken ×{sheet.favoredClassAlt.count}
              {sheet.favoredClassAlt.fraction
                ? ` — ${sheet.favoredClassAlt.whole} complete (${sheet.favoredClassAlt.count % sheet.favoredClassAlt.fraction}/${sheet.favoredClassAlt.fraction} toward the next).`
                : `.`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const cell: CSSProperties = { padding: '7px 10px', verticalAlign: 'top', whiteSpace: 'nowrap' };
