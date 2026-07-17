import { useState, type CSSProperties } from 'react';
import type { CharCtl } from '../../Builder';
import { spellById, SPELLS, classById } from '../../../content/index';
import { TermSpan } from '../../Tooltip';

export function SpellsStep({ ch }: { ch: CharCtl }) {
  const { doc, setDecision, resolution } = ch;
  const classId = doc.decisions['class'] as string | null;
  const klass = classId ? classById.get(classId) : undefined;
  const slots = resolution.slots.filter((s) => s.step === 'spells' && s.id.startsWith('spell-picks-L'));
  const rawPicks = doc.decisions['spell-picks'];
  const picks: Record<number, string[]> = Array.isArray(rawPicks) ? { 1: rawPicks as string[] } : ((rawPicks as Record<number, string[]>) ?? {});
  const [levelFilter, setLevel] = useState<number | 'all'>('all');
  const [schoolFilter, setSchool] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [viewId, setViewId] = useState<string | null>(null);

  if (!klass?.spellcasting || slots.length === 0) return <div style={{ padding: 8 }}>No spell selection for this class.</div>;

  const list = klass.spellcasting.list;
  const spellsOnList = SPELLS.filter((s) => s.lists.includes(list as never));
  const schools = [...new Set(spellsOnList.map((s) => s.school))].sort();

  const slotForLevel = (L: number) => slots.find((s) => s.id === `spell-picks-L${L}`);
  const pickedAt = (L: number) => picks[L] ?? [];
  const allPicked = new Set(Object.values(picks).flat());
  const accessibleLevels = slots.map((s) => Number(s.id.replace('spell-picks-L', ''))).sort((a, b) => a - b);
  const maxLevel = Math.max(...accessibleLevels);
  const opposedNames = new Set(slots.flatMap((s) => s.options).filter((o) => o.caution).map((o) => o.name));
  const isOpposedSchool = (school: string) => spellsOnList.some((s) => s.school === school && opposedNames.has(s.name));

  const setPick = (L: number, ids: string[]) => setDecision('spell-picks', { ...picks, [L]: ids });
  const isFull = (L: number) => { const s = slotForLevel(L); return s ? pickedAt(L).length >= s.count : true; };
  const toggle = (id: string, level: number) => {
    const s = slotForLevel(level);
    if (!s || s.auto) return;
    const cur = pickedAt(level);
    if (cur.includes(id)) setPick(level, cur.filter((x) => x !== id));
    else if (!isFull(level)) setPick(level, [...cur, id]);
  };

  const rows = spellsOnList
    .filter((sp) => {
      if (sp.level > maxLevel) return false;
      if (levelFilter !== 'all' && sp.level !== levelFilter) return false;
      if (schoolFilter !== 'all' && sp.school !== schoolFilter) return false;
      if (query && !sp.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  const view = viewId ? spellById.get(viewId) : null;

  return (
    <div style={{ display: 'flex', gap: 24, maxWidth: 1120 }}>
      <div style={{ flex: 1, minWidth: 420 }}>
        <h3 style={{ fontSize: 21, margin: '0 0 12px' }}>Spells</h3>

        {/* Per-level slot summary cards */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {slots.map((s) => {
            const L = Number(s.id.replace('spell-picks-L', ''));
            const n = pickedAt(L).length;
            const full = s.auto || n >= s.count;
            return (
              <div key={s.id} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface)', minWidth: 120, boxShadow: full ? 'none' : 'inset 0 0 0 1px var(--color-accent-800)' }}>
                <div className="micro">{L === 0 ? <TermSpan id="cantrip">Cantrips</TermSpan> : `Level ${L}`}</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                  {s.auto ? <>all <span className="text-muted" style={{ fontSize: 11, fontWeight: 400 }}>· in book</span></> : `${n} / ${s.count}`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <input className="input" style={{ width: 190 }} placeholder="Search spells…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <button onClick={() => setLevel('all')} style={chip(levelFilter === 'all')}>All levels</button>
            {accessibleLevels.map((l) => (
              <button key={l} onClick={() => setLevel(l)} style={chip(levelFilter === l)}>{l === 0 ? 'Cantrips' : `Lvl ${l}`}</button>
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
          {rows.map((sp) => {
            const isPicked = allPicked.has(sp.id) || (sp.level === 0 && slotForLevel(0)?.auto);
            const slot = slotForLevel(sp.level);
            const auto = slot?.auto;
            const full = isFull(sp.level);
            return (
              <div key={sp.id} onClick={() => setViewId(sp.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface)', cursor: 'pointer', boxShadow: `inset 0 0 0 1px ${viewId === sp.id ? 'var(--color-accent)' : isPicked ? 'var(--color-accent-800)' : 'transparent'}` }}>
                <span className="num" style={{ width: 16, fontSize: 13, color: 'var(--color-neutral-500)', flex: 'none' }}>{sp.level}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{sp.name}</span>
                    <span className="tag tag-neutral" style={{ fontSize: 10 }}>{sp.school}</span>
                    {opposedNames.has(sp.name) && <span className="warn-tag">⚠ opposed — double slot</span>}
                  </div>
                  <div className="text-muted" style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.summary}</div>
                </div>
                {auto ? <span className="text-muted" style={{ fontSize: 11, flex: 'none' }}>in book</span>
                  : <button className="btn btn-ghost" style={{ fontSize: 11.5, flex: 'none' }} disabled={!allPicked.has(sp.id) && full}
                      onClick={(e) => { e.stopPropagation(); toggle(sp.id, sp.level); }}>
                      {allPicked.has(sp.id) ? '✓ Known' : full ? 'Full' : 'Add'}
                    </button>}
              </div>
            );
          })}
          {rows.length === 0 && <p className="text-muted" style={{ fontSize: 12 }}>No spells match — or none authored yet at this level.</p>}
        </div>
        <p className="text-muted" style={{ fontSize: 11, marginTop: 8 }}>Core-scope spells shown. Higher-level lists are being filled in — accessible levels without options are authored progressively.</p>
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

function chip(active: boolean): CSSProperties {
  return { padding: '5px 11px', borderRadius: 999, fontSize: 11.5, cursor: 'pointer', border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-divider)'}`, background: active ? 'rgba(145,132,217,.12)' : 'transparent', color: active ? 'var(--color-accent-300)' : 'var(--color-text)', fontFamily: 'inherit' };
}
