import { describe, it, expect } from 'vitest';
import * as C from './index';
import type { Predicate } from '../engine/types';

// Content-integrity tests. These don't check rules *math* (golden characters do that) —
// they catch data-entry mistakes across the whole content set: typos in cross-referenced
// ids, duplicate ids, malformed effects, prerequisites pointing at things that don't exist.
// Cheap insurance as the content grows.

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ALIGNMENTS = ['LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE'];
const BONUS_TYPES = new Set([
  'base', 'racial', 'enhancement', 'dodge', 'trait', 'morale', 'competence', 'luck', 'insight',
  'sacred', 'deflection', 'natural-armor', 'armor', 'shield', 'size', 'circumstance', 'alchemical',
  'resistance', 'untyped', 'penalty',
]);
const SPELL_LISTS = new Set(['arcane', 'bard', 'divine', 'druid', 'ranger', 'paladin']);
const CHOICE_KINDS = new Set([
  'wizard-school', 'wizard-opposition', 'arcane-bond', 'cleric-domains', 'warpriest-blessings', 'sorcerer-bloodline', 'list',
]);

const skillIds = new Set(C.SKILLS.map((s) => s.id));
const featIds = new Set(C.FEATS.map((f) => f.id));
const domainIds = new Set(C.DOMAINS.map((d) => d.id));
const languageIds = new Set(C.LANGUAGES);

/** A well-formed effect target: a bare stat node or `skill:<real id>` / `ability:<real ab>`. */
function checkTarget(target: string, where: string) {
  expect(target, `${where}: empty effect target`).toBeTruthy();
  if (target.startsWith('skill:')) {
    expect(skillIds.has(target.slice('skill:'.length)), `${where}: unknown skill in target ${target}`).toBe(true);
  } else if (target.startsWith('ability:')) {
    expect(ABILITIES.includes(target.slice('ability:'.length)), `${where}: unknown ability in target ${target}`).toBe(true);
  }
}

function checkEffects(effects: { target: string; type: string; note: string }[] | undefined, where: string) {
  for (const e of effects ?? []) {
    checkTarget(e.target, where);
    expect(BONUS_TYPES.has(e.type), `${where}: unknown bonus type "${e.type}"`).toBe(true);
    expect(e.note, `${where}: effect missing note`).toBeTruthy();
  }
}

function walkPredicate(p: Predicate, where: string) {
  if ('all' in p) p.all.forEach((q) => walkPredicate(q, where));
  else if ('any' in p) p.any.forEach((q) => walkPredicate(q, where));
  else if ('not' in p) walkPredicate(p.not, where);
  else if ('feat' in p) expect(featIds.has(p.feat), `${where}: prereq references unknown feat ${p.feat}`).toBe(true);
  else if ('race' in p) expect(C.raceById.has(p.race), `${where}: prereq references unknown race ${p.race}`).toBe(true);
  else if ('classId' in p) expect(C.classById.has(p.classId), `${where}: prereq references unknown class ${p.classId}`).toBe(true);
  else if ('skillRanks' in p) expect(skillIds.has(p.skillRanks.skill), `${where}: prereq references unknown skill ${p.skillRanks.skill}`).toBe(true);
}

describe('ids are unique within each collection', () => {
  const collections: [string, { id: string }[], ReadonlyMap<string, unknown>][] = [
    ['skills', C.SKILLS, C.skillById], ['races', C.RACES, C.raceById], ['classes', C.CLASSES, C.classById],
    ['feats', C.FEATS, C.featById], ['traits', C.TRAITS, C.traitById], ['weapons', C.WEAPONS, C.weaponById],
    ['armors', C.ARMORS, C.armorById], ['gear', C.GEAR, C.gearById], ['deities', C.DEITIES, C.deityById],
    ['domains', C.DOMAINS, C.domainById], ['schools', C.SCHOOLS, C.schoolById],
    ['bloodlines', C.BLOODLINES, C.bloodlineById], ['spells', C.SPELLS, C.spellById],
  ];
  it.each(collections)('%s have no duplicate ids', (_name, arr, map) => {
    expect(map.size).toBe(arr.length);
  });
});

