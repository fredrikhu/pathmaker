import { ApiError, deleteCharacterRemote, putCharacter } from './api';
import { readCharacter } from './cache';

/** The outbound half of "server is the source of truth".
 *
 *  Screens save synchronously into the cache and carry on; this queue is what gets those writes
 *  to the API. It exists because the builder autosaves on every click — firing (and awaiting) a
 *  request per keystroke would be both slow and pointless when only the last state matters.
 *
 *  Two properties matter more than speed:
 *   - **Coalescing.** One pending operation per character, not one per edit. A flush sends the
 *     doc as it stands when the flush runs, so a burst of edits costs one PUT.
 *   - **Durability.** The pending set outlives a reload, so closing the tab mid-save does not
 *     silently lose the last edit — the next boot flushes it before pulling. */

type Op = 'put' | 'delete';

export type SyncStatus = 'idle' | 'saving' | 'pending' | 'error';

const PENDING_KEY = 'pathmaker:sync-pending';
const DEBOUNCE_MS = 1200;
const MAX_BACKOFF_MS = 60_000;

let pending = new Map<string, Op>();
let userId: string | null = null;
let timer: number | undefined;
let flushing = false;
let backoff = 0;
let status: SyncStatus = 'idle';
let lastError: string | null = null;

const listeners = new Set<() => void>();

export function subscribeSync(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function syncStatus(): { status: SyncStatus; pending: number; error: string | null } {
  return { status, pending: pending.size, error: lastError };
}

function announce(next: SyncStatus, error: string | null = null): void {
  status = next;
  lastError = error;
  for (const fn of listeners) fn();
}

/** Pending work is keyed by account: a queue left over from one sign-in must never be flushed
 *  into somebody else's roster. */
function pendingKey(uid: string): string {
  return `${PENDING_KEY}:${uid}`;
}

function persist(): void {
  if (!userId) return;
  const entries = [...pending.entries()];
  if (entries.length) localStorage.setItem(pendingKey(userId), JSON.stringify(entries));
  else localStorage.removeItem(pendingKey(userId));
}

function restore(uid: string): void {
  try {
    const raw = localStorage.getItem(pendingKey(uid));
    pending = new Map(raw ? (JSON.parse(raw) as [string, Op][]) : []);
  } catch {
    pending = new Map();
  }
}

/** Called when the session resolves. Passing null (sign-out) stops the queue without flushing —
 *  the cookie is gone, so every request would 401 anyway; the work stays on disk for the next
 *  sign-in as that same account. */
export function setSyncAccount(id: string | null): void {
  window.clearTimeout(timer);
  userId = id;
  backoff = 0;
  if (id) restore(id);
  else pending = new Map();
  announce(pending.size ? 'pending' : 'idle');
}

function schedule(delay = DEBOUNCE_MS): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => { void flush(); }, delay);
}

export function queueSave(id: string): void {
  if (!userId) return;
  pending.set(id, 'put');
  persist();
  announce('pending');
  schedule();
}

export function queueDelete(id: string): void {
  if (!userId) return;
  pending.set(id, 'delete');
  persist();
  announce('pending');
  schedule();
}

/** Sends everything outstanding. Resolves once the queue is empty or a send has failed; safe to
 *  call at any time (a second call while one is in flight is a no-op). */
export async function flush(): Promise<void> {
  if (flushing || !userId || pending.size === 0) return;
  flushing = true;
  announce('saving');
  const startedAs = userId;

  try {
    // Snapshot the keys: an edit during the flush re-adds its id, and that write must survive
    // rather than being cleared along with the one we are sending.
    for (const [id, op] of [...pending.entries()]) {
      if (userId !== startedAs) return; // signed out or switched accounts mid-flush
      try {
        if (op === 'delete') {
          await deleteCharacterRemote(id);
        } else {
          const doc = readCharacter(id);
          // Saved and deleted before the flush ran — nothing to send.
          if (!doc) { pending.delete(id); continue; }
          await putCharacter(doc);
        }
        // Only clear this id if no newer edit replaced the operation while it was in flight.
        if (pending.get(id) === op) pending.delete(id);
      } catch (e) {
        const err = e instanceof ApiError ? e : null;
        // 400/404/409 mean this particular character will never be accepted; retrying it forever
        // would block every other pending write behind it.
        if (err && err.status >= 400 && err.status < 500 && err.status !== 401 && err.status !== 429) {
          pending.delete(id);
          persist();
          announce(pending.size ? 'pending' : 'error', err.message);
          continue;
        }
        throw e;
      }
    }
    backoff = 0;
    persist();
    announce('idle');
  } catch (e) {
    persist();
    const message = e instanceof ApiError && e.status === 401
      ? 'signed out — sign in again to save'
      : 'could not reach the server; will retry';
    announce('error', message);
    backoff = Math.min(backoff ? backoff * 2 : 2000, MAX_BACKOFF_MS);
    schedule(backoff);
  } finally {
    flushing = false;
  }
}

/** True when the queue still holds work — the caller can warn before leaving the page. */
export function hasPendingWork(): boolean {
  return pending.size > 0;
}

/** Flush on the events that mean "this tab may be about to stop running". `pagehide` is the one
 *  mobile Safari actually fires; `beforeunload` alone would miss it. */
export function installFlushTriggers(): void {
  const urgent = () => { if (pending.size) void flush(); };
  window.addEventListener('pagehide', urgent);
  window.addEventListener('beforeunload', urgent);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') urgent(); });
  // Coming back online is the moment a failed flush is most likely to succeed.
  window.addEventListener('online', () => { if (pending.size) schedule(0); });
}
