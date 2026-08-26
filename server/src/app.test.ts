import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.ts';
import { loadConfig, type Config } from './config.ts';
import { openDb, type Db } from './db.ts';

const ENV = {
  DISCORD_CLIENT_ID: 'test-client',
  DISCORD_CLIENT_SECRET: 'test-secret',
  SESSION_SECRET: 'test-session-secret-value',
  PATHMAKER_APP_ORIGIN: 'http://localhost:5173',
  PATHMAKER_DB: ':memory:',
} as unknown as NodeJS.ProcessEnv;

/** Stands in for Discord: any code maps to the account whose id is baked into the code string,
 *  so a test can sign in as two different people without touching the network. */
function fakeDiscord() {
  return {
    async exchangeCode(code: string) {
      if (code === 'bad-code') throw new Error('invalid code');
      return `token-for-${code}`;
    },
    async fetchUser(accessToken: string) {
      const id = accessToken.replace('token-for-', '');
      return { id, username: `user-${id}`, global_name: `User ${id}`, avatar: 'abc123' };
    },
  };
}

function doc(over: Record<string, unknown> = {}) {
  return {
    schemaVersion: 3,
    id: 'char-1',
    name: 'Seelah',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    level: 1,
    abilityMethod: 'manual',
    decisions: { class: 'paladin' },
    purchases: {},
    goldSpent: 0,
    equipped: { armor: null, mainHand: null, offHand: null },
    ...over,
  };
}

let app: FastifyInstance;
let db: Db;
let config: Config;

/** Drives the whole OAuth round trip against the fake Discord and returns the session cookie
 *  the browser would then send on every request. */
async function signIn(discordId: string): Promise<string> {
  const start = await app.inject({ method: 'GET', url: '/api/auth/discord' });
  assert.equal(start.statusCode, 302);
  const state = new URL(start.headers.location as string).searchParams.get('state');
  const oauthCookie = start.cookies.find((c) => c.name === 'pm_oauth');
  assert.ok(state && oauthCookie);

  const cb = await app.inject({
    method: 'GET',
    url: `/api/auth/discord/callback?code=${discordId}&state=${state}`,
    cookies: { pm_oauth: oauthCookie.value },
  });
  assert.equal(cb.statusCode, 302);
  const session = cb.cookies.find((c) => c.name === 'pm_session');
  assert.ok(session, 'callback should set a session cookie');
  return session.value;
}

const asUser = (cookie: string) => ({ pm_session: cookie });
// Browsers attach Origin to every write; the app rejects a write that carries a foreign one.
const WRITE_HEADERS = { origin: 'http://localhost:5173' };

before(() => {
  config = loadConfig(ENV);
});

beforeEach(() => {
  db = openDb(':memory:');
  ({ app } = buildApp({ config, db, discord: fakeDiscord() }));
});

after(() => app?.close());

describe('health', () => {
  test('answers without a session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { ok: true });
  });
});

describe('discord sign-in', () => {
  test('sends the browser to Discord with our client id and a state', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/discord' });
    const url = new URL(res.headers.location as string);
    assert.equal(url.origin + url.pathname, 'https://discord.com/api/oauth2/authorize');
    assert.equal(url.searchParams.get('client_id'), 'test-client');
    assert.equal(url.searchParams.get('scope'), 'identify');
    assert.ok(url.searchParams.get('state'));
  });

  test('creates the account on first sign-in and reuses it on the second', async () => {
    await signIn('123');
    const cookie = await signIn('123');
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', cookies: asUser(cookie) });
    assert.equal(me.json().user.username, 'user-123');
    const users = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
    assert.equal(users.n, 1, 'the same Discord id must not create a second account');
  });

  test('rejects a callback whose state does not match the cookie', async () => {
    const start = await app.inject({ method: 'GET', url: '/api/auth/discord' });
    const oauthCookie = start.cookies.find((c) => c.name === 'pm_oauth')!;
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/discord/callback?code=123&state=forged',
      cookies: { pm_oauth: oauthCookie.value },
    });
    assert.equal(res.statusCode, 302);
    assert.match(res.headers.location as string, /login=failed/);
    assert.equal(res.cookies.find((c) => c.name === 'pm_session'), undefined);
  });

  test('rejects a callback with no state cookie at all', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/discord/callback?code=123&state=x' });
    assert.match(res.headers.location as string, /login=failed/);
  });

  test('reports no user when signed out, and forgets the session on logout', async () => {
    const anon = await app.inject({ method: 'GET', url: '/api/auth/me' });
    assert.deepEqual(anon.json(), { user: null });

    const cookie = await signIn('123');
    const out = await app.inject({ method: 'POST', url: '/api/auth/logout', cookies: asUser(cookie), headers: WRITE_HEADERS });
    assert.equal(out.statusCode, 200);
    const after = await app.inject({ method: 'GET', url: '/api/auth/me', cookies: asUser(cookie) });
    assert.deepEqual(after.json(), { user: null });
  });

  test('does not redirect off-site after login', async () => {
    const start = await app.inject({ method: 'GET', url: '/api/auth/discord?redirect=https://evil.example/steal' });
    const oauthCookie = start.cookies.find((c) => c.name === 'pm_oauth')!;
    const state = new URL(start.headers.location as string).searchParams.get('state');
    const cb = await app.inject({
      method: 'GET',
      url: `/api/auth/discord/callback?code=123&state=${state}`,
      cookies: { pm_oauth: oauthCookie.value },
    });
    assert.equal(cb.headers.location, 'http://localhost:5173/');
  });

  test('an unforgeable session cookie — a made-up value is not a session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me', cookies: { pm_session: 'made-up' } });
    assert.deepEqual(res.json(), { user: null });
  });
});

