import type { CharacterDoc } from '../engine/types';
import { migrate } from '../engine/character';

/** The browser-side copy of a roster.
 *
 *  Signed out, this *is* the storage — the app works exactly as it always did, offline, with no
 *  account. Signed in, the server owns the truth and this is a local mirror of it: every screen
 *  reads synchronously from here (so no screen needs a loading state), while writes go through
 *  `sync.ts` to the API.
 *
 *  Anonymous characters keep the original un-prefixed keys, so an existing browser's roster is
 *  exactly where it was. Each account gets its own namespace, which is what stops two people
 *  sharing a machine from seeing each other's characters. */

export interface RosterEntry {
  id: string;
  name: string;
  updatedAt: string;
}

type Scope = { kind: 'local' } | { kind: 'account'; userId: string };

let scope: Scope = { kind: 'local' };

/** Points every subsequent read and write at an account's namespace, or back at the anonymous
 *  one. Called once when the session resolves at boot, and again on sign-in/sign-out. */
export function setScope(userId: string | null): void {
  scope = userId ? { kind: 'account', userId } : { kind: 'local' };
}

export function isAccountScope(): boolean {
  return scope.kind === 'account';
}

const prefix = () => (scope.kind === 'account' ? `pathmaker:acct:${scope.userId}:` : 'pathmaker:');
const indexKey = () => `${prefix()}index`;
const charKey = (id: string) => `${prefix()}char:${id}`;

function readIndexAt(key: string): RosterEntry[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as RosterEntry[]) : [];
  } catch {
    return [];
  }
}

export function readIndex(): RosterEntry[] {
  return readIndexAt(indexKey());
}

function writeIndex(entries: RosterEntry[]): void {
  localStorage.setItem(indexKey(), JSON.stringify(entries));
}

export function readCharacter(id: string): CharacterDoc | null {
  try {
    const raw = localStorage.getItem(charKey(id));
    return raw ? migrate(JSON.parse(raw) as CharacterDoc) : null;
  } catch {
    return null;
  }
}

export function writeCharacter(doc: CharacterDoc): void {
  localStorage.setItem(charKey(doc.id), JSON.stringify(doc));
  const index = readIndex().filter((e) => e.id !== doc.id);
  index.unshift({ id: doc.id, name: doc.name, updatedAt: doc.updatedAt });
  writeIndex(index);
}

export function removeCharacter(id: string): void {
  localStorage.removeItem(charKey(id));
  writeIndex(readIndex().filter((e) => e.id !== id));
}

/** Replaces the whole namespace with what the server just sent. Characters the server does not
 *  have are dropped from the mirror — it is the authority, and a leftover here would be a ghost
 *  that reappears on every device but never saves. */
export function replaceAll(docs: CharacterDoc[]): void {
  for (const { id } of readIndex()) localStorage.removeItem(charKey(id));
  writeIndex([]);
  // Oldest first, since writeCharacter unshifts — the result is newest-first, as the server sent it.
  for (const doc of [...docs].reverse()) writeCharacter(doc);
}

/** The anonymous roster, readable regardless of the current scope. This is what the sign-in
 *  prompt offers to upload. */
export function readLocalRoster(): CharacterDoc[] {
  const saved = scope;
  scope = { kind: 'local' };
  try {
    return readIndex().map((e) => readCharacter(e.id)).filter((d): d is CharacterDoc => !!d);
  } finally {
    scope = saved;
  }
}

/** Clears the anonymous namespace — offered after its characters have been uploaded, so the
 *  browser stops showing a stale second copy when signed out. */
export function clearLocalRoster(): void {
  const saved = scope;
  scope = { kind: 'local' };
  try {
    for (const { id } of readIndex()) localStorage.removeItem(charKey(id));
    localStorage.removeItem(indexKey());
  } finally {
    scope = saved;
  }
}
