import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import { registerAuthRoutes, realDiscordClient, type DiscordClient } from './auth.ts';
import { registerCharacterRoutes } from './characters.ts';
import { openDb, pruneSessions, type Db } from './db.ts';
import type { Config } from './config.ts';

export interface BuildOptions {
  config: Config;
  /** Supplied by tests; production opens the file named in the config. */
  db?: Db;
  /** Supplied by tests to stand in for Discord's token and identity endpoints. */
  discord?: DiscordClient;
  logger?: boolean;
}

/** A fixed-window limiter, in memory and per process. Enough to blunt a brute-force loop against
 *  the sign-in endpoints; a real DDoS is nginx's problem, not this service's. */
function rateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (key: string, now = Date.now()): boolean => {
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      // Opportunistic sweep — the map only ever holds keys seen this window.
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}

export function buildApp(opts: BuildOptions): { app: FastifyInstance; db: Db } {
  const { config } = opts;
  const db = opts.db ?? openDb(config.dbPath);
  pruneSessions(db);

  const app = Fastify({
    logger: opts.logger ?? false,
    // A whole roster upload is the largest legitimate body.
    bodyLimit: 8 * 1024 * 1024,
    trustProxy: true,
  });

  app.register(cookie, { secret: config.sessionSecret });

  /** The session cookie is SameSite=Lax, which already blocks a cross-site form from carrying it
   *  into a write. Checking Origin as well costs nothing and catches anything Lax does not. */
  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return;
    const origin = req.headers.origin;
    if (origin && origin !== config.appOrigin) {
      return reply.code(403).send({ error: 'cross-origin write rejected' });
    }
  });

  const authLimit = rateLimiter(30, 60_000);
  app.addHook('onRequest', async (req, reply) => {
    if (!req.url.startsWith('/api/auth/')) return;
    if (!authLimit(req.ip)) return reply.code(429).send({ error: 'slow down' });
  });

  app.get('/api/health', async () => ({ ok: true }));

  registerAuthRoutes(app, db, config, opts.discord ?? realDiscordClient(config));
  registerCharacterRoutes(app, db);

  return { app, db };
}
