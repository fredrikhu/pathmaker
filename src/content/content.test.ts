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
  'wizard-school', 'wizard-opposition', 'arcane-bond', 'cleric-domains', 'warpriest-blessings',
  'sorcerer-bloodline', 'oracle-revelation', 'list',
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
      for (const g of c.grantedFeats ?? []) {
        expect(C.featById.get(g.feat), `class ${c.id}: grantedFeat "${g.feat}" not a real feat`).toBeTruthy();
        expect(g.level, `class ${c.id} grantedFeat ${g.feat}: level out of 1..20`).toBeGreaterThanOrEqual(1);
        expect(g.level, `class ${c.id} grantedFeat ${g.feat}: level out of 1..20`).toBeLessThanOrEqual(20);
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
      // No two choices may emit the same slot: choices sharing an id must have disjoint levels
      // (catches an inline choice colliding with a CLASS_PROGRESSION one at the same level).
      const levelsById = new Map<string, number[]>();
      for (const ch of c.choices ?? []) {
        const prev = levelsById.get(ch.id) ?? [];
        levelsById.set(ch.id, [...prev, ...(ch.levels ?? [1])]);
      }
      for (const [cid, lvls] of levelsById) {
        expect(new Set(lvls).size, `class ${c.id}: choice "${cid}" is granted twice at the same level`).toBe(lvls.length);
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

describe('slayer & investigator use their own talent lists', () => {
  const choiceOptions = (classId: string, choiceId: string) => {
    const c = C.CLASSES.find((k) => k.id === classId)!;
    const ch = (c.choices ?? []).find((x) => x.id === choiceId)!;
    return (ch.options ?? []).map((o) => o.id);
  };
  it('slayer talents include slayer-specific picks (not the rogue list)', () => {
    const base = choiceOptions('slayer', 'slayer-talent');
    expect(base).toContain('ranger-combat-style'); // genuinely a slayer talent
    expect(base).toContain('studied-ally');
    expect(base).not.toContain('bleeding-attack'); // a rogue-only talent, not on our slayer list
    // Advanced-eligible slot offers base + advanced slayer talents.
    const adv = choiceOptions('slayer', 'slayer-adv-talent');
    expect(adv).toContain('assassinate');
    expect(adv).toContain('ranger-combat-style');
  });
  it('investigator talents key off inspiration/studied combat', () => {
    const opts = choiceOptions('investigator', 'investigator-talent');
    expect(opts).toContain('expanded-inspiration');
    expect(opts).toContain('studied-defense');
    expect(opts).not.toContain('bleeding-attack');
  });
  it('shaman hexes use the shaman list (its own Chant hex + the Witch Hex option)', () => {
    const opts = choiceOptions('shaman', 'shaman-hex');
    expect(opts).toContain('chant');    // a shaman-specific general hex
    expect(opts).toContain('witch-hex'); // the meta-option, not a raw witch-hex reuse
    expect(opts).not.toContain('slumber'); // a witch hex we did not put on the shaman list
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
      'alchemist', 'arcanist', 'bard', 'bloodrager', 'cleric', 'druid', 'hunter', 'inquisitor', 'investigator',
      'magus', 'oracle', 'paladin', 'ranger', 'shaman', 'skald', 'sorcerer', 'summoner', 'vampire-hunter',
      'warpriest', 'witch', 'wizard',
    ].sort());
    // Every class that casts at all has a verified table — no caster is left showing blank
    // slot numbers.
    const castersWithoutTable = C.CLASSES.filter((c) => c.spellcasting && !c.spellcasting.table).map((c) => c.id);
    expect(castersWithoutTable).toEqual([]);
    // Every class with a table also has a caster progression; none has a table but no progression.
    for (const c of C.CLASSES) {
      if (c.spellcasting?.table) expect(c.spellcasting.progression, `${c.id}`).toBeTruthy();
    }
  });
});

describe('oracle revelations (source-dependent picks)', () => {
  it('every mystery has a revelation list with unique ids and matches a real mystery', () => {
    const mysteryIds = new Set(['battle', 'bones', 'flame', 'heavens', 'life', 'lore', 'nature', 'stone', 'waves', 'wind']);
    for (const [mid, revs] of Object.entries(C.ORACLE_REVELATIONS)) {
      expect(mysteryIds.has(mid), `revelations for unknown mystery "${mid}"`).toBe(true);
      expect(revs.length, `${mid}: no revelations`).toBeGreaterThan(0);
      const ids = revs.map((r) => r.id);
      expect(new Set(ids).size, `${mid}: duplicate revelation ids`).toBe(ids.length);
    }
  });
});

