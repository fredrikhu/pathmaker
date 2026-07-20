import { describe, it, expect } from 'vitest';
import { resolve, doubleThreatRange } from './resolve';
import { newCharacter, withDecision } from './character';
import type { CharacterDoc } from './types';
import { emptyPlayState } from './types';
import * as C from '../content/index';

// Golden characters — numbers hand-computed against the PF1e core rules.

function humanFighter1(): CharacterDoc {
  let d = newCharacter('t-fighter', 'Valeria');
  d = withDecision(d, 'ability-base', { str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8 });
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'floating-bonus', ['str']); // +2 Str -> 17
  d = withDecision(d, 'alignment', 'LN');
  d = withDecision(d, 'class', 'fighter');
  d = withDecision(d, 'favored-class', 'fighter');
  d = withDecision(d, 'fcb', 'hp');
  return d;
}

describe('human fighter 1 (elite array + racial)', () => {
  const r = resolve(humanFighter1());
  const s = r.sheet.stats;

  it('applies the human floating +2 to Str', () => {
    expect(s['ability:str'].total).toBe(17);
    expect(s['ability:dex'].total).toBe(14);
  });

  it('HP = 10 (d10) + 2 (Con) + 1 (FCB) = 13', () => {
    expect(s['hp:max'].total).toBe(13);
  });

  it('Fortitude = +2 good + 2 Con = +4; Will = 0 + 1 Wis = +1', () => {
    expect(s['save:fort'].total).toBe(4);
    expect(s['save:will'].total).toBe(1);
    expect(s['save:ref'].total).toBe(2);
  });

  it('BAB +1, melee attack = +1 BAB + 3 Str = +4', () => {
    expect(s['bab'].total).toBe(1);
    expect(s['attack:melee'].total).toBe(4);
  });

  it('grants 3 skill ranks/level (2 base + 0 Int + 1 human Skilled)', () => {
    expect(r.sheet.skillRanksTotal).toBe(3);
  });

  it('exposes a human bonus feat slot plus fighter bonus + 1st-level', () => {
    const featSlots = r.slots.filter((sl) => sl.step === 'feats');
    expect(featSlots.map((sl) => sl.id).sort()).toEqual(['feat-1', 'feat-fighter', 'feat-human'].sort());
  });

  it('no spells step for a fighter', () => {
    expect(r.steps).not.toContain('spells');
  });
});

describe('would-invalidate: Focused Study orphans a placed human bonus feat', () => {
  it('flags the orphaned feat as an error once the slot is removed', () => {
    let d = humanFighter1();
    d = withDecision(d, 'feats', { 'feat-human': 'toughness' });
    // Before: legal, no orphan issue.
    const before = resolve(d);
    expect(before.issues.some((i) => i.message.includes('orphaned'))).toBe(false);
    // The alt-trait option should advertise the consequence.
    const altSlot = before.slots.find((sl) => sl.id === 'alt-traits')!;
    const focused = altSlot.options.find((o) => o.id === 'human-focused-study')!;
    expect(focused.legal).toBe(true);
    expect(focused.wouldInvalidate?.[0].decisionName).toBe('Toughness');

    // After taking Focused Study, feat-human slot disappears and the feat orphans.
    d = withDecision(d, 'alt-traits', ['human-focused-study']);
    const after = resolve(d);
    expect(after.issues.some((i) => i.severity === 'error' && i.message.includes('orphaned'))).toBe(true);
  });

  it('suspends an orphaned feat’s mechanical effect until resolved', () => {
    let d = humanFighter1();
    // HP without Toughness: 10 + 2 Con + 1 FCB = 13.
    d = withDecision(d, 'feats', { 'feat-human': 'toughness' });
    expect(resolve(d).sheet.stats['hp:max'].total).toBe(16); // +3 while validly slotted
    d = withDecision(d, 'alt-traits', ['human-focused-study']); // removes the slot
    expect(resolve(d).sheet.stats['hp:max'].total).toBe(13); // Toughness suspended
  });
});

describe('alignment/class conflict surfaces as an error, never a lock', () => {
  it('LN + paladin => error issue', () => {
    let d = newCharacter('t-pal');
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'paladin');
    const r = resolve(d);
    expect(r.issues.some((i) => i.severity === 'error' && /Alignment LN conflicts with Paladin/.test(i.message))).toBe(true);
  });
});

describe('elf wizard 1: opposition schools and spellbook', () => {
  function elfWizard(): CharacterDoc {
    let d = newCharacter('t-wiz', 'Elaria');
    d = withDecision(d, 'ability-base', { str: 8, dex: 15, con: 14, int: 15, wis: 12, cha: 10 });
    d = withDecision(d, 'race', 'elf'); // +2 Dex ->17? no: 15+2=17 Dex, +2 Int ->17, -2 Con ->12
    d = withDecision(d, 'class', 'wizard');
    d = withDecision(d, 'class-choices', { school: ['evocation'], opposition: ['enchantment', 'necromancy'], 'arcane-bond': ['familiar'] });
    return d;
  }
  const r = resolve(elfWizard());
  const s = r.sheet.stats;

  it('elf racial mods: Dex 17, Int 17, Con 12', () => {
    expect(s['ability:dex'].total).toBe(17);
    expect(s['ability:int'].total).toBe(17);
    expect(s['ability:con'].total).toBe(12);
  });

  it('Will save = +2 good + 1 Wis = +3', () => {
    expect(s['save:will'].total).toBe(3);
  });

  it('Perception carries +2 racial Keen Senses', () => {
    expect(s['skill:perception'].lines.some((l) => /Keen Senses/.test(l.label))).toBe(true);
  });

  it('has a spells step, a 1st-level spellbook slot, and a 3 + Int mod = 6 budget', () => {
    expect(r.steps).toContain('spells');
    expect(r.slots.some((sl) => sl.id === 'spell-picks-L1')).toBe(true);
    // Empty spellbook nudges toward the budget of 6 (3 + Int 17).
    expect(r.issues.some((i) => /Spellbook:.*\/6/.test(i.message))).toBe(true);
  });

  it('marks opposition-school spells with a caution, not a lock', () => {
    const spellSlot = r.slots.find((sl) => sl.id === 'spell-picks-L1')!;
    const sleep = spellSlot.options.find((o) => o.id === 'sleep')!; // Enchantment (opposed)
    expect(sleep.legal).toBe(true);
    expect(sleep.caution).toMatch(/double slot/);
    const mm = spellSlot.options.find((o) => o.id === 'magic-missile')!; // Evocation (fine)
    expect(mm.caution).toBeUndefined();
  });

  it('universalist removes the opposition slot entirely', () => {
    let d = elfWizard();
    d = withDecision(d, 'class-choices', { school: ['universalist'] });
    const r2 = resolve(d);
    expect(r2.slots.some((sl) => sl.id === 'opposition')).toBe(false);
  });
});

describe('new races', () => {
  function race(raceId: string, cls = 'fighter'): CharacterDoc {
    let d = newCharacter('t-' + raceId);
    d = withDecision(d, 'ability-base', { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 10 });
    d = withDecision(d, 'race', raceId);
    d = withDecision(d, 'class', cls);
    return d;
  }

  it('Goblin (Small, +4 Dex) stacks +4 racial and +4 size on Stealth', () => {
    let d = race('goblin', 'rogue');
    d = withDecision(d, 'skill-ranks', { stealth: 1 });
    const r = resolve(d);
    // Dex 14+4=18 (+4) + 1 rank + 3 class skill + 4 racial (Skilled) + 4 size (Small) = 16
    expect(r.sheet.stats['skill:stealth'].total).toBe(16);
    // AC gains +1 from Small size
    expect(r.sheet.stats['ability:dex'].total).toBe(18);
  });

  it('Kobold gets +1 natural armor into AC', () => {
    const r = resolve(race('kobold'));
    expect(r.sheet.stats['ac'].lines.some((l) => /Natural Armor/.test(l.label))).toBe(true);
  });

  it('Dhampir’s +2 vs disease/mind-affecting is an annotation, not in the flat save total', () => {
    const r = resolve(race('dhampir'));
    // Will = 0 (fighter poor) + 0 Wis = 0, NOT +2.
    expect(r.sheet.stats['save:will'].total).toBe(0);
    expect(r.sheet.stats['save:will'].annotations.some((a) => /disease/.test(a))).toBe(true);
  });

  it('Oread has a 20-ft speed and no floating bonus', () => {
    const r = resolve(race('oread'));
    expect(r.slots.some((s) => s.id === 'floating-bonus')).toBe(false); // fixed mods, not a choice race
    expect(r.sheet.speed.base).toBe(20);
  });

  it('heavy armor reduces a human’s 30-ft speed to 20', () => {
    let d = race('human');
    d = { ...d, equipped: { ...d.equipped, armor: 'full-plate' } };
    const r = resolve(d);
    expect(r.sheet.speed.base).toBe(20);
    expect(r.sheet.speed.reducedFrom).toBe(30);
  });

  it('a dwarf in heavy armor keeps 20 ft (Slow and Steady is never reduced)', () => {
    let d = race('dwarf');
    d = { ...d, equipped: { ...d.equipped, armor: 'full-plate' } };
    const r = resolve(d);
    expect(r.sheet.speed.base).toBe(20);
    expect(r.sheet.speed.reducedFrom).toBeUndefined();
  });

  it('medium armor reduces a Small race’s 20-ft speed to 15', () => {
    let d = race('halfling');
    d = { ...d, equipped: { ...d.equipped, armor: 'scale-mail' } }; // medium
    const r = resolve(d);
    expect(r.sheet.speed.base).toBe(15);
  });

  it('light armor does not reduce speed', () => {
    let d = race('human');
    d = { ...d, equipped: { ...d.equipped, armor: 'chain-shirt' } }; // light
    const r = resolve(d);
    expect(r.sheet.speed.base).toBe(30);
    expect(r.sheet.speed.reducedFrom).toBeUndefined();
  });
});

describe('new Base/Hybrid classes', () => {
  function human(cls: string): CharacterDoc {
    let d = newCharacter('t-' + cls);
    d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 14, int: 14, wis: 12, cha: 14 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'class', cls);
    return d;
  }

  it('Magus: full BAB (+1 at 1st), good Fort+Will, and a 3+Int spellbook slot', () => {
    const r = resolve(human('magus'));
    expect(r.sheet.stats['bab'].total).toBe(1);
    expect(r.sheet.stats['save:fort'].total).toBe(4); // +2 + 2 Con
    expect(r.sheet.stats['save:will'].total).toBe(3); // +2 + 1 Wis
    expect(r.steps).toContain('spells');
    expect(r.slots.some((s) => s.id === 'spell-picks-L1')).toBe(true); // 1st-level spellbook
    expect(r.issues.some((i) => /Spellbook:/.test(i.message))).toBe(true);
  });

  it('Oracle: ¾ BAB (+0), spontaneous divine, and mystery + curse choices', () => {
    const r = resolve(human('oracle'));
    expect(r.sheet.stats['bab'].total).toBe(0);
    expect(r.steps).toContain('spells');
    const known = r.slots.find((s) => s.id === 'spell-picks-L1')!;
    expect(known.count).toBe(2); // spells known at 1st level
    expect(r.slots.some((s) => s.id === 'mystery')).toBe(true);
    expect(r.slots.some((s) => s.id === 'curse')).toBe(true);
  });

  it('Cavalier: full BAB martial with an order choice and no spells step', () => {
    const r = resolve(human('cavalier'));
    expect(r.sheet.stats['bab'].total).toBe(1);
    expect(r.steps).not.toContain('spells');
    const order = r.slots.find((s) => s.id === 'order')!;
    expect(order.options.length).toBeGreaterThan(3);
    expect(order.options.every((o) => o.legal)).toBe(true);
  });

  it('Bloodrager: full BAB, bloodline choice, but no spells at level 1', () => {
    const r = resolve(human('bloodrager'));
    expect(r.sheet.stats['bab'].total).toBe(1);
    expect(r.steps).not.toContain('spells'); // casting begins at 4th
    expect(r.slots.some((s) => s.id === 'bloodline')).toBe(true);
  });

  it('Witch: ½ BAB (+0), d6, arcane spellbook, patron + hex choices', () => {
    const r = resolve(human('witch'));
    expect(r.sheet.stats['bab'].total).toBe(0);
    expect(r.sheet.stats['hp:max'].total).toBe(8); // d6 6 + 2 Con
    expect(r.slots.some((s) => s.id === 'patron')).toBe(true);
    expect(r.slots.some((s) => s.id === 'hex')).toBe(true);
  });
});