describe('characters', () => {
  test('every route requires a session', async () => {
    for (const [method, url] of [
      ['GET', '/api/characters'],
      ['GET', '/api/characters/char-1'],
      ['PUT', '/api/characters/char-1'],
      ['DELETE', '/api/characters/char-1'],
      ['POST', '/api/characters/import'],
    ] as const) {
      const res = await app.inject({ method, url, payload: method === 'GET' ? undefined : {}, headers: WRITE_HEADERS });
      assert.equal(res.statusCode, 401, `${method} ${url}`);
    }
  });

  test('saves, reads back, lists, and deletes', async () => {
    const cookie = await signIn('123');
    const put = await app.inject({ method: 'PUT', url: '/api/characters/char-1', payload: doc(), cookies: asUser(cookie), headers: WRITE_HEADERS });
    assert.equal(put.statusCode, 200);

    const one = await app.inject({ method: 'GET', url: '/api/characters/char-1', cookies: asUser(cookie) });
    assert.equal(one.json().character.name, 'Seelah');
    assert.equal(one.json().character.decisions.class, 'paladin');

    const list = await app.inject({ method: 'GET', url: '/api/characters', cookies: asUser(cookie) });
    assert.equal(list.json().characters.length, 1);

    const del = await app.inject({ method: 'DELETE', url: '/api/characters/char-1', cookies: asUser(cookie), headers: WRITE_HEADERS });
    assert.equal(del.statusCode, 200);
    const empty = await app.inject({ method: 'GET', url: '/api/characters', cookies: asUser(cookie) });
    assert.deepEqual(empty.json().characters, []);
  });

  test('a second save of the same id replaces the first', async () => {
    const cookie = await signIn('123');
    await app.inject({ method: 'PUT', url: '/api/characters/char-1', payload: doc(), cookies: asUser(cookie), headers: WRITE_HEADERS });
    await app.inject({
      method: 'PUT', url: '/api/characters/char-1', headers: WRITE_HEADERS, cookies: asUser(cookie),
      payload: doc({ name: 'Seelah the Redeemer', updatedAt: '2026-01-03T00:00:00.000Z' }),
    });
    const list = await app.inject({ method: 'GET', url: '/api/characters', cookies: asUser(cookie) });
    assert.equal(list.json().characters.length, 1);
    assert.equal(list.json().characters[0].name, 'Seelah the Redeemer');
  });

  test('one account cannot see or touch another account\'s characters', async () => {
    const mine = await signIn('123');
    const theirs = await signIn('456');
    await app.inject({ method: 'PUT', url: '/api/characters/char-1', payload: doc(), cookies: asUser(mine), headers: WRITE_HEADERS });

    const list = await app.inject({ method: 'GET', url: '/api/characters', cookies: asUser(theirs) });
    assert.deepEqual(list.json().characters, [], 'the roster must be scoped to the account');
    const read = await app.inject({ method: 'GET', url: '/api/characters/char-1', cookies: asUser(theirs) });
    assert.equal(read.statusCode, 404);
    const del = await app.inject({ method: 'DELETE', url: '/api/characters/char-1', cookies: asUser(theirs), headers: WRITE_HEADERS });
    assert.equal(del.statusCode, 404);

    // …and mine is untouched by their attempts.
    const still = await app.inject({ method: 'GET', url: '/api/characters/char-1', cookies: asUser(mine) });
    assert.equal(still.statusCode, 200);
  });

  test('two accounts may hold characters with the same id', async () => {
    const mine = await signIn('123');
    const theirs = await signIn('456');
    await app.inject({ method: 'PUT', url: '/api/characters/char-1', payload: doc({ name: 'Mine' }), cookies: asUser(mine), headers: WRITE_HEADERS });
    await app.inject({ method: 'PUT', url: '/api/characters/char-1', payload: doc({ name: 'Theirs' }), cookies: asUser(theirs), headers: WRITE_HEADERS });
    const a = await app.inject({ method: 'GET', url: '/api/characters/char-1', cookies: asUser(mine) });
    const b = await app.inject({ method: 'GET', url: '/api/characters/char-1', cookies: asUser(theirs) });
    assert.equal(a.json().character.name, 'Mine');
    assert.equal(b.json().character.name, 'Theirs');
  });

  test('rejects a body whose id disagrees with the URL', async () => {
    const cookie = await signIn('123');
    const res = await app.inject({ method: 'PUT', url: '/api/characters/char-9', payload: doc(), cookies: asUser(cookie), headers: WRITE_HEADERS });
    assert.equal(res.statusCode, 400);
  });

  test('rejects a body that is not a character', async () => {
    const cookie = await signIn('123');
    for (const payload of [{ id: 'char-1' }, { ...doc(), updatedAt: 'whenever' }, { ...doc(), name: 42 }]) {
      const res = await app.inject({ method: 'PUT', url: '/api/characters/char-1', payload, cookies: asUser(cookie), headers: WRITE_HEADERS });
      assert.equal(res.statusCode, 400, JSON.stringify(payload).slice(0, 40));
    }
  });

  test('deleting something that is not there is a 404, not a silent success', async () => {
    const cookie = await signIn('123');
    const res = await app.inject({ method: 'DELETE', url: '/api/characters/nope', cookies: asUser(cookie), headers: WRITE_HEADERS });
    assert.equal(res.statusCode, 404);
  });

  test('a cross-origin write is refused even with a valid session', async () => {
    const cookie = await signIn('123');
    const res = await app.inject({
      method: 'PUT', url: '/api/characters/char-1', payload: doc(),
      cookies: asUser(cookie), headers: { origin: 'https://evil.example' },
    });
    assert.equal(res.statusCode, 403);
  });
});

