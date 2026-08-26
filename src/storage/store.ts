import type { CharacterDoc } from '../engine/types';
import { migrate } from '../engine/character';
import { fetchAccount, fetchCharacters, importCharacters, type Account } from './api';
import {
  clearLocalRoster, isAccountScope, readCharacter, readIndex, readLocalRoster,
  removeCharacter, replaceAll, setScope, writeCharacter, type RosterEntry,
} from './cache';
import { flush, installFlushTriggers, queueDelete, queueSave, setSyncAccount } from './sync';

export type { RosterEntry } from './cache';
export type { Account } from './api';

/** Every read here is synchronous, against the local cache, exactly as it was when localStorage
 *  was the only store. What changed is where the cache comes from and where writes go:
 *  signed in, the server is authoritative and `sync.ts` pushes each write to it. */

export function loadIndex(): RosterEntry[] {
  return readIndex();
}

export function loadCharacter(id: string): CharacterDoc | null {
  return readCharacter(id);
}

export function saveCharacter(doc: CharacterDoc): void {
  writeCharacter(doc);
  queueSave(doc.id);
}

export function deleteCharacter(id: string): void {
  removeCharacter(id);
  queueDelete(id);
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

// ── Session ─────────────────────────────────────────────────────────────────────────────────

export interface Boot {
  account: Account | null;
  /** True when the API could not be reached at all. Signed-out-and-working and
   *  server-is-down look identical to a screen otherwise, and they are not the same thing. */
  offline: boolean;
  /** Characters sitting in the anonymous namespace that this account has not been offered yet.
   *  Empty unless someone just signed in on a browser that had been used without an account. */
  localRosterToOffer: CharacterDoc[];
}

/** Remembers which accounts have already been asked about a given browser's local roster, so
 *  declining the offer once does not mean being asked again on every sign-in. */
const OFFERED_KEY = 'pathmaker:migration-offered';

function offeredTo(userId: string): boolean {
  try {
    const raw = localStorage.getItem(OFFERED_KEY);
    return raw ? (JSON.parse(raw) as string[]).includes(userId) : false;
  } catch {
    return false;
  }
}

export function markMigrationOffered(userId: string): void {
  try {
    const raw = localStorage.getItem(OFFERED_KEY);
    const seen = raw ? (JSON.parse(raw) as string[]) : [];
    if (!seen.includes(userId)) localStorage.setItem(OFFERED_KEY, JSON.stringify([...seen, userId]));
  } catch {
    localStorage.setItem(OFFERED_KEY, JSON.stringify([userId]));
  }
}

/** Runs once at startup, before the first screen renders: resolve the session, point the cache
 *  at the right namespace, push anything left pending from last time, and pull the account's
 *  roster down. Never throws — an unreachable API degrades to the cached copy. */
export async function boot(): Promise<Boot> {
  installFlushTriggers();

  let account: Account | null = null;
  let offline = false;
  try {
    account = await fetchAccount();
  } catch {
    offline = true;
  }

  setScope(account?.id ?? null);
  setSyncAccount(account?.id ?? null);
  if (!account) return { account: null, offline, localRosterToOffer: [] };

  // Anything queued before the last reload goes up before the pull, or the pull would overwrite
  // the cached copy of an edit the server has not seen yet.
  await flush();
  try {
    replaceAll(await fetchCharacters());
  } catch {
    offline = true; // keep whatever the cache holds
  }

  const localRosterToOffer = offeredTo(account.id) ? [] : readLocalRoster();
  return { account, offline, localRosterToOffer };
}

/** Uploads the browser's anonymous characters into the signed-in account and refreshes the
 *  mirror. Returns how many were taken. */
export async function migrateLocalRoster(account: Account, docs: CharacterDoc[], clearAfter: boolean): Promise<number> {
  const imported = await importCharacters(docs);
  replaceAll(await fetchCharacters());
  if (clearAfter) clearLocalRoster();
  markMigrationOffered(account.id);
  return imported;
}

/** Re-reads the account's roster from the server. Used after a window regains focus, where
 *  another device may have saved in the meantime. */
export async function refreshFromServer(): Promise<boolean> {
  if (!isAccountScope()) return false;
  await flush();
  try {
    replaceAll(await fetchCharacters());
    return true;
  } catch {
    return false;
  }
}
