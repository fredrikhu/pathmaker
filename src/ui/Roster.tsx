import { useRef, useState } from 'react';
import { newCharacter } from '../engine/character';
import { resolve } from '../engine/resolve';
import {
  deleteCharacter, exportCharacter, importCharacter, loadCharacter, loadIndex,
  saveCharacter, uid, type RosterEntry,
} from '../storage/store';
import { navigate } from './App';
import { ThemeToggle } from './ThemeToggle';

function summarize(id: string): { summary: string; issues: number } {
  const doc = loadCharacter(id);
  if (!doc) return { summary: '—', issues: 0 };
  const r = resolve(doc);
  return { summary: r.sheet.summaryLine || 'New character', issues: r.issues.filter((i) => i.severity === 'error').length };
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return `${Math.floor(hr / 24)} d ago`;
}

export function Roster() {
  const [entries, setEntries] = useState<RosterEntry[]>(loadIndex());
  const [confirmDelete, setConfirmDelete] = useState<RosterEntry | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const refresh = () => setEntries(loadIndex());

  const create = () => {
    const doc = newCharacter(uid());
    saveCharacter(doc);
    navigate({ name: 'builder', id: doc.id });
  };

  const duplicate = (id: string) => {
    const doc = loadCharacter(id);
    if (!doc) return;
    const copy = { ...doc, id: uid(), name: `${doc.name} (copy)`, updatedAt: new Date().toISOString() };
    saveCharacter(copy);
    refresh();
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      await importCharacter(file);
      refresh();
    } catch {
      alert('That file could not be read as a Pathmaker character.');
    }
  };

  const storageNote = 'Characters live in this browser. Export to back them up or move them between devices.';

  return (
    <div style={{ minHeight: '100vh', padding: '0 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 4px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>Pathmaker</span>
        <span className="text-muted" style={{ fontSize: 13 }}>Pathfinder 1e character forge</span>
        <span style={{ flex: 1 }} />
        <ThemeToggle />
        <button className="btn btn-secondary" onClick={() => fileInput.current?.click()}>Import JSON</button>
        <button className="btn btn-primary" onClick={create}>+ New character</button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
      </header>

      {entries.length === 0 ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <div style={{ maxWidth: 440 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚔️</div>
            <h2 style={{ marginBottom: 10 }}>Every hero starts at level 1</h2>
            <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
              Pathmaker builds a legal Pathfinder 1st Edition character step by step — abilities, race, class,
              skills, feats, spells, and gear — and shows you the math behind every number.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18 }}>
              <button className="btn btn-primary" onClick={create}>Create your first character</button>
              <button className="btn btn-secondary" onClick={() => fileInput.current?.click()}>Import JSON</button>
            </div>
            <p className="text-muted" style={{ fontSize: 11.5, marginTop: 22 }}>{storageNote}</p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, paddingBottom: 24 }}>
            {entries.map((e) => {
              const { summary, issues } = summarize(e.id);
              return (
                <div key={e.id} style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--color-neutral-900)', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 600, color: 'var(--color-neutral-500)', flex: 'none' }}>
                      {e.name.trim().charAt(0).toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 500 }}>{e.name}</div>
                      <div className="text-muted" style={{ fontSize: 12.5 }}>{summary}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>Edited {relTime(e.updatedAt)}</div>
                    </div>
                    {issues > 0 ? (
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'color-mix(in srgb, var(--err) 18%, transparent)', color: 'var(--err)', whiteSpace: 'nowrap' }}>{issues} issue{issues === 1 ? '' : 's'}</span>
                    ) : (
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--color-accent-900)', color: 'var(--color-accent-300)' }}>✓ ready</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => navigate({ name: 'builder', id: e.id })}>Open</button>
                    <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => duplicate(e.id)}>Duplicate</button>
                    <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { const d = loadCharacter(e.id); if (d) exportCharacter(d); }}>Export</button>
                    <span style={{ flex: 1 }} />
                    <button
                      onClick={() => setConfirmDelete(e)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                      onMouseEnter={(ev) => (ev.currentTarget.style.color = 'var(--err)')}
                      onMouseLeave={(ev) => (ev.currentTarget.style.color = 'var(--color-neutral-500)')}
                    >Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-muted" style={{ fontSize: 11.5, paddingBottom: 24 }}>{storageNote}</p>
        </>
      )}

      {confirmDelete && (
        <div className="dialog-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">Delete “{confirmDelete.name}”?</div>
            <div className="dialog-body">This permanently removes the character from this browser. There is no undo.</div>
            <div className="dialog-actions" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-ghost" onClick={() => { const d = loadCharacter(confirmDelete.id); if (d) exportCharacter(d); }}>Export first</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="btn" style={{ color: 'var(--err)', border: '1px solid var(--err)' }} onClick={() => { deleteCharacter(confirmDelete.id); setConfirmDelete(null); refresh(); }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
