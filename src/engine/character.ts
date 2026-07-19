import type { CharacterDoc, PlayState } from './types';

export const SCHEMA_VERSION = 3;

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
  // v2 → v3: the spell tracker is keyed by casting class, since a multiclass caster spends each
  // class's slots independently. Pre-v3 play state is keyed by spell level alone; it belongs to
  // whatever class the character was casting as, which is the class decision.
  if (doc.schemaVersion < 3 && doc.play) doc = { ...doc, play: migrateSpellTracker(doc.play, doc.decisions['class'] as string | undefined) };
  if (doc.schemaVersion < SCHEMA_VERSION) doc = { ...doc, schemaVersion: SCHEMA_VERSION };
  return doc;
}

/** True when a map is keyed by spell level (`{1: …}`) rather than by class id (`{wizard: …}`). */
function keyedBySpellLevel(m: Record<string, unknown> | undefined): boolean {
  return !!m && Object.keys(m).length > 0 && Object.keys(m).every((k) => /^\d+$/.test(k));
}

/** Move level-keyed tracker maps under the character's casting class. Without a class to file
 *  them under the old entries can't be interpreted, so they're dropped rather than left in a
 *  shape the rest of the code would misread. */
function migrateSpellTracker(play: PlayState, classId: string | undefined): PlayState {
  const move = <T,>(m: Record<string, T> | undefined): Record<string, T> | undefined => {
    if (!keyedBySpellLevel(m)) return m;
    return classId ? ({ [classId]: m } as unknown as Record<string, T>) : {};
  };
  return {
    ...play,
    usedSlots: (move(play.usedSlots as unknown as Record<string, unknown>) ?? {}) as PlayState['usedSlots'],
    prepared: move(play.prepared as unknown as Record<string, unknown>) as PlayState['prepared'],
    castPrepared: move(play.castPrepared as unknown as Record<string, unknown>) as PlayState['castPrepared'],
  };
}
