import type { CharacterDoc } from '../engine/types';
import { migrate } from '../engine/character';

const INDEX_KEY = 'pathmaker:index';
const charKey = (id: string) => `pathmaker:char:${id}`;

export interface RosterEntry {
  id: string;
  name: string;
  updatedAt: string;
}

export function loadIndex(): RosterEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as RosterEntry[]) : [];
  } catch {
    return [];
  }
}

function saveIndex(entries: RosterEntry[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

export function loadCharacter(id: string): CharacterDoc | null {
  try {
    const raw = localStorage.getItem(charKey(id));
    if (!raw) return null;
    return migrate(JSON.parse(raw) as CharacterDoc);
  } catch {
    return null;
  }
}

export function saveCharacter(doc: CharacterDoc): void {
  localStorage.setItem(charKey(doc.id), JSON.stringify(doc));
  const index = loadIndex().filter((e) => e.id !== doc.id);
  index.unshift({ id: doc.id, name: doc.name, updatedAt: doc.updatedAt });
  saveIndex(index);
}

export function deleteCharacter(id: string): void {
  localStorage.removeItem(charKey(id));
  saveIndex(loadIndex().filter((e) => e.id !== id));
}

export function exportCharacter(doc: CharacterDoc): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'character'}.pathmaker.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importCharacter(file: File): Promise<CharacterDoc> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const doc = migrate(JSON.parse(reader.result as string) as CharacterDoc);
        // Fresh id to avoid clobbering an existing character.
        doc.id = crypto.randomUUID();
        saveCharacter(doc);
        resolve(doc);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function uid(): string {
  return crypto.randomUUID();
}