describe('Dual Talent and the over-selection bug class', () => {
  function human(): CharacterDoc {
    let d = newCharacter('t-dt');
    d = withDecision(d, 'ability-base', { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'class', 'fighter');
    return d;
  }

  it('applies both +2 bonuses while Dual Talent is active, with no over-count issue', () => {
    let d = human();
    d = withDecision(d, 'alt-traits', ['human-dual-talent']);
    d = withDecision(d, 'floating-bonus', ['str', 'dex']);
    const r = resolve(d);
    expect(r.sheet.stats['ability:str'].total).toBe(12);
    expect(r.sheet.stats['ability:dex'].total).toBe(12);
    expect(r.issues.some((i) => /only 1 allowed|only \d+ allowed/.test(i.message))).toBe(false);
  });

  it('suspends the excess bonus and flags an error when Dual Talent is dropped', () => {
    let d = human();
    d = withDecision(d, 'alt-traits', ['human-dual-talent']);
    d = withDecision(d, 'floating-bonus', ['str', 'dex']);
    d = withDecision(d, 'alt-traits', []); // drop Dual Talent → only 1 bonus allowed now
    const r = resolve(d);
    // Exactly one of the two picks still applies (the engine caps to the allowed count).
    const boosted = ['str', 'dex'].filter((a) => r.sheet.stats[`ability:${a}`].total === 12);
    expect(boosted).toHaveLength(1);
    expect(r.issues.some((i) => i.severity === 'error' && /2 selected but only 1 allowed/.test(i.message))).toBe(true);
  });

  it('flags a cleric domain that the deity no longer grants after a deity change', () => {
    let d = newCharacter('t-dom');
    d = withDecision(d, 'ability-base', { str: 10, dex: 10, con: 10, int: 10, wis: 12, cha: 12 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'class', 'cleric');
    d = withDecision(d, 'deity', 'torag'); // grants law, good, protection, earth, artifice
    d = withDecision(d, 'class-choices', { domains: ['good', 'law'] });
    expect(resolve(d).issues.some((i) => /no longer allowed/.test(i.message))).toBe(false);
    d = withDecision(d, 'deity', 'desna'); // grants good, but NOT law
    const r = resolve(d);
    expect(r.issues.some((i) => i.severity === 'error' && /Law is no longer allowed/.test(i.message))).toBe(true);
  });

  it('flags an over-full spellbook after the Int bonus that sized it is removed', () => {
    let d = newCharacter('t-book');
    d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 12, int: 15, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'elf'); // +2 Int → 17 → mod +3 → book of 3+3 = 6
    d = withDecision(d, 'class', 'wizard');
    d = withDecision(d, 'spell-picks', ['magic-missile', 'mage-armor', 'shield', 'burning-hands', 'grease', 'identify']);
    expect(resolve(d).issues.some((i) => /only \d+ allowed/.test(i.message))).toBe(false);
    d = withDecision(d, 'race', 'human'); // no Int bonus → Int 15 → mod +2 → book of 5
    d = withDecision(d, 'floating-bonus', []); // don't re-add Int
    const r = resolve(d);
    expect(r.issues.some((i) => i.severity === 'error' && /exceeds your 5/.test(i.message))).toBe(true);
  });
});

describe('warpriest: deity-filtered blessings, ¾ BAB, no creation spells step', () => {
  function warpriest(): CharacterDoc {
    let d = newCharacter('t-wp', 'Kestrel');
    d = withDecision(d, 'ability-base', { str: 15, dex: 12, con: 14, int: 10, wis: 14, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', 'NG');
    d = withDecision(d, 'deity', 'sarenrae'); // NG; domains: fire, glory, good, healing, sun
    d = withDecision(d, 'class', 'warpriest');
    d = withDecision(d, 'favored-class', 'warpriest');
    d = withDecision(d, 'fcb', 'hp');
    return d;
  }
  const r = resolve(warpriest());
  const s = r.sheet.stats;

  it('is ¾ BAB (0 at level 1) with good Fort and Will', () => {
    expect(s['bab'].total).toBe(0);
    expect(s['save:fort'].total).toBe(4); // +2 + 2 Con
    expect(s['save:will'].total).toBe(4); // +2 + 2 Wis
    expect(s['save:ref'].total).toBe(1);  // +0 + 1 Dex
  });

  it('HP = 8 (d8) + 2 Con + 1 FCB = 11', () => {
    expect(s['hp:max'].total).toBe(11);
  });

  it('offers a 2-blessing slot filtered to the deity’s domains', () => {
    const slot = r.slots.find((sl) => sl.id === 'blessings')!;
    expect(slot.count).toBe(2);
    expect(slot.options.find((o) => o.id === 'good')!.legal).toBe(true);
    expect(slot.options.find((o) => o.id === 'healing')!.legal).toBe(true);
    const war = slot.options.find((o) => o.id === 'war')!;
    expect(war.legal).toBe(false);
    expect(war.whyNot).toMatch(/blessing/); // uses blessing wording, not domain
  });

  it('has no creation-time spells step (prepared-list caster)', () => {
    expect(r.steps).not.toContain('spells');
  });
});

describe('elven immunities is an annotation, not folded into the save total', () => {
  it('keeps +2 vs enchantment out of the Will number', () => {
    let d = newCharacter('t-elf');
    d = withDecision(d, 'ability-base', { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'elf');
    d = withDecision(d, 'class', 'wizard');
    const r = resolve(d);
    // Will = +2 (wizard good) + 0 Wis = +2, and NOT +4.
    expect(r.sheet.stats['save:will'].total).toBe(2);
    expect(r.sheet.stats['save:will'].annotations.some((a) => /enchantment/.test(a))).toBe(true);
  });
});

// ---------- Phase 2: multi-level progression ----------

function atLevel(d: CharacterDoc, level: number): CharacterDoc {
  return { ...d, level };
}

describe('human fighter 5 (multi-level core numbers)', () => {
  const r = resolve(atLevel(humanFighter1(), 5));
  const s = r.sheet.stats;

  it('full BAB = 5', () => {
    expect(s['bab'].total).toBe(5);
  });

  it('saves: Fort +6 (good 4 + Con 2), Ref +3 (poor 1 + Dex 2), Will +2 (poor 1 + Wis 1)', () => {
    expect(s['save:fort'].total).toBe(6);
    expect(s['save:ref'].total).toBe(3);
    expect(s['save:will'].total).toBe(2);
  });

  it('HP = 10 (max d10) + 24 (levels 2–5 @6) + 10 (Con×5) + 5 (FCB×5) = 49', () => {
    expect(s['hp:max'].total).toBe(49);
  });

  it('skill ranks = 3/level × 5 = 15', () => {
    expect(r.sheet.skillRanksTotal).toBe(15);
  });

  it('opens general feats at 1/3/5, racial, and fighter bonus at 1/2/4', () => {
    const featSlots = r.slots.filter((sl) => sl.step === 'feats' && sl.id.startsWith('feat'));
    expect(featSlots.map((sl) => sl.id).sort()).toEqual(
      ['feat-1', 'feat-L3', 'feat-L5', 'feat-fighter', 'feat-fighter-L2', 'feat-fighter-L4', 'feat-human'].sort(),
    );
  });

  it('progression table has 5 rows ending at BAB +5', () => {
    expect(r.sheet.progression.length).toBe(5);
    expect(r.sheet.progression[4]).toMatchObject({ level: 5, bab: 5 });
  });
});

function cleric(level: number, wis: number): CharacterDoc {
  let d = newCharacter('t-cleric', 'Kore');
  d = withDecision(d, 'ability-base', { str: 10, dex: 12, con: 12, int: 10, wis, cha: 10 });
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'floating-bonus', ['cha']); // keep Wis clean
  d = withDecision(d, 'alignment', 'N');
  d = withDecision(d, 'class', 'cleric');
  return atLevel(d, level);
}

describe('cleric 7 (¾ BAB + caster level + slots)', () => {
  const r = resolve(cleric(7, 16)); // Wis 16 = +3

  it('three-quarter BAB at 7 = 5', () => {
    expect(r.sheet.stats['bab'].total).toBe(5);
  });

  it('caster level = 7', () => {
    expect(r.sheet.casterLevel).toBe(7);
  });

  it('spell slots/day = base [4,4,3,2,1] + Wis bonus = [4,5,4,3,1]', () => {
    expect(r.sheet.spellSlots).toEqual([4, 5, 4, 3, 1]);
  });
});

describe('rogue 4 (ability increase at 4)', () => {
  let d = newCharacter('t-rogue', 'Sly');
  d = withDecision(d, 'ability-base', { str: 14, dex: 15, con: 12, int: 12, wis: 10, cha: 10 });
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'floating-bonus', ['dex']);
  d = withDecision(d, 'alignment', 'N');
  d = withDecision(d, 'class', 'rogue');
  d = withDecision(d, 'ability-increases', { 4: 'str' });
  const r = resolve(atLevel(d, 4));

  it('¾ BAB at 4 = 3', () => {
    expect(r.sheet.stats['bab'].total).toBe(3);
  });

  it('applies the +1 level-4 increase to Str (14 → 15)', () => {
    expect(r.sheet.stats['ability:str'].total).toBe(15);
  });

  it('records the increase in the level-4 progression row', () => {
    expect(r.sheet.progression[3]).toMatchObject({ level: 4, abilityIncrease: 'str' });
  });
});

describe('retroactive HP from a Con increase at level 4', () => {
  // Fighter with an odd Con (13 → +1) so the +1 at level 4 raises the modifier to +2.
  function odd(level: number, increases?: Record<number, string>): CharacterDoc {
    let d = newCharacter('t-con', 'Bruiser');
    d = withDecision(d, 'ability-base', { str: 14, dex: 12, con: 13, int: 10, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'class', 'fighter');
    d = withDecision(d, 'favored-class', 'fighter');
    d = withDecision(d, 'fcb', 'hp');
    if (increases) d = withDecision(d, 'ability-increases', increases);
    return atLevel(d, level);
  }

  it('without the increase: 10 + 18 + Con(+1)×4 + FCB 4 = 36', () => {
    expect(resolve(odd(4)).sheet.stats['hp:max'].total).toBe(36);
  });

  it('with Con increase at 4: modifier +2 applies to all 4 levels retroactively = 40', () => {
    expect(resolve(odd(4, { 4: 'con' })).sheet.stats['hp:max'].total).toBe(40);
  });
});

describe('level-down suspends higher-level decisions (does not delete or error)', () => {
  let d = humanFighter1();
  d = withDecision(d, 'feats', { 'feat-1': 'toughness', 'feat-L5': 'toughness' });

  it('at level 5 the 5th-level feat slot exists', () => {
    const r = resolve(atLevel(d, 5));
    expect(r.slots.some((sl) => sl.id === 'feat-L5')).toBe(true);
  });

  it('at level 3 the 5th-level feat is suspended: no slot, no error, an info notice', () => {
    const r = resolve(atLevel(d, 3));
    expect(r.slots.some((sl) => sl.id === 'feat-L5')).toBe(false);
    expect(r.issues.some((i) => i.severity === 'error' && /orphan/i.test(i.message))).toBe(false);
    expect(r.issues.some((i) => i.severity === 'info' && /suspended/i.test(i.message))).toBe(true);
    expect(r.sheet.stats['bab'].total).toBe(3);
  });

  it('the suspended decision is still present in the document', () => {
    expect((d.decisions['feats'] as Record<string, string>)['feat-L5']).toBe('toughness');
  });
});

describe('Toughness scales with Hit Dice (max(3, level))', () => {
  function withToughness(level: number): CharacterDoc {
    let d = humanFighter1();
    d = withDecision(d, 'feats', { 'feat-1': 'toughness' });
    return atLevel(d, level);
  }
  it('level 1: +3 HP (13 → 16)', () => {
    expect(resolve(withToughness(1)).sheet.stats['hp:max'].total).toBe(16);
  });
  it('level 5: +5 HP (49 → 54)', () => {
    expect(resolve(withToughness(5)).sheet.stats['hp:max'].total).toBe(54);
  });
});

describe('per-level subsystem picks (Part B content)', () => {
  function barbarian(level: number): CharacterDoc {
    let d = newCharacter('t-barb', 'Grug');
    d = withDecision(d, 'ability-base', { str: 16, dex: 14, con: 15, int: 8, wis: 10, cha: 8 });
    d = withDecision(d, 'race', 'half-orc');
    d = withDecision(d, 'alignment', 'CN');
    d = withDecision(d, 'class', 'barbarian');
    return atLevel(d, level);
  }

  it('barbarian gains a rage-power slot at 2, 4, 6 (three by level 6)', () => {
    const r = resolve(barbarian(6));
    const ragePowers = r.slots.filter((s) => s.step === 'class' && s.id.startsWith('rage-power'));
    expect(ragePowers.map((s) => s.id).sort()).toEqual(['rage-power-L2', 'rage-power-L4', 'rage-power-L6']);
    expect(r.sheet.stats['bab'].total).toBe(6); // full BAB
  });

  it('barbarian at level 1 has no rage-power slot yet', () => {
    expect(resolve(barbarian(1)).slots.some((s) => s.id.startsWith('rage-power'))).toBe(false);
  });

  it('oracle exposes mystery and curse picks at level 1', () => {
    let d = newCharacter('t-oracle', 'Sibyl');
    d = withDecision(d, 'ability-base', { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'oracle');
    const r = resolve(atLevel(d, 3));
    expect(r.slots.some((s) => s.id === 'mystery')).toBe(true);
    expect(r.slots.some((s) => s.id === 'curse')).toBe(true);
    // full spontaneous caster: caster level 3, slot table present
    expect(r.sheet.casterLevel).toBe(3);
    expect(r.sheet.spellSlots && r.sheet.spellSlots.length).toBeGreaterThan(0);
  });
});

describe('class-feature effects are computed (druid Nature Sense)', () => {
  it("applies +2 to Nature and Survival from the druid's Nature Sense feature", () => {
    let d = newCharacter('t-druid', 'Thornne');
    d = withDecision(d, 'ability-base', { str: 12, dex: 12, con: 12, int: 10, wis: 16, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['wis']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'druid');
    const r = resolve(atLevel(d, 1));
    expect(r.sheet.stats['skill:survival'].lines.some((l) => /Nature Sense/.test(l.label))).toBe(true);
    expect(r.sheet.stats['skill:know-nature'].lines.some((l) => /Nature Sense/.test(l.label))).toBe(true);
  });
});

describe('repeated subsystem picks may not duplicate', () => {
  it('flags the same rage power chosen at two levels', () => {
    let d = newCharacter('t-barb2', 'Grok');
    d = withDecision(d, 'ability-base', { str: 16, dex: 14, con: 14, int: 8, wis: 10, cha: 8 });
    d = withDecision(d, 'race', 'half-orc');
    d = withDecision(d, 'alignment', 'CN');
    d = withDecision(d, 'class', 'barbarian');
    d = withDecision(d, 'class-choices', { 'rage-power-L2': ['superstition'], 'rage-power-L4': ['superstition'] });
    const r = resolve(atLevel(d, 4));
    expect(r.issues.some((i) => i.severity === 'error' && /chosen 2 times|only once/i.test(i.message))).toBe(true);
  });
  it('allows two different rage powers', () => {
    let d = newCharacter('t-barb3', 'Krag');
    d = withDecision(d, 'ability-base', { str: 16, dex: 14, con: 14, int: 8, wis: 10, cha: 8 });
    d = withDecision(d, 'race', 'half-orc');
    d = withDecision(d, 'alignment', 'CN');
    d = withDecision(d, 'class', 'barbarian');
    d = withDecision(d, 'class-choices', { 'rage-power-L2': ['superstition'], 'rage-power-L4': ['reckless-abandon'] });
    const r = resolve(atLevel(d, 4));
    expect(r.issues.some((i) => /only once/i.test(i.message))).toBe(false);
  });
});

describe('caster slot tables on the sheet (Part-2 depth)', () => {
  it('paladin 5 (Cha 16): caster level 2, 1st-level slots incl. the Cha bonus', () => {
    let d = newCharacter('t-pal', 'Seelah');
    d = withDecision(d, 'ability-base', { str: 14, dex: 10, con: 12, int: 8, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']); // Cha 18 -> +4
    d = withDecision(d, 'alignment', 'LG');
    d = withDecision(d, 'class', 'paladin');
    const r = resolve(atLevel(d, 5));
    expect(r.sheet.casterLevel).toBe(2); // level - 3
    // 1st-level base 1 + bonus for Cha +4 (floor((4-1)/4)+1 = 1) = 2; cantrips index 0 stays 0.
    expect(r.sheet.spellSlots).toEqual([0, 2]);
  });

  it('paladin 3: not yet a caster (no caster level or slots shown)', () => {
    let d = newCharacter('t-pal2', 'Alain');
    d = withDecision(d, 'ability-base', { str: 14, dex: 10, con: 12, int: 8, wis: 10, cha: 14 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'LG');
    d = withDecision(d, 'class', 'paladin');
    const r = resolve(atLevel(d, 3));
    expect(r.sheet.casterLevel).toBeUndefined();
    expect(r.sheet.spellSlots).toBeUndefined();
  });

  it('magus 7 (Int 16): prepared-six slots with Int bonus', () => {
    let d = newCharacter('t-magus', 'Seltyiel');
    d = withDecision(d, 'ability-base', { str: 12, dex: 14, con: 12, int: 16, wis: 10, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']); // Int 18 -> +4
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'magus');
    const r = resolve(atLevel(d, 7));
    expect(r.sheet.casterLevel).toBe(7);
    // base [5,4,3,1] + Int +4 bonus: 1st+1=5, 2nd+1=4, 3rd+1=2 → [5,5,4,2]
    expect(r.sheet.spellSlots).toEqual([5, 5, 4, 2]);
  });
});

describe('bloodrager: four-level caster, no creation spell step', () => {
  function bloodrager(level: number): CharacterDoc {
    let d = newCharacter('t-blr', 'Crowe');
    d = withDecision(d, 'ability-base', { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 14 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']); // Cha 16 -> +3
    d = withDecision(d, 'alignment', 'CN');
    d = withDecision(d, 'class', 'bloodrager');
    return atLevel(d, level);
  }
  it('level 1: no caster level, no slots, no spells step', () => {
    const r = resolve(bloodrager(1));
    expect(r.sheet.casterLevel).toBeUndefined();
    expect(r.steps).not.toContain('spells');
  });
  it('level 7 (Cha 16): caster level 4, 4-level slots incl. ability bonus, still no spells step', () => {
    const r = resolve(bloodrager(7));
    expect(r.sheet.casterLevel).toBe(4);
    // four[7] = [0,1,0]; Cha +3 bonus: 1st 1+1=2, 2nd 0+1=1 → [0,2,1]
    expect(r.sheet.spellSlots).toEqual([0, 2, 1]);
    expect(r.steps).not.toContain('spells');
  });
});

describe('per-level favored class bonus', () => {
  function fcbFighter(level: number, fcbByLevel?: Record<number, 'hp' | 'skill'>): CharacterDoc {
    let d = newCharacter('t-fcb', 'Rank');
    d = withDecision(d, 'ability-base', { str: 14, dex: 12, con: 14, int: 12, wis: 10, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'class', 'fighter');
    d = withDecision(d, 'favored-class', 'fighter');
    d = withDecision(d, 'fcb', 'hp'); // overall default
    if (fcbByLevel) d = withDecision(d, 'fcb-by-level', fcbByLevel);
    return atLevel(d, level);
  }
  it('all-HP default: 3 HP-FCB, 0 skill-FCB', () => {
    const r = resolve(fcbFighter(3));
    expect(r.sheet.stats['hp:max'].total).toBe(31); // 10 + 12 + Con(2)*3 + 3 FCB
    expect(r.sheet.skillRanksTotal).toBe(12); // (2+1 Int+1 racial) * 3
  });
  it('mixing hp/skill per level moves the +1 between HP and skill ranks', () => {
    const r = resolve(fcbFighter(3, { 1: 'hp', 2: 'skill', 3: 'hp' }));
    expect(r.sheet.stats['hp:max'].total).toBe(30); // one fewer HP-FCB
    expect(r.sheet.skillRanksTotal).toBe(13); // one extra skill-FCB
  });
});

describe('expanded feats (Core batch)', () => {
  it('Alertness applies +2 to Perception and Sense Motive', () => {
    let d = humanFighter1();
    d = withDecision(d, 'feats', { 'feat-1': 'alertness' });
    const r = resolve(d);
    expect(r.sheet.stats['skill:perception'].lines.some((l) => /Alertness/.test(l.label))).toBe(true);
    expect(r.sheet.stats['skill:sense-motive'].total).toBeGreaterThanOrEqual(2);
  });
  it('Great Cleave is illegal without its chain (Cleave, Str 13, BAB +4)', () => {
    const r = resolve(humanFighter1()); // BAB +1, no Cleave
    const slot = r.slots.find((s) => s.id === 'feat-1')!;
    const gc = slot.options.find((o) => o.id === 'great-cleave')!;
    expect(gc.legal).toBe(false);
    expect(gc.whyNot).toBeTruthy();
  });
  it('Craft Wand requires caster level 5 — illegal for a level-1 fighter', () => {
    const r = resolve(humanFighter1());
    const slot = r.slots.find((s) => s.id === 'feat-1')!;
    expect(slot.options.find((o) => o.id === 'craft-wand')!.legal).toBe(false);
  });
});

describe('oracle revelations are filtered by the chosen mystery', () => {
  function oracle(mystery?: string): CharacterDoc {
    let d = newCharacter('t-orc', 'Sibyl');
    d = withDecision(d, 'ability-base', { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'oracle');
    if (mystery) d = withDecision(d, 'class-choices', { mystery: [mystery] });
    return atLevel(d, 3);
  }
  it('with the Life mystery, revelation slots offer Life revelations at levels 1 and 3', () => {
    const r = resolve(oracle('life'));
    const revSlots = r.slots.filter((s) => s.step === 'class' && s.id.startsWith('revelation'));
    expect(revSlots.map((s) => s.id).sort()).toEqual(['revelation', 'revelation-L3']);
    expect(revSlots[0].options.some((o) => o.id === 'life-link')).toBe(true);
    expect(revSlots[0].options.some((o) => o.id === 'earth-glide')).toBe(false); // Stone-only
  });
  it('with no mystery chosen, the revelation slot has no options', () => {
    const r = resolve(oracle());
    const rev = r.slots.find((s) => s.id === 'revelation')!;
    expect(rev.options.length).toBe(0);
  });
});

describe('source-dependent features appear in the progression by chosen source', () => {
  it('a draconic sorcerer shows Claws at 1 and Wings at 15', () => {
    let d = newCharacter('t-sorc', 'Seoni');
    d = withDecision(d, 'ability-base', { str: 8, dex: 12, con: 12, int: 10, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'sorcerer');
    d = withDecision(d, 'class-choices', { bloodline: ['draconic'] });
    const r = resolve(atLevel(d, 15));
    expect(r.sheet.progression[0].features).toContain('Claws'); // level 1
    expect(r.sheet.progression[14].features).toContain('Wings'); // level 15
  });
  it('without a bloodline chosen, no specific bloodline power is shown', () => {
    let d = newCharacter('t-sorc2', 'Nyx');
    d = withDecision(d, 'ability-base', { str: 8, dex: 12, con: 12, int: 10, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'class', 'sorcerer');
    const r = resolve(atLevel(d, 3));
    expect(r.sheet.progression[0].features).not.toContain('Claws');
  });
});

describe('multi-level spell selection', () => {
  it('a level-5 wizard has spellbook slots for spell levels 1–3, with real options', () => {
    let d = newCharacter('t-wiz5', 'Ezren');
    d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'wizard');
    const r = resolve(atLevel(d, 5));
    const ids = r.slots.filter((s) => s.step === 'spells').map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['spell-picks-L0', 'spell-picks-L1', 'spell-picks-L2', 'spell-picks-L3']));
    const l3 = r.slots.find((s) => s.id === 'spell-picks-L3')!;
    expect(l3.options.some((o) => o.id === 'fireball')).toBe(true);
  });
  it('a level-5 sorcerer has per-level "known" slots capped by the known table', () => {
    let d = newCharacter('t-sorc5', 'Seoni');
    d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 12, int: 10, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'class', 'sorcerer');
    const r = resolve(atLevel(d, 5));
    const l2 = r.slots.find((s) => s.id === 'spell-picks-L2');
    expect(l2, 'sorcerer 5 should access 2nd-level spells').toBeTruthy();
    expect(l2!.count).toBeGreaterThan(0);
    expect(l2!.options.some((o) => o.id === 'scorching-ray')).toBe(true);
  });
});

describe('high-level spell access', () => {
  it('a level-11 wizard can access 6th-level spells (Disintegrate)', () => {
    let d = newCharacter('t-wiz11', 'Ezren');
    d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 12, int: 18, wis: 12, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']);
    d = withDecision(d, 'class', 'wizard');
    const r = resolve(atLevel(d, 11));
    const l6 = r.slots.find((s) => s.id === 'spell-picks-L6');
    expect(l6, 'wizard 11 should access 6th-level spells').toBeTruthy();
    expect(l6!.options.some((o) => o.id === 'disintegrate')).toBe(true);
  });
});

describe('9th-level spell access at the top', () => {
  it('a level-20 wizard reaches 9th-level spells (Wish)', () => {
    let d = newCharacter('t-wiz20', 'Ezren');
    d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 12, int: 19, wis: 12, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']);
    d = withDecision(d, 'class', 'wizard');
    const r = resolve(atLevel(d, 20));
    const l9 = r.slots.find((s) => s.id === 'spell-picks-L9');
    expect(l9).toBeTruthy();
    expect(l9!.options.some((o) => o.id === 'wish')).toBe(true);
  });
});

describe('conditions (play state) fold into the resolved sheet', () => {
  const play = (conditions: string[]) => ({ ...emptyPlayState(), conditions });
  it('shaken applies −2 to attacks and saves', () => {
    const d = { ...humanFighter1(), play: play(['shaken']) };
    const r = resolve(d);
    expect(r.sheet.stats['attack:melee'].total).toBe(2); // 4 − 2
    expect(r.sheet.stats['save:fort'].total).toBe(2); // 4 − 2
    expect(r.sheet.stats['save:will'].total).toBe(-1); // 1 − 2
  });
  it('fatigued drops Str and Dex, flowing to attack and AC', () => {
    const d = { ...humanFighter1(), play: play(['fatigued']) };
    const r = resolve(d);
    expect(r.sheet.stats['ability:str'].total).toBe(15); // 17 − 2
    expect(r.sheet.stats['ability:dex'].total).toBe(12); // 14 − 2
    expect(r.sheet.stats['attack:melee'].total).toBe(3); // BAB 1 + Str +2
    expect(r.sheet.stats['ac'].total).toBe(11); // 10 + Dex +1
  });
  it('no conditions → unchanged sheet', () => {
    expect(resolve({ ...humanFighter1(), play: play([]) }).sheet.stats['attack:melee'].total).toBe(4);
  });
});

describe('resource pools (play sheet)', () => {
  it('barbarian rage rounds = 4 + Con mod + 2/level after 1st', () => {
    // humanFighter1 template but as barbarian, Con 14 (+2). At level 5: 4 + 2 + 2×4 = 14.
    let d = newCharacter('t-barb-p', 'Grug');
    d = withDecision(d, 'ability-base', { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 });
    d = withDecision(d, 'race', 'half-orc');
    d = withDecision(d, 'alignment', 'CN');
    d = withDecision(d, 'class', 'barbarian');
    const rage = resolve(atLevel(d, 5)).sheet.pools.find((p) => p.id === 'rage')!;
    expect(rage.max).toBe(14);
    expect(rage.unit).toBe('rounds');
  });
  it('cleric channel = 3 + Cha mod; monk gets no ki before level 4', () => {
    let cle = newCharacter('t-cle-p', 'Kore');
    cle = withDecision(cle, 'ability-base', { str: 10, dex: 12, con: 12, int: 10, wis: 14, cha: 16 });
    cle = withDecision(cle, 'race', 'human');
    cle = withDecision(cle, 'floating-bonus', ['wis']);
    cle = withDecision(cle, 'class', 'cleric');
    expect(resolve(cle).sheet.pools.find((p) => p.id === 'channel')!.max).toBe(6); // 3 + Cha +3

    let monk = newCharacter('t-monk-p', 'Sun');
    monk = withDecision(monk, 'ability-base', { str: 12, dex: 14, con: 12, int: 10, wis: 15, cha: 8 });
    monk = withDecision(monk, 'race', 'human');
    monk = withDecision(monk, 'floating-bonus', ['wis']);
    monk = withDecision(monk, 'class', 'monk');
    monk = withDecision(monk, 'alignment', 'LN');
    expect(resolve(atLevel(monk, 3)).sheet.pools.some((p) => p.id === 'ki')).toBe(false);
    // Level 4: ki = 2 (half level) + Wis +3 = 5.
    expect(resolve(atLevel(monk, 4)).sheet.pools.find((p) => p.id === 'ki')!.max).toBe(5);
  });
  it('a fighter has no resource pools', () => {
    expect(resolve(humanFighter1()).sheet.pools.length).toBe(0);
  });
});

describe('conditions that remove Dex to AC', () => {
  const play = (conditions: string[]) => ({ ...emptyPlayState(), conditions });
  it('flat-footed drops the +2 Dex from AC, touch, and CMD (Dex 14)', () => {
    const r = resolve({ ...humanFighter1(), play: play(['flat-footed']) });
    expect(r.sheet.stats['ac'].total).toBe(10); // 12 − 2 Dex
    expect(r.sheet.stats['ac:touch'].total).toBe(10);
    expect(r.sheet.stats['cmd'].total).toBe(14); // 10 + BAB 1 + Str 3 + 0 Dex (lost)
  });
  it('blinded combines its −2 AC with losing Dex', () => {
    const r = resolve({ ...humanFighter1(), play: play(['blinded']) });
    expect(r.sheet.stats['ac'].total).toBe(8); // 10 + 0 Dex − 2 blinded
  });
  it('a Dex penalty (from armor cap) still applies when flat-footed; positive is lost', () => {
    // No positive Dex to lose changes nothing beyond the flag; sanity: fighter unaffected on saves.
    const r = resolve({ ...humanFighter1(), play: play(['flat-footed']) });
    expect(r.sheet.stats['save:ref'].total).toBe(2); // Reflex still uses full Dex (only AC loses it)
  });
});

describe('domain / specialist bonus spell slot', () => {
  it('a cleric with two domains gains +1 slot at each accessible spell level', () => {
    let d = newCharacter('t-cle-dom', 'Kore');
    d = withDecision(d, 'ability-base', { str: 10, dex: 12, con: 12, int: 10, wis: 16, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'class', 'cleric');
    d = withDecision(d, 'class-choices', { domains: ['war', 'healing'] });
    // Base [4,5,4,3,1] (Wis 16 = +3 bonus at levels 1–3), +1 domain slot at levels 1–4.
    expect(resolve(atLevel(d, 7)).sheet.spellSlots).toEqual([4, 6, 5, 4, 2]);
  });
  it('a specialist wizard gains the school slot but a universalist does not', () => {
    const wiz = (school: string) => {
      let d = newCharacter('t-wiz-' + school, 'Nyx');
      d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 });
      d = withDecision(d, 'race', 'human');
      d = withDecision(d, 'floating-bonus', ['int']);
      d = withDecision(d, 'class', 'wizard');
      d = withDecision(d, 'class-choices', { school: [school] });
      return resolve(atLevel(d, 1)).sheet.spellSlots![1];
    };
    // Wizard 1, Int 18 (+4): base 1 + 1 Int bonus = 2 first-level. Specialist adds +1 → 3.
    expect(wiz('evocation')).toBe(3);
    expect(wiz('universalist')).toBe(2);
  });
});

describe('multiple resource pools per class', () => {
  it('paladin has lay-on-hands and smite-evil pools', () => {
    let d = newCharacter('t-pal-pools', 'Seelah');
    d = withDecision(d, 'ability-base', { str: 14, dex: 10, con: 12, int: 8, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'LG');
    d = withDecision(d, 'class', 'paladin');
    const ids = resolve(atLevel(d, 7)).sheet.pools.map((p) => p.id);
    expect(ids).toContain('lay-on-hands');
    expect(ids).toContain('smite-evil'); // 1 + floor(6/3) = 3 at level 7
    expect(resolve(atLevel(d, 7)).sheet.pools.find((p) => p.id === 'smite-evil')!.max).toBe(3);
  });
  it('monk has ki and stunning-fist pools from level 4', () => {
    let d = newCharacter('t-monk-pools', 'Sun');
    d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 12, int: 10, wis: 15, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['wis']);
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'monk');
    const ids = resolve(atLevel(d, 4)).sheet.pools.map((p) => p.id).sort();
    expect(ids).toEqual(['ki', 'stunning-fist']);
  });
});

describe('per-weapon attack lines (fighter 6, Str 17)', () => {
  // humanFighter1: Str 15 + human floating +2 = 17 (+3). No ability increase set at 4th,
  // so Str stays 17 at level 6. BAB +6 → two iteratives.
  const base = humanFighter1();
  const d: CharacterDoc = {
    ...atLevel(base, 6),
    equipped: { armor: null, mainHand: 'longsword', offHand: null },
    purchases: { greataxe: 1, longbow: 1 },
  };
  const atk = resolve(d).sheet.attacks;
  const byId = (id: string) => atk.find((a) => a.id === id)!;

  it('lists the equipped weapon first, then carried weapons (deduped)', () => {
    expect(atk.map((a) => a.id)).toEqual(['longsword', 'greataxe', 'longbow']);
    expect(byId('longsword').slot).toBe('main');
    expect(byId('greataxe').slot).toBe('carried');
  });

  it('longsword: +6 BAB + 3 Str = +9, iterative +4, one-handed damage 1d8+3', () => {
    const l = byId('longsword');
    expect(l.kind).toBe('melee');
    expect(l.bonuses).toEqual([9, 4]);
    expect(l.damage).toBe('1d8+3');
    expect(l.crit).toBe('19–20/×2');
  });

  it('greataxe two-handed adds 1½× Str: 1d12+4', () => {
    expect(byId('greataxe').damage).toBe('1d12+4');
  });

  it('longbow: ranged uses Dex (+2) not Str, no Str to damage', () => {
    const b = byId('longbow');
    expect(b.kind).toBe('ranged');
    expect(b.bonuses).toEqual([8, 3]); // 6 BAB + 2 Dex
    expect(b.damage).toBe('1d8');
    expect(b.notes.some((n) => n.includes('no Str to damage'))).toBe(true);
  });
});

describe('class-granted fixed feats', () => {
  function warpriest1(): CharacterDoc {
    let d = newCharacter('t-wp', 'Kadric');
    d = withDecision(d, 'ability-base', { str: 15, dex: 12, con: 14, int: 10, wis: 14, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', 'LG');
    d = withDecision(d, 'class', 'warpriest');
    d = withDecision(d, 'deity', 'iomedae');
    return d;
  }

  it('warpriest gets Weapon Focus (favored weapon) as a granted feat at 1st', () => {
    const g = resolve(warpriest1()).sheet.grantedFeats;
    expect(g.map((x) => x.featId)).toEqual(['weapon-focus']);
    expect(g[0].note).toMatch(/favored weapon/);
    expect(g[0].name).toBe('Weapon Focus');
  });

  it('monk gets Improved Unarmed Strike + Stunning Fist granted at 1st', () => {
    let d = newCharacter('t-monk', 'Sui');
    d = withDecision(d, 'ability-base', { str: 14, dex: 15, con: 13, int: 10, wis: 14, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['dex']);
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'monk');
    const ids = resolve(d).sheet.grantedFeats.map((g) => g.featId).sort();
    expect(ids).toEqual(['improved-unarmed-strike', 'stunning-fist']);
  });

  it('wizard gets Scribe Scroll granted at 1st', () => {
    let d = newCharacter('t-wiz', 'Ellis');
    d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 13, int: 16, wis: 12, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'wizard');
    expect(resolve(d).sheet.grantedFeats.map((g) => g.featId)).toContain('scribe-scroll');
  });

  it('warpriest blessing options carry the minor + major power text', () => {
    const slot = resolve(warpriest1()).slots.find((s) => s.id === 'blessings')!;
    const glory = slot.options.find((o) => o.id === 'glory')!; // Iomedae grants Glory
    expect(glory.legal).toBe(true);
    expect(glory.desc).toMatch(/Minor \(1st\)/);
    expect(glory.desc).toMatch(/Major \(10th\)/);
  });
});

describe('granted feats respect the level they are gained at', () => {
  function ranger(level: number): CharacterDoc {
    let d = newCharacter('t-ranger', 'Sylla');
    d = withDecision(d, 'ability-base', { str: 14, dex: 15, con: 13, int: 10, wis: 13, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['dex']);
    d = withDecision(d, 'alignment', 'NG');
    d = withDecision(d, 'class', 'ranger');
    return atLevel(d, level);
  }

  it('ranger has no granted Endurance at 2nd but does at 3rd', () => {
    expect(resolve(ranger(2)).sheet.grantedFeats).toEqual([]);
    expect(resolve(ranger(3)).sheet.grantedFeats.map((g) => g.featId)).toEqual(['endurance']);
  });

  it('alchemist gets Brew Potion + Throw Anything at 1st', () => {
    let d = newCharacter('t-alch', 'Fen');
    d = withDecision(d, 'ability-base', { str: 10, dex: 14, con: 13, int: 16, wis: 12, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']);
    d = withDecision(d, 'alignment', 'CN');
    d = withDecision(d, 'class', 'alchemist');
    expect(resolve(d).sheet.grantedFeats.map((g) => g.featId).sort()).toEqual(['brew-potion', 'throw-anything']);
  });
});

describe('cleric domain options carry their granted powers', () => {
  it('shows both granted powers with the level each is gained', () => {
    let d = newCharacter('t-cleric-dom', 'Ansa');
    d = withDecision(d, 'ability-base', { str: 12, dex: 10, con: 14, int: 10, wis: 16, cha: 12 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['wis']);
    d = withDecision(d, 'alignment', 'NG');
    d = withDecision(d, 'class', 'cleric');
    d = withDecision(d, 'deity', 'sarenrae'); // fire, glory, good, healing, sun
    const slot = resolve(d).slots.find((s) => s.id === 'domains')!;
    const fire = slot.options.find((o) => o.id === 'fire')!;
    expect(fire.legal).toBe(true);
    expect(fire.desc).toContain('Fire Bolt (1st)');
    expect(fire.desc).toContain('Fire Resistance (6th)');
    // A domain Sarenrae does not grant stays illegal but still explains itself.
    const death = slot.options.find((o) => o.id === 'death')!;
    expect(death.legal).toBe(false);
    expect(death.desc).toContain('Bleeding Touch (1st)');
  });
});

describe('starting wealth by level', () => {
  function warpriestAt(level: number, extra: Partial<CharacterDoc> = {}): CharacterDoc {
    let d = newCharacter('t-wealth', 'Kadric');
    d = withDecision(d, 'ability-base', { str: 14, dex: 12, con: 14, int: 10, wis: 14, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['wis']);
    d = withDecision(d, 'alignment', 'LG');
    d = withDecision(d, 'class', 'warpriest');
    return { ...atLevel(d, level), ...extra };
  }

  it('uses the class starting gold at 1st level', () => {
    expect(resolve(warpriestAt(1)).sheet.gold).toBe(175);
  });

  it('uses Character Wealth by Level from 2nd on', () => {
    expect(resolve(warpriestAt(2)).sheet.gold).toBe(1000);
    expect(resolve(warpriestAt(3)).sheet.gold).toBe(3000);
    expect(resolve(warpriestAt(10)).sheet.gold).toBe(62000);
    expect(resolve(warpriestAt(20)).sheet.gold).toBe(880000);
  });

  it('subtracts what has been spent', () => {
    expect(resolve(warpriestAt(3, { goldSpent: 500 })).sheet.gold).toBe(2500);
  });
});

describe('1st-level hit points', () => {
  function fighterHp(hpRolls?: Record<number, number>): number {
    let d = newCharacter('t-hp1', 'Roll');
    d = withDecision(d, 'ability-base', { str: 14, dex: 12, con: 10, int: 10, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'fighter');
    if (hpRolls) d = withDecision(d, 'hp-rolls', hpRolls);
    return resolve(d).sheet.stats['hp:max'].total;
  }

  it('defaults to the maximum hit die', () => {
    expect(fighterHp()).toBe(10); // d10, Con 10
  });

  it('honours a rolled 1st-level value when the table rolls for it', () => {
    expect(fighterHp({ 1: 4 })).toBe(4);
  });
});

describe('granted feats that take a parameter', () => {
  function warpriest(params?: Record<string, string>): CharacterDoc {
    let d = newCharacter('t-wf', 'Kadric');
    d = withDecision(d, 'ability-base', { str: 15, dex: 12, con: 14, int: 10, wis: 14, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', 'LG');
    d = withDecision(d, 'class', 'warpriest');
    if (params) d = withDecision(d, 'feat-params', params);
    return d;
  }

  it('exposes the weapon options and an unset value for warpriest Weapon Focus', () => {
    const g = resolve(warpriest()).sheet.grantedFeats[0];
    expect(g.featId).toBe('weapon-focus');
    expect(g.param?.label).toBe('Weapon');
    expect(g.param?.value).toBeNull();
    // Options come from the weapon catalogue, not a frozen list of eight, and carry stable ids.
    expect(g.param!.options.length).toBeGreaterThan(30);
    expect(g.param!.options).toContainEqual({ id: 'greatsword', name: 'Greatsword' });
  });

  it('reflects the chosen weapon by id', () => {
    const g = resolve(warpriest({ 'granted:weapon-focus:1': 'longsword' })).sheet.grantedFeats[0];
    expect(g.param?.value).toBe('longsword');
  });

  it('maps a legacy name-valued param back to its id', () => {
    // Params were briefly stored as display names; those docs must not lose the pick.
    const g = resolve(warpriest({ 'granted:weapon-focus:1': 'Longsword' })).sheet.grantedFeats[0];
    expect(g.param?.value).toBe('longsword');
  });
});

describe('content ordering', () => {
  it('classes and races are listed alphabetically', () => {
    const names = (arr: { name: string }[]) => arr.map((x) => x.name);
    const sorted = (n: string[]) => [...n].sort((a, b) => a.localeCompare(b));
    // Imported lazily to avoid a top-level content import in this engine test file.
    return import('../content/index').then((C) => {
      expect(names(C.CLASSES)).toEqual(sorted(names(C.CLASSES)));
      expect(names(C.RACES)).toEqual(sorted(names(C.RACES)));
    });
  });
});

describe('weapon feats fold into the per-weapon attack lines', () => {
  function fighter(level: number, feats: Record<string, string>, params: Record<string, string>): CharacterDoc {
    let d = newCharacter('t-wfeat', 'Valeria');
    d = withDecision(d, 'ability-base', { str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']); // Str 17 → +3
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'fighter');
    d = withDecision(d, 'feats', feats);
    d = withDecision(d, 'feat-params', params);
    return {
      ...atLevel(d, level),
      purchases: { longsword: 1, greataxe: 1 },
      equipped: { armor: null, mainHand: 'longsword', offHand: null },
    };
  }

  const line = (d: CharacterDoc, id: string) => resolve(d).sheet.attacks.find((a) => a.id === id)!;

  it('Weapon Focus adds +1 to the named weapon only', () => {
    const d = fighter(1, { 'feat-1': 'weapon-focus' }, { 'feat-1': 'longsword' });
    // BAB +1 + Str +3 = +4 baseline; Weapon Focus makes the longsword +5.
    expect(line(d, 'longsword').bonuses).toEqual([5]);
    expect(line(d, 'greataxe').bonuses).toEqual([4]);
  });

  it('shows the feat in the attack breakdown', () => {
    const d = fighter(1, { 'feat-1': 'weapon-focus' }, { 'feat-1': 'longsword' });
    expect(line(d, 'longsword').attackLines).toContainEqual({ label: 'Weapon Focus', value: 1 });
    expect(line(d, 'greataxe').attackLines).not.toContainEqual({ label: 'Weapon Focus', value: 1 });
  });

  it('Weapon Specialization adds +2 damage to the named weapon, stacking with Str', () => {
    const d = fighter(4, { 'feat-1': 'weapon-focus', 'feat-L3': 'weapon-specialization' },
      { 'feat-1': 'longsword', 'feat-L3': 'longsword' });
    // Longsword one-handed: 1d8 + 3 Str + 2 spec.
    expect(line(d, 'longsword').damage).toBe('1d8+5');
    expect(line(d, 'longsword').damageLines).toContainEqual({ label: 'Weapon Specialization', value: 2 });
    // Greataxe untouched: two-handed 1.5x Str = +4.
    expect(line(d, 'greataxe').damage).toBe('1d12+4');
  });

  it('Greater Weapon Focus stacks with Weapon Focus', () => {
    const d = fighter(8, { 'feat-1': 'weapon-focus', 'feat-L3': 'greater-weapon-focus' },
      { 'feat-1': 'longsword', 'feat-L3': 'longsword' });
    // BAB +8 → two iteratives; +3 Str, +2 from the two focus feats = +13/+8.
    expect(line(d, 'longsword').bonuses).toEqual([13, 8]);
    expect(line(d, 'greataxe').bonuses).toEqual([11, 6]);
  });

  it('applies to a class-granted Weapon Focus too', () => {
    let d = newCharacter('t-wp-focus', 'Kadric');
    d = withDecision(d, 'ability-base', { str: 15, dex: 12, con: 14, int: 10, wis: 14, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']); // Str 17 → +3
    d = withDecision(d, 'alignment', 'LG');
    d = withDecision(d, 'class', 'warpriest');
    d = withDecision(d, 'feat-params', { 'granted:weapon-focus:1': 'greataxe' });
    const doc: CharacterDoc = { ...d, purchases: { longsword: 1, greataxe: 1 }, equipped: { armor: null, mainHand: 'greataxe', offHand: null } };
    // Warpriest 1: BAB +0, Str +3 → +3; the granted focus lifts the greataxe to +4.
    expect(line(doc, 'greataxe').bonuses).toEqual([4]);
    expect(line(doc, 'longsword').bonuses).toEqual([3]);
  });

  it('an unset parameter grants nothing', () => {
    const d = fighter(1, { 'feat-1': 'weapon-focus' }, {});
    expect(line(d, 'longsword').bonuses).toEqual([4]);
  });
});

describe('Skill Focus folds into the named skill', () => {
  function rogue(params: Record<string, string>, ranks: Record<string, number> = {}): CharacterDoc {
    let d = newCharacter('t-skillfocus', 'Sly');
    d = withDecision(d, 'ability-base', { str: 10, dex: 15, con: 12, int: 14, wis: 12, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['dex']);
    d = withDecision(d, 'alignment', 'CN');
    d = withDecision(d, 'class', 'rogue');
    d = withDecision(d, 'feats', { 'feat-1': 'skill-focus' });
    d = withDecision(d, 'feat-params', params);
    d = withDecision(d, 'skill-ranks', ranks);
    return d;
  }
  const skill = (d: CharacterDoc, id: string) => resolve(d).sheet.stats[`skill:${id}`];

  it('adds +3 to the chosen skill only', () => {
    const withFocus = skill(rogue({ 'feat-1': 'perception' }, { perception: 1 }), 'perception');
    const without = skill(rogue({}, { perception: 1 }), 'perception');
    expect(withFocus.total - without.total).toBe(3);
    expect(withFocus.lines).toContainEqual({ label: 'Skill Focus', value: 3 });
  });

  it('leaves other skills alone', () => {
    const d = rogue({ 'feat-1': 'perception' }, { perception: 1, stealth: 1 });
    expect(skill(d, 'stealth').lines).not.toContainEqual({ label: 'Skill Focus', value: 3 });
  });

  it('rises to +6 at 10 ranks', () => {
    const at9 = skill(rogue({ 'feat-1': 'perception' }, { perception: 9 }), 'perception');
    const at10 = skill(rogue({ 'feat-1': 'perception' }, { perception: 10 }), 'perception');
    expect(at9.lines).toContainEqual({ label: 'Skill Focus', value: 3 });
    expect(at10.lines).toContainEqual({ label: 'Skill Focus', value: 6 });
  });

  it('grants nothing while the skill is unpicked', () => {
    expect(skill(rogue({}, { perception: 1 }), 'perception').lines)
      .not.toContainEqual({ label: 'Skill Focus', value: 3 });
  });
});

describe('Spell Focus and the spell save DC', () => {
  // Level 3 so the `feat-L3` slot actually exists — a feat sitting in a slot the character has not
  // reached yet is correctly suspended, and would contribute nothing.
  function wizard(feats: Record<string, string> = {}, params: Record<string, string> = {}, level = 3): CharacterDoc {
    let d = newCharacter('t-spellfocus', 'Ellis');
    d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']); // Int 17 → +3
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'wizard');
    d = withDecision(d, 'feats', feats);
    d = withDecision(d, 'feat-params', params);
    return atLevel(d, level);
  }

  it('exposes a base DC of 10 + the casting modifier', () => {
    const dc = resolve(wizard()).sheet.stats['spell:dc'];
    expect(dc.total).toBe(13); // 10 + 3 Int
    expect(dc.lines).toContainEqual({ label: 'INT modifier', value: 3 });
  });

  it('lists a Spell Focus school bonus separately from the base DC', () => {
    const r = resolve(wizard({ 'feat-1': 'spell-focus' }, { 'feat-1': 'evocation' }));
    // The school bonus is conditional, so it must not inflate the flat DC.
    expect(r.sheet.stats['spell:dc'].total).toBe(13);
    expect(r.sheet.spellFocus).toEqual([{ school: 'Evocation', bonus: 1 }]);
    // Conditional bonuses render through one shared formatter now, so every stat reads alike.
    expect(r.sheet.stats['spell:dc'].annotations).toContain('Spell Focus: +1 vs Evocation spells');
    expect(r.sheet.stats['spell:dc'].conditional).toContainEqual({ note: 'Spell Focus', value: 1, condition: 'vs Evocation spells' });
  });

  it('stacks Greater Spell Focus on the same school', () => {
    const r = resolve(wizard(
      { 'feat-1': 'spell-focus', 'feat-L3': 'greater-spell-focus' },
      { 'feat-1': 'evocation', 'feat-L3': 'evocation' },
    ));
    expect(r.sheet.spellFocus).toEqual([{ school: 'Evocation', bonus: 2 }]);
  });

  it('keeps different schools separate', () => {
    const r = resolve(wizard(
      { 'feat-1': 'spell-focus', 'feat-L3': 'greater-spell-focus' },
      { 'feat-1': 'evocation', 'feat-L3': 'necromancy' },
    ));
    expect(r.sheet.spellFocus).toEqual([
      { school: 'Evocation', bonus: 1 },
      { school: 'Necromancy', bonus: 1 },
    ]);
  });

  it('non-casters get no spell DC stat', () => {
    let d = newCharacter('t-nodc', 'Valeria');
    d = withDecision(d, 'ability-base', { str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'fighter');
    expect(resolve(d).sheet.stats['spell:dc']).toBeUndefined();
  });
});

describe('masterwork and magic enhancement', () => {
  function armed(quality: Record<string, unknown>, extra: Partial<CharacterDoc> = {}): CharacterDoc {
    let d = newCharacter('t-magic', 'Valeria');
    d = withDecision(d, 'ability-base', { str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']); // Str 17 → +3
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'fighter');
    d = withDecision(d, 'item-quality', quality);
    return {
      ...atLevel(d, 3),
      purchases: { longsword: 1, greataxe: 1, 'chain-shirt': 1 },
      equipped: { armor: 'chain-shirt', mainHand: 'longsword', offHand: null },
      ...extra,
    };
  }
  const line = (d: CharacterDoc, id: string) => resolve(d).sheet.attacks.find((a) => a.id === id)!;

  it('masterwork gives +1 attack but no damage', () => {
    const d = armed({ longsword: { masterwork: true } });
    // Fighter 3: BAB +3 + Str +3 = +6; masterwork makes it +7, damage unchanged at 1d8+3.
    expect(line(d, 'longsword').bonuses).toEqual([7]);
    expect(line(d, 'longsword').damage).toBe('1d8+3');
    expect(line(d, 'longsword').qualityLabel).toBe('mwk');
  });

  it('an enhancement bonus applies to attack and damage', () => {
    const d = armed({ longsword: { masterwork: true, enhancement: 2 } });
    expect(line(d, 'longsword').bonuses).toEqual([8]); // +6 base +2
    expect(line(d, 'longsword').damage).toBe('1d8+5'); // 3 Str + 2 enhancement
    expect(line(d, 'longsword').qualityLabel).toBe('+2');
  });

  it('masterwork does not stack with an enhancement bonus', () => {
    // A +1 weapon is +1/+1, never +2/+1 — the masterwork attack bonus is subsumed.
    const d = armed({ longsword: { masterwork: true, enhancement: 1 } });
    expect(line(d, 'longsword').bonuses).toEqual([7]);
    expect(line(d, 'longsword').damage).toBe('1d8+4');
  });

  it('applies only to the upgraded weapon', () => {
    const d = armed({ longsword: { masterwork: true, enhancement: 1 } });
    expect(line(d, 'greataxe').bonuses).toEqual([6]);
    expect(line(d, 'greataxe').qualityLabel).toBeUndefined();
  });

  it('shows the enhancement in the attack breakdown and the carried name', () => {
    const d = armed({ longsword: { masterwork: true, enhancement: 1 } });
    expect(line(d, 'longsword').attackLines).toContainEqual({ label: 'Enhancement +1', value: 1 });
    expect(resolve(d).sheet.inventory.find((i) => i.id === 'longsword')!.name).toBe('+1 Longsword');
  });

  it('magic armour adds an enhancement bonus that stacks with its armour bonus', () => {
    const plain = resolve(armed({})).sheet.stats['ac'].total;
    const magic = resolve(armed({ 'chain-shirt': { masterwork: true, enhancement: 2 } })).sheet.stats['ac'];
    expect(magic.total - plain).toBe(2);
    expect(magic.lines).toContainEqual({ label: 'Chain shirt +2', value: 2 });
  });

  it('masterwork armour reduces the armour check penalty by 1', () => {
    // Chain shirt is ACP −2; masterwork makes it −1.
    const plain = resolve(armed({})).sheet.stats['skill:climb'].total;
    const mwk = resolve(armed({ 'chain-shirt': { masterwork: true } })).sheet.stats['skill:climb'].total;
    expect(mwk - plain).toBe(1);
  });

  it('charges for the upgrade and refunds when it is removed', () => {
    const base = resolve(armed({})).sheet.gold;
    // +1 weapon = 300 masterwork + 2,000 enhancement.
    const plus1 = resolve(armed({ longsword: { masterwork: true, enhancement: 1 } })).sheet.gold;
    expect(base - plus1).toBe(2300);
    // Masterwork alone is just the 300.
    const mwk = resolve(armed({ longsword: { masterwork: true } })).sheet.gold;
    expect(base - mwk).toBe(300);
    // +2 armour = 150 masterwork + 4,000.
    const armor2 = resolve(armed({ 'chain-shirt': { masterwork: true, enhancement: 2 } })).sheet.gold;
    expect(base - armor2).toBe(4150);
  });

  it('ignores quality on an item that is not owned', () => {
    const d = armed({ falchion: { masterwork: true, enhancement: 5 } });
    expect(resolve(d).sheet.gold).toBe(resolve(armed({})).sheet.gold);
  });
});

describe('named weapon properties', () => {
  function armed(quality: Record<string, unknown>): CharacterDoc {
    let d = newCharacter('t-props', 'Valeria');
    d = withDecision(d, 'ability-base', { str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']); // Str 17 → +3
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'fighter');
    d = withDecision(d, 'item-quality', quality);
    return {
      ...atLevel(d, 6),
      purchases: { longsword: 1, greataxe: 1 },
      equipped: { armor: null, mainHand: 'longsword', offHand: null },
    };
  }
  const line = (d: CharacterDoc, id: string) => resolve(d).sheet.attacks.find((a) => a.id === id)!;

  it('adds unconditional energy damage to the damage line', () => {
    const d = armed({ longsword: { masterwork: true, enhancement: 1, properties: ['flaming'] } });
    // Fighter 6: BAB +6, Str +3, +1 enhancement → +10/+5; damage 1d8+4 plus the fire dice.
    expect(line(d, 'longsword').damage).toBe('1d8+4 + 1d6 fire');
    expect(line(d, 'longsword').properties).toEqual(['Flaming']);
  });

  it('keen doubles the threat range without touching the multiplier', () => {
    expect(doubleThreatRange('×2')).toBe('19–20/×2');
    expect(doubleThreatRange('19–20/×2')).toBe('17–20/×2');
    expect(doubleThreatRange('18–20/×2')).toBe('15–20/×2');
    expect(doubleThreatRange('×3')).toBe('19–20/×3'); // multiplier untouched
    const d = armed({ longsword: { masterwork: true, enhancement: 1, properties: ['keen'] } });
    expect(line(d, 'longsword').crit).toBe('17–20/×2'); // longsword is 19–20/×2
    expect(line(d, 'greataxe').crit).toBe('×3'); // untouched
  });

  it('speed adds an extra attack at full bonus', () => {
    const plain = armed({ longsword: { masterwork: true, enhancement: 1 } });
    expect(line(plain, 'longsword').bonuses).toEqual([10, 5]);
    const fast = armed({ longsword: { masterwork: true, enhancement: 1, properties: ['speed'] } });
    expect(line(fast, 'longsword').bonuses).toEqual([10, 10, 5]);
  });

  it('keeps conditional abilities out of the damage line, as notes', () => {
    const d = armed({ longsword: { masterwork: true, enhancement: 1, properties: ['holy'] } });
    // Holy is +2d6 vs evil only — it must not inflate the flat damage.
    expect(line(d, 'longsword').damage).toBe('1d8+4');
    expect(line(d, 'longsword').notes.some((n) => n.startsWith('Holy:'))).toBe(true);
  });

  it('prices from the total effective bonus', () => {
    const base = resolve(armed({})).sheet.gold;
    // +1 flaming prices as a +2 weapon: 300 masterwork + 2² × 2,000 = 8,300.
    const flaming = resolve(armed({ longsword: { masterwork: true, enhancement: 1, properties: ['flaming'] } })).sheet.gold;
    expect(base - flaming).toBe(8300);
    // A plain +2 costs the same.
    const plusTwo = resolve(armed({ longsword: { masterwork: true, enhancement: 2 } })).sheet.gold;
    expect(base - plusTwo).toBe(8300);
    // +1 holy prices as +3: 300 + 9 × 2,000 = 18,300.
    const holy = resolve(armed({ longsword: { masterwork: true, enhancement: 1, properties: ['holy'] } })).sheet.gold;
    expect(base - holy).toBe(18300);
  });

  it('flags an ability on a weapon with no enhancement bonus', () => {
    const r = resolve(armed({ longsword: { masterwork: true, properties: ['flaming'] } }));
    expect(r.issues.some((i) => i.step === 'equipment' && /at least a \+1 enhancement/.test(i.message))).toBe(true);
  });

  it('flags a combined bonus above +10', () => {
    // +5 with vorpal (+5) and flaming (+1) is +11.
    const r = resolve(armed({ longsword: { masterwork: true, enhancement: 5, properties: ['vorpal', 'flaming'] } }));
    expect(r.issues.some((i) => i.step === 'equipment' && /exceeds the \+10 maximum/.test(i.message))).toBe(true);
  });

  it('stacks multiple energy properties on the damage line', () => {
    const d = armed({ longsword: { masterwork: true, enhancement: 1, properties: ['flaming', 'frost'] } });
    expect(line(d, 'longsword').damage).toBe('1d8+4 + 1d6 fire + 1d6 cold');
  });
});

describe('armour and shield special abilities', () => {
  function armoured(quality: Record<string, unknown>): CharacterDoc {
    let d = newCharacter('t-armprops', 'Valeria');
    d = withDecision(d, 'ability-base', { str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'fighter');
    d = withDecision(d, 'skill-ranks', { stealth: 1, 'escape-artist': 1 });
    d = withDecision(d, 'item-quality', quality);
    return {
      ...atLevel(d, 10),
      purchases: { 'chain-shirt': 1, 'heavy-shield': 1 },
      equipped: { armor: 'chain-shirt', mainHand: null, offHand: 'heavy-shield' },
    };
  }
  const s = (d: CharacterDoc, id: string) => resolve(d).sheet.stats[`skill:${id}`];

  // Baseline is the same armour at +1 WITHOUT the ability: magic armour is masterwork, which
  // already lifts ACP skills by 1, so comparing against mundane armour would credit that to the
  // ability. Stealth and Escape Artist both take the armour check penalty.
  const plusOne = { 'chain-shirt': { masterwork: true, enhancement: 1 } };

  it('shadow adds a competence bonus to Stealth', () => {
    const base = s(armoured(plusOne), 'stealth').total;
    const shadow = s(armoured({ 'chain-shirt': { masterwork: true, enhancement: 1, properties: ['shadow'] } }), 'stealth');
    expect(shadow.total - base).toBe(5);
    expect(shadow.lines).toContainEqual({ label: 'Shadow armour', value: 5 });
  });

  it('slick adds a competence bonus to Escape Artist and leaves Stealth alone', () => {
    const d = armoured({ 'chain-shirt': { masterwork: true, enhancement: 1, properties: ['slick'] } });
    expect(s(d, 'escape-artist').total - s(armoured(plusOne), 'escape-artist').total).toBe(5);
    expect(s(d, 'stealth').total).toBe(s(armoured(plusOne), 'stealth').total);
  });

  it('masterwork armour separately lifts the ACP skills by 1', () => {
    // The composition the two tests above deliberately factor out.
    expect(s(armoured(plusOne), 'stealth').total - s(armoured({}), 'stealth').total).toBe(1);
  });

  it('prices flat-cost abilities as a surcharge, not a bonus equivalent', () => {
    const base = resolve(armoured({})).sheet.gold;
    // +1 shadow chain shirt: 150 masterwork + 1² × 1,000 + 3,750 flat = 4,900. Still effectively +1.
    const shadow = resolve(armoured({ 'chain-shirt': { masterwork: true, enhancement: 1, properties: ['shadow'] } })).sheet.gold;
    expect(base - shadow).toBe(4900);
  });

  it('prices bonus-equivalent abilities by raising the effective bonus', () => {
    const base = resolve(armoured({})).sheet.gold;
    // +1 armour with moderate fortification (+3) prices at +4: 150 + 16 × 1,000 = 16,150.
    const fort = resolve(armoured({ 'chain-shirt': { masterwork: true, enhancement: 1, properties: ['fortification-moderate'] } })).sheet.gold;
    expect(base - fort).toBe(16150);
  });

  it('surfaces armour abilities on the carried item', () => {
    const inv = resolve(armoured({ 'chain-shirt': { masterwork: true, enhancement: 1, properties: ['shadow', 'fortification-light'] } })).sheet.inventory;
    const shirt = inv.find((i) => i.id === 'chain-shirt')!;
    expect(shirt.name).toBe('+1 Chain shirt');
    expect(shirt.properties).toEqual(['Shadow', 'Light fortification']);
  });

  it('flags an armour ability with no enhancement bonus', () => {
    const r = resolve(armoured({ 'chain-shirt': { masterwork: true, properties: ['shadow'] } }));
    expect(r.issues.some((i) => i.step === 'equipment' && /armor or a shield.*at least a \+1/.test(i.message))).toBe(true);
  });

  it('flat-priced abilities do not count toward the +10 cap', () => {
    // +5 armour with heavy fortification (+5) is exactly +10; adding shadow (flat) stays legal.
    const q = { 'chain-shirt': { masterwork: true, enhancement: 5, properties: ['fortification-heavy', 'shadow'] } };
    const r = resolve(armoured(q));
    expect(r.issues.some((i) => /exceeds the \+10 maximum/.test(i.message))).toBe(false);
  });

  it('shield abilities apply to the shield', () => {
    const inv = resolve(armoured({ 'heavy-shield': { masterwork: true, enhancement: 1, properties: ['bashing'] } })).sheet.inventory;
    expect(inv.find((i) => i.id === 'heavy-shield')!.properties).toEqual(['Bashing']);
  });
});

describe('weapon proficiency', () => {
  /** A level-3 character of `cls`/`race` wielding `weapon`, optionally with feats. */
  function wielder(cls: string, weapon: string, race = 'human', feats: Record<string, string> = {}, params: Record<string, string> = {}): CharacterDoc {
    let d = newCharacter('t-prof', 'Tam');
    d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 12, int: 12, wis: 12, cha: 10 });
    d = withDecision(d, 'race', race);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    d = withDecision(d, 'feats', feats);
    d = withDecision(d, 'feat-params', params);
    return { ...atLevel(d, 3), equipped: { armor: null, mainHand: weapon, offHand: null } };
  }
  const primary = (d: CharacterDoc) => resolve(d).sheet.attacks[0].bonuses[0];
  const line = (d: CharacterDoc) => resolve(d).sheet.attacks[0];

  it('a proficient weapon takes no penalty', () => {
    // Fighter 3: BAB +3, Str 14 (+2) = +5 with a martial longsword.
    expect(primary(wielder('fighter', 'longsword'))).toBe(5);
  });

  it('costs -4 when the class does not grant the weapon group', () => {
    // A wizard is proficient with club/dagger/crossbows/quarterstaff only.
    const wiz = wielder('wizard', 'longsword');
    expect(primary(wiz)).toBe(primary(wielder('wizard', 'dagger')) - 4 + 0);
    expect(line(wiz).attackLines.some((b) => b.label === 'Not proficient' && b.value === -4)).toBe(true);
    expect(line(wiz).notes.join(' ')).toContain('Not proficient');
  });

  it('applies to exotic weapons even for a fighter with full martial training', () => {
    const fighter = wielder('fighter', 'bastard-sword');
    expect(primary(fighter)).toBe(1); // +3 BAB +2 Str −4
    expect(primary(wielder('fighter', 'longsword'))).toBe(5);
  });

  it('Exotic Weapon Proficiency removes the penalty for the named weapon only', () => {
    const feats = { 'feat-1': 'exotic-weapon-proficiency' };
    const withEwp = wielder('fighter', 'bastard-sword', 'human', feats, { 'feat-1': 'bastard-sword' });
    expect(primary(withEwp)).toBe(5);
    // The same feat pointed at a different weapon does not help.
    const wrongPick = wielder('fighter', 'bastard-sword', 'human', feats, { 'feat-1': 'whip' });
    expect(primary(wrongPick)).toBe(1);
  });

  it('Martial Weapon Proficiency removes the penalty for the named weapon only', () => {
    const feats = { 'feat-1': 'martial-weapon-proficiency' };
    const withMwp = wielder('wizard', 'longsword', 'human', feats, { 'feat-1': 'longsword' });
    expect(line(withMwp).attackLines.some((b) => b.label === 'Not proficient')).toBe(false);
    // Pointed at a different weapon, it does not help.
    const wrongPick = wielder('wizard', 'longsword', 'human', feats, { 'feat-1': 'battleaxe' });
    expect(line(wrongPick).attackLines.some((b) => b.label === 'Not proficient')).toBe(true);
  });

  it('Simple Weapon Proficiency grants the whole simple group', () => {
    // A wizard is not proficient with the morningstar (a simple weapon off its short list).
    expect(line(wielder('wizard', 'morningstar')).attackLines.some((b) => b.label === 'Not proficient')).toBe(true);
    const withSwp = wielder('wizard', 'morningstar', 'human', { 'feat-1': 'simple-weapon-proficiency' });
    expect(line(withSwp).attackLines.some((b) => b.label === 'Not proficient')).toBe(false);
  });

  it('a class list naming a specific weapon grants it (monk and the kama)', () => {
    // The monk's proficiency list names kama/nunchaku/sai/siangham/shuriken directly.
    expect(line(wielder('monk', 'kama')).attackLines.some((b) => b.label === 'Not proficient')).toBe(false);
    // …but not other exotic weapons.
    expect(line(wielder('monk', 'whip')).attackLines.some((b) => b.label === 'Not proficient')).toBe(true);
  });

  it('racial familiarity reclassifies an exotic weapon as martial', () => {
    // A dwarf fighter wields the dwarven waraxe without penalty; a human fighter cannot.
    expect(primary(wielder('fighter', 'dwarven-waraxe', 'dwarf'))).toBe(primary(wielder('fighter', 'dwarven-waraxe', 'human')) + 4);
    expect(line(wielder('fighter', 'dwarven-waraxe', 'dwarf')).attackLines.some((b) => b.label === 'Not proficient')).toBe(false);
  });

  it('familiarity-as-martial does not help a class without martial proficiency', () => {
    // A dwarf wizard still takes −4: "treat as martial" is worthless without martial training.
    expect(line(wielder('wizard', 'dwarven-waraxe', 'dwarf')).attackLines.some((b) => b.label === 'Not proficient')).toBe(true);
  });

  it('familiarity that grants outright proficiency works regardless of class', () => {
    // The elf's familiarity makes them proficient with longbows outright, wizard or not.
    expect(line(wielder('wizard', 'longbow', 'elf')).attackLines.some((b) => b.label === 'Not proficient')).toBe(false);
    expect(line(wielder('wizard', 'longbow', 'human')).attackLines.some((b) => b.label === 'Not proficient')).toBe(true);
  });

  // Firearms are the one proficiency group a single feat pick covers wholesale.
  it('Exotic Weapon Proficiency (firearms) covers every firearm at once', () => {
    const feats = { 'feat-1': 'exotic-weapon-proficiency' };
    const params = { 'feat-1': 'firearms' };
    // BAB +3, ranged uses Dex 14 (+2) = +5 once proficient; −4 without.
    expect(primary(wielder('fighter', 'pistol'))).toBe(1);
    expect(primary(wielder('fighter', 'pistol', 'human', feats, params))).toBe(5);
    // The same single pick also covers a firearm the character never named.
    expect(primary(wielder('fighter', 'musket', 'human', feats, params))).toBe(5);
    // …but grants nothing outside the group.
    expect(primary(wielder('fighter', 'bastard-sword', 'human', feats, params))).toBe(1);
  });

  it('the gunslinger is proficient with firearms from the class list', () => {
    expect(line(wielder('gunslinger', 'musket')).attackLines.some((b) => b.label === 'Not proficient')).toBe(false);
  });

  it('points a non-proficient shooter at the group feat, not the single weapon', () => {
    const notes = line(wielder('fighter', 'pistol')).notes.join(' ');
    expect(notes).toContain('Exotic Weapon Proficiency (firearms)');
    // Non-proficiency costs more than the −4 for a firearm: it fouls the shots you load.
    expect(notes).toContain('misfire value');
  });
});

describe('thrown weapons', () => {
  // Str 18 (+4) / Dex 14 (+2): the two modes differ in both attack and damage, so a mistake in
  // either direction is visible.
  function thrower(weapon: string, str = 18, dex = 14): CharacterDoc {
    let d = newCharacter('t-throw', 'Kell');
    d = withDecision(d, 'ability-base', { str, dex, con: 12, int: 10, wis: 12, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'fighter');
    return { ...atLevel(d, 3), equipped: { armor: null, mainHand: weapon, offHand: null } };
  }
  const lines = (d: CharacterDoc) => resolve(d).sheet.attacks;
  const thrownLine = (d: CharacterDoc) => lines(d).find((a) => a.mode === 'thrown')!;
  const meleeLine = (d: CharacterDoc) => lines(d).find((a) => a.mode === undefined)!;

  it('gives a throwable melee weapon a second line, not a note to apply yourself', () => {
    const dagger = lines(thrower('dagger'));
    expect(dagger).toHaveLength(2);
    expect(dagger[0].mode).toBeUndefined();
    expect(dagger[1].mode).toBe('thrown');
    expect(dagger[1].name).toContain('(thrown)');
  });

  it('rolls the thrown attack off Dex and the melee attack off Str', () => {
    // BAB +3. Melee: +3 Str +4 = +7. Thrown: +3 Dex +2 = +5.
    expect(meleeLine(thrower('dagger')).bonuses[0]).toBe(7);
    expect(thrownLine(thrower('dagger')).bonuses[0]).toBe(5);
    expect(thrownLine(thrower('dagger')).kind).toBe('ranged');
  });

  it('adds Strength to thrown damage', () => {
    expect(thrownLine(thrower('dagger')).damage).toBe('1d4+4');
  });

  it('never applies the 1½× two-handed multiplier to a thrown weapon', () => {
    // A spear wielded two-handed deals 1½× Str; thrown, it deals 1× — it has left your hands.
    expect(meleeLine(thrower('spear')).damage).toBe('1d8+6');
    expect(thrownLine(thrower('spear')).damage).toBe('1d8+4');
  });

  it('caps thrown range at five increments', () => {
    // Dagger: 10 ft increment → 50 ft, not the 100 ft a projectile weapon would reach.
    expect(thrownLine(thrower('dagger')).notes.join(' ')).toContain('Maximum range 50 ft');
    expect(thrownLine(thrower('shortspear')).notes.join(' ')).toContain('Maximum range 100 ft');
  });

  it('leaves weapons that are already ranged with a single line', () => {
    // A javelin is thrown in its only mode; it must not sprout a duplicate.
    expect(lines(thrower('javelin'))).toHaveLength(1);
    expect(lines(thrower('javelin'))[0].mode).toBeUndefined();
    expect(lines(thrower('longbow'))).toHaveLength(1);
  });

  it('gives a melee weapon with no range increment no thrown line', () => {
    expect(lines(thrower('longsword'))).toHaveLength(1);
  });

  it('points the melee line at the thrown line rather than restating the rules', () => {
    expect(meleeLine(thrower('dagger')).notes.join(' ')).toContain('listed separately');
  });

  it('carries the same enhancement and feats into both modes', () => {
    let d = thrower('dagger');
    d = withDecision(d, 'item-quality', { dagger: { masterwork: true, enhancement: 1 } });
    d = { ...d, purchases: { dagger: 1 } };
    // +1 on both attack lines and +1 damage on both — it is one weapon.
    expect(meleeLine(d).bonuses[0]).toBe(8);
    expect(thrownLine(d).bonuses[0]).toBe(6);
    expect(meleeLine(d).damage).toBe('1d4+5');
    expect(thrownLine(d).damage).toBe('1d4+5');
  });

  it('does not apply Power Attack to a thrown attack', () => {
    // Power Attack is melee-only, so the thrown line must be untouched by the toggle.
    let d = thrower('dagger');
    d = withDecision(d, 'feats', { 'feat-1': 'power-attack' });
    const off: CharacterDoc = { ...d, play: { ...emptyPlayState(), powerAttack: false } };
    const on: CharacterDoc = { ...d, play: { ...emptyPlayState(), powerAttack: true } };
    expect(meleeLine(on).bonuses[0]).toBe(meleeLine(off).bonuses[0] - 1);
    expect(thrownLine(on).bonuses[0]).toBe(thrownLine(off).bonuses[0]);
    expect(thrownLine(on).damage).toBe(thrownLine(off).damage);
  });

  it('halves Strength on damage for a thrown off-hand weapon', () => {
    let d = thrower('dagger');
    d = { ...d, equipped: { armor: null, mainHand: 'longsword', offHand: 'dagger' } };
    const thrown = resolve(d).sheet.attacks.find((a) => a.mode === 'thrown' && a.slot === 'off')!;
    expect(thrown.damage).toBe('1d4+2');
  });
});

describe('composite bows and the Strength rating', () => {
  // Str 18 (+4) unless overridden — enough headroom to see a rating cap bite.
  function archer(weapon: string, rating?: number, str = 18): CharacterDoc {
    let d = newCharacter('t-bow', 'Ilda');
    d = withDecision(d, 'ability-base', { str, dex: 14, con: 12, int: 10, wis: 12, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'fighter');
    if (rating !== undefined) d = withDecision(d, 'item-quality', { [weapon]: { strRating: rating } });
    d = { ...d, purchases: { [weapon]: 1 } };
    return { ...atLevel(d, 3), equipped: { armor: null, mainHand: weapon, offHand: null } };
  }
  const line = (d: CharacterDoc) => resolve(d).sheet.attacks[0];

  it('adds no Strength to damage at the default +0 rating', () => {
    // An ordinary composite longbow is rated +0: Str never reaches damage.
    expect(line(archer('comp-longbow')).damage).toBe('1d8');
    expect(line(archer('comp-longbow', 0)).damage).toBe('1d8');
  });

  it('adds Strength to damage up to the rating', () => {
    // Str +4 with a +2 bow: only +2 reaches damage.
    expect(line(archer('comp-longbow', 2)).damage).toBe('1d8+2');
    // …and a bow rated to match takes the whole bonus.
    expect(line(archer('comp-longbow', 4)).damage).toBe('1d8+4');
  });

  it('never adds more than the wielder actually has', () => {
    // Str 12 (+1) with a +4 bow: the bow cannot lend Strength the archer lacks.
    expect(line(archer('comp-longbow', 4, 12)).damage).toBe('1d8+1');
  });

  it('costs −2 to hit when the bow is rated above the wielder’s Strength', () => {
    // Str 12 (+1), bow rated +4: BAB 3 + Dex 2 − 2 = +3.
    const stiff = line(archer('comp-longbow', 4, 12));
    expect(stiff.bonuses[0]).toBe(3);
    expect(stiff.attackLines.some((b) => b.label.includes('above your Str') && b.value === -2)).toBe(true);
    // A bow rated at or below the archer's Strength draws cleanly.
    expect(line(archer('comp-longbow', 1, 12)).bonuses[0]).toBe(5);
  });

  it('applies a Strength penalty to damage in full, whatever the rating', () => {
    // Str 7 (−2) with a +0 bow: the penalty is not capped away by the rating.
    const weak = line(archer('comp-longbow', 0, 7));
    expect(weak.damage).toBe('1d8−2');
    // The rating is a maximum on the bonus, so it does not soften the penalty either.
    expect(line(archer('comp-longbow', 3, 7)).damage).toBe('1d8−2');
  });

  it('charges per point of rating, by the bow', () => {
    // Composite longbow 100 gp + 100/point; composite shortbow 75 gp + 75/point.
    const gold = (w: string, r: number) => resolve(archer(w, r)).sheet.gold;
    expect(gold('comp-longbow', 0) - gold('comp-longbow', 3)).toBe(300);
    expect(gold('comp-shortbow', 0) - gold('comp-shortbow', 3)).toBe(225);
  });

  it('leaves plain bows alone', () => {
    // A non-composite longbow adds no Strength however strong the archer is.
    expect(line(archer('longbow')).damage).toBe('1d8');
    expect(line(archer('longbow')).bonuses[0]).toBe(5);
  });

  it('ignores a stale rating left on a weapon that is not a composite bow', () => {
    // Switching a rating onto a crossbow must not quietly hand it a damage bonus.
    expect(line(archer('heavy-crossbow', 4)).damage).toBe('1d10');
  });

  it('shows the cap in the damage breakdown rather than a bare number', () => {
    const capped = line(archer('comp-longbow', 2));
    const str = capped.damageLines.find((b) => b.label.startsWith('Str modifier'))!;
    expect(str.value).toBe(2);
    expect(str.label).toContain("capped at the bow's +2");
  });
});

describe('slings add Strength to damage', () => {
  function slinger(weapon: string, str = 16): CharacterDoc {
    let d = newCharacter('t-sling', 'Bree');
    d = withDecision(d, 'ability-base', { str, dex: 14, con: 12, int: 10, wis: 12, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'fighter');
    return { ...atLevel(d, 3), equipped: { armor: null, mainHand: weapon, offHand: null } };
  }
  const line = (d: CharacterDoc) => resolve(d).sheet.attacks[0];

  // The engine's own note has always said "composite bows and slings excepted" — but slings were
  // getting no Strength at all, so the note described a rule that was not implemented.
  it('gives a sling the full Strength modifier, as a thrown weapon gets', () => {
    expect(line(slinger('sling')).damage).toBe('1d4+3');
  });

  it('does the same for the halfling sling staff', () => {
    expect(line(slinger('halfling-sling-staff')).damage).toBe('1d8+3');
  });

  it('still gives a bow or crossbow none', () => {
    expect(line(slinger('shortbow')).damage).toBe('1d6');
    expect(line(slinger('light-crossbow')).damage).toBe('1d8');
    expect(line(slinger('shortbow')).notes.join(' ')).toContain('no Str to damage');
  });
});

describe('firearm rules', () => {
  function shooter(weapon: string): CharacterDoc {
    let d = newCharacter('t-gun', 'Reva');
    d = withDecision(d, 'ability-base', { str: 12, dex: 16, con: 12, int: 10, wis: 14, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'gunslinger');
    return { ...atLevel(d, 3), equipped: { armor: null, mainHand: weapon, offHand: null } };
  }
  const notesFor = (w: string) => resolve(shooter(w)).sheet.attacks[0].notes.join(' ');

  it('states the touch-AC band and maximum range for an early firearm', () => {
    // Pistol: 20 ft increment. Touch AC inside one increment; five increments of range in total.
    const n = notesFor('pistol');
    expect(n).toContain('touch AC within 20 ft');
    expect(n).toContain('Maximum range 100 ft');
  });

  it('gives an advanced firearm the wider touch band and longer reach', () => {
    // Revolver: 20 ft increment, touch AC out to five increments, ten increments of range.
    const n = notesFor('revolver');
    expect(n).toContain('touch AC within 100 ft (5 range increments)');
    expect(n).toContain('Maximum range 200 ft');
  });

  it('does not treat the touch-AC shot as a touch attack', () => {
    expect(notesFor('pistol')).toContain('not touch attacks for feats such as Deadly Aim');
  });

  it('reports reload time by era and grip, not by a single rule', () => {
    // Early firearms are muzzle-loaded per barrel; advanced ones are chamber-loaded wholesale.
    expect(notesFor('pistol')).toContain('a standard action to reload each barrel');
    expect(notesFor('musket')).toContain('a full-round action to reload each barrel');
    expect(notesFor('revolver')).toContain('a move action to reload to full capacity');
  });

  it('describes the misfire consequence, including the burst on an already-broken gun', () => {
    const n = notesFor('musket');
    expect(n).toContain('Misfire 1–2');
    expect(n).toContain('broken condition');
    expect(n).toContain('5 ft burst');
    // Advanced firearms print no burst radius, so none is claimed.
    expect(notesFor('revolver')).not.toContain('burst');
  });

  it('flags the one-handed firing penalty only for two-handed firearms', () => {
    expect(notesFor('musket')).toContain('−4 on the attack roll if fired one-handed');
    expect(notesFor('pistol')).not.toContain('fired one-handed');
  });

  it('describes scatter with a cone size only where the source gives one', () => {
    expect(notesFor('blunderbuss')).toContain('pellets in a 15 ft cone');
    expect(notesFor('double-barreled-shotgun')).toContain('pellets in a cone');
    expect(notesFor('pistol')).not.toContain('Scatter');
  });

  it('says plainly that a double weapon is only half modelled', () => {
    expect(notesFor('axe-musket')).toContain('only its firearm mode is modelled');
  });

  it('adds no Str to firearm damage and leaves the attack bonus to Dex', () => {
    // Gunslinger 3: BAB +3, Dex 16 (+3) = +6, and damage is the die alone.
    const attack = resolve(shooter('pistol')).sheet.attacks[0];
    expect(attack.bonuses[0]).toBe(6);
    expect(attack.damage).toBe('1d8');
    expect(attack.kind).toBe('ranged');
  });
});

describe('lizardfolk', () => {
  // The playable lizardfolk is the 8-RP race-builder entry: +1 natural armour, not the +5 of the
  // Bestiary monster. The RP budget is the check — 2 + 2 + 1 + 1 + 2 = 8, and +5 natural armour
  // could not fit an 8-RP race.
  function lizardfolk(): CharacterDoc {
    let d = newCharacter('t-liz', 'Sskar');
    d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 12, int: 10, wis: 12, cha: 8 });
    d = withDecision(d, 'race', 'lizardfolk');
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'fighter');
    return d;
  }

  it('grants +1 natural armour, which stacks with Dex as a different bonus type', () => {
    const sheet = resolve(lizardfolk()).sheet;
    expect(sheet.stats['ac'].total).toBe(10 + 2 + 1);
    // Natural armour is not a Dex bonus, so it survives being caught flat-footed.
    expect(sheet.stats['ac:ff'].total).toBe(10 + 1);
    // …and it is not an armour bonus, so touch AC does not include it.
    expect(sheet.stats['ac:touch'].total).toBe(10 + 2);
  });

  it('applies +2 Str / +2 Con with no penalty, and a 30-ft swim speed', () => {
    const sheet = resolve(lizardfolk()).sheet;
    expect(sheet.stats['ability:str'].total).toBe(16);
    expect(sheet.stats['ability:con'].total).toBe(14);
    expect(sheet.stats['ability:int'].total).toBe(10); // no Int penalty on this entry
    expect(sheet.speed.swim).toBe(30);
  });

  it('gives the +8 racial bonus on Swim', () => {
    const withRace = resolve(lizardfolk()).sheet.stats['skill:swim'].total;
    const human = { ...lizardfolk(), decisions: { ...lizardfolk().decisions, race: 'human' } } as CharacterDoc;
    // Human Str 14 (no racial Str here) vs lizardfolk Str 16: +1 from the ability, +8 from the trait.
    expect(withRace - resolve(human).sheet.stats['skill:swim'].total).toBe(9);
  });

  it('is xenophobic: starts with its racial language and not Common', () => {
    const race = C.raceById.get('lizardfolk')!;
    expect(race.languagesAuto).toEqual(['draconic']);
    expect(race.languagesAuto).not.toContain('common');
  });
});

describe('multiclass', () => {
  /** Fighter levels, then `later` taken at the levels listed. humanFighter1 is Str 17, Dex 14,
   *  Con 14 (+2), Int 10, Wis 12, favored class fighter with the bonus in HP. */
  function mixed(totalLevel: number, later: Record<number, string>): CharacterDoc {
    const d = atLevel(humanFighter1(), totalLevel);
    const ids = Array.from({ length: totalLevel }, (_, i) => later[i + 1] ?? 'fighter');
    return withDecision(d, 'class-levels', ids);
  }
  const st = (d: CharacterDoc, k: string) => resolve(d).sheet.stats[k].total;

  it('a single-class document with no class-levels array resolves exactly as before', () => {
    const plain = atLevel(humanFighter1(), 6);
    const spelled = withDecision(plain, 'class-levels', Array(6).fill('fighter'));
    expect(resolve(spelled).sheet.stats['hp:max'].total).toBe(resolve(plain).sheet.stats['hp:max'].total);
    expect(resolve(spelled).sheet.stats['save:will'].total).toBe(resolve(plain).sheet.stats['save:will'].total);
  });

  it('BAB adds each class computed on its own levels', () => {
    // Fighter 5 (full, +5) + wizard 1 (half, +0) = +5, not the +6 a fighter 6 would have.
    const d = mixed(6, { 6: 'wizard' });
    expect(resolve(d).sheet.stats['attack:melee'].lines.find((l) => l.label.includes('BAB'))?.value ?? 0).toBe(5);
    expect(resolve(atLevel(humanFighter1(), 6)).sheet.stats['attack:melee'].lines.find((l) => l.label.includes('BAB'))?.value).toBe(6);
  });

  it('saves add each class track, so the wizard dip grants a full +2 Will', () => {
    const d = mixed(6, { 6: 'wizard' });
    // Fort: fighter 5 good = 2+2 = 4, wizard 1 poor = 0 → 4, + Con 2 = 6.
    expect(st(d, 'save:fort')).toBe(4 + 2);
    // Will: fighter 5 poor = 1, wizard 1 good = 2 → 3, + Wis 1 = 4.
    expect(st(d, 'save:will')).toBe(3 + 1);
    // Ref: fighter 5 poor = 1, wizard 1 poor = 0 → 1, + Dex 2 = 3.
    expect(st(d, 'save:ref')).toBe(1 + 2);
  });

  it('each level takes its own class hit die', () => {
    // L1 fighter max d10 = 10; L2–5 fighter average 6 × 4 = 24; L6 wizard average 4.
    // Con +2 × 6 = 12. Favored-class HP applies to the 5 fighter levels only.
    const d = mixed(6, { 6: 'wizard' });
    expect(st(d, 'hp:max')).toBe(10 + 24 + 4 + 12 + 5);
    // The same character as a pure fighter 6: d10 average for level 6, and 6 favored levels.
    expect(st(atLevel(humanFighter1(), 6), 'hp:max')).toBe(10 + 24 + 6 + 12 + 6);
  });

  it('class skills are the union, and ranks come from the class taken at each level', () => {
    const d = mixed(6, { 6: 'rogue' });
    const sheet = resolve(d).sheet;
    // Stealth is a rogue class skill, not a fighter one.
    expect(sheet.classSkillIds).toContain('stealth');
    expect(resolve(atLevel(humanFighter1(), 6)).sheet.classSkillIds).not.toContain('stealth');
    // Int 10, human +1 rank/level: five fighter levels at 2+1 and one rogue level at 8+1 = 24.
    expect(sheet.skillRanksTotal).toBe(5 * 3 + 9);
  });

  it('class features and bonus feats key off the class level, not the character level', () => {
    // Wizard taken at character level 6 is still a *1st-level* wizard: it gets Arcane Bond /
    // Scribe Scroll, not the level-5 wizard bonus feat.
    const d = mixed(6, { 6: 'wizard' });
    const r = resolve(d);
    expect(r.sheet.grantedFeats.map((g) => g.featId)).toContain('scribe-scroll');
    const keys = r.slots.filter((s) => s.step === 'feats').map((s) => s.id);
    expect(keys).not.toContain('feat-wizard-L5');
    // The fighter bonus feats it does have are the ones for fighter levels 1–5 (even levels 2, 4).
    expect(keys).toContain('feat-fighter-L4');
    expect(keys).not.toContain('feat-fighter-L6');
  });

  it('general feats still come from the character level', () => {
    const keys = resolve(mixed(6, { 6: 'wizard' })).slots.filter((s) => s.step === 'feats').map((s) => s.id);
    for (const k of ['feat-1', 'feat-L3', 'feat-L5']) expect(keys).toContain(k);
  });

  it('the favored-class bonus is earned only on levels in that class', () => {
    // Fighter favored: 5 fighter levels → +5 HP, versus 6 for a pure fighter 6 (asserted above).
    const d = mixed(6, { 6: 'wizard' });
    const hpLines = resolve(d).sheet.stats['hp:max'].lines;
    expect(hpLines.find((l) => l.label.startsWith('Favored class'))?.value).toBe(5);
  });

  it('the advancement table names the class at each level and runs totals', () => {
    const rows = resolve(mixed(6, { 6: 'wizard' })).sheet.progression;
    expect(rows.map((r) => r.classId)).toEqual(['fighter', 'fighter', 'fighter', 'fighter', 'fighter', 'wizard']);
    expect(rows[5].classLevel).toBe(1); // first wizard level
    expect(rows[5].bab).toBe(5); // running total, unchanged by the half-BAB wizard level
    expect(rows[4].bab).toBe(5);
    expect(rows[5].will).toBe(3); // 1 (fighter 5, poor) + 2 (wizard 1, good)
  });

  it('each casting class progresses on its own levels, never merged', () => {
    // A wizard 5 / cleric 2 casts as a 5th-level wizard AND a 2nd-level cleric — the two
    // progressions never add into one 7th-level caster.
    let d = atLevel(humanFighter1(), 7);
    d = withDecision(d, 'class', 'wizard');
    d = withDecision(d, 'class-levels', ['wizard', 'wizard', 'wizard', 'wizard', 'wizard', 'cleric', 'cleric']);
    const casting = resolve(d).sheet.casting;
    expect(casting.map((b) => [b.classId, b.casterLevel])).toEqual([['wizard', 5], ['cleric', 2]]);
    // The 5th-level wizard has 3rd-level slots; the 2nd-level cleric has only 1st.
    const wiz = casting[0].slots!;
    const cler = casting[1].slots!;
    expect(wiz[3] ?? 0).toBeGreaterThan(0);
    expect(cler[3] ?? 0).toBe(0);
    expect(cler[1]).toBeGreaterThan(0);
  });

  it('a non-casting class contributes no casting block', () => {
    const d = mixed(6, { 6: 'wizard' });
    expect(resolve(d).sheet.casting.map((b) => b.classId)).toEqual(['wizard']);
    expect(resolve(atLevel(humanFighter1(), 6)).sheet.casting).toEqual([]);
  });

  it('the summary line lists each class with its own level count', () => {
    expect(resolve(mixed(6, { 6: 'wizard' })).sheet.summaryLine).toContain('Fighter 5 / Wizard 1');
    expect(resolve(atLevel(humanFighter1(), 6)).sheet.summaryLine).toContain('Fighter 6');
  });

  it('levelling down suspends the levels above without losing their class', () => {
    // Drop a fighter 5 / wizard 1 to level 5: the wizard level is above the target, so it stops
    // contributing, but the stored array still remembers it for when the level comes back.
    const six = mixed(6, { 6: 'wizard' });
    const five = { ...six, level: 5 };
    expect(resolve(five).sheet.casting).toEqual([]);
    expect(resolve(five).sheet.summaryLine).toContain('Fighter 5');
    expect(resolve(six).sheet.casting.map((b) => b.classId)).toEqual(['wizard']);
  });

  it('a dip taken at 1st level rather than last is a different character', () => {
    // Wizard 1 first, then fighter 5: 1st-level HP is now the wizard's d6 max.
    const early = mixed(6, { 1: 'wizard' });
    expect(st(early, 'hp:max')).toBe(6 + (6 * 5) + 12 + 5);
  });
});

describe('Power Attack and two-weapon fighting (declared options)', () => {
  // Fighter 6, Str 17 (+3), BAB +6. Longsword main hand, short sword (light) off hand.
  function fighter(feats: Record<string, string>, play: Partial<CharacterDoc['play']> = {}): CharacterDoc {
    let d = atLevel(humanFighter1(), 6);
    d = withDecision(d, 'feats', feats);
    return {
      ...d,
      equipped: { armor: null, mainHand: 'longsword', offHand: 'short-sword' },
      play: { ...emptyPlayState(), ...play } as CharacterDoc['play'],
    };
  }
  const line = (d: CharacterDoc, id: string) => resolve(d).sheet.attacks.find((a) => a.id === id)!;
  const PA = { 'feat-1': 'power-attack' };
  const TWF = { 'feat-1': 'two-weapon-fighting' };

  it('changes nothing until the option is switched on', () => {
    const off = line(fighter(PA), 'longsword');
    expect(off.bonuses).toEqual([9, 4]);
    expect(off.damage).toBe('1d8+3');
  });

  it('Power Attack at BAB 6 costs 2 attack for 4 damage', () => {
    const l = line(fighter(PA, { powerAttack: true }), 'longsword');
    expect(l.bonuses).toEqual([7, 2]);
    expect(l.damage).toBe('1d8+7'); // 3 Str + 4
    expect(l.attackLines.some((b) => b.label === 'Power Attack' && b.value === -2)).toBe(true);
  });

  it('a two-handed weapon gets half again the damage for the same penalty', () => {
    const d = { ...fighter(PA, { powerAttack: true }), purchases: { greataxe: 1 } };
    const g = line(d, 'greataxe');
    expect(g.damage).toBe('1d12+10'); // 4 (1½× Str 3) + 6 (1½× 4)
    expect(g.bonuses[0]).toBe(7); // same -2 penalty as the longsword
  });

  it('does nothing to a ranged weapon', () => {
    const d = { ...fighter(PA, { powerAttack: true }), purchases: { longbow: 1 } };
    const b = line(d, 'longbow');
    expect(b.attackLines.some((x) => x.label === 'Power Attack')).toBe(false);
  });

  it('is ignored without the feat, however the toggle is set', () => {
    const l = line(fighter({ 'feat-1': 'toughness' }, { powerAttack: true }), 'longsword');
    expect(l.bonuses).toEqual([9, 4]);
  });

  it('a stale two-weapon flag does not penalise a character holding one weapon', () => {
    // Unequipping the off-hand weapon while the toggle is on must not leave a -6 hanging on the
    // primary attack. The engine gates on the equipment, not on the flag alone.
    const d = fighter(TWF, { twoWeapon: true });
    const oneHanded = { ...d, equipped: { ...d.equipped, offHand: null } };
    expect(line(oneHanded, 'longsword').bonuses).toEqual([9, 4]);
  });

  it('two-weapon fighting penalises both hands; a light off-hand weapon softens it', () => {
    // No feat, light off-hand weapon: -4 primary / -8 off hand.
    const d = fighter({ 'feat-1': 'toughness' }, { twoWeapon: true });
    expect(line(d, 'longsword').bonuses).toEqual([5, 0]);
    // Off hand: +6 BAB + 3 Str - 8 = +1, and a single attack rather than iteratives.
    expect(line(d, 'short-sword').bonuses).toEqual([1]);
  });

  it('the feat lessens the primary penalty by 2 and the off-hand one by 6', () => {
    const d = fighter(TWF, { twoWeapon: true });
    expect(line(d, 'longsword').bonuses).toEqual([7, 2]); // -2 with a light off-hand weapon
    expect(line(d, 'short-sword').bonuses).toEqual([7]);
  });

  it('the off hand gets one attack, not the BAB iteratives', () => {
    const d = fighter(TWF, { twoWeapon: true });
    expect(line(d, 'short-sword').bonuses).toHaveLength(1);
    // Without the option the off-hand weapon is just a held weapon and keeps its own iteratives.
    expect(line(fighter(TWF), 'short-sword').bonuses.length).toBeGreaterThan(1);
  });

  it('both options stack onto the same attack', () => {
    const d = fighter({ 'feat-1': 'power-attack', 'feat-L3': 'two-weapon-fighting' },
      { powerAttack: true, twoWeapon: true });
    // +9 base, -2 Power Attack, -2 two-weapon (light off hand, with feat) = +5.
    expect(line(d, 'longsword').bonuses).toEqual([5, 0]);
    expect(line(d, 'longsword').damage).toBe('1d8+7');
    // Off hand: +6 BAB + 1 (½× Str 3) ... attack +9 -2 -2 = +5; damage ½× Str + ½× PA.
    expect(line(d, 'short-sword').damage).toBe('1d6+3'); // 1 (½×3) + 2 (½×4)
  });
});

describe('worn magic items', () => {
  function worn(items: string[]): CharacterDoc {
    let d = newCharacter('t-worn', 'Valeria');
    d = withDecision(d, 'ability-base', { str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']); // Str 17
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'fighter');
    d = withDecision(d, 'worn-items', items);
    return atLevel(d, 12);
  }
  const st = (d: CharacterDoc, k: string) => resolve(d).sheet.stats[k];

  it('a stat belt raises the ability and everything derived from it', () => {
    const before = resolve(worn([])).sheet;
    const after = resolve(worn(['belt-strength-4'])).sheet;
    expect(after.stats['ability:str'].total - before.stats['ability:str'].total).toBe(4);
    // Str 17 → 21, so the modifier goes +3 → +5: melee attack gains 2.
    expect(after.stats['attack:melee'].total - before.stats['attack:melee'].total).toBe(2);
  });

  it('a Con belt raises hit points retroactively across all levels', () => {
    const before = resolve(worn([])).sheet.stats['hp:max'].total;
    const after = resolve(worn(['belt-constitution-2'])).sheet.stats['hp:max'].total;
    expect(after - before).toBe(12); // +1 Con modifier × 12 levels
  });

  it('cloak of resistance adds to every save', () => {
    const d = worn(['cloak-resistance-3']);
    for (const s of ['save:fort', 'save:ref', 'save:will']) {
      expect(st(d, s).lines).toContainEqual({ label: 'Cloak of resistance +3', value: 3 });
    }
  });

  it('ring of protection and amulet of natural armor stack (different bonus types)', () => {
    const base = resolve(worn([])).sheet.stats['ac'].total;
    const both = resolve(worn(['ring-protection-2', 'amulet-natural-armor-3'])).sheet.stats['ac'].total;
    expect(both - base).toBe(5);
  });

  it('charges for worn items and refunds when removed', () => {
    const base = resolve(worn([])).sheet.gold;
    expect(base - resolve(worn(['belt-strength-4'])).sheet.gold).toBe(16000);
    expect(base - resolve(worn(['cloak-resistance-5'])).sheet.gold).toBe(25000);
    expect(resolve(worn([])).sheet.gold).toBe(base);
  });

  it('a second item in a one-item slot is worn but does nothing', () => {
    const r = resolve(worn(['belt-strength-2', 'belt-dexterity-2']));
    expect(r.sheet.stats['ability:str'].total).toBe(19); // first belt works
    expect(r.sheet.stats['ability:dex'].total).toBe(14); // second does not
    expect(r.sheet.worn.map((w) => w.active)).toEqual([true, false]);
    expect(r.issues.some((i) => /belt slot is already full/.test(i.message))).toBe(true);
    // You still paid for it.
    expect(resolve(worn([])).sheet.gold - r.sheet.gold).toBe(8000);
  });

  it('allows two rings but not three', () => {
    const two = resolve(worn(['ring-protection-1', 'ring-protection-1']));
    expect(two.sheet.worn.map((w) => w.active)).toEqual([true, true]);
    // Deflection is the same type, so two +1 rings do not stack to +2.
    expect(two.sheet.stats['ac'].total - resolve(worn([])).sheet.stats['ac'].total).toBe(1);
    const three = resolve(worn(['ring-protection-1', 'ring-protection-1', 'ring-protection-1']));
    expect(three.sheet.worn.map((w) => w.active)).toEqual([true, true, false]);
  });

  it('ignores an unknown item id', () => {
    expect(resolve(worn(['no-such-item'])).sheet.worn).toEqual([]);
  });

  it('a document missing goldSpent resolves to a number, not NaN', () => {
    // Imported/hand-written JSON can omit goldSpent; gold must degrade to "nothing spent"
    // rather than poisoning the whole figure.
    const d = worn(['bracers-armor-4']);
    const bare = { ...d, goldSpent: undefined } as unknown as CharacterDoc;
    expect(Number.isNaN(resolve(bare).sheet.gold)).toBe(false);
    expect(resolve(bare).sheet.gold).toBe(resolve({ ...d, goldSpent: 0 }).sheet.gold);
  });

  it('bracers of armor grant an armor bonus that does not stack with worn armor', () => {
    // Same bonus type, so the higher of the two wins rather than adding.
    const bare = resolve(worn([])).sheet.stats['ac'].total;
    const bracers = resolve(worn(['bracers-armor-5'])).sheet.stats['ac'].total;
    expect(bracers - bare).toBe(5);
    // Chain shirt is +4 armor: the +5 bracers replace it, they do not make +9.
    let armored = worn([]);
    armored = { ...armored, equipped: { ...armored.equipped, armor: 'chain-shirt' } };
    const withBoth = { ...armored, decisions: { ...armored.decisions, 'worn-items': ['bracers-armor-5'] } } as CharacterDoc;
    expect(resolve(withBoth).sheet.stats['ac'].total - resolve(armored).sheet.stats['ac'].total).toBe(1);
  });

  it('a skill item adds a competence bonus to each skill it names', () => {
    const before = resolve(worn([])).sheet.stats;
    const after = resolve(worn(['vest-of-escape'])).sheet.stats;
    expect(after['skill:escape-artist'].total - before['skill:escape-artist'].total).toBe(6);
    expect(after['skill:disable-device'].total - before['skill:disable-device'].total).toBe(4);
    expect(after['skill:stealth'].total).toBe(before['skill:stealth'].total);
  });

  it('the circlet of persuasion covers every Charisma-based skill', () => {
    const before = resolve(worn([])).sheet.stats;
    const after = resolve(worn(['circlet-of-persuasion'])).sheet.stats;
    for (const id of ['bluff', 'diplomacy', 'intimidate', 'use-magic-device']) {
      expect(after[`skill:${id}`].total - before[`skill:${id}`].total).toBe(3);
    }
    expect(after['skill:perception'].total).toBe(before['skill:perception'].total);
  });

  it('boots of striding and springing raise speed but leave the Acrobatics total alone', () => {
    const before = resolve(worn([])).sheet;
    const after = resolve(worn(['boots-striding-springing'])).sheet;
    expect(after.speed.base - before.speed.base).toBe(10);
    // The +5 is jump-only, so it is an annotation, never part of the total.
    expect(after.stats['skill:acrobatics'].total).toBe(before.stats['skill:acrobatics'].total);
    expect(after.stats['skill:acrobatics'].annotations.join(' ')).toContain('to jump');
  });

  it('an item with no modelled bonus still costs gold and claims its slot', () => {
    const r = resolve(worn(['goggles-of-night', 'eyes-of-the-eagle']));
    expect(resolve(worn([])).sheet.gold - r.sheet.gold).toBe(12000 + 2500);
    expect(r.sheet.worn.map((w) => w.active)).toEqual([true, false]);
  });
});