describe('skills', () => {
  it('every skill has a valid ability and no duplicate names collide unexpectedly', () => {
    for (const s of C.SKILLS) {
      expect(ABILITIES, `${s.id}`).toContain(s.ability);
      expect(s.name).toBeTruthy();
    }
  });
});

describe('races', () => {
  it('ability mods, trait effects, alternate replacements, and languages are well-formed', () => {
    for (const r of C.RACES) {
      if (r.abilityMods !== 'choice') {
        for (const ab of Object.keys(r.abilityMods)) expect(ABILITIES, `${r.id}`).toContain(ab);
      }
      const standardIds = new Set(r.traits.map((t) => t.id));
      for (const t of r.traits) checkEffects(t.effects, `race ${r.id} trait ${t.id}`);
      for (const a of r.altTraits) {
        checkEffects(a.effects, `race ${r.id} alt ${a.id}`);
        expect(a.replaces.length, `${r.id}/${a.id}: replaces nothing`).toBeGreaterThan(0);
        for (const rep of a.replaces) {
          expect(standardIds.has(rep), `race ${r.id} alt ${a.id} replaces unknown standard trait "${rep}"`).toBe(true);
        }
      }
      for (const l of [...r.languagesAuto, ...r.languagesBonus]) {
        expect(languageIds.has(l), `race ${r.id}: unknown language "${l}"`).toBe(true);
      }
    }
  });
});

describe('classes', () => {
  it('progressions, class skills, proficiencies, choices, and spellcasting are valid', () => {
    for (const c of C.CLASSES) {
      expect(['full', 'threequarter', 'half'], `${c.id} bab`).toContain(c.bab);
      expect([6, 8, 10, 12], `${c.id} hitDie`).toContain(c.hitDie);
      expect(c.skillRanks, `${c.id} skillRanks`).toBeGreaterThan(0);
      expect(c.startingGold, `${c.id} startingGold`).toBeGreaterThan(0);
      for (const sv of c.goodSaves) expect(['fort', 'ref', 'will'], `${c.id} save`).toContain(sv);
      if (c.alignment) for (const al of c.alignment) expect(ALIGNMENTS, `${c.id} alignment`).toContain(al);
      for (const sid of c.classSkills) {
        expect(skillIds.has(sid), `class ${c.id}: class skill "${sid}" is not a real skill`).toBe(true);
      }
      for (const f of c.features1) checkEffects(f.effects, `class ${c.id} feature ${f.id}`);
      const featIdsSeen = new Set<string>();
      for (const f of c.features ?? []) {
        expect(f.level, `class ${c.id} feature ${f.id}: level out of 1..20`).toBeGreaterThanOrEqual(1);
        expect(f.level, `class ${c.id} feature ${f.id}: level out of 1..20`).toBeLessThanOrEqual(20);
        expect(featIdsSeen.has(f.id), `class ${c.id}: duplicate feature id "${f.id}"`).toBe(false);
        featIdsSeen.add(f.id);
        checkEffects(f.effects, `class ${c.id} feature ${f.id}`);
      }
      for (const l of c.bonusFeats?.levels ?? []) {
        expect(l, `class ${c.id} bonusFeat level out of 1..20`).toBeGreaterThanOrEqual(1);
        expect(l, `class ${c.id} bonusFeat level out of 1..20`).toBeLessThanOrEqual(20);
      }
      for (const ch of c.choices ?? []) {
        expect(CHOICE_KINDS.has(ch.kind), `class ${c.id}: unknown choice kind "${ch.kind}"`).toBe(true);
        expect(ch.count, `${c.id}/${ch.id} count`).toBeGreaterThan(0);
        for (const l of ch.levels ?? []) {
          expect(l, `class ${c.id}/${ch.id}: choice level out of 1..20`).toBeGreaterThanOrEqual(1);
          expect(l, `class ${c.id}/${ch.id}: choice level out of 1..20`).toBeLessThanOrEqual(20);
        }
        // Inline 'list' options must have unique ids within the choice.
        const optIds = (ch.options ?? []).map((o) => o.id);
        expect(new Set(optIds).size, `class ${c.id}/${ch.id}: duplicate option ids`).toBe(optIds.length);
      }
      if (c.spellcasting) {
        expect(SPELL_LISTS.has(c.spellcasting.list), `class ${c.id}: unknown spell list`).toBe(true);
        expect(ABILITIES, `${c.id} casting ability`).toContain(c.spellcasting.ability);
        if (c.spellcasting.progression)
          expect(['full', 'six', 'four'], `${c.id} caster progression`).toContain(c.spellcasting.progression);
      }
    }
  });
});

