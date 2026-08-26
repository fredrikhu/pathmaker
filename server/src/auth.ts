import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from './config.ts';
import { get, run, type Db, type SessionRow, type UserRow } from './db.ts';

export const SESSION_COOKIE = 'pm_session';
const OAUTH_COOKIE = 'pm_oauth';

const DISCORD_AUTHORIZE = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN = 'https://discord.com/api/oauth2/token';
const DISCORD_ME = 'https://discord.com/api/users/@me';

/** `identify` is the whole ask: an id to key the account on, plus a name and avatar to show in
 *  the corner. No email, no guild list, no message access. */
const SCOPE = 'identify';

export function newId(): string {
  return randomBytes(24).toString('base64url');
}

/** The Discord user fields we keep. Everything else in the response is ignored. */
interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
}

/** Injectable so tests can drive the whole callback without reaching the network. */
export interface DiscordClient {
  exchangeCode(code: string): Promise<string>;
  fetchUser(accessToken: string): Promise<DiscordUser>;
}

export function realDiscordClient(config: Config): DiscordClient {
  return {
    async exchangeCode(code) {
      const res = await fetch(DISCORD_TOKEN, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.discord.clientId,
          client_secret: config.discord.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.discord.redirectUri,
        }),
      });
      if (!res.ok) throw new Error(`Discord token exchange failed: ${res.status} ${await res.text()}`);
      const body = (await res.json()) as { access_token?: string };
      if (!body.access_token) throw new Error('Discord token exchange returned no access_token');
      return body.access_token;
    },
    async fetchUser(accessToken) {
      const res = await fetch(DISCORD_ME, { headers: { authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error(`Discord user fetch failed: ${res.status}`);
      return (await res.json()) as DiscordUser;
    },
  };
}

function upsertUser(db: Db, d: DiscordUser): UserRow {
  const now = new Date().toISOString();
  const existing = get<UserRow>(db, 'SELECT * FROM users WHERE discord_id = ?', d.id);
  if (existing) {
    // The display name and avatar are Discord's to change; refresh them on every sign-in.
    run(db, 'UPDATE users SET username = ?, global_name = ?, avatar = ?, last_login_at = ? WHERE id = ?',
        d.username, d.global_name ?? null, d.avatar ?? null, now, existing.id);
    return { ...existing, username: d.username, global_name: d.global_name ?? null, avatar: d.avatar ?? null, last_login_at: now };
  }
  const row: UserRow = {
    id: newId(), discord_id: d.id, username: d.username,
    global_name: d.global_name ?? null, avatar: d.avatar ?? null,
    created_at: now, last_login_at: now,
  };
  run(db, `INSERT INTO users (id, discord_id, username, global_name, avatar, created_at, last_login_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
      row.id, row.discord_id, row.username, row.global_name, row.avatar, row.created_at, row.last_login_at);
  return row;
}

function createSession(db: Db, userId: string, days: number): { id: string; expiresAt: Date } {
  const id = newId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + days * 86_400_000);
  run(db, 'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
      id, userId, now.toISOString(), expiresAt.toISOString());
  return { id, expiresAt };
}

/** The signed-in user for this request, or null. An expired session row is deleted on sight so
 *  a stale cookie stops costing a lookup. */
export function userFor(db: Db, req: FastifyRequest): UserRow | null {
  const raw = req.cookies[SESSION_COOKIE];
  if (!raw) return null;
  const unsigned = req.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;
  const session = get<SessionRow>(db, 'SELECT * FROM sessions WHERE id = ?', unsigned.value);
  if (!session) return null;
  if (new Date(session.expires_at) <= new Date()) {
    run(db, 'DELETE FROM sessions WHERE id = ?', session.id);
    return null;
  }
  return get<UserRow>(db, 'SELECT * FROM users WHERE id = ?', session.user_id) ?? null;
}

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.global_name ?? u.username,
    // The client builds the CDN URL; sending the raw hash keeps the size choice on its side.
    avatar: u.avatar,
    discordId: u.discord_id,
  };
}

/** A same-origin redirect target, or '/' if the caller tried to send us somewhere else. Without
 *  this check the login endpoint would be an open redirect. */
function safeRedirect(raw: string | undefined): string {
  if (!raw) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function registerAuthRoutes(app: FastifyInstance, db: Db, config: Config, discord: DiscordClient): void {
  const cookieBase = {
    path: '/',
    httpOnly: true,
    secure: config.secureCookies,
    // Lax is what keeps a cross-site form from carrying the session into a state-changing
    // request; the OAuth callback is a top-level GET, which Lax still allows.
    sameSite: 'lax' as const,
    signed: true,
  };

  /** Step 1: hand the browser off to Discord, remembering where to land afterwards. */
  app.get('/api/auth/discord', async (req, reply) => {
    const { redirect } = req.query as { redirect?: string };
    const state = newId();
    reply.setCookie(OAUTH_COOKIE, JSON.stringify({ state, redirect: safeRedirect(redirect) }), {
      ...cookieBase, maxAge: 600,
    });
    const url = new URL(DISCORD_AUTHORIZE);
    url.searchParams.set('client_id', config.discord.clientId);
    url.searchParams.set('redirect_uri', config.discord.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', SCOPE);
    url.searchParams.set('state', state);
    // Always re-show the consent screen's account picker rather than silently reusing whichever
    // Discord account the browser is signed into.
    url.searchParams.set('prompt', 'consent');
    return reply.redirect(url.toString());
  });

  /** Step 2: Discord sends the browser back with a code. Verify the state, trade the code for
   *  the user's identity, and start a session. The Discord access token is used once, here,
   *  and never stored. */
  app.get('/api/auth/discord/callback', async (req, reply) => {
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };
    const rawCookie = req.cookies[OAUTH_COOKIE];
    const unsigned = rawCookie ? req.unsignCookie(rawCookie) : null;
    reply.clearCookie(OAUTH_COOKIE, { path: '/' });

    if (error) return reply.redirect(`${config.appOrigin}/#/?login=cancelled`);
    if (!code || !state || !unsigned?.valid || !unsigned.value) {
      return reply.redirect(`${config.appOrigin}/#/?login=failed`);
    }
    let pending: { state: string; redirect: string };
    try {
      pending = JSON.parse(unsigned.value) as { state: string; redirect: string };
    } catch {
      return reply.redirect(`${config.appOrigin}/#/?login=failed`);
    }
    if (!constantTimeEqual(pending.state, state)) {
      return reply.redirect(`${config.appOrigin}/#/?login=failed`);
    }

    let user: UserRow;
    try {
      const token = await discord.exchangeCode(code);
      user = upsertUser(db, await discord.fetchUser(token));
    } catch (e) {
      req.log.error({ err: e }, 'discord sign-in failed');
      return reply.redirect(`${config.appOrigin}/#/?login=failed`);
    }

    const session = createSession(db, user.id, config.sessionDays);
    reply.setCookie(SESSION_COOKIE, session.id, { ...cookieBase, expires: session.expiresAt });
    return reply.redirect(`${config.appOrigin}${safeRedirect(pending.redirect)}`);
  });

  app.get('/api/auth/me', async (req, reply) => {
    const user = userFor(db, req);
    if (!user) return reply.code(200).send({ user: null });
    return reply.send({ user: publicUser(user) });
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const raw = req.cookies[SESSION_COOKIE];
    const unsigned = raw ? req.unsignCookie(raw) : null;
    if (unsigned?.valid && unsigned.value) {
      run(db, 'DELETE FROM sessions WHERE id = ?', unsigned.value);
    }
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.send({ ok: true });
  });
}

/** Route guard: resolves the user or answers 401 and returns null. */
export function requireUser(db: Db, req: FastifyRequest, reply: FastifyReply): UserRow | null {
  const user = userFor(db, req);
  if (!user) {
    reply.code(401).send({ error: 'not signed in' });
    return null;
  }
  return user;
}
