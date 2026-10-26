import { describe, it, expect } from 'vitest';
import { resolve } from './resolve';
import { newCharacter, withDecision } from './character';
import type { CharacterDoc } from './types';

// "A character who is wearing armor with which he is not proficient applies its armor check penalty
// to attack rolls." Numbers hand-computed: level 3 (BAB +3 for a fighter/warpriest, +1 for a wizard)
// with Str 14 (+2); full plate is -6, a heavy steel shield -2, a tower shield -10.

/** A level-3 character of `cls` wielding a longsword, in `armor`, with `offHand` in the off hand. */
function wearer(cls: string, armor: string | null, offHand: string | null = null,
  feats: Record<string, string> = {}): CharacterDoc {
  let d = newCharacter('t-armprof', 'Bryn');
  d = withDecision(d, 'ability-base', { str: 14, dex: 12, con: 12, int: 12, wis: 12, cha: 10 });
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'alignment', 'N');
  d = withDecision(d, 'class', cls);
  d = withDecision(d, 'feats', feats);
  return {
    ...d,
    level: 3,
    purchases: { longsword: 1, ...(armor ? { [armor]: 1 } : {}), ...(offHand ? { [offHand]: 1 } : {}) },
    equipped: { armor, mainHand: 'longsword', offHand },
  };
}

const melee = (d: CharacterDoc) => resolve(d).sheet.stats['attack:melee'];
const lines = (d: CharacterDoc) => melee(d).lines.map((l) => `${l.label} ${l.value}`);

