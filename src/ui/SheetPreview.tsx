import { useState } from 'react';
import { loadCharacter } from '../storage/store';
import { resolve } from '../engine/resolve';
import { ABILITIES, abilityMod, fmtMod, speedLabel, type Ability } from '../engine/types';
import { anyItemById, featById, spellById } from '../content/index';
import { navigate } from './App';
import { StatValue } from './StatValue';
import { ThemeToggle } from './ThemeToggle';
import { OfficialSheet } from './OfficialSheet';

export function SheetPreview({ id }: { id: string }) {
  const doc = loadCharacter(id);
  const [mode, setMode] = useState<'screen' | 'print'>('screen');
  if (!doc) return <div style={{ padding: 40 }}>Character not found. <button className="btn btn-ghost" onClick={() => navigate({ name: 'roster' })}>Back to roster</button></div>;
  const r = resolve(doc);
  const sheet = r.sheet;

  const ranks = (doc.decisions['skill-ranks'] as Record<string, number>) ?? {};
  const trainedSkills = sheet.skillIds.filter((sid) => ranks[sid] > 0);
  const feats = Object.values((doc.decisions['feats'] as Record<string, string | null>) ?? {}).filter(Boolean) as string[];
  const spellPicksByLevel = (doc.decisions['spell-picks'] as Record<number, string[]> | string[] | undefined);
  const spells: string[] = Array.isArray(spellPicksByLevel)
    ? spellPicksByLevel
    : Object.keys(spellPicksByLevel ?? {}).sort((a, b) => Number(a) - Number(b)).flatMap((k) => (spellPicksByLevel as Record<string, string[]>)[k]);
  const gear = Object.entries(doc.purchases).filter(([, q]) => q > 0);

  if (mode === 'print') return <OfficialSheet doc={doc} onExit={() => setMode('screen')} />;

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px' }}>
        <button onClick={() => navigate({ name: 'builder', id })} className="btn btn-ghost" style={{ fontSize: 12 }}>← Back to builder</button>
        <button onClick={() => navigate({ name: 'play', id })} className="btn btn-primary" style={{ fontSize: 12 }}>▶ Play</button>
        <span style={{ flex: 1 }} />
        <ThemeToggle />
        <div style={{ display: 'inline-flex', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {(['screen', 'print'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: '7px 14px', fontSize: 12.5, cursor: 'pointer', background: 'transparent', border: 'none', borderLeft: '1px solid var(--color-divider)', color: mode === m ? 'var(--color-accent)' : 'var(--color-text)', boxShadow: mode === m ? 'inset 0 0 0 1px var(--color-accent)' : 'none', fontFamily: 'inherit', textTransform: 'capitalize' }}>{m}</button>
          ))}
        </div>
      </div>

      <div className="sheet-body" style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 60px' }}>
        <h1 style={{ fontSize: 32, marginBottom: 2 }}>{doc.name}</h1>
        <p className="text-muted" style={{ fontSize: 14 }}>{sheet.summaryLine} · Speed {speedLabel(sheet.speed)}</p>

        <div style={{ display: 'flex', gap: 8, margin: '18px 0', flexWrap: 'wrap' }}>
          {ABILITIES.map((ab: Ability) => {
            const score = sheet.stats[`ability:${ab}`].total;
            return (
              <div key={ab} style={{ padding: '10px 16px', borderRadius: 8, background: 'var(--color-surface)', textAlign: 'center', minWidth: 80 }}>
                <div className="micro">{ab.toUpperCase()}</div>
                <div className="num" style={{ fontSize: 20, fontWeight: 600 }}>{score}</div>
                <div style={{ fontSize: 12, color: 'var(--color-accent-300)' }}>{fmtMod(abilityMod(score))}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          <Block title="Defense" rows={[['Hit Points', 'hp:max', 'plain'], ['Armor Class', 'ac', 'plain'], ['Touch', 'ac:touch', 'plain'], ['Flat-footed', 'ac:ff', 'plain']]} sheet={sheet} />
          <Block title="Saves" rows={[['Fortitude', 'save:fort', 'mod'], ['Reflex', 'save:ref', 'mod'], ['Will', 'save:will', 'mod']]} sheet={sheet} />
          <Block title="Offense" rows={[['BAB', 'bab', 'mod'], ['Melee', 'attack:melee', 'mod'], ['Ranged', 'attack:ranged', 'mod'], ['CMB', 'cmb', 'mod'], ['CMD', 'cmd', 'plain'], ['Initiative', 'init', 'mod']]} sheet={sheet} />
        </div>

        <Section title="Skills">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {trainedSkills.map((sid) => (
              <span key={sid} style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12.5, background: 'var(--color-surface)', border: '1px solid var(--color-divider)' }}>
                {sheet.stats[`skill:${sid}`].label} <strong><StatValue stat={sheet.stats[`skill:${sid}`]} mode="mod" /></strong>
              </span>
            ))}
            {trainedSkills.length === 0 && <span className="text-muted">No ranked skills.</span>}
          </div>
        </Section>

        <Section title="Feats">
          {feats.length ? feats.map((f) => <div key={f} style={{ fontSize: 13, lineHeight: 1.7 }}><strong>{featById.get(f)?.name}</strong> — {featById.get(f)?.benefit}</div>) : <span className="text-muted">None.</span>}
        </Section>

        {sheet.casting.length > 0 && (
          <Section title="Spells">
            {/* One line per casting class — a multiclass caster progresses in each separately. */}
            {sheet.casting.map((b) => (
              <div key={b.classId} className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>
                {sheet.casting.length > 1 && <strong>{b.className}: </strong>}
                Caster level {b.casterLevel}
                {b.diminished && <> · <span title="One fewer slot of each spell level per day">diminished</span></>}
                {b.diminishedKnown && <> · <span title="One fewer spell known of each level, including cantrips">−1 known/level</span></>}
                {b.slots && b.slots.some((n) => n > 0) && <> · slots/day {b.slots.map((n, l) => ({ n, l })).filter((s) => s.n > 0).map(({ n, l }) => `L${l}:${n}`).join('  ')}</>}
              </div>
            ))}
            <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Cantrips and 1st-level selections</div>
            {spells.length ? spells.map((s) => <div key={s} style={{ fontSize: 13, lineHeight: 1.7 }}>{spellById.get(s)?.name} <span className="text-muted">· {spellById.get(s)?.school}</span></div>) : <span className="text-muted">No spells chosen.</span>}
          </Section>
        )}

        <Section title="Gear">
          {gear.length ? gear.map(([gid, q]) => <div key={gid} style={{ fontSize: 13, lineHeight: 1.7 }}>{anyItemById(gid)?.name}{q > 1 ? ` ×${q}` : ''}</div>) : <span className="text-muted">Nothing purchased.</span>}
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 8 }}>Load {sheet.load.current} lb ({sheet.load.label}) · {sheet.gold} gp remaining</div>
        </Section>
      </div>
    </div>
  );
}

function Block({ title, rows, sheet }: { title: string; rows: [string, string, 'plain' | 'mod'][]; sheet: ReturnType<typeof resolve>['sheet'] }) {
  return (
    <div>
      <h6 style={{ margin: '0 0 8px', color: 'var(--color-neutral-500)' }}>{title}</h6>
      {rows.map(([label, statId, mode]) => {
        const stat = sheet.stats[statId];
        if (!stat) return null;
        return (
          <div key={statId} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 2px', fontSize: 13, borderBottom: '1px solid var(--color-divider)' }}>
            <span style={{ color: 'var(--color-neutral-400)' }}>{label}</span>
            <strong><StatValue stat={stat} mode={mode} label={label} /></strong>
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h6 style={{ margin: '0 0 8px', color: 'var(--color-neutral-500)' }}>{title}</h6>
      {children}
    </div>
  );
}
