import { describe, it, expect } from 'vitest';
import { applyDamage, bestDr, bestResistance, bypassOptions } from './damage';
import { newCharacter, withDecision } from './character';
import { resolve } from './resolve';
import { spellBuffTimer } from './buffs';
import { spellById } from '../content/index';
import { emptyPlayState, type CharacterDoc, type Defenses } from './types';

const none: Defenses = { dr: [], resistances: [] };
const barbarian: Defenses = { dr: [{ amount: 3, bypass: '—', note: 'Barbarian 13' }], resistances: [] };
const tiefling: Defenses = {
  dr: [],
  resistances: [
    { type: 'cold', amount: 5, note: 'Fiendish Resistance' },
    { type: 'electricity', amount: 5, note: 'Fiendish Resistance' },
    { type: 'fire', amount: 5, note: 'Fiendish Resistance' },
  ],
};

describe('energy resistance', () => {
  it('subtracts from damage of its own type only', () => {
    expect(applyDamage(12, 'fire', tiefling).applied).toBe(7);
    expect(applyDamage(12, 'acid', tiefling).applied).toBe(12);
  });

  it('cannot reduce damage below zero', () => {
    const r = applyDamage(3, 'fire', tiefling);
    expect(r.applied).toBe(0);
    expect(r.prevented).toBe(3); // only 3 was there to prevent, not the full 5
  });

  it('does not stack — the best single resistance applies', () => {
    // A racial resist 5 and a spell's resist 20 against the same type: 20, not 25.
    const both: Defenses = {
      dr: [],
      resistances: [
        { type: 'fire', amount: 5, note: 'Fiendish Resistance' },
        { type: 'fire', amount: 20, note: 'Resist Energy' },
      ],
    };
    expect(applyDamage(30, 'fire', both).applied).toBe(10);
    expect(bestResistance(both.resistances, 'fire')!.note).toBe('Resist Energy');
  });

  it('is never applied to physical damage', () => {
    expect(applyDamage(12, 'physical', tiefling).applied).toBe(12);
  });
});

describe('damage reduction', () => {
  it('subtracts from physical damage', () => {
    expect(applyDamage(10, 'physical', barbarian).applied).toBe(7);
  });

  it('is never applied to energy damage', () => {
    // Energy attacks ignore DR, even non-magical fire.
    expect(applyDamage(10, 'fire', barbarian).applied).toBe(10);
  });

  it('is never applied to untyped damage', () => {
    // Spells and spell-like abilities ignore DR.
    const r = applyDamage(10, 'untyped', barbarian);
    expect(r.applied).toBe(10);
    expect(r.explain).toContain('DR does not apply');
  });

  it('does not apply when the attack bypasses it', () => {
    const stoneskin: Defenses = { dr: [{ amount: 10, bypass: 'adamantine', note: 'Stoneskin' }], resistances: [] };
    expect(applyDamage(14, 'physical', stoneskin).applied).toBe(4);
    expect(applyDamage(14, 'physical', stoneskin, { bypassed: ['adamantine'] }).applied).toBe(14);
  });

  it('does not stack, and "best" depends on what the attack bypassed', () => {
    // Stoneskin DR 10/adamantine over a barbarian's DR 3/—.
    const both: Defenses = {
      dr: [
        { amount: 10, bypass: 'adamantine', note: 'Stoneskin' },
        { amount: 3, bypass: '—', note: 'Barbarian 13' },
      ],
      resistances: [],
    };
    // An ordinary axe meets the better one.
    expect(applyDamage(20, 'physical', both).applied).toBe(10);
    // An adamantine axe gets past stoneskin, but the barbarian's DR still applies — the answer is
    // neither 10 nor 0.
    expect(applyDamage(20, 'physical', both, { bypassed: ['adamantine'] }).applied).toBe(17);
    expect(bestDr(both.dr, ['adamantine'])!.note).toBe('Barbarian 13');
  });

  it('matches a bypass regardless of case', () => {
    const s: Defenses = { dr: [{ amount: 5, bypass: 'Magic', note: 'x' }], resistances: [] };
    expect(applyDamage(9, 'physical', s, { bypassed: ['magic'] }).applied).toBe(9);
  });
});

