import { describe, it, expect } from 'vitest';
import { resolve } from './resolve';
import { fingerprint } from './fingerprint';
import { playstyleBrief } from './playstyle';
import { newCharacter, withDecision } from './character';
import type { CharacterDoc } from './types';
import { CLASSES } from '../content/classes';
import { SPELLS } from '../content/spells';
import { SPELL_ROLE_OVERRIDES } from '../content/spell-tactics';
import {
  CLASS_PLAYSTYLE, GAP_TEXT, LEAN_TEXT, PARTY_TEXT, POOL_PACING_TEXT, POOL_TEXT, POSTURE_TEXT,
  ROLE_TEXT, STRENGTH_TEXT, STYLE_TEXT, THEME_TEXT,
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

  it('opens every style clause with a verb, so it continues the sentence rather than restarting it', () => {
    // "You are three characters in one, a single weapon in one hand" reads as a second noun phrase
    // hung off the first. A clause beginning with an article always does.
    const clauses = Object.values(STYLE_TEXT).map((s) => s.clause);
    expect(clauses.filter((c) => /^(a|an|the)\s/i.test(c))).toEqual([]);
  });

  it('has no stub paragraphs', () => {
    expect(prose.filter((t) => t.trim().length < 40)).toEqual([]);
  });

  it('ends every paragraph as a sentence', () => {
    expect(prose.filter((t) => !/[.!?]$/.test(t.trim()))).toEqual([]);
  });
});

