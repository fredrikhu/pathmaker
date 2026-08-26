import { useState } from 'react';
import { resolve } from '../engine/resolve';
import { useAccount } from './account';

/** Shown once, the first time an account signs in on a browser that already holds characters
 *  made without one. Nothing moves without a click: a shared machine's roster is not
 *  automatically somebody's property. */
export function MigrationDialog({ onDone }: { onDone: () => void }) {
  const { account, pendingMigration, dismissMigration, runMigration } = useAccount();
  const [clearAfter, setClearAfter] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!account || pendingMigration.length === 0) return null;

  const upload = async () => {
    setBusy(true);
    setError(null);
    try {
      await runMigration(clearAfter);
      onDone();
    } catch {
      setError('The upload did not go through. Your characters are untouched — try again, or export them by hand.');
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="dialog-title">
          Move {pendingMigration.length} character{pendingMigration.length === 1 ? '' : 's'} into your account?
        </div>
        <div className="dialog-body">
          <p style={{ marginBottom: 12 }}>
            This browser holds {pendingMigration.length === 1 ? 'a character' : 'characters'} made before you signed in.
            Copy {pendingMigration.length === 1 ? 'it' : 'them'} to <strong>{account.displayName}</strong> and
            {pendingMigration.length === 1 ? ' it follows' : ' they follow'} you to any device.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {pendingMigration.map((doc) => (
              <div key={doc.id} className="pick" style={{ padding: '7px 11px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{doc.name}</span>
                <span className="text-muted" style={{ fontSize: 11.5 }}>{resolve(doc).sheet.summaryLine || 'new character'}</span>
              </div>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <input type="checkbox" checked={clearAfter} onChange={(e) => setClearAfter(e.target.checked)} />
            Remove the browser copies once they are uploaded
          </label>
          <p className="text-muted" style={{ fontSize: 11.5, marginTop: 6 }}>
            {clearAfter
              ? 'Leaves one copy — the account’s. Recommended, so the signed-out roster is not a stale duplicate.'
              : 'Keeps a second, separate copy in this browser, visible when signed out. It will not receive later edits.'}
          </p>
          {error && <p style={{ fontSize: 12, color: 'var(--err)', marginTop: 10 }}>{error}</p>}
        </div>
        <div className="dialog-actions">
          <button className="btn btn-secondary" disabled={busy} onClick={dismissMigration}>Not now</button>
          <button className="btn btn-primary" disabled={busy} onClick={upload}>
            {busy ? 'Uploading…' : `Copy to ${account.displayName}`}
          </button>
        </div>
      </div>
    </div>
  );
}
