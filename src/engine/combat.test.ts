import { describe, it, expect } from 'vitest';
import { powerAttackAmounts, twoWeaponPenalties, offHandAttackBonuses, naturalAttackDamageDie, naturalStrMultiplier, naturalAttackPenalty, naturalPowerAttackScale, type NaturalAttackContext } from './combat';

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

describe('natural attacks', () => {
  const ctx = (o: Partial<NaturalAttackContext>): NaturalAttackContext =>
    ({ primary: true, sole: false, withWeapon: false, hasMultiattack: false, ...o });

  it('steps the damage die down one for a Small creature, leaves Medium alone', () => {
    expect(naturalAttackDamageDie('1d4', 'medium')).toBe('1d4');
    expect(naturalAttackDamageDie('1d4', 'small')).toBe('1d3');
    expect(naturalAttackDamageDie('1d3', 'small')).toBe('1d2');
    expect(naturalAttackDamageDie('1d6', 'small')).toBe('1d4');
  });

  it('applies 1x Str to a primary attack, 1.5x to a sole one, 0.5x to a secondary one', () => {
    expect(naturalStrMultiplier(ctx({}))).toBe(1);
    expect(naturalStrMultiplier(ctx({ sole: true }))).toBe(1.5);
    expect(naturalStrMultiplier(ctx({ primary: false }))).toBe(0.5);
  });

  it('drops every natural attack to 0.5x Str when also attacking with a weapon', () => {
    expect(naturalStrMultiplier(ctx({ sole: true, withWeapon: true }))).toBe(0.5);
    expect(naturalStrMultiplier(ctx({ withWeapon: true }))).toBe(0.5);
  });

  it('penalises secondary attacks by -5, or -2 with Multiattack, and primaries not at all', () => {
    expect(naturalAttackPenalty(ctx({}))).toBe(0);
    expect(naturalAttackPenalty(ctx({ primary: false }))).toBe(-5);
    expect(naturalAttackPenalty(ctx({ primary: false, hasMultiattack: true }))).toBe(-2);
    expect(naturalAttackPenalty(ctx({ withWeapon: true }))).toBe(-5);
    expect(naturalAttackPenalty(ctx({ withWeapon: true, hasMultiattack: true }))).toBe(-2);
  });

  it('scales Power Attack like the Str multiplier: 1.5x sole, 0.5x secondary, 1x otherwise', () => {
    expect(naturalPowerAttackScale(ctx({}))).toBe('normal');
    expect(naturalPowerAttackScale(ctx({ sole: true }))).toBe('oneAndHalf');
    expect(naturalPowerAttackScale(ctx({ primary: false }))).toBe('half');
    expect(naturalPowerAttackScale(ctx({ sole: true, withWeapon: true }))).toBe('half');
  });
});
