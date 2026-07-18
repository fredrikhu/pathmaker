import { describe, it, expect } from 'vitest';
import { powerAttackAmounts, twoWeaponPenalties, offHandAttackBonuses } from './combat';

describe('Power Attack', () => {
  it('starts at -1/+2 and worsens at BAB 4 and every 4 after', () => {
    expect(powerAttackAmounts(1)).toEqual({ penalty: -1, damage: 2 });
    expect(powerAttackAmounts(3)).toEqual({ penalty: -1, damage: 2 });
    expect(powerAttackAmounts(4)).toEqual({ penalty: -2, damage: 4 });
    expect(powerAttackAmounts(7)).toEqual({ penalty: -2, damage: 4 });
    expect(powerAttackAmounts(8)).toEqual({ penalty: -3, damage: 6 });
    expect(powerAttackAmounts(12)).toEqual({ penalty: -4, damage: 8 });
    expect(powerAttackAmounts(16)).toEqual({ penalty: -5, damage: 10 });
    expect(powerAttackAmounts(20)).toEqual({ penalty: -6, damage: 12 });
  });

  it('gives two-handed weapons half again the damage, at the same penalty', () => {
    expect(powerAttackAmounts(1, 'oneAndHalf')).toEqual({ penalty: -1, damage: 3 });
    expect(powerAttackAmounts(4, 'oneAndHalf')).toEqual({ penalty: -2, damage: 6 });
    expect(powerAttackAmounts(12, 'oneAndHalf')).toEqual({ penalty: -4, damage: 12 });
  });

  it('halves the damage in the off hand, at the same penalty', () => {
    expect(powerAttackAmounts(1, 'half')).toEqual({ penalty: -1, damage: 1 });
    expect(powerAttackAmounts(8, 'half')).toEqual({ penalty: -3, damage: 3 });
  });
});

describe('two-weapon penalties', () => {
  it('are -6/-10 bare, and -4/-8 with a light off-hand weapon', () => {
    expect(twoWeaponPenalties(false, false)).toEqual({ primary: -6, off: -10 });
    expect(twoWeaponPenalties(false, true)).toEqual({ primary: -4, off: -8 });
  });

  it('the feat lessens the primary by 2 and the off hand by 6', () => {
    expect(twoWeaponPenalties(true, false)).toEqual({ primary: -4, off: -4 });
    expect(twoWeaponPenalties(true, true)).toEqual({ primary: -2, off: -2 });
  });
});

describe('off-hand attack count', () => {
  it('is one attack, plus one each for Improved and Greater, at -5 and -10', () => {
    expect(offHandAttackBonuses(10, false, false)).toEqual([10]);
    expect(offHandAttackBonuses(10, true, false)).toEqual([10, 5]);
    expect(offHandAttackBonuses(10, true, true)).toEqual([10, 5, 0]);
  });
});
