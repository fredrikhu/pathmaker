import { describe, it, expect } from 'vitest';
import { resolve } from './resolve';
import { fingerprint } from './fingerprint';
import { playstyleBrief } from './playstyle';
import { newCharacter, withDecision } from './character';
import type { CharacterDoc } from './types';
import { CLASSES } from '../content/classes';
import {
  CLASS_PLAYSTYLE, GAP_TEXT, LEAN_TEXT, PARTY_TEXT, POOL_TEXT, POSTURE_TEXT, ROLE_TEXT,
  STRENGTH_TEXT, STYLE_TEXT, THEME_TEXT,
} from '../content/playstyle';

// Coverage of the tag-keyed tables is enforced by the compiler: they are declared as
// Record<Tag, string>, so adding a tag without authoring its text fails the typecheck rather than
// producing an `undefined` paragraph. What is tested here is everything that escapes that — the
// class table (keyed by a loose string), the assembly rules, and the house style of the prose.

const brief = (d: CharacterDoc) => playstyleBrief(fingerprint(d, resolve(d)));

function fighter(level = 6): CharacterDoc {
  let d = newCharacter('t-ps-fighter', 'Valeria');
  d = withDecision(d, 'ability-base', { str: 15, dex: 13, con: 14, int: 10, wis: 8, cha: 12 });
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'floating-bonus', ['str']);
  d = withDecision(d, 'alignment', 'LN');
  d = withDecision(d, 'class', 'fighter');
  d = withDecision(d, 'feats', { 'feat-1': 'power-attack', 'feat-human': 'cleave' });
  return {
    ...d, level,
    purchases: { greatsword: 1, 'full-plate': 1 },
    equipped: { armor: 'full-plate', mainHand: 'greatsword', offHand: null },
  };
}

describe('every class has authored playstyle text', () => {
  it('covers the full class list', () => {
    const missing = CLASSES.filter((c) => !CLASS_PLAYSTYLE[c.id]).map((c) => c.id);
    expect(missing).toEqual([]);
  });

  it('names no class the catalogue does not have', () => {
    const ids = new Set(CLASSES.map((c) => c.id));
    expect(Object.keys(CLASS_PLAYSTYLE).filter((id) => !ids.has(id))).toEqual([]);
  });
});

describe('house style: prose describes intent, the sheet states facts', () => {
  // Two kinds of fragment with different rules. Noun phrases are assembled into the identity
  // sentence, so they must NOT be punctuated or capitalised; everything else is a paragraph in
  // its own right and must stand as complete sentences.
  const nounPhrases = [
    ...Object.values(CLASS_PLAYSTYLE).map((c) => c.identity),
    ...Object.values(STYLE_TEXT).map((s) => s.clause),
  ];
  const prose = [
    ...Object.values(CLASS_PLAYSTYLE).map((c) => c.approach),
    ...Object.values(STYLE_TEXT).map((s) => s.round),
    ...Object.values(POSTURE_TEXT), ...Object.values(ROLE_TEXT), ...Object.values(LEAN_TEXT),
    ...Object.values(THEME_TEXT), ...Object.values(STRENGTH_TEXT), ...Object.values(GAP_TEXT),
    ...Object.values(PARTY_TEXT), ...Object.values(POOL_TEXT),
  ];

  it('quotes no bonus or penalty that could drift from the engine', () => {
    // "+2", "-1", "−4": the moment prose states a number the engine owns, the two can disagree.
    expect([...nounPhrases, ...prose].filter((t) => /[+\-−]\s?\d/.test(t))).toEqual([]);
  });

  it('keeps noun phrases unpunctuated and lower-case, so they slot into the identity sentence', () => {
    expect(nounPhrases.filter((t) => /[.!?]$/.test(t.trim()))).toEqual([]);
    expect(nounPhrases.filter((t) => /^[A-Z]/.test(t.trim()))).toEqual([]);
  });

  it('has no stub paragraphs', () => {
    expect(prose.filter((t) => t.trim().length < 40)).toEqual([]);
  });

  it('ends every paragraph as a sentence', () => {
    expect(prose.filter((t) => !/[.!?]$/.test(t.trim()))).toEqual([]);
  });
});

