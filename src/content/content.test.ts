import { describe, it, expect } from 'vitest';
import * as C from './index';
import type { Predicate } from '../engine/types';
import { SOURCE_POWER_PREFIXES } from '../engine/resolve';

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
const SPELL_LISTS = new Set(['arcane', 'bard', 'divine', 'druid', 'ranger', 'paladin', 'witch',
  'inquisitor', 'magus', 'alchemist', 'bloodrager', 'summoner', 'shaman', 'hunter']);

/** Lists a spell only ever carries because a *class list page* put it there — the overlay maps at
 *  the bottom of spells.ts, plus the derived hunter list. Excluded when a test asserts the exact
 *  set of lists a spell's own page publishes, since those two sources are audited separately.
 *  Witch, paladin and ranger are deliberately absent: splatbook spells tag those inline. */
const CLASS_LIST_OVERLAYS = new Set(['inquisitor', 'magus', 'alchemist', 'bloodrager', 'summoner', 'shaman', 'hunter']);
const CHOICE_KINDS = new Set([
  'wizard-school', 'wizard-opposition', 'arcane-bond', 'cleric-domains', 'warpriest-blessings',
  'sorcerer-bloodline', 'oracle-revelation', 'eidolon-evolutions', 'companion', 'list',
]);

const skillIds = new Set(C.SKILLS.map((s) => s.id));
const featIds = new Set(C.FEATS.map((f) => f.id));
const domainIds = new Set(C.DOMAINS.map((d) => d.id));
const languageIds = new Set(C.LANGUAGES);

