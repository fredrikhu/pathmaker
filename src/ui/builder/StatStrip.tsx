import type { Sheet } from '../../engine/types';
import { fmtMod, abilityMod, speedLabel, speedExtra } from '../../engine/types';
import { useTip } from '../Tooltip';

// 'ability' cells carry the ability SCORE in stat.total; the strip shows the
// derived modifier (what most feats/traits key on) with the score alongside.
const CELLS: { key: string; label: string; mode: 'plain' | 'mod' | 'ability'; term?: string }[] = [
  { key: 'ability:str', label: 'Str', mode: 'ability' },
  { key: 'ability:dex', label: 'Dex', mode: 'ability' },
  { key: 'ability:con', label: 'Con', mode: 'ability' },
  { key: 'ability:int', label: 'Int', mode: 'ability' },
  { key: 'ability:wis', label: 'Wis', mode: 'ability' },
  { key: 'ability:cha', label: 'Cha', mode: 'ability' },
  { key: 'hp:max', label: 'HP', mode: 'plain', term: 'hp' },
  { key: 'ac', label: 'AC', mode: 'plain', term: 'ac' },
  { key: 'ac:touch', label: 'Touch', mode: 'plain', term: 'touch' },
  { key: 'ac:ff', label: 'FF', mode: 'plain', term: 'ff' },
  { key: 'save:fort', label: 'Fort', mode: 'mod', term: 'fort' },
  { key: 'save:ref', label: 'Ref', mode: 'mod', term: 'ref' },
  { key: 'save:will', label: 'Will', mode: 'mod', term: 'will' },
  { key: 'bab', label: 'BAB', mode: 'mod', term: 'bab' },
  { key: 'init', label: 'Init', mode: 'mod', term: 'init' },
];

export function StatStrip({ sheet }: { sheet: Sheet }) {
  const tip = useTip();
  return (
    <div style={{ display: 'flex', padding: '0 20px', borderTop: '1px solid var(--color-divider)', borderBottom: '1px solid var(--color-divider)', background: 'var(--color-surface)', overflowX: 'auto' }}>
      {CELLS.map((c) => {
        const stat = sheet.stats[c.key];
        if (!stat) return null;
        const isAbility = c.mode === 'ability';
        const shown = isAbility ? fmtMod(abilityMod(stat.total)) : c.mode === 'mod' ? fmtMod(stat.total) : String(stat.total);
        const title = isAbility ? `${stat.label} ${stat.total} (${shown})` : `${stat.label} ${shown}`;
        const open = tip.card({ kicker: 'Breakdown', title, lines: stat.lines, annotations: stat.annotations, related: c.term ? [c.term] : undefined });
        return (
          <div key={c.key} onMouseEnter={open} onMouseLeave={tip.leave} onClick={open}
            style={{ padding: '8px 15px 9px', cursor: 'pointer', borderRight: '1px solid var(--color-divider)', flex: 'none' }}>
            <div className="micro">{c.label}</div>
            <div className="num" style={{ fontSize: 17, fontWeight: 600 }}>
              {shown}
              {isAbility && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-neutral-500)', marginLeft: 4 }}>{stat.total}</span>}
            </div>
          </div>
        );
      })}
      {(() => {
        const s = sheet.speed;
        const extra = speedExtra(s);
        const reducedNote = s.reducedFrom ? ` Reduced from ${s.reducedFrom} ft by armor or a heavy load.` : '';
        const open = tip.card({
          kicker: 'Movement',
          title: `Speed ${speedLabel(s)}`,
          body: `Land speed ${s.base} ft.${reducedNote}${extra ? ` Also ${extra}.` : ''}`,
        });
        return (
          <div onMouseEnter={open} onMouseLeave={tip.leave} onClick={open}
            style={{ padding: '8px 15px 9px', cursor: 'pointer', borderRight: '1px solid var(--color-divider)', flex: 'none' }}>
            <div className="micro">Speed</div>
            <div className="num" style={{ fontSize: 17, fontWeight: 600, color: s.reducedFrom ? 'var(--warn-fg)' : undefined }}>
              {s.base}
              {s.reducedFrom ? <span style={{ fontSize: 11, fontWeight: 400 }}> ↓</span> : ''}
              {extra ? <span style={{ fontSize: 11, color: 'var(--color-accent-300)', fontWeight: 400 }}> ✦</span> : ''}
            </div>
          </div>
        );
      })()}
      <span style={{ flex: 1 }} />
      <div style={{ alignSelf: 'center', fontSize: 11, color: 'var(--color-neutral-500)', whiteSpace: 'nowrap', paddingLeft: 12 }}>
        hover a number for its breakdown · click to pin · dotted terms explain the rules
      </div>
    </div>
  );
}
