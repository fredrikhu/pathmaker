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
