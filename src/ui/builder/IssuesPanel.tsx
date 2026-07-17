import type { Issue } from '../../engine/types';

const sevColor = (s: Issue['severity']) => (s === 'error' ? 'var(--err)' : s === 'warning' ? 'var(--warn)' : 'var(--info)');

export function IssuesPanel({ issues, onNavigate, onClear }: {
  issues: Issue[];
  onNavigate: (step: string, slot?: string) => void;
  onClear: (slot: string) => void;
}) {
  return (
    <div style={{ borderLeft: '1px solid var(--color-divider)', padding: 18, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--color-surface)', minHeight: 0, overflowY: 'auto' }}>
      <span className="micro" style={{ letterSpacing: '.12em' }}>To resolve — {issues.length}</span>
      {issues.map((i, idx) => (
        <div key={idx} onClick={() => onNavigate(i.step, i.slot)}
          style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-bg)', cursor: 'pointer', boxShadow: `inset 2px 0 0 ${sevColor(i.severity)}`, animation: 'issueIn .5s ease-out' }}>
          <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: sevColor(i.severity), marginBottom: 2 }}>
            {i.severity} · {i.step}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>{i.message}</div>
          {i.clearSlot && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear(i.clearSlot!); }}
              className="btn btn-ghost" style={{ fontSize: 11, marginTop: 6, padding: 0 }}
            >Clear this decision</button>
          )}
        </div>
      ))}
      {issues.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--color-accent-300)' }}>✓ Nothing to resolve — ready to adventure.</div>}
      <p className="text-muted" style={{ fontSize: 11, marginTop: 'auto' }}>Click an issue to jump to its step. Errors never block saving — a character with errors is still yours.</p>
    </div>
  );
}
