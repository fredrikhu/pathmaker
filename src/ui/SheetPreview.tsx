import { useState } from 'react';
import { loadCharacter } from '../storage/store';
import { resolve } from '../engine/resolve';
import { ABILITIES, abilityMod, fmtMod, type Ability } from '../engine/types';
import { classById, anyItemById, featById, spellById } from '../content/index';
import { navigate } from './App';
import { StatValue } from './StatValue';

export function SheetPreview({ id }: { id: string }) {
  const doc = loadCharacter(id);
  const [mode, setMode] = useState<'screen' | 'print'>('screen');
  if (!doc) return <div style={{ padding: 40 }}>Character not found. <button className="btn btn-ghost" onClick={() => navigate({ name: 'roster' })}>Back to roster</button></div>;
  const r = resolve(doc);
  const sheet = r.sheet;
  const klass = (doc.decisions['class'] as string | null) ? classById.get(doc.decisions['class'] as string) : undefined;

  const ranks = (doc.decisions['skill-ranks'] as Record<string, number>) ?? {};
  const trainedSkills = sheet.skillIds.filter((sid) => ranks[sid] > 0);
  const feats = Object.values((doc.decisions['feats'] as Record<string, string | null>) ?? {}).filter(Boolean) as string[];
  const spells = (doc.decisions['spell-picks'] as string[]) ?? [];
  const gear = Object.entries(doc.purchases).filter(([, q]) => q > 0);

  if (mode === 'print') return <PrintSheet doc={doc} onExit={() => setMode('screen')} />;

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px' }}>
        <button onClick={() => navigate({ name: 'builder', id })} className="btn btn-ghost" style={{ fontSize: 12 }}>← Back to builder</button>
        <span style={{ flex: 1 }} />
        <div style={{ display: 'inline-flex', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {(['screen', 'print'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: '7px 14px', fontSize: 12.5, cursor: 'pointer', background: 'transparent', border: 'none', borderLeft: '1px solid var(--color-divider)', color: mode === m ? 'var(--color-accent)' : 'var(--color-text)', boxShadow: mode === m ? 'inset 0 0 0 1px var(--color-accent)' : 'none', fontFamily: 'inherit', textTransform: 'capitalize' }}>{m}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 60px' }}>
        <h1 style={{ fontSize: 32, marginBottom: 2 }}>{doc.name}</h1>
        <p className="text-muted" style={{ fontSize: 14 }}>{sheet.summaryLine}</p>

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

        {klass?.spellcasting && (
          <Section title="Spells">
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
          <div key={statId} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 2px', fontSize: 13, borderBottom: '1px solid rgba(233,233,237,.05)' }}>
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

// ---- Print rendition: A4 white page, ink on paper, no chrome. ----
function PrintSheet({ doc, onExit }: { doc: ReturnType<typeof loadCharacter> & object; onExit: () => void }) {
  const r = resolve(doc);
  const sheet = r.sheet;
  const ranks = (doc.decisions['skill-ranks'] as Record<string, number>) ?? {};
  const trained = sheet.skillIds.filter((sid) => ranks[sid] > 0);
  const feats = Object.values((doc.decisions['feats'] as Record<string, string | null>) ?? {}).filter(Boolean) as string[];
  const gear = Object.entries(doc.purchases).filter(([, q]) => q > 0);

  const stat = (id: string, mod = false) => { const s = sheet.stats[id]; if (!s) return '—'; return mod ? fmtMod(s.total) : String(s.total); };

  return (
    <div style={{ background: 'var(--color-neutral-900)', minHeight: '100vh', padding: 20 }}>
      <div className="no-print" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
        <button className="btn btn-secondary" onClick={onExit}>← Back to screen view</button>
        <button className="btn btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>
      <div className="print-page" style={{
        width: 794, minHeight: 1123, margin: '0 auto', background: 'var(--paper)', color: 'var(--ink)',
        padding: '15mm', boxShadow: '0 4px 24px rgba(0,0,0,.4)', fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `2px solid var(--ink)`, paddingBottom: 8 }}>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{doc.name}</div>
          <div style={{ fontSize: 13 }}>{sheet.summaryLine}</div>
        </div>

        <div style={{ display: 'flex', gap: 0, margin: '12px 0', border: `1px solid var(--ink-hairline)` }}>
          {ABILITIES.map((ab) => (
            <div key={ab} style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRight: `1px solid var(--ink-hairline)` }}>
              <div style={{ fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase' }}>{ab}</div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{sheet.stats[`ability:${ab}`].total}</div>
              <div style={{ fontSize: 11 }}>{fmtMod(abilityMod(sheet.stats[`ability:${ab}`].total))}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <PrintTable title="Defense" rows={[['Hit Points', stat('hp:max')], ['AC', stat('ac')], ['Touch', stat('ac:touch')], ['Flat-footed', stat('ac:ff')]]} />
          <PrintTable title="Saves & offense" rows={[['Fortitude', stat('save:fort', true)], ['Reflex', stat('save:ref', true)], ['Will', stat('save:will', true)], ['BAB', stat('bab', true)], ['Melee', stat('attack:melee', true)], ['CMD', stat('cmd')]]} />
        </div>

        <PrintList title="Skills" items={trained.map((sid) => `${sheet.stats[`skill:${sid}`].label} ${fmtMod(sheet.stats[`skill:${sid}`].total)}`)} />
        <PrintList title="Feats" items={feats.map((f) => featById.get(f)?.name ?? f)} />
        <PrintList title="Gear" items={gear.map(([g, q]) => `${anyItemById(g)?.name}${q > 1 ? ` ×${q}` : ''}`)} />

        <div style={{ marginTop: 20, borderTop: `1px solid var(--ink-hairline)`, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
          <span>Pathmaker · exported {new Date().toLocaleDateString()}</span>
          <span>Page 1</span>
        </div>
      </div>
    </div>
  );
}

function PrintTable({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: `1px solid var(--ink-hairline)` }}>
          <span>{k}</span><strong>{v}</strong>
        </div>
      ))}
    </div>
  );
}

function PrintList({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, lineHeight: 1.6 }}>{items.length ? items.join(' · ') : '—'}</div>
    </div>
  );
}
