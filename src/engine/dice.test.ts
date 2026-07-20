import { describe, it, expect } from 'vitest';
import { parseDamage, rollDamage, rollAttack, rollDie, rollSave, rollMissChance, threatRange, type Rng } from './dice';

/** A scripted rng: each value is the face the next die should show, so the tests assert on
 *  arithmetic rather than on luck. `faces` are 1-based die results. */
function scripted(faces: number[], sides = 6): Rng {
  let i = 0;
  return () => {
    const face = faces[i++ % faces.length];
    // rollDie does floor(rng() * sides) + 1, so hand back the fraction that lands on `face`.
    return (face - 1) / sides;
  };
}
/** Scripted rng for a specific die size — needed because the fraction depends on the sides. */
const always = (face: number, sides: number): Rng => () => (face - 0.5) / sides;

describe('rollDie', () => {
  it('is 1-based and never exceeds the die', () => {
    expect(rollDie(20, () => 0)).toBe(1);
    expect(rollDie(20, () => 0.999999)).toBe(20);
    expect(rollDie(6, () => 0.5)).toBe(4);
  });
});

describe('parseDamage', () => {
  it('reads the shapes the sheet actually produces', () => {
    expect(parseDamage('1d8')).toEqual([{ text: '1d8', count: 1, sides: 8, flat: 0 }]);
    expect(parseDamage('1d8+4')).toEqual([
      { text: '1d8', count: 1, sides: 8, flat: 0 },
      { text: '+4', count: 0, sides: 0, flat: 4 },
    ]);
    expect(parseDamage('2d6')).toEqual([{ text: '2d6', count: 2, sides: 6, flat: 0 }]);
  });

  it('handles the typographic minus the sheet writes', () => {
    // The attack line formats with an en-dash-style minus, not an ASCII hyphen.
    expect(parseDamage('1d8−2')).toEqual([
      { text: '1d8', count: 1, sides: 8, flat: 0 },
      // `text` comes back normalised to an ASCII minus, which is what a roll readout wants.
      { text: '-2', count: 0, sides: 0, flat: -2 },
    ]);
  });

  it('reads a weapon property’s extra dice as a second pool', () => {
    // "1d8+2 + 1d6" — a flaming longsword.
    const terms = parseDamage('1d8+2 + 1d6');
    expect(terms).toHaveLength(3);
    expect(terms[2]).toEqual({ text: '+ 1d6', count: 1, sides: 6, flat: 0 });
  });

  it('takes only the first end of a double weapon', () => {
    // You attack with one end of a quarterstaff at a time, so "1d6/1d6" is one 1d6.
    expect(parseDamage('1d6/1d6')).toEqual([{ text: '1d6', count: 1, sides: 6, flat: 0 }]);
  });

  it('returns nothing rather than guessing at input it cannot read', () => {
    expect(parseDamage('')).toEqual([]);
    expect(parseDamage('special')).toEqual([]);
  });
});

describe('rollDamage', () => {
  it('sums the dice and the modifier', () => {
    // 1d8 showing 5, plus 4.
    expect(rollDamage('1d8+4', always(5, 8))).toMatchObject({ total: 9, dice: [5], modifier: 4 });
  });

  it('rolls each die of a pool separately', () => {
    const r = rollDamage('2d6', scripted([3, 6], 6))!;
    expect(r.dice).toEqual([3, 6]);
    expect(r.total).toBe(9);
  });

  it('never deals less than 1 on a hit', () => {
    // 1d4 showing 1, minus 3 — a hit still deals 1 point.
    expect(rollDamage('1d4−3', always(1, 4))!.total).toBe(1);
  });

  it('returns null for a formula it cannot parse, so the caller shows the text instead', () => {
    expect(rollDamage('special')).toBeNull();
  });

  it('maximizes the dice and leaves the modifier alone (Maximize Spell)', () => {
    // The rng shows 3s, but a maximized 5d6+5 deals 30 on the dice regardless of the roll.
    const r = rollDamage('5d6+5', always(3, 6), { maximize: true })!;
    expect(r.dice).toEqual([6, 6, 6, 6, 6]);
    expect(r.modifier).toBe(5);
    expect(r.maximized).toBe(true);
    expect(r.total).toBe(35);
  });

  it('adds half the rolled dice for Empower Spell, not touching the modifier', () => {
    // 4d6 rolling 2,4,2,4 = 12; +half = +6; the flat +5 is untouched → 12 + 6 + 5 = 23.
    const r = rollDamage('4d6+5', scripted([2, 4, 2, 4], 6), { empower: true })!;
    expect(r.dice).toEqual([2, 4, 2, 4]);
    expect(r.empowerBonus).toBe(6);
    expect(r.total).toBe(23);
  });

  it('combines Maximize and Empower as "maximum plus half a normal roll"', () => {
    // 4d6 rolling 2,4,2,4: maximized dice = 24, plus half the rolled 12 = +6 → 30.
    const r = rollDamage('4d6', scripted([2, 4, 2, 4], 6), { empower: true, maximize: true })!;
    expect(r.dice).toEqual([6, 6, 6, 6]);
    expect(r.maximized).toBe(true);
    expect(r.empowerBonus).toBe(6);
    expect(r.total).toBe(30);
  });

  it('leaves an ordinary roll unmarked by metamagic', () => {
    const r = rollDamage('2d6', scripted([3, 6], 6))!;
    expect(r.empowerBonus).toBeUndefined();
    expect(r.maximized).toBeUndefined();
  });
});

