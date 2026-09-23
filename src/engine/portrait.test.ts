import { describe, it, expect } from 'vitest';
import { resolve } from './resolve';
import { characterFacts, characterPortrait, type PortraitFormat } from './portrait';
import { newCharacter, withDecision } from './character';
import { DEITIES } from '../content/deities';
import { DEITY_SYMBOL, RACE_LOOK } from '../content/iconography';
import { RACES } from '../content/races';
import type { CharacterDoc } from './types';
import { DESCRIPTION_KEY } from './description';

const facts = (d: CharacterDoc) => characterFacts(d, resolve(d));
const portrait = (d: CharacterDoc, f?: PortraitFormat) => characterPortrait(d, resolve(d), f);

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

describe('every deity has an authored holy symbol', () => {
  // The whole point of the iconography table is that a named god with no described symbol gets
  // drawn as a generic amulet. A deity added later without an entry would silently do that again.
  it('covers the full pantheon', () => {
    const missing = DEITIES.filter((d) => d.id !== 'none' && !DEITY_SYMBOL[d.id]).map((d) => d.id);
    expect(missing).toEqual([]);
  });

  it('names no deity the catalogue does not have', () => {
    const ids = new Set(DEITIES.map((d) => d.id));
    expect(Object.keys(DEITY_SYMBOL).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('gives "(None)" no symbol, since atheism has no iconography', () => {
    expect(DEITY_SYMBOL['none']).toBeUndefined();
  });
});

describe('race appearance', () => {
  // Six staples are excluded on purpose — a generator draws them right from the name, and
  // describing an elf as slender with pointed ears is dilution. Listing them here rather than
  // allowing any gap means a race added later forces a decision instead of silently getting none.
  const DELIBERATELY_PLAIN = new Set(['human', 'dwarf', 'elf', 'halfling', 'half-elf', 'half-orc']);

  it('covers every race that is not a fantasy staple', () => {
    const missing = RACES
      .filter((r) => !RACE_LOOK[r.id] && !DELIBERATELY_PLAIN.has(r.id))
      .map((r) => r.id);
    expect(missing).toEqual([]);
  });

  it('names no race the catalogue does not have', () => {
    const ids = new Set(RACES.map((r) => r.id));
    expect(Object.keys(RACE_LOOK).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('describes only what is visible, never temperament or culture', () => {
    // A portrait cannot show that a race is "shy and elusive"; a line that says so is wasted.
    const banned = /\b(shy|proud|distrust|culture|tribe|society|believe|worship|temperament)\b/i;
    expect(Object.entries(RACE_LOOK).filter(([, v]) => banned.test(v)).map(([k]) => k)).toEqual([]);
  });

  it('puts the race description into both prompts', () => {
    const tengu = withDecision(fighter(), 'race', 'tengu');
    expect(facts(tengu)).toContain('crow-like beak');
    expect(characterPortrait(tengu, resolve(tengu), 'image')).toContain('## What a Tengu looks like');
  });

  it('says nothing extra for a human', () => {
    expect(characterPortrait(fighter(), resolve(fighter()), 'image')).not.toContain('looks like');
    expect(facts(fighter())).toContain('Race: Human\n');
  });

  it('keeps Golarion gnomes distinct from the generic kind', () => {
    const gnome = withDecision(fighter(), 'race', 'gnome');
    expect(facts(gnome)).toContain('vivid natural colour');
  });
});

describe('the portrait prompt', () => {
  function devout(): CharacterDoc {
    let d = withDecision(fighter(), 'alignment', 'LG');
    d = withDecision(d, 'deity', 'iomedae');
    return { ...d, purchases: { ...d.purchases, javelin: 3, 'rations-trail': 5 } };
  }
  const img = (d: CharacterDoc) => portrait(d, 'image');

  it('describes the holy symbol rather than only naming the god', () => {
    const p = img(devout());
    expect(p).toContain('a sword and sun');
    expect(p).toContain('Use that emblem and no other');
  });

  it('adds the clarifying detail where a terse symbol would be guessed at', () => {
    const lamashtu = withDecision(withDecision(fighter(), 'alignment', 'CE'), 'deity', 'lamashtu');
    const p = img(lamashtu);
    expect(p).toContain('a three-eyed jackal face — the third eye is vertical, set in the centre of the forehead');
  });

  it('leaves an unambiguous symbol alone rather than padding it', () => {
    const torag = withDecision(withDecision(fighter(), 'alignment', 'LG'), 'deity', 'torag');
    expect(img(torag)).toContain('holy symbol is an iron hammer.');
  });

  it('states the symbol detail once, not in every section', () => {
    const p = img(devout());
    const occurrences = p.split('drawn as a longsword surrounded by a burst of light').length - 1;
    expect(occurrences).toBe(1);
  });

  it('never forbids a shape the required symbol contains', () => {
    // "Do not draw a sunburst" next to "the symbol is a sword and sun" is a contradiction, and it
    // was in the first draft.
    expect(img(devout())).not.toMatch(/Do not substitute[^\n]*sunburst/);
  });

  it('separates what is worn from what is in a pack', () => {
    const p = img(devout());
    expect(p).toContain('Armour: Full plate');
    expect(p).toContain('Main hand: Greatsword');
    // A weapon can hang off a person; trail rations cannot.
    expect(p).toContain('Javelin ×3');
    expect(p).not.toContain('Rations');
  });

  it('keeps the equipment instruction consistent with the optional list', () => {
    expect(img(devout())).not.toContain('and nothing else');
  });

  it('does not tell a generator that a human is not a human', () => {
    expect(img(fighter())).not.toContain('Their race is Human');
  });

  it('does name a race a generator would default away from', () => {
    const elf = withDecision(wizard(), 'race', 'elf');
    expect(img(elf)).toContain('Their race is Elf');
  });

  it('says nothing about faith for a character with no deity', () => {
    const p = img(fighter());
    expect(p).not.toContain('## Faith');
    expect(p).not.toContain('holy symbol');
  });

  it('tells the generator not to draw the character sheet itself', () => {
    expect(img(fighter())).toContain('Do not render text, numbers, dice');
  });

  it('leaves everything the sheet does not decide open', () => {
    expect(img(fighter())).toContain('## Left to you');
  });

  it('stays free of template holes across build shapes', () => {
    for (const d of [fighter(), wizard(), fighter(1), newCharacter('t-por-img-blank', 'Nobody')]) {
      const p = img(d);
      expect(p).not.toMatch(/\bundefined\b/);
      expect(p).not.toMatch(/\bNaN\b/);
      expect(p).not.toContain('[object Object]');
    }
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

describe("generated text: the player's own name never leaves the sheet", () => {
  // The export is meant to be pasted into somebody else's assistant. The character's details are
  // the point; the player's real name is not, and `player` is marked privateToSheet for that
  // reason. Nothing enforced it before, and a second export path would not have been noticed.
  const withPlayer = (): CharacterDoc => {
    let d = newCharacter('t-priv', 'Seelah');
    d = withDecision(d, 'ability-base', { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 14 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']);
    d = withDecision(d, 'alignment', 'LG');
    d = withDecision(d, 'class', 'paladin');
    return withDecision(d, DESCRIPTION_KEY, {
      gender: 'woman', pronouns: 'she/her', age: '27', height: "6'1\"", weight: '190 lb',
      hair: 'black', eyes: 'amber', homeland: 'Lastwall', player: 'Jane Q. Private',
    });
  };

  it('keeps it out of every export format', () => {
    const doc = withPlayer();
    const res = resolve(doc);
    for (const format of ['prompt', 'data', 'image'] as const)
      expect(characterPortrait(doc, res, format), format).not.toContain('Jane Q. Private');
    expect(characterFacts(doc, res)).not.toContain('Jane Q. Private');
  });

  it('still carries the details that are the character', () => {
    // The privacy filter must not take the description with it.
    const facts = characterFacts(withPlayer(), resolve(withPlayer()));
    expect(facts).toContain('she/her');
    expect(facts).toContain('Lastwall');
  });
});

describe('generated text: counts agree with their nouns', () => {
  // Every issue that states a count has to read correctly at one and at many. Rather than
  // constructing each message, sweep a spread of half-finished builds and check the invariant on
  // whatever they produce: no "1 things", and no "3 thing".
  const SINGULARS = ['rank', 'point', 'trait', 'spell', 'decision', 'feat', 'item', 'level'];

  const messages = (): string[] => {
    const out: string[] = [];
    const base = (id: string) => {
      let d = newCharacter(id);
      d = withDecision(d, 'ability-base', { str: 10, dex: 10, con: 10, int: 14, wis: 10, cha: 10 });
      return d;
    };
    // A sweep of shapes: nothing chosen, a caster mid-selection, an over-spent skill sheet, a
    // wizard whose spellbook no longer fits, and a trait list that is too long.
    const docs: CharacterDoc[] = [];
    docs.push(base('t-p1'));
    for (const cls of ['wizard', 'cleric', 'fighter', 'barbarian', 'summoner']) {
      let d = withDecision(base(`t-p-${cls}`), 'race', 'human');
      d = withDecision(d, 'floating-bonus', ['int']);
      d = withDecision(d, 'class', cls);
      docs.push(d, { ...d, level: 5 });
      docs.push(withDecision(d, 'skill-ranks', { spellcraft: 1 }));
      docs.push(withDecision(d, 'traits', ['fates-favored']));
      docs.push(withDecision(d, 'spell-picks', { 1: ['magic-missile'] }));
    }
    // Over-full and over-spent shapes, so the messages that scold a count are actually produced —
    // without these the checks below pass by never seeing them.
    let book = withDecision(base('t-p-book'), 'race', 'human');
    book = withDecision(book, 'class', 'wizard');
    docs.push(withDecision(book, 'spell-picks',
      ['magic-missile', 'mage-armor', 'shield', 'burning-hands', 'grease', 'identify', 'sleep', 'charm-person']));
    let ranks = withDecision(base('t-p-ranks'), 'race', 'human');
    ranks = withDecision(ranks, 'class', 'rogue');
    docs.push(withDecision(ranks, 'skill-ranks', { stealth: 4, acrobatics: 3 }));
    let extra = withDecision(base('t-p-traits'), 'race', 'human');
    extra = withDecision(extra, 'class', 'fighter');
    docs.push(withDecision(extra, 'traits', ['fates-favored', 'reactionary', 'magical-lineage', 'bruising-intellect']));
    for (const d of docs) for (const i of resolve(d).issues) out.push(i.message);
    return out;
  };

  it('produces the messages these checks are about', () => {
    // A guard on the guards: if the sweep stops triggering them, the checks below go quiet.
    const all = messages().join(' | ');
    expect(all, 'no spellbook complaint').toMatch(/Spellbook: \d+ spells exceed/);
    expect(all, 'no rank complaint').toMatch(/ranks exceed the max/);
    expect(all, 'no unspent-rank count').toMatch(/skill ranks? (unspent|over)/);
  });

  it('never writes a plural noun after a count of one', () => {
    const bad = messages().filter((m) => SINGULARS.some((w) => new RegExp(`\\b1 ${w}s\\b`).test(m)));
    expect([...new Set(bad)], bad.join(' | ')).toEqual([]);
  });

  it('never writes a singular noun after a count above one', () => {
    // The lookahead also rules out a hyphenated compound: "15 point-buy points" is not "15 point".
    const bad = messages().filter((m) => SINGULARS.some((w) => new RegExp(`\\b(?!1\\b)\\d+ ${w}(?![\\w-])`).test(m)));
    expect([...new Set(bad)], bad.join(' | ')).toEqual([]);
  });

  it('never punts on the plural with "(s)"', () => {
    // One message used to read "Choose 2 more 1st-level spell(s)".
    const lazy = messages().filter((m) => m.includes('(s)'));
    expect([...new Set(lazy)], lazy.join(' | ')).toEqual([]);
  });

  it('agrees the verb with a plural subject', () => {
    // "2 ranks exceeds the max" — the subject is plural, so the verb must be too.
    const bad = messages().filter((m) => /\b(ranks|spells|points|traits|feats|items) exceeds\b/.test(m));
    expect([...new Set(bad)], bad.join(' | ')).toEqual([]);
  });
});

describe('generated text: nothing leaks an internal id', () => {
  it('names skills, feats and spells rather than printing their ids', () => {
    let d = newCharacter('t-ids', 'Ezren');
    d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 12, int: 17, wis: 12, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['int']);
    d = withDecision(d, 'class', 'wizard');
    d = withDecision(d, 'skill-ranks', { 'know-arcana': 3, 'know-religion': 2, spellcraft: 3 });
    d = withDecision(d, 'spell-picks', { 1: ['magic-missile', 'mage-armor'] });
    const facts = characterFacts({ ...d, level: 3 }, resolve({ ...d, level: 3 }));
    // A lookup that misses falls back to the raw id, which is how a kebab-case token would appear.
    const kebab = [...facts.matchAll(/(?<![\w"'(/-])[a-z]+(?:-[a-z]+){1,3}(?![\w-])/g)]
      .map((m) => m[0])
      .filter((w) => !['half-orc', 'half-elf', 'sword-and-board', 'two-handed', 'one-handed',
        'two-weapon', 'well-versed', 'she-her', 'they-them', 'non-combat'].includes(w));
    expect(kebab, kebab.join(', ')).toEqual([]);
  });
});
