import { describe, it, expect } from 'vitest';
import {
  babAt, saveBase, fixedHpPerLevel, generalFeatLevels, abilityIncreaseLevels,
  casterLevel, bonusSpellSlots, spellSlotsPerDay, spellsKnownPerLevel,
} from './progression';

describe('BAB progression', () => {
  it('full BAB = level', () => {
    expect(babAt('full', 1)).toBe(1);
    expect(babAt('full', 20)).toBe(20);
  });
  it('three-quarter BAB = floor(3L/4)', () => {
    expect(babAt('threequarter', 1)).toBe(0);
    expect(babAt('threequarter', 4)).toBe(3);
    expect(babAt('threequarter', 7)).toBe(5);
    expect(babAt('threequarter', 20)).toBe(15);
  });
  it('half BAB = floor(L/2)', () => {
    expect(babAt('half', 1)).toBe(0);
    expect(babAt('half', 2)).toBe(1);
    expect(babAt('half', 20)).toBe(10);
  });
});

describe('save progression', () => {
  it('good save = 2 + floor(L/2)', () => {
    expect(saveBase(true, 1)).toBe(2);
    expect(saveBase(true, 10)).toBe(7);
    expect(saveBase(true, 20)).toBe(12);
  });
  it('poor save = floor(L/3)', () => {
    expect(saveBase(false, 1)).toBe(0);
    expect(saveBase(false, 3)).toBe(1);
    expect(saveBase(false, 10)).toBe(3);
    expect(saveBase(false, 20)).toBe(6);
  });
});

describe('HP / feats / ability increases', () => {
  it('fixed HP per level = die/2 + 1', () => {
    expect(fixedHpPerLevel(6)).toBe(4);
    expect(fixedHpPerLevel(8)).toBe(5);
    expect(fixedHpPerLevel(10)).toBe(6);
    expect(fixedHpPerLevel(12)).toBe(7);
  });
  it('general feats at odd levels', () => {
    expect(generalFeatLevels(5)).toEqual([1, 3, 5]);
    expect(generalFeatLevels(20)).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19]);
  });
  it('ability increases at 4/8/12/16/20', () => {
    expect(abilityIncreaseLevels(3)).toEqual([]);
    expect(abilityIncreaseLevels(4)).toEqual([4]);
    expect(abilityIncreaseLevels(20)).toEqual([4, 8, 12, 16, 20]);
  });
});

describe('caster level', () => {
  it('full and six casters have caster level = class level', () => {
    expect(casterLevel('full', 7)).toBe(7);
    expect(casterLevel('six', 5)).toBe(5);
  });
  it('four-level casters have caster level = level − 3', () => {
    expect(casterLevel('four', 3)).toBe(0);
    expect(casterLevel('four', 4)).toBe(1);
    expect(casterLevel('four', 20)).toBe(17);
  });
});

describe('spell slots', () => {
  it('bonus spells: floor((mod − lvl)/4) + 1, none for cantrips or when mod < level', () => {
    expect(bonusSpellSlots(0, 0)).toBe(0);
    expect(bonusSpellSlots(3, 0)).toBe(0); // cantrips never get bonus
    expect(bonusSpellSlots(1, 1)).toBe(1);
    expect(bonusSpellSlots(1, 2)).toBe(0);
    expect(bonusSpellSlots(5, 1)).toBe(2); // floor(4/4)+1 = 2
    expect(bonusSpellSlots(4, 2)).toBe(1);
  });
  it('prepared full caster (cleric/wizard) at level 1 = 3 cantrips + 1 first', () => {
    expect(spellSlotsPerDay('prepared-full', 1, 0)).toEqual([3, 1]);
  });
  it('adds ability bonus slots (wizard 1 with Int mod +2 → bonus 1st)', () => {
    expect(spellSlotsPerDay('prepared-full', 1, 2)).toEqual([3, 2]);
  });
  it('sorcerer known at level 4 = 6 cantrips, 3 first, 1 second', () => {
    expect(spellsKnownPerLevel('spontaneous-full', 4)).toEqual([6, 3, 1]);
  });
  it('bard known at level 1 = 4 cantrips, 2 first', () => {
    expect(spellsKnownPerLevel('bard', 1)).toEqual([4, 2]);
  });
  it('returns [] for an unencoded table', () => {
    expect(spellSlotsPerDay(undefined, 5, 3)).toEqual([]);
  });
});
