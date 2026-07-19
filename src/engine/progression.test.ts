import { describe, it, expect } from 'vitest';
import {
  babAt, saveBase, fixedHpPerLevel, generalFeatLevels, abilityIncreaseLevels,
  casterLevel, bonusSpellSlots, spellSlotsPerDay, spellsKnownPerLevel, spellsPreparedPerLevel, sumBab, sumSave,
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

describe('encoded slot tables (Part-2 depth)', () => {
  it('four-level (paladin/ranger): no casting before 4, verified endpoints', () => {
    expect(spellSlotsPerDay('four', 3, 0)).toEqual([]);
    expect(spellSlotsPerDay('four', 4, 0)).toEqual([0, 0]);
    expect(spellSlotsPerDay('four', 5, 0)).toEqual([0, 1]);
    expect(spellSlotsPerDay('four', 20, 0)).toEqual([0, 4, 4, 3, 3]);
  });
  it('four-level applies ability bonus to a 0-base level', () => {
    // Paladin 5, Cha +3: 1st-level base 1 + 1 bonus = 2.
    expect(spellSlotsPerDay('four', 5, 3)).toEqual([0, 2]);
  });
  it('prepared-six (magus/warpriest): cantrips + 1st–6th, tops at 20', () => {
    expect(spellSlotsPerDay('prepared-six', 1, 0)).toEqual([3, 1]);
    expect(spellSlotsPerDay('prepared-six', 20, 0)).toEqual([5, 5, 5, 5, 5, 5, 5]);
  });
  it('extract (alchemist/investigator): no cantrips, else = prepared-six', () => {
    expect(spellSlotsPerDay('extract', 1, 0)).toEqual([0, 1]);
    expect(spellSlotsPerDay('extract', 20, 0)).toEqual([0, 5, 5, 5, 5, 5, 5]);
  });
  it('bard/spont-six per-day is cantrip-indexed so 1st-level gets the ability bonus', () => {
    expect(spellSlotsPerDay('bard', 1, 0)).toEqual([0, 1]);
    expect(spellSlotsPerDay('bard', 1, 2)).toEqual([0, 2]); // +1 bonus 1st from Cha +2
    expect(spellSlotsPerDay('bard', 20, 0)).toEqual([0, 5, 5, 5, 5, 5, 5]);
  });
  it('spont-six known table (inquisitor/hunter/summoner)', () => {
    expect(spellsKnownPerLevel('spont-six', 4)).toEqual([6, 4, 2]);
    expect(spellsKnownPerLevel('spont-six', 20)).toEqual([6, 6, 6, 6, 6, 5, 5]);
  });
});

describe('multiclass sums', () => {
  const fighter = (levels: number) => ({ bab: 'full' as const, goodSaves: ['fort'] as const, levels });
  const rogue = (levels: number) => ({ bab: 'threequarter' as const, goodSaves: ['ref'] as const, levels });
  const wizard = (levels: number) => ({ bab: 'half' as const, goodSaves: ['will'] as const, levels });

  it('adds each class BAB computed on its own levels, rounding down per class', () => {
    expect(sumBab([fighter(5), wizard(1)])).toBe(5); // 5 + 0
    expect(sumBab([fighter(1), rogue(1)])).toBe(1); // 1 + 0, not 2
    expect(sumBab([rogue(4), rogue(4)])).toBe(6); // 3 + 3 — split levels lose to rogue 8 (+6)
    expect(sumBab([rogue(8)])).toBe(6);
    expect(sumBab([])).toBe(0);
  });

  it('adds each class save track, so every class re-pays the good-save +2', () => {
    // Fighter 1 (Fort good) + Cleric-like Will-good class 1 = Fort 2, Will 2, Ref 0.
    const willGood = { bab: 'threequarter' as const, goodSaves: ['will'] as const, levels: 1 };
    expect(sumSave('fort', [fighter(1), willGood])).toBe(2);
    expect(sumSave('will', [fighter(1), willGood])).toBe(2);
    expect(sumSave('ref', [fighter(1), willGood])).toBe(0);
    // The classic multiclass save bump: Fighter 1/Rogue 1 has Fort +2 AND Ref +2.
    expect(sumSave('fort', [fighter(1), rogue(1)])).toBe(2);
    expect(sumSave('ref', [fighter(1), rogue(1)])).toBe(2);
    // A single-class fighter 2 gets Fort +3, Ref +0.
    expect(sumSave('fort', [fighter(2)])).toBe(3);
    expect(sumSave('ref', [fighter(2)])).toBe(0);
  });
});

describe('arcanist spell tables', () => {
  // Both tables transcribed from the arcanist's own d20pfsrd tables. The class is the only one
  // with separate "Spells per Day" and "Spells Prepared" grids, which is why an earlier pass
  // shipped nothing for it: two secondary sources disagreed about which numbers were which.
  const perDay = (l: number) => spellSlotsPerDay('arcanist', l, 0);
  const prepared = (l: number) => spellsPreparedPerLevel('arcanist', l);

  it('spells per day: 2 at 1st, rising to 4 across the board at 20th', () => {
    expect(perDay(1)).toEqual([4, 2]);
    expect(perDay(2)).toEqual([5, 3]);
    expect(perDay(3)).toEqual([5, 4]);
    expect(perDay(20)).toEqual([9, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
  });

  it('spells per day: a new spell level arrives every second level from 4th, at 2/day', () => {
    for (const [level, spellLevel] of [[4, 2], [6, 3], [8, 4], [10, 5], [12, 6], [14, 7], [16, 8], [18, 9]] as const) {
      expect(perDay(level)[spellLevel], `level ${level} should open ${spellLevel} spells at 2/day`).toBe(2);
      expect(perDay(level)[spellLevel + 1] ?? 0, `level ${level} should not reach ${spellLevel + 1}`).toBe(0);
    }
  });

  it('spells per day: 9th-level spells only at 18th, and 8th-level not before 16th', () => {
    expect(perDay(15)[8] ?? 0).toBe(0); // no 8th-level spells at 15th
    expect(perDay(16)[8]).toBe(2);
    expect(perDay(17)[9] ?? 0).toBe(0);
    expect(perDay(18)[9]).toBe(2);
  });

  it('spells prepared is a different, smaller grid than spells per day', () => {
    expect(prepared(1)).toEqual([4, 2]);
    // At 2nd the arcanist casts 3 first-level spells a day but still only prepares 2.
    expect(prepared(2)).toEqual([5, 2]);
    expect(perDay(2)[1]).toBe(3);
    expect(prepared(20)).toEqual([9, 5, 5, 4, 4, 4, 3, 3, 3, 3]);
  });

  it('Intelligence bonus spells raise slots per day but never the prepared count', () => {
    // Int 18 (+4): one bonus slot at spell levels 1-4.
    expect(spellSlotsPerDay('arcanist', 5, 4)).toEqual([6, 5, 4]);
    expect(prepared(5)).toEqual([6, 4, 2]);
    // Cantrips never gain bonus spells.
    expect(spellSlotsPerDay('arcanist', 5, 4)[0]).toBe(perDay(5)[0]);
  });

  it('no other class reports a separate prepared count', () => {
    expect(spellsPreparedPerLevel('prepared-full', 5)).toEqual([]);
    expect(spellsPreparedPerLevel('spontaneous-full', 5)).toEqual([]);
    expect(spellsPreparedPerLevel(undefined, 5)).toEqual([]);
  });
});