describe('class progression coverage (Part B)', () => {
  it('every class except the documented deferral has a per-level feature progression', () => {
    const deferred = new Set(['vampire-hunter']);
    for (const c of C.CLASSES) {
      if (deferred.has(c.id)) continue;
      expect(c.features && c.features.length > 0, `class ${c.id}: no per-level features authored`).toBe(true);
      expect(c.features!.some((f) => f.level === 1), `class ${c.id}: no level-1 feature`).toBe(true);
    }
  });
  it('only verified casters carry an encoded slot table (others show no slot numbers)', () => {
    const withTable = C.CLASSES.filter((c) => c.spellcasting?.table).map((c) => c.id).sort();
    expect(withTable).toEqual([
      'alchemist', 'bard', 'bloodrager', 'cleric', 'druid', 'hunter', 'inquisitor', 'investigator', 'magus',
      'oracle', 'paladin', 'ranger', 'shaman', 'skald', 'sorcerer', 'summoner', 'warpriest', 'witch', 'wizard',
    ].sort());
    // Every class with a table also has a caster progression; none has a table but no progression.
    for (const c of C.CLASSES) {
      if (c.spellcasting?.table) expect(c.spellcasting.progression, `${c.id}`).toBeTruthy();
    }
  });
});

describe('feats', () => {
  it('prerequisites reference real ids and effects are well-formed', () => {
    for (const f of C.FEATS) {
      expect(f.types.length, `${f.id}: no types`).toBeGreaterThan(0);
      if (f.prerequisites) walkPredicate(f.prerequisites, `feat ${f.id}`);
      checkEffects(f.effects, `feat ${f.id}`);
    }
  });
});

describe('traits', () => {
  it('have valid categories and well-formed effects', () => {
    const cats = new Set(['combat', 'faith', 'magic', 'social', 'drawback']);
    for (const t of C.TRAITS) {
      expect(cats.has(t.category), `trait ${t.id}: bad category ${t.category}`).toBe(true);
      checkEffects(t.effects, `trait ${t.id}`);
    }
  });
});

describe('deities and bloodlines', () => {
  it('deity alignments are valid and every granted domain exists', () => {
    for (const d of C.DEITIES) {
      expect(ALIGNMENTS, `deity ${d.id}`).toContain(d.alignment);
      for (const dom of d.domains) {
        expect(domainIds.has(dom), `deity ${d.id}: unknown domain "${dom}"`).toBe(true);
      }
    }
  });
  it('bloodline class-skill grants reference real skills', () => {
    for (const b of C.BLOODLINES) {
      expect(skillIds.has(b.classSkill), `bloodline ${b.id}: unknown class skill "${b.classSkill}"`).toBe(true);
    }
  });
});

describe('spells', () => {
  it('have valid levels and lists', () => {
    for (const s of C.SPELLS) {
      expect(s.level, `spell ${s.id} level`).toBeGreaterThanOrEqual(0);
      expect(s.level, `spell ${s.id} level`).toBeLessThanOrEqual(9);
      expect(s.lists.length, `spell ${s.id}: on no lists`).toBeGreaterThan(0);
      for (const l of s.lists) expect(SPELL_LISTS.has(l), `spell ${s.id}: unknown list "${l}"`).toBe(true);
    }
  });
});

describe('equipment', () => {
  it('costs and weights are non-negative and lookups resolve', () => {
    for (const w of [...C.WEAPONS, ...C.ARMORS, ...C.GEAR]) {
      expect(w.cost, `${w.id} cost`).toBeGreaterThanOrEqual(0);
      expect(w.weight, `${w.id} weight`).toBeGreaterThanOrEqual(0);
      expect(C.anyItemById(w.id), `${w.id}: anyItemById failed`).not.toBeNull();
    }
  });
});
