import { describe, it, expect } from 'vitest';
import { resolve, doubleThreatRange, effectiveClass, readDecisions } from './resolve';
import { newCharacter, withDecision } from './character';
import type { CharacterDoc } from './types';
import { emptyPlayState } from './types';
import * as C from '../content/index';
import { MAGUS_ARCANA } from '../content/subsystems';

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

describe('trait budget validation', () => {
  const traitIssues = (d: CharacterDoc) =>
    resolve(d).issues.filter((i) => i.slot === 'traits');

  it('nudges to fill the 2-trait budget when none are chosen', () => {
    const iss = traitIssues(humanFighter1());
    expect(iss).toHaveLength(1);
    expect(iss[0].severity).toBe('info');
    expect(iss[0].message).toMatch(/Choose 2 more traits/);
  });

  it('nudges for the last trait when one of two is chosen', () => {
    const d = withDecision(humanFighter1(), 'traits', ['reactionary']);
    const iss = traitIssues(d);
    expect(iss).toHaveLength(1);
    expect(iss[0].message).toMatch(/Choose 1 more trait\b/);
  });

  it('is silent once the budget is met', () => {
    const d = withDecision(humanFighter1(), 'traits', ['reactionary', 'indomitable-faith']);
    expect(traitIssues(d)).toHaveLength(0);
  });

  it('a drawback raises the budget to 3, re-opening the nudge', () => {
    let d = withDecision(humanFighter1(), 'traits', ['reactionary', 'indomitable-faith']);
    d = withDecision(d, 'drawback', 'dw-meticulous');
    const iss = traitIssues(d);
    expect(iss).toHaveLength(1);
    expect(iss[0].message).toMatch(/Choose 1 more trait .* up to 3/);
  });

  it('over budget stays an error, not a nudge', () => {
    const d = withDecision(humanFighter1(), 'traits', ['reactionary', 'indomitable-faith', 'magical-lineage']);
    const iss = traitIssues(d);
    expect(iss).toHaveLength(1);
    expect(iss[0].severity).toBe('error');
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

  it('Fleet adds 5 ft in light or no armour, and is suppressed by medium armour', () => {
    let d = newCharacter('t-fleet', 'Swift');
    d = withDecision(d, 'ability-base', { str: 12, dex: 12, con: 12, int: 10, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'fighter');
    d = withDecision(d, 'feats', { 'feat-1': 'fleet' });
    // No armour: 30 + 5.
    expect(resolve(d).sheet.speed.base).toBe(35);
    // Light armour still gets it.
    expect(resolve({ ...d, equipped: { armor: 'chain-shirt', mainHand: null, offHand: null } }).sheet.speed.base).toBe(35);
    // Medium armour reduces to 20 and suppresses Fleet (not 25).
    expect(resolve({ ...d, equipped: { armor: 'scale-mail', mainHand: null, offHand: null } }).sheet.speed.base).toBe(20);
  });

  it('Intimidating Prowess adds the Strength modifier to Intimidate on top of Charisma', () => {
    let d = newCharacter('t-ip', 'Grimjaw');
    d = withDecision(d, 'ability-base', { str: 16, dex: 12, con: 12, int: 10, wis: 10, cha: 10 }); // Str +3, Cha +0
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'fighter');
    const without = resolve(d).sheet.stats['skill:intimidate'].total;
    d = withDecision(d, 'feats', { 'feat-1': 'intimidating-prowess' });
    const withFeat = resolve(d);
    expect(withFeat.sheet.stats['skill:intimidate'].total).toBe(without + 3); // + Str modifier
    expect(withFeat.sheet.stats['skill:intimidate'].lines.some((b) => /Intimidating Prowess/.test(b.label))).toBe(true);
    // Only Intimidate is affected — a Cha skill like Diplomacy is untouched.
    expect(withFeat.sheet.stats['skill:diplomacy'].total).toBe(resolve({ ...d, decisions: { ...d.decisions, feats: {} } }).sheet.stats['skill:diplomacy'].total);
  });
});

describe('Shield Focus increases the shield bonus (only while a shield is wielded)', () => {
  function shieldBearer(feats: Record<string, string>, offHand: string | null): CharacterDoc {
    let d = newCharacter('t-sf', 'Warder');
    d = withDecision(d, 'ability-base', { str: 12, dex: 10, con: 12, int: 10, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'fighter');
    d = withDecision(d, 'feats', feats);
    return { ...atLevel(d, 8), purchases: { 'heavy-shield': 1 }, equipped: { armor: null, mainHand: null, offHand } };
  }
  const ac = (d: CharacterDoc) => resolve(d).sheet.stats['ac'].total;

  it('adds +1 with Shield Focus and +2 with Greater, on top of the heavy shield’s +2', () => {
    const plain = ac(shieldBearer({}, 'heavy-shield'));
    expect(ac(shieldBearer({ 'feat-1': 'shield-focus' }, 'heavy-shield'))).toBe(plain + 1);
    expect(ac(shieldBearer({ 'feat-1': 'shield-focus', 'feat-L3': 'greater-shield-focus' }, 'heavy-shield'))).toBe(plain + 2);
  });

  it('does nothing when no shield is equipped, and never touches touch AC', () => {
    const noShield = shieldBearer({ 'feat-1': 'shield-focus' }, null);
    const bareNoFeat = shieldBearer({}, null);
    expect(ac(noShield)).toBe(ac(bareNoFeat)); // no shield → no bonus
    // Shield Focus rides the shield bonus, which never applies to touch AC.
    const withShield = shieldBearer({ 'feat-1': 'shield-focus' }, 'heavy-shield');
    expect(resolve(withShield).sheet.stats['ac:touch'].total).toBe(resolve(shieldBearer({}, 'heavy-shield')).sheet.stats['ac:touch'].total);
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
  it('a draconic bloodrager shows its own powers (Breath Weapon at 8, Dragon Wings at 12)', () => {
    let d = newCharacter('t-brag', 'Crowe');
    d = withDecision(d, 'ability-base', { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 12 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', 'CN');
    d = withDecision(d, 'class', 'bloodrager');
    d = withDecision(d, 'class-choices', { bloodline: ['draconic'] });
    const r = resolve(atLevel(d, 12));
    expect(r.sheet.progression[0].features).toContain('Claws');         // level 1
    expect(r.sheet.progression[7].features).toContain('Breath Weapon'); // level 8 — bloodrager, not the sorcerer's level-9 breath
    expect(r.sheet.progression[11].features).toContain('Dragon Wings'); // level 12
  });
  it('a life shaman shows its spirit abilities (Channel at 1, Healer’s Touch at 8, Quick Healing at 16)', () => {
    let d = newCharacter('t-shaman', 'Wu');
    d = withDecision(d, 'ability-base', { str: 8, dex: 12, con: 12, int: 10, wis: 16, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['wis']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'shaman');
    d = withDecision(d, 'class-choices', { spirit: ['life'] });
    const r = resolve(atLevel(d, 16));
    expect(r.sheet.progression[0].features).toContain('Channel');        // 1st
    expect(r.sheet.progression[7].features).toContain("Healer's Touch"); // 8th
    expect(r.sheet.progression[15].features).toContain('Quick Healing'); // 16th
  });
  it('a Flame cavalier shows its order abilities (Foolhardy Rush at 2, Daunting Success at 8)', () => {
    let d = newCharacter('t-cav', 'Roevin');
    d = withDecision(d, 'ability-base', { str: 15, dex: 12, con: 13, int: 10, wis: 10, cha: 14 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', 'CN');
    d = withDecision(d, 'class', 'cavalier');
    d = withDecision(d, 'class-choices', { order: ['flame'] });
    const r = resolve(atLevel(d, 8));
    expect(r.sheet.progression[1].features).toContain('Foolhardy Rush');  // 2nd
    expect(r.sheet.progression[7].features).toContain('Daunting Success'); // 8th
  });
  it('a tiger shifter shows its aspect abilities (Minor at 1, Major at 4, Greater at 8, True at 15)', () => {
    let d = newCharacter('t-shifter', 'Feiya');
    d = withDecision(d, 'ability-base', { str: 14, dex: 16, con: 13, int: 10, wis: 14, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['dex']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'shifter');
    d = withDecision(d, 'class-choices', { aspect: ['tiger'] });
    const r = resolve(atLevel(d, 15));
    expect(r.sheet.progression[0].features).toContain('Tiger Aspect (Minor)');  // 1st
    expect(r.sheet.progression[3].features).toContain('Tiger Aspect (Major)');  // 4th
    expect(r.sheet.progression[7].features).toContain('Greater Tiger Aspect');  // 8th
    expect(r.sheet.progression[14].features).toContain('True Tiger Aspect');    // 15th
    // The bare aspect abilities don't appear before their level.
    expect(resolve(atLevel(d, 3)).sheet.progression[2].features).not.toContain('Tiger Aspect (Major)');
  });
  it('a witch shows its patron bonus spells (1st at level 2, 5th at level 10, 9th at level 18)', () => {
    let d = newCharacter('t-witch', 'Feiya');
    d = withDecision(d, 'ability-base', { str: 8, dex: 12, con: 12, int: 16, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'witch');
    d = withDecision(d, 'class-choices', { patron: ['winter'] });
    const r = resolve(atLevel(d, 18));
    expect(r.sheet.progression[1].features).toContain('Patron Spell (1st): Unshakable Chill');  // level 2
    expect(r.sheet.progression[9].features).toContain('Patron Spell (5th): Cone of Cold');       // level 10
    expect(r.sheet.progression[17].features).toContain('Patron Spell (9th): Polar Midnight');    // level 18
    // Higher-level patron spells don't appear before their level.
    expect(resolve(atLevel(d, 8)).sheet.progression[7].features).not.toContain('Patron Spell (5th): Cone of Cold');
  });
  it('a draconic sorcerer shows its bloodline arcana at 1 and bonus spells (Mage Armor at 3, Wish at 19)', () => {
    let d = newCharacter('t-sorc', 'Seoni');
    d = withDecision(d, 'ability-base', { str: 8, dex: 12, con: 12, int: 10, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'sorcerer');
    d = withDecision(d, 'class-choices', { bloodline: ['draconic'] });
    const r = resolve(atLevel(d, 19));
    expect(r.sheet.progression[0].features).toContain('Bloodline Arcana');            // level 1
    expect(r.sheet.progression[2].features).toContain('Bonus Spell (1st): Mage Armor'); // level 3
    expect(r.sheet.progression[18].features).toContain('Bonus Spell (9th): Wish');       // level 19
    // Bonus spells don't appear before their level.
    expect(resolve(atLevel(d, 4)).sheet.progression[2].features).toContain('Bonus Spell (1st): Mage Armor');
    expect(resolve(atLevel(d, 4)).sheet.progression.length).toBe(4); // no 5th-level bonus spell yet
  });
  it('an abyssal bloodrager shows its bonus spells (1st at 7, 4th at 16) and no bloodline arcana', () => {
    let d = newCharacter('t-br', 'Crunch');
    d = withDecision(d, 'ability-base', { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 12 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', 'CN');
    d = withDecision(d, 'class', 'bloodrager');
    d = withDecision(d, 'class-choices', { bloodline: ['abyssal'] });
    const r = resolve(atLevel(d, 16));
    expect(r.sheet.progression[6].features).toContain('Bonus Spell (1st): Ray of Enfeeblement'); // level 7
    expect(r.sheet.progression[15].features).toContain('Bonus Spell (4th): Stoneskin');          // level 16
    expect(r.sheet.progression.some((p) => p.features.includes('Bloodline Arcana'))).toBe(false);
    // First bonus spell isn't granted before 7th.
    expect(resolve(atLevel(d, 6)).sheet.progression[5].features).not.toContain('Bonus Spell (1st): Ray of Enfeeblement');
  });
  it('a summoner gets an eidolon evolution point-buy sized to the pool, with level/form gating', () => {
    let d = newCharacter('t-summ', 'Balazar');
    d = withDecision(d, 'ability-base', { str: 8, dex: 12, con: 12, int: 10, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'summoner');
    d = withDecision(d, 'class-choices', { 'eidolon-form': ['biped'], evolutions: ['bite', 'claws'] });
    const r = resolve(atLevel(d, 1));
    const slot = r.slots.find((s) => s.id === 'evolutions')!;
    expect(slot.pointBudget).toBe(3);   // level-1 pool
    expect(slot.pointsSpent).toBe(2);   // bite (1) + claws (1)
    expect(r.issues.some((i) => i.slot === 'evolutions' && /1 evolution point unspent/.test(i.message))).toBe(true);
    // Large (4 pts, min summoner 8) is gated by level; Pounce is gated by base form (quadruped).
    expect(slot.options.find((o) => o.id === 'large')!.legal).toBe(false);
    expect(slot.options.find((o) => o.id === 'pounce')!.legal).toBe(false);
    const r8 = resolve(atLevel(d, 8));
    const slot8 = r8.slots.find((s) => s.id === 'evolutions')!;
    expect(slot8.pointBudget).toBe(11); // level-8 pool
    expect(slot8.options.find((o) => o.id === 'large')!.legal).toBe(true);
  });
  it('an over-budget eidolon raises a warning about the evolution pool', () => {
    let d = newCharacter('t-summ2', 'Balazar');
    d = withDecision(d, 'ability-base', { str: 8, dex: 12, con: 12, int: 10, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'summoner');
    // Five 1-point evolutions at level 1 (pool 3) → over by 2.
    d = withDecision(d, 'class-choices', { 'eidolon-form': ['biped'], evolutions: ['bite', 'claws', 'gills', 'scent', 'reach'] });
    const r = resolve(atLevel(d, 1));
    expect(r.slots.find((s) => s.id === 'evolutions')!.pointsSpent).toBe(5);
    expect(r.issues.some((i) => i.slot === 'evolutions' && /over its evolution pool by 2 points/.test(i.message))).toBe(true);
  });
  it('a repeatable evolution taken several times spends points per purchase', () => {
    let d = newCharacter('t-summ3', 'Balazar');
    d = withDecision(d, 'ability-base', { str: 8, dex: 12, con: 12, int: 10, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'summoner');
    // Ability Increase (2 pts) taken twice + Bite (1 pt) = 5 points.
    d = withDecision(d, 'class-choices', { 'eidolon-form': ['biped'], evolutions: ['ability-increase', 'ability-increase', 'bite'] });
    const slot = resolve(atLevel(d, 8)).slots.find((s) => s.id === 'evolutions')!;
    expect(slot.pointsSpent).toBe(5);
    expect(slot.options.find((o) => o.id === 'ability-increase')!.meta!.multi).toBe(1); // repeatable
    expect(slot.options.find((o) => o.id === 'bite')!.meta!.multi).toBe(0);             // one-shot
  });
  it('an alchemist gains a grand-discovery pick at level 20, and not before', () => {
    let d = newCharacter('t-alch', 'Damiel');
    d = withDecision(d, 'ability-base', { str: 10, dex: 14, con: 12, int: 16, wis: 10, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'alchemist');
    d = withDecision(d, 'class-choices', { 'grand-discovery-L20': ['true-mutagen'] });
    const r = resolve(atLevel(d, 20));
    const grand = r.slots.find((s) => s.id === 'grand-discovery-L20');
    expect(grand, 'grand-discovery slot missing at level 20').toBeTruthy();
    expect(grand!.selected).toContain('true-mutagen');
    expect(grand!.options.some((o) => o.id === 'awakened-intellect')).toBe(true);
    // The capstone pick isn't offered before 20th.
    expect(resolve(atLevel(d, 19)).slots.some((s) => s.id === 'grand-discovery-L20')).toBe(false);
  });
  it('an oracle shows its mystery final revelation at 20, and nothing there without a mystery', () => {
    let d = newCharacter('t-oracle', 'Alahra');
    d = withDecision(d, 'ability-base', { str: 8, dex: 12, con: 12, int: 10, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'oracle');
    const withMystery = resolve(atLevel(withDecision(d, 'class-choices', { mystery: ['battle'] }), 20));
    expect(withMystery.sheet.progression[19].features).toContain('Final Revelation');
    const noMystery = resolve(atLevel(d, 20));
    expect(noMystery.sheet.progression[19].features).not.toContain('Final Revelation');
  });
  it('an oracle shows its chosen curse deepening at 1/5/10/15', () => {
    let d = newCharacter('t-oracle2', 'Seer');
    d = withDecision(d, 'ability-base', { str: 8, dex: 12, con: 12, int: 10, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'oracle');
    d = withDecision(d, 'class-choices', { curse: ['clouded-vision'] });
    const r = resolve(atLevel(d, 15));
    expect(r.sheet.progression[0].features).toContain('Clouded Vision');   // 1st
    expect(r.sheet.progression[9].features).toContain('Clouded Vision');   // 10th — blindsense tier
    expect(r.sheet.progression[14].features).toContain('Clouded Vision');  // 15th
    expect(r.sheet.progression[1].features).not.toContain('Clouded Vision'); // nothing new at 2nd
  });
  it('an evocation wizard shows its school powers (Force Missile + Intense Spells at 1, Elemental Wall at 8)', () => {
    let d = newCharacter('t-wiz', 'Ezren');
    d = withDecision(d, 'ability-base', { str: 8, dex: 12, con: 12, int: 16, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'wizard');
    d = withDecision(d, 'class-choices', { school: ['evocation'] });
    const r = resolve(atLevel(d, 8));
    expect(r.sheet.progression[0].features).toContain('Force Missile');   // 1st
    expect(r.sheet.progression[0].features).toContain('Intense Spells');  // 1st (two powers)
    expect(r.sheet.progression[7].features).toContain('Elemental Wall');  // 8th
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
  it('shaken (and sickened) also apply −2 to skill checks', () => {
    const base = resolve({ ...humanFighter1(), play: play([]) }).sheet.stats['skill:perception'].total;
    expect(resolve({ ...humanFighter1(), play: play(['shaken']) }).sheet.stats['skill:perception'].total).toBe(base - 2);
    expect(resolve({ ...humanFighter1(), play: play(['sickened']) }).sheet.stats['skill:perception'].total).toBe(base - 2);
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
  // The bonus slot is now modelled as a distinct, restricted slot (bonusSlot) rather than +1 to the
  // per-day count — so the count is the true base and the restriction can be enforced.
  function cleric(domains: string[]): CharacterDoc {
    let d = newCharacter('t-cle-dom', 'Kore');
    d = withDecision(d, 'ability-base', { str: 10, dex: 12, con: 12, int: 10, wis: 16, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'class', 'cleric');
    d = withDecision(d, 'class-choices', { domains });
    return atLevel(d, 7);
  }
  const block = (d: CharacterDoc) => resolve(d).sheet.casting[0];

  it('leaves the per-day count at its true base (no +1 approximation)', () => {
    // Base [4,5,4,3,1] (Wis 16 = +3 bonus at levels 1–3) — the domain slot is separate now.
    expect(block(cleric(['war', 'healing'])).slots).toEqual([4, 5, 4, 3, 1]);
  });

  it('gives a cleric a domain bonus slot whose allowed spells union the two domains', () => {
    const bs = block(cleric(['war', 'healing'])).bonusSlot!;
    expect(bs.kind).toBe('domain');
    // War 1 = magic weapon, Healing 1 = cure light wounds; both are offered at level 1.
    expect(bs.allowedByLevel![1].sort()).toEqual(['cure-light-wounds', 'magic-weapon'].sort());
    // Healing 6 = heal (War 6 = blade barrier); both at 6.
    expect(bs.allowedByLevel![6].sort()).toEqual(['blade-barrier', 'heal'].sort());
  });

  it('a cleric without domains gets no bonus slot', () => {
    expect(block(cleric([])).bonusSlot).toBeUndefined();
  });

  it('a specialist wizard gets a school-restricted bonus slot; a universalist gets none', () => {
    const wiz = (school: string) => {
      let d = newCharacter('t-wiz-' + school, 'Nyx');
      d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 });
      d = withDecision(d, 'race', 'human');
      d = withDecision(d, 'floating-bonus', ['int']);
      d = withDecision(d, 'class', 'wizard');
      d = withDecision(d, 'class-choices', { school: [school] });
      return resolve(atLevel(d, 1)).sheet.casting[0];
    };
    // Base count unchanged now: Int 18 (+4) → base 1 + 1 Int bonus = 2 first-level (no +1).
    expect(wiz('evocation').slots![1]).toBe(2);
    expect(wiz('evocation').bonusSlot).toEqual({ kind: 'school', label: 'Evocation', school: 'Evocation' });
    expect(wiz('universalist').bonusSlot).toBeUndefined();
  });
});

describe('per-list spell levels', () => {
  it('spellLevelOn returns the per-list override, else the flat level', () => {
    const at = (id: string, list: string) => C.spellLevelOn(C.spellById.get(id)!, list);
    expect(at('hold-monster', 'bard')).toBe(4);   // bard 4
    expect(at('hold-monster', 'arcane')).toBe(5); // sorc/wiz 5 (the flat level)
    expect(at('hold-person', 'divine')).toBe(2);  // cleric 2 (flat)
    expect(at('hold-person', 'arcane')).toBe(3);  // sorc/wiz 3
    expect(at('dispel-magic', 'druid')).toBe(4);  // druid 4
    expect(at('dispel-magic', 'arcane')).toBe(3); // sorc/wiz 3 (flat)
  });

  it('the multi-list audit: druid gets the cure/utility lines a level or two later', () => {
    const at = (id: string, list: string) => C.spellLevelOn(C.spellById.get(id)!, list);
    // The druid cure line trails the cleric line by one.
    expect([at('cure-moderate-wounds', 'divine'), at('cure-moderate-wounds', 'druid')]).toEqual([2, 3]);
    expect([at('cure-serious-wounds', 'divine'), at('cure-serious-wounds', 'druid')]).toEqual([3, 4]);
    expect([at('cure-critical-wounds', 'divine'), at('cure-critical-wounds', 'druid')]).toEqual([4, 5]);
    // Druid gets these later than the arcane/cleric list.
    expect([at('wall-of-fire', 'arcane'), at('wall-of-fire', 'druid')]).toEqual([4, 5]);
    expect([at('stoneskin', 'arcane'), at('stoneskin', 'druid')]).toEqual([4, 5]);
    expect([at('true-seeing', 'divine'), at('true-seeing', 'druid')]).toEqual([5, 7]);
    expect([at('heal', 'divine'), at('heal', 'druid')]).toEqual([6, 7]);
    expect([at('regenerate', 'divine'), at('regenerate', 'druid')]).toEqual([7, 9]);
    // A few cleric offsets from the arcane flat level.
    expect([at('banishment', 'arcane'), at('banishment', 'divine')]).toEqual([7, 6]);
    expect([at('antimagic-field', 'arcane'), at('antimagic-field', 'divine')]).toEqual([6, 8]);
    expect([at('locate-object', 'arcane'), at('locate-object', 'divine')]).toEqual([2, 3]);
    expect([at('bestow-curse', 'divine'), at('bestow-curse', 'arcane')]).toEqual([3, 4]);
  });

  it('list memberships: the mass-cure line is not druid, and a domain-only spell stays off the base list', () => {
    const lists = (id: string) => C.spellById.get(id)!.lists;
    // Druids get the single-target cure line but none of the mass cures.
    expect(lists('mass-cure-light-wounds')).not.toContain('druid');
    expect(lists('mass-cure-critical-wounds')).not.toContain('druid');
    expect(lists('cure-critical-wounds')).toContain('druid'); // the single-target one they do get
    // Wail of the Banshee is a Death-domain spell, not on the base cleric list — but the domain
    // still reaches it (domain access is by id, independent of the spell's lists).
    expect(lists('wail-of-the-banshee')).not.toContain('divine');
    expect(C.DOMAINS.find((d) => d.id === 'death')!.spells).toContain('wail-of-the-banshee');
    // Blindness/Deafness is bard/wizard 2 but cleric 3.
    expect(C.spellLevelOn(C.spellById.get('blindness')!, 'divine')).toBe(3);
  });

  // The builder's spell step files a spell at the caster's list level (spontaneous & prepared-book;
  // prepared-list casters like the cleric know the whole list and get no build-time pick).
  it('the spell step offers a divergent spell at the caster’s own list level', () => {
    const slotLevelOf = (cls: string, ability: 'int' | 'cha', spellId: string) => {
      let d = newCharacter('t-pll-' + cls, 'Lyra');
      d = withDecision(d, 'ability-base', { str: 10, dex: 12, con: 12, int: 16, wis: 12, cha: 16 });
      d = withDecision(d, 'race', 'human');
      d = withDecision(d, 'floating-bonus', [ability]);
      d = withDecision(d, 'class', cls);
      const slot = resolve(atLevel(d, 15)).slots.find((s) => s.step === 'spells' && (s.options ?? []).some((o) => o.id === spellId));
      return slot?.options?.find((o) => o.id === spellId)?.meta?.level;
    };
    expect(slotLevelOf('bard', 'cha', 'hold-monster')).toBe(4);
    expect(slotLevelOf('wizard', 'int', 'hold-monster')).toBe(5);
    expect(slotLevelOf('wizard', 'int', 'hold-person')).toBe(3);
  });
});

describe('bard spell-list completeness', () => {
  const bardLevelOf = (spellId: string) => {
    let d = newCharacter('t-bard', 'Melody');
    d = withDecision(d, 'ability-base', { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 18 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'class', 'bard');
    const slot = resolve(atLevel(d, 16)).slots.find((s) => s.step === 'spells' && (s.options ?? []).some((o) => o.id === spellId));
    return slot?.options?.find((o) => o.id === spellId)?.meta?.level;
  };

  it('bards now get the spells they were missing, at the correct bard level', () => {
    expect(bardLevelOf('identify')).toBe(1);
    expect(bardLevelOf('heroism')).toBe(2);   // bard 2, not the sorc/wiz 3
    expect(bardLevelOf('tongues')).toBe(2);
    expect(bardLevelOf('rage')).toBe(2);
    expect(bardLevelOf('confusion')).toBe(3);
    expect(bardLevelOf('see-invisibility')).toBe(3); // corrected from the flat 2
    expect(bardLevelOf('speak-with-animals')).toBe(3);
    expect(bardLevelOf('legend-lore')).toBe(4);
    expect(bardLevelOf('greater-heroism')).toBe(5);
    expect(bardLevelOf('shadow-walk')).toBe(5);
  });
});

describe('senses & innate spell-like abilities', () => {
  const sheetFor = (race: string) => {
    let d = newCharacter('t-innate-' + race, 'Zim');
    d = withDecision(d, 'ability-base', { str: 10, dex: 12, con: 12, int: 12, wis: 12, cha: 14 });
    d = withDecision(d, 'race', race);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'fighter');
    return resolve(d).sheet;
  };

  it('a gnome has low-light vision and its four 1/day spell-like abilities', () => {
    const s = sheetFor('gnome');
    expect(s.senses).toContain('Low-light vision');
    expect(s.spellLikeAbilities.map((a) => a.name).sort()).toEqual(['Dancing Lights', 'Ghost Sound', 'Prestidigitation', 'Speak with Animals']);
    expect(s.spellLikeAbilities.every((a) => a.uses === 1 && a.source === 'Gnome')).toBe(true);
    // Stable, unique pool ids so daily uses can be tracked apart.
    expect(new Set(s.spellLikeAbilities.map((a) => a.id)).size).toBe(4);
  });

  it('links a spell-like ability to its catalog spell and gives it a caster level', () => {
    const dark = sheetFor('tiefling').spellLikeAbilities.find((a) => a.name === 'Darkness')!;
    expect(dark.casterLevel).toBe(1);      // = character level (HD)
    expect(dark.spellId).toBe('darkness'); // linked to the catalog spell
    expect(dark.saveDc).toBeUndefined();   // darkness forces no save
  });

  it('scales the SLA caster level with character level', () => {
    let d = newCharacter('t-sla-cl');
    d = withDecision(d, 'ability-base', { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 });
    d = withDecision(d, 'race', 'tiefling');
    d = withDecision(d, 'class', 'fighter');
    const dark = resolve(atLevel(d, 6)).sheet.spellLikeAbilities.find((a) => a.name === 'Darkness')!;
    expect(dark.casterLevel).toBe(6);
  });

  it('computes the save DC (10 + spell level + Cha) for a save-bearing SLA', () => {
    let d = newCharacter('t-sla-dc');
    d = withDecision(d, 'ability-base', { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 });
    d = withDecision(d, 'race', 'aasimar');
    d = withDecision(d, 'heritage', 'musetouched'); // +2 Cha (→16, +3) and a Glitterdust SLA
    d = withDecision(d, 'class', 'fighter');
    const g = resolve(d).sheet.spellLikeAbilities.find((a) => a.name === 'Glitterdust')!;
    expect(g.spellId).toBe('glitterdust'); // level 2, Will negates
    expect(g.saveDc).toBe(10 + 2 + 3);     // = 15
  });

  it('leaves an SLA whose spell we lack unlinked but still caster-levelled', () => {
    // Undine's hydraulic push is the remaining racial SLA with no catalogue spell. This case used
    // to be the aasimar lawbringer's Continual Flame, which the CRB spell-completion pass linked.
    let d = newCharacter('t-sla-nolink');
    d = withDecision(d, 'ability-base', { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 });
    d = withDecision(d, 'race', 'undine');
    d = withDecision(d, 'class', 'fighter');
    const hp = resolve(d).sheet.spellLikeAbilities.find((a) => a.name === 'Hydraulic Push')!;
    expect(hp.spellId).toBeUndefined();
    expect(hp.saveDc).toBeUndefined();
    expect(hp.casterLevel).toBe(1);
  });

  it('links Continual Flame now that the spell exists, with no save of its own', () => {
    let d = newCharacter('t-sla-cf');
    d = withDecision(d, 'ability-base', { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 });
    d = withDecision(d, 'race', 'aasimar');
    d = withDecision(d, 'heritage', 'lawbringer');
    d = withDecision(d, 'class', 'fighter');
    const cf = resolve(d).sheet.spellLikeAbilities.find((a) => a.name === 'Continual Flame')!;
    expect(cf.spellId).toBe('continual-flame');
    expect(cf.saveDc).toBeUndefined();   // the spell allows no save
    expect(cf.casterLevel).toBe(1);
  });

  it('a tiefling has darkvision and the darkness SLA; a human has neither', () => {
    const tf = sheetFor('tiefling');
    expect(tf.senses).toContain('Darkvision 60 ft');
    expect(tf.spellLikeAbilities.map((a) => a.name)).toContain('Darkness');
    const human = sheetFor('human');
    expect(human.senses).toEqual([]);
    expect(human.spellLikeAbilities).toEqual([]);
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

describe('size, Weapon Finesse, and Strength-penalty damage', () => {
  const attack = (d: CharacterDoc, id: string) => resolve(d).sheet.attacks.find((a) => a.id === id)!;

  // Halfling (Small, +2 Dex, −2 Str): base Str 12 → 10 (+0), base Dex 14 → 16 (+3).
  function halfling(feats: Record<string, string> = {}): CharacterDoc {
    let d = newCharacter('t-small', 'Pip');
    d = withDecision(d, 'ability-base', { str: 12, dex: 14, con: 12, int: 12, wis: 12, cha: 10 });
    d = withDecision(d, 'race', 'halfling');
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'fighter');
    if (Object.keys(feats).length) d = withDecision(d, 'feats', feats);
    return { ...d, purchases: { rapier: 1, longsword: 1, greatsword: 1 },
      equipped: { armor: null, mainHand: 'rapier', offHand: null } };
  }

  it("sizes a Small character's weapon damage die down", () => {
    const d = halfling(); // Str 0, so no damage modifier — just the die
    expect(attack(d, 'rapier').damage).toBe('1d4');      // 1d6 → 1d4
    expect(attack(d, 'longsword').damage).toBe('1d6');   // 1d8 → 1d6
    expect(attack(d, 'greatsword').damage).toBe('1d8');  // 2d6 → 1d8
  });

  it('Weapon Finesse swaps Dex for Str on a finessable melee weapon only', () => {
    const d = halfling({ 'feat-1': 'weapon-finesse' });
    // Rapier is finessable: BAB 1 + size 1 + Dex 3 (finesse) = 5, vs Str-based 2 without it.
    expect(attack(d, 'rapier').bonuses).toEqual([5]);
    expect(attack(d, 'rapier').attackLines).toContainEqual({ label: 'Weapon Finesse (Dex for Str)', value: 3 });
    // Longsword is one-handed and not an exception, so it keeps Str: BAB 1 + Str 0 + size 1 = 2.
    expect(attack(d, 'longsword').bonuses).toEqual([2]);
    expect(attack(d, 'longsword').attackLines).not.toContainEqual({ label: 'Weapon Finesse (Dex for Str)', value: 3 });
  });

  it('without the feat, a rapier still uses Strength', () => {
    expect(attack(halfling(), 'rapier').bonuses).toEqual([2]); // BAB 1 + Str 0 + size 1
  });

  it('gives a Small biped ¾ carrying capacity', () => {
    const load = resolve(halfling()).sheet.load; // Str 10
    expect(load.light).toBe(24);  // floor(33 × ¾)
    expect(load.medium).toBe(49); // floor(66 × ¾)
    expect(load.heavy).toBe(75);  // floor(100 × ¾)
  });

  // Medium fighter with Str 8 (−1): the +2 floating bonus goes to Dex, leaving Str low.
  function lowStrFighter(): CharacterDoc {
    let d = newCharacter('t-lowstr', 'Weakling');
    d = withDecision(d, 'ability-base', { str: 8, dex: 12, con: 12, int: 10, wis: 10, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['dex']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'fighter');
    return { ...d, purchases: { greatsword: 1, longsword: 1 },
      equipped: { armor: null, mainHand: 'greatsword', offHand: null } };
  }

  it('applies a Strength penalty in full — never multiplied by the two-handed 1½×', () => {
    const d = lowStrFighter(); // Str 8 → −1
    expect(attack(d, 'greatsword').damage).toBe('2d6−1'); // not −2
    expect(attack(d, 'longsword').damage).toBe('1d8−1');
    expect(attack(d, 'greatsword').damageLines).toContainEqual({ label: 'Str modifier', value: -1 });
  });
});

describe('Weapon Finesse from class grants', () => {
  const attack = (d: CharacterDoc, id: string) => resolve(d).sheet.attacks.find((a) => a.id === id)!;
  const FINESSE_LINE = { label: 'Weapon Finesse (Dex for Str)', value: 2 };

  // Elf rogue: Str 12 (+1), Dex 14 → 16 (+3). Finesse benefit on a light/finessable weapon = +2.
  function rogue(level: number, talents: Record<string, string[]> = {}): CharacterDoc {
    let d = newCharacter('t-rogue-fin', 'Sly');
    d = withDecision(d, 'ability-base', { str: 12, dex: 14, con: 12, int: 12, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'elf'); // +2 Dex → 16; Str unaffected at 12
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'rogue');
    if (Object.keys(talents).length) d = withDecision(d, 'class-choices', talents);
    return { ...atLevel(d, level), purchases: { rapier: 1, longsword: 1 },
      equipped: { armor: null, mainHand: 'rapier', offHand: null } };
  }

  it('Finesse Rogue talent grants standard Weapon Finesse', () => {
    const d = rogue(2, { 'rogue-talent-L2': ['finesse-rogue'] }); // rogue BAB +1
    expect(attack(d, 'rapier').bonuses).toEqual([4]); // BAB 1 + Str 1 + finesse 2
    expect(attack(d, 'rapier').attackLines).toContainEqual(FINESSE_LINE);
    expect(attack(d, 'longsword').bonuses).toEqual([2]); // slashing, not finessable
  });

  it('a rogue without the talent does not get finesse', () => {
    const d = rogue(2); // no talents selected
    expect(attack(d, 'rapier').bonuses).toEqual([2]); // BAB 1 + Str 1, no finesse
    expect(attack(d, 'rapier').attackLines).not.toContainEqual(FINESSE_LINE);
  });

  it('does not leak a talent picked at a higher, suspended level', () => {
    // The pick lives at rogue level 4, but the character is only level 2 → not yet gained.
    const d = rogue(2, { 'rogue-talent-L4': ['finesse-rogue'] });
    expect(attack(d, 'rapier').attackLines).not.toContainEqual(FINESSE_LINE);
  });

  // Human swashbuckler: Str 12 (+1), Dex 14 → 16 (+3). Full BAB → +1 at level 1.
  function swashbuckler(): CharacterDoc {
    let d = newCharacter('t-swb', 'Zorro');
    d = withDecision(d, 'ability-base', { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 14 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['dex']); // Dex 16 (+3)
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'swashbuckler');
    return { ...d, purchases: { rapier: 1, shortspear: 1, dagger: 1, longsword: 1, whip: 1 },
      equipped: { armor: null, mainHand: 'rapier', offHand: null } };
  }

  it('Swashbuckler Finesse covers light and one-handed piercing weapons', () => {
    const d = swashbuckler();
    expect(attack(d, 'rapier').bonuses).toEqual([4]);     // one-handed piercing: BAB 1 + Str 1 + finesse 2
    expect(attack(d, 'shortspear').bonuses).toEqual([4]); // one-handed piercing (not a named exception)
    expect(attack(d, 'dagger').bonuses).toEqual([4]);     // light
    expect(attack(d, 'rapier').attackLines).toContainEqual(FINESSE_LINE);
  });

  it('Swashbuckler Finesse excludes one-handed slashing weapons — even the whip', () => {
    const d = swashbuckler();
    expect(attack(d, 'longsword').bonuses).toEqual([2]); // one-handed slashing
    expect(attack(d, 'longsword').attackLines).not.toContainEqual(FINESSE_LINE);
    // The whip is a *standard* finesse exception, but Swashbuckler Finesse (piercing only) skips it.
    expect(attack(d, 'whip').attackLines).not.toContainEqual(FINESSE_LINE);
  });
});

describe('feat-granting talents (Combat Trick, Weapon Training)', () => {
  const attack = (d: CharacterDoc, id: string) => resolve(d).sheet.attacks.find((a) => a.id === id)!;
  const slotOf = (d: CharacterDoc, id: string) => resolve(d).slots.find((s) => s.id === id);
  const granted = (d: CharacterDoc) => resolve(d).sheet.grantedFeats;

  // Elf rogue: Str 12 (+1), Dex 14 → 16 (+3), rogue BAB +1 at level 2. A rapier is owned for the
  // Weapon Training case; talents live in `class-choices` under the rogue-talent-L<n> slots.
  function rogue(talents: Record<string, string[]>, feats: Record<string, string> = {}, params: Record<string, string> = {}): CharacterDoc {
    let d = newCharacter('t-talent-feat', 'Sly');
    d = withDecision(d, 'ability-base', { str: 12, dex: 14, con: 12, int: 12, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'elf');
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'rogue');
    d = withDecision(d, 'class-choices', talents);
    if (Object.keys(feats).length) d = withDecision(d, 'feats', feats);
    if (Object.keys(params).length) d = withDecision(d, 'feat-params', params);
    return { ...atLevel(d, 2), purchases: { rapier: 1 }, equipped: { armor: null, mainHand: 'rapier', offHand: null } };
  }

  it('Combat Trick opens a combat-only feat slot', () => {
    const d = rogue({ 'rogue-talent-L2': ['combat-trick'] });
    const slot = slotOf(d, 'feat-talent-rogue-talent-L2');
    expect(slot).toBeDefined();
    expect(slot!.step).toBe('feats');
    // The Feats step only renders slots whose id starts with `feat`, so the key must follow suit.
    expect(slot!.id.startsWith('feat')).toBe(true);
    // Combat-only: every offered option is a combat feat, and non-combat feats are absent.
    expect(slot!.options.every((o) => C.featById.get(o.id)?.types.includes('combat'))).toBe(true);
    expect(slot!.options.some((o) => o.id === 'toughness')).toBe(false); // general feat, filtered out
    // An unfilled slot nags like any other feat slot.
    expect(resolve(d).issues.some((i) => i.slot === 'feat-talent-rogue-talent-L2')).toBe(true);
  });

  it('the "Feat" advanced talent opens an any-feat slot', () => {
    // Advanced talents come at rogue 10; the "Feat" talent grants a bonus feat of any type.
    let d = newCharacter('t-adv-feat', 'Sly');
    d = withDecision(d, 'ability-base', { str: 12, dex: 14, con: 12, int: 12, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'elf');
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'rogue');
    d = withDecision(d, 'class-choices', { 'rogue-adv-talent-L10': ['advanced-feat'] });
    d = atLevel(d, 10);
    const slot = slotOf(d, 'feat-talent-rogue-adv-talent-L10');
    expect(slot).toBeDefined();
    expect(slot!.id.startsWith('feat')).toBe(true);
    // Not combat-only: a general feat like Toughness is on offer here, unlike the Combat Trick slot.
    expect(slot!.options.some((o) => o.id === 'toughness')).toBe(true);
  });

  it('a feat placed in the Combat Trick slot takes effect', () => {
    const base = resolve(rogue({ 'rogue-talent-L2': ['combat-trick'] })).sheet.stats['init'].total; // Dex +3
    const d = rogue({ 'rogue-talent-L2': ['combat-trick'] }, { 'feat-talent-rogue-talent-L2': 'improved-initiative' });
    expect(resolve(d).sheet.feats).toContain('improved-initiative');
    expect(resolve(d).sheet.stats['init'].total).toBe(base + 4); // Improved Initiative
  });

  it('Weapon Training grants a parameterised Weapon Focus', () => {
    const d = rogue({ 'rogue-talent-L2': ['weapon-training-talent'] });
    const wf = granted(d).find((g) => g.featId === 'weapon-focus');
    expect(wf).toBeDefined();
    expect(wf!.note).toBe('from Weapon Training');
    expect(wf!.param?.key).toBe('talent-granted:rogue-talent-L2');
    expect(resolve(d).sheet.feats).toContain('weapon-focus'); // counts for prerequisites
  });

  it('the chosen Weapon Training weapon gets the +1', () => {
    const without = rogue({ 'rogue-talent-L2': ['weapon-training-talent'] });
    expect(attack(without, 'rapier').bonuses).toEqual([2]); // BAB 1 + Str 1, weapon unset
    const d = rogue({ 'rogue-talent-L2': ['weapon-training-talent'] }, {}, { 'talent-granted:rogue-talent-L2': 'rapier' });
    expect(attack(d, 'rapier').bonuses).toEqual([3]); // + Weapon Focus
    expect(attack(d, 'rapier').attackLines).toContainEqual({ label: 'Weapon Focus', value: 1 });
  });

  it('does not grant from a talent picked at a higher, suspended level', () => {
    const d = rogue({ 'rogue-talent-L4': ['weapon-training-talent'] }); // gained at rogue 4, viewed at 2
    expect(granted(d).some((g) => g.featId === 'weapon-focus')).toBe(false);
    expect(slotOf(rogue({ 'rogue-talent-L4': ['combat-trick'] }), 'feat-talent-rogue-talent-L4')).toBeUndefined();
  });
});

describe('class and race feat grants', () => {
  const granted = (d: CharacterDoc) => resolve(d).sheet.grantedFeats;

  function base(id: string, race: string, cls: string): CharacterDoc {
    let d = newCharacter(id, 'Gr+');
    d = withDecision(d, 'ability-base', { str: 12, dex: 12, con: 12, int: 10, wis: 10, cha: 10 });
    d = withDecision(d, 'race', race);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    return d;
  }

  it('the skald gains Scribe Scroll as a class feat', () => {
    const d = base('t-skald', 'human', 'skald');
    expect(granted(d).some((g) => g.featId === 'scribe-scroll')).toBe(true);
    expect(resolve(d).sheet.feats).toContain('scribe-scroll');
  });

  it('half-elf Adaptability grants a parameterised Skill Focus that applies', () => {
    const d = base('t-halfelf', 'half-elf', 'fighter');
    const sf = granted(d).find((g) => g.featId === 'skill-focus');
    expect(sf).toBeDefined();
    expect(sf!.note).toBe('from Adaptability');
    expect(sf!.param?.key).toBe('granted-race:halfelf-adaptability');
    // Choosing a skill applies Skill Focus's +3 to it.
    const withSkill = withDecision(d, 'feat-params', { 'granted-race:halfelf-adaptability': 'perception' });
    const bump = resolve(withSkill).sheet.stats['skill:perception'].total - resolve(d).sheet.stats['skill:perception'].total;
    expect(bump).toBe(3);
  });

  it('half-orc Shaman\'s Apprentice grants Endurance, unlocking Diehard as a prerequisite', () => {
    let d = base('t-halforc', 'half-orc', 'fighter');
    d = withDecision(d, 'alt-traits', ['halforc-shamans-apprentice']);
    expect(resolve(d).sheet.feats).toContain('endurance');
    const diehard = resolve(d).slots.find((s) => s.id === 'feat-1')?.options.find((o) => o.id === 'diehard');
    expect(diehard?.legal).toBe(true); // Endurance prerequisite is now met
  });

  it('elf Fleet-Footed grants the Run feat', () => {
    let d = base('t-elf', 'elf', 'fighter');
    d = withDecision(d, 'alt-traits', ['elf-fleet-footed']);
    expect(resolve(d).sheet.feats).toContain('run');
  });

  it('the necromancy school grants Power over Undead as a feat choice', () => {
    let d = base('t-necro', 'human', 'wizard');
    d = withDecision(d, 'class-choices', { school: ['necromancy'] });
    const g = resolve(d).sheet.grantedFeats.find((x) => x.name === 'Power over Undead');
    expect(g).toBeDefined();
    expect(g!.choice?.options.map((o) => o.id)).toEqual(['command-undead', 'turn-undead']);
    // Unresolved choice contributes no feat (its prerequisites are bypassed once chosen).
    expect(resolve(d).sheet.feats).not.toContain('command-undead');
    expect(resolve(d).sheet.feats).not.toContain('turn-undead');
    // Picking one grants exactly that feat.
    const chosen = withDecision(d, 'feat-params', { 'granted-source:wiz-school-necromancy-1': 'turn-undead' });
    expect(resolve(chosen).sheet.feats).toContain('turn-undead');
    expect(resolve(chosen).sheet.feats).not.toContain('command-undead');
  });

  it("the shield order's Stem the Tide grants Stand Still at level 8", () => {
    let d = base('t-cav', 'human', 'cavalier');
    d = withDecision(d, 'class-choices', { order: ['shield'] });
    expect(resolve(d).sheet.feats).not.toContain('stand-still'); // level 1: not yet gained
    d = atLevel(d, 8);
    expect(resolve(d).sheet.feats).toContain('stand-still'); // bonus feat, Combat Reflexes prereq bypassed
    expect(resolve(d).sheet.grantedFeats.some((g) => g.featId === 'stand-still' && g.note === 'from Stem the Tide')).toBe(true);
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

  it('Improved Critical doubles the chosen weapon’s threat range, and only that weapon', () => {
    let d = newCharacter('t-ic', 'Critster');
    d = withDecision(d, 'ability-base', { str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'fighter');
    d = withDecision(d, 'feats', { 'feat-1': 'improved-critical' });
    d = withDecision(d, 'feat-params', { 'feat-1': 'longsword' });
    d = { ...atLevel(d, 8), purchases: { longsword: 1, greataxe: 1 }, equipped: { armor: null, mainHand: 'longsword', offHand: null } };
    const at = (id: string) => resolve(d).sheet.attacks.find((a) => a.id === id)!;
    expect(at('longsword').crit).toBe('17–20/×2'); // longsword 19–20 doubled
    expect(at('greataxe').crit).toBe('×3'); // the feat named the longsword, so this is untouched
    expect(at('longsword').notes.some((n) => n.startsWith('Improved Critical'))).toBe(true);
  });

  it('Improved Critical does not stack with keen — the range doubles once, not twice', () => {
    let d = newCharacter('t-ick', 'Critster');
    d = withDecision(d, 'ability-base', { str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'fighter');
    d = withDecision(d, 'feats', { 'feat-1': 'improved-critical' });
    d = withDecision(d, 'feat-params', { 'feat-1': 'longsword' });
    d = withDecision(d, 'item-quality', { longsword: { masterwork: true, enhancement: 1, properties: ['keen'] } });
    d = { ...atLevel(d, 8), purchases: { longsword: 1 }, equipped: { armor: null, mainHand: 'longsword', offHand: null } };
    // Both keen and Improved Critical apply, but 19–20 doubles to 17–20 — never to 15–20.
    expect(resolve(d).sheet.attacks.find((a) => a.id === 'longsword')!.crit).toBe('17–20/×2');
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

describe('racial natural attacks', () => {
  function naturalRacial(raceId: string): CharacterDoc {
    let d = newCharacter('t-nat-' + raceId);
    d = withDecision(d, 'ability-base', { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 });
    d = withDecision(d, 'race', raceId);
    d = withDecision(d, 'class', 'fighter');
    return d;
  }
  const nat = (d: CharacterDoc) => resolve(d).sheet.attacks.filter((a) => a.slot === 'natural');
  const strMod = (d: CharacterDoc) => Math.floor((resolve(d).sheet.stats['ability:str'].total - 10) / 2);
  const meleeTotal = (d: CharacterDoc) => resolve(d).sheet.stats['attack:melee'].total;
  const strLine = (a: { damageLines: { label: string; value: number }[] }) =>
    a.damageLines.find((l) => l.label.startsWith('Str modifier'))!.value;

  it('gives a lizardfolk a bite and a two-claw line, both primary at the full melee bonus', () => {
    const d = naturalRacial('lizardfolk');
    const lines = nat(d);
    expect(lines.map((l) => l.id).sort()).toEqual(['natural-bite', 'natural-claw']);
    const bite = lines.find((l) => l.id === 'natural-bite')!;
    const claw = lines.find((l) => l.id === 'natural-claw')!;
    expect(claw.name).toBe('Claw (×2)');
    // Three natural attacks total, so none is "sole": full (1x) Str, no penalty.
    expect(bite.bonuses).toEqual([meleeTotal(d)]);
    expect(claw.bonuses).toEqual([meleeTotal(d)]);
    expect(strLine(bite)).toBe(strMod(d));
    expect(bite.damage).toBe(`1d3+${strMod(d)}`);
    expect(claw.damage).toBe(`1d4+${strMod(d)}`);
    expect(bite.dmgType).toBe('B/P/S');
    expect(claw.dmgType).toBe('S');
  });

  it("adds 1.5x Str to a tengu's lone bite", () => {
    const d = naturalRacial('tengu');
    const lines = nat(d);
    expect(lines).toHaveLength(1);
    const bite = lines[0];
    expect(bite.bonuses).toEqual([meleeTotal(d)]);
    expect(strLine(bite)).toBe(Math.floor(strMod(d) * 1.5));
    expect(bite.damage).toBe(`1d3+${Math.floor(strMod(d) * 1.5)}`);
  });

  it('keeps two changeling claws at 1x Str (not sole)', () => {
    const d = naturalRacial('changeling');
    const claw = nat(d).find((l) => l.id === 'natural-claw')!;
    expect(claw.name).toBe('Claw (×2)');
    expect(strLine(claw)).toBe(strMod(d));
  });

  it('makes every natural attack secondary when also attacking with a weapon', () => {
    let d = naturalRacial('lizardfolk');
    d = { ...d, play: { ...emptyPlayState(), naturalWithWeapon: true } };
    const bite = nat(d).find((l) => l.id === 'natural-bite')!;
    // −5 to hit, ½ Str to damage.
    expect(bite.bonuses).toEqual([meleeTotal(naturalRacial('lizardfolk')) - 5]);
    expect(strLine(bite)).toBe(Math.floor(strMod(d) * 0.5));
  });

  it('gives a non-natural race no natural-attack lines', () => {
    let d = newCharacter('t-nat-human');
    d = withDecision(d, 'ability-base', { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'class', 'fighter');
    expect(resolve(d).sheet.attacks.filter((a) => a.slot === 'natural')).toHaveLength(0);
  });
});

describe('variant heritages', () => {
  function heritageChar(raceId: string, heritageId?: string): CharacterDoc {
    let d = newCharacter('t-her-' + raceId + (heritageId ?? ''));
    d = withDecision(d, 'ability-base', { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
    d = withDecision(d, 'race', raceId);
    d = withDecision(d, 'class', 'fighter');
    if (heritageId) d = withDecision(d, 'heritage', heritageId);
    return d;
  }
  const ab = (d: CharacterDoc, a: string) => resolve(d).sheet.stats[`ability:${a}`].total;
  const slas = (d: CharacterDoc) => resolve(d).sheet.spellLikeAbilities.map((s) => s.name);
  // These skills have no ranks and a 0 ability mod except where noted, so a +2 line is the racial
  // (Skilled) or heritage bonus — its presence/absence is what we are asserting.
  const skillRacial = (d: CharacterDoc, skill: string) =>
    resolve(d).sheet.stats[`skill:${skill}`].lines.some((l) => l.value === 2);

  it('a default aasimar keeps +2 Wis/+2 Cha, Daylight, and the Diplomacy/Perception skills', () => {
    const d = heritageChar('aasimar');
    expect(ab(d, 'wis')).toBe(12);
    expect(ab(d, 'cha')).toBe(12);
    expect(ab(d, 'str')).toBe(10);
    expect(slas(d)).toContain('Daylight');
    expect(skillRacial(d, 'diplomacy')).toBe(true);
    expect(skillRacial(d, 'perception')).toBe(true);
  });

  it('Angelkin swaps to +2 Str/+2 Cha, Alter Self, and Heal/Knowledge (planes)', () => {
    const d = heritageChar('aasimar', 'angelkin');
    expect(ab(d, 'str')).toBe(12);
    expect(ab(d, 'cha')).toBe(12);
    expect(ab(d, 'wis')).toBe(10); // default +2 Wis is gone
    expect(slas(d)).toContain('Alter Self');
    expect(slas(d)).not.toContain('Daylight'); // default SLA replaced
    expect(skillRacial(d, 'heal')).toBe(true);
    expect(skillRacial(d, 'know-planes')).toBe(true);
    // The default Diplomacy/Perception Skilled bonus is gone.
    expect(skillRacial(d, 'diplomacy')).toBe(false);
    // The ability breakdown attributes the bonus to the heritage.
    expect(resolve(d).sheet.stats['ability:str'].lines.some((l) => /Angelkin/.test(l.label))).toBe(true);
  });

  it('a tiefling Pitborn takes +2 Str/+2 Cha/−2 Int, Shatter, and drops the default Bluff/Stealth', () => {
    const d = heritageChar('tiefling', 'pitborn');
    expect(ab(d, 'str')).toBe(12);
    expect(ab(d, 'cha')).toBe(12);
    expect(ab(d, 'int')).toBe(8);
    // Default tiefling would be +2 Dex/+2 Int/−2 Cha — all replaced.
    expect(ab(d, 'dex')).toBe(10);
    expect(slas(d)).toContain('Shatter');
    expect(slas(d)).not.toContain('Darkness');
    expect(skillRacial(d, 'perception')).toBe(true);
    expect(skillRacial(d, 'bluff')).toBe(false);
  });

  it('offers a heritage choice slot for aasimar and none for a race without heritages', () => {
    const her = resolve(heritageChar('aasimar')).slots.find((s) => s.id === 'heritage');
    expect(her?.options.map((o) => o.id)).toContain('musetouched');
    expect(resolve(heritageChar('human')).slots.find((s) => s.id === 'heritage')).toBeUndefined();
  });
});

describe('movement modes', () => {
  function moverChar(raceId: string): CharacterDoc {
    let d = newCharacter('t-move-' + raceId);
    d = withDecision(d, 'ability-base', { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
    d = withDecision(d, 'race', raceId);
    d = withDecision(d, 'class', 'fighter');
    return d;
  }
  const swimBonus = (d: CharacterDoc) =>
    resolve(d).sheet.stats['skill:swim'].lines.filter((l) => l.value === 8).length;

  it('grants +8 Swim to a race with a swim speed (computed once, not per-trait)', () => {
    expect(swimBonus(moverChar('undine'))).toBe(1);   // was missing before — now computed
    expect(swimBonus(moverChar('lizardfolk'))).toBe(1); // trait effect removed, still exactly +8
  });

  it('grants +8 Climb to a race with a climb speed', () => {
    const climb = resolve(moverChar('grippli')).sheet.stats['skill:climb'].lines.filter((l) => l.value === 8).length;
    expect(climb).toBe(1);
  });

  it('gives no swim/climb bonus to a race without those speeds', () => {
    expect(swimBonus(moverChar('human'))).toBe(0);
  });

  it('slows every movement mode under heavy armour, not just the land speed', () => {
    const d = { ...moverChar('strix'), equipped: { armor: 'full-plate', mainHand: null, offHand: null } };
    const s = resolve(d).sheet.speed;
    expect(s.base).toBe(20);   // land 30 → 20
    expect(s.fly).toBe(40);    // fly 60 → 40
  });

  it('leaves movement modes at full value when unencumbered', () => {
    expect(resolve(moverChar('strix')).sheet.speed.fly).toBe(60);
  });
});

describe('favored-class alternative bonus', () => {
  function favoredChar(raceId: string, classId: string, level: number, fcb: 'hp' | 'skill' | 'alt'): CharacterDoc {
    let d = newCharacter('t-fcb-' + raceId + classId);
    d = withDecision(d, 'ability-base', { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 });
    d = withDecision(d, 'race', raceId);
    d = withDecision(d, 'class', classId);
    d = withDecision(d, 'favored-class', classId);
    d = withDecision(d, 'fcb', fcb);
    return atLevel(d, level);
  }

  it('accumulates a +1/6 human-rogue alternative and reports the completed whole', () => {
    const alt = resolve(favoredChar('human', 'rogue', 6, 'alt')).sheet.favoredClassAlt!;
    expect(alt.className).toBe('Rogue');
    expect(alt.desc).toMatch(/rogue talent/);
    expect(alt.count).toBe(6);       // 6 favored levels, all taking the alternative
    expect(alt.fraction).toBe(6);
    expect(alt.whole).toBe(1);       // 6 × 1/6 = one whole rogue talent
  });

  it('counts a whole (unfractioned) dwarf-fighter alternative per selection', () => {
    const alt = resolve(favoredChar('dwarf', 'fighter', 3, 'alt')).sheet.favoredClassAlt!;
    expect(alt.count).toBe(3);
    expect(alt.fraction).toBeUndefined();
    expect(alt.whole).toBe(3);
  });

  it('gives no HP or skill rank for a level spent on the alternative', () => {
    const withHp = resolve(favoredChar('human', 'rogue', 6, 'hp')).sheet.stats['hp:max'].total;
    const withAlt = resolve(favoredChar('human', 'rogue', 6, 'alt')).sheet.stats['hp:max'].total;
    expect(withHp - withAlt).toBe(6); // the 6 favored-class HP the alternative gave up
    expect(resolve(favoredChar('human', 'rogue', 6, 'alt')).sheet.favoredClassAlt!.count).toBe(6);
  });

  it('reports no alternative when none is taken, or the race has none for that class', () => {
    expect(resolve(favoredChar('human', 'rogue', 6, 'hp')).sheet.favoredClassAlt).toBeUndefined();
    // Tiefling has no favored-class-bonus table, so 'alt' resolves to nothing.
    expect(resolve(favoredChar('tiefling', 'fighter', 3, 'alt')).sheet.favoredClassAlt).toBeUndefined();
  });
});

describe('per-level feat prerequisites', () => {
  // Wizard is half-BAB: BAB +0 at level 1, +1 at level 3. Weapon Focus needs BAB +1, so it is
  // illegal in the 1st-level feat slot but legal in the 3rd-level slot — the prereq is judged at
  // the level the feat is gained, not at the final level.
  function wiz(feats: Record<string, string> = {}, params: Record<string, string> = {}, level = 3): CharacterDoc {
    let d = newCharacter('t-perlevel', 'Ellis');
    d = withDecision(d, 'ability-base', { str: 13, dex: 14, con: 13, int: 15, wis: 12, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'wizard');
    d = withDecision(d, 'feats', feats);
    d = withDecision(d, 'feat-params', params);
    return atLevel(d, level);
  }
  const optIn = (slots: ReturnType<typeof resolve>['slots'], slotId: string, optId: string) =>
    slots.find((s) => s.id === slotId)?.options.find((o) => o.id === optId);

  it('a BAB +1 feat is illegal in the level-1 slot but legal in the level-3 slot', () => {
    const r = resolve(wiz());
    const l1 = optIn(r.slots, 'feat-1', 'weapon-focus');
    const l3 = optIn(r.slots, 'feat-L3', 'weapon-focus');
    expect(l1?.legal).toBe(false);
    expect(l1?.whyNot).toMatch(/BAB \+1/);
    expect(l3?.legal).toBe(true);
  });

  it('warns when a feat placed in an early slot fails its prereq at that level', () => {
    const r = resolve(wiz({ 'feat-1': 'weapon-focus' }));
    const issue = r.issues.find((i) => i.slot === 'feat-1' && /Weapon Focus/i.test(i.message));
    expect(issue?.severity).toBe('error');
    expect(issue?.message).toMatch(/BAB \+1/);
  });

  it('does not warn when the same feat sits in a slot whose level meets the prereq', () => {
    const r = resolve(wiz({ 'feat-L3': 'weapon-focus' }));
    expect(r.issues.some((i) => i.slot === 'feat-L3' && /Weapon Focus/i.test(i.message))).toBe(false);
  });

  it('is unchanged for level-1 characters (per-level == final): a full-BAB feat is legal at level 1', () => {
    let d = newCharacter('t-ftr1', 'Val');
    d = withDecision(d, 'ability-base', { str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'fighter');
    const r = resolve(atLevel(d, 1)); // fighter is full-BAB → +1 at level 1
    expect(optIn(r.slots, 'feat-1', 'weapon-focus')?.legal).toBe(true);
  });
});

describe('archetypes (fighter proof-of-concept)', () => {
  function fighter(archetype?: string, level = 20): CharacterDoc {
    let d = newCharacter('t-arch', 'Val');
    d = withDecision(d, 'ability-base', { str: 15, dex: 14, con: 14, int: 10, wis: 12, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'fighter');
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  }
  const featsAt = (doc: CharacterDoc, level: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === level)?.features ?? [];

  it('standard fighter keeps Bravery and Armor Training', () => {
    expect(featsAt(fighter(), 2)).toContain('Bravery +1');
    expect(featsAt(fighter(), 3)).toContain('Armor Training 1');
  });

  it('Two-Handed Fighter swaps Bravery→Shattering Strike and Armor Training→Overhand Chop', () => {
    const d = fighter('two-handed-fighter');
    expect(featsAt(d, 2)).toContain('Shattering Strike');
    expect(featsAt(d, 2)).not.toContain('Bravery +1');
    expect(featsAt(d, 3)).toContain('Overhand Chop');
    expect(featsAt(d, 3)).not.toContain('Armor Training 1');
    expect(featsAt(d, 20)).toContain('Weapon Mastery'); // not replaced — stays
  });

  it('Weapon Master grants its own features and drops the replaced ones', () => {
    const d = fighter('weapon-master');
    expect(featsAt(d, 2)).toContain('Weapon Guard');
    expect(featsAt(d, 5)).toContain('Reliable Strike');
    expect(featsAt(d, 19)).toContain('Unstoppable Strike');
    expect(featsAt(d, 19)).not.toContain('Armor Mastery');
  });

  it('clearing the archetype restores the standard features', () => {
    expect(featsAt(fighter('weapon-master'), 2)).not.toContain('Bravery +1');
    expect(featsAt(fighter(), 2)).toContain('Bravery +1');
  });
});

describe('archetypes — extended model (proficiency + spellcasting)', () => {
  function ranger(archetype: string | undefined, level = 5): CharacterDoc {
    let d = newCharacter('t-ranger', 'Ari');
    d = withDecision(d, 'ability-base', { str: 14, dex: 15, con: 13, int: 10, wis: 14, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['dex']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'ranger');
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  }

  it('a standard ranger 5 casts; the Skirmisher removes spellcasting', () => {
    expect(resolve(ranger(undefined)).sheet.casting.length).toBeGreaterThan(0);
    expect(resolve(ranger('skirmisher')).sheet.casting.length).toBe(0);
  });

  it('the Skirmisher gains Hunter’s Tricks at 5th', () => {
    const feats5 = resolve(ranger('skirmisher')).sheet.progression.find((r) => r.level === 5)?.features ?? [];
    expect(feats5.some((f) => /Hunter’s Tricks/.test(f))).toBe(true);
  });

  it('effectiveClass applies weapon/armor proficiency changes and a spellcasting override', () => {
    const base = C.classById.get('fighter')!;
    const testClass = {
      ...base,
      archetypes: [{
        id: 'test-prof', classId: 'fighter', name: 'T', desc: 'T', replaces: [], grants: [],
        proficiencies: { weapons: { add: ['whip'], remove: ['martial'] }, armor: { remove: ['heavy' as const] } },
        spellcasting: { kind: 'spontaneous' as const, ability: 'cha' as const, list: 'bard' as const, slots1: [999, 1] },
      }],
    };
    const doc = withDecision(newCharacter('t-eff', 'X'), 'archetype', 'test-prof');
    const eff = effectiveClass(testClass, readDecisions(doc));
    expect(eff.proficiencies.weapons).toContain('whip');
    expect(eff.proficiencies.weapons).not.toContain('martial');
    expect(eff.proficiencies.armor).not.toContain('heavy');
    expect(eff.spellcasting?.list).toBe('bard');
  });
});

describe('archetypes — additional classes', () => {
  const build = (cls: string, archetype: string | undefined, level: number): CharacterDoc => {
    let d = newCharacter('t-arch2', 'X');
    d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 14, int: 10, wis: 12, cha: 12 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', cls === 'paladin' ? 'LG' : 'N');
    d = withDecision(d, 'class', cls);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];

  it('Rogue Thug replaces Trapfinding with Frightening and Trap Sense with Brutal Beating', () => {
    expect(featsAt(build('rogue', undefined, 3), 1)).toContain('Trapfinding');
    const t = build('rogue', 'thug', 3);
    expect(featsAt(t, 1)).toContain('Frightening');
    expect(featsAt(t, 1)).not.toContain('Trapfinding');
    expect(featsAt(t, 3)).toContain('Brutal Beating');
  });

  it('Barbarian Invulnerable Rager swaps DR / uncanny dodge for Invulnerability', () => {
    const ir = build('barbarian', 'invulnerable-rager', 7);
    expect(featsAt(ir, 2)).toContain('Invulnerability');
    expect(featsAt(ir, 2)).not.toContain('Uncanny Dodge');
    expect(featsAt(ir, 7)).not.toContain('Damage Reduction 1/—');
  });

  it('Paladin Warrior of the Holy Light removes spellcasting for Power of Faith', () => {
    expect(resolve(build('paladin', undefined, 6)).sheet.casting.length).toBeGreaterThan(0);
    const w = build('paladin', 'warrior-of-the-holy-light', 6);
    expect(resolve(w).sheet.casting.length).toBe(0);
    expect(featsAt(w, 4)).toContain('Power of Faith');
    expect(featsAt(w, 4)).not.toContain('Spellcasting');
  });
});

describe('archetypes — monk (feature-swap only)', () => {
  const monk = (archetype: string | undefined, level: number): CharacterDoc => {
    let d = newCharacter('t-monk', 'M');
    d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 12, int: 10, wis: 14, cha: 8 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['wis']);
    d = withDecision(d, 'alignment', 'LN');
    d = withDecision(d, 'class', 'monk');
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];
  const monkBonusFeatSlots = (doc: CharacterDoc) =>
    resolve(doc).slots.filter((s) => s.step === 'feats' && s.id.startsWith('feat-monk')).map((s) => s.id);

  it('Master of Many Styles swaps flurry for Fuse Style and perfect self for Perfect Style', () => {
    expect(featsAt(monk(undefined, 20), 1)).toContain('Flurry of Blows');
    const m = monk('master-of-many-styles', 20);
    expect(featsAt(m, 1)).toContain('Fuse Style');
    expect(featsAt(m, 1)).not.toContain('Flurry of Blows');
    expect(featsAt(m, 8)).toContain('Improved Fuse Style');
    expect(featsAt(m, 20)).toContain('Perfect Style');
    expect(featsAt(m, 20)).not.toContain('Perfect Self');
  });

  it('Zen Archer replaces flurry, stunning fist, and the defensive line with bow features', () => {
    const z = monk('zen-archer', 17);
    expect(featsAt(z, 1)).toContain('Flurry of Blows (bows)');
    expect(featsAt(z, 1)).toContain('Perfect Strike');
    expect(featsAt(z, 1)).not.toContain('Flurry of Blows');
    expect(featsAt(z, 1)).not.toContain('Stunning Fist');
    expect(featsAt(z, 3)).toContain('Zen Archery');
    expect(featsAt(z, 3)).not.toContain('Maneuver Training');
    expect(featsAt(z, 3)).not.toContain('Still Mind');
    expect(featsAt(z, 17)).toContain('Ki Focus Bow');
    expect(featsAt(z, 17)).not.toContain('Tongue of the Sun and Moon');
  });

  it('Sensei trades its 2nd/6th/10th/14th bonus feats for advisory abilities', () => {
    const stdSlots = monkBonusFeatSlots(monk(undefined, 20));
    expect(stdSlots).toContain('feat-monk-L2'); // standard monk has these bonus-feat slots
    expect(stdSlots).toContain('feat-monk-L6');
    const s = monk('sensei', 20);
    const slots = monkBonusFeatSlots(s);
    expect(slots).toContain('feat-monk');     // 1st-level bonus feat kept
    expect(slots).toContain('feat-monk-L18'); // 18th kept
    expect(slots).not.toContain('feat-monk-L2');
    expect(slots).not.toContain('feat-monk-L6');
    expect(slots).not.toContain('feat-monk-L10');
    expect(slots).not.toContain('feat-monk-L14');
    expect(featsAt(s, 1)).toContain('Advice');
    expect(featsAt(s, 2)).toContain('Insightful Strike');
    expect(featsAt(s, 6)).toContain('Mystic Wisdom');
    expect(featsAt(s, 1)).not.toContain('Flurry of Blows');
  });
});

describe('archetypes — class-skill changes (Cloistered Cleric)', () => {
  const cleric = (archetype: string | undefined, level: number): CharacterDoc => {
    let d = newCharacter('t-cc', 'C');
    d = withDecision(d, 'ability-base', { str: 10, dex: 12, con: 12, int: 12, wis: 16, cha: 12 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['wis']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'cleric');
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };

  it('adds Knowledge (all) to class skills; a standard cleric lacks them', () => {
    expect(resolve(cleric(undefined, 5)).sheet.classSkillIds).not.toContain('know-nature');
    const cc = resolve(cleric('cloistered-cleric', 5)).sheet.classSkillIds;
    expect(cc).toContain('know-nature');
    expect(cc).toContain('know-local');
    expect(cc).toContain('know-arcana'); // the cleric's original Knowledges remain
  });

  it('effectiveClass applies the diminished flag, one domain, and light-armor-only', () => {
    const base = C.classById.get('cleric')!;
    let d = withDecision(newCharacter('t-cc2', 'C'), 'class', 'cleric');
    d = withDecision(d, 'archetype', 'cloistered-cleric');
    const eff = effectiveClass(base, readDecisions(d));
    expect(eff.spellcasting?.diminished).toBe(true);
    expect((eff.choices ?? []).find((c) => c.id === 'domains')?.count).toBe(1);
    expect(eff.proficiencies.armor).toContain('light');
    expect(eff.proficiencies.armor).not.toContain('medium');
    expect(eff.proficiencies.armor).not.toContain('shield');
  });

  it('diminished cuts non-domain slots by one while keeping caster level', () => {
    const std = resolve(cleric(undefined, 9)).sheet.casting.find((b) => b.classId === 'cleric')!;
    const cc = resolve(cleric('cloistered-cleric', 9)).sheet.casting.find((b) => b.classId === 'cleric')!;
    expect(cc.diminished).toBe(true);
    expect(cc.casterLevel).toBe(std.casterLevel);
    for (let L = 1; L <= 5; L++) expect(cc.slots![L]).toBe(std.slots![L] - 1);
  });
});

describe('archetypes — breadth (Cavalier, Inquisitor, Druid)', () => {
  const build = (cls: string, archetype: string | undefined, level: number): CharacterDoc => {
    let d = newCharacter('t-breadth', 'X');
    d = withDecision(d, 'ability-base', { str: 14, dex: 13, con: 12, int: 12, wis: 14, cha: 12 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];
  const bonusFeatSlots = (doc: CharacterDoc, cls: string) =>
    resolve(doc).slots.filter((s) => s.step === 'feats' && s.id.startsWith(`feat-${cls}`)).map((s) => s.id);

  it('Cavalier Gendarme moves its bonus feats to 1/5/8/… and swaps out the tactician line', () => {
    const std = bonusFeatSlots(build('cavalier', undefined, 20), 'cavalier');
    expect(std).toContain('feat-cavalier-L6'); // standard cavalier feats at 6/12/18
    const g = build('cavalier', 'gendarme', 20);
    const slots = bonusFeatSlots(g, 'cavalier');
    expect(slots).toContain('feat-cavalier');     // 1st
    expect(slots).toContain('feat-cavalier-L5');
    expect(slots).toContain('feat-cavalier-L8');
    expect(slots).not.toContain('feat-cavalier-L6');
    expect(slots).not.toContain('feat-cavalier-L12');
    expect(featsAt(g, 20)).toContain('Transfixing Charge');
    expect(featsAt(g, 1)).not.toContain('Tactician');
  });

  it('Inquisitor Sanctified Slayer swaps judgment for Studied Target, Sneak Attack, and slayer talents', () => {
    expect(featsAt(build('inquisitor', undefined, 8), 1)).toContain('Judgment 1/day');
    const s = build('inquisitor', 'sanctified-slayer', 20);
    expect(featsAt(s, 1)).toContain('Studied Target');
    expect(featsAt(s, 1)).not.toContain('Judgment 1/day');
    expect(featsAt(s, 4)).toContain('Sneak Attack +1d6');
    expect(featsAt(s, 8)).toContain('Slayer Talent');
    expect(featsAt(s, 8)).not.toContain('Second Judgment');
    expect(featsAt(s, 20)).not.toContain('True Judgment');
    expect(resolve(s).sheet.casting.length).toBeGreaterThan(0); // still a caster
  });

  it('Aquatic Druid trades the woodland line for aquatic features, keeping spellcasting', () => {
    const a = build('druid', 'aquatic-druid', 13);
    expect(featsAt(a, 2)).toContain('Aquatic Adaptation');
    expect(featsAt(a, 2)).not.toContain('Woodland Stride');
    expect(featsAt(a, 3)).toContain('Natural Swimmer');
    expect(featsAt(a, 9)).toContain('Seaborn');
    expect(featsAt(a, 9)).not.toContain('Venom Immunity');
    expect(featsAt(a, 13)).toContain('Deep Diver');
    expect(resolve(a).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Wizard Scrollmaster swaps arcane bond for Scroll Blade/Shield and drops the arcane-bond pick', () => {
    expect(featsAt(build('wizard', undefined, 10), 1)).toContain('Arcane Bond');
    const w = build('wizard', 'scrollmaster', 10);
    expect(featsAt(w, 1)).toContain('Scroll Blade');
    expect(featsAt(w, 1)).toContain('Scroll Shield');
    expect(featsAt(w, 1)).not.toContain('Arcane Bond');
    expect(featsAt(w, 10)).toContain('Improved Scroll Casting');
    // The arcane-bond choice slot is gone; school + opposition remain.
    const choiceIds = resolve(w).slots.filter((s) => s.step === 'class').map((s) => s.id);
    expect(choiceIds).not.toContain('arcane-bond');
    expect(choiceIds).toContain('school');
    // The 10th-level wizard bonus feat is replaced (5/15/20 remain).
    const bf = resolve(w).slots.filter((s) => s.step === 'feats' && s.id.startsWith('feat-wizard')).map((s) => s.id);
    expect(bf).not.toContain('feat-wizard-L10');
    expect(bf).toContain('feat-wizard-L5');
    expect(resolve(w).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Witch Beast-Bonded removes the 4th/8th/10th hex picks and grants familiar features', () => {
    const hexSlots = (doc: CharacterDoc) =>
      resolve(doc).slots.filter((s) => s.step === 'class' && s.id.startsWith('hex')).map((s) => s.id);
    expect(hexSlots(build('witch', undefined, 20))).toContain('hex-L4'); // standard witch picks a hex at 4th
    const b = build('witch', 'beast-bonded', 20);
    const hexes = hexSlots(b);
    expect(hexes).not.toContain('hex-L4');
    expect(hexes).not.toContain('hex-L8');
    expect(hexes).not.toContain('hex-L10');
    expect(hexes).toContain('hex-L6'); // other hex picks remain
    expect(featsAt(b, 4)).toContain('Enhanced Familiar');
    expect(featsAt(b, 8)).toContain('Familiar Form');
    expect(featsAt(b, 10)).toContain('Twin Soul');
    expect(resolve(b).sheet.casting.length).toBeGreaterThan(0);
  });
});

describe('archetypes — source-power suppression (Tattooed Sorcerer)', () => {
  const sorcerer = (archetype: string | undefined, level: number): CharacterDoc => {
    let d = newCharacter('t-tat', 'S');
    d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 12, int: 10, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'sorcerer');
    d = withDecision(d, 'class-choices', { bloodline: ['draconic'] });
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];

  it('a standard draconic sorcerer gains the 1st- and 9th-level bloodline powers', () => {
    expect(featsAt(sorcerer(undefined, 9), 1)).toContain('Claws');
    expect(featsAt(sorcerer(undefined, 9), 9)).toContain('Breath Weapon');
  });

  it('Tattooed Sorcerer suppresses the 1st/9th bloodline powers and swaps in tattoo abilities', () => {
    const t = sorcerer('tattooed-sorcerer', 9);
    // 1st-level bloodline power (Claws) suppressed; Familiar Tattoo + Mage's Tattoo take its place.
    expect(featsAt(t, 1)).not.toContain('Claws');
    expect(featsAt(t, 1)).toContain('Familiar Tattoo');
    expect(featsAt(t, 1)).toContain('Mage’s Tattoo');
    expect(featsAt(t, 1)).not.toContain('Eschew Materials'); // replaced by Mage's Tattoo
    // 9th-level bloodline power (Breath Weapon) suppressed; Enhanced Magical Tattoo replaces it.
    expect(featsAt(t, 9)).not.toContain('Breath Weapon');
    expect(featsAt(t, 9)).toContain('Enhanced Magical Tattoo');
    // 7th-level bloodline feat replaced by Create Spell Tattoo.
    expect(featsAt(t, 7)).toContain('Create Spell Tattoo');
    expect(featsAt(t, 7)).not.toContain('Bloodline Feat');
    // Other bloodline powers (3rd) survive, and the sorcerer still casts.
    expect(featsAt(t, 3)).toContain('Dragon Resistances');
    expect(resolve(t).sheet.casting.length).toBeGreaterThan(0);
  });
});

describe('archetypes — breadth (Warpriest, Brawler, Investigator)', () => {
  const build = (cls: string, archetype: string | undefined, level: number): CharacterDoc => {
    let d = newCharacter('t-breadth2', 'X');
    d = withDecision(d, 'ability-base', { str: 14, dex: 13, con: 12, int: 13, wis: 14, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['wis']);
    d = withDecision(d, 'alignment', cls === 'warpriest' ? 'LN' : 'N');
    d = withDecision(d, 'class', cls);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];

  it('Warpriest Sacred Fist swaps sacred weapon/armor for monk-style unarmed combat and loses armor', () => {
    const s = build('warpriest', 'sacred-fist', 7);
    expect(featsAt(s, 1)).toContain('Flurry of Blows');
    expect(featsAt(s, 1)).toContain('Unarmed Strike');
    expect(featsAt(s, 1)).not.toContain('Sacred Weapon');
    expect(featsAt(s, 1)).not.toContain('Focus Weapon');
    expect(featsAt(s, 7)).toContain('Ki Pool');
    expect(featsAt(s, 7)).not.toContain('Sacred Armor');
    const eff = effectiveClass(C.classById.get('warpriest')!, readDecisions(build('warpriest', 'sacred-fist', 1)));
    expect(eff.proficiencies.armor).toEqual([]); // no armor at all
    expect(resolve(s).sheet.casting.length).toBeGreaterThan(0); // still a caster
  });

  it('Brawler Snakebite Striker swaps martial flexibility / maneuver training for sneak attack', () => {
    expect(featsAt(build('brawler', undefined, 3), 1)).toContain('Martial Flexibility');
    const s = build('brawler', 'snakebite-striker', 11);
    expect(featsAt(s, 1)).toContain('Sneak Attack +1d6');
    expect(featsAt(s, 1)).not.toContain('Martial Flexibility');
    expect(featsAt(s, 3)).toContain('Snake Feint');
    expect(featsAt(s, 3)).not.toContain('Maneuver Training');
    expect(featsAt(s, 11)).toContain('Opportunist');
  });

  it('Investigator Empiricist swaps poison lore / swift alchemy for observation-based abilities', () => {
    const e = build('investigator', 'empiricist', 20);
    expect(featsAt(e, 2)).toContain('Ceaseless Observation');
    expect(featsAt(e, 2)).not.toContain('Poison Lore / Resistance');
    expect(featsAt(e, 4)).toContain('Unfailing Logic');
    expect(featsAt(e, 4)).not.toContain('Swift Alchemy');
    expect(featsAt(e, 20)).toContain('Master Intellect');
    expect(featsAt(e, 20)).not.toContain('True Inspiration');
  });
});

describe('archetypes — breadth (Oracle, Bloodrager, Swashbuckler)', () => {
  const build = (cls: string, archetype: string | undefined, level: number, choices?: Record<string, string[]>): CharacterDoc => {
    let d = newCharacter('t-breadth3', 'X');
    d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 12, int: 13, wis: 12, cha: 14 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    if (choices) d = withDecision(d, 'class-choices', choices);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];

  it('Oracle Warsighted replaces the 1/7/11/15 revelations with Martial Flexibility', () => {
    const revSlots = (doc: CharacterDoc) =>
      resolve(doc).slots.filter((s) => s.step === 'class' && s.id.startsWith('revelation')).map((s) => s.id);
    expect(revSlots(build('oracle', undefined, 20))).toContain('revelation'); // standard oracle: 1st revelation
    const w = build('oracle', 'warsighted', 20);
    expect(featsAt(w, 1)).toContain('Martial Flexibility');
    const rev = revSlots(w);
    expect(rev).not.toContain('revelation');       // 1st revelation replaced
    expect(rev).not.toContain('revelation-L7');
    expect(rev).not.toContain('revelation-L11');
    expect(rev).not.toContain('revelation-L15');
    expect(rev).toContain('revelation-L3');         // 3rd and 19th remain
    expect(rev).toContain('revelation-L19');
    expect(resolve(w).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Bloodrager Steelblood gains heavy armor, swaps the defensive line, and loses class DR', () => {
    const std = resolve(build('bloodrager', undefined, 7, { bloodline: ['draconic'] }));
    expect(std.sheet.defenses.dr.length).toBeGreaterThan(0); // standard bloodrager has DR at 7th
    const s = build('bloodrager', 'steelblood', 7, { bloodline: ['draconic'] });
    expect(featsAt(s, 1)).toContain('Indomitable Stance');
    expect(featsAt(s, 1)).not.toContain('Fast Movement');
    expect(featsAt(s, 2)).toContain('Armored Swiftness');
    expect(featsAt(s, 7)).toContain('Blood Deflection');
    expect(featsAt(s, 7)).not.toContain('Damage Reduction 1/—');
    expect(resolve(s).sheet.defenses.dr).toEqual([]); // Blood Deflection replaces the numeric DR too
    const eff = effectiveClass(C.classById.get('bloodrager')!, readDecisions(build('bloodrager', 'steelblood', 1)));
    expect(eff.proficiencies.armor).toContain('heavy');
  });

  it('Swashbuckler Inspired Blade rebuilds panache and weapon features around the rapier', () => {
    const i = build('swashbuckler', 'inspired-blade', 20);
    expect(featsAt(i, 1)).toContain('Inspired Panache');
    expect(featsAt(i, 1)).toContain('Inspired Finesse');
    expect(featsAt(i, 1)).not.toContain('Panache');
    expect(featsAt(i, 1)).not.toContain('Swashbuckler Finesse');
    expect(featsAt(i, 5)).toContain('Rapier Training');
    expect(featsAt(i, 20)).toContain('Rapier Weapon Mastery');
    expect(featsAt(i, 20)).not.toContain('Swashbuckler Weapon Mastery');
  });
});

describe('archetypes — final classes (Hunter, Summoner, Skald, Shaman, Shifter)', () => {
  const build = (cls: string, archetype: string | undefined, level: number, choices?: Record<string, string[]>): CharacterDoc => {
    let d = newCharacter('t-final', 'X');
    d = withDecision(d, 'ability-base', { str: 13, dex: 13, con: 12, int: 12, wis: 14, cha: 13 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['wis']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    if (choices) d = withDecision(d, 'class-choices', choices);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];
  const bonusFeatSlots = (doc: CharacterDoc, cls: string) =>
    resolve(doc).slots.filter((s) => s.step === 'feats' && s.id.startsWith(`feat-${cls}`)).map((s) => s.id);

  it('Hunter Feral Hunter drops the companion line and its 6/9/12/15/18 teamwork feats', () => {
    const f = build('hunter', 'feral-hunter', 18);
    expect(featsAt(f, 1)).toContain('Feral Focus');
    expect(featsAt(f, 1)).not.toContain('Animal Companion');
    expect(featsAt(f, 4)).toContain('Wild Shape');
    expect(featsAt(f, 6)).toContain('Summon Pack');
    const bf = bonusFeatSlots(f, 'hunter');
    expect(bf).toContain('feat-hunter-L3');   // 3rd teamwork feat kept
    expect(bf).not.toContain('feat-hunter-L6');
    expect(bf).not.toContain('feat-hunter-L12');
    expect(resolve(f).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Summoner Master Summoner swaps eidolon/summon/shield/bond for summoning abilities', () => {
    const m = build('summoner', 'master-summoner', 6);
    expect(featsAt(m, 1)).toContain('Lesser Eidolon');
    expect(featsAt(m, 1)).toContain('Summoning Mastery');
    expect(featsAt(m, 1)).not.toContain('Eidolon');
    expect(featsAt(m, 2)).toContain('Augment Summoning');
    expect(featsAt(m, 2)).not.toContain('Bond Senses');
    expect(resolve(m).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Skald Spell Warrior swaps the song/kenning line for counterspell abilities', () => {
    const s = build('skald', 'spell-warrior', 20, { 'skald-rage-power': [] });
    expect(featsAt(s, 1)).toContain('Improved Counterspell');
    expect(featsAt(s, 1)).toContain('Weapon Song (Enhance Weapons)');
    expect(featsAt(s, 1)).not.toContain('Raging Song (Inspired Rage)');
    expect(featsAt(s, 5)).toContain('Greater Counterspell');
    expect(featsAt(s, 5)).not.toContain('Spell Kenning');
    expect(featsAt(s, 20)).toContain('Spell Tamper');
  });

  it('Shaman Speaker for the Past adds lore skills and swaps the familiar/wandering line', () => {
    expect(resolve(build('shaman', undefined, 5)).sheet.classSkillIds).not.toContain('know-history');
    const s = build('shaman', 'speaker-for-the-past', 6);
    expect(resolve(s).sheet.classSkillIds).toContain('know-history');
    expect(resolve(s).sheet.classSkillIds).toContain('use-magic-device');
    expect(featsAt(s, 1)).toContain('Mysteries of the Past');
    expect(featsAt(s, 1)).not.toContain('Spirit Animal');
    expect(featsAt(s, 4)).toContain('Revelations of the Past');
    expect(featsAt(s, 4)).not.toContain('Wandering Spirit');
  });

  it('Shifter Weretouched swaps aspect/empathy/wild shape for lycanthrope features', () => {
    const w = build('shifter', 'weretouched', 5);
    expect(featsAt(w, 1)).toContain('Lycanthrope Aspect');
    expect(featsAt(w, 1)).toContain('Lycanthropic Empathy');
    expect(featsAt(w, 1)).not.toContain('Shifter Aspect');
    expect(featsAt(w, 1)).not.toContain('Wild Empathy');
    expect(featsAt(w, 4)).toContain('Lycanthropic Wild Shape');
    expect(featsAt(w, 5)).toContain('Lycanthrope Aspect Enhancement');
  });
});

describe('archetypes — deed / exploit granularity (Gunslinger, Arcanist)', () => {
  const build = (cls: string, archetype: string | undefined, level: number): CharacterDoc => {
    let d = newCharacter('t-deed', 'X');
    d = withDecision(d, 'ability-base', { str: 12, dex: 15, con: 12, int: 14, wis: 14, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['dex']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];
  const exploitSlots = (doc: CharacterDoc) =>
    resolve(doc).slots.filter((s) => s.step === 'class' && s.id.startsWith('exploit')).map((s) => s.id);

  it('the gunslinger now grants each deed as its own feature', () => {
    // Individual deeds are modelled separately, so an archetype can target one.
    expect(featsAt(build('gunslinger', undefined, 1), 1)).toContain("Deed: Gunslinger's Dodge");
    expect(featsAt(build('gunslinger', undefined, 3), 3)).toContain('Deed: Utility Shot');
  });

  it('Gunslinger Musket Master swaps two deeds and gun training for musket abilities', () => {
    const m = build('gunslinger', 'musket-master', 5);
    expect(featsAt(m, 1)).toContain('Deed: Steady Aim');
    expect(featsAt(m, 1)).not.toContain("Deed: Gunslinger's Dodge");
    expect(featsAt(m, 1)).toContain('Deed: Deadeye');      // untouched deeds remain
    expect(featsAt(m, 1)).toContain('Deed: Quick Clear');
    expect(featsAt(m, 3)).toContain('Deed: Fast Musket');
    expect(featsAt(m, 3)).not.toContain('Deed: Utility Shot');
    expect(featsAt(m, 5)).toContain('Musket Training');
    expect(featsAt(m, 5)).not.toContain('Gun Training 1');
  });

  it('Arcanist Eldritch Font removes the 3rd/7th/13th exploit picks and grants surge abilities', () => {
    const std = exploitSlots(build('arcanist', undefined, 20));
    expect(std).toContain('exploit');       // the 1st-level exploit pick
    expect(std).toContain('exploit-L3');
    const e = build('arcanist', 'eldritch-font', 20);
    const slots = exploitSlots(e);
    expect(slots).toContain('exploit');      // 1st-level exploit kept
    expect(slots).toContain('exploit-L5');
    expect(slots).not.toContain('exploit-L3');
    expect(slots).not.toContain('exploit-L7');
    expect(slots).not.toContain('exploit-L13');
    expect(featsAt(e, 3)).toContain('Eldritch Surge');
    expect(featsAt(e, 20)).toContain('Bottomless Well');
    expect(featsAt(e, 20)).not.toContain('Magical Supremacy');
    expect(resolve(e).sheet.casting.length).toBeGreaterThan(0);
  });
});

describe('archetypes — second archetype per core class', () => {
  const build = (cls: string, archetype: string | undefined, level: number, choices?: Record<string, string[]>): CharacterDoc => {
    let d = newCharacter('t-second', 'X');
    d = withDecision(d, 'ability-base', { str: 13, dex: 13, con: 12, int: 12, wis: 13, cha: 13 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', cls === 'paladin' ? 'LG' : 'N');
    d = withDecision(d, 'class', cls);
    if (choices) d = withDecision(d, 'class-choices', choices);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];

  it('Barbarian Mounted Fury swaps fast movement and the uncanny-dodge line for a mount', () => {
    const m = build('barbarian', 'mounted-fury', 5);
    expect(featsAt(m, 1)).toContain('Fast Rider');
    expect(featsAt(m, 1)).not.toContain('Fast Movement');
    expect(featsAt(m, 5)).toContain('Bestial Mount');
    expect(featsAt(m, 5)).not.toContain('Improved Uncanny Dodge');
  });

  it('Paladin Divine Hunter trades heavy armor and auras for ranged smiting, keeping casting', () => {
    const p = build('paladin', 'divine-hunter', 14);
    expect(featsAt(p, 1)).toContain('Precise Shot');
    expect(featsAt(p, 3)).toContain('Shared Precision');
    expect(featsAt(p, 3)).not.toContain('Aura of Courage');
    expect(featsAt(p, 14)).toContain('Righteous Hunter');
    const eff = effectiveClass(C.classById.get('paladin')!, readDecisions(build('paladin', 'divine-hunter', 1)));
    expect(eff.proficiencies.armor).not.toContain('heavy');
    expect(resolve(p).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Bard Arcane Duelist swaps knowledge/performances for martial-arcane abilities, keeping casting', () => {
    const a = build('bard', 'arcane-duelist', 6);
    expect(featsAt(a, 1)).toContain('Arcane Strike');
    expect(featsAt(a, 1)).not.toContain('Bardic Knowledge');
    expect(featsAt(a, 2)).toContain('Combat Casting');
    expect(featsAt(a, 2)).not.toContain('Versatile Performance');
    expect(featsAt(a, 6)).toContain('Bladethirst');
    expect(resolve(a).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Cleric Crusader is a diminished, martial, single-domain cleric with bonus feats', () => {
    const c = build('cleric', 'crusader', 10);
    const eff = effectiveClass(C.classById.get('cleric')!, readDecisions(build('cleric', 'crusader', 1)));
    expect(eff.spellcasting?.diminished).toBe(true);
    expect(eff.proficiencies.weapons).toContain('martial');
    expect((eff.choices ?? []).find((x) => x.id === 'domains')?.count).toBe(1);
    const bf = resolve(c).slots.filter((s) => s.step === 'feats' && s.id.startsWith('feat-cleric')).map((s) => s.id);
    expect(bf).toContain('feat-cleric');      // 1st
    expect(bf).toContain('feat-cleric-L5');
    expect(bf).toContain('feat-cleric-L10');
    expect(featsAt(c, 8)).toContain('Legion’s Blessing');
  });

  it('Druid Blight Druid swaps the nature line for disease features, keeping casting', () => {
    const b = build('druid', 'blight-druid', 13);
    expect(featsAt(b, 1)).toContain('Vermin Empathy');
    expect(featsAt(b, 1)).not.toContain('Wild Empathy');
    expect(featsAt(b, 5)).toContain('Miasma');
    expect(featsAt(b, 5)).not.toContain("Resist Nature's Lure");
    expect(featsAt(b, 13)).toContain('Plaguebearer');
    expect(resolve(b).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Sorcerer Razmiran Priest suppresses the 3rd/5th bloodline spells and 9th power', () => {
    const std = build('sorcerer', undefined, 9, { bloodline: ['draconic'] });
    expect(featsAt(std, 3)).toContain('Bonus Spell (1st): Mage Armor');
    const r = build('sorcerer', 'razmiran-priest', 9, { bloodline: ['draconic'] });
    expect(featsAt(r, 1)).toContain('False Piety');
    expect(featsAt(r, 1)).not.toContain('Eschew Materials');
    expect(featsAt(r, 3)).toContain('Lay Healer');
    expect(featsAt(r, 3)).not.toContain('Bonus Spell (1st): Mage Armor'); // 3rd bloodline spell suppressed
    expect(featsAt(r, 9)).toContain('False Channel');
    expect(featsAt(r, 9)).not.toContain('Breath Weapon'); // 9th bloodline power suppressed
    expect(resolve(r).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Ranger Trapper replaces spells with ranger traps and trapfinding', () => {
    expect(resolve(build('ranger', undefined, 5)).sheet.casting.length).toBeGreaterThan(0);
    const t = build('ranger', 'trapper', 5);
    expect(featsAt(t, 1)).toContain('Trapfinding');
    expect(featsAt(t, 5)).toContain('Ranger Traps');
    expect(featsAt(t, 5)).not.toContain('Spellcasting');
    expect(resolve(t).sheet.casting.length).toBe(0);
  });

  it('Wizard Spellbinder swaps arcane bond for Spellbound and drops the bond pick', () => {
    const w = build('wizard', 'spellbinder', 5);
    expect(featsAt(w, 1)).toContain('Spellbound');
    expect(featsAt(w, 1)).not.toContain('Arcane Bond');
    const choiceIds = resolve(w).slots.filter((s) => s.step === 'class').map((s) => s.id);
    expect(choiceIds).not.toContain('arcane-bond');
    expect(choiceIds).toContain('school');
    expect(resolve(w).sheet.casting.length).toBeGreaterThan(0);
  });
});

describe('archetypes — second archetype per base/hybrid class (batch A)', () => {
  const build = (cls: string, archetype: string | undefined, level: number, choices?: Record<string, string[]>): CharacterDoc => {
    let d = newCharacter('t-baseA', 'X');
    d = withDecision(d, 'ability-base', { str: 13, dex: 14, con: 12, int: 14, wis: 13, cha: 13 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    if (choices) d = withDecision(d, 'class-choices', choices);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];

  it('Alchemist Grenadier gains martial weapons and swaps the poison line for bomb tricks', () => {
    const g = build('alchemist', 'grenadier', 10);
    expect(featsAt(g, 2)).toContain('Alchemical Weapon');
    expect(featsAt(g, 2)).not.toContain('Poison Resistance +2');
    expect(featsAt(g, 6)).toContain('Directed Blast');
    const eff = effectiveClass(C.classById.get('alchemist')!, readDecisions(build('alchemist', 'grenadier', 1)));
    expect(eff.proficiencies.weapons).toContain('martial');
  });

  it('Cavalier Standard Bearer swaps mount and banner, gaining banner at 1st', () => {
    const s = build('cavalier', 'standard-bearer', 20);
    expect(featsAt(s, 1)).toContain('Banner');
    expect(featsAt(s, 1)).not.toContain('Mount');
    expect(featsAt(s, 5)).toContain('Mount');           // mount now comes at 5th
    expect(featsAt(s, 20)).toContain('Awesome Pennon');
    expect(featsAt(s, 20)).not.toContain('Supreme Charge');
  });

  it('Gunslinger Pistolero swaps three deeds and gun training for pistol abilities', () => {
    const p = build('gunslinger', 'pistolero', 11);
    expect(featsAt(p, 1)).toContain('Deed: Up Close and Deadly');
    expect(featsAt(p, 1)).not.toContain('Deed: Deadeye'); // moved to 7th
    expect(featsAt(p, 5)).toContain('Pistol Training');
    expect(featsAt(p, 5)).not.toContain('Gun Training 1');
    expect(featsAt(p, 7)).toContain('Deed: Deadeye');
    expect(featsAt(p, 11)).toContain('Deed: Twin Shot Knockdown');
  });

  it('Inquisitor Sacred Huntsmaster swaps the judgment line for an animal companion', () => {
    const s = build('inquisitor', 'sacred-huntsmaster', 8);
    expect(featsAt(s, 1)).toContain('Animal Companion');
    expect(featsAt(s, 1)).not.toContain('Judgment 1/day');
    expect(featsAt(s, 3)).toContain('Hunter Tactics');
    expect(featsAt(s, 3)).not.toContain('Solo Tactics');
    expect(featsAt(s, 8)).toContain('Improved Empathic Link');
    expect(resolve(s).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Oracle Seeker removes the 3rd/15th revelations and adds tinkering skills', () => {
    const revSlots = (doc: CharacterDoc) =>
      resolve(doc).slots.filter((s) => s.step === 'class' && s.id.startsWith('revelation')).map((s) => s.id);
    const k = build('oracle', 'seeker', 20);
    expect(featsAt(k, 1)).toContain('Tinkering');
    const rev = revSlots(k);
    expect(rev).not.toContain('revelation-L3');
    expect(rev).not.toContain('revelation-L15');
    expect(rev).toContain('revelation-L7');
    expect(resolve(k).sheet.classSkillIds).toContain('disable-device');
    expect(resolve(k).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Investigator Sleuth trades alchemy for luck-based deeds and loses extract casting', () => {
    expect(resolve(build('investigator', undefined, 4)).sheet.casting.length).toBeGreaterThan(0);
    const s = build('investigator', 'sleuth', 4);
    expect(featsAt(s, 1)).toContain('Sleuth’s Luck');
    expect(featsAt(s, 1)).not.toContain('Alchemy');
    expect(featsAt(s, 4)).toContain('Make It Count');
    expect(featsAt(s, 4)).not.toContain('Swift Alchemy');
    expect(resolve(s).sheet.casting.length).toBe(0);
  });

  it('Warpriest Champion of the Faith swaps channel/sacred-weapon and drops the 3rd bonus feat', () => {
    const c = build('warpriest', 'champion-of-the-faith', 6);
    expect(featsAt(c, 4)).toContain('Smite');
    expect(featsAt(c, 4)).not.toContain('Channel Energy');
    const bf = resolve(c).slots.filter((s) => s.step === 'feats' && s.id.startsWith('feat-warpriest')).map((s) => s.id);
    expect(bf).not.toContain('feat-warpriest-L3');
    expect(bf).toContain('feat-warpriest-L6');
  });

  it('Skald Totemic Skald swaps the uncanny/kenning line and the 3rd rage power', () => {
    const t = build('skald', 'totemic-skald', 9);
    expect(featsAt(t, 4)).toContain('Totem Empathy');
    expect(featsAt(t, 4)).not.toContain('Uncanny Dodge');
    expect(featsAt(t, 5)).toContain('Wild Shape');
    expect(featsAt(t, 5)).not.toContain('Spell Kenning');
    const rp = resolve(t).slots.filter((s) => s.step === 'class' && s.id.startsWith('skald-rage-power')).map((s) => s.id);
    expect(rp).not.toContain('skald-rage-power-L3');
    expect(rp).toContain('skald-rage-power-L6');
  });

  it('Hunter Packmaster swaps the animal companion / focus for a pack', () => {
    const p = build('hunter', 'packmaster', 20);
    expect(featsAt(p, 1)).toContain('Pack Bond');
    expect(featsAt(p, 1)).not.toContain('Animal Companion');
    expect(featsAt(p, 1)).toContain('Pack Focus');
    expect(featsAt(p, 20)).toContain('Master of the Pack');
    expect(featsAt(p, 20)).not.toContain('Master Hunter');
  });

  it('Slayer Sniper (its first archetype) replaces track and the 2nd-level talent', () => {
    const s = build('slayer', 'sniper', 8);
    expect(featsAt(s, 1)).toContain('Accuracy');
    expect(featsAt(s, 1)).not.toContain('Track');
    expect(featsAt(s, 2)).toContain('Deadly Range');
    const talents = resolve(s).slots.filter((x) => x.step === 'class' && x.id.startsWith('slayer-talent')).map((x) => x.id);
    expect(talents).not.toContain('slayer-talent-L2');
    expect(talents).toContain('slayer-talent-L4');
  });

  it('Gunslinger Mysterious Stranger swaps nimble/gun-training and two deeds', () => {
    const m = build('gunslinger', 'mysterious-stranger', 11);
    expect(featsAt(m, 1)).toContain('Focused Aim');
    expect(featsAt(m, 1)).not.toContain('Deed: Quick Clear');
    expect(featsAt(m, 2)).toContain('Lucky');
    expect(featsAt(m, 2)).not.toContain('Nimble +1');
    expect(featsAt(m, 5)).toContain('Stranger’s Fortune');
    expect(featsAt(m, 11)).not.toContain('Deed: Bleeding Wound');
  });

  it('Brawler Exemplar swaps unarmed/maneuver line for inspiring performance', () => {
    const e = build('brawler', 'exemplar', 5);
    expect(featsAt(e, 1)).toContain('Call to Arms');
    expect(featsAt(e, 1)).not.toContain('Unarmed Strike');
    expect(featsAt(e, 3)).toContain('Inspiring Prowess');
    expect(featsAt(e, 3)).not.toContain('Maneuver Training');
    expect(featsAt(e, 4)).not.toContain('AC Bonus');
  });

  it('Witch Gravewalker swaps the 1st/4th/8th hexes for undead mastery', () => {
    const g = build('witch', 'gravewalker', 10);
    expect(featsAt(g, 1)).toContain('Aura of Desecration');
    expect(featsAt(g, 4)).toContain('Bonethrall');
    expect(featsAt(g, 8)).toContain('Possess Undead');
    const hexes = resolve(g).slots.filter((x) => x.step === 'class' && x.id.startsWith('hex')).map((x) => x.id);
    expect(hexes).not.toContain('hex');       // 1st-level hex gone
    expect(hexes).not.toContain('hex-L4');
    expect(hexes).not.toContain('hex-L8');
    expect(hexes).toContain('hex-L6');
  });

  it('Investigator Mastermind swaps trapfinding/swift alchemy and the 9th talent', () => {
    const m = build('investigator', 'mastermind', 9);
    expect(featsAt(m, 1)).toContain('A Quiet Word');
    expect(featsAt(m, 1)).not.toContain('Trapfinding');
    expect(featsAt(m, 4)).toContain('Mastermind’s Defense');
    const talents = resolve(m).slots.filter((x) => x.step === 'class' && x.id.startsWith('investigator-talent')).map((x) => x.id);
    expect(talents).not.toContain('investigator-talent-L9');
    expect(talents).toContain('investigator-talent-L7');
  });

  it('Fighter Archer swaps bravery/armor-training/weapon-training for ranged features', () => {
    const a = build('fighter', 'archer', 20);
    expect(featsAt(a, 2)).toContain('Hawkeye');
    expect(featsAt(a, 2)).not.toContain('Bravery +1');
    expect(featsAt(a, 3)).toContain('Trick Shot');
    expect(featsAt(a, 3)).not.toContain('Armor Training 1');
    expect(featsAt(a, 5)).toContain('Expert Archer');
    expect(featsAt(a, 20)).toContain('Weapon Mastery'); // archer keeps weapon mastery
  });

  it('Rogue Scout swaps uncanny dodge for charge-based sneak attacks', () => {
    const s = build('rogue', 'scout', 8);
    expect(featsAt(s, 4)).toContain('Scout’s Charge');
    expect(featsAt(s, 4)).not.toContain('Uncanny Dodge');
    expect(featsAt(s, 8)).toContain('Skirmisher');
    expect(featsAt(s, 8)).not.toContain('Improved Uncanny Dodge');
  });

  it('Barbarian Titan Mauler swaps the mobility/defense line for giant-weapon features', () => {
    const t = build('barbarian', 'titan-mauler', 14);
    expect(featsAt(t, 1)).toContain('Big Game Hunter');
    expect(featsAt(t, 1)).not.toContain('Fast Movement');
    expect(featsAt(t, 2)).toContain('Jotungrip');
    expect(featsAt(t, 3)).toContain('Massive Weapons');
    expect(featsAt(t, 14)).toContain('Titanic Rage');
    expect(featsAt(t, 14)).not.toContain('Indomitable Will');
  });

  it('Ranger Guide swaps favored enemy / hunter’s bond / quarry for focus & terrain features', () => {
    const gd = build('ranger', 'guide', 16);
    expect(featsAt(gd, 1)).toContain('Ranger’s Focus');
    expect(featsAt(gd, 1)).not.toContain('Favored Enemy');
    expect(featsAt(gd, 4)).toContain('Terrain Bond');
    expect(featsAt(gd, 4)).not.toContain("Hunter's Bond");
    expect(featsAt(gd, 11)).toContain('Inspired Moment');
    expect(featsAt(gd, 11)).not.toContain('Quarry');
  });

  it('Paladin Undead Scourge swaps aura of resolve/justice for anti-undead powers', () => {
    const u = build('paladin', 'undead-scourge', 11);
    expect(featsAt(u, 8)).toContain('Aura of Life');
    expect(featsAt(u, 8)).not.toContain('Aura of Resolve');
    expect(featsAt(u, 11)).toContain('Undead Annihilation');
    expect(featsAt(u, 11)).not.toContain('Aura of Justice');
  });

  it('Slayer Bounty Hunter swaps the 2nd/6th talents and the 10th advanced talent for capture tools', () => {
    const b = build('slayer', 'bounty-hunter', 12);
    expect(featsAt(b, 2)).toContain('Dirty Trick');
    expect(featsAt(b, 6)).toContain('Submission Hold');
    expect(featsAt(b, 10)).toContain('Incapacitate');
    const talents = resolve(b).slots.filter((x) => x.step === 'class' && x.id.startsWith('slayer-')).map((x) => x.id);
    expect(talents).not.toContain('slayer-talent-L2');
    expect(talents).not.toContain('slayer-talent-L6');
    expect(talents).not.toContain('slayer-adv-talent-L10');
    expect(talents).toContain('slayer-talent-L4');   // kept
    expect(talents).toContain('slayer-adv-talent-L12'); // kept
  });
});

describe('archetypes — second archetype per base/hybrid class (batch C)', () => {
  const build = (cls: string, archetype: string | undefined, level: number): CharacterDoc => {
    let d = newCharacter('t-baseC', 'X');
    d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 13, int: 13, wis: 13, cha: 13 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];
  const classSlots = (doc: CharacterDoc, prefix: string) =>
    resolve(doc).slots.filter((s) => s.step === 'class' && s.id.startsWith(prefix)).map((s) => s.id);

  it('the swashbuckler now grants each deed as its own feature', () => {
    expect(featsAt(build('swashbuckler', undefined, 1), 1)).toContain('Deed: Dodging Panache');
    expect(featsAt(build('swashbuckler', undefined, 3), 3)).toContain('Deed: Menacing Swordplay');
  });

  it('Swashbuckler Flying Blade swaps thrown-blade deeds and weapon features', () => {
    const f = build('swashbuckler', 'flying-blade', 20);
    expect(featsAt(f, 1)).toContain('Deed: Subtle Throw');
    expect(featsAt(f, 1)).not.toContain('Deed: Dodging Panache');
    expect(featsAt(f, 1)).toContain('Deed: Derring-Do'); // untouched deed remains
    expect(featsAt(f, 3)).toContain('Deed: Precise Throw');
    expect(featsAt(f, 3)).not.toContain('Deed: Menacing Swordplay');
    expect(featsAt(f, 5)).toContain('Flying Blade Training');
    expect(featsAt(f, 20)).toContain('Flying Blade Mastery');
  });

  it('Summoner Broodmaster swaps the eidolon and life-link line, keeping casting', () => {
    const b = build('summoner', 'broodmaster', 18);
    expect(featsAt(b, 1)).toContain('Eidolon Brood');
    expect(featsAt(b, 1)).not.toContain('Eidolon');
    expect(featsAt(b, 1)).toContain('Brood Link');
    expect(featsAt(b, 1)).not.toContain('Life Link');
    expect(featsAt(b, 18)).toContain('Merge Forms');
    expect(resolve(b).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Brawler Mutagenic Mauler swaps martial flexibility and AC bonus for mutagen abilities', () => {
    const m = build('brawler', 'mutagenic-mauler', 4);
    expect(featsAt(m, 1)).toContain('Mutagen');
    expect(featsAt(m, 1)).not.toContain('Martial Flexibility');
    expect(featsAt(m, 4)).toContain('Beastmorph');
    expect(featsAt(m, 4)).not.toContain('AC Bonus');
  });

  it('Bloodrager Blood Conduit swaps the movement/dodge/will line for spell delivery', () => {
    const b = build('bloodrager', 'blood-conduit', 14);
    expect(featsAt(b, 1)).toContain('Contact Specialist');
    expect(featsAt(b, 1)).not.toContain('Fast Movement');
    expect(featsAt(b, 5)).toContain('Spell Conduit');
    expect(featsAt(b, 14)).toContain('Reflexive Conduit');
    expect(featsAt(b, 14)).not.toContain('Indomitable Will');
  });

  it('Shaman Witch Doctor swaps the 4/8/10/12 hexes for healing/counter magic', () => {
    const w = build('shaman', 'witch-doctor', 12);
    expect(featsAt(w, 4)).toContain('Channel Energy');
    expect(featsAt(w, 8)).toContain('Counter Curse');
    const hexes = classSlots(w, 'shaman-hex');
    expect(hexes).not.toContain('shaman-hex-L4');
    expect(hexes).not.toContain('shaman-hex-L8');
    expect(hexes).toContain('shaman-hex-L2');
    expect(resolve(w).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Witch Hedge Witch swaps the 4th/8th hexes for healing (keeping the 1st-level hex)', () => {
    const h = build('witch', 'hedge-witch', 10);
    expect(featsAt(h, 4)).toContain('Spontaneous Healing');
    const hexes = classSlots(h, 'hex');
    expect(hexes).toContain('hex');        // 1st-level hex kept
    expect(hexes).not.toContain('hex-L4');
    expect(hexes).not.toContain('hex-L8');
    expect(hexes).toContain('hex-L6');
  });

  it('Shifter Verdant Shifter swaps the animal aspect line for a plant body', () => {
    const v = build('shifter', 'verdant-shifter', 6);
    expect(featsAt(v, 1)).toContain('Verdant Body');
    expect(featsAt(v, 1)).not.toContain('Shifter Aspect');
    expect(featsAt(v, 2)).toContain('Wild Armor');
    expect(featsAt(v, 2)).not.toContain('Defensive Instinct');
    expect(featsAt(v, 6)).toContain('Plant Shape');
  });

  it('Arcanist Unlettered Arcanist swaps the arcane spell list for the witch list', () => {
    const u = build('arcanist', 'unlettered-arcanist', 5);
    expect(featsAt(u, 1)).toContain('Familiar');
    const eff = effectiveClass(C.classById.get('arcanist')!, readDecisions(u));
    expect(eff.spellcasting?.list).toBe('witch');
    expect(resolve(u).sheet.casting[0].list).toBe('witch'); // the play-sheet block carries it too
    // The spell picker draws from the witch list, not the arcane one: it offers Cure Light Wounds
    // (witch-only, never on the wizard list) and hides Magic Missile (arcane-only, never witch).
    const spellSlots = resolve(u).slots.filter((s) => s.step === 'spells' && s.options);
    const opts = new Set(spellSlots.flatMap((s) => (s.options ?? []).map((o) => o.id)));
    expect(opts.has('cure-light-wounds')).toBe(true);
    expect(opts.has('magic-missile')).toBe(false);
  });
});

describe('witch spell list data', () => {
  it('tags witch spells and omits non-witch ones, with per-list level overrides', () => {
    const on = (id: string) => C.spellById.get(id)!.lists.includes('witch');
    expect(on('lightning-bolt')).toBe(true);
    expect(on('vampiric-touch')).toBe(true);
    expect(on('wail-of-the-banshee')).toBe(true);
    expect(on('fireball')).toBe(false);
    expect(on('scorching-ray')).toBe(false);
    // Cures sit a level higher on the witch list than on the cleric list.
    expect(C.spellLevelOn(C.spellById.get('cure-serious-wounds')!, 'witch')).toBe(4);
    expect(C.spellLevelOn(C.spellById.get('cone-of-cold')!, 'witch')).toBe(6);
    expect(C.spellLevelOn(C.spellById.get('plane-shift')!, 'witch')).toBe(7);
  });
});

describe('archetypes — caster classes', () => {
  const build = (cls: string, archetype: string | undefined, level: number): CharacterDoc => {
    let d = newCharacter('t-arch3', 'X');
    d = withDecision(d, 'ability-base', { str: 12, dex: 14, con: 13, int: 14, wis: 12, cha: 14 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];

  it('Bard Archaeologist swaps Bardic Performance for Archaeologist’s Luck, keeping spellcasting', () => {
    expect(featsAt(build('bard', undefined, 3), 1)).toContain('Bardic Performance');
    const a = build('bard', 'archaeologist', 6);
    expect(featsAt(a, 1)).toContain('Archaeologist’s Luck');
    expect(featsAt(a, 1)).not.toContain('Bardic Performance');
    expect(featsAt(a, 6)).toContain('Evasion');
    expect(resolve(a).sheet.casting.length).toBeGreaterThan(0); // still a caster
  });

  it('Alchemist Vivisectionist swaps Bomb for Sneak Attack', () => {
    expect(featsAt(build('alchemist', undefined, 3), 1)).toContain('Bomb 1d6');
    const v = build('alchemist', 'vivisectionist', 3);
    expect(featsAt(v, 1)).toContain('Sneak Attack +1d6');
    expect(featsAt(v, 1)).not.toContain('Bomb 1d6');
  });
});

describe('archetypes — subsystem / choice changes', () => {
  const bard = (archetype: string | undefined, level: number): CharacterDoc => {
    let d = newCharacter('t-arch4', 'B');
    d = withDecision(d, 'ability-base', { str: 10, dex: 14, con: 12, int: 12, wis: 10, cha: 15 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'bard');
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const talentSlots = (doc: CharacterDoc) =>
    resolve(doc).slots.filter((s) => s.step === 'class' && s.id.startsWith('archaeologist-talent'));

  it('Bard Archaeologist grants rogue-talent choice slots a standard bard lacks', () => {
    expect(talentSlots(bard(undefined, 8)).length).toBe(0);
    const slots = talentSlots(bard('archaeologist', 8));
    expect(slots.length).toBeGreaterThan(0); // slots at class levels 4 and 8
    expect(slots[0].options.length).toBeGreaterThan(0); // real rogue-talent options
  });

  it('effectiveClass adds and removes choice slots', () => {
    const base = C.classById.get('barbarian')!;
    const testClass = {
      ...base,
      archetypes: [{
        id: 'test-choice', classId: 'barbarian', name: 'T', desc: 'T', replaces: [], grants: [],
        choices: {
          remove: ['rage-power'],
          add: [{ id: 'test-pick', label: 'Test', kind: 'list' as const, count: 1, levels: [1], options: [{ id: 'x', name: 'X', desc: 'x' }] }],
        },
      }],
    };
    const doc = withDecision(newCharacter('t-eff2', 'X'), 'archetype', 'test-choice');
    const ids = (effectiveClass(testClass, readDecisions(doc)).choices ?? []).map((c) => c.id);
    expect(ids).not.toContain('rage-power');
    expect(ids).toContain('test-pick');
  });
});

describe('archetypes — engine deferrals closed (Crossblooded, Divine Commander)', () => {
  const sorcerer = (archetype: string | undefined, level: number, bloodlines: string[] = ['draconic']): CharacterDoc => {
    let d = newCharacter('t-defer-s', 'S');
    d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 12, int: 10, wis: 10, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'sorcerer');
    d = withDecision(d, 'class-choices', { bloodline: bloodlines });
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const warpriest = (archetype: string | undefined, level: number): CharacterDoc => {
    let d = newCharacter('t-defer-w', 'W');
    d = withDecision(d, 'ability-base', { str: 15, dex: 12, con: 13, int: 10, wis: 14, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['wis']);
    d = withDecision(d, 'alignment', 'LG');
    d = withDecision(d, 'class', 'warpriest');
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];

  it('Crossblooded knows one fewer spell of every level including cantrips, keeping caster level', () => {
    const std = resolve(sorcerer(undefined, 5)).sheet.casting.find((b) => b.classId === 'sorcerer')!;
    const cb = resolve(sorcerer('crossblooded', 5, ['draconic', 'arcane'])).sheet.casting.find((b) => b.classId === 'sorcerer')!;
    expect(cb.diminishedKnown).toBe(true);
    expect(std.diminishedKnown).toBeFalsy();
    expect(cb.casterLevel).toBe(std.casterLevel);
    // Cantrips (index 0) are reduced too — unlike diminished *slots*.
    expect(cb.known![0]).toBe(std.known![0] - 1);
    for (let L = 0; L < std.known!.length; L++) expect(cb.known![L]).toBe(Math.max(0, std.known![L] - 1));
  });

  it('Crossblooded takes a −2 penalty on Will saves and still casts', () => {
    const std = resolve(sorcerer(undefined, 5));
    const cb = resolve(sorcerer('crossblooded', 5, ['draconic', 'arcane']));
    expect(cb.sheet.stats['save:will'].total).toBe(std.sheet.stats['save:will'].total - 2);
    expect(cb.sheet.casting.length).toBeGreaterThan(0);
  });

  it('effectiveClass gives Crossblooded two bloodline picks and the diminished-known flag', () => {
    const base = C.classById.get('sorcerer')!;
    const eff = effectiveClass(base, readDecisions(sorcerer('crossblooded', 1, ['draconic', 'arcane'])));
    expect((eff.choices ?? []).find((c) => c.id === 'bloodline')?.count).toBe(2);
    expect(eff.spellcasting?.diminishedKnown).toBe(true);
  });

  it('Divine Commander trades blessings and four bonus feats for a mount and command abilities', () => {
    const dc = warpriest('divine-commander', 15);
    // Mount + command line replace blessings and the 3rd/6th/12th/15th bonus feats.
    expect(featsAt(dc, 1)).toContain('Mount');
    expect(featsAt(dc, 1)).not.toContain('Blessings');
    expect(featsAt(dc, 3)).toContain('Battle Tactician');
    expect(featsAt(dc, 6)).toContain('Blessed Mount');
    expect(featsAt(dc, 12)).toContain('Greater Battle Tactician');
    expect(featsAt(dc, 15)).toContain('Bless Army');
    // The blessings pick slot is gone.
    expect(resolve(dc).slots.some((s) => s.id === 'blessings')).toBe(false);
  });

  it('Divine Commander removes exactly the 3rd/6th/12th/15th warpriest bonus feats, keeping 9th & 18th', () => {
    const std = resolve(warpriest(undefined, 18)).slots.filter((s) => s.step === 'feats' && s.id.startsWith('feat-warpriest')).map((s) => s.id);
    const dc = resolve(warpriest('divine-commander', 18)).slots.filter((s) => s.step === 'feats' && s.id.startsWith('feat-warpriest')).map((s) => s.id);
    // Standard warpriest bonus feats at 3/6/9/12/15/18.
    expect(std).toContain('feat-warpriest-L3');
    expect(std).toContain('feat-warpriest-L9');
    // Divine Commander keeps only 9th and 18th.
    expect(dc).not.toContain('feat-warpriest-L3');
    expect(dc).not.toContain('feat-warpriest-L6');
    expect(dc).not.toContain('feat-warpriest-L12');
    expect(dc).not.toContain('feat-warpriest-L15');
    expect(dc).toContain('feat-warpriest-L9');
    expect(dc).toContain('feat-warpriest-L18');
  });
});

describe('archetypes — subsystem casters (magus)', () => {
  const magus = (archetype: string | undefined, level: number): CharacterDoc => {
    let d = newCharacter('t-arch5', 'M');
    d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 12, int: 15, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'magus');
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];
  const arcanaSlots = (doc: CharacterDoc) =>
    resolve(doc).slots.filter((s) => s.step === 'class' && s.id.startsWith('magus-arcana'));

  it('a standard magus gains its first arcana at 3rd and casts', () => {
    const std = magus(undefined, 20);
    expect(arcanaSlots(std).map((s) => s.id)).toContain('magus-arcana-L3');
    expect(resolve(std).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Bladebound replaces the 3rd-level arcana with the Black Blade', () => {
    const bb = magus('bladebound', 20);
    expect(featsAt(bb, 1)).toContain('Arcane Pool (black blade)');
    expect(featsAt(bb, 1)).not.toContain('Arcane Pool'); // base pool swapped out
    expect(featsAt(bb, 3)).toContain('Black Blade');
    const ids = arcanaSlots(bb).map((s) => s.id);
    expect(ids).not.toContain('magus-arcana-L3'); // 3rd-level arcana is the black blade
    expect(ids).toContain('magus-arcana-L6');
    expect(resolve(bb).sheet.casting.length).toBeGreaterThan(0); // still a caster
  });

  it('Hexcrafter offers witch hexes, a Hex Magus pick, and Accursed Strike', () => {
    const hc = magus('hexcrafter', 20);
    expect(featsAt(hc, 1)).toContain('Accursed Strike');
    expect(featsAt(hc, 4)).not.toContain('Spell Recall'); // replaced by Hex Magus
    const arcana = arcanaSlots(hc);
    expect(arcana[0].options.length).toBeGreaterThan(MAGUS_ARCANA.length); // hexes added
    const hexMagus = resolve(hc).slots.filter((s) => s.id.startsWith('hexcrafter-hex-magus'));
    expect(hexMagus.length).toBe(1); // one dedicated pick at 4th
    expect(resolve(hc).sheet.casting.length).toBeGreaterThan(0);
  });

  it('Kensai has Diminished Spellcasting — one fewer slot of each spell level, cantrips intact', () => {
    const std = resolve(magus(undefined, 20)).sheet.casting.find((b) => b.classId === 'magus')!;
    const ken = resolve(magus('kensai', 20)).sheet.casting.find((b) => b.classId === 'magus')!;
    expect(ken.diminished).toBe(true);
    expect(std.diminished).toBeFalsy();
    expect(ken.slots![0]).toBe(std.slots![0]); // cantrips unaffected
    // At 20th every real spell level's base is ≥1, so each drops by exactly 1 (bonus slots identical).
    for (let L = 1; L <= 6; L++) expect(ken.slots![L]).toBe(std.slots![L] - 1);
    expect(resolve(magus('kensai', 20)).sheet.casting.length).toBeGreaterThan(0); // still a caster
  });

  it('Kensai swaps spell recall for Perfect Strike and drops the 9th-level arcana', () => {
    const k = magus('kensai', 20);
    expect(featsAt(k, 4)).toContain('Perfect Strike');
    expect(featsAt(k, 4)).not.toContain('Spell Recall');
    const ids = arcanaSlots(k).map((s) => s.id);
    expect(ids).not.toContain('magus-arcana-L9'); // Critical Perfection replaces the 9th arcana
    expect(ids).toContain('magus-arcana-L6');
    expect(ids).toContain('magus-arcana-L12');
  });

  it('effectiveClass merges the diminished flag and strips armor proficiency', () => {
    const base = C.classById.get('magus')!;
    let d = withDecision(newCharacter('t-ken', 'K'), 'class', 'magus');
    d = withDecision(d, 'archetype', 'kensai');
    const eff = effectiveClass(base, readDecisions(d));
    expect(eff.spellcasting?.diminished).toBe(true);
    expect(eff.proficiencies.armor).not.toContain('light'); // Kensai wears no armor
  });
});

describe('archetypes — thirds batch 3 (Mouser, Dual-Cursed, Chirurgeon, Merciful Healer)', () => {
  const build = (cls: string, archetype: string | undefined, level: number, choices?: Record<string, string[]>): CharacterDoc => {
    let d = newCharacter('t-thirds3', 'X');
    d = withDecision(d, 'ability-base', { str: 13, dex: 14, con: 12, int: 13, wis: 14, cha: 12 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['dex']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    if (choices) d = withDecision(d, 'class-choices', choices);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];

  it('Mouser swaps four deeds for its underfoot line, keeping the rest', () => {
    const m = build('swashbuckler', 'mouser', 11);
    expect(featsAt(m, 1)).toContain('Deed: Underfoot Assault');
    expect(featsAt(m, 1)).not.toContain('Deed: Opportune Parry and Riposte');
    expect(featsAt(m, 3)).toContain('Deed: Quick Steal');
    expect(featsAt(m, 3)).not.toContain('Deed: Menacing Swordplay');
    expect(featsAt(m, 7)).toContain('Deed: Hamstring');
    expect(featsAt(m, 11)).toContain('Deed: Cat’s Charge');
    // A deed the archetype does not touch survives.
    expect(featsAt(m, 1)).toContain('Deed: Derring-Do');
  });

  it('Dual-Cursed Oracle adds revelation picks at 5th and 13th on top of the normal line', () => {
    const std = resolve(build('oracle', undefined, 13)).slots.filter((s) => s.id.startsWith('revelation')).map((s) => s.id);
    const dc = resolve(build('oracle', 'dual-cursed', 13)).slots.filter((s) => s.id.startsWith('revelation')).map((s) => s.id);
    expect(std).not.toContain('revelation-L5');
    expect(std).not.toContain('revelation-L13');
    expect(dc).toContain('revelation-L5');
    expect(dc).toContain('revelation-L13');
    // The normal revelation levels are still present.
    expect(dc).toContain('revelation-L7');
    expect(featsAt(build('oracle', 'dual-cursed', 1), 1)).toContain('Dual Curse');
  });

  it('Chirurgeon trades the poison line for healing extracts', () => {
    const c = build('alchemist', 'chirurgeon', 10);
    expect(featsAt(c, 2)).toContain('Infused Curative');
    expect(featsAt(c, 2)).not.toContain('Poison Use');
    expect(featsAt(c, 2)).not.toContain('Poison Resistance +2');
    expect(featsAt(c, 5)).toContain('Anaesthetic');
    expect(featsAt(c, 10)).toContain('Power Over Death');
  });

  it('the bard splits inspire courage out of the performance pool and has jack of all trades at 10', () => {
    // Both are their own features so archetypes can swap them individually (Court Bard does).
    const b = build('bard', undefined, 10);
    expect(featsAt(b, 1)).toContain('Bardic Performance');
    expect(featsAt(b, 1)).toContain('Inspire Courage');
    expect(featsAt(b, 10)).toContain('Jack of All Trades');
  });

  it('Court Bard swaps the four performances plus bardic knowledge and lore master', () => {
    const cb = build('bard', 'court-bard', 14);
    expect(featsAt(cb, 1)).toContain('Satire');
    expect(featsAt(cb, 1)).not.toContain('Inspire Courage');
    expect(featsAt(cb, 1)).toContain('Heraldic Expertise');
    expect(featsAt(cb, 1)).not.toContain('Bardic Knowledge');
    // The performance-rounds pool itself is untouched.
    expect(featsAt(cb, 1)).toContain('Bardic Performance');
    expect(featsAt(cb, 3)).toContain('Mockery');
    expect(featsAt(cb, 3)).not.toContain('Inspire Competence');
    expect(featsAt(cb, 5)).toContain('Wide Audience');
    expect(featsAt(cb, 5)).not.toContain('Lore Master');
    expect(featsAt(cb, 8)).toContain('Glorious Epic');
    expect(featsAt(cb, 14)).toContain('Scandal');
    expect(featsAt(cb, 10)).not.toContain('Jack of All Trades');
  });

  it('Spellbreaker gives up every teamwork bonus feat for its anti-magic line', () => {
    const std = resolve(build('inquisitor', undefined, 18)).slots.filter((s) => s.step === 'feats' && s.id.startsWith('feat-inquisitor')).map((s) => s.id);
    const sb = resolve(build('inquisitor', 'spellbreaker', 18)).slots.filter((s) => s.step === 'feats' && s.id.startsWith('feat-inquisitor')).map((s) => s.id);
    expect(std.length).toBe(6); // teamwork feats at 3/6/9/12/15/18
    expect(sb.length).toBe(0);  // all of them replaced by Defense against Magic
    const s = build('inquisitor', 'spellbreaker', 20);
    expect(featsAt(s, 1)).toContain('Strong-Willed');
    expect(featsAt(s, 1)).not.toContain('Monster Lore');
    expect(featsAt(s, 3)).toContain('Defense against Magic');
    expect(featsAt(s, 3)).toContain('Foil Casting');
    expect(featsAt(s, 3)).not.toContain('Solo Tactics');
    expect(featsAt(s, 20)).toContain('Impervious');
    expect(featsAt(s, 20)).not.toContain('True Judgment');
  });

  it('Beast Rider trades mount and expert trainer for an exotic mount, losing heavy armor', () => {
    const eff = effectiveClass(C.classById.get('cavalier')!, readDecisions(build('cavalier', 'beast-rider', 1)));
    expect(eff.proficiencies.armor).toContain('medium');
    expect(eff.proficiencies.armor).not.toContain('heavy');
    const br = build('cavalier', 'beast-rider', 4);
    expect(featsAt(br, 1)).toContain('Exotic Mount');
    expect(featsAt(br, 1)).not.toContain('Mount');
    expect(featsAt(br, 4)).not.toContain('Expert Trainer');
  });

  it('Cave Druid swaps the surface line underground and moves wild shape to 6th', () => {
    const eff = effectiveClass(C.classById.get('druid')!, readDecisions(build('druid', 'cave-druid', 1)));
    expect(eff.classSkills).toContain('know-dungeoneering');
    expect(eff.classSkills).not.toContain('know-geography');
    const cd = build('druid', 'cave-druid', 6);
    expect(featsAt(cd, 1)).toContain('Cavesense');
    expect(featsAt(cd, 1)).not.toContain('Nature Sense');
    expect(featsAt(cd, 2)).toContain('Tunnelrunner');
    expect(featsAt(cd, 3)).toContain('Lightfoot');
    expect(featsAt(cd, 4)).toContain('Resist Subterranean Corruption');
    // Wild shape is gone from 4th and arrives at 6th instead.
    expect(featsAt(cd, 4)).not.toContain('Wild Shape 1/day');
    expect(featsAt(cd, 6)).toContain('Wild Shape (cave)');
  });

  it('Metamagic Rager trades improved uncanny dodge for Meta-Rage', () => {
    const mr = build('bloodrager', 'metamagic-rager', 5);
    expect(featsAt(mr, 5)).toContain('Meta-Rage');
    expect(featsAt(mr, 5)).not.toContain('Improved Uncanny Dodge');
    // Plain uncanny dodge at 2nd is untouched.
    expect(featsAt(mr, 2)).toContain('Uncanny Dodge');
  });

  it('Battle Scion swaps dirge of doom and master skald for its courtly line', () => {
    const bs = build('skald', 'battle-scion', 20);
    expect(featsAt(bs, 1)).toContain('Courtly Presence');
    expect(featsAt(bs, 3)).toContain('Battle Prowess');
    expect(featsAt(bs, 10)).toContain('Song of Questing');
    expect(featsAt(bs, 10)).not.toContain('Dirge of Doom');
    expect(featsAt(bs, 20)).toContain('Once and Future Scion');
    expect(featsAt(bs, 20)).not.toContain('Master Skald');
  });

  it('Stygian Slayer loses the 4th talent and 10th advanced talent, plus medium armor', () => {
    const eff = effectiveClass(C.classById.get('slayer')!, readDecisions(build('slayer', 'stygian-slayer', 1)));
    expect(eff.proficiencies.armor).toContain('light');
    expect(eff.proficiencies.armor).not.toContain('medium');
    expect(eff.proficiencies.armor).not.toContain('shield');
    const ids = resolve(build('slayer', 'stygian-slayer', 12)).slots.map((s) => s.id);
    expect(ids).not.toContain('slayer-talent-L4');
    expect(ids).not.toContain('slayer-adv-talent-L10');
    expect(ids).toContain('slayer-talent-L2');
    expect(ids).toContain('slayer-talent-L6');
    expect(ids).toContain('slayer-adv-talent-L12');
    const s = build('slayer', 'stygian-slayer', 10);
    expect(featsAt(s, 4)).toContain('Invisibility');
    expect(featsAt(s, 7)).toContain('Spell Use');
    expect(featsAt(s, 7)).not.toContain('Stalker');
    expect(featsAt(s, 10)).toContain('Shadowy Mist Form');
  });

  it('Spell Sage drops arcane bond and the whole school apparatus', () => {
    const eff = effectiveClass(C.classById.get('wizard')!, readDecisions(build('wizard', 'spell-sage', 1)));
    const ids = (eff.choices ?? []).map((c) => c.id);
    expect(ids).not.toContain('arcane-bond');
    expect(ids).not.toContain('school');
    expect(ids).not.toContain('opposition');
    const ss = build('wizard', 'spell-sage', 2);
    expect(featsAt(ss, 1)).toContain('Focused Spells');
    expect(featsAt(ss, 1)).not.toContain('Arcane Bond');
    expect(featsAt(ss, 1)).not.toContain('Arcane School');
    expect(featsAt(ss, 2)).toContain('Spell Study');
  });

  it('a removed source choice stops injecting its powers and its bonus slot (stale school decision)', () => {
    // A wizard who picked a school and *then* took Spell Sage keeps the orphaned decision; neither the
    // school powers nor the specialist bonus slot may survive it.
    const stale = build('wizard', 'spell-sage', 8, { school: ['evocation'] });
    const plain = build('wizard', undefined, 8, { school: ['evocation'] });
    const specialistBlock = resolve(plain).sheet.casting.find((b) => b.classId === 'wizard')!;
    expect(specialistBlock.bonusSlot).toBeTruthy(); // the standard specialist does get one
    const sageBlock = resolve(stale).sheet.casting.find((b) => b.classId === 'wizard')!;
    expect(sageBlock.bonusSlot).toBeFalsy();
    // Evocation's 1st-level school power must not appear either.
    expect(featsAt(plain, 1)).toContain('Intense Spells');
    expect(featsAt(stale, 1)).not.toContain('Intense Spells');
  });

  it('Divine Hunter trades every teamwork feat and hunter tactics for a domain', () => {
    const eff = effectiveClass(C.classById.get('hunter')!, readDecisions(build('hunter', 'divine-hunter', 1)));
    expect(eff.classSkills).toContain('know-religion');
    expect(eff.classSkills).not.toContain('know-dungeoneering');
    const tw = resolve(build('hunter', 'divine-hunter', 18)).slots.filter((s) => s.step === 'feats' && s.id.startsWith('feat-hunter'));
    expect(tw.length).toBe(0);
    expect(resolve(build('hunter', undefined, 18)).slots.filter((s) => s.step === 'feats' && s.id.startsWith('feat-hunter')).length).toBe(6);
    const dh = build('hunter', 'divine-hunter', 3);
    expect(featsAt(dh, 3)).toContain('Domain');
    expect(featsAt(dh, 3)).toContain('Otherworldly Companion');
    expect(featsAt(dh, 3)).not.toContain('Hunter Tactics');
  });

  it('Spirit Warden loses the 2nd and 10th hexes and swaps three class skills', () => {
    const eff = effectiveClass(C.classById.get('shaman')!, readDecisions(build('shaman', 'spirit-warden', 1)));
    expect(eff.classSkills).toContain('intimidate');
    expect(eff.classSkills).not.toContain('diplomacy');
    expect(eff.classSkills).not.toContain('handle-animal');
    const ids = resolve(build('shaman', 'spirit-warden', 12)).slots.map((s) => s.id);
    expect(ids).not.toContain('shaman-hex-L2');
    expect(ids).not.toContain('shaman-hex-L10');
    expect(ids).toContain('shaman-hex-L4');
    expect(ids).toContain('shaman-hex-L12');
    const sw = build('shaman', 'spirit-warden', 10);
    expect(featsAt(sw, 2)).toContain('Rebuke Spirits');
    expect(featsAt(sw, 10)).toContain('Laugh at Death');
  });

  it('Fiendflesh Shifter replaces wild shape and both aspect picks', () => {
    const eff = effectiveClass(C.classById.get('shifter')!, readDecisions(build('shifter', 'fiendflesh-shifter', 1)));
    const ids = (eff.choices ?? []).map((c) => c.id);
    expect(ids).not.toContain('aspect');
    expect(ids).not.toContain('shifter-aspect-extra');
    const ff = build('shifter', 'fiendflesh-shifter', 14);
    expect(featsAt(ff, 1)).toContain('Fiendish Aspect');
    expect(featsAt(ff, 1)).not.toContain('Shifter Aspect');
    expect(featsAt(ff, 2)).toContain('Fiendish Resilience');
    expect(featsAt(ff, 2)).not.toContain('Defensive Instinct');
    expect(featsAt(ff, 4)).not.toContain('Wild Shape');
    expect(featsAt(ff, 9)).toContain('Chimeric Fiend');
    expect(featsAt(ff, 14)).toContain('Greater Chimeric Fiend');
  });

  it('Brown-Fur Transmuter takes the 3rd and 9th exploits and the capstone', () => {
    const ids = resolve(build('arcanist', 'brown-fur-transmuter', 20)).slots.map((s) => s.id);
    expect(ids).not.toContain('exploit-L3');
    expect(ids).not.toContain('exploit-L9');
    expect(ids).toContain('exploit');     // the 1st-level pick survives
    expect(ids).toContain('exploit-L5');
    expect(ids).toContain('exploit-L19');
    const bft = build('arcanist', 'brown-fur-transmuter', 20);
    expect(featsAt(bft, 3)).toContain('Powerful Change');
    expect(featsAt(bft, 9)).toContain('Share Transmutation');
    expect(featsAt(bft, 20)).toContain('Transmutation Supremacy');
    expect(featsAt(bft, 20)).not.toContain('Magical Supremacy');
  });

  it('Wild Caller swaps the eidolon base forms for plant forms and moves aspect to 18th', () => {
    // Assert the *resolved slot*, not the choice definition: the options are generated from the
    // companion catalogue now, and reading the definition alone once hid a regression where the
    // plant forms resolved to no companion at all.
    const slot = resolve(build('summoner', 'wild-caller', 1)).slots.find((sl) => sl.id === 'eidolon-form');
    const forms = slot?.options.map((o) => o.id) ?? [];
    expect(forms).toEqual(['cactus', 'conifer', 'mushroom', 'tree']);
    expect(forms).not.toContain('biped');
    const wc = build('summoner', 'wild-caller', 18);
    expect(featsAt(wc, 1)).toContain('Plant Eidolon');
    expect(featsAt(wc, 1)).toContain('Summon Nature’s Ally');
    expect(featsAt(wc, 10)).toContain('Fey Friend');
    expect(featsAt(wc, 10)).not.toContain('Aspect');
    expect(featsAt(wc, 18)).toContain('Aspect');
    expect(featsAt(wc, 18)).not.toContain('Greater Aspect');
    // The evolution point-buy still works off the standard pool.
    expect(resolve(wc).slots.some((s) => s.id === 'evolutions')).toBe(true);
  });

  it('Blood Arcanist gains bloodline powers and arcana on the arcanist, but no bonus spells or class skill', () => {
    const ba = build('arcanist', 'blood-arcanist', 9, { bloodline: ['draconic'] });
    // Powers arrive at the sorcerer's own levels (arcanist level = sorcerer level).
    expect(featsAt(ba, 1)).toContain('Claws');
    expect(featsAt(ba, 9)).toContain('Breath Weapon');
    // The arcana comes through…
    expect(featsAt(ba, 1)).toContain('Bloodline Arcana');
    // …but not the bonus spells the sorcerer would get.
    expect(featsAt(ba, 3)).not.toContain('Bonus Spell (1st): Mage Armor');
    expect(featsAt(ba, 5)).not.toContain('Bonus Spell (2nd): Resist Energy');
    // Exploits at 1/3/9/15 are gone; the rest of the line survives.
    const ids = resolve(build('arcanist', 'blood-arcanist', 20, { bloodline: ['draconic'] })).slots.map((s) => s.id);
    expect(ids).toContain('bloodline');
    expect(ids).not.toContain('exploit');      // the 1st-level pick is replaced
    expect(ids).not.toContain('exploit-L3');
    expect(ids).not.toContain('exploit-L9');
    expect(ids).not.toContain('exploit-L15');
    expect(ids).toContain('exploit-L5');
    expect(ids).toContain('exploit-L19');
    expect(featsAt(build('arcanist', 'blood-arcanist', 20, { bloodline: ['draconic'] }), 20)).not.toContain('Magical Supremacy');
  });

  it("the bloodline's class skill belongs to the native class, not to a borrowed bloodline", () => {
    // Celestial grants Heal, which the arcanist does not already have as a class skill.
    const sorc = effectiveClass(C.classById.get('sorcerer')!, readDecisions(build('sorcerer', undefined, 5, { bloodline: ['celestial'] })));
    expect(sorc).toBeTruthy();
    expect(resolve(build('sorcerer', undefined, 5, { bloodline: ['celestial'] })).sheet.classSkillIds).toContain('heal');
    expect(resolve(build('arcanist', 'blood-arcanist', 5, { bloodline: ['celestial'] })).sheet.classSkillIds).not.toContain('heal');
  });

  it('School Savant gains wizard school powers and the specialist bonus slot on an arcanist', () => {
    const ss = build('arcanist', 'school-savant', 8, { school: ['evocation'], opposition: ['necromancy', 'enchantment'] });
    expect(featsAt(ss, 1)).toContain('Intense Spells');
    const block = resolve(ss).sheet.casting.find((b) => b.classId === 'arcanist')!;
    // The one extra prepared spell per level, restricted to the chosen school.
    expect(block.bonusSlot).toBeTruthy();
    const ids = resolve(build('arcanist', 'school-savant', 20, { school: ['evocation'] })).slots.map((s) => s.id);
    expect(ids).toContain('school');
    expect(ids).toContain('opposition');
    expect(ids).not.toContain('exploit');      // 1st-level pick replaced
    expect(ids).not.toContain('exploit-L3');
    expect(ids).not.toContain('exploit-L7');
    expect(ids).toContain('exploit-L5');
    expect(ids).toContain('exploit-L9');
  });

  it('a plain arcanist gains none of that — the source lines are archetype-granted', () => {
    const plain = build('arcanist', undefined, 9, { bloodline: ['draconic'], school: ['evocation'] });
    expect(featsAt(plain, 1)).not.toContain('Claws');
    expect(featsAt(plain, 1)).not.toContain('Intense Spells');
    expect(resolve(plain).sheet.casting.find((b) => b.classId === 'arcanist')!.bonusSlot).toBeFalsy();
  });

  it('Merciful Healer is a single-domain cleric with the healing-channel line', () => {
    const eff = effectiveClass(C.classById.get('cleric')!, readDecisions(build('cleric', 'merciful-healer', 1)));
    expect((eff.choices ?? []).find((x) => x.id === 'domains')?.count).toBe(1);
    const mh = build('cleric', 'merciful-healer', 8);
    expect(featsAt(mh, 1)).toContain('Combat Medic');
    expect(featsAt(mh, 3)).toContain('Merciful Healing');
    expect(featsAt(mh, 8)).toContain('True Healer');
  });
});

// ---------- Companion creatures ----------
// Every number below was hand-computed from Table: Animal Companion Base Statistics, Table:
// Eidolon Base Statistics and Table: Familiars, plus the creature's own printed stat block.

function companionChar(classId: string, level: number, choices: Record<string, string[]>): CharacterDoc {
  let d = newCharacter(`t-comp-${classId}`, 'Beastmaster');
  d = withDecision(d, 'ability-base', { str: 12, dex: 12, con: 12, int: 14, wis: 14, cha: 10 });
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'floating-bonus', ['wis']);
  d = withDecision(d, 'alignment', 'N');
  d = withDecision(d, 'class', classId);
  d = withDecision(d, 'class-choices', choices);
  return atLevel(d, level);
}

describe('companions — druid 7 with a wolf', () => {
  const r = resolve(companionChar('druid', 7, { 'nature-bond': ['animal-companion'], 'animal-companion': ['wolf'] }));
  const wolf = r.sheet.companions[0];

  it("resolves one companion at the druid's own level", () => {
    expect(r.sheet.companions).toHaveLength(1);
    expect(wolf.name).toBe('Wolf');
    expect(wolf.level).toBe(7);
    expect(wolf.hd).toBe(6);
  });

  it('applies the 7th-level advancement: Large, and Str 13 +8 +2 = 23', () => {
    expect(wolf.size).toBe('Large');
    expect(wolf.abilities.str).toBe(23);   // 13 base + 8 advance + 2 table Str/Dex
    expect(wolf.abilities.dex).toBe(15);   // 15 base − 2 advance + 2 table
    expect(wolf.abilities.con).toBe(19);   // 15 base + 4 advance
  });

  it('stacks natural armour from creature, advancement and table: 2 + 2 + 4 = 8', () => {
    expect(wolf.naturalArmor).toBe(8);
    expect(wolf.ac).toBe(19);          // 10 − 1 size + 2 Dex + 8 natural
    expect(wolf.touch).toBe(11);
    expect(wolf.flatFooted).toBe(17);
  });

  it('hit points are 6d8 average (27) + 4 Con × 6 HD = 51', () => {
    expect(wolf.hp).toBe(51);
  });

  it("saves add the companion's own ability modifiers to the table's base", () => {
    expect(wolf.fort).toBe(9);   // +5 table + 4 Con
    expect(wolf.ref).toBe(7);    // +5 table + 2 Dex
    expect(wolf.will).toBe(3);   // +2 table + 1 Wis
  });

  it('a lone bite is the sole natural attack: +9 to hit, 1½× Str on damage', () => {
    expect(wolf.attacks).toHaveLength(1);
    expect(wolf.attacks[0].name).toBe('bite');
    expect(wolf.attacks[0].bonus).toBe(9);        // +4 BAB + 6 Str − 1 size
    expect(wolf.attacks[0].damage).toBe('1d8+9'); // floor(6 × 1.5)
    expect(wolf.attacks[0].notes).toContain('plus trip');
  });

  it('carries the cumulative table specials up to 7th, but not the 9th-level ones', () => {
    expect(wolf.special).toContain('Link');
    expect(wolf.special).toContain('Evasion');
    expect(wolf.special).toContain('Devotion');
    expect(wolf.special).not.toContain('Multiattack');
    expect(wolf.tricks).toBe(3);
    expect(wolf.pendingAbilityIncreases).toBe(1);  // the 4th-level one only
  });
});

describe('companions — the Nature Bond branch gates the slot', () => {
  it('offers no companion pick, and resolves none, until Nature Bond takes that branch', () => {
    const r = resolve(companionChar('druid', 3, {}));
    expect(r.slots.find((s) => s.id === 'animal-companion')).toBeUndefined();
    expect(r.sheet.companions).toHaveLength(0);
  });

  it('offers the pick once the branch is taken', () => {
    const r = resolve(companionChar('druid', 3, { 'nature-bond': ['animal-companion'] }));
    const slot = r.slots.find((s) => s.id === 'animal-companion');
    expect(slot).toBeTruthy();
    expect(slot!.options.map((o) => o.id)).toContain('wolf');
    // Picked nothing yet, so still no creature.
    expect(r.sheet.companions).toHaveLength(0);
  });

  it('a bear at 3rd has not yet advanced — still Small, still 1d4/1d3', () => {
    const r = resolve(companionChar('druid', 3, { 'nature-bond': ['animal-companion'], 'animal-companion': ['bear'] }));
    const bear = r.sheet.companions[0];
    expect(bear.size).toBe('Small');
    expect(bear.attacks.map((a) => a.name)).toEqual(['bite', '2 claws']);
    expect(bear.notes.some((n) => n.includes('Advances at effective level 4'))).toBe(true);
  });
});

describe("companions — the ranger's companion runs three levels behind", () => {
  it('a ranger 7 has a 4th-level companion', () => {
    const r = resolve(companionChar('ranger', 7, { 'hunters-bond-L4': ['animal-companion'], 'ranger-companion-L4': ['dog'] }));
    expect(r.sheet.companions).toHaveLength(1);
    expect(r.sheet.companions[0].level).toBe(4);
  });

  it('and none at all before 4th', () => {
    const early = resolve(companionChar('ranger', 3, { 'hunters-bond-L4': ['animal-companion'], 'ranger-companion-L4': ['dog'] }));
    expect(early.sheet.companions).toHaveLength(0);
  });
});

describe('companions — summoner 4 with a biped eidolon', () => {
  const r = resolve(companionChar('summoner', 4, { 'eidolon-form': ['biped'] }));
  const eid = r.sheet.companions[0];

  it('uses the eidolon table, not the animal one: 3 HD at 4th, d10 hit dice', () => {
    expect(eid.kind).toBe('eidolon');
    expect(eid.hd).toBe(3);
    expect(eid.hitDie).toBe(10);
    expect(eid.hp).toBe(19);   // floor(3 × 5.5) = 16, + 1 Con × 3
  });

  it('good saves come from the base form, not the table', () => {
    expect(eid.fort).toBe(4);   // +3 good + 1 Con
    expect(eid.will).toBe(3);   // +3 good + 0 Wis
    expect(eid.ref).toBe(2);    // +1 poor + 1 Dex
  });

  it('the table raises both Str and Dex and adds inherent natural armour', () => {
    expect(eid.abilities.str).toBe(17);   // 16 + 1
    expect(eid.abilities.dex).toBe(13);   // 12 + 1
    expect(eid.naturalArmor).toBe(4);     // 2 form + 2 table
    expect(eid.ac).toBe(15);
  });

  it('two claws are both primary — no sole-attack bonus', () => {
    expect(eid.attacks).toHaveLength(1);
    expect(eid.attacks[0].name).toBe('2 claws');
    expect(eid.attacks[0].bonus).toBe(6);        // +3 BAB + 3 Str
    expect(eid.attacks[0].damage).toBe('1d4+3'); // 1× Str, not 1½×
  });

  it('reports the evolution pool and attack cap for the level', () => {
    expect(eid.evolutions).toEqual(expect.objectContaining({ budget: 7, maxAttacks: 4, attackCount: 2 }));
    expect(eid.evolutions!.free).toContain('claws');
  });

  it('counts points spent against the pool', () => {
    const spent = resolve(companionChar('summoner', 4, { 'eidolon-form': ['biped'], evolutions: ['bite', 'large'] }));
    // bite is 1 point, large is 4 — the pool is 7, so 5 spent.
    expect(spent.sheet.companions[0].evolutions!.spent).toBe(5);
  });
});

describe('companions — a wizard 5 raven familiar reads off its master', () => {
  const wizChoices = { 'arcane-bond': ['familiar'], familiar: ['raven'], school: ['evocation'], opposition: ['necromancy', 'enchantment'] };
  const r = resolve(companionChar('wizard', 5, wizChoices));
  const fam = r.sheet.companions[0];

  it("takes half the master's hit points and the master's base attack", () => {
    expect(fam.hp).toBe(Math.floor(r.sheet.stats['hp:max'].total / 2));
    expect(fam.bab).toBe(r.sheet.stats['bab'].total);
  });

  it('sets Intelligence from the familiar table (8 at master level 5)', () => {
    expect(fam.intelligence).toBe(8);
    expect(fam.abilities.int).toBe(8);
  });

  it("takes the better of its own base saves and the master's, then adds its own modifiers", () => {
    expect(fam.fort).toBe(1);   // own base 2 beats the wizard's 1, plus −1 Con
    expect(fam.ref).toBe(4);    // own base 2 beats the wizard's 1, plus 2 Dex
    expect(fam.will).toBe(6);   // the wizard's 4 beats its own 0, plus 2 Wis
  });

  it("adds the table's natural armour and attacks with the better of Str and Dex", () => {
    expect(fam.naturalArmor).toBe(3);   // 0 own + 3 at master level 5
    expect(fam.ac).toBe(17);            // 10 + 2 size + 2 Dex + 3 natural
    expect(fam.attacks[0].bonus).toBe(fam.bab + 2 + 2);  // Dex beats Str, plus Tiny size
  });

  it('no familiar at all when Arcane Bond took the bonded-object branch', () => {
    const obj = resolve(companionChar('wizard', 5, { ...wizChoices, 'arcane-bond': ['bonded-object'] }));
    expect(obj.sheet.companions).toHaveLength(0);
    expect(obj.slots.find((s) => s.id === 'familiar')).toBeUndefined();
  });
});

describe('companions — classes that always have one', () => {
  it('a cavalier gets a mount from 1st level', () => {
    const r = resolve(companionChar('cavalier', 1, { order: ['sword'], mount: ['horse'] }));
    expect(r.sheet.companions[0].label).toBe('Mount');
    expect(r.sheet.companions[0].level).toBe(1);
  });

  it("a hunter's companion matches the hunter's level", () => {
    const r = resolve(companionChar('hunter', 6, { 'animal-companion': ['cat-big'] }));
    expect(r.sheet.companions[0].level).toBe(6);
    // Cat, big advances at 7th, so at 6 it is still Medium.
    expect(r.sheet.companions[0].size).toBe('Medium');
  });

  it("a witch's familiar is not gated behind a branch", () => {
    const r = resolve(companionChar('witch', 3, { patron: ['winter'], hex: ['evil-eye'], familiar: ['cat'] }));
    expect(r.sheet.companions).toHaveLength(1);
    expect(r.sheet.companions[0].label).toBe("Witch's Familiar");
  });

  it('a character with no companion class resolves an empty list', () => {
    expect(resolve(humanFighter1()).sheet.companions).toEqual([]);
  });
});

describe('companions — evolutions change the eidolon block', () => {
  // Summoner 8, biped: Large (4) + bite (1) + improved natural armour (1) = 6 of an 11-point pool.
  const r = resolve(companionChar('summoner', 8, {
    'eidolon-form': ['biped'],
    evolutions: ['large', 'bite', 'improved-natural-armor'],
  }));
  const eid = r.sheet.companions[0];

  it('Large changes the size and the ability scores', () => {
    expect(eid.size).toBe('Large');
    expect(eid.abilities.str).toBe(27);   // 16 form + 8 Large + 3 table
    expect(eid.abilities.dex).toBe(13);   // 12 form − 2 Large + 3 table
    expect(eid.abilities.con).toBe(17);   // 13 form + 4 Large
  });

  it('stacks natural armour from form, table and both armour evolutions', () => {
    expect(eid.naturalArmor).toBe(12);   // 2 form + 6 table + 2 Large + 2 improved
    expect(eid.ac).toBe(22);             // 10 − 1 size + 1 Dex + 12 natural
    expect(eid.touch).toBe(10);
  });

  it('every natural attack steps up a die at Large — the base form\'s included', () => {
    const byName = Object.fromEntries(eid.attacks.map((a) => [a.name, a]));
    expect(byName['2 claws'].damage).toBe('1d6+8');   // 1d4 at Medium
    expect(byName['bite'].damage).toBe('1d8+8');      // 1d6 at Medium
    // Three attacks now, so none of them is the sole attack that would earn 1½× Str.
    expect(byName['bite'].bonus).toBe(13);            // +6 BAB + 8 Str − 1 size
    expect(eid.evolutions!.attackCount).toBe(3);
  });

  it('charges 6 points and notes the Large biped\'s reach', () => {
    expect(eid.evolutions!.spent).toBe(6);
    expect(eid.evolutions!.budget).toBe(11);
    expect(eid.notes.some((n) => n.includes('10-foot reach'))).toBe(true);
  });

  it('hit points follow the raised Constitution', () => {
    expect(eid.hp).toBe(51);   // floor(6 × 5.5) = 33, + 3 Con × 6 HD
  });
});

describe('companions — evolution movement and the choices we do not model', () => {
  it('an extra pair of legs raises base speed first, so climb matches the raised speed', () => {
    const r = resolve(companionChar('summoner', 6, {
      'eidolon-form': ['quadruped'],
      evolutions: ['limbs', 'climb'],
    }));
    const eid = r.sheet.companions[0];
    expect(eid.speed.base).toBe(50);    // 40 form + 10 for the extra legs
    expect(eid.speed.climb).toBe(50);   // "equal to its base speed", after the increase
  });

  it('burrow is half the base speed', () => {
    const r = resolve(companionChar('summoner', 10, { 'eidolon-form': ['quadruped'], evolutions: ['burrow'] }));
    expect(r.sheet.companions[0].speed.burrow).toBe(20);
  });

  it('folds in senses and special qualities', () => {
    const r = resolve(companionChar('summoner', 8, { 'eidolon-form': ['quadruped'], evolutions: ['scent', 'pounce'] }));
    const eid = r.sheet.companions[0];
    expect(eid.senses).toContain('scent');
    expect(eid.special).toContain('Pounce');
  });

  it('names the evolutions it cannot fold in, and changes nothing for them', () => {
    const plain = resolve(companionChar('summoner', 8, { 'eidolon-form': ['biped'] })).sheet.companions[0];
    const r = resolve(companionChar('summoner', 8, {
      'eidolon-form': ['biped'],
      evolutions: ['improved-damage', 'ability-increase'],
    }));
    const eid = r.sheet.companions[0];
    expect(eid.attacks[0].damage).toBe(plain.attacks[0].damage);
    expect(eid.abilities.str).toBe(plain.abilities.str);
    const note = eid.notes.find((n) => n.includes('Not folded into the numbers'));
    expect(note).toBeTruthy();
    expect(note).toContain('Improved Damage');
    expect(note).toContain('Ability Increase');
    // Still charged for, because the eidolon really does have them.
    expect(eid.evolutions!.spent).toBe(3);
  });

  it('warns when the evolutions push it past the level\'s attack limit', () => {
    // Summoner 3 allows 3 attacks; a serpentine already has two, and these add three more.
    const r = resolve(companionChar('summoner', 3, {
      'eidolon-form': ['serpentine'],
      evolutions: ['sting', 'tentacle', 'gore'],
    }));
    const eid = r.sheet.companions[0];
    expect(eid.evolutions!.attackCount).toBe(5);
    expect(eid.notes.some((n) => n.includes('3-attack limit'))).toBe(true);
  });
});

describe('companions — the Synthesist wears its eidolon', () => {
  function synthesist(level: number, evolutions: string[] = []): CharacterDoc {
    let d = newCharacter('t-synth', 'Ilyra Fused');
    // Deliberately feeble physical scores, so anything the eidolon supplies is unmistakable.
    d = withDecision(d, 'ability-base', { str: 8, dex: 8, con: 8, int: 12, wis: 12, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'summoner');
    d = withDecision(d, 'archetype', 'synthesist');
    d = withDecision(d, 'class-choices', { 'eidolon-form': ['biped'], evolutions });
    return atLevel(d, level);
  }
  const r = resolve(synthesist(8));
  const s = r.sheet.stats;
  const eid = r.sheet.companions[0];

  it('takes the eidolon\'s physical scores and keeps its own mental ones', () => {
    // Biped 16/12/13, plus the table's +3 to Strength and Dexterity at summoner 8.
    expect(s['ability:str'].total).toBe(19);
    expect(s['ability:dex'].total).toBe(15);
    expect(s['ability:con'].total).toBe(13);
    // Mental scores are the summoner's own, untouched.
    expect(s['ability:int'].total).toBe(12);
    expect(s['ability:cha'].total).toBe(18);   // 16 + 2 human
  });

  it('wears the eidolon\'s natural armour, and Shielded Meld on top', () => {
    // 10 + 2 Dex + 8 natural (2 form + 6 table) + 2 shield from Shielded Meld.
    expect(s['ac'].total).toBe(22);
    expect(s['ac'].lines.some((l) => l.label.includes('Fused eidolon'))).toBe(true);
    expect(s['ac'].lines.some((l) => l.label === 'Shielded Meld')).toBe(true);
  });

  it('applies Shielded Meld\'s circumstance bonus to every save', () => {
    for (const sv of ['fort', 'ref', 'will']) {
      expect(s[`save:${sv}`].lines.some((l) => l.label === 'Shielded Meld'), sv).toBe(true);
    }
  });

  it('the eidolon is marked fused and its hit points are called temporary', () => {
    expect(eid.fused).toBe(true);
    expect(eid.label).toBe('Fused Eidolon');
    expect(eid.notes.some((n) => n.includes('temporary hit points'))).toBe(true);
    expect(eid.notes.some((n) => n.includes('not folded into your attack lines'))).toBe(true);
  });

  it('swaps out every ability that assumed two separate creatures', () => {
    const names = r.sheet.progression.flatMap((p) => p.features);
    expect(names).toContain('Fused Eidolon');
    expect(names).toContain('Fused Link');
    expect(names).toContain('Shielded Meld');
    expect(names).toContain("Maker's Jump");
    expect(names).not.toContain('Eidolon');
    expect(names).not.toContain('Life Link');
    expect(names).not.toContain('Bond Senses');
    expect(names).not.toContain('Shield Ally');
    expect(names).not.toContain("Maker's Call");
  });

  it('evolutions the eidolon buys reach the synthesist, because they are his scores now', () => {
    const large = resolve(synthesist(8, ['large']));
    // Large gives the eidolon +8 Str / +4 Con / −2 Dex and +2 more natural armour.
    expect(large.sheet.stats['ability:str'].total).toBe(27);
    expect(large.sheet.stats['ability:con'].total).toBe(17);
    expect(large.sheet.stats['ability:dex'].total).toBe(13);
    expect(large.sheet.companions[0].naturalArmor).toBe(10);
  });

  it('a plain summoner keeps its own scores and a separate eidolon', () => {
    const plain = resolve(companionChar('summoner', 8, { 'eidolon-form': ['biped'] }));
    expect(plain.sheet.stats['ability:str'].total).toBe(12);
    expect(plain.sheet.companions[0].fused).toBeFalsy();
    expect(plain.sheet.companions[0].label).toBe('Eidolon');
  });
});

describe('companions — breadth batch', () => {
  it('a Wild Caller resolves a plant eidolon, not an empty companion list', () => {
    // The regression this test exists for: making eidolon-form a companion pick left the Wild
    // Caller's plant forms pointing at nothing, so the archetype silently lost its stat block.
    let d = newCharacter('t-wc', 'Wild Caller');
    d = withDecision(d, 'ability-base', { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 16 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'summoner');
    d = withDecision(d, 'archetype', 'wild-caller');
    d = withDecision(d, 'class-choices', { 'eidolon-form': ['tree'] });
    const r = resolve(atLevel(d, 8));
    const tree = r.sheet.companions[0];
    expect(tree).toBeTruthy();
    expect(tree.name).toBe('Tree');
    // Tree: +4 natural of its own, +6 from the table at summoner 8.
    expect(tree.naturalArmor).toBe(10);
    expect(tree.attacks[0].name).toBe('2 slams');
    // Fort and Ref good, Will poor — the reverse of a biped.
    expect(tree.fort).toBeGreaterThan(tree.will);
  });

  it('a Small avian eidolon growing to Large steps its attacks up twice', () => {
    const small = resolve(companionChar('summoner', 8, { 'eidolon-form': ['avian'] })).sheet.companions[0];
    expect(small.size).toBe('Small');
    expect(small.attacks[0].name).toBe('2 claws');
    expect(small.attacks[0].damage.startsWith('1d3')).toBe(true);

    const large = resolve(companionChar('summoner', 8, { 'eidolon-form': ['avian'], evolutions: ['large'] })).sheet.companions[0];
    expect(large.size).toBe('Large');
    // Small → Medium → Large is two steps on the natural-attack ladder: 1d3 → 1d4 → 1d6.
    expect(large.attacks[0].damage.startsWith('1d6')).toBe(true);
  });

  it('the Flight evolution grants a fly speed equal to the base speed', () => {
    const r = resolve(companionChar('summoner', 8, { 'eidolon-form': ['quadruped'], evolutions: ['flight'] }));
    const eid = r.sheet.companions[0];
    expect(eid.speed.base).toBe(40);
    expect(eid.speed.fly).toBe(40);
  });

  it('an aquatic eidolon swims and has the heaviest hide of the base forms', () => {
    const eid = resolve(companionChar('summoner', 4, { 'eidolon-form': ['aquatic'] })).sheet.companions[0];
    expect(eid.speed.swim).toBe(40);
    expect(eid.naturalArmor).toBe(6);   // 4 form + 2 table at summoner 4
    expect(eid.evolutions!.free).toContain('gills');
  });

  it('a tyrannosaurus companion advances at 7th to Large with a grabbing bite', () => {
    const early = resolve(companionChar('druid', 6, { 'nature-bond': ['animal-companion'], 'animal-companion': ['tyrannosaurus'] })).sheet.companions[0];
    expect(early.size).toBe('Medium');
    const late = resolve(companionChar('druid', 7, { 'nature-bond': ['animal-companion'], 'animal-companion': ['tyrannosaurus'] })).sheet.companions[0];
    expect(late.size).toBe('Large');
    expect(late.naturalArmor).toBe(11);   // 4 own + 3 advancement + 4 table at 7
    expect(late.attacks[0].damage.startsWith('2d6')).toBe(true);
    expect(late.attacks[0].notes).toContain('plus grab');
  });

  it('a vermin companion carries its poison and mindless tags', () => {
    const spider = resolve(companionChar('druid', 5, { 'nature-bond': ['animal-companion'], 'animal-companion': ['spider-giant'] })).sheet.companions[0];
    expect(spider.special).toContain('mindless vermin');
    expect(spider.special.some((s) => s.includes('poison'))).toBe(true);
    expect(spider.senses).toContain('tremorsense 30 ft');
  });

  it('a swim-only companion reports no land speed', () => {
    const dolphin = resolve(companionChar('druid', 4, { 'nature-bond': ['animal-companion'], 'animal-companion': ['dolphin'] })).sheet.companions[0];
    expect(dolphin.speed.base).toBe(0);
    expect(dolphin.speed.swim).toBe(80);
  });

  it('offers the whole animal catalogue to a druid, and only plant forms to a Wild Caller', () => {
    const druid = resolve(companionChar('druid', 3, { 'nature-bond': ['animal-companion'] }));
    const ids = druid.slots.find((s) => s.id === 'animal-companion')!.options.map((o) => o.id);
    expect(ids.length).toBe(C.ANIMAL_COMPANIONS.length);
    expect(ids).toContain('wolf');
    expect(ids).toContain('tyrannosaurus');
  });
});

describe('archetypes — fourth-per-class batch 1 (Core)', () => {
  const build = (cls: string, archetype: string | undefined, level: number, choices?: Record<string, string[]>): CharacterDoc => {
    let d = newCharacter('t-fourth1', 'X');
    d = withDecision(d, 'ability-base', { str: 13, dex: 14, con: 12, int: 13, wis: 14, cha: 12 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['dex']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    if (choices) d = withDecision(d, 'class-choices', choices);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];

  it('Polearm Master trades bravery, all armor training and every weapon-training step', () => {
    const pm = build('fighter', 'polearm-master', 19);
    expect(featsAt(pm, 2)).toContain('Pole Fighting');
    expect(featsAt(pm, 2)).not.toContain('Bravery +1');
    expect(featsAt(pm, 3)).toContain('Steadfast Pike');
    expect(featsAt(pm, 3)).not.toContain('Armor Training 1');
    expect(featsAt(pm, 5)).toContain('Polearm Training');
    expect(featsAt(pm, 19)).toContain('Polearm Parry');
    expect(featsAt(pm, 19)).not.toContain('Armor Mastery');
    // Bonus feats are untouched — a polearm master is still a fighter.
    const eff = effectiveClass(C.classById.get('fighter')!, readDecisions(build('fighter', 'polearm-master', 1)));
    expect(eff.bonusFeats?.levels).toEqual(C.classById.get('fighter')!.bonusFeats?.levels);
  });

  it('Knife Master keeps sneak attack but loses trapfinding and trap sense', () => {
    const km = build('rogue', 'knife-master', 3);
    expect(featsAt(km, 1)).toContain('Hidden Blade');
    expect(featsAt(km, 1)).toContain('Sneak Stab');
    expect(featsAt(km, 1)).toContain('Sneak Attack +1d6');
    expect(featsAt(km, 1)).not.toContain('Trapfinding');
    expect(featsAt(km, 3)).toContain('Blade Sense');
    expect(featsAt(km, 3)).not.toContain('Trap Sense +1');
  });

  it('Armored Hulk gains heavy armor proficiency and loses fast movement', () => {
    const eff = effectiveClass(C.classById.get('barbarian')!, readDecisions(build('barbarian', 'armored-hulk', 1)));
    expect(eff.proficiencies.armor).toContain('heavy');
    const ah = build('barbarian', 'armored-hulk', 5);
    expect(featsAt(ah, 1)).toContain('Indomitable Stance');
    expect(featsAt(ah, 1)).not.toContain('Fast Movement');
    expect(featsAt(ah, 2)).toContain('Armored Swiftness');
    expect(featsAt(ah, 5)).toContain('Improved Armored Swiftness');
    expect(featsAt(ah, 5)).not.toContain('Improved Uncanny Dodge');
    // It is still a barbarian: rage survives, and so does its pool.
    expect(resolve(ah).sheet.pools.map((p) => p.id)).toContain('rage');
  });

  it('Martial Artist may be any alignment and has no ki pool at all', () => {
    const ma = build('monk', 'martial-artist', 12);
    expect(featsAt(ma, 4)).toContain('Exploit Weakness');
    expect(featsAt(ma, 4)).not.toContain('Ki Pool');
    expect(featsAt(ma, 12)).not.toContain('Abundant Step');
    // The pool is keyed by class, so this is the check that it follows the feature away.
    const pools = resolve(ma).sheet.pools.map((p) => p.id);
    expect(pools).not.toContain('ki');
    expect(pools).toContain('stunning-fist');
    // A plain monk of the same level keeps both.
    expect(resolve(build('monk', undefined, 12)).sheet.pools.map((p) => p.id)).toContain('ki');
  });

  it('a chaotic Martial Artist raises no alignment issue, but a plain monk does', () => {
    const chaotic = (arch?: string) => {
      let d = newCharacter('t-ma', 'Rowan');
      d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 12, int: 10, wis: 14, cha: 10 });
      d = withDecision(d, 'race', 'human');
      d = withDecision(d, 'floating-bonus', ['wis']);
      d = withDecision(d, 'alignment', 'CG');
      d = withDecision(d, 'class', 'monk');
      if (arch) d = withDecision(d, 'archetype', arch);
      return resolve(atLevel(d, 5)).issues.filter((i) => i.slot === 'alignment');
    };
    expect(chaotic('martial-artist')).toHaveLength(0);
    expect(chaotic().length).toBeGreaterThan(0);
  });

  it('Magician swaps the performance line and the lore abilities, keeping the rounds pool', () => {
    const mg = build('bard', 'magician', 14);
    expect(featsAt(mg, 1)).toContain('Dweomercraft');
    expect(featsAt(mg, 1)).not.toContain('Inspire Courage');
    expect(featsAt(mg, 1)).toContain('Bardic Performance');   // the rounds themselves stay
    expect(featsAt(mg, 8)).toContain('Spell Suppression');
    expect(featsAt(mg, 8)).not.toContain('Dirge of Doom');
    expect(featsAt(mg, 14)).toContain('Metamagic Mastery');
    expect(featsAt(mg, 10)).not.toContain('Jack of All Trades');
    expect(resolve(mg).sheet.pools.map((p) => p.id)).toContain('performance');
  });

  it('Storm Druid cannot take an animal companion at all', () => {
    const sd = build('druid', 'storm-druid', 13);
    const r = resolve(sd);
    const bond = r.slots.find((s) => s.id === 'nature-bond');
    expect(bond!.options.map((o) => o.id)).toEqual(['domain']);
    // The companion pick hangs off the companion branch, which no longer exists.
    expect(r.slots.find((s) => s.id === 'animal-companion')).toBeUndefined();
    expect(r.sheet.companions).toHaveLength(0);
    expect(featsAt(sd, 2)).toContain('Windwalker');
    expect(featsAt(sd, 2)).not.toContain('Woodland Stride');
    expect(featsAt(sd, 13)).toContain('Storm Lord');
    // Wild shape is untouched, so its pool survives.
    expect(r.sheet.pools.map((p) => p.id)).toContain('wild-shape');
  });
});

describe('archetypes — fourth-per-class batch 2 (Core casters and the ranger)', () => {
  const build = (cls: string, archetype: string | undefined, level: number, choices?: Record<string, string[]>): CharacterDoc => {
    let d = newCharacter('t-fourth2', 'X');
    d = withDecision(d, 'ability-base', { str: 12, dex: 14, con: 12, int: 15, wis: 13, cha: 15 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    if (choices) d = withDecision(d, 'class-choices', choices);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];
  const slotIds = (doc: CharacterDoc) => resolve(doc).slots.map((s) => s.id);

  it('Exploiter Wizard trades bond and school for a reservoir and exploits', () => {
    const ew = build('wizard', 'exploiter-wizard', 17);
    expect(featsAt(ew, 1)).toContain('Arcane Reservoir');
    expect(featsAt(ew, 1)).toContain('Exploiter Exploit');
    expect(featsAt(ew, 1)).not.toContain('Arcane Bond');
    expect(featsAt(ew, 1)).not.toContain('Arcane School');
    const ids = slotIds(ew);
    expect(ids).not.toContain('arcane-bond');
    expect(ids).not.toContain('school');
    expect(ids).not.toContain('opposition');
    expect(ids).toContain('exploit');
    expect(ids).toContain('exploit-L5');
    expect(ids).toContain('exploit-L17');
  });

  it('the reservoir pool follows the granted feature onto a class that has none', () => {
    // Pools are keyed by class id, so a wizard could not have had one before this.
    const pools = resolve(build('wizard', 'exploiter-wizard', 10)).sheet.pools;
    const res = pools.find((p) => p.id === 'reservoir');
    expect(res).toBeTruthy();
    expect(res!.max).toBe(8);   // 3 + half of 10, the arcanist's own formula
    // A plain wizard still has none.
    expect(resolve(build('wizard', undefined, 10, { school: ['evocation'], opposition: ['necromancy', 'enchantment'] }))
      .sheet.pools.find((p) => p.id === 'reservoir')).toBeFalsy();
  });

  it('an Exploiter Wizard has no specialist bonus slot, because it has no school', () => {
    const block = resolve(build('wizard', 'exploiter-wizard', 9)).sheet.casting.find((b) => b.classId === 'wizard');
    expect(block).toBeTruthy();
    expect(block!.bonusSlot).toBeFalsy();
  });

  it('Freebooter marks a target instead of a favored enemy, and keeps no companion', () => {
    const fb = build('ranger', 'freebooter', 7);
    expect(featsAt(fb, 1)).toContain("Freebooter's Bane");
    expect(featsAt(fb, 1)).not.toContain('Favored Enemy');
    expect(featsAt(fb, 4)).toContain("Freebooter's Bond");
    expect(featsAt(fb, 7)).toContain('Fast Swimmer');
    expect(featsAt(fb, 7)).not.toContain('Woodland Stride');
    const r = resolve(fb);
    expect(r.slots.find((s) => s.id === 'hunters-bond-L4')).toBeUndefined();
    expect(r.sheet.companions).toHaveLength(0);
    // Favored terrain is untouched — only the enemy line goes.
    expect(featsAt(fb, 3)).toContain('Favored Terrain');
  });

  it('Seeker suppresses exactly the 3rd- and 15th-level bloodline powers', () => {
    const seeker = build('sorcerer', 'seeker-sorcerer', 15, { bloodline: ['draconic'] });
    const plain = build('sorcerer', undefined, 15, { bloodline: ['draconic'] });
    expect(featsAt(seeker, 1)).toContain('Tinkering');
    expect(featsAt(seeker, 1)).not.toContain('Eschew Materials');
    expect(featsAt(seeker, 3)).toContain('Seeker Lore');
    expect(featsAt(seeker, 15)).toContain('Seeker Magic');
    // The draconic bloodline powers at 3 and 15 are gone; the ones at 9 and 20 are not. Counting
    // features would not show this — Seeker grants its own ability at each of those levels.
    expect(featsAt(plain, 3)).toContain('Dragon Resistances');
    expect(featsAt(seeker, 3)).not.toContain('Dragon Resistances');
    expect(featsAt(plain, 15)).toContain('Wings');
    expect(featsAt(seeker, 15)).not.toContain('Wings');
    expect(featsAt(seeker, 9)).toEqual(featsAt(plain, 9));
    expect(featsAt(seeker, 9)).toContain('Breath Weapon');
    expect(resolve(seeker).sheet.classSkillIds).toContain('disable-device');
  });
});

describe('archetypes — fourth-per-class batch 3 (base classes)', () => {
  const build = (cls: string, archetype: string | undefined, level: number, choices?: Record<string, string[]>): CharacterDoc => {
    let d = newCharacter('t-fourth3', 'X');
    d = withDecision(d, 'ability-base', { str: 12, dex: 14, con: 12, int: 15, wis: 12, cha: 15 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    if (choices) d = withDecision(d, 'class-choices', choices);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];

  it('Mindchemist swaps the mutagen for a cognatogen and poison use for recall', () => {
    const mc = build('alchemist', 'mindchemist', 3);
    expect(featsAt(mc, 1)).toContain('Cognatogen');
    expect(featsAt(mc, 1)).not.toContain('Mutagen');
    expect(featsAt(mc, 2)).toContain('Perfect Recall');
    expect(featsAt(mc, 2)).not.toContain('Poison Use');
    // Poison resistance and bombs are untouched.
    expect(featsAt(mc, 2)).toContain('Poison Resistance +2');
    expect(featsAt(mc, 1)).toContain('Bomb 1d6');
  });

  it('White-Haired Witch loses the 1st-level hex but keeps the recurring line', () => {
    const whw = build('witch', 'white-haired-witch', 18, { patron: ['winter'], familiar: ['cat'] });
    const ids = resolve(whw).slots.map((s) => s.id);
    // The bare `hex` slot is the 1st-level grant; the suffixed ones are the even-level line.
    expect(ids).not.toContain('hex');
    expect(ids).toContain('hex-L2');
    expect(ids).toContain('hex-L18');
    expect(featsAt(whw, 1)).toContain('White Hair');
    expect(featsAt(whw, 1)).not.toContain('Hex');
    expect(featsAt(whw, 10)).not.toContain('Major Hex');
    expect(featsAt(whw, 18)).not.toContain('Grand Hex');
    // The familiar is a witch's, untouched by this archetype.
    expect(resolve(whw).sheet.companions).toHaveLength(1);
  });

  it('Daring Champion trades the mount for panache, and the pool follows', () => {
    const dc = build('cavalier', 'daring-champion', 11, { order: ['sword'] });
    expect(featsAt(dc, 1)).toContain("Champion's Finesse");
    expect(featsAt(dc, 1)).not.toContain('Mount');
    expect(featsAt(dc, 3)).toContain('Nimble');
    expect(featsAt(dc, 4)).toContain('Panache and Deeds');
    expect(featsAt(dc, 11)).toContain('Advanced Deeds');
    const r = resolve(dc);
    expect(r.slots.find((s) => s.id === 'mount')).toBeUndefined();
    expect(r.sheet.companions).toHaveLength(0);
    // Cha 17 → +3 panache; challenge survives because the archetype leaves it alone.
    const pools = Object.fromEntries(r.sheet.pools.map((p) => [p.id, p.max]));
    expect(pools['panache']).toBe(3);
    expect(pools['challenge']).toBeGreaterThan(0);
    // A plain cavalier has a mount and no panache.
    const plain = resolve(build('cavalier', undefined, 11, { order: ['sword'], mount: ['horse'] }));
    expect(plain.sheet.pools.find((p) => p.id === 'panache')).toBeFalsy();
    expect(plain.sheet.companions).toHaveLength(1);
  });

  it('Staff Magus gives up martial weapons and the armor line', () => {
    const eff = effectiveClass(C.classById.get('magus')!, readDecisions(build('magus', 'staff-magus', 1)));
    expect(eff.proficiencies.weapons).not.toContain('martial');
    expect(eff.proficiencies.weapons).toContain('simple');
    const sm = build('magus', 'staff-magus', 13);
    expect(featsAt(sm, 1)).toContain('Quarterstaff Master');
    expect(featsAt(sm, 7)).toContain('Quarterstaff Defense');
    expect(featsAt(sm, 7)).not.toContain('Medium Armor');
    expect(featsAt(sm, 13)).not.toContain('Heavy Armor');
    expect(featsAt(sm, 10)).toContain('Staff Weapon');
    expect(featsAt(sm, 10)).not.toContain('Fighter Training');
    // Spell combat, spellstrike and the arcane pool are what make it a magus — all kept.
    expect(featsAt(sm, 1)).toContain('Spell Combat');
    expect(resolve(sm).sheet.pools.map((p) => p.id)).toContain('arcane-pool');
  });

  it('Bolt Ace swaps seven deeds and gunsmithing for the crossbow line', () => {
    const ba = build('gunslinger', 'bolt-ace', 15);
    expect(featsAt(ba, 1)).toContain('Crossbow Maven');
    expect(featsAt(ba, 1)).not.toContain('Gunsmith');
    expect(featsAt(ba, 1)).toContain('Deed: Sharp Shoot');
    expect(featsAt(ba, 1)).not.toContain('Deed: Deadeye');
    expect(featsAt(ba, 5)).toContain('Crossbow Training');
    expect(featsAt(ba, 5)).not.toContain('Gun Training 1');
    expect(featsAt(ba, 11)).toContain('Deed: Inexplicable Reload');
    expect(featsAt(ba, 15)).toContain('Deed: Pinning Shot');
    // The deeds it keeps are still there, and so is grit.
    expect(featsAt(ba, 3)).toContain('Deed: Pistol-Whip');
    expect(resolve(ba).sheet.pools.map((p) => p.id)).toContain('grit');
  });
});

describe('archetypes — fourth-per-class batch 4 (hybrid classes)', () => {
  const build = (cls: string, archetype: string | undefined, level: number, choices?: Record<string, string[]>): CharacterDoc => {
    let d = newCharacter('t-fourth4', 'X');
    d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 12, int: 13, wis: 12, cha: 13 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    if (choices) d = withDecision(d, 'class-choices', choices);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];

  it('Wild Child gives a companion to a class that has none, paid for with every bonus feat', () => {
    const wc = build('brawler', 'wild-child', 8, { 'animal-companion': ['wolf'] });
    const r = resolve(wc);
    expect(featsAt(wc, 1)).toContain('Animal Companion');
    expect(r.sheet.companions).toHaveLength(1);
    // A brawler's companion runs at its own level, so a brawler 8 has an 8th-level wolf.
    expect(r.sheet.companions[0].level).toBe(8);
    expect(r.sheet.companions[0].name).toBe('Wolf');
    // Every brawler bonus feat is spent: the line disappears entirely.
    const eff = effectiveClass(C.classById.get('brawler')!, readDecisions(wc));
    expect(eff.bonusFeats).toBeUndefined();
    expect(r.slots.filter((s) => s.step === 'feats').map((s) => s.id).join(' ')).not.toContain('brawler');
    expect(r.sheet.classSkillIds).toContain('heal');
    // A plain brawler has neither companion nor Heal, and keeps its feats.
    const plain = resolve(build('brawler', undefined, 8));
    expect(plain.sheet.companions).toHaveLength(0);
    expect(effectiveClass(C.classById.get('brawler')!, readDecisions(build('brawler', undefined, 8))).bonusFeats).toBeTruthy();
  });

  it("Bloodrider's feral mount arrives at 5th, four levels behind", () => {
    const early = resolve(build('bloodrager', 'bloodrider', 4, { bloodline: ['draconic'], 'feral-mount-L5': ['horse'] }));
    expect(early.sheet.companions).toHaveLength(0);
    const br = build('bloodrager', 'bloodrider', 12, { bloodline: ['draconic'], 'feral-mount-L5': ['horse'] });
    const r = resolve(br);
    expect(r.sheet.companions).toHaveLength(1);
    expect(r.sheet.companions[0].label).toBe('Feral Mount');
    expect(r.sheet.companions[0].level).toBe(8);   // bloodrager 12 − 4
    expect(featsAt(br, 1)).toContain('Fast Rider');
    expect(featsAt(br, 1)).not.toContain('Fast Movement');
    expect(featsAt(br, 9)).toContain('Blood Bond');
    // The 9th-level bloodline feat is gone; the others remain.
    const levels = effectiveClass(C.classById.get('bloodrager')!, readDecisions(br)).bonusFeats?.levels;
    expect(levels).toEqual([6, 12, 15, 18]);
  });

  it('Vanguard takes the 2nd- and 4th-level talents but keeps the rest of the line', () => {
    const vg = build('slayer', 'vanguard', 10);
    const ids = resolve(vg).slots.map((s) => s.id);
    expect(ids).not.toContain('slayer-talent-L2');
    expect(ids).not.toContain('slayer-talent-L4');
    expect(ids).toContain('slayer-talent-L6');
    expect(ids).toContain('slayer-talent-L8');
    expect(ids).toContain('slayer-adv-talent-L10');
    expect(featsAt(vg, 1)).toContain('Lookout');
    expect(featsAt(vg, 1)).not.toContain('Track');
    expect(featsAt(vg, 7)).toContain('Ever Ready');
    expect(featsAt(vg, 7)).not.toContain('Stalker');
    // Studied target and sneak attack are what make it a slayer — untouched.
    expect(featsAt(vg, 1)).toContain('Studied Target');
    expect(featsAt(vg, 3)).toContain('Sneak Attack +1d6');
  });

  it('Picaroon trades four deeds and finesse for firearm work', () => {
    const pc = build('swashbuckler', 'picaroon', 11);
    const eff = effectiveClass(C.classById.get('swashbuckler')!, readDecisions(pc));
    expect(eff.proficiencies.weapons).toContain('pistol');
    expect(featsAt(pc, 1)).toContain('Deed: Melee Shooter');
    expect(featsAt(pc, 1)).not.toContain('Deed: Opportune Parry and Riposte');
    expect(featsAt(pc, 1)).not.toContain('Swashbuckler Finesse');
    expect(featsAt(pc, 3)).toContain('Deed: Quick Clear');
    expect(featsAt(pc, 7)).toContain('Deed: Gun Feint');
    expect(featsAt(pc, 11)).toContain('Deed: Close Shot');
    // The deeds it keeps, and panache itself, are still there.
    expect(featsAt(pc, 1)).toContain('Deed: Derring-Do');
    expect(resolve(pc).sheet.pools.map((p) => p.id)).toContain('panache');
  });
});

describe('archetypes — fourth-per-class batch 5 (divine and investigative)', () => {
  const build = (cls: string, archetype: string | undefined, level: number, choices?: Record<string, string[]>): CharacterDoc => {
    let d = newCharacter('t-fourth5', 'X');
    d = withDecision(d, 'ability-base', { str: 12, dex: 13, con: 12, int: 14, wis: 15, cha: 13 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['wis']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    if (choices) d = withDecision(d, 'class-choices', choices);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];

  it('Divine Strategist has one domain and no channel — nor its pool', () => {
    const ds = build('cleric', 'divine-strategist', 8, { domains: ['war'] });
    const eff = effectiveClass(C.classById.get('cleric')!, readDecisions(ds));
    expect((eff.choices ?? []).find((c) => c.id === 'domains')?.count).toBe(1);
    expect(featsAt(ds, 1)).toContain('Master Tactician');
    expect(featsAt(ds, 1)).not.toContain('Channel Energy 1d6');
    expect(featsAt(ds, 8)).toContain('Tactical Expertise');
    // The channel pool follows the feature away — POOL_FEATURE at work.
    expect(resolve(ds).sheet.pools.map((p) => p.id)).not.toContain('channel');
    expect(resolve(build('cleric', undefined, 8, { domains: ['war', 'law'] })).sheet.pools.map((p) => p.id)).toContain('channel');
  });

  it('Spirit Guide keeps the 1st, 11th and 19th revelations and no others', () => {
    const sg = build('oracle', 'spirit-guide', 19, { mystery: ['battle'] });
    const ids = resolve(sg).slots.map((s) => s.id);
    expect(ids).toContain('revelation');
    expect(ids).toContain('revelation-L11');
    expect(ids).toContain('revelation-L19');
    expect(ids).not.toContain('revelation-L3');
    expect(ids).not.toContain('revelation-L7');
    expect(ids).not.toContain('revelation-L15');
    expect(featsAt(sg, 3)).toContain('Bonded Spirit');
    expect(resolve(sg).sheet.classSkillIds).toContain('know-planes');
  });

  it('Profiler trades the whole trap and poison line, and the 7th-level talent', () => {
    const pf = build('investigator', 'profiler', 7);
    expect(featsAt(pf, 1)).toContain('Expert Profiler');
    expect(featsAt(pf, 1)).not.toContain('Trapfinding');
    expect(featsAt(pf, 2)).not.toContain('Poison Lore / Resistance');
    expect(featsAt(pf, 3)).not.toContain('Trap Sense +1');
    expect(featsAt(pf, 4)).toContain('Blood Sleuth');
    expect(featsAt(pf, 4)).not.toContain('Swift Alchemy');
    const ids = resolve(pf).slots.map((s) => s.id);
    expect(ids).toContain('investigator-talent-L3');
    expect(ids).not.toContain('investigator-talent-L7');
    // Inspiration and studied combat are the class's spine — untouched.
    expect(featsAt(pf, 4)).toContain('Studied Combat');
    expect(resolve(pf).sheet.pools.map((p) => p.id)).toContain('inspiration');
  });

  it('Abolisher swaps the gaze and the alignment sense', () => {
    const ab = build('inquisitor', 'abolisher', 5);
    expect(featsAt(ab, 1)).toContain('Revealing Gaze');
    expect(featsAt(ab, 1)).not.toContain('Stern Gaze');
    expect(featsAt(ab, 2)).toContain('Expose Aberration');
    expect(featsAt(ab, 2)).not.toContain('Detect Alignment');
    // Bane and judgment are altered in text but kept as features.
    expect(featsAt(ab, 5)).toContain('Bane');
    expect(resolve(ab).sheet.pools.map((p) => p.id)).toContain('judgment');
  });

  it('Forester is a hunter with no companion at all', () => {
    const fo = build('hunter', 'forester', 11);
    const r = resolve(fo);
    expect(r.slots.find((s) => s.id === 'animal-companion')).toBeUndefined();
    expect(r.sheet.companions).toHaveLength(0);
    expect(featsAt(fo, 1)).toContain('Animal Focus (self only)');
    expect(featsAt(fo, 1)).not.toContain('Animal Companion');
    expect(featsAt(fo, 5)).toContain('Favored Terrain');
    expect(featsAt(fo, 11)).toContain('Breath of Life');
    expect(featsAt(fo, 11)).not.toContain('Speak with Master');
    // A plain hunter still has one.
    expect(resolve(build('hunter', undefined, 11, { 'animal-companion': ['wolf'] })).sheet.companions).toHaveLength(1);
  });
});

describe('archetypes — fourth-per-class batch 6 (completing the pass)', () => {
  const build = (cls: string, archetype: string | undefined, level: number, choices?: Record<string, string[]>): CharacterDoc => {
    let d = newCharacter('t-fourth6', 'X');
    d = withDecision(d, 'ability-base', { str: 14, dex: 12, con: 13, int: 12, wis: 14, cha: 14 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', cls);
    if (choices) d = withDecision(d, 'class-choices', choices);
    if (archetype) d = withDecision(d, 'archetype', archetype);
    return atLevel(d, level);
  };
  const featsAt = (doc: CharacterDoc, lvl: number) =>
    resolve(doc).sheet.progression.find((r) => r.level === lvl)?.features ?? [];

  it('Divine Defender trades mercies for a shared aura', () => {
    // Paladins are Lawful Good only, so this one needs its own alignment.
    let d = newCharacter('t-dd', 'Seelah');
    d = withDecision(d, 'ability-base', { str: 15, dex: 12, con: 13, int: 10, wis: 12, cha: 15 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['cha']);
    d = withDecision(d, 'alignment', 'LG');
    d = withDecision(d, 'class', 'paladin');
    d = withDecision(d, 'archetype', 'divine-defender');
    const dd = atLevel(d, 6);
    const r = resolve(dd);
    expect(featsAt(dd, 3)).toContain('Shared Defense');
    expect(featsAt(dd, 5)).toContain('Divine Bond (armor)');
    expect(r.slots.find((s) => s.id === 'mercy-L3')).toBeUndefined();
    // Lay on hands is what pays for it, so the pool must survive.
    expect(r.sheet.pools.map((p) => p.id)).toContain('lay-on-hands');
  });

  it('Rageshaper may be chaotic where a shifter may not, and loses its aspect', () => {
    const chaotic = (arch?: string) => {
      let d = newCharacter('t-rs', 'Feral');
      d = withDecision(d, 'ability-base', { str: 16, dex: 14, con: 14, int: 10, wis: 13, cha: 8 });
      d = withDecision(d, 'race', 'human');
      d = withDecision(d, 'floating-bonus', ['str']);
      d = withDecision(d, 'alignment', 'CE');
      d = withDecision(d, 'class', 'shifter');
      if (arch) d = withDecision(d, 'archetype', arch);
      return resolve(atLevel(d, 9));
    };
    expect(chaotic('rageshaper').issues.filter((i) => i.slot === 'alignment')).toHaveLength(0);
    expect(chaotic().issues.filter((i) => i.slot === 'alignment').length).toBeGreaterThan(0);
    const rs = build('shifter', 'rageshaper', 9);
    expect(featsAt(rs, 1)).toContain('Devastating Form');
    expect(featsAt(rs, 1)).not.toContain('Shifter Aspect');
    expect(featsAt(rs, 4)).not.toContain('Wild Shape');
    expect(resolve(rs).slots.find((s) => s.id === 'aspect')).toBeUndefined();
  });

  it('Herald of the Horn bonds a horn in place of Scribe Scroll', () => {
    const hh = build('skald', 'herald-of-the-horn', 11);
    expect(featsAt(hh, 1)).toContain('Arcane Bond (horn)');
    expect(featsAt(hh, 1)).not.toContain('Scribe Scroll');
    expect(featsAt(hh, 5)).toContain('Rousing Retort');
    expect(featsAt(hh, 7)).toContain('Horn Call');
    expect(featsAt(hh, 7)).not.toContain('Lore Master');
    expect(featsAt(hh, 11)).toContain('Crumbling Blast');
    // Raging song is the class — untouched, pool and all.
    expect(resolve(hh).sheet.pools.map((p) => p.id)).toContain('raging-song');
  });

  it('Forgepriest takes one blessing and spends two bonus feats at the forge', () => {
    const fp = build('warpriest', 'forgepriest', 6, { blessings: ['war'] });
    const eff = effectiveClass(C.classById.get('warpriest')!, readDecisions(fp));
    expect((eff.choices ?? []).find((c) => c.id === 'blessings')?.count).toBe(1);
    expect(eff.bonusFeats?.levels).toEqual([9, 12, 15, 18]);
    expect(featsAt(fp, 3)).toContain('Craft Magic Arms and Armor');
    expect(featsAt(fp, 4)).toContain("Creator's Bond");
    expect(featsAt(fp, 4)).not.toContain('Channel Energy');
    // Fervor is the warpriest's engine and stays.
    expect(resolve(fp).sheet.pools.map((p) => p.id)).toContain('fervor');
  });

  it('Unsworn Shaman has no sworn spirit to pick', () => {
    const us = build('shaman', 'unsworn-shaman', 6, { 'spirit-animal': ['raven'] });
    const r = resolve(us);
    expect(r.slots.find((s) => s.id === 'spirit')).toBeUndefined();
    expect(featsAt(us, 1)).toContain('Minor Spirit');
    expect(featsAt(us, 1)).not.toContain('Spirit');
    expect(featsAt(us, 4)).toContain('Broader Wandering');
    // The spirit animal is still a familiar, and still resolves.
    expect(r.sheet.companions).toHaveLength(1);
    expect(r.sheet.companions[0].label).toBe('Spirit Animal');
  });

  it('the fourth-per-class pass is complete: every class has at least four', () => {
    for (const c of C.CLASSES) {
      const n = (c.archetypes ?? []).length;
      // The vampire hunter has no standard published archetypes and stays at zero by design.
      if (c.id === 'vampire-hunter') { expect(n).toBe(0); continue; }
      expect(n, `${c.id} has only ${n} archetypes`).toBeGreaterThanOrEqual(4);
    }
  });
});
