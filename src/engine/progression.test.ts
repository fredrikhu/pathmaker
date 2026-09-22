import { describe, it, expect } from 'vitest';
import {
  babAt, saveBase, fixedHpPerLevel, generalFeatLevels, abilityIncreaseLevels,
  casterLevel, bonusSpellSlots, spellSlotsPerDay, spellsKnownPerLevel, spellsPreparedPerLevel, sumBab, sumSave,
  startingWealth,
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
  it('diminished known (Crossblooded) drops one from every level, cantrips included, min 0', () => {
    // Standard level-4 sorcerer knows [6, 3, 1]; crossblooded knows one fewer of each, cantrips too.
    expect(spellsKnownPerLevel('spontaneous-full', 4, true)).toEqual([5, 2, 0]);
    // At level 1 (standard [4, 2]) the reduction floors at 0 for any 0-count level but never below.
    expect(spellsKnownPerLevel('spontaneous-full', 1, true)).toEqual([3, 1]);
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

describe('diminished spellcasting (Kensai / Cloistered Cleric / Spellslinger)', () => {
  it('drops one slot of each spell level, leaving cantrips alone', () => {
    // magus 20 with a 0 casting mod: cantrips (index 0) stay 5, every real spell level 5 → 4.
    expect(spellSlotsPerDay('prepared-six', 20, 0, true)).toEqual([5, 4, 4, 4, 4, 4, 4]);
  });
  it('floors a base of 1 at 0, and never touches cantrips', () => {
    // magus 4 base [4,3,1] → [4,2,0]: the lone 3rd-level slot is lost with no bonus to backfill.
    expect(spellSlotsPerDay('prepared-six', 4, 0, true)).toEqual([4, 2, 0]);
  });
  it('a high casting stat can still grant a slot at a level whose base fell to 0', () => {
    // magus 1 base [3,1], Int +4: diminished 1st-level base 1→0, but the +1 bonus slot survives.
    expect(spellSlotsPerDay('prepared-six', 1, 4, false)).toEqual([3, 2]);
    expect(spellSlotsPerDay('prepared-six', 1, 4, true)).toEqual([3, 1]);
  });
  it('defaults to non-diminished when the flag is omitted', () => {
    expect(spellSlotsPerDay('prepared-six', 20, 0)).toEqual(spellSlotsPerDay('prepared-six', 20, 0, false));
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

describe('four-level spontaneous casters (bloodrager, vampire hunter)', () => {
  // Both start casting at 4th and top out at 4th-level spells, but only the vampire hunter
  // actually shares the paladin/ranger per-day grid. The bloodrager was pointed at it too, which
  // was wrong in two ways at once (see BLOODRAGER_PER_DAY).
  it('neither casts before 4th level', () => {
    for (const t of ['bloodrager', 'vampire-hunter'] as const) {
      expect(spellSlotsPerDay(t, 3, 0)).toEqual([]);
    }
  });

  it('the vampire hunter really does share the paladin and ranger grid', () => {
    for (const lvl of [4, 7, 13, 20]) {
      expect(spellSlotsPerDay('vampire-hunter', lvl, 0)).toEqual(spellSlotsPerDay('four', lvl, 0));
    }
    expect(spellSlotsPerDay('vampire-hunter', 20, 0)).toEqual([0, 4, 4, 3, 3]);
  });

  it('the bloodrager does not — it has no bonus-only rows, and a smaller capstone', () => {
    // Where the paladin has a 0 (castable only off a high ability), the bloodrager has a slot.
    expect(spellSlotsPerDay('four', 4, 0)).toEqual([0, 0]);
    expect(spellSlotsPerDay('bloodrager', 4, 0)).toEqual([0, 1]);
    expect(spellSlotsPerDay('four', 7, 0)).toEqual([0, 1, 0]);
    expect(spellSlotsPerDay('bloodrager', 7, 0)).toEqual([0, 1, 1]);
    expect(spellSlotsPerDay('four', 13, 0)).toEqual([0, 3, 2, 1, 0]);
    expect(spellSlotsPerDay('bloodrager', 13, 0)).toEqual([0, 3, 2, 1, 1]);
    // And the capstones differ: paladin 4/4/3/3, bloodrager 4/4/3/2.
    expect(spellSlotsPerDay('bloodrager', 20, 0)).toEqual([0, 4, 4, 3, 2]);
  });

  it('a 0 in the table means castable only with a bonus spell from a high ability', () => {
    expect(spellSlotsPerDay('vampire-hunter', 4, 0)).toEqual([0, 0]);
    // Wis 14 (+2): the bonus spell makes that 1st-level slot real.
    expect(spellSlotsPerDay('vampire-hunter', 4, 2)).toEqual([0, 1]);
  });

  it('but they know different numbers of spells', () => {
    // Neither has orisons, hence the leading 0.
    expect(spellsKnownPerLevel('bloodrager', 3)).toEqual([]);
    expect(spellsKnownPerLevel('bloodrager', 4)).toEqual([0, 2]);
    expect(spellsKnownPerLevel('vampire-hunter', 4)).toEqual([0, 2]);
    // They diverge from 9th: the bloodrager knows 5 first-level spells, the hunter 4.
    expect(spellsKnownPerLevel('bloodrager', 9)).toEqual([0, 5, 4]);
    expect(spellsKnownPerLevel('vampire-hunter', 9)).toEqual([0, 4, 4]);
    expect(spellsKnownPerLevel('bloodrager', 12)).toEqual([0, 6, 5, 4]);
    expect(spellsKnownPerLevel('vampire-hunter', 12)).toEqual([0, 5, 4, 4]);
    expect(spellsKnownPerLevel('bloodrager', 20)).toEqual([0, 6, 6, 6, 5]);
    expect(spellsKnownPerLevel('vampire-hunter', 20)).toEqual([0, 6, 6, 6, 5]);
  });

  it('the repeated rows are real — these known tables plateau', () => {
    // Both sources print identical consecutive rows; this pins them so a future "tidy-up"
    // does not invent a progression that the class does not have.
    expect(spellsKnownPerLevel('vampire-hunter', 17)).toEqual(spellsKnownPerLevel('vampire-hunter', 18));
    expect(spellsKnownPerLevel('bloodrager', 15)).toEqual(spellsKnownPerLevel('bloodrager', 16));
    expect(spellsKnownPerLevel('bloodrager', 18)).toEqual(spellsKnownPerLevel('bloodrager', 20));
  });
});

describe('spell slot and spells-known tables, verified against the published class tables', () => {
  // Read off each class's own table on 2026-09-22. Our grids always keep index 0 for 0-level
  // spells, even where the published per-day table omits that column because cantrips are at will.
  // Rows below are the full grid row as our tables store it (index 0 = 0-level).
  const SPOT: Record<string, Record<number, number[]>> = {
    // Wizard / cleric / druid: the published table includes a 0th column.
    'prepared-full': { 1: [3, 1], 10: [4, 4, 4, 3, 3, 2], 20: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4] },
    // Sorcerer / oracle. Published per-day starts at 1st; index 0 is the cantrip count.
    'spontaneous-full': { 1: [4, 3], 10: [6, 6, 6, 6, 5, 3], 20: [6, 6, 6, 6, 6, 6, 6, 6, 6, 6] },
    bard: { 1: [0, 1], 10: [0, 5, 4, 3, 1], 20: [0, 5, 5, 5, 5, 5, 5] },
    'prepared-six': { 1: [3, 1], 10: [5, 5, 4, 3, 1], 20: [5, 5, 5, 5, 5, 5, 5] },
    four: { 4: [0, 0], 5: [0, 1], 20: [0, 4, 4, 3, 3] },
    bloodrager: { 4: [0, 1], 13: [0, 3, 2, 1, 1], 20: [0, 4, 4, 3, 2] },
    arcanist: { 1: [4, 2], 10: [9, 4, 4, 4, 4, 2], 20: [9, 4, 4, 4, 4, 4, 4, 4, 4, 4] },
  };

  it('spot rows of every per-day table match the published grid', () => {
    const bad: string[] = [];
    for (const [table, rows] of Object.entries(SPOT))
      for (const [lvl, want] of Object.entries(rows)) {
        // A zero ability modifier adds no bonus slots, so this is the base table.
        const got = spellSlotsPerDay(table as never, Number(lvl), 0);
        const n = Math.max(got.length, want.length);
        const pad = (a: number[]) => [...a, ...Array(n - a.length).fill(0)];
        if (pad(got).join(',') !== pad(want).join(','))
          bad.push(`${table} L${lvl}: ${got.join(',')} vs expected ${want.join(',')}`);
      }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('spells known match the published tables, including the bard capstone', () => {
    // The bard knows five 6th-level spells at 20th; this cell read 4 until it was verified.
    expect(spellsKnownPerLevel('bard', 20)).toEqual([6, 6, 6, 6, 6, 5, 5]);
    expect(spellsKnownPerLevel('bard', 19)).toEqual([6, 6, 6, 6, 5, 5, 4]);
    expect(spellsKnownPerLevel('bard', 1)).toEqual([4, 2]);
    expect(spellsKnownPerLevel('spontaneous-full', 1)).toEqual([4, 2]);
    expect(spellsKnownPerLevel('spontaneous-full', 20)).toEqual([9, 5, 5, 4, 4, 4, 3, 3, 3, 3]);
    expect(spellsKnownPerLevel('spont-six', 1)).toEqual([4, 2]);
    expect(spellsKnownPerLevel('spont-six', 20)).toEqual([6, 6, 6, 6, 6, 5, 5]);
    // The bloodrager has no cantrips, so index 0 stays 0.
    expect(spellsKnownPerLevel('bloodrager', 4)).toEqual([0, 2]);
    expect(spellsKnownPerLevel('bloodrager', 20)).toEqual([0, 6, 6, 6, 5]);
  });

  it('the arcanist prepares on the sorcerer-known curve', () => {
    expect(spellsPreparedPerLevel('arcanist', 1)).toEqual([4, 2]);
    expect(spellsPreparedPerLevel('arcanist', 20)).toEqual([9, 5, 5, 4, 4, 4, 3, 3, 3, 3]);
  });

  it('no spell level ever loses slots or known spells as the class level rises', () => {
    // A single mistyped cell shows up here, which is how the bard 20th-level entry was caught.
    const TABLES = ['prepared-full', 'spontaneous-full', 'bard', 'prepared-six', 'extract',
      'four', 'bloodrager', 'arcanist', 'vampire-hunter', 'spont-six'] as const;
    const bad: string[] = [];
    for (const t of TABLES)
      for (const read of [spellSlotsPerDay, spellsKnownPerLevel] as const) {
        const at = (l: number) => (read === spellSlotsPerDay ? spellSlotsPerDay(t, l, 0) : spellsKnownPerLevel(t, l));
        for (let l = 2; l <= 20; l++) {
          const prev = at(l - 1), cur = at(l);
          if (!prev.length || !cur.length) continue;
          for (let s = 0; s < prev.length; s++)
            if ((cur[s] ?? 0) < prev[s])
              bad.push(`${t} ${read === spellSlotsPerDay ? 'per-day' : 'known'} L${l} spell level ${s}: ${cur[s] ?? 0} < ${prev[s]} at L${l - 1}`);
        }
      }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('wealth by level matches the published table, and 1st level uses the class roll', () => {
    const PUBLISHED = [1_000, 3_000, 6_000, 10_500, 16_000, 23_500, 33_000, 46_000, 62_000, 82_000,
      108_000, 140_000, 185_000, 240_000, 315_000, 410_000, 530_000, 685_000, 880_000];
    PUBLISHED.forEach((gp, i) => {
      expect(startingWealth(i + 2, 175), `level ${i + 2}`).toBe(gp);
    });
    expect(startingWealth(1, 175)).toBe(175);
  });

  it('every encoded table has twenty rows', () => {
    const TABLES = ['prepared-full', 'spontaneous-full', 'bard', 'prepared-six', 'extract',
      'four', 'bloodrager', 'arcanist', 'vampire-hunter', 'spont-six'] as const;
    for (const t of TABLES) {
      expect(spellSlotsPerDay(t, 20, 0).length, `${t} has no 20th-level row`).toBeGreaterThan(0);
      expect(spellSlotsPerDay(t, 21, 0)).toEqual(spellSlotsPerDay(t, 20, 0));
    }
  });
});