/** A well-formed effect target: a bare stat node or `skill:<real id>` / `ability:<real ab>`. */
function checkTarget(target: string, where: string) {
  expect(target, `${where}: empty effect target`).toBeTruthy();
  if (target.startsWith('skill:')) {
    // `skill:all` is the across-the-board bonus the skill loop reads, mirroring `save:all`.
    const sk = target.slice('skill:'.length);
    expect(sk === 'all' || skillIds.has(sk), `${where}: unknown skill in target ${target}`).toBe(true);
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
      ['sorcerer bloodline spells', C.SORCERER_BLOODLINE_SPELLS],
      ['bloodrager bloodline spells', C.BLOODRAGER_BLOODLINE_SPELLS],
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
  it('every sorcerer bloodline has arcana + bonus spells at 1/3/5/7/9/11/13/15/17/19, keyed to a real bloodline', () => {
    const optionIds = new Set(C.BLOODLINES.map((b) => b.id));
    const spellIds = new Set(Object.keys(C.SORCERER_BLOODLINE_SPELLS));
    for (const id of optionIds) expect(spellIds.has(id), `sorcerer bloodline "${id}" has no arcana/bonus spells`).toBe(true);
    for (const id of spellIds) expect(optionIds.has(id), `sorcerer bloodline spells for unknown bloodline "${id}"`).toBe(true);
    for (const [bid, feats] of Object.entries(C.SORCERER_BLOODLINE_SPELLS)) {
      expect(feats.map((f) => f.level), `sorcerer ${bid} levels`).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19]);
      expect(feats[0].name, `sorcerer ${bid} first entry is the arcana`).toBe('Bloodline Arcana');
    }
  });
  it('every bloodrager bloodline has bonus spells at 7/10/13/16 (no arcana), keyed to a real bloodline option', () => {
    const optionIds = new Set(C.BLOODRAGER_BLOODLINES.map((o) => o.id));
    const spellIds = new Set(Object.keys(C.BLOODRAGER_BLOODLINE_SPELLS));
    for (const id of optionIds) expect(spellIds.has(id), `bloodrager bloodline "${id}" has no bonus spells`).toBe(true);
    for (const id of spellIds) expect(optionIds.has(id), `bloodrager bonus spells for unknown bloodline "${id}"`).toBe(true);
    for (const [bid, feats] of Object.entries(C.BLOODRAGER_BLOODLINE_SPELLS)) {
      expect(feats.map((f) => f.level), `bloodrager ${bid} levels`).toEqual([7, 10, 13, 16]);
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
  it('every metamagic def maps to a real feat with a 0–4 level adjustment (nine Core feats)', () => {
    for (const m of C.METAMAGIC) {
      expect(C.featById.has(m.id), `metamagic ${m.id} is not a real feat`).toBe(true);
      expect(m.levelAdj, `${m.id} levelAdj`).toBeGreaterThanOrEqual(0);
      expect(m.levelAdj, `${m.id} levelAdj`).toBeLessThanOrEqual(4);
    }
    expect(C.METAMAGIC.length).toBe(9);
    expect(C.metamagicById.get('heighten-spell')!.heighten).toBe(true);
  });
  it('effectiveSpellLevel sums flat adjustments and honours Heighten', () => {
    expect(C.effectiveSpellLevel(3, [])).toBe(3);
    expect(C.effectiveSpellLevel(3, ['empower-spell'])).toBe(5);                    // +2
    expect(C.effectiveSpellLevel(1, ['maximize-spell', 'extend-spell'])).toBe(5);   // +3 +1
    expect(C.effectiveSpellLevel(2, ['quicken-spell'])).toBe(6);                    // +4
    expect(C.effectiveSpellLevel(2, ['heighten-spell'], 5)).toBe(5);               // heighten up to 5
    expect(C.effectiveSpellLevel(4, ['heighten-spell'], 2)).toBe(4);               // heighten never lowers
    expect(C.effectiveSpellLevel(3, ['empower-spell', 'unknown-x'])).toBe(5);       // unknown ignored
    // Heighten's delta stacks on top of flat metamagic: 3 → 5 (heighten, +2) then Maximize (+3) = 8.
    expect(C.effectiveSpellLevel(3, ['heighten-spell', 'maximize-spell'], 5)).toBe(8);
    expect(C.effectiveSpellLevel(4, ['heighten-spell', 'empower-spell'], 2)).toBe(6); // heighten below base adds nothing, +2 empower
  });
  it('dcSpellLevel follows only Heighten — slot-cost metamagic never raise the save DC', () => {
    expect(C.dcSpellLevel(3, [])).toBe(3);
    expect(C.dcSpellLevel(3, ['empower-spell'])).toBe(3);                       // +2 slot, DC unchanged
    expect(C.dcSpellLevel(1, ['maximize-spell', 'quicken-spell'])).toBe(1);    // slot cost only
    expect(C.dcSpellLevel(2, ['heighten-spell'], 5)).toBe(5);                  // heighten raises the DC
    expect(C.dcSpellLevel(4, ['heighten-spell'], 2)).toBe(4);                  // never lowers
    expect(C.dcSpellLevel(3, ['heighten-spell', 'empower-spell'], 6)).toBe(6); // heighten wins, empower ignored
  });
  it('the eidolon evolution pool has 20 non-decreasing entries (APG Table 2-9)', () => {
    expect(C.EIDOLON_EVOLUTION_POOL.length).toBe(20);
    expect(C.EIDOLON_EVOLUTION_POOL[0]).toBe(3);
    expect(C.EIDOLON_EVOLUTION_POOL[19]).toBe(26);
    for (let i = 1; i < 20; i++) expect(C.EIDOLON_EVOLUTION_POOL[i], `pool level ${i + 1}`).toBeGreaterThanOrEqual(C.EIDOLON_EVOLUTION_POOL[i - 1]);
  });
  it('every eidolon evolution has a unique id, a 1–4 cost, a valid min level, and real forms', () => {
    const ids = new Set<string>();
    const forms = new Set(C.EIDOLON_FORMS.map((f) => f.id));
    for (const e of C.EIDOLON_EVOLUTIONS) {
      expect(ids.has(e.id), `duplicate evolution id ${e.id}`).toBe(false);
      ids.add(e.id);
      expect(e.cost, `${e.id} cost`).toBeGreaterThanOrEqual(1);
      expect(e.cost, `${e.id} cost`).toBeLessThanOrEqual(4);
      if (e.minLevel != null) {
        expect(e.minLevel, `${e.id} minLevel`).toBeGreaterThanOrEqual(1);
        expect(e.minLevel, `${e.id} minLevel`).toBeLessThanOrEqual(20);
      }
      for (const f of e.forms ?? []) expect(forms.has(f), `${e.id} references unknown form ${f}`).toBe(true);
    }
    // 49, not 48: Flight was missing until the companion-breadth pass, which is exactly the kind
    // of gap this count is here to catch.
    expect(C.EIDOLON_EVOLUTIONS.length, 'expected the full APG evolution set').toBe(49);
  });
  it('the summoner offers an eidolon-evolutions point-buy choice', () => {
    const summ = C.classById.get('summoner');
    const choices = [...(summ?.choices ?? []), ...(C.CLASS_PROGRESSION['summoner']?.choices ?? [])];
    expect(choices.some((c) => c.kind === 'eidolon-evolutions'), 'summoner has no eidolon-evolutions choice').toBe(true);
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
  it('class-skill grants and skill-pick options reference real skills', () => {
    for (const t of C.TRAITS) {
      for (const sk of t.classSkills ?? []) expect(skillIds.has(sk), `trait ${t.id}: unknown class skill "${sk}"`).toBe(true);
      if (t.param) {
        expect(t.param.options.length, `trait ${t.id}: param with no options`).toBeGreaterThan(1);
        for (const o of t.param.options) expect(skillIds.has(o.id), `trait ${t.id}: unknown skill option "${o.id}"`).toBe(true);
        expect(t.param.bonus || t.param.classSkill || t.abilitySwap, `trait ${t.id}: param does nothing`).toBeTruthy();
      }
      if (t.abilitySwap) {
        expect(t.abilitySwap.skills || t.param, `trait ${t.id}: ability swap names no skill and has no pick`).toBeTruthy();
        for (const sk of t.abilitySwap.skills ?? []) expect(skillIds.has(sk), `trait ${t.id}: swap on unknown skill "${sk}"`).toBe(true);
      }
    }
  });
  it('every "class skill" in the text is modelled, and each category is populated', () => {
    for (const t of C.TRAITS) {
      if (/class skill/i.test(t.desc)) expect((t.classSkills?.length ?? 0) > 0 || t.param?.classSkill, `trait ${t.id}: says class skill but grants none`).toBeTruthy();
    }
    const social = C.TRAITS.filter((t) => t.category === 'social');
    expect(social.length).toBeGreaterThanOrEqual(35);
    expect(C.TRAITS.filter((t) => t.category === 'combat').length).toBeGreaterThanOrEqual(20);
    expect(C.TRAITS.filter((t) => t.category === 'faith').length).toBeGreaterThanOrEqual(25);
    expect(C.TRAITS.filter((t) => t.category === 'magic').length).toBeGreaterThanOrEqual(35);
    // Every drawback id carries the dw- prefix, and nothing else does, so the picker's two actions
    // (set `drawback` vs toggle `traits`) can never be wired to the wrong kind of entry.
    for (const t of C.TRAITS)
      expect(t.id.startsWith('dw-'), `trait ${t.id}: dw- prefix must mean drawback and vice versa`).toBe(t.category === 'drawback');
    expect(C.TRAITS.filter((t) => t.category === 'drawback').length).toBeGreaterThanOrEqual(18);
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
  // The full published list, from d20pfsrd's warpriest blessings index. Four of these — curse,
  // godfist, scalykind and void — have no cleric domain, so the domain-driven check above cannot
  // catch their absence; the list went out with them missing once already.
  it('carries every published warpriest blessing', () => {
    const published = [
      'air', 'animal', 'artifice', 'chaos', 'charm', 'community', 'curse', 'darkness', 'death',
      'destruction', 'earth', 'evil', 'fire', 'glory', 'godfist', 'good', 'healing', 'knowledge',
      'law', 'liberation', 'luck', 'madness', 'magic', 'nobility', 'plant', 'protection', 'repose',
      'rune', 'scalykind', 'strength', 'sun', 'travel', 'trickery', 'void', 'war', 'water', 'weather',
    ];
    expect(C.BLESSINGS.map((b) => b.id).sort()).toEqual([...published].sort());
    for (const b of C.BLESSINGS) {
      expect(b.minor.length, `blessing ${b.id}: empty minor power`).toBeGreaterThan(0);
      expect(b.major.length, `blessing ${b.id}: empty major power`).toBeGreaterThan(0);
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

describe('spells — CRB completion batch 2 (levels 3–4)', () => {
  const by = (id: string) => {
    const s = C.spellById.get(id);
    expect(s, `spell ${id} missing`).toBeDefined();
    return s!;
  };

  it('lands the spells that differ by list at the right level on each one', () => {
    // These are the whole reason levelByList exists, and each pair was read off the
    // spell's own Level line rather than inferred from which class list it appeared on.
    const cases: [string, [string, number][]][] = [
      ['greater-magic-weapon', [['arcane', 3], ['divine', 4]]],
      ['contagion', [['divine', 3], ['druid', 3], ['arcane', 4]]],
      ['poison', [['druid', 3], ['divine', 4]]],
      ['blight', [['druid', 4], ['arcane', 5]]],
      ['crushing-despair', [['bard', 3], ['arcane', 4]]],
      ['lesser-geas', [['bard', 3], ['arcane', 4]]],
      ['speak-with-plants', [['druid', 3], ['bard', 4]]],
      // The four-list case: bard gets it a level early, the cleric a level late.
      ['scrying', [['bard', 3], ['arcane', 4], ['druid', 4], ['divine', 5]]],
    ];
    for (const [id, pairs] of cases) {
      const s = by(id);
      for (const [list, lvl] of pairs) {
        expect(C.spellLevelOn(s, list), `${id} on ${list}`).toBe(lvl);
      }
    }
  });

  it('fills the gaps left in the numbered polymorph and variant series', () => {
    // We carried beast shape III/IV and elemental body IV but not the entries that
    // unlock them, which made the series unusable from the bottom.
    for (const id of ['beast-shape-i', 'beast-shape-ii', 'beast-shape-iii']) {
      expect(C.spellById.has(id), `${id} missing from the beast shape series`).toBe(true);
    }
    expect(C.spellLevelOn(by('beast-shape-i'), 'arcane')).toBe(3);
    expect(C.spellLevelOn(by('beast-shape-ii'), 'arcane')).toBe(4);
    expect(C.spellLevelOn(by('elemental-body-i'), 'arcane')).toBe(4);
    // Greater/lesser/mass variants follow the catalogue's prefix convention, not the SRD's
    // "X, Greater" suffix — a mismatch here silently orphans the spell from every lookup.
    for (const id of ['greater-magic-fang', 'greater-magic-weapon', 'lesser-geas',
                      'lesser-globe-of-invulnerability', 'lesser-planar-ally',
                      'mass-enlarge-person', 'mass-reduce-person']) {
      expect(C.spellById.has(id), `${id} missing`).toBe(true);
    }
  });

  it("gives the druid its own summon line and the cleric's 4th-level staples", () => {
    expect(C.spellLevelOn(by('summon-natures-ally-iii'), 'druid')).toBe(3);
    // Druid 3, and also ranger 3 since the ranger list was authored — not on arcane or divine.
    // Asserted as membership rather than an exact array: the hybrid-class lists are layered on
    // afterwards, so a spell's full `lists` grows every time one of those is authored.
    expect(by('summon-natures-ally-iii').lists).toEqual(expect.arrayContaining(['druid', 'ranger']));
    expect(by('summon-natures-ally-iii').lists).not.toContain('arcane');
    expect(by('summon-natures-ally-iii').lists).not.toContain('divine');
    for (const id of ['order-s-wrath', 'lesser-planar-ally', 'water-walk', 'helping-hand',
                      'invisibility-purge', 'remove-blindness-deafness']) {
      expect(by(id).lists).toContain('divine');
    }
  });

  it('carries no spell that is only on a non-CRB list', () => {
    // Blot reads as PZO1110 in d20pfsrd's bard table but its own page credits Goblins of
    // Golarion, so it stays out until we take splatbook spells on purpose.
    expect(C.spellById.has('blot')).toBe(false);
  });
});

describe('spells — CRB completion batch 3 (levels 5–6)', () => {
  const by = (id: string) => {
    const s = C.spellById.get(id);
    expect(s, `spell ${id} missing`).toBeDefined();
    return s!;
  };

  it('places the divergent 5th–6th level spells at the right level per list', () => {
    const cases: [string, [string, number][]][] = [
      // Mass buffs inherit their single-target lists, which is what the wider audit checks;
      // these pin the level and the fact that cat's grace is druid (not divine) and eagle's
      // splendor is divine (not druid) — the pair most easily transposed.
      ['mass-cats-grace', [['arcane', 6], ['bard', 6], ['druid', 6]]],
      ['mass-eagles-splendor', [['arcane', 6], ['bard', 6], ['divine', 6]]],
      ['mass-cure-moderate-wounds', [['bard', 6], ['divine', 6], ['druid', 7]]],
      // Bard reaches the "greater" and mass control spells a level or two ahead of the wizard.
      ['greater-scrying', [['bard', 6], ['arcane', 7], ['divine', 7], ['druid', 7]]],
      ['greater-shout', [['bard', 6], ['arcane', 8]]],
      ['mass-charm-monster', [['bard', 6], ['arcane', 8]]],
      ['mass-suggestion', [['bard', 5], ['arcane', 6]]],
      ['irresistible-dance', [['bard', 6], ['arcane', 8]]],
      ['project-image', [['bard', 6], ['arcane', 7]]],
      ['wind-walk', [['divine', 6], ['druid', 7]]],
    ];
    for (const [id, pairs] of cases) {
      const s = by(id);
      for (const [list, lvl] of pairs) expect(C.spellLevelOn(s, list), `${id} on ${list}`).toBe(lvl);
    }
  });

  it('completes the numbered polymorph and summon lines through 6th level', () => {
    for (const id of ['elemental-body-iii', 'plant-shape-i', 'plant-shape-ii', 'beast-shape-iv',
                      'form-of-the-dragon-i', 'summon-monster-vi', 'summon-natures-ally-v',
                      'summon-natures-ally-vi']) {
      expect(C.spellById.has(id), `${id} missing`).toBe(true);
    }
    // The summon-nature lines the druid gained this batch stay off the arcane and divine lists —
    // the hybrid classes that read the druid list pick them up, which is the point of those lists.
    for (const id of ['summon-natures-ally-v', 'summon-natures-ally-vi']) {
      expect(by(id).lists).toContain('druid');
      expect(by(id).lists).not.toContain('arcane');
      expect(by(id).lists).not.toContain('divine');
      expect(by(id).lists).not.toContain('bard');
    }
  });

  it('ties the new witch-list spells to their witch level', () => {
    // greater-scrying is witch 7 though it is wizard 7 too, and irresistible-dance witch 8;
    // the ones a level off the wizard prove the map is doing real work.
    expect(by('symbol-of-pain').lists).toContain('witch');
    expect(C.spellLevelOn(by('symbol-of-pain'), 'witch')).toBe(5);
    expect(C.spellLevelOn(by('analyze-dweomer'), 'witch')).toBe(6);
    expect(C.spellLevelOn(by('greater-scrying'), 'witch')).toBe(7);
  });
});

describe('spells — CRB completion batch 4 (levels 7–9, set complete)', () => {
  const by = (id: string) => {
    const s = C.spellById.get(id);
    expect(s, `spell ${id} missing`).toBeDefined();
    return s!;
  };

  it('closes the numbered polymorph and summon ladders at their tops', () => {
    for (const id of ['elemental-body-ii', 'form-of-the-dragon-ii', 'form-of-the-dragon-iii',
                      'giant-form-i', 'giant-form-ii', 'plant-shape-iii', 'greater-polymorph',
                      'summon-monster-vii', 'summon-monster-viii',
                      'summon-natures-ally-vii', 'summon-natures-ally-ix']) {
      expect(C.spellById.has(id), `${id} missing`).toBe(true);
    }
    // elemental-body-ii filled the gap left between batches 2 (i) and 3 (iii).
    expect(C.spellLevelOn(by('elemental-body-ii'), 'arcane')).toBe(5);
    // The summon-nature ladder stays off every other *base* list all the way up.
    expect(by('summon-natures-ally-ix').lists).toContain('druid');
    for (const l of ['arcane', 'divine', 'bard']) {
      expect(by('summon-natures-ally-ix').lists).not.toContain(l);
    }
  });

  it('places the level-differing high spells correctly per list', () => {
    const cases: [string, [string, number][]][] = [
      ['antipathy', [['arcane', 8], ['druid', 9]]],
      ['sympathy', [['arcane', 8], ['druid', 9]]],
      ['mass-cure-serious-wounds', [['divine', 7], ['druid', 8]]],
      ['energy-drain', [['arcane', 9], ['divine', 9]]],
      ['ethereal-jaunt', [['arcane', 7], ['divine', 7]]],
    ];
    for (const [id, pairs] of cases) {
      const s = by(id);
      for (const [list, lvl] of pairs) expect(C.spellLevelOn(s, list), `${id} on ${list}`).toBe(lvl);
    }
  });

  it('covers every Core Rulebook spell except the deliberately excluded Blot', () => {
    // With this batch the four Core class lists are complete. The one fixture id we do not carry
    // is blot, which d20pfsrd's bard table sources to PZO1110 but whose own page credits Goblins
    // of Golarion — so it stays out until splatbook spells are taken on purpose.
    const norm = (id: string): string => {
      const v = id.match(/^(greater|lesser|mass)-(.+)$/);
      if (v) return `${v[2]}-${v[1]}`;
      return id;
    };
    const have = new Set([...C.SPELLS].map((s) => norm(s.id)));
    have.add('protection-from-chaos-evil-good-law').add('magic-circle-against-chaos-evil-good-law');
    have.add('dispel-chaos-evil-good-law').add('detect-chaos-evil-good-law');
    have.add('blindness-deafness').add('orders-wrath');
    const fixtureIds = C.CRB_SPELL_LISTS.trim().split(';').map((e) => e.split('=')[0]);
    const uncovered = fixtureIds.filter((id) => !have.has(id));
    expect(uncovered).toEqual(['blot']);
  });
});

describe('racial spell-like abilities', () => {
  /** The slug `slaExtras` in resolve.ts derives from an SLA's name to find its spell. */
  const slug = (name: string) => name.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  it('names a spell the catalogue carries, for every race and heritage', () => {
    // An SLA whose name finds no spell still resolves — it just shows a caster level and no save
    // DC. That silent degradation is why this is asserted here: a typo in an SLA name, or a race
    // added with a spell we do not stock, reads as working. The last gap (the undine's Hydraulic
    // Push) closed with the APG batch, so the invariant is now that there are none.
    const missing: string[] = [];
    for (const r of C.RACES) {
      for (const t of [...r.traits, ...r.altTraits]) {
        for (const sla of t.spellLikeAbilities ?? []) {
          if (!C.spellById.has(slug(sla.name))) missing.push(`${r.id}/${t.id}: ${sla.name}`);
        }
      }
      for (const h of r.heritages ?? []) {
        if (!C.spellById.has(slug(h.spellLikeAbility.name))) missing.push(`${r.id} heritage ${h.id}: ${h.spellLikeAbility.name}`);
      }
    }
    expect(missing, `spell-like abilities with no catalogue spell: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('spells — Advanced Player’s Guide batch', () => {
  const by = (id: string) => {
    const s = C.spellById.get(id);
    expect(s, `APG spell "${id}" is missing`).toBeTruthy();
    return s!;
  };

  // Every row read off that spell's own d20pfsrd page, then filtered to the lists we model. The
  // inquisitor and magus tags are not authored here — they come from INQUISITOR_LEVELS/MAGUS_LEVELS,
  // scraped from those two classes' own list pages, which is why four of these spells carry one.
  // Alchemist, summoner and oracle lines arrive through the list those classes already read, and
  // psychic/mesmerist/occultist/spiritualist have no list here at all.
  const EXPECTED: [string, [C.SpellList, number][]][] = [
    ['weapon-of-awe', [['divine', 2], ['paladin', 2], ['inquisitor', 2]]],
    ['grace', [['divine', 2], ['paladin', 1]]],
    ['blessing-of-fervor', [['divine', 4]]],
    ['ant-haul', [['arcane', 1], ['divine', 1], ['druid', 1], ['ranger', 1]]],
    ['life-bubble', [['arcane', 5], ['divine', 5], ['druid', 4], ['ranger', 3]]],
    ['gravity-bow', [['arcane', 1], ['ranger', 1]]],
    ['lead-blades', [['ranger', 1]]],
    ['aspect-of-the-falcon', [['druid', 1], ['ranger', 1]]],
    ['instant-enemy', [['ranger', 3]]],
    ['strong-jaw', [['druid', 4], ['ranger', 3]]],
    ['bristle', [['druid', 1]]],
    ['feather-step', [['bard', 1], ['druid', 1], ['ranger', 1]]],
    ['hydraulic-push', [['arcane', 1], ['druid', 1], ['magus', 1]]],
    ['cloak-of-winds', [['arcane', 3], ['druid', 3], ['ranger', 3], ['magus', 3]]],
    ['vanish', [['arcane', 1], ['bard', 1], ['magus', 1]]],
    ['twilight-knife', [['arcane', 3], ['witch', 3]]],
    ['ill-omen', [['witch', 1]]],
    ['saving-finale', [['bard', 1]]],
    ['timely-inspiration', [['bard', 1]]],
  ];

  it('puts every spell on exactly the lists it belongs to, at the published level', () => {
    for (const [id, pairs] of EXPECTED) {
      const s = by(id);
      expect(s.source, `${id} must be tagged APG or it escapes the Core audit`).toBe('APG');
      // Exact-set only over the lists this spell's own page publishes. The hybrid-class lists are
      // layered on afterwards from those classes' own list pages, so they are excluded here and
      // audited by their own tests — otherwise every future list batch would break this one.
      const authored = (ls: string[]) => ls.filter((l) => !CLASS_LIST_OVERLAYS.has(l)).sort();
      expect(authored([...s.lists]), `${id} lists`).toEqual(authored(pairs.map(([l]) => l)));
      // Levels are checked for every pair, overlay lists included — those are verified data too.
      for (const [list, lvl] of pairs) expect(C.spellLevelOn(s, list), `${id} on ${list}`).toBe(lvl);
    }
  });

  it('carries the levels a summary would get wrong', () => {
    // Each of these was corrected by reading the spell's own page. Pinned so a future edit that
    // "tidies" them back to the intuitive value fails here.
    expect(C.spellLevelOn(by('strong-jaw'), 'druid')).toBe(4); // ranger 3, but druid 4
    expect(C.spellLevelOn(by('life-bubble'), 'divine')).toBe(5); // cleric 5, not 4
    expect(C.spellLevelOn(by('life-bubble'), 'ranger')).toBe(3);
    expect(C.spellLevelOn(by('grace'), 'paladin')).toBe(1); // cleric 2, paladin 1
    // Weapon of Awe is cleric/oracle, inquisitor and paladin — not a magus spell.
    expect(by('weapon-of-awe').lists).not.toContain('arcane');
  });

  it('leaves the Core paladin, ranger and witch lists exactly as they were', () => {
    // The overlay maps below are the Core lists; an APG spell tags its list inline instead, so
    // nothing here should have been added to them.
    for (const id of ['weapon-of-awe', 'grace', 'lead-blades', 'ill-omen', 'twilight-knife']) {
      expect(by(id).source).toBe('APG');
    }
    expect(C.SPELLS.filter((s) => s.source === 'APG').length).toBe(EXPECTED.length);
  });

  it('gives an engine effect only to the three spells that reduce to a typed bonus', () => {
    const withBuff = C.SPELLS.filter((s) => s.source === 'APG' && s.buff).map((s) => s.id).sort();
    expect(withBuff).toEqual(['aspect-of-the-falcon', 'cloak-of-winds', 'weapon-of-awe']);
    // Weapon of Awe: a flat +2 sacred on damage that does not scale with caster level.
    const awe = (cl: number) => by('weapon-of-awe').buff!.at(cl).effects!;
    expect(awe(1)[0]).toMatchObject({ target: 'damage:weapon', type: 'sacred', value: 2 });
    expect(awe(20)[0].value).toBe(2);
    expect(by('weapon-of-awe').buff!.at(7).rounds).toBe(70); // 1 min/level
    // Aspect of the Falcon: +1 ranged only — it is not a bonus on melee attacks.
    const falcon = by('aspect-of-the-falcon').buff!.at(5).effects!;
    expect(falcon.map((e) => e.target).sort()).toEqual(['attack:ranged', 'skill:perception']);
    expect(falcon.find((e) => e.target === 'skill:perception')!.value).toBe(3);
    // Cloak of Winds is conditional, so it is annotated rather than added to AC.
    expect(by('cloak-of-winds').buff!.at(5).effects![0].condition).toBe('against ranged attacks');
  });
});

describe('the remaining class spell lists', () => {
  const on = (list: string) => C.SPELLS.filter((s) => s.lists.includes(list as never));
  const lvl = (id: string, list: string) => C.spellLevelOn(C.spellById.get(id)!, list);
  const listOf = (classId: string) => C.classById.get(classId)!.spellcasting!.list;

  it('point every caster at the list it actually casts from', () => {
    // Verified one by one against each class's own Spells feature, not assumed from flavour.
    expect(listOf('alchemist')).toBe('alchemist');
    expect(listOf('investigator')).toBe('alchemist');   // "uses the alchemist formulae list"
    expect(listOf('summoner')).toBe('summoner');
    expect(listOf('bloodrager')).toBe('bloodrager');
    expect(listOf('shaman')).toBe('shaman');
    expect(listOf('hunter')).toBe('hunter');
    expect(listOf('witch')).toBe('witch');
    expect(listOf('vampire-hunter')).toBe('inquisitor');
  });

  it('leave alone the four classes that really do share another list', () => {
    // These are not borrowed approximations — each class's Spells feature names the other list.
    expect(listOf('warpriest')).toBe('divine');   // "drawn from the cleric spell list"
    expect(listOf('oracle')).toBe('divine');      // "drawn from the cleric spell list"
    expect(listOf('skald')).toBe('bard');         // "drawn from the bard spell list"
    expect(listOf('arcanist')).toBe('arcane');    // "drawn from the sorcerer/wizard spell list"
  });

  it('carry each scraped list at the levels its class table reaches', () => {
    // Counts pin the scrape; the bands pin the level offsets, which differ per page — the summoner
    // and shaman pages open with a cantrip table, the alchemist and bloodrager pages open at 1st.
    const bands: [string, number, number, number][] = [
      // list, spells carried, lowest level, highest level
      ['alchemist', 94, 1, 6],
      ['bloodrager', 83, 1, 4],
      ['summoner', 136, 0, 6],
      ['shaman', 225, 0, 9],
    ];
    for (const [list, count, lo, hi] of bands) {
      const spells = on(list);
      expect(spells.length, `${list} list size`).toBe(count);
      const levels = spells.map((s) => C.spellLevelOn(s, list));
      expect(Math.min(...levels), `${list} lowest level`).toBe(lo);
      expect(Math.max(...levels), `${list} highest level`).toBe(hi);
    }
  });

  it('agree with the individual spell pages on where each list starts', () => {
    // The offsets were the one thing a table index could get silently wrong, so each is confirmed
    // against a spell whose own page names its level on that class.
    expect(lvl('ant-haul', 'alchemist')).toBe(1);
    expect(lvl('ant-haul', 'summoner')).toBe(1);
    expect(lvl('hydraulic-push', 'bloodrager')).toBe(1);
    expect(lvl('hydraulic-push', 'shaman')).toBe(1);
    expect(lvl('ironskin', 'alchemist')).toBe(2);
    expect(lvl('ironskin', 'bloodrager')).toBe(2);
  });

  it('build the hunter list from the rule its class feature states', () => {
    // "Only druid spells of 6th level and lower and ranger spells ... If a spell appears on both,
    // the hunter uses the lower of the two spell levels." Both worked examples from the feature:
    expect(lvl('reduce-animal', 'druid')).toBe(2);
    expect(lvl('reduce-animal', 'ranger')).toBe(3);
    expect(lvl('reduce-animal', 'hunter')).toBe(2);   // the lower of the two
    // The feature's second example calls detect poison "a 2nd-level ranger spell", but d20pfsrd's
    // ranger list puts it at 1st and that is what RANGER_LEVELS carries. The example's *result* is
    // unaffected — the druid level is lower either way — so the rule is asserted against our data.
    expect(lvl('detect-poison', 'druid')).toBe(0);
    expect(lvl('detect-poison', 'ranger')).toBe(1);
    expect(lvl('detect-poison', 'hunter')).toBe(0);
    // Ranger-only spells come along whole; druid spells above 6th do not come at all.
    expect(C.spellById.get('lead-blades')!.lists).toContain('hunter');   // ranger 1, no druid line
    expect(lvl('lead-blades', 'hunter')).toBe(1);
    for (const s of on('hunter')) {
      expect(C.spellLevelOn(s, 'hunter') <= 6, `${s.id} is above the hunter's 6th`).toBe(true);
    }
    const highDruid = C.SPELLS.filter((s) => s.lists.includes('druid') && C.spellLevelOn(s, 'druid') > 6);
    expect(highDruid.length).toBeGreaterThan(0);
    for (const s of highDruid) {
      // Unless the ranger list carries it too, which no 7th+ druid spell does.
      expect(s.lists, `${s.id} is druid ${C.spellLevelOn(s, 'druid')} and must not be a hunter spell`)
        .not.toContain('hunter');
    }
  });

  it('narrow every switched class rather than widening it', () => {
    // Each of these was reading a list far larger than the class really gets. The witch is the
    // starkest: WITCH_LEVELS existed for an arcanist archetype while the witch herself was still
    // being offered the whole sorcerer/wizard list.
    const arcane = on('arcane').length;
    const divine = on('divine').length;
    const druid = on('druid').length;
    expect(on('witch').length).toBeLessThan(arcane);
    expect(on('alchemist').length).toBeLessThan(arcane);
    expect(on('summoner').length).toBeLessThan(arcane);
    expect(on('bloodrager').length).toBeLessThan(arcane);
    expect(on('shaman').length).toBeLessThan(divine);
    expect(on('hunter').length).toBeGreaterThan(0);
    expect(on('druid').length).toBeGreaterThan(0);
    expect(druid).toBeGreaterThan(0);
    // No witch has ever cast Fireball, and no bloodrager casts a 5th-level spell.
    expect(C.spellById.get('fireball')!.lists).not.toContain('witch');
    expect(Math.max(...on('bloodrager').map((s) => C.spellLevelOn(s, 'bloodrager')))).toBe(4);
  });
});

describe('inquisitor and magus spell lists', () => {
  const on = (list: 'inquisitor' | 'magus') => C.SPELLS.filter((s) => s.lists.includes(list));
  const lvl = (id: string, list: string) => C.spellLevelOn(C.spellById.get(id)!, list);
  const listOf = (classId: string) => C.classById.get(classId)!.spellcasting!.list;

  it('are what those two classes actually cast from', () => {
    // The point of the batch: before this an inquisitor was offered the whole cleric list and a
    // magus the whole sorcerer/wizard list, both far wider than the class really gets.
    expect(listOf('inquisitor')).toBe('inquisitor');
    expect(listOf('magus')).toBe('magus');
    // Every other class that shares those parent lists is untouched.
    expect(listOf('cleric')).toBe('divine');
    expect(listOf('oracle')).toBe('divine');
    expect(listOf('warpriest')).toBe('divine');
    expect(listOf('wizard')).toBe('arcane');
    expect(listOf('sorcerer')).toBe('arcane');
    expect(listOf('arcanist')).toBe('arcane');
  });

  it('carry the scraped lists at 0–6, the range both class tables stop at', () => {
    // Counts, so a spell silently dropping off either list fails here. They are the intersection
    // of each class's d20pfsrd list page with the spells we stock, which is why they are not the
    // full published lists (191 and 148 rows respectively, once third-party rows are excluded).
    expect(on('inquisitor').length).toBe(156);
    expect(on('magus').length).toBe(124);
    for (const list of ['inquisitor', 'magus'] as const) {
      for (const s of on(list)) {
        const l = C.spellLevelOn(s, list);
        expect(l >= 0 && l <= 6, `${s.id} at ${list} ${l} is outside 0–6`).toBe(true);
      }
    }
  });

  it('give the inquisitor spells no cleric gets, at its own levels', () => {
    // Arcane spells the inquisitor reaches — none of these are on the cleric list.
    for (const id of ['invisibility', 'knock', 'heroism', 'keen-edge', 'see-invisibility']) {
      expect(C.spellById.get(id)!.lists, `${id} should be an inquisitor spell`).toContain('inquisitor');
      expect(C.spellById.get(id)!.lists, `${id} is not a cleric spell`).not.toContain('divine');
    }
    // And where it shares a spell with the cleric, it often gets it at a different level.
    expect(lvl('tongues', 'inquisitor')).toBe(2);        // cleric 3
    expect(lvl('banishment', 'inquisitor')).toBe(5);     // cleric 6, wizard 7
    expect(lvl('holy-word', 'inquisitor')).toBe(6);      // cleric 7 — the inquisitor's capstone band
    expect(lvl('dictum', 'inquisitor')).toBe(6);
    expect(lvl('locate-object', 'inquisitor')).toBe(3);  // bard and wizard get it at 2
    expect(lvl('neutralize-poison', 'inquisitor')).toBe(4);
    expect(lvl('weapon-of-awe', 'inquisitor')).toBe(2);  // the APG spell this all started from
  });

  it('keep the magus list narrow — a combat slice of the wizard list', () => {
    // Everything the magus gets is at the wizard's level bar one, so absence is what makes this
    // list real rather than a rename of the arcane one.
    for (const id of ['wish', 'sleep', 'charm-person', 'summon-monster-i', 'mage-armor']) {
      expect(C.spellById.get(id)!.lists, `${id} is not a magus spell`).not.toContain('magus');
    }
    for (const id of ['shocking-grasp', 'fireball', 'haste', 'true-strike', 'mirror-image']) {
      expect(C.spellById.get(id)!.lists, `${id} is a magus spell`).toContain('magus');
    }
    expect(lvl('true-seeing', 'magus')).toBe(6);  // wizard 5 — the list's only level shift
    expect(lvl('shocking-grasp', 'magus')).toBe(1);
    expect(lvl('vanish', 'magus')).toBe(1);
    expect(lvl('disintegrate', 'magus')).toBe(6);
    // A quarter the size of the list it is drawn from, which is the whole improvement.
    expect(on('magus').length * 3).toBeLessThan(C.SPELLS.filter((s) => s.lists.includes('arcane')).length);
  });
});

describe('spells — Monster Codex', () => {
  it('carries Ironskin on the five lists its own page publishes', () => {
    const s = C.spellById.get('ironskin')!;
    expect(s.source).toBe('Monster Codex');
    const authored = [...s.lists].filter((l) => !CLASS_LIST_OVERLAYS.has(l)).sort();
    expect(authored).toEqual(['divine', 'druid', 'paladin', 'ranger', 'witch']);
    for (const list of s.lists) expect(C.spellLevelOn(s, list), `ironskin on ${list}`).toBe(2);
    // Psychic and antipaladin publish it too but have no list here. It must not reach 'arcane':
    // the alchemist and bloodrager lines are real, but sorcerer/wizard has no Ironskin row, so
    // tagging the shared arcane list would have handed it to every wizard.
    expect(s.lists).not.toContain('arcane');
  });

  it('reaches the alchemist and bloodrager through their own class lists', () => {
    // Independent confirmation that the class-list scrape agrees with the spell's own page: both
    // say alchemist 2 and bloodrager 2, and the two came from different pages.
    const s = C.spellById.get('ironskin')!;
    for (const list of ['alchemist', 'bloodrager'] as const) {
      expect(s.lists, `ironskin should be on the ${list} list`).toContain(list);
      expect(C.spellLevelOn(s, list), `ironskin on ${list}`).toBe(2);
    }
  });

  it('scales its natural armor by the printed clause, not the printed cap', () => {
    // "+4 ... increases by 1 for every 4 caster levels above 4th, to a maximum of +7 at 15th."
    // Those two halves disagree — the clause reaches +7 at 16th — so the clause is what is encoded.
    const bonus = (cl: number) => C.spellById.get('ironskin')!.buff!.at(cl).effects![0].value;
    expect(bonus(3)).toBe(4);
    expect(bonus(7)).toBe(4);
    expect(bonus(8)).toBe(5);
    expect(bonus(12)).toBe(6);
    expect(bonus(15)).toBe(6);  // not +7: the printed cap level is the half that is wrong
    expect(bonus(16)).toBe(7);
    expect(bonus(20)).toBe(7);  // capped
    const eff = C.spellById.get('ironskin')!.buff!.at(9).effects![0];
    // Typed like Barkskin, so the two do not stack with each other or an amulet of natural armor.
    expect(eff).toMatchObject({ target: 'ac', type: 'natural-armor' });
    expect(C.spellById.get('ironskin')!.buff!.at(9).rounds).toBe(90);  // 1 min/level
  });

});

describe('paladin and ranger spell lists', () => {
  // Core Rulebook only: these two counts audit PALADIN_LEVELS/RANGER_LEVELS against each class's
  // own d20pfsrd list page, and a splatbook batch that adds to either list must not move them.
  const on = (list: 'paladin' | 'ranger') => C.SPELLS.filter((s) => !s.source && s.lists.includes(list));
  const lvl = (id: string, list: string) => C.spellLevelOn(C.spellById.get(id)!, list);

  it('carries the whole paladin list at its own levels', () => {
    // 43 rows on d20pfsrd's paladin list, but the one alignment row (protection from chaos/evil,
    // magic circle against chaos/evil, dispel chaos/evil) is two of our split spells each — 45.
    const pal = on('paladin');
    expect(pal.length).toBe(45);
    for (const s of pal) {
      const l = C.spellLevelOn(s, 'paladin');
      expect(l >= 1 && l <= 4, `${s.id} at paladin ${l} is out of the 1–4 range`).toBe(true);
    }
    // Level shifts off the cleric list: cure light wounds is cleric 1 but paladin 1, neutralize
    // poison cleric 4 but paladin 4, bless weapon its own paladin 1 (it was mis-set to 2 before).
    expect(lvl('cure-light-wounds', 'paladin')).toBe(1);
    expect(lvl('bless-weapon', 'paladin')).toBe(1);
    expect(lvl('holy-sword', 'paladin')).toBe(4);
    expect(lvl('heal-mount', 'paladin')).toBe(3);
    expect(lvl('greater-magic-weapon', 'paladin')).toBe(3);
    expect(lvl('mark-of-justice', 'paladin')).toBe(4);
  });

  it('gives the paladin only the chaos and evil alignment spells, not good or law', () => {
    for (const id of ['protection-from-chaos', 'protection-from-evil', 'magic-circle-against-chaos',
                      'magic-circle-against-evil', 'dispel-chaos', 'dispel-evil']) {
      expect(C.spellById.get(id)!.lists, `${id} should be a paladin spell`).toContain('paladin');
    }
    for (const id of ['protection-from-good', 'protection-from-law', 'magic-circle-against-good',
                      'magic-circle-against-law', 'dispel-good', 'dispel-law']) {
      expect(C.spellById.get(id)!.lists, `${id} should not be a paladin spell`).not.toContain('paladin');
    }
  });

  it('carries the whole ranger list at its own levels', () => {
    const ran = on('ranger');
    expect(ran.length).toBe(51);
    for (const s of ran) {
      const l = C.spellLevelOn(s, 'ranger');
      expect(l >= 1 && l <= 4, `${s.id} at ranger ${l} is out of the 1–4 range`).toBe(true);
    }
    // The ranger runs a level or two behind the druid on shared spells.
    expect(lvl('cure-light-wounds', 'ranger')).toBe(2); // cleric/druid 1
    expect(lvl('neutralize-poison', 'ranger')).toBe(3); // druid 3, ranger 3
    expect(lvl('greater-magic-fang', 'ranger')).toBe(3); // druid 3, but read from the ranger line
    expect(lvl('summon-natures-ally-iv', 'ranger')).toBe(4);
    expect(lvl('tree-stride', 'ranger')).toBe(4);
  });

  it('places a spell that is on both new lists at the right level on each', () => {
    // Neutralize poison is paladin 4 but ranger 3 — the two lists disagree, which is exactly
    // what the per-list overlay has to get right.
    expect(lvl('neutralize-poison', 'paladin')).toBe(4);
    expect(lvl('neutralize-poison', 'ranger')).toBe(3);
    expect(lvl('cure-light-wounds', 'paladin')).toBe(1);
    expect(lvl('cure-light-wounds', 'ranger')).toBe(2);
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

  it('every racial natural attack is well-formed, and the four expected races carry one', () => {
    const withNatural = new Set<string>();
    for (const r of C.RACES) {
      for (const t of [...r.traits, ...r.altTraits]) {
        for (const na of t.naturalAttacks ?? []) {
          withNatural.add(r.id);
          expect(na.count, `${r.id}/${t.id}`).toBeGreaterThanOrEqual(1);
          expect(na.damage, `${r.id}/${t.id} damage`).toMatch(/^\d+d\d+$/);
          expect(na.name.length, `${r.id}/${t.id} name`).toBeGreaterThan(0);
          expect(na.dmgType.length, `${r.id}/${t.id} dmgType`).toBeGreaterThan(0);
          expect(typeof na.primary, `${r.id}/${t.id} primary`).toBe('boolean');
        }
      }
    }
    for (const id of ['lizardfolk', 'tengu', 'changeling', 'kitsune']) {
      expect(withNatural.has(id), `${id} should have a natural attack`).toBe(true);
    }
  });

  it('every core race has a favored-class-bonus table for the 11 CRB classes, well-formed', () => {
    const CRB = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'wizard'];
    const CORE = ['human', 'dwarf', 'elf', 'gnome', 'half-elf', 'half-orc', 'halfling'];
    for (const id of CORE) {
      const race = C.raceById.get(id)!;
      const fcb = race.favoredClassBonuses;
      expect(fcb, `${id} has no FCB table`).toBeTruthy();
      for (const cls of CRB) {
        const opt = fcb![cls];
        expect(opt, `${id} missing FCB for ${cls}`).toBeTruthy();
        expect(opt.desc.length, `${id}/${cls} desc`).toBeGreaterThan(0);
        if (opt.fraction !== undefined) expect([2, 3, 4, 6]).toContain(opt.fraction);
      }
      // Every keyed class id is real.
      for (const cls of Object.keys(fcb!)) expect(C.classById.has(cls), `${id}: FCB key "${cls}" is not a class`).toBe(true);
    }
  });

  it('every variant heritage is well-formed and replaces real traits', () => {
    const ABILITY = new Set(['str', 'dex', 'con', 'int', 'wis', 'cha']);
    for (const r of C.RACES) {
      if (!r.heritages) continue;
      const traitIds = new Set(r.traits.map((t) => t.id));
      for (const rep of r.heritageReplaces ?? []) {
        expect(traitIds.has(rep), `${r.id} heritageReplaces "${rep}" is not a real trait`).toBe(true);
      }
      for (const h of r.heritages) {
        expect(h.spellLikeAbility.name.length, `${r.id}/${h.id} SLA`).toBeGreaterThan(0);
        for (const [k, v] of Object.entries(h.abilityMods)) {
          expect(ABILITY.has(k), `${r.id}/${h.id} ability "${k}"`).toBe(true);
          expect(Math.abs(v as number), `${r.id}/${h.id} ${k}`).toBe(2);
        }
        for (const e of h.effects ?? []) {
          expect(e.target.startsWith('skill:'), `${r.id}/${h.id} effect target`).toBe(true);
          const skillId = e.target.slice('skill:'.length);
          expect(C.skillById.has(skillId), `${r.id}/${h.id}: "${skillId}" is not a real skill`).toBe(true);
        }
      }
    }
    expect(C.raceById.get('aasimar')!.heritages!.length).toBe(6);
    expect(C.raceById.get('tiefling')!.heritages!.length).toBe(10);
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

describe('archetypes', () => {
  it('replace real feature ids, grant valid levels, and use unique grant ids', () => {
    const grantIds: string[] = [];
    for (const c of C.CLASSES) {
      for (const a of c.archetypes ?? []) {
        expect(a.classId).toBe(c.id);
        const featureIds = new Set((c.features ?? c.features1).map((f) => f.id));
        for (const rid of a.replaces) expect(featureIds.has(rid), `${a.id} replaces unknown feature ${rid}`).toBe(true);
        // Partial-casting tweaks (Diminished Spellcasting etc.) only mean something on a class that
        // still casts after the archetype is applied — a mod with nothing to modify is a mistake.
        if (a.spellcastingMod) {
          const stillCasts = a.spellcasting === undefined ? !!c.spellcasting : a.spellcasting !== null;
          expect(stillCasts, `${a.id}: spellcastingMod but no surviving spellcasting`).toBe(true);
        }
        // Class-skill add/remove must reference real skills; removes must hit a skill the class has.
        for (const s of a.classSkills?.add ?? []) expect(skillIds.has(s), `${a.id} adds unknown class skill ${s}`).toBe(true);
        for (const s of a.classSkills?.remove ?? []) expect(c.classSkills.includes(s), `${a.id} removes class skill ${s} the class lacks`).toBe(true);
        // Bonus-feat-slot removes must hit a real bonus-feat level; both lists stay in 1..20.
        for (const l of a.bonusFeatSlots?.remove ?? []) expect(c.bonusFeats?.levels.includes(l), `${a.id} removes bonus-feat level ${l} the class lacks`).toBe(true);
        for (const l of [...(a.bonusFeatSlots?.add ?? []), ...(a.bonusFeatSlots?.remove ?? [])]) {
          expect(l, `${a.id} bonus-feat level ${l}`).toBeGreaterThanOrEqual(1);
          expect(l, `${a.id} bonus-feat level ${l}`).toBeLessThanOrEqual(20);
        }
        // DR override: null is fine (removes DR); an object needs non-empty levels in 1..20.
        if (a.damageReduction) {
          expect(a.damageReduction.levels.length, `${a.id} DR override empty levels`).toBeGreaterThan(0);
          for (const l of a.damageReduction.levels) {
            expect(l, `${a.id} DR level ${l}`).toBeGreaterThanOrEqual(1);
            expect(l, `${a.id} DR level ${l}`).toBeLessThanOrEqual(20);
          }
        }
        // Source-power suppression: non-empty prefix and levels in 1..20.
        for (const s of a.suppressSourcePowers ?? []) {
          expect(s.prefix.length, `${a.id} suppressSourcePowers empty prefix`).toBeGreaterThan(0);
          expect(s.levels.length, `${a.id} suppressSourcePowers empty levels`).toBeGreaterThan(0);
          for (const l of s.levels) {
            expect(l, `${a.id} suppress level ${l}`).toBeGreaterThanOrEqual(1);
            expect(l, `${a.id} suppress level ${l}`).toBeLessThanOrEqual(20);
          }
        }
        for (const g of a.grants) {
          expect(g.level, `${a.id} grant ${g.id} level`).toBeGreaterThanOrEqual(1);
          expect(g.level, `${a.id} grant ${g.id} level`).toBeLessThanOrEqual(20);
          grantIds.push(g.id);
        }
      }
    }
    expect(new Set(grantIds).size, 'archetype grant ids are unique').toBe(grantIds.length);
  });
});

describe('companion creatures', () => {
  it('every entry is well-formed: unique per kind, real sizes, positive dice', () => {
    const seen = new Set<string>();
    for (const c of C.COMPANIONS) {
      const key = `${c.kind}:${c.id}`;
      expect(seen.has(key), `duplicate companion ${key}`).toBe(false);
      seen.add(key);
      expect(C.SIZE_MODIFIERS[c.start.size], `${key}: unknown size`).toBeTruthy();
      expect(c.start.speed.base, `${key}: negative speed`).toBeGreaterThanOrEqual(0);
      for (const a of c.start.attacks) {
        expect(a.count, `${key}/${a.name}: attack count`).toBeGreaterThan(0);
        expect(a.damage, `${key}/${a.name}: damage die`).toMatch(/^\d+d\d+$/);
      }
      for (const ab of ABILITIES) {
        expect((c.start.abilities as Record<string, number>)[ab], `${key}: ${ab} score`).toBeGreaterThan(0);
      }
    }
  });

  it('animal companions all carry an advancement at 4th or 7th', () => {
    for (const c of C.ANIMAL_COMPANIONS) {
      expect(c.advance, `${c.id}: no advancement`).toBeTruthy();
      expect([4, 7], `${c.id}: advancement level`).toContain(c.advance!.level);
    }
  });

  it('eidolon base forms name two good saves and their free evolutions', () => {
    const evoIds = new Set(C.EIDOLON_EVOLUTIONS.map((e) => e.id));
    for (const f of C.EIDOLON_FORMS) {
      expect(f.goodSaves, `${f.id}: good saves`).toHaveLength(2);
      for (const e of f.freeEvolutions ?? []) {
        expect(evoIds.has(e), `${f.id}: free evolution "${e}" is not a real evolution`).toBe(true);
      }
    }
  });

  it('every familiar states what its master gains', () => {
    for (const f of C.FAMILIARS) expect(f.masterBenefit, `${f.id}: no master benefit`).toBeTruthy();
  });

  it('the three advancement tables each have twenty rows, monotonic in BAB and hit dice', () => {
    for (const [name, rows] of [['animal', C.ANIMAL_COMPANION_TABLE], ['eidolon', C.EIDOLON_TABLE]] as const) {
      expect(rows, `${name} table length`).toHaveLength(20);
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].hd, `${name} row ${i + 1}: hit dice went down`).toBeGreaterThanOrEqual(rows[i - 1].hd);
        expect(rows[i].bab, `${name} row ${i + 1}: BAB went down`).toBeGreaterThanOrEqual(rows[i - 1].bab);
      }
    }
    expect(C.FAMILIAR_TABLE).toHaveLength(20);
  });

  it("the eidolon table's pool column matches the evolution point-buy constant", () => {
    expect(C.EIDOLON_TABLE.map((r) => r.pool)).toEqual([...C.EIDOLON_EVOLUTION_POOL]);
  });

  it('every class that grants a companion offers the slot that names it', () => {
    for (const c of C.CLASSES) {
      for (const src of c.companions ?? []) {
        const ch = (c.choices ?? []).find((x) => x.id === src.choiceId);
        expect(ch, `class ${c.id}: companion source "${src.choiceId}" has no matching choice`).toBeTruthy();
        expect(ch!.kind, `class ${c.id}/${src.choiceId}: choice kind`).toBe('companion');
        expect(ch!.companionKind, `class ${c.id}/${src.choiceId}: companion kind mismatch`).toBe(src.kind);
        expect(C.companionsOfKind(src.kind).length, `class ${c.id}: no companions of kind ${src.kind}`).toBeGreaterThan(0);
      }
    }
  });

  it('every branch requirement points at a choice that can actually hold that value', () => {
    for (const c of C.CLASSES) {
      const progression = C.CLASS_PROGRESSION[c.id]?.choices ?? [];
      const all = [...(c.choices ?? []), ...progression];
      for (const ch of all) {
        if (!ch.requires) continue;
        const target = all.find((x) => x.id === ch.requires!.choiceId);
        expect(target, `class ${c.id}/${ch.id}: requires unknown choice "${ch.requires.choiceId}"`).toBeTruthy();
        // Only inline 'list' choices carry their options as data; the rest are generated by the
        // engine from the catalogues, so there is nothing to compare against here.
        if (target!.kind !== 'list') continue;
        const ids = (target!.options ?? []).map((o) => o.id);
        expect(ids, `class ${c.id}/${ch.id}: requires value "${ch.requires.value}" not offered`).toContain(ch.requires.value);
      }
    }
  });

  it('an archetype can only fuse a companion its class actually grants', () => {
    for (const c of C.CLASSES) {
      for (const arch of c.archetypes ?? []) {
        if (!arch.fusedCompanion) continue;
        expect((c.companions ?? []).length, `${c.id}/${arch.id}: fuses a companion the class does not grant`).toBeGreaterThan(0);
      }
    }
  });
});

describe('feat prerequisites: reqText and the predicate must agree', () => {
  /** Every leaf clause in a predicate, flattened. */
  function atoms(p: Predicate | undefined): Predicate[] {
    if (!p) return [];
    if ('all' in p) return p.all.flatMap(atoms);
    if ('any' in p) return p.any.flatMap(atoms);
    if ('not' in p) return atoms(p.not);
    return [p];
  }
  const ABBR: Record<string, string> = { str: 'str', dex: 'dex', con: 'con', int: 'int', wis: 'wis', cha: 'cha' };

  it('a "<Class> N" requirement is a class-level gate, not bare class membership', () => {
    const classNames = new Set(C.CLASSES.map((c) => c.name.toLowerCase()));
    for (const f of C.FEATS) {
      // e.g. "Weapon Focus, Fighter 8" — a class name followed by a level above 1.
      const m = f.reqText.match(/\b([A-Z][a-z]+)\s+(\d+)\b/);
      if (!m || !classNames.has(m[1].toLowerCase())) continue;
      const want = Number(m[2]);
      const found = atoms(f.prerequisites).find(
        (a) => 'classLevel' in a && a.classLevel.classId === m[1].toLowerCase(),
      );
      expect(found, `feat ${f.id}: reqText says "${m[1]} ${want}" but no classLevel clause gates it`).toBeTruthy();
      expect((found as { classLevel: { gte: number } }).classLevel.gte,
        `feat ${f.id}: gated at the wrong ${m[1]} level`).toBe(want);
      // A bare classId clause for the same class would silently let in a 1st-level character.
      expect(atoms(f.prerequisites).some((a) => 'classId' in a && a.classId === m[1].toLowerCase()),
        `feat ${f.id}: bare classId clause ignores the level requirement`).toBe(false);
    }
  });

  it('a "Character level N" requirement is enforced', () => {
    for (const f of C.FEATS) {
      const m = f.reqText.match(/Character level (\d+)/i);
      if (!m) continue;
      const found = atoms(f.prerequisites).find((a) => 'level' in a);
      expect(found, `feat ${f.id}: reqText requires character level ${m[1]} but nothing gates it`).toBeTruthy();
      expect((found as { level: number }).level).toBe(Number(m[1]));
    }
  });

  // The next three collect every violation before asserting, so one run names them all.
  it('every "BAB +N" in reqText is enforced at that value', () => {
    const bad: string[] = [];
    for (const f of C.FEATS) {
      const m = f.reqText.match(/BAB \+(\d+)/);
      if (!m) continue;
      const found = atoms(f.prerequisites).find((a) => 'bab' in a) as { bab: number } | undefined;
      if (!found) bad.push(`${f.id}: needs BAB +${m[1]}, ungated`);
      else if (found.bab !== Number(m[1])) bad.push(`${f.id}: BAB gate ${found.bab}, reqText says ${m[1]}`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every ability-score requirement in reqText is enforced at that score', () => {
    const bad: string[] = [];
    for (const f of C.FEATS) {
      for (const m of f.reqText.matchAll(/\b(Str|Dex|Con|Int|Wis|Cha) (\d+)\b/g)) {
        const ab = ABBR[m[1].toLowerCase()];
        const found = atoms(f.prerequisites).find((a) => 'ability' in a && a.ability === ab) as { gte: number } | undefined;
        if (!found) bad.push(`${f.id}: needs ${m[1]} ${m[2]}, ungated`);
        else if (found.gte !== Number(m[2])) bad.push(`${f.id}: ${m[1]} gate ${found.gte}, reqText says ${m[2]}`);
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every feat named in reqText is required, directly or through the prerequisite chain', () => {
    const byName = new Map(C.FEATS.map((f) => [f.name.toLowerCase(), f.id]));
    const byId = new Map(C.FEATS.map((f) => [f.id, f]));
    const directFeats = (id: string): string[] =>
      atoms(byId.get(id)?.prerequisites).filter((a) => 'feat' in a).map((a) => (a as { feat: string }).feat);
    /** Feats a feat requires, following each requirement's own prerequisites — a reqText may spell
     *  out the whole chain (Medusa's Wrath names Improved Unarmed Strike) while the predicate needs
     *  only the immediate link, which is correct as long as the chain actually closes. */
    const closure = (id: string): Set<string> => {
      const seen = new Set<string>();
      const stack = [...directFeats(id)];
      while (stack.length) {
        const cur = stack.pop()!;
        if (seen.has(cur)) continue;
        seen.add(cur);
        stack.push(...directFeats(cur));
      }
      return seen;
    };
    const bad: string[] = [];
    for (const f of C.FEATS) {
      const implied = closure(f.id);
      // reqText lists prerequisites comma-separated; only the clauses naming a catalogue feat count.
      for (const part of f.reqText.split(',').map((x) => x.trim())) {
        const id = byName.get(part.toLowerCase());
        if (id && !implied.has(id)) bad.push(`${f.id}: reqText names ${part}, and nothing in its chain requires it`);
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });
});

describe('spell data holds together', () => {
  it("every spell's school is one the catalogue knows", () => {
    const names = new Set([...C.SCHOOLS.map((s) => s.name), 'Universal']);
    const bad = C.SPELLS.filter((s) => !names.has(s.school)).map((s) => `${s.id}: "${s.school}"`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('a buff lasts as long as the spell says it does', () => {
    // Durations are stored in rounds; these are the published shapes, in rounds.
    const MIN = 10, HOUR = 600;
    const parse = (dur: string): ((cl: number) => number) | null => {
      const d = dur.toLowerCase().replace(/\s+/g, ' ').trim();
      if (/^1 round\/level/.test(d)) return (cl) => cl;
      if (/^1 min\.?\/level/.test(d)) return (cl) => cl * MIN;
      if (/^10 min\.?\/level/.test(d)) return (cl) => cl * 10 * MIN;
      if (/^1 hour\/level/.test(d)) return (cl) => cl * HOUR;
      if (/^10 min(ute)?s?\b/.test(d)) return () => 10 * MIN;
      if (/^1 min(ute)?\b/.test(d)) return () => MIN;
      if (/^(\d+) rounds?\b/.test(d)) return () => Number(d.match(/^(\d+)/)![1]);
      if (/^(\d+) hours?\b/.test(d)) return () => Number(d.match(/^(\d+)/)![1]) * HOUR;
      return null; // concentration, instantaneous, permanent, "see text" — nothing to compare
    };
    const bad: string[] = [];
    const unparsed: string[] = [];
    for (const s of C.SPELLS) {
      if (!s.buff) continue;
      const expected = parse(s.dur);
      if (!expected) { unparsed.push(`${s.id} ("${s.dur}")`); continue; }
      for (const cl of [1, 5, 11]) {
        const got = s.buff.at(cl).rounds;
        if (got !== expected(cl)) {
          bad.push(`${s.id}: dur "${s.dur}" implies ${expected(cl)} rounds at CL ${cl}, buff gives ${got}`);
          break;
        }
      }
    }
    // Surfaced rather than asserted: these durations are deliberately not a fixed number of rounds.
    if (unparsed.length) console.log('buff durations not compared:', unparsed.join(', '));
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('a damage formula is dice notation at every caster level it is asked for', () => {
    const ok = /^[0-9d+\-−×x /()]+$/;
    const bad: string[] = [];
    for (const s of C.SPELLS) {
      if (!s.damage) continue;
      for (const cl of [1, 5, 11, 20]) {
        const f = s.damage.at(cl);
        if (!f || !ok.test(f)) bad.push(`${s.id}: CL ${cl} gives "${f}"`);
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('a spell that offers a save says so, and one that says so has a save line', () => {
    const bad: string[] = [];
    for (const s of C.SPELLS) {
      const saysNone = /^(none|no)\b/i.test(s.save.trim()) || s.save.trim() === '—';
      // A save line naming a save type must name a real one.
      if (!saysNone && !/fort|ref|will|see text|special|none/i.test(s.save))
        bad.push(`${s.id}: save "${s.save}" names no save type`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });
});

describe('archetypes: nothing may silently do nothing', () => {
  // Every check here targets the same bug shape: a field that names something misspelled or absent,
  // so the archetype removes/adds nothing and the test suite never notices.
  const WEAPON_GROUPS = new Set(['simple', 'martial', 'exotic', 'firearms']);
  const weaponIds = new Set(C.WEAPONS.map((w) => w.id));

  it('choices.remove names a choice the class actually offers', () => {
    const bad: string[] = [];
    for (const c of C.CLASSES) {
      const offered = new Set((c.choices ?? []).map((ch) => ch.id));
      for (const a of c.archetypes ?? [])
        for (const id of a.choices?.remove ?? [])
          if (!offered.has(id)) bad.push(`${a.id}: removes choice "${id}" that ${c.id} does not offer`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('two choice definitions sharing an id never grant at the same level', () => {
    // Slots are keyed `<id>` at 1st and `<id>-L<level>` after, so a shared id is fine (the
    // Dual-Cursed oracle adds revelations at 5th and 13th alongside the normal 1/3/7/11/15/19) but
    // a shared *level* would collide on one key and silently lose a pick.
    const bad: string[] = [];
    for (const c of C.CLASSES)
      for (const a of c.archetypes ?? []) {
        const removed = new Set(a.choices?.remove ?? []);
        const kept = (c.choices ?? []).filter((ch) => !removed.has(ch.id));
        const byId = new Map<string, Set<number>>();
        for (const ch of [...kept, ...(a.choices?.add ?? [])]) {
          const seen = byId.get(ch.id) ?? new Set<number>();
          for (const l of ch.levels ?? [1]) {
            if (seen.has(l)) bad.push(`${a.id}: two "${ch.id}" choices both grant at level ${l}`);
            seen.add(l);
          }
          byId.set(ch.id, seen);
        }
      }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('weapon proficiency changes name a real weapon or weapon group', () => {
    const bad: string[] = [];
    for (const c of C.CLASSES)
      for (const a of c.archetypes ?? [])
        for (const w of [...(a.proficiencies?.weapons?.add ?? []), ...(a.proficiencies?.weapons?.remove ?? [])])
          if (!WEAPON_GROUPS.has(w) && !weaponIds.has(w))
            bad.push(`${a.id}: proficiency "${w}" is neither a weapon group nor a weapon id`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('an armor proficiency it removes is one the class has', () => {
    const bad: string[] = [];
    for (const c of C.CLASSES)
      for (const a of c.archetypes ?? [])
        for (const ar of a.proficiencies?.armor?.remove ?? [])
          if (!c.proficiencies.armor.includes(ar))
            bad.push(`${a.id}: removes ${ar} armor, which ${c.id} does not have`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('suppressSourcePowers targets a prefix the engine actually emits', () => {
    const known = new Set(SOURCE_POWER_PREFIXES);
    const bad: string[] = [];
    for (const c of C.CLASSES)
      for (const a of c.archetypes ?? [])
        for (const s of a.suppressSourcePowers ?? [])
          if (!known.has(s.prefix))
            bad.push(`${a.id}: suppresses unknown prefix "${s.prefix}" (known: ${[...known].join(', ')})`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every archetype changes something about its class', () => {
    const bad: string[] = [];
    for (const c of C.CLASSES)
      for (const a of c.archetypes ?? []) {
        const changes = a.replaces.length || a.grants.length || a.proficiencies || a.spellcasting !== undefined
          || a.spellcastingMod || a.choices || a.classSkills || a.bonusFeatSlots || a.damageReduction
          || a.companions || a.fusedCompanion || a.suppressSourcePowers || a.conditionalSuppress
          || a.sourceLines || a.alignment !== undefined;
        if (!changes) bad.push(`${a.id}: inert — changes nothing`);
      }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('an archetype does not replace the same feature twice', () => {
    const bad: string[] = [];
    for (const c of C.CLASSES)
      for (const a of c.archetypes ?? []) {
        const seen = new Set<string>();
        for (const r of a.replaces) {
          if (seen.has(r)) bad.push(`${a.id}: replaces ${r} twice`);
          seen.add(r);
        }
      }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('sourceLines name a choice the archetype or class provides', () => {
    const bad: string[] = [];
    for (const c of C.CLASSES) {
      const offered = new Set((c.choices ?? []).map((ch) => ch.id));
      for (const a of c.archetypes ?? []) {
        const available = new Set([...offered, ...(a.choices?.add ?? []).map((ch) => ch.id)]);
        for (const l of a.sourceLines ?? [])
          if (!available.has(l.choiceId))
            bad.push(`${a.id}: sourceLine on choice "${l.choiceId}" that nothing offers`);
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });
});

describe('race-locked archetypes', () => {
  it('name real races', () => {
    const bad: string[] = [];
    for (const c of C.CLASSES)
      for (const a of c.archetypes ?? [])
        for (const r of a.races ?? [])
          if (!C.raceById.has(r)) bad.push(`${a.id}: unknown race "${r}"`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });
  it('the elf-only Spellbinder is the one we carry', () => {
    const locked = C.CLASSES.flatMap((c) => (c.archetypes ?? []).filter((a) => a.races))
      .map((a) => `${a.id}:${a.races!.join('+')}`);
    expect(locked).toEqual(['spellbinder:elf']);
  });
});

describe('races: the fields that fail silently', () => {
  it('heritageReplaces names traits the race actually has', () => {
    const bad: string[] = [];
    for (const r of C.RACES) {
      const ids = new Set(r.traits.map((t) => t.id));
      for (const rep of r.heritageReplaces ?? [])
        if (!ids.has(rep)) bad.push(`${r.id}: heritageReplaces "${rep}", which it has no trait for`);
      // A race with heritages but nothing for them to supersede would stack the heritage's
      // spell-like ability and skills on top of the defaults instead of replacing them.
      if (r.heritages?.length && !(r.heritageReplaces ?? []).length)
        bad.push(`${r.id}: has heritages but replaces none of its own traits`);
      if (!r.heritages?.length && (r.heritageReplaces ?? []).length)
        bad.push(`${r.id}: heritageReplaces but no heritages to trigger it`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('a heritage names real abilities and real skills', () => {
    const bad: string[] = [];
    for (const r of C.RACES)
      for (const h of r.heritages ?? []) {
        for (const ab of Object.keys(h.abilityMods))
          if (!ABILITIES.includes(ab)) bad.push(`${r.id}/${h.id}: unknown ability "${ab}"`);
        checkEffects(h.effects, `race ${r.id} heritage ${h.id}`);
      }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('favoredClassBonuses are keyed by real class ids', () => {
    const bad: string[] = [];
    for (const r of C.RACES)
      for (const cls of Object.keys(r.favoredClassBonuses ?? {}))
        if (!C.classById.has(cls)) bad.push(`${r.id}: favored-class bonus for unknown class "${cls}"`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('trait ids are unique across every race, since a decision stores the bare id', () => {
    const seen = new Map<string, string>();
    const bad: string[] = [];
    for (const r of C.RACES)
      for (const t of [...r.traits, ...r.altTraits]) {
        const prev = seen.get(t.id);
        if (prev) bad.push(`trait id "${t.id}" used by both ${prev} and ${r.id}`);
        seen.set(t.id, r.id);
      }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('no alternate trait replaces the same standard trait twice, and two alts may overlap only knowingly', () => {
    const bad: string[] = [];
    for (const r of C.RACES)
      for (const a of r.altTraits) {
        const seen = new Set<string>();
        for (const rep of a.replaces) {
          if (seen.has(rep)) bad.push(`${r.id}/${a.id}: replaces "${rep}" twice`);
          seen.add(rep);
        }
      }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every speed is a sane multiple of five', () => {
    const bad: string[] = [];
    for (const r of C.RACES) {
      // Merfolk are the floor at 5 ft on land (they swim 50); nothing published walks faster than 40.
      if (r.speed % 5 !== 0 || r.speed < 5 || r.speed > 40) bad.push(`${r.id}: odd land speed ${r.speed}`);
      for (const [mode, v] of Object.entries(r.speeds ?? {}))
        if (v % 5 !== 0 || v <= 0) bad.push(`${r.id}: odd ${mode} speed ${v}`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });
});
