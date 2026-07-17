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
