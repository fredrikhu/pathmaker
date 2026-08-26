import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Db = DatabaseSync;

export interface UserRow {
  id: string;
  discord_id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  created_at: string;
  last_login_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

export interface CharacterRow {
  id: string;
  user_id: string;
  name: string;
  updated_at: string;
  /** The whole CharacterDoc as JSON. The server does no rules math and never interprets it —
   *  the engine that understands this shape lives in the browser. */
  doc: string;
}

/** A character belongs to exactly one account, and its id is only unique within that account —
 *  two people can hold copies of the same exported character without colliding. */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  discord_id    TEXT NOT NULL UNIQUE,
  username      TEXT NOT NULL,
  global_name   TEXT,
  avatar        TEXT,
  created_at    TEXT NOT NULL,
  last_login_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS characters (
  id         TEXT NOT NULL,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  doc        TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS characters_user ON characters(user_id, updated_at DESC);
`;

export function openDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  // WAL keeps a reader (the roster load) from blocking the writer (an autosave mid-build).
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

/** node:sqlite returns untyped `Record<string, SQLOutputValue>` rows and accepts a narrow input
 *  union. Every query in this service goes through these three so the casts live in one place
 *  and the call sites read as plain SQL. */
type Param = string | number | null;

export function all<T>(db: Db, sql: string, ...params: Param[]): T[] {
  return db.prepare(sql).all(...params) as unknown as T[];
}

export function get<T>(db: Db, sql: string, ...params: Param[]): T | undefined {
  return db.prepare(sql).get(...params) as unknown as T | undefined;
}

export function run(db: Db, sql: string, ...params: Param[]): { changes: number } {
  const result = db.prepare(sql).run(...params);
  return { changes: Number(result.changes) };
}

/** Runs `fn` inside a transaction, rolling back if it throws. node:sqlite has no wrapper of its
 *  own, and a partially-applied bulk import would be worse than a rejected one. */
export function transact<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Deletes expired sessions. Called on boot and hourly — a stale row is harmless but unbounded
 *  growth is not. */
export function pruneSessions(db: Db, now = new Date()): number {
  return run(db, 'DELETE FROM sessions WHERE expires_at <= ?', now.toISOString()).changes;
}
