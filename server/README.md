# Pathmaker API

Accounts (Discord sign-in) and character storage for the Pathmaker app. Fastify + SQLite, no
native modules — storage is Node's built-in `node:sqlite`, so **Node 24 or newer is required**.

The service stores characters **opaquely**: a character is a JSON blob with an id, a name and a
timestamp. Every rule in Pathfinder lives in the browser's engine, and this service knows none of
them. That is deliberate — content and rules ship with the static app, so adding a spell never
means deploying the API.

## Endpoints

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness probe. |
| `GET` | `/api/auth/discord` | Redirects to Discord's consent screen. `?redirect=` is a same-origin path to return to. |
| `GET` | `/api/auth/discord/callback` | Discord returns here; verifies state, starts a session, redirects into the app. |
| `GET` | `/api/auth/me` | `{ user }` or `{ user: null }`. Never 401s — being signed out is an answer. |
| `POST` | `/api/auth/logout` | Ends the session. |
| `GET` | `/api/characters` | The whole roster, docs included, newest first. |
| `GET` | `/api/characters/:id` | One character. |
| `PUT` | `/api/characters/:id` | Create or replace. Last write wins. |
| `DELETE` | `/api/characters/:id` | Remove one. |
| `POST` | `/api/characters/import` | Bulk upload (`{ characters: [...] }`), all-or-nothing. |

Everything under `/api/characters` requires a session and is scoped to it — a character id is
only unique within an account, so two people can hold copies of the same exported character.

## Security posture

- **Session** — a random id in an HttpOnly, `SameSite=Lax`, signed cookie; the row lives in
  SQLite so a session can be revoked. Discord's access token is used once, at sign-in, and never
  stored.
- **Scope** — `identify` only: an id, a display name and an avatar hash. No email, no guilds.
- **CSRF** — `SameSite=Lax` keeps the cookie off cross-site writes, and every non-GET is
  additionally rejected unless its `Origin` is `PATHMAKER_APP_ORIGIN`.
- **Open redirect** — the post-login `redirect` must be a same-origin path or it is discarded.
- **Limits** — 512 KB per character, 500 characters per account, 100 per import, and a fixed
  window of 30 requests/minute/IP on the auth routes.

## Setting up the Discord application

This is the one part that has to be done by hand, in your own Discord account:

1. Go to <https://discord.com/developers/applications> → **New Application**, name it Pathmaker.
2. **OAuth2** → **Redirects** → add exactly:
   `https://your-domain/api/auth/discord/callback` (and `http://localhost:5173/api/auth/discord/callback`
   if you want sign-in to work in development).
3. Copy the **Client ID**, and **Reset Secret** to get a **Client Secret**.
4. Put both into `/etc/pathmaker/api.env` (see `.env.example`). Nothing else needs configuring —
   no bot, no guild install, no privileged intents.

## Local development

```bash
cd server
npm install
cp .env.example .env.dev      # fill in the Discord values; localhost origins
node --env-file=.env.dev src/index.ts
```

Then `npm run dev` in the repo root — Vite proxies `/api` to `127.0.0.1:8787`, so the browser
sees one origin and the session cookie works.

```bash
npm test          # Node's test runner; 20 tests, no network — Discord is faked
npm run typecheck
```

## Deploying

`publish.ps1` in the repo root does this. First time on a box:

```bash
adduser --system --group --home /opt/pathmaker-api pathmaker
mkdir -p /var/lib/pathmaker /etc/pathmaker /opt/pathmaker-api
chown pathmaker:pathmaker /var/lib/pathmaker

# api.env from server/.env.example — it holds the Discord secret
install -m 600 -o pathmaker -g pathmaker api.env /etc/pathmaker/api.env

cp server/deploy/pathmaker-api.service /etc/systemd/system/
systemctl enable --now pathmaker-api

# nginx serves the app and proxies /api on the same server block
cp server/deploy/nginx-pathmaker.conf /etc/nginx/sites-available/pathmaker
ln -s /etc/nginx/sites-available/pathmaker /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Backups are one file: `/var/lib/pathmaker/pathmaker.db` (plus its `-wal`/`-shm` siblings — copy
with `sqlite3 pathmaker.db ".backup /path/out.db"` rather than `cp`, to catch a consistent state).
