import { describe, it, expect } from 'vitest';
import { resolve } from './resolve';
import { characterFacts, characterPortrait } from './portrait';
import { newCharacter, withDecision } from './character';
import type { CharacterDoc } from './types';

const facts = (d: CharacterDoc) => characterFacts(d, resolve(d));
const portrait = (d: CharacterDoc, f?: 'prompt' | 'data') => characterPortrait(d, resolve(d), f);

function fighter(level = 6): CharacterDoc {
  let d = newCharacter('t-por-fighter', 'Valeria');
  d = withDecision(d, 'ability-base', { str: 15, dex: 13, con: 14, int: 10, wis: 8, cha: 12 });
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'floating-bonus', ['str']);
  d = withDecision(d, 'alignment', 'LN');
  d = withDecision(d, 'class', 'fighter');
  d = withDecision(d, 'feats', { 'feat-1': 'power-attack', 'feat-human': 'cleave' });
  d = withDecision(d, 'skill-ranks', { intimidate: 6, climb: 2 });
  return {
    ...d, level,
    purchases: { greatsword: 1, 'full-plate': 1 },
    equipped: { armor: 'full-plate', mainHand: 'greatsword', offHand: null },
  };
}

function wizard(): CharacterDoc {
  let d = newCharacter('t-por-wizard', 'Ezren');
  d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 12, int: 17, wis: 12, cha: 10 });
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'floating-bonus', ['int']);
  d = withDecision(d, 'alignment', 'N');
  d = withDecision(d, 'class', 'wizard');
  d = withDecision(d, 'spell-picks', { 1: ['sleep', 'grease'], 2: ['web'] });
  d = withDecision(d, 'skill-ranks', { 'know-arcana': 5, spellcraft: 5 });
  return { ...d, level: 5 };
}

describe('the character block states what the sheet settled', () => {
  const t = facts(fighter());

  it('names the character, the alignment in full, and the class at level', () => {
    expect(t).toContain('Name: Valeria');
    expect(t).toContain('Alignment: Lawful Neutral');
    expect(t).toContain('Race: Human');
    expect(t).toContain('Class: Fighter 6');
  });

  it('spells out the ability scores rather than abbreviating them', () => {
    expect(t).toContain('Strength 17 (+3)');
    expect(t).toContain('Wisdom 8 (−1)');
  });

  it('describes how they fight in words, not tags', () => {
    expect(t).toContain('a large weapon held in both hands');
    expect(t).toContain('Greatsword');
    expect(t).toContain('hold the front line');
  });

  it('lists trained skills with their totals, and the feats by name', () => {
    expect(t).toMatch(/Intimidate \+\d/);
    expect(t).toContain('Power Attack');
    expect(t).toContain('Cleave');
  });

  it('lists the equipment actually bought', () => {
    expect(t).toContain('Greatsword');
    expect(t).toContain('Full plate');
  });
});

describe('threads worth pulling', () => {
  it('points at a dumped ability as an unanswered question', () => {
    const t = facts(fighter());
    expect(t).toContain('Threads worth pulling');
    expect(t).toContain('Wisdom 8 is below average');
    expect(t).toContain('The sheet does not say why');
  });

  it('points at the skill the character actually invested in', () => {
    expect(facts(fighter())).toContain('more training into Intimidate than anything else');
  });

  it('says nothing about a dumped score when none is dumped', () => {
    let d = newCharacter('t-por-even', 'Even');
    d = withDecision(d, 'ability-base', { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'class', 'fighter');
    expect(facts(d)).not.toContain('is below average');
  });

  it('surfaces a deity and what they care about', () => {
    let d = withDecision(fighter(), 'alignment', 'LG');
    d = withDecision(d, 'deity', 'iomedae');
    const t = facts(d);
    expect(t).toContain('They worship Iomedae');
    expect(t).toContain('How devout they are is not recorded');
  });
});

describe('spells and traits carry through', () => {
  it('groups chosen spells by level', () => {
    const t = facts(wizard());
    expect(t).toContain('Level 1: Sleep, Grease');
    expect(t).toContain('Level 2: Web');
  });

  it('includes trait descriptions, since a trait is backstory the player already picked', () => {
    const d = withDecision(fighter(), 'traits', ['rich-parents']);
    const t = facts(d);
    expect(t).toContain('backstory the player already chose');
    expect(t).toContain('Rich Parents');
  });
});

describe('the two formats', () => {
  it('wraps the data in instructions by default', () => {
    const p = portrait(fighter());
    expect(p).toContain('Pathfinder 1st Edition');
    expect(p).toContain('**Appearance**');
    expect(p).toContain('# Character sheet');
    expect(p).toContain('Name: Valeria');
  });

  it('returns the data alone when asked for it', () => {
    const d = portrait(fighter(), 'data');
    expect(d).not.toContain('**Appearance**');
    expect(d).toContain('Name: Valeria');
    expect(d).toBe(facts(fighter()));
  });

  it('tells the model not to contradict the sheet, and to invent where it is silent', () => {
    const p = portrait(fighter());
    expect(p).toContain('Do not contradict it');
    expect(p).toContain('invent freely');
  });

  it('does not assume the character\'s gender', () => {
    expect(portrait(fighter())).toContain('they/them');
  });
});

describe('the sentences agree with their subject', () => {
  // The tag labels are dropped into sentences whose subject is "they". A table that mixes an
  // adjective ("unusually accurate") with a verb phrase ("can take a great deal of punishment")
  // yields "They are can take a great deal of punishment" — which a model will then imitate.
  const builds = [fighter(), wizard(), fighter(1)];

  it('never produces a doubled verb', () => {
    for (const b of builds) {
      expect(facts(b)).not.toMatch(/\bThey are (can|have|cannot|move|perceive|shrug|carry|cast)\b/);
    }
  });

  it('does not conjugate for a singular subject after "they"', () => {
    for (const b of builds) {
      expect(facts(b)).not.toMatch(/they: [a-z]+s\b/);
    }
  });

  it('reads correctly for the two cases that were wrong', () => {
    const t = facts(fighter());
    expect(t).toContain('They can take a great deal of punishment.');
    expect(t).toContain('In a fight, they: hold the front line');
  });
});

describe('the text never leaks a template hole', () => {
  // A block assembled from optional lookups is exactly where an `undefined` reaches a user, and
  // pasting "Race: undefined" into a model produces confident nonsense about it.
  const cases: [string, CharacterDoc][] = [
    ['a full fighter', fighter()],
    ['a caster', wizard()],
    ['a brand-new character', newCharacter('t-por-blank', 'Nobody')],
    ['a character with a race but no class', withDecision(newCharacter('t-por-race', 'Halfling'), 'race', 'halfling')],
    ['level 1 with nothing bought', { ...fighter(1), purchases: {}, equipped: { armor: null, mainHand: null, offHand: null } }],
  ];

  for (const [label, doc] of cases) {
    it(`stays clean for ${label}`, () => {
      const p = portrait(doc);
      expect(p).not.toMatch(/\bundefined\b/);
      expect(p).not.toMatch(/\bNaN\b/);
      expect(p).not.toContain('[object Object]');
      expect(p.length).toBeGreaterThan(200);
      // Only the data block: the instructions legitimately end a line with a colon to introduce
      // a list, whereas a bare "Race:" in the facts means a lookup came back empty.
      expect(facts(doc)).not.toMatch(/^[A-Za-z][A-Za-z ]*:\s*$/m);
    });
  }
});