describe('source-dependent features (bloodline powers, order abilities)', () => {
  it('every source has valid levels and unique per-level abilities', () => {
    const sources: [string, Record<string, { level: number; name: string }[]>][] = [
      ['sorcerer bloodline', C.SORCERER_BLOODLINE_POWERS],
      ['cavalier order', C.CAVALIER_ORDER_ABILITIES],
      ['bloodrager bloodline', C.BLOODRAGER_BLOODLINE_POWERS],
      ['shaman spirit', C.SHAMAN_SPIRIT_ABILITIES],
      ['shifter aspect', C.SHIFTER_ASPECT_ABILITIES],
      ['witch patron', C.WITCH_PATRON_SPELLS],
    ];
    for (const [label, map] of sources) {
      for (const [sid, feats] of Object.entries(map)) {
        expect(feats.length, `${label} ${sid}: empty`).toBeGreaterThan(0);
        const levels = feats.map((f) => f.level);
        for (const l of levels) { expect(l, `${label} ${sid} level`).toBeGreaterThanOrEqual(1); expect(l, `${label} ${sid} level`).toBeLessThanOrEqual(20); }
        expect(new Set(levels).size, `${label} ${sid}: two abilities at the same level`).toBe(levels.length);
      }
    }
  });
  it('bloodline power keys reference real sorcerer bloodlines', () => {
    for (const bid of Object.keys(C.SORCERER_BLOODLINE_POWERS)) {
      expect(C.bloodlineById.has(bid), `bloodline power for unknown bloodline "${bid}"`).toBe(true);
    }
  });
  it('every bloodrager bloodline has powers at 1/4/8/12/16/20, keyed to a real bloodline option', () => {
    const optionIds = new Set(C.BLOODRAGER_BLOODLINES.map((o) => o.id));
    const powerIds = new Set(Object.keys(C.BLOODRAGER_BLOODLINE_POWERS));
    // Every option is covered, and every key is a real option (no orphans / typos).
    for (const id of optionIds) expect(powerIds.has(id), `bloodrager bloodline "${id}" has no powers`).toBe(true);
    for (const id of powerIds) expect(optionIds.has(id), `bloodrager powers for unknown bloodline "${id}"`).toBe(true);
    for (const [bid, feats] of Object.entries(C.BLOODRAGER_BLOODLINE_POWERS)) {
      expect(feats.map((f) => f.level), `bloodrager ${bid} levels`).toEqual([1, 4, 8, 12, 16, 20]);
    }
  });
  it('every shaman spirit has abilities at 1/8/16/20, keyed to a real spirit option', () => {
    const optionIds = new Set(C.SHAMAN_SPIRITS.map((o) => o.id));
    const abilityIds = new Set(Object.keys(C.SHAMAN_SPIRIT_ABILITIES));
    for (const id of optionIds) expect(abilityIds.has(id), `shaman spirit "${id}" has no abilities`).toBe(true);
    for (const id of abilityIds) expect(optionIds.has(id), `shaman abilities for unknown spirit "${id}"`).toBe(true);
    for (const [sid, feats] of Object.entries(C.SHAMAN_SPIRIT_ABILITIES)) {
      expect(feats.map((f) => f.level), `shaman ${sid} levels`).toEqual([1, 8, 16, 20]);
    }
  });
  it('every shifter aspect has abilities at 1/4/8/15, keyed to a real aspect option', () => {
    const optionIds = new Set(C.SHIFTER_ASPECTS.map((o) => o.id));
    const abilityIds = new Set(Object.keys(C.SHIFTER_ASPECT_ABILITIES));
    for (const id of optionIds) expect(abilityIds.has(id), `shifter aspect "${id}" has no abilities`).toBe(true);
    for (const id of abilityIds) expect(optionIds.has(id), `shifter abilities for unknown aspect "${id}"`).toBe(true);
    for (const [aid, feats] of Object.entries(C.SHIFTER_ASPECT_ABILITIES)) {
      expect(feats.map((f) => f.level), `shifter ${aid} levels`).toEqual([1, 4, 8, 15]);
    }
  });
  it('every witch patron adds a bonus spell at 2/4/6/8/10/12/14/16/18, keyed to a real patron option', () => {
    const optionIds = new Set(C.WITCH_PATRONS.map((o) => o.id));
    const spellIds = new Set(Object.keys(C.WITCH_PATRON_SPELLS));
    for (const id of optionIds) expect(spellIds.has(id), `witch patron "${id}" has no bonus spells`).toBe(true);
    for (const id of spellIds) expect(optionIds.has(id), `witch bonus spells for unknown patron "${id}"`).toBe(true);
    for (const [pid, feats] of Object.entries(C.WITCH_PATRON_SPELLS)) {
      expect(feats.map((f) => f.level), `witch ${pid} levels`).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18]);
    }
  });
  it('the alchemist offers a grand-discovery pick at level 20 from the six APG grand discoveries', () => {
    const alch = C.classById.get('alchemist');
    const choices = [...(alch?.choices ?? []), ...(C.CLASS_PROGRESSION['alchemist']?.choices ?? [])];
    const grand = choices.find((ch) => ch.id === 'grand-discovery');
    expect(grand, 'alchemist has no grand-discovery choice').toBeTruthy();
    expect(grand!.levels, 'grand discovery is a level-20 pick').toEqual([20]);
    expect(grand!.options).toBe(C.GRAND_DISCOVERIES);
    const ids = new Set(C.GRAND_DISCOVERIES.map((o) => o.id));
    for (const id of ['awakened-intellect', 'eternal-youth', 'fast-healing', 'philosophers-stone', 'poison-touch', 'true-mutagen']) {
      expect(ids.has(id), `grand discovery "${id}" missing`).toBe(true);
    }
  });
  it('every cavalier order has abilities at 2/8/15, keyed to a real order option', () => {
    const optionIds = new Set(C.CAVALIER_ORDERS.map((o) => o.id));
    const abilityIds = new Set(Object.keys(C.CAVALIER_ORDER_ABILITIES));
    for (const id of optionIds) expect(abilityIds.has(id), `cavalier order "${id}" has no abilities`).toBe(true);
    for (const id of abilityIds) expect(optionIds.has(id), `cavalier abilities for unknown order "${id}"`).toBe(true);
    for (const [oid, feats] of Object.entries(C.CAVALIER_ORDER_ABILITIES)) {
      expect(feats.map((f) => f.level), `cavalier ${oid} levels`).toEqual([2, 8, 15]);
    }
  });
  it('every oracle mystery has a final revelation at 20, keyed to a real mystery option', () => {
    const optionIds = new Set(C.ORACLE_MYSTERIES.map((o) => o.id));
    const finalIds = new Set(Object.keys(C.ORACLE_FINAL_REVELATIONS));
    for (const id of optionIds) expect(finalIds.has(id), `oracle mystery "${id}" has no final revelation`).toBe(true);
    for (const id of finalIds) expect(optionIds.has(id), `oracle final revelation for unknown mystery "${id}"`).toBe(true);
    for (const [mid, feats] of Object.entries(C.ORACLE_FINAL_REVELATIONS)) {
      expect(feats.map((f) => f.level), `oracle ${mid} final revelation level`).toEqual([20]);
    }
  });
  it('every oracle curse has effects at 1/5/10/15, keyed to a real curse option', () => {
    const optionIds = new Set(C.ORACLE_CURSES.map((o) => o.id));
    const curseIds = new Set(Object.keys(C.ORACLE_CURSE_ABILITIES));
    for (const id of optionIds) expect(curseIds.has(id), `oracle curse "${id}" has no effects`).toBe(true);
    for (const id of curseIds) expect(optionIds.has(id), `oracle curse effects for unknown curse "${id}"`).toBe(true);
    for (const [cid, feats] of Object.entries(C.ORACLE_CURSE_ABILITIES)) {
      expect(feats.map((f) => f.level), `oracle curse ${cid} levels`).toEqual([1, 5, 10, 15]);
    }
  });
  // Arcane schools grant two powers at 1st + one later, so the shared "unique level" check doesn't
  // apply — validate coverage and level ranges directly here.
  it('every arcane school has powers, keyed to a real school option (incl. universalist)', () => {
    const optionIds = new Set(C.SCHOOLS.map((s) => s.id));
    const powerIds = new Set(Object.keys(C.SCHOOL_POWERS));
    for (const id of optionIds) expect(powerIds.has(id), `arcane school "${id}" has no powers`).toBe(true);
    for (const id of powerIds) expect(optionIds.has(id), `school powers for unknown school "${id}"`).toBe(true);
    for (const [sid, feats] of Object.entries(C.SCHOOL_POWERS)) {
      expect(feats.length, `school ${sid}: no powers`).toBeGreaterThanOrEqual(2);
      for (const f of feats) {
        expect(f.level, `school ${sid} power level`).toBeGreaterThanOrEqual(1);
        expect(f.level, `school ${sid} power level`).toBeLessThanOrEqual(20);
        expect(f.name.length, `school ${sid}: empty power name`).toBeGreaterThan(0);
      }
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
  it('weapon properties have sane equivalents and unique ids', () => {
    const ids = new Set<string>();
    for (const p of C.WEAPON_PROPERTIES) {
      expect(ids.has(p.id), `duplicate weapon property "${p.id}"`).toBe(false);
      ids.add(p.id);
      expect(p.equivalent, `${p.id}: equivalent out of 1..5`).toBeGreaterThanOrEqual(1);
      expect(p.equivalent, `${p.id}: equivalent out of 1..5`).toBeLessThanOrEqual(5);
      expect(p.desc.length, `${p.id}: empty description`).toBeGreaterThan(0);
      // Unconditional damage dice must read as dice, since they are concatenated onto the damage line.
      if (p.damageDice) expect(p.damageDice, `${p.id}: damageDice`).toMatch(/^\d+d\d+/);
    }
  });
  it('armour properties are priced exactly one way, and effects reference real stats', () => {
    const ids = new Set<string>();
    for (const p of C.ARMOR_PROPERTIES) {
      expect(ids.has(p.id), `duplicate armour property "${p.id}"`).toBe(false);
      ids.add(p.id);
      // Each ability is either bonus-equivalent or flat-priced — never both, never neither.
      const priced = [p.equivalent, p.flatCost].filter((x) => x != null).length;
      expect(priced, `${p.id}: must have exactly one of equivalent / flatCost`).toBe(1);
      if (p.equivalent != null) {
        expect(p.equivalent, `${p.id}: equivalent out of 1..5`).toBeGreaterThanOrEqual(1);
        expect(p.equivalent, `${p.id}: equivalent out of 1..5`).toBeLessThanOrEqual(5);
      }
      if (p.flatCost != null) expect(p.flatCost, `${p.id}: flatCost`).toBeGreaterThan(0);
      expect(['armor', 'shield'], `${p.id}: slot`).toContain(p.slot);
      expect(p.desc.length, `${p.id}: empty description`).toBeGreaterThan(0);
      for (const e of p.effects ?? []) {
        if (e.target.startsWith('skill:')) {
          expect(skillIds.has(e.target.slice(6)), `${p.id}: unknown skill "${e.target}"`).toBe(true);
        }
      }
    }
  });
  it('wondrous items have unique ids, a real slot, a positive cost and effects', () => {
    const ids = new Set<string>();
    for (const w of C.WONDROUS_ITEMS) {
      expect(ids.has(w.id), `duplicate wondrous item "${w.id}"`).toBe(false);
      ids.add(w.id);
      expect(C.BODY_SLOTS, `${w.id}: unknown slot "${w.slot}"`).toContain(w.slot);
      expect(w.cost, `${w.id}: cost`).toBeGreaterThan(0);
      checkEffects(w.effects, `wondrous ${w.id}`);
      // An item with no modelled effect must at least say what it does, so it is never a
      // silent gold sink.
      expect(w.desc.length, `${w.id}: no description`).toBeGreaterThan(0);
      if (w.tiered) {
        // Tiered families follow bonus² × per-bonus, so a mistyped tier breaks the curve.
        expect(w.bonus, `${w.id}: tiered item needs a bonus`).toBeGreaterThan(0);
        expect(w.cost % (w.bonus * w.bonus), `${w.id}: cost is not bonus² × a round figure`).toBe(0);
      }
    }
  });
  it('every body slot has a capacity', () => {
    for (const s of C.BODY_SLOTS) expect(C.SLOT_CAPACITY[s], `slot ${s}`).toBeGreaterThanOrEqual(1);
    expect(C.SLOT_CAPACITY.ring, 'a character can wear two magic rings').toBe(2);
  });
  it('every domain has two granted powers with sane levels and a composed description', () => {
    for (const d of C.DOMAINS) {
      expect(d.powers.length, `domain ${d.id}: expected 2 granted powers`).toBe(2);
      for (const pw of d.powers) {
        expect(pw.name.length, `domain ${d.id}: unnamed power`).toBeGreaterThan(0);
        expect(pw.desc.length, `domain ${d.id}/${pw.name}: empty effect`).toBeGreaterThan(0);
        expect(pw.level, `domain ${d.id}/${pw.name}: level out of 1..20`).toBeGreaterThanOrEqual(1);
        expect(pw.level, `domain ${d.id}/${pw.name}: level out of 1..20`).toBeLessThanOrEqual(20);
      }
      // The first power is always the 1st-level one; the second comes later.
      expect(d.powers[0].level, `domain ${d.id}: first power should be 1st level`).toBe(1);
      expect(d.powers[1].level, `domain ${d.id}: second power should come after the first`).toBeGreaterThan(1);
      expect(d.desc, `domain ${d.id}: desc should name its first power`).toContain(d.powers[0].name);
    }
  });
  it('every domain lists nine spell slots, all authored and resolving to a real spell', () => {
    const spellIds = new Set(C.SPELLS.map((s) => s.id));
    let authored = 0;
    for (const d of C.DOMAINS) {
      expect(d.spells.length, `domain ${d.id}: expected 9 domain-spell slots`).toBe(9);
      for (let lvl = 0; lvl < 9; lvl++) {
        const id = d.spells[lvl];
        expect(id, `domain ${d.id}: level ${lvl + 1} domain spell is not authored`).not.toBeNull();
        authored++;
        expect(spellIds.has(id!), `domain ${d.id}: domain spell "${id}" is not a real spell`).toBe(true);
      }
    }
    // All 33 domains × 9 levels are filled.
    expect(authored).toBe(C.DOMAINS.length * 9);
  });
  it('every domain has a matching warpriest blessing with minor + major powers', () => {
    for (const d of C.DOMAINS) {
      const b = C.blessingById.get(d.id);
      expect(b, `domain ${d.id}: no matching blessing`).toBeTruthy();
      expect(b!.minor.length, `blessing ${d.id}: empty minor power`).toBeGreaterThan(0);
      expect(b!.major.length, `blessing ${d.id}: empty major power`).toBeGreaterThan(0);
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
  it('per-list level overrides name a list the spell is actually on, at a sane level', () => {
    let overrides = 0;
    for (const s of C.SPELLS) {
      if (!s.levelByList) continue;
      for (const [list, lvl] of Object.entries(s.levelByList)) {
        overrides++;
        expect(s.lists.includes(list as never), `spell ${s.id}: levelByList names "${list}" but it isn't on that list`).toBe(true);
        expect(lvl! >= 0 && lvl! <= 9, `spell ${s.id}: levelByList[${list}] = ${lvl} out of 0..9`).toBe(true);
        // An override that equals the flat level is pointless — catch copy-paste noise.
        expect(lvl, `spell ${s.id}: levelByList[${list}] equals the flat level`).not.toBe(s.level);
      }
    }
    expect(overrides).toBeGreaterThan(0);
  });
});

describe('weapon proficiency data', () => {
  // Nothing consumed these lists until the proficiency rule existed, so they had drifted: they
  // referenced 'crossbow-light', 'crossbow-heavy' and 'shortsword', none of which are real ids.
  // A silently-unmatched id now means a wrong −4 on someone's attack line.
  const GROUPS = new Set(['simple', 'martial', 'firearms']);
  it('every weapon named in a class proficiency list is a real weapon or a group', () => {
    for (const c of C.CLASSES) {
      for (const entry of c.proficiencies.weapons) {
        if (GROUPS.has(entry)) continue;
        expect(C.weaponById.get(entry), `${c.id} proficiency "${entry}" matches no weapon`).toBeTruthy();
      }
    }
  });

  it('every weapon named by a racial Weapon Familiarity is a real weapon', () => {
    for (const r of C.RACES) {
      for (const t of [...r.traits, ...r.altTraits]) {
        const fam = t.weaponFamiliarity;
        if (!fam) continue;
        for (const id of [...(fam.proficient ?? []), ...(fam.martial ?? [])]) {
          expect(C.weaponById.get(id), `${r.id}/${t.id} familiarity "${id}" matches no weapon`).toBeTruthy();
        }
        // Reclassifying as martial only makes sense for a weapon that is exotic to begin with.
        for (const id of fam.martial ?? []) {
          expect(C.weaponById.get(id)!.group, `${r.id}/${t.id}: "${id}" is not exotic`).toBe('exotic');
        }
      }
    }
  });

  // Firearms are the one exception: the feat names the whole group rather than a single gun.
  it('Exotic Weapon Proficiency offers the exotic weapons plus the firearm group', () => {
    const opts = C.featById.get('exotic-weapon-proficiency')!.param!.options.map((o) => o.id).sort();
    const exotic = C.WEAPONS.filter((w) => w.group === 'exotic').map((w) => w.id);
    expect(opts).toEqual([...exotic, C.FIREARM_GROUP_ID].sort());
    expect(exotic.length).toBeGreaterThan(0);
  });

  it('no individual firearm is offered as an Exotic Weapon Proficiency pick', () => {
    const opts = new Set(C.featById.get('exotic-weapon-proficiency')!.param!.options.map((o) => o.id));
    for (const w of C.WEAPONS.filter((w) => w.group === 'firearms')) {
      expect(opts.has(w.id), `${w.id} should be covered by the group pick, not listed separately`).toBe(false);
    }
  });
});

describe('composite bows and Strength-to-damage weapons', () => {
  it('prices each point of Strength rating at the bow’s own rate', () => {
    // Verified against the weapons table: the composite longbow's +0..+5 rows run 100→600 gp.
    expect(C.weaponById.get('comp-longbow')!.composite).toEqual({ costPerPoint: 100 });
    expect(C.weaponById.get('comp-shortbow')!.composite).toEqual({ costPerPoint: 75 });
  });

  it('marks only the composite bows as composite', () => {
    const composite = C.WEAPONS.filter((w) => w.composite).map((w) => w.id).sort();
    expect(composite).toEqual(['comp-longbow', 'comp-shortbow']);
  });

  it('marks only the slings as adding Strength to damage, and they are ranged', () => {
    const slings = C.WEAPONS.filter((w) => w.strToDamage).map((w) => w.id).sort();
    expect(slings).toEqual(['halfling-sling-staff', 'sling']);
    for (const w of C.WEAPONS.filter((w) => w.strToDamage)) expect(w.hands, w.id).toBe('ranged');
  });

  it('never marks a weapon as both', () => {
    for (const w of C.WEAPONS) expect(Boolean(w.composite && w.strToDamage), w.id).toBe(false);
  });
});

describe('firearms', () => {
  const firearms = C.WEAPONS.filter((w) => w.firearm);

  it('every firearm is in the firearms proficiency group and is ranged', () => {
    expect(firearms.length).toBeGreaterThan(0);
    for (const w of firearms) {
      expect(w.group, w.id).toBe('firearms');
      expect(w.hands, w.id).toBe('ranged');
    }
  });

  it('and nothing outside that group claims firearm stats', () => {
    for (const w of C.WEAPONS.filter((w) => w.group === 'firearms')) {
      expect(w.firearm, `${w.id} is in the firearms group but has no firearm block`).toBeTruthy();
    }
  });

  it('carries a capacity, a misfire range, and a range increment to measure touch AC from', () => {
    for (const w of firearms) {
      expect(w.firearm!.capacity, w.id).toBeGreaterThan(0);
      // As printed: "1" or a range like "1–2". A bare number or an en-dashed pair, nothing else.
      expect(w.firearm!.misfire, w.id).toMatch(/^\d(–\d)?$/);
      expect(w.range, `${w.id} needs a range increment`).toBeGreaterThan(0);
    }
  });

  it('gives early firearms a misfire burst radius and advanced firearms none', () => {
    // The UC table prints the radius in the misfire column for early firearms only.
    for (const w of firearms) {
      if (w.firearm!.era === 'early') expect(w.firearm!.burst, w.id).toBeGreaterThan(0);
      else expect(w.firearm!.burst, w.id).toBeUndefined();
    }
  });

  it('grants the gunslinger Gunsmithing at 1st level', () => {
    const granted = C.classById.get('gunslinger')!.grantedFeats ?? [];
    expect(granted.some((g) => g.feat === 'gunsmithing' && g.level === 1)).toBe(true);
    expect(C.featById.get('gunsmithing')).toBeTruthy();
  });

  it("offers the gunslinger's starting firearm choices as real weapons", () => {
    const choice = C.classById.get('gunslinger')!.choices!.find((c) => c.id === 'firearm')!;
    for (const o of choice.options!) {
      expect(C.weaponById.get(o.id)?.firearm, `starting firearm "${o.id}"`).toBeTruthy();
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

describe('damage reduction and energy resistance data', () => {
  const ENERGY = new Set(['acid', 'cold', 'electricity', 'fire', 'sonic']);

  it('every racial energy resistance names a real energy type and a positive amount', () => {
    let found = 0;
    for (const r of C.RACES) {
      for (const t of [...r.traits, ...r.altTraits]) {
        for (const er of t.energyResistance ?? []) {
          found++;
          expect(ENERGY.has(er.type), `${r.id}/${t.id}: "${er.type}"`).toBe(true);
          expect(er.amount, `${r.id}/${t.id}`).toBeGreaterThan(0);
        }
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it('a trait that describes resistance in prose also carries it as data', () => {
    // The prose came first and the structure second, so this guards the pair drifting apart.
    for (const r of C.RACES) {
      for (const t of [...r.traits, ...r.altTraits]) {
        if (!/resistance \d|resistance 5|resist \w+ \d/i.test(t.desc)) continue;
        expect(t.energyResistance?.length, `${r.id}/${t.id} describes resistance but carries none`).toBeGreaterThan(0);
      }
    }
  });

  it('class damage reduction lists levels in range and in order', () => {
    for (const [id, prog] of Object.entries(C.CLASS_PROGRESSION)) {
      const dr = prog.damageReduction;
      if (!dr) continue;
      expect(dr.levels.length, id).toBeGreaterThan(0);
      expect(dr.bypass, id).toBeTruthy();
      for (const l of dr.levels) expect(l >= 1 && l <= 20, `${id}: level ${l}`).toBe(true);
      expect([...dr.levels].sort((a, b) => a - b), id).toEqual(dr.levels);
    }
  });
});

describe('self-directed attacker spells', () => {
  const withAttacker = C.SPELLS.filter((s) => s.attacker);

  it('is authored only for the spells that place one on the field', () => {
    expect(withAttacker.map((s) => s.id).sort()).toEqual(['flaming-sphere', 'spiritual-weapon']);
  });

  it('names a damage type and produces damage and a positive duration at every level', () => {
    for (const s of withAttacker) {
      expect(s.attacker!.dmgType, s.id).toBeTruthy();
      for (const cl of [1, 5, 20]) {
        const { damage, rounds } = s.attacker!.at(cl);
        expect(damage, `${s.id} @${cl}`).toMatch(/\d+d\d+/);
        expect(rounds, `${s.id} @${cl}`).toBeGreaterThan(0);
      }
    }
  });

  it('gives an attacking spell an ability and a crit, and a saving spell a save', () => {
    const sw = C.spellById.get('spiritual-weapon')!.attacker!;
    expect(sw.attacks).toBe(true);
    expect(sw.attackAbility).toBe('wis');
    expect(sw.crit).toBeTruthy();

    const fs = C.spellById.get('flaming-sphere')!.attacker!;
    expect(fs.attacks).toBe(false);
    expect(fs.save).toBeTruthy();
  });
});

describe('cast-time buff parameters', () => {
  const ENERGY = new Set(['acid', 'cold', 'electricity', 'fire', 'sonic']);

  it("resist energy offers exactly the five energy types", () => {
    const p = C.spellById.get('resist-energy')!.buff!.param!;
    expect(p.label).toBeTruthy();
    expect(p.options.map((o) => o.id).sort()).toEqual([...ENERGY].sort());
  });

  it("every buff param's default (first option) resolves to a valid effect", () => {
    for (const s of C.SPELLS) {
      const p = s.buff?.param;
      if (!p) continue;
      expect(p.options.length, `${s.id} has an empty param`).toBeGreaterThan(0);
      // The first option is the documented fallback; it must produce something.
      const out = s.buff!.at(5, p.options[0].id);
      const produced = out.effects.length + (out.resistances?.length ?? 0) + (out.dr?.length ?? 0) + (out.absorb ? 1 : 0);
      expect(produced, `${s.id} default param`).toBeGreaterThan(0);
    }
  });

  it("protection from energy is a depleting pool of 12 per caster level, capped at 120", () => {
    const at = C.spellById.get('protection-from-energy')!.buff!.at;
    expect(at(6, 'fire').absorb).toEqual({ type: 'fire', amount: 72 });
    expect(at(10, 'cold').absorb!.amount).toBe(120);
    expect(at(20, 'acid').absorb!.amount).toBe(120); // capped
  });
});
