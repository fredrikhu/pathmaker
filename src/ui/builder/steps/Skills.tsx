import { useState } from 'react';
import type { CharCtl } from '../../Builder';
import { SKILLS, skillById } from '../../../content/index';
import type { Ability } from '../../../engine/types';
import { StatValue } from '../../StatValue';
import { TermSpan } from '../../Tooltip';

export function SkillsStep({ ch }: { ch: CharCtl }) {
  const { doc, setDecision, resolution } = ch;
  const sheet = resolution.sheet;
  const ranks = (doc.decisions['skill-ranks'] as Record<string, number>) ?? {};
  const classSet = new Set(sheet.classSkillIds);
  const acpSet = new Set(sheet.acpSkillIds);
  const left = sheet.skillRanksTotal - sheet.skillRanksSpent;
  const [classOnly, setClassOnly] = useState(false);
  const [query, setQuery] = useState('');

  const setRank = (id: string, v: number) => {
    const next = { ...ranks };
    if (v <= 0) delete next[id]; else next[id] = v;
    setDecision('skill-ranks', next);
  };

  const q = query.trim().toLowerCase();
  const visible = SKILLS.filter((sk) => {
    if (q && !sk.name.toLowerCase().includes(q)) return false;
    // "Class skills only" is a view filter — but never hide a cross-class skill that already
    // has ranks invested, so the player can't lose sight of it.
    if (classOnly && !classSet.has(sk.id) && (ranks[sk.id] ?? 0) === 0) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 21, margin: 0 }}>Skills</h3>
        <span style={{ fontSize: 12, color: left > 0 ? 'var(--warn)' : left < 0 ? 'var(--err)' : 'var(--color-accent-300)' }}><strong>{left}</strong> of {sheet.skillRanksTotal} ranks left</span>
        <input className="input" style={{ width: 180 }} placeholder="Search skills…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="radio" style={{ fontSize: 12.5 }}>
          <input type="checkbox" checked={classOnly} onChange={(e) => setClassOnly(e.target.checked)} />
          <span className="dot" />
          Class skills only
        </label>
        <span className="text-muted" style={{ fontSize: 11.5 }}>● = <TermSpan id="classskill">class skill</TermSpan> · ▲ = <TermSpan id="acp">armor check penalty</TermSpan></span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 56px 140px 70px 70px 1fr', gap: 8, padding: '0 4px 7px' }} className="micro">
        <span>Skill</span><span>Abil</span><span><TermSpan id="rank">Ranks</TermSpan></span><span></span><span>Total</span><span></span>
      </div>
      {visible.map((sk) => {
        const stat = sheet.stats[`skill:${sk.id}`];
        const r = ranks[sk.id] ?? 0;
        const trainedUnusable = sk.trainedOnly && r === 0;
        return (
          <div key={sk.id} style={{ display: 'grid', gridTemplateColumns: '260px 56px 140px 70px 70px 1fr', gap: 8, alignItems: 'center', padding: '6px 4px', borderBottom: '1px solid rgba(233,233,237,.06)' }}>
            <span style={{ fontSize: 13.5 }}>{sk.name} {classSet.has(sk.id) && <span style={{ color: 'var(--color-accent)', fontSize: 10 }}>●</span>} {acpSet.has(sk.id) && <span style={{ color: 'var(--color-neutral-500)', fontSize: 10 }}>▲</span>}</span>
            <span className="text-muted" style={{ fontSize: 12 }}>{(sk.ability as Ability).toUpperCase()}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <button className="stepper" style={{ width: 24, height: 24 }} disabled={r <= 0} onClick={() => setRank(sk.id, r - 1)}>−</button>
              <span className="num" style={{ width: 18, textAlign: 'center', fontWeight: 600 }}>{r}</span>
              <button className="stepper" style={{ width: 24, height: 24 }} disabled={r >= 1 || left <= 0} onClick={() => setRank(sk.id, r + 1)}>+</button>
            </span>
            <button className="btn btn-ghost" style={{ fontSize: 11, justifyContent: 'flex-start' }} disabled={r >= 1 || left <= 0} onClick={() => setRank(sk.id, 1)}>Max</button>
            {trainedUnusable ? <span className="text-muted num" style={{ fontSize: 13 }}>—</span> : <StatValue stat={stat} mode="mod" />}
            <span className="text-muted" style={{ fontSize: 10.5 }}>{trainedUnusable ? 'trained only' : (skillById.get(sk.id)?.trainedOnly ? '' : '')}</span>
          </div>
        );
      })}
      <p className="text-muted" style={{ fontSize: 11.5, marginTop: 12 }}>Max ranks per skill = character level (1). Click any total for its breakdown.</p>
    </div>
  );
}
