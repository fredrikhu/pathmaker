import type { CharacterDoc } from '../engine/types';

/** The API is served from the same origin as the app (nginx proxies /api in production, Vite's
 *  dev server proxies it in development), so the session cookie rides along on its own and there
 *  is no token for this module to hold. */
const BASE = '/api';

export interface Account {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  discordId: string;
}

/** Thrown for any non-2xx response. `status` lets callers separate "signed out" (401) from
 *  "the server is unreachable", which are handled very differently. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { ...(init?.body ? { 'content-type': 'application/json' } : {}), ...init?.headers },
    });
  } catch {
    // A network failure is not a server answer — status 0 means "could not reach it at all".
    throw new ApiError(0, 'offline');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, body?.error ?? `${init?.method ?? 'GET'} ${path} failed with ${res.status}`);
  }
  return (await res.json()) as T;
}

/** The signed-in account, or null. Never throws for "signed out" — that is an answer, not a
 *  failure; it throws only when the API itself cannot be reached. */
export async function fetchAccount(): Promise<Account | null> {
  const { user } = await request<{ user: Account | null }>('/auth/me');
  return user;
}

/** Full-page navigation, not fetch: the OAuth handshake has to happen in the address bar so
 *  Discord can show its own consent screen. */
export function beginLogin(returnTo = window.location.hash || '#/'): void {
  const redirect = returnTo.startsWith('#') ? `/${returnTo}` : returnTo;
  window.location.href = `${BASE}/auth/discord?redirect=${encodeURIComponent(redirect)}`;
}

export async function logout(): Promise<void> {
  await request<{ ok: true }>('/auth/logout', { method: 'POST' });
}

export async function fetchCharacters(): Promise<CharacterDoc[]> {
  const { characters } = await request<{ characters: CharacterDoc[] }>('/characters');
  return characters;
}

export async function putCharacter(doc: CharacterDoc): Promise<void> {
  await request<{ ok: true }>(`/characters/${encodeURIComponent(doc.id)}`, {
    method: 'PUT',
    body: JSON.stringify(doc),
  });
}

export async function deleteCharacterRemote(id: string): Promise<void> {
  try {
    await request<{ ok: true }>(`/characters/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) {
    // Already gone on the server is the outcome we wanted.
    if (e instanceof ApiError && e.status === 404) return;
    throw e;
  }
}

export async function importCharacters(docs: CharacterDoc[]): Promise<number> {
  const { imported } = await request<{ imported: number }>('/characters/import', {
    method: 'POST',
    body: JSON.stringify({ characters: docs }),
  });
  return imported;
}

/** Discord's CDN URL for an account's avatar, or null for the default silhouette. */
export function avatarUrl(account: Account, size = 32): string | null {
  if (!account.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${account.discordId}/${account.avatar}.png?size=${size * 2}`;
}
