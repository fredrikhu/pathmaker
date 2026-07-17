import type { CharacterDoc } from './types';

export const SCHEMA_VERSION = 2;

export function newCharacter(id: string, name = 'Unnamed Hero'): CharacterDoc {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    name,
    createdAt: now,
    updatedAt: now,
    level: 1,
    abilityMethod: 'pb20',
    decisions: {
      'ability-base': { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    },
    purchases: {},
    goldSpent: 0,
    equipped: { armor: null, mainHand: null, offHand: null },
  };
}

/** Immutable set of a decision key. */
export function withDecision(doc: CharacterDoc, slot: string, value: unknown): CharacterDoc {
  return { ...doc, updatedAt: new Date().toISOString(), decisions: { ...doc.decisions, [slot]: value } };
}

export function clearDecision(doc: CharacterDoc, slot: string): CharacterDoc {
  const next = { ...doc.decisions };
  delete next[slot];
  return { ...doc, updatedAt: new Date().toISOString(), decisions: next };
}

/** Migrations run at load; keyed from the loaded schemaVersion up to current. */
export function migrate(raw: CharacterDoc): CharacterDoc {
  let doc = raw;
  // v1 → v2: introduce the character level dimension. Pre-v2 docs are level-1 characters and
  // resolve identically once `level` defaults to 1.
  if (doc.schemaVersion < 2 || typeof doc.level !== 'number') doc = { ...doc, level: doc.level ?? 1 };
  if (doc.schemaVersion < SCHEMA_VERSION) doc = { ...doc, schemaVersion: SCHEMA_VERSION };
  return doc;
}
