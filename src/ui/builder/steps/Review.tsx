import type { CharCtl } from '../../Builder';
import { ABILITIES, abilityMod, fmtMod, type Ability } from '../../../engine/types';
import { exportCharacter } from '../../../storage/store';
import { navigate } from '../../App';
import { StatValue } from '../../StatValue';

export function ReviewStep({ ch, onGoto }: { ch: CharCtl; onGoto: (s: string) => void }) {
  const { doc, resolution } = ch;
  const sheet = resolution.sheet;
  const errors = resolution.issues.filter((i) => i.severity === 'error');

  const defense = ['hp:max', 'ac', 'ac:touch', 'ac:ff'];
  const offense = ['save:fort', 'save:ref', 'save:will', 'bab', 'attack:melee', 'cmb', 'cmd'];
  const trainedSkills = sheet.skillIds.filter((id) => (doc.decisions['skill-ranks'] as Record<string, number> ?? {})[id] > 0);

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 24, margin: 0 }}>{doc.name}</h3>
        <span className="text-muted" style={{ fontSize: 13 }}>{sheet.summaryLine}</span>
        <span style={{ flex: 1 }} />
        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => exportCharacter(doc)}>Export JSON</button>
        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => navigate({ name: 'sheet', id: doc.id })}>Open sheet preview</button>
      </div>
      <p className="text-muted" style={{ fontSize: 12, margin: '0 0 18px' }}>Every number below is clickable — hover to peek at its breakdown, click to pin.</p>

      {errors.length > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'color-mix(in srgb, var(--err) 12%, transparent)', marginBottom: 18 }}>
          <div style={{ fontSize: 12.5, color: 'var(--err)', marginBottom: 6 }}>{errors.length} thing{errors.length === 1 ? '' : 's'} to resolve before this character is legal:</div>
          {errors.map((e, i) => (
            <div key={i} style={{ fontSize: 12.5, cursor: 'pointer' }} onClick={() => onGoto(e.step)}>· {e.message}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {ABILITIES.map((ab: Ability) => {
          const score = sheet.stats[`ability:${ab}`].total;
          return (
            <div key={ab} style={{ padding: '9px 14px', borderRadius: 8, background: 'var(--color-surface)', textAlign: 'center', minWidth: 74 }}>
              <div className="micro">{ab.toUpperCase()}</div>
              <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{score}</div>
              <div style={{ fontSize: 12, color: 'var(--color-accent-300)' }}>{fmtMod(abilityMod(score))}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 22, marginBottom: 20 }}>
        <StatColumn title="Defense" ids={defense} sheet={sheet} />
        <StatColumn title="Saves & offense" ids={offense} sheet={sheet} />
        <div>
          <h6 style={{ margin: '0 0 8px', color: 'var(--color-neutral-500)' }}>Trained skills</h6>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {trainedSkills.length === 0 && <span className="text-muted" style={{ fontSize: 12.5 }}>None yet</span>}
            {trainedSkills.map((id) => (
              <span key={id} style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12.5, background: 'var(--color-surface)', border: '1px solid var(--color-divider)' }}>
                {sheet.stats[`skill:${id}`].label} <strong><StatValue stat={sheet.stats[`skill:${id}`]} mode="mod" /></strong>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatColumn({ title, ids, sheet }: { title: string; ids: string[]; sheet: CharCtl['resolution']['sheet'] }) {
  return (
    <div>
      <h6 style={{ margin: '0 0 8px', color: 'var(--color-neutral-500)' }}>{title}</h6>
      {ids.map((id) => {
        const stat = sheet.stats[id];
        if (!stat) return null;
        const mode = id.startsWith('save') || id === 'bab' || id.startsWith('attack') || id === 'cmb' ? 'mod' : 'plain';
        return (
          <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 2px', fontSize: 13, borderBottom: '1px solid rgba(233,233,237,.05)' }}>
            <span style={{ color: 'var(--color-neutral-400)' }}>{stat.label}</span>
            <strong><StatValue stat={stat} mode={mode as 'mod' | 'plain'} /></strong>
          </div>
        );
      })}
    </div>
  );
}