describe('house rules: the prose may not misstate the rules', () => {
  // The prose is opinion and quotes no numbers, but it still makes rules claims, and those can be
  // wrong. Three of them were: rage was said to lower the Will save it actually raises, lay on
  // hands was a "fast action", and bombs were described as inexhaustible when they are a daily pool.
  const all = [
    ...Object.values(CLASS_PLAYSTYLE).flatMap((c) => [c.identity, c.approach]),
    ...Object.values(STYLE_TEXT).flatMap((s) => [s.clause, s.round]),
    ...Object.values(POSTURE_TEXT), ...Object.values(ROLE_TEXT), ...Object.values(LEAN_TEXT),
    ...Object.values(THEME_TEXT), ...Object.values(STRENGTH_TEXT), ...Object.values(GAP_TEXT),
    ...Object.values(PARTY_TEXT), ...Object.values(POOL_TEXT),
  ];

  it('names only action types that exist in the rules', () => {
    // "fast action" is not one of them, and was describing lay on hands, which is a swift action.
    const REAL = new Set(['standard', 'move', 'swift', 'immediate', 'free', 'full-round']);
    const bad: string[] = [];
    // Only "as a <kind> action" names an action type; "the best action economy" does not.
    for (const t of all)
      for (const m of t.matchAll(/\ban? ([a-z-]+) action\b/g))
        if (!REAL.has(m[1])) bad.push(`"${m[0]}" in "${t.slice(0, 60)}…"`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('never calls a save weak that the class is actually good at', () => {
    // A class's own text may name its weak save; it must be a save the class does not have.
    const bad: string[] = [];
    const SAVES = [['will', /\bWill\b/], ['ref', /\bReflex\b/], ['fort', /\bFortitude\b/]] as const;
    for (const c of CLASSES) {
      const text = [CLASS_PLAYSTYLE[c.id].identity, CLASS_PLAYSTYLE[c.id].approach].join(' ');
      for (const [save, re] of SAVES) {
        if (!re.test(text)) continue;
        // Only sentences that call it weak count.
        const weak = text.split(/(?<=[.;])\s+/).some((sent) =>
          re.test(sent) && /weak|worst|lowest|trails|never fixes|poor/.test(sent));
        if (weak && c.goodSaves.includes(save))
          bad.push(`${c.id}: calls ${save} weak, but it is a good save`);
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('has a pool paragraph for every pool the engine can emit, and none for any it cannot', () => {
    // A POOL_TEXT key that no class produces is a paragraph nobody will ever read.
    const emitted = new Set<string>();
    for (const c of CLASSES) {
      let d = newCharacter('t-ps-pool', 'P');
      d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 14, int: 14, wis: 14, cha: 14 });
      d = withDecision(d, 'race', 'human');
      d = withDecision(d, 'alignment', c.id === 'paladin' ? 'LG' : 'N');
      d = withDecision(d, 'class', c.id);
      // Two levels, because a pool can exist only in a window: the druid's wild shape uses run out
      // at 20th, where it becomes at-will.
      for (const lvl of [12, 20])
        for (const p of resolve({ ...d, level: lvl }).sheet.pools) emitted.add(p.id);
    }
    const authored = new Set(Object.keys(POOL_TEXT));
    expect([...authored].filter((k) => !emitted.has(k)), 'authored but never emitted').toEqual([]);
    // The mirror is a soft expectation: a pool with no entry falls back to POOL_PACING_TEXT, which
    // is deliberate. Assert the fallback exists rather than demanding an entry for every pool.
    expect(Object.keys(POOL_PACING_TEXT).sort()).toEqual(['discrete', 'duration']);
  });
});

describe('spell-role overrides: every one must be real, needed and defensible', () => {
  // `spell-tactics.ts` exists to correct the structural classifier where school misleads. Three
  // things can go wrong in a table like that, and all three are checkable.

  /** spellLean with the override step removed: what structure alone would say. */
  const structural = (sp: (typeof SPELLS)[number]): string => {
    if (sp.damage?.label) return /heal/i.test(sp.damage.label) ? 'healer' : 'buffer';
    if (/^(cure|mass cure|heal\b|breath of life|lesser restoration|restoration)/i.test(sp.name)) return 'healer';
    if (sp.buff) return 'buffer';
    if (sp.damage || sp.attacker) return 'blaster';
    if (/\(harmless\)/i.test(sp.save) || /^personal/i.test(sp.range)) return 'buffer';
    switch (sp.school) {
      case 'Evocation': return 'blaster';
      case 'Enchantment': case 'Illusion': case 'Necromancy': case 'Conjuration': return 'controller';
      case 'Abjuration': case 'Transmutation': return 'buffer';
      default: return 'utility';
    }
  };

  it('names only spells the catalogue has', () => {
    // A typo here is silent: the spell simply keeps the classification this file exists to correct.
    const ids = new Set(SPELLS.map((s) => s.id));
    expect(Object.keys(SPELL_ROLE_OVERRIDES).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('overrides nothing that the structural rules already get right', () => {
    // The file's own promise: it lists only the spells the rules misplace. An override that agrees
    // with the fallback is noise, and it hides the fact that the fallback handles that case.
    const byId = new Map(SPELLS.map((s) => [s.id, s]));
    const pointless = Object.entries(SPELL_ROLE_OVERRIDES)
      .filter(([id, role]) => { const sp = byId.get(id); return sp && structural(sp) === role; })
      .map(([id, role]) => `${id} is already ${role}`);
    expect(pointless, pointless.join(' | ')).toEqual([]);
  });

  it('never calls an all-or-nothing death effect a blast', () => {
    // The blaster paragraph promises that a successful save still leaves half the damage. For a
    // spell whose save negates outright it leaves nothing, and the advice it wants is the
    // controller's — aim at the save you can guess. Four spells were on the wrong side of this.
    const byId = new Map(SPELLS.map((s) => [s.id, s]));
    const bad: string[] = [];
    for (const [id, role] of Object.entries(SPELL_ROLE_OVERRIDES)) {
      if (role !== 'blaster') continue;
      const sp = byId.get(id);
      if (!sp) continue;
      const negates = /negates/i.test(sp.save) && !/partial|half/i.test(sp.save);
      const kills = /\b(slays?|slain|destroys?|destroyed)\b/i.test(`${sp.summary} ${sp.desc}`);
      if (negates && kills) bad.push(`${id}: save "${sp.save}" leaves nothing, so this is control`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('gives every role in the union at least one spell, so no lean text is unreachable', () => {
    const used = new Set(Object.values(SPELL_ROLE_OVERRIDES));
    // Every lean with authored text must be producible; the overrides alone cover four of five, and
    // the fifth (buffer) is the structural default for a harmless save.
    for (const role of ['blaster', 'controller', 'healer', 'utility'])
      expect(used.has(role as never), `no override produces ${role}`).toBe(true);
    expect(Object.keys(LEAN_TEXT).sort()).toEqual(['blaster', 'buffer', 'controller', 'healer', 'utility']);
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
    // Two decisions, not one: the nature bond picks companion-over-domain, then the companion
    // slot picks the creature. Only the second actually puts a body on the field.
    d = withDecision(d, 'class-choices', { 'nature-bond': ['animal-companion'], 'animal-companion': ['bear'] });
    const doc = { ...d, level: 5 };
    expect(fingerprint(doc, resolve(doc)).combatRoles).toContain('commander');
    expect(brief(doc).sections.find((s) => s.id === 'job')!.body.join(' ')).toContain('second body on the field');
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
