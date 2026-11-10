import { describe, expect, it } from 'vitest';
import { newCharacter, SCHEMA_VERSION, withDecision } from '../engine/character';
import { resolve } from '../engine/resolve';
import { emptyPlayState, type CharacterDoc } from '../engine/types';
import { exportFileName, ImportError, parseCharacterFile, serializeCharacter } from './transfer';

const NOW = '2026-11-10T12:00:00.000Z';

function fighter(): CharacterDoc {
  let d = newCharacter('their-id', 'Valeria');
  d = withDecision(d, 'ability-base', { str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8 });
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'floating-bonus', ['str']);
  d = withDecision(d, 'class', 'fighter');
  return { ...d, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-02-01T00:00:00.000Z', play: { ...emptyPlayState(), hpDamage: 4 } };
}

const refused = (text: string) => {
  try {
    parseCharacterFile(text, 'my-id', NOW);
  } catch (e) {
    expect(e).toBeInstanceOf(ImportError);
    return (e as Error).message;
  }
  throw new Error('expected the import to be refused');
};

describe('sharing a character between rosters', () => {
  it('round-trips: the importer gets the same character, sheet for sheet', () => {
    const original = fighter();
    const imported = parseCharacterFile(serializeCharacter(original), 'my-id', NOW);
    expect(imported.decisions).toEqual(original.decisions);
    expect(imported.play).toEqual(original.play);
    expect(resolve(imported).sheet.stats['hp:max'].total).toBe(resolve(original).sheet.stats['hp:max'].total);
  });

  it('files it as a new character of the importer’s, edited now', () => {
    const imported = parseCharacterFile(serializeCharacter(fighter()), 'my-id', NOW);
    expect(imported.id).toBe('my-id');
    expect(imported.updatedAt).toBe(NOW);
    expect(imported.createdAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('migrates a file exported from an older schema', () => {
    const { level: _level, ...old } = fighter();
    const imported = parseCharacterFile(JSON.stringify({ ...old, schemaVersion: 1 }), 'my-id', NOW);
    expect(imported.schemaVersion).toBe(SCHEMA_VERSION);
    expect(imported.level).toBe(1);
  });

  it('fills in fields a hand-edited file left out instead of breaking the roster', () => {
    const { purchases: _p, equipped: _e, goldSpent: _g, ...partial } = fighter();
    const imported = parseCharacterFile(JSON.stringify({ ...partial, name: '  ' }), 'my-id', NOW);
    expect(imported.name).toBe('Imported Hero');
    expect(imported.equipped).toEqual({ armor: null, mainHand: null, offHand: null });
    expect(() => resolve(imported)).not.toThrow();
  });

  it('accepts a file with a byte-order mark, as some editors save one', () => {
    expect(parseCharacterFile(`﻿${serializeCharacter(fighter())}`, 'my-id', NOW).name).toBe('Valeria');
  });

  it('refuses what is not a character, before it can reach storage', () => {
    expect(refused('not json')).toMatch(/not valid JSON/);
    expect(refused('{}')).toMatch(/not a Pathmaker character/);
    expect(refused('[]')).toMatch(/not a Pathmaker character/);
    expect(refused(JSON.stringify({ schemaVersion: 3, name: 'x', decisions: [] }))).toMatch(/not a Pathmaker character/);
  });

  it('refuses a file the engine cannot resolve', () => {
    const broken = { ...fighter(), decisions: { 'ability-base': null } };
    expect(refused(JSON.stringify(broken))).toMatch(/could not be read/);
  });

  it('tells the importer to reload when the file is from a newer version', () => {
    expect(refused(JSON.stringify({ ...fighter(), schemaVersion: SCHEMA_VERSION + 1 }))).toMatch(/newer version/);
  });

  it('names the file after the character', () => {
    expect(exportFileName({ ...fighter(), name: 'Sir Ëdric the Bold!' })).toBe('sir-dric-the-bold.pathmaker.json');
    expect(exportFileName({ ...fighter(), name: '???' })).toBe('character.pathmaker.json');
  });
});
