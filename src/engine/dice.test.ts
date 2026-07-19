import { describe, it, expect } from 'vitest';
import { parseDamage, rollDamage, rollAttack, rollDie, threatRange, type Rng } from './dice';

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
