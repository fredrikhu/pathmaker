import { useState } from 'react';
import type { CharCtl } from '../../Builder';
import { spellById, SPELLS, classById } from '../../../content/index';
import { TermSpan } from '../../Tooltip';

export function SpellsStep({ ch }: { ch: CharCtl }) {
  const { doc, setDecision, resolution } = ch;
  const slot = resolution.slots.find((s) => s.id === 'spell-picks');
  const classId = doc.decisions['class'] as string | null;
  const klass = classId ? classById.get(classId) : undefined;
  const picks = (doc.decisions['spell-picks'] as string[]) ?? [];
  const [levelFilter, setLevel] = useState<number | 'all'>('all');
  const [schoolFilter, setSchool] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [viewId, setViewId] = useState<string | null>(null);

  if (!slot || !klass?.spellcasting) return <div>No spellcasting for this class.</div>;

  const list = klass.spellcasting.list;
  const spellsOnList = SPELLS.filter((s) => s.lists.includes(list as never));
  const schools = [...new Set(spellsOnList.map((s) => s.school))].sort();
  const opposedNames = new Set(slot.options.filter((o) => o.caution).map((o) => o.name));
  const isOpposedSchool = (school: string) => spellsOnList.some((s) => s.school === school && opposedNames.has(s.name));

  const cantrips = spellsOnList.filter((s) => s.level === 0);
  const picked = new Set(picks);
  const full = picks.length >= slot.count;

  const toggle = (id: string) => {
    if (picked.has(id)) setDecision('spell-picks', picks.filter((p) => p !== id));
    else if (!full) setDecision('spell-picks', [...picks, id]);
  };

  const rows = slot.options.filter((o) => {
    const sp = spellById.get(o.id)!;
    if (levelFilter !== 'all' && sp.level !== levelFilter) return false;
    if (schoolFilter !== 'all' && sp.school !== schoolFilter) return false;
    if (query && !sp.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const view = viewId ? spellById.get(viewId) : null;
  const prepared = klass.spellcasting.kind === 'prepared-book';

  return (
    <div style={{ display: 'flex', gap: 24, maxWidth: 1120 }}>
      <div style={{ flex: 1, minWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 21, margin: 0 }}>Spells</h3>
          <span style={{ fontSize: 12, color: full ? 'var(--color-accent-300)' : 'var(--warn)' }}>{slot.label}</span>
        </div>

        {/* Slot cards */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          {prepared && (
            <div style={{ padding: '9px 14px', borderRadius: 8, background: 'var(--color-surface)', minWidth: 180 }}>
              <div className="micro"><TermSpan id="cantrip">Cantrips</TermSpan></div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>All {cantrips.length} in spellbook <span className="text-muted" style={{ fontSize: 11, fontWeight: 400 }}>· automatic</span></div>
            </div>
          )}
          <div style={{ padding: '9px 14px', borderRadius: 8, background: 'var(--color-surface)', minWidth: 180, boxShadow: full ? 'none' : 'inset 0 0 0 1px var(--color-accent-800)' }}>
            <div className="micro">{prepared ? '1st-level spellbook' : '1st-level known'}</div>
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{picks.length} of {slot.count} picked</div>
            <div style={{ width: 140, height: 4, borderRadius: 3, background: 'var(--color-neutral-800)', overflow: 'hidden', marginTop: 6 }}>
              <div style={{ width: `${Math.round((picks.length / slot.count) * 100)}%`, height: '100%', background: 'var(--color-accent)' }} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <input className="input" style={{ width: 190 }} placeholder="Search spells…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div style={{ display: 'flex', gap: 5 }}>
            {(['all', 0, 1] as const).map((l) => (
              <button key={String(l)} onClick={() => setLevel(l)} style={chip(levelFilter === l)}>{l === 'all' ? 'All levels' : l === 0 ? 'Cantrips' : `Level ${l}`}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <button onClick={() => setSchool('all')} style={chip(schoolFilter === 'all')}>All schools</button>
            {schools.map((s) => (
              <button key={s} onClick={() => setSchool(s)} style={chip(schoolFilter === s)}>{s}{isOpposedSchool(s) ? ' ⚠' : ''}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {rows.map((o) => {
            const sp = spellById.get(o.id)!;
            const isPicked = picked.has(o.id);
            const auto = sp.level === 0 && prepared;
            return (
              <div key={o.id} onClick={() => setViewId(o.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface)', cursor: 'pointer', boxShadow: `inset 0 0 0 1px ${viewId === o.id ? 'var(--color-accent)' : isPicked ? 'var(--color-accent-800)' : 'transparent'}` }}>
                <span className="num" style={{ width: 16, fontSize: 13, color: 'var(--color-neutral-500)', flex: 'none' }}>{sp.level}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{sp.name}</span>
                    <span className="tag tag-neutral" style={{ fontSize: 10 }}>{sp.school}</span>
                    {o.caution && <span className="warn-tag">⚠ opposed — double slot</span>}
                  </div>
                  <div className="text-muted" style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.summary}</div>
                </div>
                {auto ? <span className="text-muted" style={{ fontSize: 11, flex: 'none' }}>in spellbook</span>
                  : <button className="btn btn-ghost" style={{ fontSize: 11.5, flex: 'none' }} disabled={!isPicked && full} onClick={(e) => { e.stopPropagation(); toggle(o.id); }}>{isPicked ? '✓ In book' : full ? 'Picks full' : 'Add'}</button>}
              </div>
            );
          })}
        </div>
        <p className="text-muted" style={{ fontSize: 11, marginTop: 8 }}>Core-rulebook spells shown. Opposition-school spells are selectable — they simply cost two slots to prepare.</p>
      </div>

      {/* Detail pane */}
      <div style={{ flex: 'none', width: 340, position: 'sticky', top: 12, alignSelf: 'flex-start' }}>
        {view ? (
          <div style={{ background: 'var(--color-surface)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 500 }}>{view.name}</div>
            <div style={{ display: 'flex', gap: 6, margin: '6px 0 10px', flexWrap: 'wrap' }}>
              <span className="tag tag-neutral" style={{ fontSize: 10 }}>{view.school}</span>
              <span className="tag tag-neutral" style={{ fontSize: 10 }}>{view.level === 0 ? '0 (cantrip)' : `level ${view.level}`}</span>
              {opposedNames.has(view.name) && <span className="warn-tag">opposed school</span>}
            </div>
            {opposedNames.has(view.name) && <div style={{ fontSize: 11.5, color: 'var(--warn-fg)', marginBottom: 8, lineHeight: 1.5 }}>This spell is from one of your opposition schools. You can still learn and prepare it, but each preparation uses two spell slots.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 12, marginBottom: 10 }}>
              <span className="text-muted">Casting</span><span>{view.cast}</span>
              <span className="text-muted"><TermSpan id="components">Components</TermSpan></span><span>{view.comp}</span>
              <span className="text-muted">Range</span><span>{view.range}</span>
              <span className="text-muted">Duration</span><span>{view.dur}</span>
              <span className="text-muted">Save / SR</span><span>{view.save}</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--color-neutral-300)' }}>{view.desc}</div>
          </div>
        ) : (
          <div style={{ background: 'var(--color-surface)', borderRadius: 10, padding: 16, fontSize: 12.5, color: 'var(--color-neutral-500)' }}>Select a spell to read its full description.</div>
        )}
      </div>
    </div>
  );
}

function chip(active: boolean): React.CSSProperties {
  return { padding: '5px 11px', borderRadius: 999, fontSize: 11.5, cursor: 'pointer', border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-divider)'}`, background: active ? 'rgba(145,132,217,.12)' : 'transparent', color: active ? 'var(--color-accent-300)' : 'var(--color-text)', fontFamily: 'inherit' };
}
