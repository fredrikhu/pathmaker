import { describe, it, expect } from 'vitest';
import { migrate, SCHEMA_VERSION } from './character';
import type { CharacterDoc } from './types';

/** A v2 document as it would have been written to localStorage before the tracker was keyed
 *  by class: usedSlots / prepared / castPrepared indexed by spell level alone. */
function v2Doc(play: unknown, classId: string | null = 'wizard'): CharacterDoc {
  return {
    schemaVersion: 2, id: 'x', name: 'Ezren', createdAt: '', updatedAt: '', level: 5,
    abilityMethod: 'manual',
    decisions: classId ? { class: classId } : {},
    purchases: {}, goldSpent: 0,
    equipped: { armor: null, mainHand: null, offHand: null },
    play: play as CharacterDoc['play'],
  };
}

describe('migrate: spell tracker keyed by class (v2 → v3)', () => {
  it('files a legacy tracker under the character class and keeps every entry', () => {
    const doc = migrate(v2Doc({
      hpDamage: 3,
      usedSlots: { 1: 2, 2: 1 },
      prepared: { 1: ['magic-missile', 'shield'] },
      castPrepared: { 1: [0] },
    }));
    expect(doc.schemaVersion).toBe(SCHEMA_VERSION);
    expect(doc.play!.usedSlots).toEqual({ wizard: { 1: 2, 2: 1 } });
    expect(doc.play!.prepared).toEqual({ wizard: { 1: ['magic-missile', 'shield'] } });
    expect(doc.play!.castPrepared).toEqual({ wizard: { 1: [0] } });
    // Untouched play state survives.
    expect(doc.play!.hpDamage).toBe(3);
  });

  it('leaves an already-migrated tracker alone', () => {
    const already = { usedSlots: { cleric: { 1: 1 } }, prepared: { cleric: { 1: ['bless'] } } };
    const doc = migrate({ ...v2Doc(already), schemaVersion: 3 });
    expect(doc.play!.usedSlots).toEqual({ cleric: { 1: 1 } });
    expect(doc.play!.prepared).toEqual({ cleric: { 1: ['bless'] } });
  });

  it('is idempotent — migrating twice does not nest the maps', () => {
    const once = migrate(v2Doc({ usedSlots: { 1: 2 } }));
    const twice = migrate(once);
    expect(twice.play!.usedSlots).toEqual({ wizard: { 1: 2 } });
  });

  it('drops a legacy tracker that has no class to belong to', () => {
    // Without a class the old entries cannot be interpreted; leaving them would put the map in a
    // shape the rest of the code reads as class ids.
    const doc = migrate(v2Doc({ usedSlots: { 1: 2 } }, null));
    expect(doc.play!.usedSlots).toEqual({});
  });

  it('leaves a document with no play state untouched', () => {
    const doc = migrate({ ...v2Doc(undefined), play: undefined });
    expect(doc.play).toBeUndefined();
    expect(doc.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('still applies the v1 → v2 level default', () => {
    const v1 = { ...v2Doc(undefined), schemaVersion: 1, level: undefined } as unknown as CharacterDoc;
    expect(migrate(v1).level).toBe(1);
  });
});
