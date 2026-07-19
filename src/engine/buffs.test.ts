import { describe, it, expect } from 'vitest';
import { spellBuffTimer, spellDamageAt } from './buffs';
import { spellById } from '../content/index';
import { newCharacter, withDecision } from './character';
import { resolve } from './resolve';
import { emptyPlayState, type CharacterDoc } from './types';

const spell = (id: string) => spellById.get(id)!;

describe('spell buffs — the scaling clauses', () => {
  // These are the numbers a summary gets wrong, so each is pinned at its breakpoints.
  it('divine favor: +1 per three levels, floor +1, cap +3', () => {
    const bonus = (cl: number) => spellBuffTimer(spell('divine-favor'), cl, 'x')!.effects!
      .find((e) => e.target === 'damage:weapon')!.value;
    expect(bonus(1)).toBe(1); // below the first breakpoint, still +1
    expect(bonus(3)).toBe(1);
    expect(bonus(6)).toBe(2);
    expect(bonus(9)).toBe(3);
    expect(bonus(20)).toBe(3); // capped
  });

  it('divine favor lasts a flat minute, not a minute per level', () => {
    expect(spellBuffTimer(spell('divine-favor'), 1, 'x')!.remaining).toBe(10);
    expect(spellBuffTimer(spell('divine-favor'), 20, 'x')!.remaining).toBe(10);
  });

  it('shield of faith: +2, plus 1 per six levels, cap +5', () => {
    const bonus = (cl: number) => spellBuffTimer(spell('shield-of-faith'), cl, 'x')!.effects![0].value;
    expect(bonus(1)).toBe(2);
    expect(bonus(6)).toBe(3);
    expect(bonus(12)).toBe(4);
    expect(bonus(18)).toBe(5);
    expect(bonus(20)).toBe(5);
  });

  it('barkskin: +2, rising per three levels above 3rd, cap +5 at 12th', () => {
    const bonus = (cl: number) => spellBuffTimer(spell('barkskin'), cl, 'x')!.effects![0].value;
    expect(bonus(1)).toBe(2);
    expect(bonus(3)).toBe(2);
    expect(bonus(6)).toBe(3);
    expect(bonus(9)).toBe(4);
    expect(bonus(12)).toBe(5);
    expect(bonus(20)).toBe(5);
  });

  it('scales durations by their own rule, not one shared rule', () => {
    expect(spellBuffTimer(spell('mage-armor'), 5, 'x')!.remaining).toBe(5 * 600); // 1 hour/level
    expect(spellBuffTimer(spell('shield'), 5, 'x')!.remaining).toBe(5 * 10); // 1 min/level
    expect(spellBuffTimer(spell('barkskin'), 5, 'x')!.remaining).toBe(5 * 100); // 10 min/level
    expect(spellBuffTimer(spell('haste'), 5, 'x')!.remaining).toBe(5); // 1 round/level
  });

  it('returns null for a spell with no engine-computable effect', () => {
    expect(spellBuffTimer(spell('invisibility'), 5, 'x')).toBeNull();
    expect(spellBuffTimer(spell('fireball'), 5, 'x')).toBeNull();
  });

  it('never builds a timer that expires the instant it starts', () => {
    expect(spellBuffTimer(spell('haste'), 0, 'x')!.remaining).toBeGreaterThan(0);
  });
});

