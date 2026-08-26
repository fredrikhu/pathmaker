/** Configuration comes entirely from the environment — nothing secret is ever committed.
 *  `loadConfig` throws on a missing required value rather than starting a server that would
 *  fail only once someone tried to sign in. */

export interface Config {
  port: number;
  host: string;
  /** Absolute path to the SQLite file, or ':memory:' in tests. */
  dbPath: string;
  /** Where the browser app is served from — the only origin allowed to make API calls, and
   *  the base for the post-login redirect. */
  appOrigin: string;
  discord: {
    clientId: string;
    clientSecret: string;
    /** Must match a redirect URI registered on the Discord application, character for character. */
    redirectUri: string;
  };
  /** HMAC key for the OAuth state cookie and the session cookie signature. */
  sessionSecret: string;
  /** How long a signed-in session stays valid without re-authenticating. */
  sessionDays: number;
  /** False in local development, where the dev server is plain http and Secure cookies are dropped. */
  secureCookies: boolean;
}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const v = env[key];
  if (!v) throw new Error(`Missing required environment variable ${key}`);
  return v;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const appOrigin = (env.PATHMAKER_APP_ORIGIN ?? 'http://localhost:5173').replace(/\/+$/, '');
  return {
    port: Number(env.PATHMAKER_PORT ?? 8787),
    host: env.PATHMAKER_HOST ?? '127.0.0.1',
    dbPath: env.PATHMAKER_DB ?? '/var/lib/pathmaker/pathmaker.db',
    appOrigin,
    discord: {
      clientId: required(env, 'DISCORD_CLIENT_ID'),
      clientSecret: required(env, 'DISCORD_CLIENT_SECRET'),
      redirectUri: env.DISCORD_REDIRECT_URI ?? `${appOrigin}/api/auth/discord/callback`,
    },
    sessionSecret: required(env, 'SESSION_SECRET'),
    sessionDays: Number(env.PATHMAKER_SESSION_DAYS ?? 30),
    // Anything but an http://localhost origin is assumed to be real HTTPS deployment.
    secureCookies: env.PATHMAKER_SECURE_COOKIES
      ? env.PATHMAKER_SECURE_COOKIES === 'true'
      : !appOrigin.startsWith('http://localhost'),
  };
}