describe('the brief a level-6 fighter gets', () => {
  const b = brief(fighter());

  it('opens with a sentence naming the class and how it fights', () => {
    expect(b.identity).toBe('You are a weapon specialist, fighting with both hands on one large weapon.');
  });

  it('runs the sections in reading order', () => {
    expect(b.sections.map((s) => s.id)).toEqual(['job', 'round', 'edge', 'risk', 'between']);
  });

  it('leads the risks with the weak save and the missing ranged option', () => {
    const risk = b.sections.find((s) => s.id === 'risk')!;
    expect(risk.body[0]).toContain('no way to attack anything you cannot reach');
    expect(risk.body[1]).toContain('Will save');
  });

  it('describes the two-handed round and the heavy armour', () => {
    const job = b.sections.find((s) => s.id === 'job')!;
    const round = b.sections.find((s) => s.id === 'round')!;
    expect(job.body.join(' ')).toContain('Heavy armour');
    expect(round.body[0]).toContain('full attack');
  });

  it('never leaves a section with an empty body', () => {
    for (const s of b.sections) expect(s.body.length).toBeGreaterThan(0);
  });
});

describe('assembly rules', () => {
  it('caps the sections so the brief stays readable', () => {
    // A high-level cleric matches a great many tags; the caps are what keep it a brief.
    let d = newCharacter('t-ps-cleric', 'Kyra');
    d = withDecision(d, 'ability-base', { str: 14, dex: 12, con: 14, int: 12, wis: 18, cha: 14 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'NG');
    d = withDecision(d, 'class', 'cleric');
    d = withDecision(d, 'feats', { 'feat-1': 'selective-channeling', 'feat-human': 'extra-channel' });
    const b = brief({ ...d, level: 12, purchases: { 'full-plate': 1 }, equipped: { armor: 'full-plate', mainHand: null, offHand: null } });
    expect(b.sections.find((s) => s.id === 'edge')!.body.length).toBeLessThanOrEqual(5);
    expect(b.sections.find((s) => s.id === 'risk')!.body.length).toBeLessThanOrEqual(4);
  });

  it('mentions a companion even when it is not the leading role', () => {
    let d = newCharacter('t-ps-druid', 'Lini');
    d = withDecision(d, 'ability-base', { str: 12, dex: 14, con: 12, int: 10, wis: 17, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'alignment', 'NG');
    d = withDecision(d, 'class', 'druid');
    d = withDecision(d, 'class-choices', { 'druid-nature-bond': ['animal-companion'] });
    const b = brief({ ...d, level: 5 });
    const job = b.sections.find((s) => s.id === 'job')!.body.join(' ');
    if (fingerprint({ ...d, level: 5 }, resolve({ ...d, level: 5 })).combatRoles.includes('commander')) {
      expect(job).toContain('two turns every round');
    }
  });

  it('says so plainly when nobody covers the non-combat half of a session', () => {
    const between = brief(fighter()).sections.find((s) => s.id === 'between')!;
    expect(between.body[0]).toContain('somebody else has to cover');
  });

  it('names the party jobs a character does hold', () => {
    const d = withDecision(fighter(), 'skill-ranks', { diplomacy: 6, perception: 6 });
    const between = brief(d).sections.find((s) => s.id === 'between')!;
    expect(between.body.join(' ')).toContain('the one who talks');
    expect(between.body.join(' ')).toContain('the one who looks first');
  });

  it('describes a caster\'s list as well as their weapon', () => {
    let d = newCharacter('t-ps-wizard', 'Ezren');
    d = withDecision(d, 'ability-base', { str: 8, dex: 14, con: 12, int: 17, wis: 12, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'class', 'wizard');
    d = withDecision(d, 'spell-picks', { 1: ['sleep', 'grease'], 2: ['web', 'glitterdust'] });
    const round = brief({ ...d, level: 5 }).sections.find((s) => s.id === 'round')!;
    expect(round.body.join(' ')).toContain('take enemies out of the fight');
  });
});

describe('degenerate builds still produce a usable brief', () => {
  it('handles a brand-new character with nothing chosen', () => {
    const b = brief(newCharacter('t-ps-blank', 'Nobody'));
    expect(b.identity).toContain('You are');
    expect(b.sections.length).toBeGreaterThan(0);
    for (const s of b.sections) {
      for (const p of s.body) expect(typeof p).toBe('string');
    }
  });

  it('tells an unequipped character where to fix it', () => {
    let d = newCharacter('t-ps-bare', 'Bare');
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'class', 'fighter');
    const round = brief(d).sections.find((s) => s.id === 'round')!;
    expect(round.body[0]).toContain('Equipment step');
  });
});
