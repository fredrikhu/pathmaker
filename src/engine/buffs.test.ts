import { describe, it, expect } from 'vitest';
import { spellBuffTimer, spellDamageAt, spellAttackerTimer, type AttackerContext } from './buffs';
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

describe('buffs that are not flat bonuses', () => {
  function fighter(): CharacterDoc {
    let d = newCharacter('t-bs', 'Doran');
    d = withDecision(d, 'ability-base', { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'fighter');
    return { ...d, level: 4, purchases: { longsword: 1 }, equipped: { armor: null, mainHand: 'longsword', offHand: null } };
  }
  const withBuff = (d: CharacterDoc, spellId: string, cl: number): CharacterDoc => ({
    ...d, play: { ...emptyPlayState(), timers: [spellBuffTimer(spell(spellId), cl, 't1')!] },
  });

  it("Bull's Strength raises Strength itself, so everything derived from it moves", () => {
    const base = resolve(fighter()).sheet;
    const buffed = resolve(withBuff(fighter(), 'bulls-strength', 5)).sheet;
    // Str 14 (+2) → 18 (+4): attack, damage and CMB all follow from the one change.
    expect(buffed.stats['ability:str'].total).toBe(base.stats['ability:str'].total + 4);
    expect(buffed.stats['attack:melee'].total).toBe(base.stats['attack:melee'].total + 2);
    expect(buffed.attacks[0].damage).toBe('1d8+4');
    expect(buffed.stats['cmb'].total).toBe(base.stats['cmb'].total + 2);
  });

  it("Cat's Grace raises Dexterity, so AC, Reflex and ranged attack all follow", () => {
    const base = resolve(fighter()).sheet;
    const buffed = resolve(withBuff(fighter(), 'cats-grace', 5)).sheet;
    // Dex 12 (+1) → 16 (+3): the mod rises by 2, reaching everything Dex feeds.
    expect(buffed.stats['ability:dex'].total).toBe(base.stats['ability:dex'].total + 4);
    expect(buffed.stats['ac'].total).toBe(base.stats['ac'].total + 2);
    expect(buffed.stats['save:ref'].total).toBe(base.stats['save:ref'].total + 2);
    expect(buffed.stats['attack:ranged'].total).toBe(base.stats['attack:ranged'].total + 2);
  });

  it("Bear's Endurance raises Constitution, so HP rises retroactively across every level", () => {
    const base = resolve(fighter()).sheet; // fighter 4, d10
    const buffed = resolve(withBuff(fighter(), 'bears-endurance', 5)).sheet;
    // Con 12 (+1) → 16 (+3): +2 per Hit Die × 4 levels = +8 max HP.
    expect(buffed.stats['hp:max'].total).toBe(base.stats['hp:max'].total + 8);
  });

  it('Heroism is a flat morale bonus on attacks, saves, and skills (not weapon damage)', () => {
    const base = resolve(fighter()).sheet;
    const buffed = resolve(withBuff(fighter(), 'heroism', 5)).sheet;
    expect(buffed.stats['attack:melee'].total).toBe(base.stats['attack:melee'].total + 2);
    expect(buffed.stats['save:will'].total).toBe(base.stats['save:will'].total + 2);
    // Heroism does not touch weapon damage — Good Hope does.
    expect(buffed.attacks[0].damage).toBe(base.attacks[0].damage);
  });

  it('Longstrider and Expeditious Retreat are both enhancement, so the larger wins rather than stacking', () => {
    const base = resolve(fighter()).sheet;
    const long = resolve(withBuff(fighter(), 'longstrider', 5)).sheet;
    expect(long.speed.base).toBe(base.speed.base + 10);
    const both = resolve({ ...fighter(), play: { ...emptyPlayState(), timers: [
      spellBuffTimer(spell('longstrider'), 5, 't1')!, spellBuffTimer(spell('expeditious-retreat'), 5, 't2')!,
    ] } }).sheet;
    // +10 and +30 are both enhancement bonuses to speed — only the +30 applies.
    expect(both.speed.base).toBe(base.speed.base + 30);
  });

  it('Protection from Evil totals nothing, because both its bonuses are evil-specific', () => {
    const base = resolve(fighter()).sheet;
    const buffed = resolve(withBuff(fighter(), 'protection-from-evil', 5)).sheet;
    expect(buffed.stats['ac'].total).toBe(base.stats['ac'].total);
    expect(buffed.stats['save:will'].total).toBe(base.stats['save:will'].total);
  });

  it('…and instead offers them as structured conditional bonuses a save roll can use', () => {
    const buffed = resolve(withBuff(fighter(), 'protection-from-evil', 5)).sheet;
    expect(buffed.stats['save:will'].conditional).toContainEqual({
      note: 'Protection from Evil', value: 2, condition: 'against evil creatures',
    });
    expect(buffed.stats['ac'].conditional.some((c) => c.note === 'Protection from Evil')).toBe(true);
  });
});

describe('independent attackers on a timer', () => {
  const zeroMods = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const ctx = (over: Partial<AttackerContext> = {}): AttackerContext =>
    ({ casterLevel: 6, bab: 3, abilityMods: { ...zeroMods }, dcBase: 13, ...over });

  it('spiritual weapon strikes with BAB + Wis and scales damage per three levels', () => {
    // Cleric 6: BAB +4 (¾), Wis +3. Spiritual weapon attacks at +7, damage 1d8+2 (floor 6/3).
    const t = spellAttackerTimer(spell('spiritual-weapon'), ctx({ casterLevel: 6, bab: 4, abilityMods: { ...zeroMods, wis: 3 } }), 'x')!;
    expect(t.attacker!.attackBonuses).toEqual([7]);
    expect(t.attacker!.damage).toBe('1d8+2');
    expect(t.attacker!.dmgType).toBe('force');
    expect(t.attacker!.save).toBeUndefined();
    expect(t.remaining).toBe(6); // 1 round/level
  });

  it('gives spiritual weapon iteratives from the caster’s BAB', () => {
    // BAB +11 → +11/+6/+1, plus Wis +2 on each.
    const t = spellAttackerTimer(spell('spiritual-weapon'), ctx({ bab: 11, abilityMods: { ...zeroMods, wis: 2 } }), 'x')!;
    expect(t.attacker!.attackBonuses).toEqual([13, 8, 3]);
  });

  it('caps spiritual weapon’s damage bonus at +5', () => {
    expect(spellAttackerTimer(spell('spiritual-weapon'), ctx({ casterLevel: 15, bab: 11 }), 'x')!.attacker!.damage).toBe('1d8+5');
    expect(spellAttackerTimer(spell('spiritual-weapon'), ctx({ casterLevel: 20, bab: 15 }), 'x')!.attacker!.damage).toBe('1d8+5');
  });

  it('flaming sphere makes no attack roll and lets the target save against a DC', () => {
    // dcBase 13 + spell level 2 = DC 15.
    const t = spellAttackerTimer(spell('flaming-sphere'), ctx({ dcBase: 13 }), 'x')!;
    expect(t.attacker!.attackBonuses).toBeUndefined();
    expect(t.attacker!.damage).toBe('3d6');
    expect(t.attacker!.save).toBe('Reflex DC 15 negates');
  });

  it('returns null for a spell that summons no attacker', () => {
    expect(spellAttackerTimer(spell('fireball'), ctx(), 'x')).toBeNull();
    expect(spellAttackerTimer(spell('bless'), ctx(), 'x')).toBeNull();
  });
});

describe('resist energy — a cast-time energy-type choice', () => {
  const re = spell('resist-energy');

  it('grants resistance of the chosen type', () => {
    const t = spellBuffTimer(re, 6, 'x', 'fire')!;
    expect(t.resistances).toEqual([{ type: 'fire', amount: 10, note: 'Resist Energy' }]);
    expect(t.effects).toEqual([]);
    // The chosen type is named on the chip.
    expect(t.label).toContain('Fire');
  });

  it('scales the amount: 10, then 20 at CL 7, then 30 at CL 11', () => {
    const amount = (cl: number) => spellBuffTimer(re, cl, 'x', 'cold')!.resistances![0].amount;
    expect(amount(1)).toBe(10);
    expect(amount(6)).toBe(10);
    expect(amount(7)).toBe(20);
    expect(amount(10)).toBe(20);
    expect(amount(11)).toBe(30);
    expect(amount(20)).toBe(30);
  });

  it('lasts 10 minutes per caster level', () => {
    expect(spellBuffTimer(re, 5, 'x', 'acid')!.remaining).toBe(5 * 100);
  });

  it('falls back to the first option when cast without a choice, and says which', () => {
    const t = spellBuffTimer(re, 6, 'x')!;
    expect(t.resistances![0].type).toBe('acid'); // the first option
    expect(t.label).toContain('Acid');
  });

  it('ignores a nonsense param rather than producing an invalid type', () => {
    expect(spellBuffTimer(re, 6, 'x', 'psychic')!.resistances![0].type).toBe('acid');
  });

  it('reaches the sheet as a real resistance the damage entry uses', () => {
    let d = newCharacter('t-re', 'Sella');
    d = withDecision(d, 'ability-base', { str: 10, dex: 12, con: 12, int: 10, wis: 14, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'cleric');
    d = { ...d, level: 7, play: { ...emptyPlayState(), timers: [spellBuffTimer(re, 7, 't1', 'fire')!] } };
    const def = resolve(d).sheet.defenses;
    expect(def.resistances).toEqual([{ type: 'fire', amount: 20, note: 'Resist Energy' }]);
  });
});

describe('protection from energy — an absorbing pool on a timer', () => {
  const pfe = spell('protection-from-energy');

  it('places a pool of 12 per caster level, capped at 120', () => {
    expect(spellBuffTimer(pfe, 6, 'x', 'fire')!.absorb).toEqual({ type: 'fire', remaining: 72 });
    expect(spellBuffTimer(pfe, 10, 'x', 'cold')!.absorb!.remaining).toBe(120);
    expect(spellBuffTimer(pfe, 20, 'x', 'acid')!.absorb!.remaining).toBe(120); // capped
  });

  it('names the chosen type on the chip and lasts 10 minutes per level', () => {
    const t = spellBuffTimer(pfe, 5, 'x', 'electricity')!;
    expect(t.label).toContain('Electricity');
    expect(t.remaining).toBe(5 * 100);
  });

  it('reaches the sheet as an absorption pool the damage entry can deplete', () => {
    let d = newCharacter('t-pfe', 'Ward');
    d = withDecision(d, 'ability-base', { str: 10, dex: 12, con: 12, int: 10, wis: 14, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'cleric');
    d = { ...d, level: 6, play: { ...emptyPlayState(), timers: [spellBuffTimer(pfe, 6, 't1', 'fire')!] } };
    expect(resolve(d).sheet.defenses.absorb).toEqual([
      { type: 'fire', remaining: 72, note: 'Protection from Energy (Fire)', timerId: 't1' },
    ]);
  });
});
