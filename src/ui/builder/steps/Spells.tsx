import { useState, type CSSProperties } from 'react';
import type { CharCtl } from '../../Builder';
import { spellById, SPELLS, classById, spellLevelOn } from '../../../content/index';
import { effectiveClass, readDecisions } from '../../../engine/resolve';
import { TermSpan } from '../../Tooltip';
import { revealSplitDetail, showSplitList, useSnapPanels } from '../bits';
import { spellStatLine, spellLevelLabel } from '../../spellInfo';

export function SpellsStep({ ch }: { ch: CharCtl }) {
  const { doc, setDecision, resolution } = ch;
  const snap = useSnapPanels();
  const classId = doc.decisions['class'] as string | null;
  const klass = classId ? classById.get(classId) : undefined;
  const slots = resolution.slots.filter((s) => s.step === 'spells' && s.id.startsWith('spell-picks-L'));
  const rawPicks = doc.decisions['spell-picks'];
  const picks: Record<number, string[]> = Array.isArray(rawPicks) ? { 1: rawPicks as string[] } : ((rawPicks as Record<number, string[]>) ?? {});
  const [levelFilter, setLevel] = useState<number | 'all'>('all');
  const [schoolFilter, setSchool] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [viewId, setViewId] = useState<string | null>(null);
  // "Chosen" collects what you already took, with the same description text as the list, so the
  // picks stay readable after the fact without hunting for them among hundreds of rows.
  const [showChosen, setShowChosen] = useState(true);

  if (!klass?.spellcasting || slots.length === 0) return <div style={{ padding: 8 }}>No spell selection for this class.</div>;

  // Use the archetype-effective spell list (e.g. the Unlettered Arcanist casts from the witch list,
  // not the arcanist's arcane list), and the per-list spell level (witch cures sit a level higher).
  const list = effectiveClass(klass, readDecisions(doc)).spellcasting?.list ?? klass.spellcasting.list;
  const lvlOf = (sp: (typeof SPELLS)[number]) => spellLevelOn(sp, list);
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
      if (lvlOf(sp) > maxLevel) return false;
      if (levelFilter !== 'all' && lvlOf(sp) !== levelFilter) return false;
      if (schoolFilter !== 'all' && sp.school !== schoolFilter) return false;
      if (query && !sp.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => lvlOf(a) - lvlOf(b) || a.name.localeCompare(b.name));

  // Everything taken, in list order, for the recap panel. A cantrip level the class simply knows
  // in full ("in book") is not a choice, so it stays out of the recap.
  const chosen = accessibleLevels
    .filter((L) => !slotForLevel(L)?.auto)
    .flatMap((L) => pickedAt(L).map((id) => spellById.get(id)).filter(Boolean) as (typeof SPELLS)[number][]);

  // A prepared-book caster writes spells into a book; everyone else knows them outright.
  const isBook = klass.spellcasting.kind === 'prepared-book';
  const addLabel = isBook ? 'Add to spellbook' : 'Add to spells known';
  const takenWord = isBook ? 'In book' : 'Known';

  const view = viewId ? spellById.get(viewId) : null;
  const viewPicked = !!view && allPicked.has(view.id);
  const viewLevel = view ? lvlOf(view) : 0;
  const viewAuto = view ? slotForLevel(viewLevel)?.auto : false;

  const open = (id: string) => (e: React.MouseEvent) => { setViewId(id); revealSplitDetail(e); };

  return (
    <div className="split-step" onScroll={snap.onScroll} style={{ display: 'flex', gap: 24 }}>
      <div className={`split-list${snap.panelClass(0)}`} style={{ flex: 1, minWidth: 420 }}>
        <h3 style={{ fontSize: 21, margin: '0 0 12px' }}>Spells</h3>

        {/* Per-level slot summary cards */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {slots.map((s) => {
            const L = Number(s.id.replace('spell-picks-L', ''));
            const n = pickedAt(L).length;
            const full = s.auto || n >= s.count;
            return (
              <div key={s.id} className={`pick${full ? '' : ' is-empty'}`} style={{ padding: '8px 12px', minWidth: 120 }}>
                <div className="micro">{L === 0 ? <TermSpan id="cantrip">Cantrips</TermSpan> : `Level ${L}`}</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                  {s.auto ? <>all <span className="text-muted" style={{ fontSize: 11, fontWeight: 400 }}>· in book</span></> : `${n} / ${s.count}`}
                </div>
              </div>
            );
          })}
        </div>

        {/* What you've taken so far, described. Collapsible because it grows with every level. */}
        {chosen.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: '3px 0' }} onClick={() => setShowChosen((v) => !v)}>
              {showChosen ? '▾' : '▸'} Chosen spells ({chosen.length})
            </button>
            {showChosen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
                {chosen.map((sp) => (
                  <div key={sp.id} onClick={open(sp.id)}
                    className={`pick is-clickable${viewId === sp.id ? ' is-sel' : ' is-marked'}`}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px' }}>
                    <span className="num" style={{ width: 16, fontSize: 13, color: 'var(--color-neutral-500)', flex: 'none', marginTop: 1 }}>{lvlOf(sp)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{sp.name}</span>
                        <span className="tag tag-neutral" style={{ fontSize: 10 }}>{sp.school}</span>
                        {opposedNames.has(sp.name) && <span className="warn-tag">⚠ opposed — double slot</span>}
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-neutral-400)', marginTop: 2 }}>{sp.summary}</div>
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>{spellStatLine(sp)}</div>
                    </div>
                    <button className="btn btn-ghost" style={{ fontSize: 11.5, flex: 'none' }}
                      onClick={(e) => { e.stopPropagation(); toggle(sp.id, lvlOf(sp)); }}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
            const spLevel = lvlOf(sp);
            const isPicked = allPicked.has(sp.id) || (spLevel === 0 && slotForLevel(0)?.auto);
            const slot = slotForLevel(spLevel);
            const auto = slot?.auto;
            const full = isFull(spLevel);
            return (
              <div key={sp.id} onClick={open(sp.id)}
                className={`pick is-clickable${viewId === sp.id ? ' is-sel' : isPicked ? ' is-marked' : ''}`}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px' }}>
                <span className="num" style={{ width: 16, fontSize: 13, color: 'var(--color-neutral-500)', flex: 'none', marginTop: 1 }}>{spLevel}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{sp.name}</span>
                    <span className="tag tag-neutral" style={{ fontSize: 10 }}>{sp.school}</span>
                    {opposedNames.has(sp.name) && <span className="warn-tag">⚠ opposed — double slot</span>}
                  </div>
                  {/* Two lines of the summary, not one clipped line: the point of the row is to say
                      what the spell does before you commit a slot to it. */}
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-neutral-400)', marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sp.summary}</div>
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spellStatLine(sp)}</div>
                </div>
                {auto ? <span className="text-muted" style={{ fontSize: 11, flex: 'none' }}>in book</span>
                  : <button className="btn btn-ghost" style={{ fontSize: 11.5, flex: 'none' }} disabled={!allPicked.has(sp.id) && full}
                      onClick={(e) => { e.stopPropagation(); toggle(sp.id, spLevel); }}>
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
      <div className={`split-detail${snap.panelClass(1)}`} style={{ flex: 'none', width: 340, position: 'sticky', top: 12, alignSelf: 'flex-start' }}>
        <button className="btn btn-ghost split-back" style={{ fontSize: 12, marginBottom: 8 }} onClick={showSplitList}>‹ All spells</button>
        {view ? (
          <div style={{ background: 'var(--color-surface)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 500 }}>{view.name}</div>
            <div style={{ display: 'flex', gap: 6, margin: '6px 0 10px', flexWrap: 'wrap' }}>
              <span className="tag tag-neutral" style={{ fontSize: 10 }}>{view.school}</span>
              <span className="tag tag-neutral" style={{ fontSize: 10 }}>{viewLevel === 0 ? '0 (cantrip)' : `level ${viewLevel}`}</span>
              {opposedNames.has(view.name) && <span className="warn-tag">opposed school</span>}
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--color-neutral-400)', marginBottom: 10 }}>{view.summary}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 12, marginBottom: 10 }}>
              <span className="text-muted">Casting</span><span>{view.cast}</span>
              <span className="text-muted"><TermSpan id="components">Components</TermSpan></span><span>{view.comp}</span>
              <span className="text-muted">Range</span><span>{view.range}</span>
              <span className="text-muted">Duration</span><span>{view.dur}</span>
              <span className="text-muted">Save / SR</span><span>{view.save}</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--color-neutral-300)' }}>{view.desc}</div>
            {/* Take it without leaving the description — the whole reason to read it is to decide. */}
            {viewAuto ? (
              <div className="text-muted" style={{ fontSize: 11.5, marginTop: 12 }}>Already in your spellbook.</div>
            ) : (
              <button className="btn btn-ghost" style={{ fontSize: 12, marginTop: 12 }}
                disabled={!viewPicked && isFull(viewLevel)}
                onClick={() => toggle(view.id, viewLevel)}>
                {viewPicked ? `✓ ${takenWord} — remove` : isFull(viewLevel) ? `No ${spellLevelLabel(viewLevel)} picks left` : addLabel}
              </button>
            )}
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
