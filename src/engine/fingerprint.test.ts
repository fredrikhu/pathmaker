import { describe, it, expect } from 'vitest';
import { resolve } from './resolve';
import { fingerprint, spellLean } from './fingerprint';
import { newCharacter, withDecision } from './character';
import type { CharacterDoc } from './types';
import { spellById } from '../content/spells';
import { SPELL_ROLE_OVERRIDES } from '../content/spell-tactics';

// The fingerprint classifies rather than computes, so these tests assert on the tags it emits.
// The underlying numbers are already covered by resolve.test.ts and are not re-checked here.

function fighter(level = 5): CharacterDoc {
  let d = newCharacter('t-fp-fighter', 'Valeria');
  d = withDecision(d, 'ability-base', { str: 15, dex: 14, con: 14, int: 10, wis: 8, cha: 10 });
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'floating-bonus', ['str']);
  d = withDecision(d, 'alignment', 'LN');
  d = withDecision(d, 'class', 'fighter');
  d = withDecision(d, 'favored-class', 'fighter');
  d = withDecision(d, 'feats', { 'feat-1': 'power-attack', 'feat-human': 'cleave', 'feat-fighter': 'weapon-focus' });
  return { ...d, level };
}

function wizard(level = 5): CharacterDoc {
  let d = newCharacter('t-fp-wizard', 'Ezren');
  d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 12, int: 17, wis: 12, cha: 10 });
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'floating-bonus', ['int']);
  d = withDecision(d, 'alignment', 'N');
  d = withDecision(d, 'class', 'wizard');
  d = withDecision(d, 'spell-picks', { 1: ['sleep', 'charm-person', 'grease'], 2: ['glitterdust', 'web'] });
  return { ...d, level };
}

/** Equip from the catalogue. `purchases` has to name the item too — `sheet.inventory` is built
 *  from what was bought, and the fingerprint reads the equipped slots off that. */
function carrying(d: CharacterDoc, equipped: Partial<CharacterDoc['equipped']>, items: string[]): CharacterDoc {
  return {
    ...d,
    purchases: Object.fromEntries(items.map((i) => [i, 1])),
    equipped: { armor: null, mainHand: null, offHand: null, ...equipped },
  };
}

const fp = (d: CharacterDoc) => fingerprint(d, resolve(d));

describe('offense style follows what is actually in the character\'s hands', () => {
  it('a greatsword alone is a two-hander', () => {
    const f = fp(carrying(fighter(), { mainHand: 'greatsword' }, ['greatsword']));
    expect(f.offense.style).toBe('two-hander');
    expect(f.offense.mainHand).toBe('Greatsword');
  });

  it('a longsword with a shield is sword-and-board', () => {
    const f = fp(carrying(fighter(), { mainHand: 'longsword', offHand: 'heavy-shield' }, ['longsword', 'heavy-shield']));
    expect(f.offense.style).toBe('sword-and-board');
  });

  it('a weapon in each hand is two-weapon fighting', () => {
    const f = fp(carrying(fighter(), { mainHand: 'longsword', offHand: 'short-sword' }, ['longsword', 'short-sword']));
    expect(f.offense.style).toBe('two-weapon');
    expect(f.offense.offHand).toBe('Sword, short');
  });

  it('a bow is archery, and archery has no melee option', () => {
    const f = fp(carrying(fighter(), { mainHand: 'longbow' }, ['longbow']));
    expect(f.offense.style).toBe('archery');
    expect(f.offense.ability).toBe('dex');
    expect(f.offense.hasRanged).toBe(true);
    expect(f.gaps).toContain('no-melee-option');
  });

  it('an empty-handed caster is a spell build', () => {
    expect(fp(wizard()).offense.style).toBe('spell');
  });
});

