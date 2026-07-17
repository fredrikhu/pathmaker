import { describe, it, expect } from 'vitest';
import { resolve } from './resolve';
import { newCharacter, withDecision } from './character';
import type { CharacterDoc } from './types';

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

  it('has a spells step and a spellbook slot of 3 + Int mod = 6 picks', () => {
    expect(r.steps).toContain('spells');
    const spellSlot = r.slots.find((sl) => sl.id === 'spell-picks')!;
    expect(spellSlot.count).toBe(6); // 3 + 3 (Int 17)
  });

  it('marks opposition-school spells with a caution, not a lock', () => {
    const spellSlot = r.slots.find((sl) => sl.id === 'spell-picks')!;
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
    const book = r.slots.find((s) => s.id === 'spell-picks')!;
    expect(book.count).toBe(5); // 3 + Int mod (16 → +3)? Int 14+2 racial = 16 → +3
  });

  it('Oracle: ¾ BAB (+0), spontaneous divine, and mystery + curse choices', () => {
    const r = resolve(human('oracle'));
    expect(r.sheet.stats['bab'].total).toBe(0);
    expect(r.steps).toContain('spells');
    const known = r.slots.find((s) => s.id === 'spell-picks')!;
    expect(known.count).toBe(2); // known1[1]
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
    expect(r.issues.some((i) => i.severity === 'error' && /selected but only 5 allowed/.test(i.message))).toBe(true);
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
