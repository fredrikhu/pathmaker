import type { FastifyInstance } from 'fastify';
import { requireUser } from './auth.ts';
import { all, get, run, transact, type CharacterRow, type Db } from './db.ts';

/** The server stores characters opaquely — the rules engine that understands a doc lives in the
 *  browser. These are the only fields it reads, and the only ones it will reject a write over. */
interface StoredDoc {
  id: string;
  name: string;
  updatedAt: string;
  schemaVersion: number;
}

/** Generous next to a real character (tens of KB) and small enough that a malformed or hostile
 *  body cannot fill the disk. */
const MAX_DOC_BYTES = 512 * 1024;
const MAX_CHARACTERS_PER_USER = 500;
const MAX_IMPORT_BATCH = 100;

type Validation = { ok: true; doc: StoredDoc; json: string } | { ok: false; error: string };

function validateDoc(body: unknown, expectedId?: string): Validation {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, error: 'body must be a character object' };
  const d = body as Record<string, unknown>;
  if (typeof d.id !== 'string' || !d.id) return { ok: false, error: 'id must be a non-empty string' };
  if (expectedId !== undefined && d.id !== expectedId) return { ok: false, error: 'id in body does not match the URL' };
  if (typeof d.name !== 'string') return { ok: false, error: 'name must be a string' };
  if (typeof d.schemaVersion !== 'number') return { ok: false, error: 'schemaVersion must be a number' };
  if (typeof d.updatedAt !== 'string' || Number.isNaN(Date.parse(d.updatedAt))) {
    return { ok: false, error: 'updatedAt must be an ISO timestamp' };
  }
  const json = JSON.stringify(body);
  if (Buffer.byteLength(json, 'utf8') > MAX_DOC_BYTES) return { ok: false, error: 'character is too large' };
  return { ok: true, doc: d as unknown as StoredDoc, json };
}

function countFor(db: Db, userId: string): number {
  return get<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM characters WHERE user_id = ?', userId)!.n;
}

function upsert(db: Db, userId: string, doc: StoredDoc, json: string): void {
  run(db, `INSERT INTO characters (id, user_id, name, updated_at, doc)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id, id) DO UPDATE SET name = excluded.name,
                                                  updated_at = excluded.updated_at,
                                                  doc = excluded.doc`,
      doc.id, userId, doc.name, doc.updatedAt, json);
}

export function registerCharacterRoutes(app: FastifyInstance, db: Db): void {
  /** The whole roster in one response, docs included. A roster is a handful of characters of a
   *  few tens of KB each, and the browser wants every one of them anyway — it resolves each doc
   *  to render the summary line. One round trip beats N. */
  app.get('/api/characters', async (req, reply) => {
    const user = requireUser(db, req, reply);
    if (!user) return;
    const rows = all<CharacterRow>(db, 'SELECT * FROM characters WHERE user_id = ? ORDER BY updated_at DESC', user.id);
    return reply.send({ characters: rows.map((r) => JSON.parse(r.doc) as unknown) });
  });

  app.get('/api/characters/:id', async (req, reply) => {
    const user = requireUser(db, req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const row = get<CharacterRow>(db, 'SELECT * FROM characters WHERE user_id = ? AND id = ?', user.id, id);
    if (!row) return reply.code(404).send({ error: 'no such character' });
    return reply.send({ character: JSON.parse(row.doc) as unknown });
  });

  /** Create or replace. The client is the only writer of a doc and holds the authoritative copy
   *  while a build is open, so a plain last-write-wins upsert is the right semantic. */
  app.put('/api/characters/:id', async (req, reply) => {
    const user = requireUser(db, req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const v = validateDoc(req.body, id);
    if (!v.ok) return reply.code(400).send({ error: v.error });

    const exists = get<unknown>(db, 'SELECT 1 FROM characters WHERE user_id = ? AND id = ?', user.id, id);
    if (!exists && countFor(db, user.id) >= MAX_CHARACTERS_PER_USER) {
      return reply.code(409).send({ error: `an account holds at most ${MAX_CHARACTERS_PER_USER} characters` });
    }
    upsert(db, user.id, v.doc, v.json);
    return reply.send({ ok: true, id, updatedAt: v.doc.updatedAt });
  });

  app.delete('/api/characters/:id', async (req, reply) => {
    const user = requireUser(db, req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const { changes } = run(db, 'DELETE FROM characters WHERE user_id = ? AND id = ?', user.id, id);
    if (!changes) return reply.code(404).send({ error: 'no such character' });
    return reply.send({ ok: true });
  });

  /** Bulk upload, used once when someone signs in on a browser that already holds characters in
   *  localStorage. All-or-nothing: a batch with one bad doc changes nothing, so the client can
   *  report a clean failure rather than a half-moved roster. */
  app.post('/api/characters/import', async (req, reply) => {
    const user = requireUser(db, req, reply);
    if (!user) return;
    const body = req.body as { characters?: unknown };
    if (!Array.isArray(body?.characters)) return reply.code(400).send({ error: 'characters must be an array' });
    if (body.characters.length > MAX_IMPORT_BATCH) {
      return reply.code(400).send({ error: `at most ${MAX_IMPORT_BATCH} characters per import` });
    }

    const validated: { doc: StoredDoc; json: string }[] = [];
    for (const raw of body.characters) {
      const v = validateDoc(raw);
      if (!v.ok) return reply.code(400).send({ error: v.error });
      validated.push({ doc: v.doc, json: v.json });
    }
    const existing = new Set(all<{ id: string }>(db, 'SELECT id FROM characters WHERE user_id = ?', user.id).map((r) => r.id));
    const added = validated.filter((v) => !existing.has(v.doc.id)).length;
    if (existing.size + added > MAX_CHARACTERS_PER_USER) {
      return reply.code(409).send({ error: `an account holds at most ${MAX_CHARACTERS_PER_USER} characters` });
    }

    transact(db, () => {
      for (const v of validated) upsert(db, user.id, v.doc, v.json);
    });
    return reply.send({ ok: true, imported: validated.length, ids: validated.map((v) => v.doc.id) });
  });
}