describe('import', () => {
  test('uploads a whole local roster at once', async () => {
    const cookie = await signIn('123');
    const res = await app.inject({
      method: 'POST', url: '/api/characters/import', cookies: asUser(cookie), headers: WRITE_HEADERS,
      payload: { characters: [doc({ id: 'a', name: 'A' }), doc({ id: 'b', name: 'B' })] },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().imported, 2);
    const list = await app.inject({ method: 'GET', url: '/api/characters', cookies: asUser(cookie) });
    assert.deepEqual(list.json().characters.map((c: { name: string }) => c.name).sort(), ['A', 'B']);
  });

  test('one bad character rejects the batch and stores none of it', async () => {
    const cookie = await signIn('123');
    const res = await app.inject({
      method: 'POST', url: '/api/characters/import', cookies: asUser(cookie), headers: WRITE_HEADERS,
      payload: { characters: [doc({ id: 'a' }), { id: 'b' }] },
    });
    assert.equal(res.statusCode, 400);
    const list = await app.inject({ method: 'GET', url: '/api/characters', cookies: asUser(cookie) });
    assert.deepEqual(list.json().characters, [], 'a rejected batch must leave the account untouched');
  });

  test('re-importing the same roster is idempotent', async () => {
    const cookie = await signIn('123');
    const payload = { characters: [doc({ id: 'a' }), doc({ id: 'b' })] };
    await app.inject({ method: 'POST', url: '/api/characters/import', payload, cookies: asUser(cookie), headers: WRITE_HEADERS });
    await app.inject({ method: 'POST', url: '/api/characters/import', payload, cookies: asUser(cookie), headers: WRITE_HEADERS });
    const list = await app.inject({ method: 'GET', url: '/api/characters', cookies: asUser(cookie) });
    assert.equal(list.json().characters.length, 2);
  });
});
