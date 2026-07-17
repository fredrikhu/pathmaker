import type { Sheet } from '../../engine/types';
import { fmtMod } from '../../engine/types';
import { useTip } from '../Tooltip';

const CELLS: { key: string; label: string; mode: 'plain' | 'mod'; term?: string }[] = [
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
        const shown = c.mode === 'mod' ? fmtMod(stat.total) : String(stat.total);
        const open = tip.card({ kicker: 'Breakdown', title: `${stat.label} ${shown}`, lines: stat.lines, annotations: stat.annotations, related: c.term ? [c.term] : undefined });
        return (
          <div key={c.key} onMouseEnter={open} onMouseLeave={tip.leave} onClick={open}
            style={{ padding: '8px 15px 9px', cursor: 'pointer', borderRight: '1px solid rgba(233,233,237,.06)', flex: 'none' }}>
            <div className="micro">{c.label}</div>
            <div className="num" style={{ fontSize: 17, fontWeight: 600 }}>{shown}</div>
          </div>
        );
      })}
      <span style={{ flex: 1 }} />
      <div style={{ alignSelf: 'center', fontSize: 11, color: 'var(--color-neutral-500)', whiteSpace: 'nowrap', paddingLeft: 12 }}>
        hover a number for its breakdown · click to pin · dotted terms explain the rules
      </div>
    </div>
  );
}
