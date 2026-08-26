import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { pruneSessions } from './db.ts';

const config = loadConfig();
const { app, db } = buildApp({ config, logger: true });

// Expired sessions accumulate silently otherwise; once an hour is plenty.
const sweep = setInterval(() => pruneSessions(db), 3_600_000);
sweep.unref();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.close().then(() => { db.close(); process.exit(0); });
  });
}

app.listen({ port: config.port, host: config.host })
  .then(() => app.log.info(`pathmaker-api listening on ${config.host}:${config.port} for ${config.appOrigin}`))
  .catch((err) => { app.log.error(err); process.exit(1); });
