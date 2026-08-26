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
# Node 24+. Debian/Ubuntu repos ship far older, and `node:sqlite` does not exist before 22 —
# without this the service dies at import with "Cannot find module 'node:sqlite'". The
# NodeSource one-liner fails SILENTLY if curl cannot fetch (a pipeline reports only bash's
# status), so add the repo by hand and check for a 24.x candidate before installing.
install -d /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
apt-get update && apt-cache policy nodejs   # expect a 24.x candidate from deb.nodesource.com
apt-get install -y nodejs
node -e "require('node:sqlite'); console.log('node', process.version, '- node:sqlite ok')"

adduser --system --group --home /opt/pathmaker-api --no-create-home pathmaker
mkdir -p /var/lib/pathmaker /etc/pathmaker /opt/pathmaker-api

# The service writes the database here, and SQLite needs the *directory* writable, not just the
# file — WAL mode creates -wal and -shm siblings alongside it.
chown pathmaker:pathmaker /var/lib/pathmaker
chmod 750 /var/lib/pathmaker

# api.env from server/.env.example — it holds the Discord secret. systemd reads EnvironmentFile
# as root before dropping to User=pathmaker, so the service user never needs to read it.
install -m 600 -o root -g root api.env /etc/pathmaker/api.env

# Install the unit BEFORE the first deploy — publish.ps1 ends in `systemctl restart`, which
# needs the unit to exist. `enable` without `--now`, though: there is no code on the box yet,
# and starting it would only fail-loop until the first deploy lands.
cp server/deploy/pathmaker-api.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable pathmaker-api

# nginx serves the app and proxies /api on the same server block. On a box that ALREADY serves
# the site, do not drop this file over the existing config — that discards the certbot lines and
# takes the site down. Copy just the `location /api/` block into the existing server block.
cp server/deploy/nginx-pathmaker.conf /etc/nginx/sites-available/pathmaker
ln -s /etc/nginx/sites-available/pathmaker /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Then run `publish.ps1` from the repo to put the code on the box; it restarts the service and
fails the deploy if the restart does not come back healthy. Verify:

```bash
curl -fsS http://127.0.0.1:8787/api/health   # the service itself
curl -fsS https://your-domain/api/health     # and through nginx
```

A sign-in that bounces back with `?login=failed` is almost always `DISCORD_REDIRECT_URI` not
matching the Discord app's registered redirect character for character. Check what the service
actually sends, rather than what you think it is:

```bash
curl -s -D - -o /dev/null http://127.0.0.1:8787/api/auth/discord | grep -i '^location:'
```

`api.env` is re-read on every start, so a fix there needs only `systemctl restart pathmaker-api`
— no `daemon-reload`, which is for edits to the unit file itself.

Backups are one file: `/var/lib/pathmaker/pathmaker.db` (plus its `-wal`/`-shm` siblings — copy
with `sqlite3 pathmaker.db ".backup /path/out.db"` rather than `cp`, to catch a consistent state).