describe('threatRange', () => {
  it('reads the weapon’s crit string', () => {
    expect(threatRange('×2')).toBe(20);
    expect(threatRange('×3')).toBe(20);
    expect(threatRange('19–20/×2')).toBe(19);
    expect(threatRange('18–20/×2')).toBe(18);
  });
});

describe('rollAttack', () => {
  it('adds the bonus to the natural roll', () => {
    const r = rollAttack(7, 20, always(12, 20));
    expect(r).toMatchObject({ natural: 12, total: 19, bonus: 7, threat: false, fumble: false });
  });

  it('flags a natural 20 as a threat', () => {
    expect(rollAttack(0, 20, always(20, 20))).toMatchObject({ natural: 20, threat: true });
  });

  it('flags a threat inside a wider crit range', () => {
    // A rapier threatens on 18–20.
    expect(rollAttack(0, 18, always(18, 20)).threat).toBe(true);
    expect(rollAttack(0, 18, always(17, 20)).threat).toBe(false);
  });

  it('treats a natural 1 as a fumble and never a threat', () => {
    const r = rollAttack(20, 20, always(1, 20));
    expect(r.fumble).toBe(true);
    expect(r.threat).toBe(false);
    // The total is still reported — a natural 1 misses regardless of it.
    expect(r.total).toBe(21);
  });
});

describe('rollSave', () => {
  it('reports the roll without judging it when no DC is given', () => {
    const r = rollSave(6, null, always(11, 20));
    expect(r).toMatchObject({ natural: 11, total: 17, bonus: 6 });
    expect(r.success).toBeUndefined();
    expect(r.dc).toBeUndefined();
  });

  it('compares the total against a DC when one is given', () => {
    expect(rollSave(6, 17, always(11, 20)).success).toBe(true); // 17 vs DC 17 — a tie makes it
    expect(rollSave(6, 18, always(11, 20)).success).toBe(false);
  });

  it('lets a natural 20 succeed even when the total falls short', () => {
    // +0 against DC 30: the total is 20, but a natural 20 always saves.
    const r = rollSave(0, 30, always(20, 20));
    expect(r.success).toBe(true);
    expect(r.automatic).toBe(true);
  });

  it('lets a natural 1 fail even when the total would clear the DC', () => {
    // +20 against DC 5: the total is 21, but a natural 1 always fails.
    const r = rollSave(20, 5, always(1, 20));
    expect(r.success).toBe(false);
    expect(r.automatic).toBe(true);
    expect(r.total).toBe(21); // the total is still reported honestly
  });

  it('does not call an ordinary roll automatic', () => {
    expect(rollSave(3, 10, always(11, 20)).automatic).toBe(false);
  });
});

describe('rollMissChance', () => {
  it('misses on a percentile at or under the chance', () => {
    // 20% concealment: 1..20 miss, 21+ get through.
    expect(rollMissChance(20, always(20, 100)).missed).toBe(true);
    expect(rollMissChance(20, always(21, 100)).missed).toBe(false);
    expect(rollMissChance(20, always(1, 100)).missed).toBe(true);
  });

  it('reports the roll and the chance for the log', () => {
    const r = rollMissChance(50, always(37, 100));
    expect(r).toEqual({ roll: 37, chance: 50, missed: true });
  });

  it('total concealment misses half the time — 50 misses, 51 gets through', () => {
    expect(rollMissChance(50, always(50, 100)).missed).toBe(true);
    expect(rollMissChance(50, always(51, 100)).missed).toBe(false);
  });
});