describe('a running buff reaches the sheet', () => {
  function cleric(level = 6): CharacterDoc {
    let d = newCharacter('t-buff', 'Ilmara');
    d = withDecision(d, 'ability-base', { str: 16, dex: 12, con: 12, int: 10, wis: 16, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'NG');
    d = withDecision(d, 'class', 'cleric');
    d = { ...d, level, purchases: { longsword: 1 }, equipped: { armor: null, mainHand: 'longsword', offHand: null } };
    return d;
  }
  const withBuff = (d: CharacterDoc, spellId: string, cl: number): CharacterDoc => ({
    ...d,
    play: { ...emptyPlayState(), timers: [spellBuffTimer(spell(spellId), cl, 't1')!] },
  });

  it('Divine Favor raises attack and weapon damage on the play sheet', () => {
    const base = resolve(cleric()).sheet;
    const buffed = resolve(withBuff(cleric(), 'divine-favor', 6)).sheet;
    // CL 6 → +2 luck.
    expect(buffed.stats['attack:melee'].total).toBe(base.stats['attack:melee'].total + 2);
    expect(buffed.attacks[0].bonuses[0]).toBe(base.attacks[0].bonuses[0] + 2);
    expect(buffed.attacks[0].damage).toBe('1d8+5'); // Str +3, Divine Favor +2
    expect(buffed.attacks[0].damageLines.some((l) => l.label === 'Divine Favor +2' && l.value === 2)).toBe(true);
  });

  it('shows the buff in the attack breakdown, not just the total', () => {
    const buffed = resolve(withBuff(cleric(), 'divine-favor', 6)).sheet;
    expect(buffed.stats['attack:melee'].lines.some((l) => l.label === 'Divine Favor +2')).toBe(true);
  });

  it('stacks or overlaps by bonus type like any other effect', () => {
    // Bless is a morale bonus and Divine Favor a luck bonus, so both apply…
    const d = cleric();
    const both: CharacterDoc = {
      ...d,
      play: {
        ...emptyPlayState(),
        timers: [spellBuffTimer(spell('divine-favor'), 6, 't1')!, spellBuffTimer(spell('bless'), 6, 't2')!],
      },
    };
    const base = resolve(d).sheet.stats['attack:melee'].total;
    expect(resolve(both).sheet.stats['attack:melee'].total).toBe(base + 2 + 1);
  });

  it('…but two of the same type take the higher, not the sum', () => {
    const d = cleric();
    // Two castings of Divine Favor at different caster levels: both luck, so only +3 applies.
    const twice: CharacterDoc = {
      ...d,
      play: {
        ...emptyPlayState(),
        timers: [spellBuffTimer(spell('divine-favor'), 3, 't1')!, spellBuffTimer(spell('divine-favor'), 9, 't2')!],
      },
    };
    const base = resolve(d).sheet.stats['attack:melee'].total;
    expect(resolve(twice).sheet.stats['attack:melee'].total).toBe(base + 3);
  });

  it('Bless annotates the saves rather than inflating them — its bonus is fear-only', () => {
    const d = cleric();
    const base = resolve(d).sheet;
    const buffed = resolve(withBuff(d, 'bless', 6)).sheet;
    expect(buffed.stats['save:will'].total).toBe(base.stats['save:will'].total);
    // Annotations are rendered strings: "Bless: +1 against fear effects".
    expect(buffed.stats['save:will'].annotations).toContain('Bless: +1 against fear effects');
  });

  it('Prayer reaches skills through skill:all', () => {
    const d = withDecision(cleric(), 'skill-ranks', { heal: 3 });
    const base = resolve(d).sheet.stats['skill:heal'].total;
    expect(resolve(withBuff(d, 'prayer', 6)).sheet.stats['skill:heal'].total).toBe(base + 1);
  });

  it('Mage Armor and Shield are different AC bonus types, so they stack', () => {
    const d = cleric();
    const both: CharacterDoc = {
      ...d,
      play: {
        ...emptyPlayState(),
        timers: [spellBuffTimer(spell('mage-armor'), 6, 't1')!, spellBuffTimer(spell('shield'), 6, 't2')!],
      },
    };
    expect(resolve(both).sheet.stats['ac'].total).toBe(resolve(d).sheet.stats['ac'].total + 8);
  });

  it('Expeditious Retreat moves the speed the sheet shows', () => {
    const base = resolve(cleric()).sheet.speed.base;
    expect(resolve(withBuff(cleric(), 'expeditious-retreat', 6)).sheet.speed.base).toBe(base + 30);
  });

  it('an expired buff stops applying, because the timer is gone', () => {
    const d = cleric();
    const expired: CharacterDoc = { ...d, play: { ...emptyPlayState(), timers: [] } };
    expect(resolve(expired).sheet.stats['attack:melee'].total).toBe(resolve(d).sheet.stats['attack:melee'].total);
  });
});

describe('spell damage formulas', () => {
  const at = (id: string, cl: number) => spellDamageAt(spell(id), cl)!.formula;

  it('scales per caster level and caps where the spell says', () => {
    expect(at('fireball', 1)).toBe('1d6');
    expect(at('fireball', 5)).toBe('5d6');
    expect(at('fireball', 10)).toBe('10d6');
    expect(at('fireball', 20)).toBe('10d6'); // max 10d6
    expect(at('burning-hands', 9)).toBe('5d4'); // max 5d4
    expect(at('cone-of-cold', 20)).toBe('15d6');
  });

  it('handles the spells that scale on a different clock', () => {
    expect(at('vampiric-touch', 6)).toBe('3d6'); // 1d6 per two levels
    expect(at('disintegrate', 6)).toBe('12d6'); // 2d6 per level
    expect(at('searing-light', 6)).toBe('3d8'); // 1d8 per two levels, max 5d8
    expect(at('searing-light', 20)).toBe('5d8');
  });

  it('magic missile grows in missiles, not dice size', () => {
    expect(at('magic-missile', 1)).toBe('1d4+1');
    expect(at('magic-missile', 3)).toBe('2d4+2');
    expect(at('magic-missile', 9)).toBe('5d4+5');
    expect(at('magic-missile', 20)).toBe('5d4+5'); // five is the maximum
    expect(spellDamageAt(spell('magic-missile'), 9)!.note).toContain('5 missiles');
  });

  it('labels healing as healing rather than damage', () => {
    expect(spellDamageAt(spell('cure-light-wounds'), 3)).toMatchObject({ formula: '1d8+3', label: 'healed' });
    expect(spellDamageAt(spell('cure-light-wounds'), 20)!.formula).toBe('1d8+5'); // max +5
  });

  it('returns null for a spell whose damage is not a plain formula', () => {
    expect(spellDamageAt(spell('sleep'), 5)).toBeNull();
  });
});