describe('defensive posture and the save that will kill you', () => {
  it('reads the worn armour, not the class', () => {
    expect(fp(carrying(fighter(), { armor: 'full-plate' }, ['full-plate'])).defense.posture).toBe('heavy');
    expect(fp(carrying(fighter(), { armor: 'chain-shirt' }, ['chain-shirt'])).defense.posture).toBe('light');
    expect(fp(fighter()).defense.posture).toBe('unarmored');
  });

  it('names the weak save on a fighter with a dumped Wisdom', () => {
    const f = fp(fighter());
    expect(f.defense.weakSave).toBe('will');
    expect(f.gaps).toContain('weak-will');
  });

  it('stays silent when the saves are close together', () => {
    // A level-1 fighter's spread is Fort +4 / Ref +2 / Will −1 at worst; a balanced array keeps
    // every save within the noise threshold and should not be reported as a hole.
    let d = newCharacter('t-fp-even', 'Even');
    d = withDecision(d, 'ability-base', { str: 12, dex: 12, con: 12, int: 12, wis: 16, cha: 12 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'class', 'fighter');
    const f = fp(d);
    const spread = Math.max(...Object.values(f.defense.saves)) - Math.min(...Object.values(f.defense.saves));
    expect(spread).toBeLessThan(4);
    expect(f.defense.weakSave).toBeNull();
  });
});

describe('feat themes need a cluster, not a single pickup', () => {
  it('claims power-attack from one signature feat', () => {
    expect(fp(fighter()).featThemes).toContain('power-attack');
  });

  it('does not claim mobility from a lone Dodge', () => {
    const d = withDecision(fighter(), 'feats', { 'feat-1': 'dodge' });
    expect(fp(d).featThemes).not.toContain('mobility');
  });

  it('claims mobility once Dodge is joined by Mobility', () => {
    const d = withDecision(fighter(), 'feats', { 'feat-1': 'dodge', 'feat-human': 'mobility' });
    expect(fp(d).featThemes).toContain('mobility');
  });

  it('does not read a wizard\'s free Scribe Scroll as an interest in crafting', () => {
    expect(fp(wizard()).featThemes).not.toContain('crafting');
  });

  it('claims crafting once a crafting feat is actually chosen', () => {
    const d = withDecision(wizard(), 'feats', { 'feat-1': 'craft-wondrous-item' });
    expect(fp(d).featThemes).toContain('crafting');
  });
});

describe('casting shape', () => {
  const f = fp(wizard());

  it('reports the primary casting class and its top slot', () => {
    expect(f.casting?.classId).toBe('wizard');
    expect(f.casting?.ability).toBe('int');
    expect(f.casting?.topSpellLevel).toBe(3);
    expect(f.casting?.pickCount).toBe(5);
  });

  it('leans controller on a list of Sleep, Charm Person, Grease, Glitterdust and Web', () => {
    expect(f.casting?.lean).toBe('controller');
    expect(f.combatRoles).toContain('controller');
  });

  it('has no casting block for a fighter', () => {
    expect(fp(fighter()).casting).toBeNull();
  });

  it('falls back to what the class is for while no spells are picked', () => {
    const bare = withDecision(wizard(), 'spell-picks', {});
    expect(fp(bare).casting?.pickCount).toBe(0);
    expect(fp(bare).casting?.lean).toBe('controller');
  });
});

describe('roles and party jobs', () => {
  it('an armoured full-BAB build is frontline', () => {
    const f = fp(carrying(fighter(), { armor: 'full-plate', mainHand: 'greatsword' }, ['full-plate', 'greatsword']));
    expect(f.combatRoles).toContain('frontline');
    expect(f.strengths).toContain('full-bab');
    expect(f.strengths).toContain('durable');
  });

  it('a cleric counts as a healer through its channel pool, with no spells picked', () => {
    let d = newCharacter('t-fp-cleric', 'Kyra');
    d = withDecision(d, 'ability-base', { str: 12, dex: 10, con: 12, int: 10, wis: 17, cha: 14 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'NG');
    d = withDecision(d, 'class', 'cleric');
    const f = fp({ ...d, level: 5 });
    expect(f.partyRoles).toContain('healer');
    expect(f.combatRoles).toContain('support');
    expect(f.strengths).toContain('self-sufficient');
    expect(f.gaps).not.toContain('no-healing');
  });

  it('counts a face only when the social ranks keep pace with the level', () => {
    const one = withDecision({ ...fighter(), level: 5 }, 'skill-ranks', { diplomacy: 1 });
    expect(fp(one).partyRoles).not.toContain('face');
    const many = withDecision({ ...fighter(), level: 5 }, 'skill-ranks', { diplomacy: 5 });
    expect(fp(many).partyRoles).toContain('face');
  });

  it('always names a combat role, even for a character with nothing chosen', () => {
    const blank = newCharacter('t-fp-blank', 'Nobody');
    const f = fp(blank);
    expect(f.combatRoles.length).toBeGreaterThan(0);
    expect(f.offense.style).toBe('none');
  });
});

describe('gaps are structural, never a verdict on the numbers', () => {
  it('flags a melee-only build as having no ranged option', () => {
    const f = fp(carrying(fighter(), { mainHand: 'greatsword' }, ['greatsword']));
    expect(f.gaps).toContain('no-ranged-option');
  });

  it('clears it once the character carries a bow', () => {
    const f = fp(carrying(fighter(), { mainHand: 'greatsword' }, ['greatsword', 'longbow']));
    expect(f.gaps).not.toContain('no-ranged-option');
  });

  it('counts a blasting spell list as a ranged option', () => {
    const d = withDecision(wizard(), 'spell-picks', { 1: ['magic-missile'] });
    expect(fp(d).gaps).not.toContain('no-ranged-option');
  });

  it('counts a control spell as a ranged option too — reach is not the same as damage', () => {
    const d = withDecision(wizard(), 'spell-picks', { 1: ['grease'], 2: ['web'] });
    expect(fp(d).gaps).not.toContain('no-ranged-option');
  });

  it('still flags a caster whose whole list is touch and personal', () => {
    const d = withDecision(wizard(), 'spell-picks', { 1: ['mage-armor'], 3: ['vampiric-touch'] });
    expect(fp(d).gaps).toContain('no-ranged-option');
  });

  it('flags a build leaning on four or more abilities', () => {
    let d = newCharacter('t-fp-mad', 'Spread');
    d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 14, int: 14, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'class', 'fighter');
    expect(fp(d).gaps).toContain('ability-hungry');
  });
});

describe('spellLean', () => {
  const lean = (id: string) => spellLean(spellById.get(id)!);

  it('reads healing off the damage label, not the school', () => {
    expect(lean('cure-light-wounds')).toBe('healer');
  });

  it('treats temporary hit points as a buff — Aid carries both a buff and a damage roll', () => {
    expect(lean('aid')).toBe('buffer');
  });

  it('classifies plain damage as blasting', () => {
    expect(lean('fireball')).toBe('blaster');
    expect(lean('magic-missile')).toBe('blaster');
  });

  it('uses the "(harmless)" marker to spot an ally-facing spell', () => {
    expect(lean('invisibility')).toBe('buffer');
  });

  it('takes the authored override over the school guess', () => {
    // Evocation, but a light source rather than a blast.
    expect(lean('light')).toBe('utility');
    // Transmutation, but area control rather than a buff.
    expect(lean('entangle')).toBe('controller');
    // Conjuration, but travel rather than control.
    expect(lean('dimension-door')).toBe('utility');
  });

  it('still falls back to the school for an unlisted spell', () => {
    expect(lean('hold-person')).toBe('controller'); // Enchantment
    expect(lean('detect-magic')).toBe('utility'); // Divination
  });

  it('has no override naming a spell that does not exist', () => {
    const missing = Object.keys(SPELL_ROLE_OVERRIDES).filter((id) => !spellById.get(id));
    expect(missing).toEqual([]);
  });
});