describe('with no defenses at all', () => {
  it('passes damage through untouched', () => {
    for (const kind of ['physical', 'fire', 'untyped'] as const) {
      expect(applyDamage(7, kind, none).applied).toBe(7);
    }
  });

  it('handles zero and negative input without inventing damage', () => {
    expect(applyDamage(0, 'physical', barbarian).applied).toBe(0);
    expect(applyDamage(-5, 'physical', barbarian).applied).toBe(0);
  });
});

describe('bypassOptions', () => {
  it('offers the bypasses worth asking about, and not "—"', () => {
    const d: Defenses = {
      dr: [
        { amount: 10, bypass: 'adamantine', note: 'Stoneskin' },
        { amount: 3, bypass: '—', note: 'Barbarian 13' },
      ],
      resistances: [],
    };
    // Nothing bypasses DR/—, so there is nothing to offer for it.
    expect(bypassOptions(d)).toEqual(['adamantine']);
  });
});

// --- The defences the sheet actually produces ---

function character(race: string, klass: string, level: number): CharacterDoc {
  let d = newCharacter('t-def', 'Kass');
  d = withDecision(d, 'ability-base', { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 });
  d = withDecision(d, 'race', race);
  d = withDecision(d, 'alignment', 'N');
  d = withDecision(d, 'class', klass);
  return { ...d, level };
}

describe('defenses on the sheet', () => {
  it('reads racial energy resistance from the trait, structured', () => {
    const def = resolve(character('tiefling', 'fighter', 1)).sheet.defenses;
    expect(def.resistances).toEqual([
      { type: 'cold', amount: 5, note: 'Fiendish Resistance' },
      { type: 'electricity', amount: 5, note: 'Fiendish Resistance' },
      { type: 'fire', amount: 5, note: 'Fiendish Resistance' },
    ]);
  });

  it('gives a race without resistance none', () => {
    expect(resolve(character('human', 'fighter', 5)).sheet.defenses.resistances).toEqual([]);
  });

  it("counts a barbarian's DR by how many of its levels have been reached", () => {
    const dr = (lvl: number) => resolve(character('human', 'barbarian', lvl)).sheet.defenses.dr;
    expect(dr(6)).toEqual([]); // DR starts at 7th
    expect(dr(7)[0]).toMatchObject({ amount: 1, bypass: '—' });
    expect(dr(10)[0].amount).toBe(2);
    expect(dr(13)[0].amount).toBe(3);
    expect(dr(19)[0].amount).toBe(5);
    expect(dr(20)[0].amount).toBe(5); // no further increase at 20th
  });

  it('picks up a running buff’s damage reduction', () => {
    const d = character('human', 'wizard', 7);
    const buffed: CharacterDoc = {
      ...d, play: { ...emptyPlayState(), timers: [spellBuffTimer(spellById.get('stoneskin')!, 7, 't1')!] },
    };
    expect(resolve(buffed).sheet.defenses.dr).toEqual([{ amount: 10, bypass: 'adamantine', note: 'Stoneskin' }]);
    // …and loses it when the timer is gone.
    expect(resolve(d).sheet.defenses.dr).toEqual([]);
  });

  it('combines class DR and a buff’s DR without stacking them', () => {
    const d = character('human', 'barbarian', 13);
    const buffed: CharacterDoc = {
      ...d, play: { ...emptyPlayState(), timers: [spellBuffTimer(spellById.get('stoneskin')!, 7, 't1')!] },
    };
    const def = resolve(buffed).sheet.defenses;
    expect(def.dr).toHaveLength(2);
    // A plain sword meets stoneskin's 10; an adamantine one still meets the barbarian's 3.
    expect(applyDamage(20, 'physical', def).applied).toBe(10);
    expect(applyDamage(20, 'physical', def, { bypassed: ['adamantine'] }).applied).toBe(17);
  });
});