describe('armour and shield proficiency', () => {
  it('a class that grants the armour costs nothing on an attack roll', () => {
    // Fighter: all armour and all shields. BAB +3, Str 14 (+2) = +5 either way.
    expect(melee(wearer('fighter', null)).total).toBe(5);
    expect(melee(wearer('fighter', 'full-plate', 'heavy-steel-shield')).total).toBe(5);
  });

  it('a non-proficient wearer takes the armour check penalty on attacks', () => {
    // A wizard is proficient with no armour at all.
    const wiz = wearer('wizard', 'full-plate');
    expect(melee(wiz).total).toBe(melee(wearer('wizard', null)).total - 6);
    expect(lines(wiz)).toContain('Not proficient with Full plate -6');
  });

  it('armour and shield are judged separately and both apply', () => {
    const both = wearer('wizard', 'full-plate', 'heavy-steel-shield');
    expect(melee(both).total).toBe(melee(wearer('wizard', null)).total - 8);
    expect(lines(both)).toContain('Not proficient with Full plate -6');
    expect(lines(both)).toContain('Not proficient with Heavy steel shield -2');
  });

  it('the penalty rides ranged attacks and every weapon line, not just the melee stat', () => {
    const wiz = wearer('wizard', 'full-plate');
    expect(resolve(wiz).sheet.stats['attack:ranged'].total)
      .toBe(resolve(wearer('wizard', null)).sheet.stats['attack:ranged'].total - 6);
    const attack = resolve(wiz).sheet.attacks.find((a) => a.id === 'longsword')!;
    const clean = resolve(wearer('wizard', null)).sheet.attacks.find((a) => a.id === 'longsword')!;
    expect(attack.bonuses[0]).toBe(clean.bonuses[0] - 6);
    // The breakdown explains it, because a weapon line is built from the melee stat's own lines.
    expect(attack.attackLines.some((l) => l.label === 'Not proficient with Full plate')).toBe(true);
  });

  it('a zero-penalty suit costs a non-proficient wearer nothing here', () => {
    // Padded and leather have no armour check penalty, so there is nothing to apply. They still
    // cost an arcane caster their spell failure chance, which is a separate (display-only) figure.
    expect(melee(wearer('wizard', 'leather')).total).toBe(melee(wearer('wizard', null)).total);
  });

  it('the proficiency feats remove the penalty, each for its own category', () => {
    const base = melee(wearer('wizard', null)).total;
    // Armor Proficiency (Heavy) requires Medium requires Light, so the whole chain is taken.
    const heavy = {
      'feat-1': 'armor-proficiency-light',
      'feat-human': 'armor-proficiency-medium',
      'feat-L3': 'armor-proficiency-heavy',
    };
    expect(melee(wearer('wizard', 'full-plate', null, heavy)).total).toBe(base);
    // Light proficiency alone does not cover full plate.
    expect(melee(wearer('wizard', 'full-plate', null, { 'feat-1': 'armor-proficiency-light' })).total).toBe(base - 6);
    // Shield Proficiency covers the shield and nothing else.
    expect(melee(wearer('wizard', null, 'heavy-steel-shield', { 'feat-1': 'shield-proficiency' })).total).toBe(base);
    expect(melee(wearer('wizard', 'full-plate', null, { 'feat-1': 'shield-proficiency' })).total).toBe(base - 6);
  });

  it('masterwork armour reduces the penalty it imposes on attacks', () => {
    const wiz = wearer('wizard', 'full-plate');
    const mwk: CharacterDoc = {
      ...wiz,
      decisions: { ...wiz.decisions, 'item-quality': { 'full-plate': { masterwork: true } } },
    };
    expect(melee(mwk).total).toBe(melee(wiz).total + 1);
  });

  it('a warpriest needs no feat for a shield, because the class grants it', () => {
    // "all armor (heavy, light, and medium) and shields (except tower shields)".
    const base = melee(wearer('warpriest', null)).total;
    expect(melee(wearer('warpriest', 'full-plate', 'heavy-steel-shield')).total).toBe(base);
  });

  it('a load check penalty never reaches an attack roll, only armour does', () => {
    // Overloading a proficient fighter penalises their skills and speed, never their attacks.
    const fighter = wearer('fighter', 'full-plate');
    const loaded: CharacterDoc = { ...fighter, purchases: { ...fighter.purchases, tent: 5 } };
    expect(resolve(loaded).sheet.load.label).not.toBe('Light');
    expect(resolve(loaded).sheet.stats['attack:melee'].total)
      .toBe(resolve(fighter).sheet.stats['attack:melee'].total);
  });

  it('an archetype that strips armour proficiency makes the wearer pay for it', () => {
    // The Sacred Fist warpriest gives up all armour and shield proficiency.
    const plain = wearer('warpriest', 'full-plate');
    const sacredFist: CharacterDoc = {
      ...plain,
      decisions: { ...plain.decisions, archetype: 'sacred-fist' },
    };
    expect(resolve(sacredFist).sheet.stats['attack:melee'].total)
      .toBe(resolve(plain).sheet.stats['attack:melee'].total - 6);
  });
});

describe('tower shields', () => {
  it('cost a non-proficient wielder the full -10, plus the -2 encumbrance', () => {
    const base = melee(wearer('warpriest', null)).total;
    const tower = wearer('warpriest', null, 'tower-shield');
    expect(melee(tower).total).toBe(base - 12);
    expect(lines(tower)).toContain('Not proficient with Tower shield -10');
    expect(lines(tower)).toContain('Tower shield (encumbrance) -2');
  });

  it('cost a fighter only the -2, because the fighter alone is proficient', () => {
    const base = melee(wearer('fighter', null)).total;
    const tower = wearer('fighter', null, 'tower-shield');
    expect(melee(tower).total).toBe(base - 2);
    expect(lines(tower)).toContain('Tower shield (encumbrance) -2');
    expect(lines(tower).some((l) => l.startsWith('Not proficient'))).toBe(false);
  });

  it('are not covered by Shield Proficiency, but are by Tower Shield Proficiency', () => {
    const base = melee(wearer('wizard', null)).total;
    expect(melee(wearer('wizard', null, 'tower-shield', { 'feat-1': 'shield-proficiency' })).total).toBe(base - 12);
    const towerFeats = { 'feat-1': 'shield-proficiency', 'feat-human': 'tower-shield-proficiency' };
    expect(melee(wearer('wizard', null, 'tower-shield', towerFeats)).total).toBe(base - 2);
  });
});
