import { useMemo, useState } from 'react';
import { fingerprint } from '../engine/fingerprint';
import { playstyleBrief } from '../engine/playstyle';
import type { CharacterDoc, Resolution } from '../engine/types';

/** "How to play this character" — the one part of the sheet that is advice rather than arithmetic.
 *
 *  It is deliberately set apart from the stat blocks: a panel, a stated caveat, and no numbers in
 *  the prose. Everything else on this screen is a figure the engine can defend line by line, and a
 *  suggestion that looked like one of those would put the whole sheet's credibility behind an
 *  opinion. */
export function PlaystylePanel({ doc, resolution }: { doc: CharacterDoc; resolution: Resolution }) {
  const [open, setOpen] = useState(true);
  // Resolving is the expensive half and the caller has already paid for it; this is only the
  // classification and the fragment lookup, but it still runs on every render of a long sheet.
  const brief = useMemo(() => playstyleBrief(fingerprint(doc, resolution)), [doc, resolution]);

  return (
    <div className="mat-panel" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <h6 style={{ margin: 0, color: 'var(--color-neutral-500)' }}>How to play this character</h6>
        <span className="tag tag-neutral" style={{ fontSize: 10 }}>guidance</span>
        {/* margin-left rather than a flex spacer: on a narrow screen the header wraps, and a
            spacer would strand the button at the left of the second line. */}
        <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: '3px 0', marginLeft: 'auto' }} onClick={() => setOpen((v) => !v)}>
          {open ? '▾ Hide' : '▸ Show'}
        </button>
      </div>

      <p style={{ fontSize: 15, lineHeight: 1.55, margin: '10px 0 0' }}>{brief.identity}</p>

      {open && (
        <>
          <p className="text-muted" style={{ fontSize: 11.5, lineHeight: 1.5, margin: '8px 0 0' }}>
            Suggestions, not rules. Every number on this sheet is computed; the rest of this panel is
            advice about how the build tends to play, and your table may disagree.
          </p>
          {brief.sections.map((s) => (
            <div key={s.id} style={{ marginTop: 18 }}>
              <div className="micro" style={{ color: 'var(--color-accent-300)' }}>{s.title}</div>
              {s.body.map((p, i) => (
                <p key={i} style={{ fontSize: 13, lineHeight: 1.65, margin: '7px 0 0', color: 'var(--color-neutral-300)' }}>{p}</p>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
