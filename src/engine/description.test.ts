import { describe, it, expect } from 'vitest';
import { resolve } from './resolve';
import {
  DESCRIPTION_FIELDS, filledDescription, readDescription, withDescriptionField,
} from './description';
import { characterPortrait } from './portrait';
import { newCharacter, withDecision } from './character';
import type { CharacterDoc } from './types';

function described(): CharacterDoc {
  let d = newCharacter('t-desc', 'Valeria');
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'class', 'fighter');
  d = withDescriptionField(d, 'gender', 'Female');
  d = withDescriptionField(d, 'pronouns', 'she/her');
  d = withDescriptionField(d, 'hair', 'Black, cropped short');
  d = withDescriptionField(d, 'homeland', 'Andoran');
  d = withDescriptionField(d, 'player', 'Fredrik');
  return d;
}

describe('reading and writing', () => {
  it('is empty on a character nobody has described', () => {
    const d = readDescription(newCharacter('t-desc-blank', 'Nobody'));
    for (const f of DESCRIPTION_FIELDS) expect(d[f.key]).toBe('');
  });

  it('round-trips a field', () => {
    expect(readDescription(described()).gender).toBe('Female');
    expect(readDescription(described()).pronouns).toBe('she/her');
  });

  it('keeps a cleared field cleared rather than reverting it', () => {
    const cleared = withDescriptionField(described(), 'gender', '');
    expect(readDescription(cleared).gender).toBe('');
    // Clearing one field must not disturb its neighbours.
    expect(readDescription(cleared).pronouns).toBe('she/her');
  });

  it('trims whitespace, so a stray space is not treated as a value', () => {
    const d = withDescriptionField(newCharacter('t-desc-ws', 'X'), 'eyes', '   ');
    expect(readDescription(d).eyes).toBe('');
    expect(filledDescription(d)).toEqual([]);
  });

  it('survives a document whose description is junk', () => {
    for (const junk of [null, 'a string', 42, ['an', 'array'], { gender: 7 }]) {
      const d = withDecision(newCharacter('t-desc-junk', 'X'), 'description', junk);
      expect(() => readDescription(d)).not.toThrow();
      expect(readDescription(d).gender).toBe('');
    }
  });

  it('lists only the filled fields, in form order', () => {
    expect(filledDescription(described()).map((f) => f.label))
      .toEqual(['Gender', 'Pronouns', 'Hair', 'Homeland', 'Player']);
  });
});

describe('nothing here reaches the rules', () => {
  it('leaves every computed number untouched', () => {
    const bare = { ...newCharacter('t-desc-eq', 'A'), decisions: { ...described().decisions } };
    const plain = withDecision(bare, 'description', undefined);
    const a = resolve(described());
    const b = resolve(plain);
    expect(a.sheet.stats['hp:max'].total).toBe(b.sheet.stats['hp:max'].total);
    expect(a.sheet.summaryLine).toBe(b.sheet.summaryLine);
    expect(a.issues).toEqual(b.issues);
  });
});

describe('the backstory export', () => {
  const doc = described();

  it('carries the description into the character block', () => {
    const p = characterPortrait(doc, resolve(doc));
    expect(p).toContain('## Description');
    expect(p).toContain('Gender: Female');
    expect(p).toContain('Hair: Black, cropped short');
    expect(p).toContain('Homeland: Andoran');
  });

  it('never sends the player\'s real name to someone else\'s service', () => {
    const p = characterPortrait(doc, resolve(doc));
    expect(p).not.toContain('Fredrik');
    expect(p).not.toContain('Player:');
    // …but the sheet the player prints and keeps still gets it.
    expect(filledDescription(doc, true).map((f) => f.label)).toContain('Player');
    expect(filledDescription(doc, false).map((f) => f.label)).not.toContain('Player');
  });

  it('tells the model to use the pronouns the player chose', () => {
    const p = characterPortrait(doc, resolve(doc));
    expect(p).toContain("The character's pronouns are she/her. Use them throughout.");
    expect(p).not.toContain('records no gender or pronouns');
  });

  it('falls back to they/them only when no pronouns are recorded', () => {
    const bare = newCharacter('t-desc-nopro', 'Nobody');
    const p = characterPortrait(bare, resolve(bare));
    expect(p).toContain('records no gender or pronouns');
    expect(p).toContain('they/them');
  });

  it('omits the Description block entirely when nothing is filled in', () => {
    const bare = newCharacter('t-desc-none', 'Nobody');
    expect(characterPortrait(bare, resolve(bare))).not.toContain('## Description');
  });
});
