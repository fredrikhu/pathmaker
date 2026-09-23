import { describe, it, expect } from 'vitest';
import * as C from './index';
import * as S from './subsystems';
import type { Predicate } from '../engine/types';
import { SOURCE_POWER_PREFIXES, propertyPrice } from '../engine/resolve';
import {
  WEAPON_ENHANCEMENT_COST, ARMOR_ENHANCEMENT_COST, MASTERWORK_WEAPON_COST,
  MASTERWORK_ARMOR_COST, MAX_ENHANCEMENT, MAX_TOTAL_BONUS, qualityCost,
} from '../engine/items';

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
        // The one legal non-dice entry is an attack that deals no damage and only grabs.
        expect(a.damage, `${key}/${a.name}: damage die`).toMatch(/^(\d+d\d+|\u2014)$/);
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

describe('source features, verified against the published sources', () => {
  // Read off Archives of Nethys (bloodlines, schools, mysteries, curses, shifter aspects) and
  // d20pfsrd (cavalier orders, shaman spirits, the witch patron table) on 2026-09-23. Each line is
  // one source: "level:Ability" in level order.
  const signature = (feats: C.SourceFeature[]) =>
    feats.map((f) => `${f.level}:${f.name}`).join(' | ');

  const check = (table: Record<string, C.SourceFeature[]>, expected: Record<string, string>, label: string) => {
    expect(Object.keys(table).sort(), `${label}: sources`).toEqual(Object.keys(expected).sort());
    const bad: string[] = [];
    for (const [id, feats] of Object.entries(table)) {
      const got = signature(feats);
      if (got !== expected[id]) bad.push(`${label}/${id}: ${got}  ≠  ${expected[id]}`);
    }
    expect(bad, bad.join(' || ')).toEqual([]);
  };

  it('sorcerer bloodline powers land on 1/3/9/15/20 with the published names', () => {
    check(C.SORCERER_BLOODLINE_POWERS, {
      draconic: '1:Claws | 3:Dragon Resistances | 9:Breath Weapon | 15:Wings | 20:Power of Wyrms',
      arcane: '1:Arcane Bond | 3:Metamagic Adept | 9:New Arcana | 15:School Power | 20:Arcane Apotheosis',
      celestial: '1:Heavenly Fire | 3:Celestial Resistances | 9:Wings of Heaven | 15:Conviction | 20:Ascension',
      infernal: '1:Corrupting Touch | 3:Infernal Resistances | 9:Hellfire | 15:On Dark Wings | 20:Power of the Pit',
      abyssal: '1:Claws | 3:Demon Resistances | 9:Strength of the Abyss | 15:Added Summonings | 20:Demonic Might',
      fey: '1:Laughing Touch | 3:Woodland Stride | 9:Fleeting Glance | 15:Fey Magic | 20:Soul of the Fey',
    }, 'sorcerer bloodline');
  });

  it('bloodrager bloodline powers land on 1/4/8/12/16/20 with the published names', () => {
    check(C.BLOODRAGER_BLOODLINE_POWERS, {
      aberrant: '1:Staggering Strike | 4:Abnormal Reach | 8:Aberrant Fortitude | 12:Unusual Anatomy | 16:Aberrant Resistance | 20:Aberrant Form',
      abyssal: '1:Claws | 4:Demonic Bulk | 8:Demon Resistances | 12:Abyssal Bloodrage | 16:Demonic Aura | 20:Demonic Immunities',
      arcane: "1:Disruptive Bloodrage | 4:Arcane Bloodrage | 8:Greater Arcane Bloodrage | 12:Caster's Scourge | 16:True Arcane Bloodrage | 20:Caster's Bane",
      celestial: '1:Angelic Attacks | 4:Celestial Resistances | 8:Conviction | 12:Wings of Heaven | 16:Angelic Protection | 20:Ascension',
      destined: '1:Destined Strike | 4:Fated Bloodrager | 8:Certain Strike | 12:Defy Death | 16:Unstoppable | 20:Victory or Death',
      draconic: '1:Claws | 4:Draconic Resistance | 8:Breath Weapon | 12:Dragon Wings | 16:Dragon Form | 20:Power of Wyrms',
      elemental: '1:Elemental Strikes | 4:Elemental Resistance | 8:Elemental Movement | 12:Power of the Elements | 16:Elemental Form | 20:Elemental Body',
      fey: '1:Confusing Critical | 4:Leaping Charger | 8:Blurring Movement | 12:Quickling Bloodrage | 16:One with Nature | 20:Fury of the Fey',
      infernal: '1:Hellfire Strike | 4:Infernal Resistance | 8:Diabolical Arrogance | 12:Dark Wings | 16:Hellfire Charge | 20:Fiend of the Pit',
      undead: "1:Frightful Charger | 4:Ghost Strike | 8:Death's Gift | 12:Frightful Strikes | 16:Incorporeal Bloodrager | 20:One Foot in the Grave",
    }, 'bloodrager bloodline');
  });

  it('cavalier order abilities land on 2/8/15 with the published names', () => {
    check(C.CAVALIER_ORDER_ABILITIES, {
      // Braggart, Steal Glory, Moment of Triumph — the 15th-level ability was named "Rages of
      // Vanity" here until the swaps were checked; no such order ability is published.
      cockatrice: '2:Braggart | 8:Steal Glory | 15:Moment of Triumph',
      dragon: '2:Aid Allies | 8:Strategy | 15:Act as One',
      flame: '2:Foolhardy Rush | 8:Daunting Success | 15:Blaze of Glory',
      // Lion's Call is the 2nd-level rally and For the King the 8th-level bonus; ours had them
      // the other way round.
      lion: "2:Lion's Call | 8:For the King | 15:Shield of the Liege",
      shield: '2:Resolute | 8:Stem the Tide | 15:Protect the Meek',
      star: '2:Calling | 8:For the Faith | 15:Retribution',
      sword: "2:By My Honor | 8:Mounted Mastery | 15:Knight's Challenge",
    }, 'cavalier order');
  });

  it('shaman spirit abilities land on 1/8/16 with the published names, plus a manifestation at 20', () => {
    check(C.SHAMAN_SPIRIT_ABILITIES, {
      battle: "1:Battle Spirit | 8:Enemies' Bane | 16:Paragon of Battle | 20:Manifestation",
      bones: '1:Touch of the Grave | 8:Shard Soul | 16:Shedding Form | 20:Manifestation',
      flame: '1:Touch of Flames | 8:Fiery Soul | 16:Elemental Form | 20:Manifestation',
      heavens: '1:Stardust | 8:Void Adaptation | 16:Phantasmagoric Display | 20:Manifestation',
      life: "1:Channel | 8:Healer's Touch | 16:Quick Healing | 20:Manifestation",
      lore: '1:Monstrous Insight | 8:Automatic Writing | 16:Perfect Knowledge | 20:Manifestation',
      nature: '1:Storm Burst | 8:Spirit of Nature | 16:Companion Animal | 20:Manifestation',
      stone: '1:Touch of Acid | 8:Body of Earth | 16:Elemental Form | 20:Manifestation',
      waves: '1:Wave Strike | 8:Fluid Mastery | 16:Elemental Form | 20:Manifestation',
      wind: '1:Shocking Touch | 8:Spark Soul | 16:Elemental Form | 20:Manifestation',
    }, 'shaman spirit');
  });

  it('wizard school powers land on the published levels', () => {
    check(C.SCHOOL_POWERS, {
      // Abjuration is the one school whose third power arrives at 6th rather than 8th.
      abjuration: '1:Resistance | 1:Protective Ward | 6:Energy Absorption',
      conjuration: "1:Summoner's Charm | 1:Acid Dart | 8:Dimensional Steps",
      divination: "1:Forewarned | 1:Diviner's Fortune | 8:Scrying Adept",
      enchantment: '1:Enchanting Smile | 1:Dazing Touch | 8:Aura of Despair',
      evocation: '1:Intense Spells | 1:Force Missile | 8:Elemental Wall',
      illusion: '1:Extended Illusions | 1:Blinding Ray | 8:Invisibility Field',
      necromancy: '1:Power over Undead | 1:Grave Touch | 8:Life Sight',
      transmutation: '1:Physical Enhancement | 1:Telekinetic Fist | 8:Change Shape',
      universalist: '1:Hand of the Apprentice | 8:Metamagic Mastery',
    }, 'school power');
  });

  it('shifter aspects step at 1/4/8/15, and the published aspect is Falcon', () => {
    const bad: string[] = [];
    for (const [id, feats] of Object.entries(C.SHIFTER_ASPECT_ABILITIES)) {
      if (feats.map((f) => f.level).join(',') !== '1,4,8,15') bad.push(`${id}: levels ${feats.map((f) => f.level)}`);
      const animal = id === 'eagle' ? 'Falcon' : id[0].toUpperCase() + id.slice(1);
      const want = [`${animal} Aspect (Minor)`, `${animal} Aspect (Major)`,
        `Greater ${animal} Aspect`, `True ${animal} Aspect`];
      if (feats.map((f) => f.name).join('|') !== want.join('|')) bad.push(`${id}: ${feats.map((f) => f.name).join('|')}`);
    }
    expect(bad, bad.join(' || ')).toEqual([]);
    // The aspect the option list offers must be named as published — it read "Eagle" until this pass.
    expect(S.SHIFTER_ASPECTS.find((a) => a.id === 'eagle')?.name).toBe('Falcon');
    expect(S.SHIFTER_ASPECTS.map((a) => a.id).sort()).toEqual(Object.keys(C.SHIFTER_ASPECT_ABILITIES).sort());
  });

  it('oracle curses and final revelations arrive on the published levels', () => {
    for (const [id, feats] of Object.entries(C.ORACLE_CURSE_ABILITIES))
      expect(feats.map((f) => f.level).join(','), `curse ${id}`).toBe('1,5,10,15');
    for (const [id, feats] of Object.entries(C.ORACLE_FINAL_REVELATIONS)) {
      expect(feats, `mystery ${id}`).toHaveLength(1);
      expect(feats[0].level, `mystery ${id}`).toBe(20);
    }
    // Every mystery with revelations has a final revelation, and vice versa.
    expect(Object.keys(C.ORACLE_FINAL_REVELATIONS).sort())
      .toEqual(C.ORACLE_MYSTERIES.map((m) => m.id).sort());
    expect(Object.keys(C.ORACLE_CURSE_ABILITIES).sort()).toEqual(C.ORACLE_CURSES.map((c) => c.id).sort());
  });

  it('every bonus-spell series matches the published list, at the published levels', () => {
    // The spell is carried in the feature name after the colon.
    const spells = (feats: C.SourceFeature[]) => feats
      .filter((f) => f.name.includes(': '))
      .map((f) => `${f.level}:${f.name.split(': ')[1]}`);
    const SORC: Record<string, string> = {
      draconic: 'Mage Armor, Resist Energy, Fly, Fear, Spell Resistance, Form of the Dragon I, Form of the Dragon II, Form of the Dragon III, Wish',
      arcane: 'Identify, Invisibility, Dispel Magic, Dimension Door, Overland Flight, True Seeing, Greater Teleport, Power Word Stun, Wish',
      celestial: 'Bless, Resist Energy, Magic Circle against Evil, Remove Curse, Flame Strike, Greater Dispel Magic, Banishment, Sunburst, Gate',
      infernal: 'Protection from Good, Scorching Ray, Suggestion, Charm Monster, Dominate Person, Planar Binding, Greater Teleport, Power Word Stun, Meteor Swarm',
      abyssal: "Cause Fear, Bull's Strength, Rage, Stoneskin, Dismissal, Transformation, Greater Teleport, Unholy Aura, Summon Monster IX",
      fey: 'Entangle, Hideous Laughter, Deep Slumber, Poison, Tree Stride, Mislead, Phase Door, Irresistible Dance, Shapechange',
    };
    const BR: Record<string, string> = {
      aberrant: 'Enlarge Person, See Invisibility, Displacement, Black Tentacles',
      abyssal: "Ray of Enfeeblement, Bull's Strength, Rage, Stoneskin",
      arcane: 'Magic Missile, Invisibility, Lightning Bolt, Dimension Door',
      celestial: 'Bless, Resist Energy, Heroism, Holy Smite',
      destined: 'Shield, Blur, Protection from Energy, Freedom of Movement',
      draconic: 'Shield, Resist Energy, Fly, Fear',
      elemental: 'Burning Hands, Scorching Ray, Protection from Energy, Elemental Body I',
      fey: 'Entangle, Hideous Laughter, Haste, Confusion',
      infernal: 'Protection from Good, Scorching Ray, Suggestion, Fire Shield',
      undead: 'Chill Touch, False Life, Vampiric Touch, Enervation',
    };
    const PATRON: Record<string, string> = {
      agility: "Jump, Cat's Grace, Haste, Freedom of Movement, Polymorph, Mass Cat's Grace, Ethereal Jaunt, Animal Shapes, Shapechange",
      animals: "Charm Animal, Speak with Animals, Dominate Animal, Summon Nature's Ally IV, Animal Growth, Antilife Shell, Beast Shape IV, Animal Shapes, Summon Nature's Ally IX",
      deception: 'Ventriloquism, Invisibility, Blink, Confusion, Passwall, Programmed Image, Mass Invisibility, Scintillating Pattern, Time Stop',
      elements: 'Shocking Grasp, Flaming Sphere, Fireball, Wall of Ice, Flame Strike, Freezing Sphere, Vortex, Fire Storm, Meteor Swarm',
      endurance: "Endure Elements, Bear's Endurance, Protection from Energy, Spell Immunity, Spell Resistance, Mass Bear's Endurance, Greater Restoration, Iron Body, Miracle",
      healing: 'Remove Fear, Lesser Restoration, Remove Disease, Restoration, Cleanse, Pillar of Life, Greater Restoration, Mass Cure Critical Wounds, True Resurrection',
      plague: 'Detect Undead, Command Undead, Contagion, Animate Dead, Giant Vermin, Create Undead, Control Undead, Create Greater Undead, Energy Drain',
      shadow: 'Silent Image, Darkness, Deeper Darkness, Shadow Conjuration, Shadow Evocation, Shadow Walk, Greater Shadow Conjuration, Greater Shadow Evocation, Shades',
      strength: "Divine Favor, Bull's Strength, Greater Magic Weapon, Divine Power, Righteous Might, Mass Bull's Strength, Giant Form I, Giant Form II, Shapechange",
      // The winter patron's 4th-level spell is resist energy restricted to cold.
      winter: 'Unshakable Chill, Resist Energy (cold only), Ice Storm, Wall of Ice, Cone of Cold, Freezing Sphere, Control Weather, Polar Ray, Polar Midnight',
    };
    const bad: string[] = [];
    const cmp = (table: Record<string, C.SourceFeature[]>, expected: Record<string, string>, levels: number[], label: string) => {
      expect(Object.keys(table).sort(), `${label}: sources`).toEqual(Object.keys(expected).sort());
      for (const [id, feats] of Object.entries(table)) {
        const want = expected[id].split(', ').map((s, i) => `${levels[i]}:${s}`);
        const got = spells(feats);
        if (got.join(' | ') !== want.join(' | ')) bad.push(`${label}/${id}: ${got.join(' | ')}  ≠  ${want.join(' | ')}`);
      }
    };
    cmp(C.SORCERER_BLOODLINE_SPELLS, SORC, [3, 5, 7, 9, 11, 13, 15, 17, 19], 'sorcerer bonus spell');
    cmp(C.BLOODRAGER_BLOODLINE_SPELLS, BR, [7, 10, 13, 16], 'bloodrager bonus spell');
    cmp(C.WITCH_PATRON_SPELLS, PATRON, [2, 4, 6, 8, 10, 12, 14, 16, 18], 'witch patron spell');
    expect(bad, bad.join(' || ')).toEqual([]);
  });

  it('every sorcerer bloodline states its arcana, and no bloodrager bloodline does', () => {
    // Only sorcerers have bloodline arcana; a bloodrager's bloodline grants powers and spells only.
    for (const [id, feats] of Object.entries(C.SORCERER_BLOODLINE_SPELLS)) {
      const arcana = feats.find((f) => f.name === 'Bloodline Arcana');
      expect(arcana, `${id}: no arcana`).toBeTruthy();
      expect(arcana!.level, `${id}: arcana level`).toBe(1);
      expect(arcana!.desc.length, `${id}: arcana text`).toBeGreaterThan(40);
    }
    for (const [id, feats] of Object.entries(C.BLOODRAGER_BLOODLINE_SPELLS))
      expect(feats.some((f) => f.name === 'Bloodline Arcana'), `${id}: bloodragers have no arcana`).toBe(false);
  });
});

describe('archetype swaps: the prose and the machine list must agree', () => {
  // Every archetype ability ends its description with what it costs ("Replaces bravery."). That
  // sentence and the `replaces` list hold the same fact twice, so they can be diffed — the shape
  // that found the unenforced feat prerequisites, and here eleven wrong or missing swaps.

  /** Collapse a rank marker and the wrapper words, so "the 6th-level mercy" -> "mercy". */
  const base = (s: string): string =>
    s.toLowerCase().replace(/’/g, "'").replace(/[–—]/g, '-')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\b\d+\s*-\s*\d+\b/g, ' ')
      .replace(/\+?\d+d\d+|\+\d+/g, ' ')
      .replace(/\b\d+(st|nd|rd|th)?\b/g, ' ')
      .replace(/[^a-z' ]/g, ' ')
      .replace(/\b(the|a|an|all|and|of|its|his|her|every|improvement|improvements|to|it|level|levels|class|feature|features|ability|abilities|gained|at|normal|standard)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      // Stem a trailing plural, so the prose's "bonus tricks" reaches the "Bonus Trick" feature.
      .split(' ').map((w) => w.replace(/(\w\w)s$/, '$1')).join(' ');

  /** A claim that is paid for by something other than a feature id. */
  const NON_FEATURE = [
    { re: /proficienc/, kind: 'proficiency' },
    { re: /^bonus (combat )?feats?$/, kind: 'bonus-feat' },
    { re: /^teamwork feats?$/, kind: 'bonus-feat' },
    { re: /^combat style feats?$/, kind: 'bonus-feat' },
    { re: /^technique feats?$/, kind: 'bonus-feat' },
    { re: /^spells?$|^spellcasting$|^spells known$/, kind: 'spellcasting' },
    { re: /^damage reduction$/, kind: 'damage-reduction' },
    { re: /^class skills?$/, kind: 'class-skills' },
    { re: /^alignment$/, kind: 'alignment' },
  ] as const;

  type Mechanism = 'proficiency' | 'bonus-feat' | 'spellcasting' | 'damage-reduction' | 'class-skills' | 'alignment';

  /** What an archetype actually takes away, by mechanism. */
  function removals(a: C.ArchetypeDef, klass: C.ClassDef) {
    const prog = C.CLASS_PROGRESSION[klass.id];
    const featureName = new Map<string, string>();
    for (const f of prog.features) featureName.set(f.id, base(f.name));
    const choiceLabel = new Map<string, string>();
    for (const ch of [...(klass.choices ?? []), ...(prog.choices ?? [])]) choiceLabel.set(ch.id, base(ch.label));
    const mech = new Set<Mechanism>();
    if (a.proficiencies?.armor?.remove?.length || a.proficiencies?.weapons?.remove?.length) mech.add('proficiency');
    if (a.bonusFeatSlots?.remove?.length) mech.add('bonus-feat');
    if (a.spellcasting === null || a.spellcastingMod?.diminished) mech.add('spellcasting');
    // Either direction counts: the Invulnerable Rager swaps the standard progression for its own.
    if (a.damageReduction !== undefined) mech.add('damage-reduction');
    if (a.classSkills?.remove?.length) mech.add('class-skills');
    if (a.alignment !== undefined) mech.add('alignment');
    // A recurring pick trimmed to fewer levels counts as taking that level away.
    const removedChoices = new Set(a.choices?.remove ?? []);
    const readded = new Map<string, number[] | undefined>();
    for (const ch of a.choices?.add ?? []) readded.set(ch.id, ch.levels);
    return { featureName, choiceLabel, mech, removedChoices, readded };
  }

  /** Feature ids an archetype may hold in `replaces` without any grant naming them. */
  const UNCLAIMED_OK: Record<string, string[]> = {
    // Archaeologist's Luck replaces bardic performance wholesale; our model lists each performance
    // separately, so one claim stands for the whole family.
    'bard/archaeologist': ['bard-performance', 'bard-inspire-courage', 'bard-countersong', 'bard-inspire-competence',
      'bard-suggestion', 'bard-dirge-of-doom', 'bard-inspire-greatness', 'bard-soothing-performance',
      'bard-frightening-tune', 'bard-inspire-heroics', 'bard-mass-suggestion', 'bard-deadly-performance'],
    // Both give up spellcasting entirely; the feature line goes with the spells.
    'ranger/skirmisher': ['ranger-spells'],
    'ranger/trapper': ['ranger-spells'],
    'paladin/warrior-of-the-holy-light': ['paladin-spells'],
    // The Freebooter's bond is a different bond, stated on the bond grant rather than per feature.
    'ranger/freebooter': ['ranger-companion'],
    // Kensai's diminished casting and lost proficiencies are noted in the archetype comment.
    'magus/kensai': ['magus-greater-spell-access'],
  };

  it('every "Replaces …" claim names something the archetype actually removes', () => {
    // Only the dangerous direction is asserted: prose that says a whole feature is replaced while
    // the feature survives in the build. A claim naming one *level* of a recurring pick ("the
    // 3rd-level exploit") cannot be a whole-feature removal, so it is satisfied by any of the
    // partial mechanisms instead — a trimmed pick line, a dropped bonus-feat slot, or a suppressed
    // source power. Prose wording itself is not policed here.
    const bad: string[] = [];
    for (const klass of C.CLASSES) {
      const prog = C.CLASS_PROGRESSION[klass.id];
      for (const a of klass.archetypes ?? []) {
        const { featureName, choiceLabel, mech, removedChoices } = removals(a, klass);
        const replaces = new Set(a.replaces ?? []);
        const partial = removedChoices.size > 0 || (a.bonusFeatSlots?.remove?.length ?? 0) > 0
          || (a.suppressSourcePowers?.length ?? 0) > 0 || (a.conditionalSuppress?.length ?? 0) > 0;
        for (const grant of a.grants ?? []) {
          for (const m of grant.desc.matchAll(/(?:Replaces|replaces) ([^.]+)\./g)) {
            // "Replaces X and alters Y" — the alteration is not a removal, so stop at the verb.
            const scope = m[1].split(/\band alters\b|\balters\b|\bmodifies\b/)[0];
            for (const raw of scope.split(/,| and /)) {
              const phrase = base(raw);
              if (!phrase) continue;
              const perLevel = /\d+(st|nd|rd|th)|daily use/.test(raw);
              const nf = NON_FEATURE.find((x) => x.re.test(phrase));
              if (nf) {
                if (!mech.has(nf.kind as Mechanism) && !(perLevel && partial))
                  bad.push(`${klass.id}/${a.id}: "${raw.trim()}" is claimed replaced, but nothing removes it`);
                continue;
              }
              // An exact feature-name match is the strong case.
              const exact = [...featureName].find(([, n]) => n === phrase)?.[0];
              if (exact && !perLevel) {
                if (!replaces.has(exact))
                  bad.push(`${klass.id}/${a.id}: "${raw.trim()}" is claimed replaced, but ${exact} is not in \`replaces\``);
                continue;
              }
              const cid = [...choiceLabel].find(([, n]) => n === phrase)?.[0];
              if (cid) {
                if (!removedChoices.has(cid) && !partial)
                  bad.push(`${klass.id}/${a.id}: "${raw.trim()}" is claimed replaced, but the ${cid} pick survives`);
                continue;
              }
              // A loose feature match only counts when the archetype has no partial mechanism at
              // all — otherwise the claim is most likely about one level of a recurring pick.
              // The longest match wins, so "dodging panache" lands on the deed, not on Panache.
              const loose = [...featureName]
                .filter(([, n]) => n && (phrase.includes(n) || n.includes(phrase)))
                .sort((x, y) => y[1].length - x[1].length)[0]?.[0];
              if (loose && !perLevel && !partial && !replaces.has(loose))
                bad.push(`${klass.id}/${a.id}: "${raw.trim()}" is claimed replaced, but ${loose} is not in \`replaces\``);
            }
          }
        }
        void prog;
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every feature an archetype removes is accounted for in its prose', () => {
    // The other direction: a feature quietly dropped from the build with nothing saying why. Names
    // are compared as word sets, because a deed reads "Deed: Quick Clear" in the catalogue and
    // "the quick clear deed" in the prose.
    const words = (s: string) => new Set(base(s).split(' ').filter((w) => w.length > 2));
    // Either direction: a claim may name part of a combined feature ("Countersong / Distraction /
    // Fascinate") or wrap the name in extra words ("the deadeye deed").
    const covers = (claim: Set<string>, name: Set<string>) =>
      name.size > 0 && ([...name].every((w) => claim.has(w)) || [...claim].every((w) => name.has(w)));
    const bad: string[] = [];
    for (const klass of C.CLASSES) {
      const prog = C.CLASS_PROGRESSION[klass.id];
      for (const a of klass.archetypes ?? []) {
        const exempt = new Set(UNCLAIMED_OK[`${klass.id}/${a.id}`] ?? []);
        const claimed = new Set<string>();
        for (const grant of a.grants ?? [])
          for (const m of grant.desc.matchAll(/(?:Replaces|replaces|Alters|alters) ([^.]+)\./g))
            // One sentence can name several features ("Replaces trapfinding, poison lore and trap
            // sense"), so each part is matched on its own as well as the whole.
            for (const part of [m[1], ...m[1].split(/,| and /)]) {
              const claim = words(part);
              // A parenthetical in a feature name is part of the name here: the skald's
              // "Raging Song (Inspired Rage)" is what the prose calls inspired rage.
              for (const f of prog.features) if (covers(claim, words(f.name.replace(/[()]/g, ' ')))) claimed.add(f.id);
            }
        for (const fid of a.replaces ?? [])
          if (!claimed.has(fid) && !exempt.has(fid))
            bad.push(`${klass.id}/${a.id}: removes ${fid}, but no grant says what stands in its place`);
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('the swaps this audit corrected stay corrected', () => {
    const arch = (classId: string, id: string) =>
      C.CLASSES.find((c) => c.id === classId)!.archetypes!.find((a) => a.id === id)!;
    const replaces = (classId: string, id: string) => arch(classId, id).replaces ?? [];
    const grantIds = (classId: string, id: string) => (arch(classId, id).grants ?? []).map((g) => g.id);

    // A skirmisher has no spells, so the Spellcasting line goes with them.
    expect(replaces('ranger', 'skirmisher')).toContain('ranger-spells');
    // The Warrior of the Holy Light's 14th-level light replaces aura of faith.
    expect(replaces('paladin', 'warrior-of-the-holy-light')).toContain('paladin-aura-faith');
    expect(grantIds('paladin', 'warrior-of-the-holy-light')).toContain('wohl-shining-light');
    // The Divine Hunter redirects the bond to a ranged weapon and takes the 6th-level mercy.
    expect(arch('paladin', 'divine-hunter').choices?.remove).toEqual(['divine-bond', 'mercy']);
    expect(arch('paladin', 'divine-hunter').choices?.add?.[0].levels).toEqual([3, 9, 12, 15, 18]);
    expect(grantIds('paladin', 'divine-hunter')).toContain('dh-distant-mercy');
    // The Arcane Duelist's heavy armour replaces jack of all trades.
    expect(replaces('bard', 'arcane-duelist')).toContain('bard-jack-of-all-trades');
    // Escape Corruption's Grasp replaces discern lies.
    expect(replaces('inquisitor', 'abolisher')).toContain('inq-discern-lies');
    // The Storm Druid's Eyes of the Storm replaces resist nature's lure.
    expect(replaces('druid', 'storm-druid')).toContain('druid-resist-natures-lure');
    // The Gravewalker's poppet replaces the familiar, so the familiar pick goes.
    expect(arch('witch', 'gravewalker').choices?.remove).toContain('familiar');
    // The Sniper trades away only track — Deadly Range is a straight gain.
    expect(replaces('slayer', 'sniper')).toEqual(['slay-track']);
    expect(arch('slayer', 'sniper').choices).toBeUndefined();
    // Song of Questing takes the song of the fallen too.
    expect(replaces('skald', 'battle-scion')).toContain('skald-song-of-the-fallen');
    // The three shifter archetypes that replace greater chimeric aspect.
    for (const id of ['rageshaper', 'fiendflesh-shifter', 'verdant-shifter'])
      expect(replaces('shifter', id), id).toContain('shifter-greater-chimeric-aspect');
    // A companionless hunter loses everything the companion carried.
    for (const id of ['forester', 'feral-hunter'])
      for (const fid of ['hunter-improved-empathic-link', 'hunter-bonus-trick', 'hunter-raise-companion',
        'hunter-greater-empathic-link'])
        expect(replaces('hunter', id), `${id}/${fid}`).toContain(fid);
    // The Forester's published ability list, in level order.
    expect((arch('hunter', 'forester').grants ?? []).map((g) => `${g.level} ${g.name}`).sort()).toEqual([
      '1 Animal Focus (self only)', '10 Breath of Life', '11 Improved Evasion', '14 Hide in Plain Sight',
      '2 Bonus Feat', '3 Tactician', '4 Evasion', '5 Favored Terrain', '7 Camouflage',
    ].sort());
  });
});

describe('class progression, verified against every published class table', () => {
  // The Special column of each class's own table, read off Archives of Nethys (and d20pfsrd for the
  // Vampire Hunter and the gunslinger's deeds) on 2026-09-23. One string per class level, verbatim
  // apart from the em dash for an empty cell, which is dropped.
  const PUBLISHED: Record<string, string[]> = {
    fighter: ['Bonus feat', 'Bonus feat, bravery +1', 'Armor training 1', 'Bonus feat', 'Weapon training 1',
      'Bonus feat, bravery +2', 'Armor training 2', 'Bonus feat', 'Weapon training 2', 'Bonus feat, bravery +3',
      'Armor training 3', 'Bonus feat', 'Weapon training 3', 'Bonus feat, bravery +4', 'Armor training 4',
      'Bonus feat', 'Weapon training 4', 'Bonus feat, bravery +5', 'Armor mastery', 'Bonus feat, weapon mastery'],
    barbarian: ['Fast movement, rage', 'Rage power, uncanny dodge', 'Trap sense +1', 'Rage power',
      'Improved uncanny dodge', 'Rage power, trap sense +2', 'Damage reduction 1/-', 'Rage power', 'Trap sense +3',
      'Damage reduction 2/-, rage power', 'Greater rage', 'Rage power, trap sense +4', 'Damage reduction 3/-',
      'Indomitable will, rage power', 'Trap sense +5', 'Damage reduction 4/-, rage power', 'Tireless rage',
      'Rage power, trap sense +6', 'Damage reduction 5/-', 'Mighty rage, rage power'],
    bard: ['Bardic knowledge, bardic performance, cantrips, countersong, distraction, fascinate, inspire courage +1',
      'Versatile performance, well-versed', 'Inspire competence +2', '', 'Inspire courage +2, lore master 1/day',
      'Suggestion, versatile performance', 'Inspire competence +3', 'Dirge of doom', 'Inspire greatness',
      'Jack-of-all-trades, versatile performance', 'Inspire competence +4, inspire courage +3, lore master 2/day',
      'Soothing performance', '', 'Frightening tune, versatile performance', 'Inspire competence +5, inspire heroics',
      '', 'Inspire courage +4, lore master 3/day', 'Mass suggestion, versatile performance', 'Inspire competence +6',
      'Deadly performance'],
    cleric: ['Aura, channel energy 1d6, domains, orisons', '', 'Channel energy 2d6', '', 'Channel energy 3d6', '',
      'Channel energy 4d6', '', 'Channel energy 5d6', '', 'Channel energy 6d6', '', 'Channel energy 7d6', '',
      'Channel energy 8d6', '', 'Channel energy 9d6', '', 'Channel energy 10d6', ''],
    druid: ["Nature bond, nature sense, orisons, wild empathy", 'Woodland stride', 'Trackless step',
      "Resist nature's lure, wild shape (1/day)", '', 'Wild shape (2/day)', '', 'Wild shape (3/day)',
      'Venom immunity', 'Wild shape (4/day)', '', 'Wild shape (5/day)', 'A thousand faces', 'Wild shape (6/day)',
      'Timeless body', 'Wild shape (7/day)', '', 'Wild shape (8/day)', '', 'Wild shape (at will)'],
    monk: ['Bonus feat, flurry of blows, stunning fist, unarmed strike', 'Bonus feat, evasion',
      'Fast movement, maneuver training, still mind', 'Ki pool (magic), slow fall 20 ft.',
      'High jump, purity of body', 'Bonus feat, slow fall 30 ft.', 'Ki pool (cold iron/silver), wholeness of body',
      'Slow fall 40 ft.', 'Improved evasion', 'Bonus feat, ki pool (lawful), slow fall 50 ft.', 'Diamond body',
      'Abundant step, slow fall 60 ft.', 'Diamond soul', 'Bonus feat, slow fall 70 ft.', 'Quivering palm',
      'Ki pool (adamantine), slow fall 80 ft.', 'Timeless body, tongue of the sun and moon',
      'Bonus feat, slow fall 90 ft.', 'Empty body', 'Perfect self, slow fall any distance'],
    paladin: ['Aura of good, detect evil, smite evil 1/day', 'Divine grace, lay on hands',
      'Aura of courage, divine health, mercy', 'Channel positive energy, smite evil 2/day', 'Divine bond', 'Mercy',
      'Smite evil 3/day', 'Aura of resolve', 'Mercy', 'Smite evil 4/day', 'Aura of justice', 'Mercy',
      'Smite evil 5/day', 'Aura of faith', 'Mercy', 'Smite evil 6/day', 'Aura of righteousness', 'Mercy',
      'Smite evil 7/day', 'Holy champion'],
    ranger: ['1st favored enemy, track, wild empathy', 'Combat style feat', 'Endurance, 1st favored terrain',
      "Hunter's bond", '2nd favored enemy', 'Combat style feat', 'Woodland stride',
      'Swift tracker, 2nd favored terrain', 'Evasion', '3rd favored enemy, combat style feat', 'Quarry',
      'Camouflage', '3rd favored terrain', 'Combat style feat', '4th favored enemy', 'Improved evasion',
      'Hide in plain sight', '4th favored terrain, combat style feat', 'Improved quarry',
      '5th favored enemy, master hunter'],
    rogue: ['Sneak attack +1d6, trapfinding', 'Evasion, rogue talent', 'Sneak attack +2d6, trap sense +1',
      'Rogue talent, uncanny dodge', 'Sneak attack +3d6', 'Rogue talent, trap sense +2', 'Sneak attack +4d6',
      'Improved uncanny dodge, rogue talent', 'Sneak attack +5d6, trap sense +3', 'Advanced talents, rogue talent',
      'Sneak attack +6d6', 'Rogue talent, trap sense +4', 'Sneak attack +7d6', 'Rogue talent',
      'Sneak attack +8d6, trap sense +5', 'Rogue talent', 'Sneak attack +9d6', 'Rogue talent, trap sense +6',
      'Sneak attack +10d6', 'Master strike, rogue talent'],
    sorcerer: ['Bloodline power, cantrips, eschew materials', '', 'Bloodline power, bloodline spell', '',
      'Bloodline spell', '', 'Bloodline feat, bloodline spell', '', 'Bloodline power, bloodline spell', '',
      'Bloodline spell', '', 'Bloodline feat, bloodline spell', '', 'Bloodline power, bloodline spell', '',
      'Bloodline spell', '', 'Bloodline feat, bloodline spell', 'Bloodline power'],
    warpriest: ['Aura, blessings (minor), focus weapon, orisons, sacred weapon', 'Fervor 1d6', 'Bonus feat',
      'Channel energy, sacred weapon +1', 'Fervor 2d6', 'Bonus feat', 'Sacred armor +1',
      'Fervor 3d6, sacred weapon +2', 'Bonus feat', 'Blessings (major), sacred armor +2', 'Fervor 4d6',
      'Bonus feat, sacred weapon +3', 'Sacred armor +3', 'Fervor 5d6', 'Bonus feat',
      'Sacred armor +4, sacred weapon +4', 'Fervor 6d6', 'Bonus feat', 'Sacred armor +5',
      'Aspect of war, fervor 7d6, sacred weapon +5'],
    wizard: ['Arcane bond, arcane school, cantrips, Scribe Scroll', '', '', '', 'Bonus feat', '', '', '', '',
      'Bonus feat', '', '', '', '', 'Bonus feat', '', '', '', '', 'Bonus feat'],
    alchemist: ['Alchemy, bomb 1d6, Brew Potion, mutagen, Throw Anything',
      'Discovery, poison resistance +2, poison use', 'Bomb 2d6, swift alchemy', 'Discovery',
      'Bomb 3d6, poison resistance +4', 'Discovery, swift poisoning', 'Bomb 4d6',
      'Discovery, poison resistance +6', 'Bomb 5d6', 'Discovery, poison immunity', 'Bomb 6d6', 'Discovery',
      'Bomb 7d6', 'Discovery, persistent mutagen', 'Bomb 8d6', 'Discovery', 'Bomb 9d6',
      'Discovery, instant alchemy', 'Bomb 10d6', 'Grand discovery'],
    cavalier: ['Challenge 1/day, mount, order, tactician', 'Order ability', "Cavalier's charge",
      'Challenge 2/day, expert trainer', 'Banner', 'Bonus feat', 'Challenge 3/day', 'Order ability',
      'Greater tactician', 'Challenge 4/day', 'Mighty charge', 'Bonus feat, demanding challenge',
      'Challenge 5/day', 'Greater banner', 'Order ability', 'Challenge 6/day', 'Master tactician', 'Bonus feat',
      'Challenge 7/day', 'Supreme charge'],
    gunslinger: ['Deeds, grit, gunsmith', 'Nimble +1', 'Deeds', 'Bonus feat', 'Gun training 1', 'Nimble +2',
      'Deeds', 'Bonus feat', 'Gun training 2', 'Nimble +3', 'Deeds', 'Bonus feat', 'Gun training 3', 'Nimble +4',
      'Deeds', 'Bonus feat', 'Gun training 4', 'Nimble +5', 'Deeds', 'Bonus feat, true grit'],
    inquisitor: ['Domain, judgment 1/day, monster lore, orisons, stern gaze',
      'Cunning initiative, detect alignment, track', 'Solo tactics, teamwork feat', 'Judgment 2/day',
      'Bane, discern lies', 'Teamwork feat', 'Judgment 3/day', 'Second judgment', 'Teamwork feat',
      'Judgment 4/day', 'Stalwart', 'Greater bane, teamwork feat', 'Judgment 5/day', 'Exploit weakness',
      'Teamwork feat', 'Judgment 6/day, third judgment', 'Slayer', 'Teamwork feat', 'Judgment 7/day',
      'True judgment'],
    magus: ['Arcane pool, cantrips, spell combat', 'Spellstrike', 'Magus arcana', 'Spell recall', 'Bonus feat',
      'Magus arcana', 'Knowledge pool, medium armor', 'Improved spell combat', 'Magus arcana',
      'Fighter training', 'Bonus feat, improved spell recall', 'Magus arcana', 'Heavy armor',
      'Greater spell combat', 'Magus arcana', 'Counterstrike', 'Bonus feat', 'Magus arcana',
      'Greater spell access', 'True magus'],
    oracle: ["Mystery, oracle's curse, orisons, revelation", 'Mystery spell', 'Revelation', 'Mystery spell', '',
      'Mystery spell', 'Revelation', 'Mystery spell', '', 'Mystery spell', 'Revelation', 'Mystery spell', '',
      'Mystery spell', 'Revelation', 'Mystery spell', '', 'Mystery spell', 'Revelation', 'Final revelation'],
    shifter: ['Shifter aspect, shifter claws, wild empathy', 'Defensive instinct, track',
      'Shifter claws increase, woodland stride', 'Defensive instinct (+1), wild shape',
      'Second aspect, trackless step', "Shifter's fury", 'Shifter claws increase', 'Defensive instinct (+2)',
      'Chimeric aspect', 'Third aspect', 'Shifter claws increase', 'Defensive instinct (+3)',
      'Shifter claws increase', 'Greater chimeric aspect', 'Fourth aspect', 'Defensive instinct (+4)',
      'Shifter claws increase', 'A thousand faces, timeless body', 'Shifter claws increase',
      'Defensive instinct (+5), final aspect'],
    summoner: ['Cantrips, eidolon, life link, summon monster I', 'Bond senses', 'Summon monster II',
      'Shield ally', 'Summon monster III', "Maker's call", 'Summon monster IV', 'Transposition',
      'Summon monster V', 'Aspect', 'Summon monster VI', 'Greater shield ally', 'Summon monster VII',
      'Life bond', 'Summon monster VIII', 'Merge forms', 'Summon monster IX', 'Greater aspect', 'Gate',
      'Twin eidolon'],
    witch: ["Cantrips, hex, witch's familiar", 'Hex', '', 'Hex', '', 'Hex', '', 'Hex', '', 'Hex, major hex', '',
      'Hex', '', 'Hex', '', 'Hex', '', 'Hex, grand hex', '', 'Hex'],
    'vampire-hunter': ['Detect undead, technique feat, track, vampiric focus', 'Relentless', 'Technique feat',
      'Spellcasting, stake', 'Relentless band', 'Technique feat', 'Vampire tracker', 'Second vampiric focus',
      'Technique feat', 'Swift tracker', 'Vampire bane', 'Technique feat', 'Remove vampirism', 'Quarry',
      'Technique feat', 'Third vampiric focus', 'Critical reflexes', 'Technique feat', 'Improved quarry',
      'Master vampire hunter'],
    arcanist: ['Arcane reservoir, arcanist exploit, cantrips, consume spells', '', 'Arcanist exploit', '',
      'Arcanist exploit', '', 'Arcanist exploit', '', 'Arcanist exploit', '',
      'Arcanist exploit, greater exploits', '', 'Arcanist exploit', '', 'Arcanist exploit', '',
      'Arcanist exploit', '', 'Arcanist exploit', 'Magical supremacy'],
    bloodrager: ['Bloodline, bloodline power, bloodrage, fast movement', 'Uncanny dodge', 'Blood sanctuary',
      'Blood casting, bloodline power, eschew materials', 'Improved uncanny dodge', 'Bloodline feat',
      'Bloodline spell, damage reduction 1/-', 'Bloodline power', 'Bloodline feat',
      'Bloodline spell, damage reduction 2/-', 'Greater bloodrage', 'Bloodline feat, bloodline power',
      'Bloodline spell, damage reduction 3/-', 'Indomitable will', 'Bloodline feat',
      'Bloodline spell, bloodline power, damage reduction 4/-', 'Tireless bloodrage', 'Bloodline feat',
      'Damage reduction 5/-', 'Bloodline power, mighty bloodrage'],
    brawler: ["Brawler's cunning, martial flexibility, martial training, unarmed strike",
      "Bonus combat feat, brawler's flurry (Two-Weapon Fighting)", 'Maneuver training 1',
      'AC bonus +1, knockout 1/day', "Bonus combat feat, brawler's strike (magic), close weapon mastery",
      'Martial flexibility (swift action)', 'Maneuver training 2',
      "Bonus combat feat, brawler's flurry (Improved Two-Weapon Fighting)",
      "AC bonus +2, brawler's strike (cold iron and silver)",
      'Martial flexibility (free action), knockout 2/day', 'Bonus combat feat, maneuver training 3',
      "Brawler's strike (alignment), martial flexibility (immediate action)", 'AC bonus +3',
      'Bonus combat feat', "Brawler's flurry (Greater Two-Weapon Fighting), maneuver training 4",
      'Awesome blow, knockout 3/day', "Bonus combat feat, brawler's strike (adamantine)", 'AC bonus +4',
      'Maneuver training 5', 'Bonus combat feat, improved awesome blow, martial flexibility (any number)'],
    hunter: ['Animal companion, animal focus, nature training, orisons, wild empathy',
      'Precise companion, track', 'Hunter tactics, teamwork feat', 'Improved empathic link', 'Woodland stride',
      'Teamwork feat', 'Bonus trick', 'Second animal focus, swift tracker', 'Teamwork feat',
      'Raise animal companion', 'Speak with master', 'Teamwork feat', 'Bonus trick', 'Greater empathic link',
      'Teamwork feat', '', 'One with the wild', 'Teamwork feat', 'Bonus trick', 'Master hunter'],
    investigator: ['Alchemy, inspiration, trapfinding', 'Poison lore, poison resistance +2',
      'Investigator talent, keen recollection, trap sense +1',
      'Studied combat, studied strike +1d6, swift alchemy', 'Investigator talent, poison resistance +4',
      'Studied strike +2d6, trap sense +2', 'Investigator talent',
      'Poison resistance +6, studied strike +3d6', 'Investigator talent, trap sense +3',
      'Studied strike +4d6', 'Investigator talent, poison immunity', 'Studied strike +5d6, trap sense +4',
      'Investigator talent', 'Studied strike +6d6', 'Investigator talent, trap sense +5',
      'Studied strike +7d6', 'Investigator talent', 'Studied strike +8d6, trap sense +6',
      'Investigator talent', 'Studied strike +9d6, true inspiration'],
    shaman: ['Orisons, spirit, spirit animal, spirit magic', 'Hex', '', 'Hex, wandering spirit', '',
      'Wandering hex', '', 'Hex, spirit (greater)', '', 'Hex', '', 'Hex, wandering spirit (greater)', '',
      'Wandering hex (2 hexes)', '', 'Hex, spirit (true)', '', 'Hex', '',
      'Hex, manifestation, wandering spirit (true)'],
    skald: ['Bardic knowledge, cantrips, inspired rage +1, raging song, scribe scroll',
      'Versatile performance, well-versed', 'Rage power, song of marching',
      'Inspired rage +2, uncanny dodge', 'Spell kenning 1/day', 'Rage power, song of strength',
      'Lore master 1/day, versatile performance', 'Improved uncanny dodge, inspired rage +3',
      'Rage power, DR 1/-', 'Dirge of doom', 'Spell kenning 2/day',
      'Inspired rage +4, rage power, versatile performance', 'Lore master 2/day',
      'DR 2/-, song of the fallen', 'Rage power', 'Inspired rage +5',
      'Spell kenning 3/day, versatile performance', 'Rage power', 'DR 3/-, lore master 3/day',
      'Inspired rage +6, master skald'],
    slayer: ['1st studied target, track', 'Slayer talent', 'Sneak attack +1d6', 'Slayer talent',
      '2nd studied target', 'Slayer talent, sneak attack +2d6', 'Stalker', 'Slayer talent',
      'Sneak attack +3d6', '3rd studied target, advanced talents, slayer talent', 'Swift tracker',
      'Slayer talent, sneak attack +4d6', "Slayer's advance 1/day", 'Quarry, slayer talent',
      '4th studied target, sneak attack +5d6', 'Slayer talent', "Slayer's advance 2/day",
      'Slayer talent, sneak attack +6d6', 'Improved quarry',
      '5th studied target, master slayer, slayer talent'],
    swashbuckler: ['Deeds, panache, swashbuckler finesse', 'Charmed life 3/day', 'Deeds, nimble +1',
      'Bonus feat', 'Swashbuckler weapon training +1', 'Charmed life 4/day', 'Deeds, nimble +2', 'Bonus feat',
      'Swashbuckler weapon training +2', 'Charmed life 5/day', 'Deeds, nimble +3', 'Bonus feat',
      'Swashbuckler weapon training +3', 'Charmed life 6/day', 'Deeds, nimble +4', 'Bonus feat',
      'Swashbuckler weapon training +4', 'Charmed life 7/day', 'Deeds, nimble +5',
      'Bonus feat, swashbuckler weapon mastery'],
  };

  /** Published entries the progression deliberately does not hold as their own feature, and why.
   *  Every one of these is either owned by another part of the engine (spell progression), folded
   *  into a named feature's description, or expanded into finer-grained features of our own. */
  const FOLDED: Record<string, Record<string, string>> = {
    cleric: { 'channel energy': 'cleric-channel' },
    // One feature covers the three 1st-level performances the table lists separately.
    bard: { countersong: 'bard-countersong', distraction: 'bard-countersong', fascinate: 'bard-countersong' },
    paladin: { 'aura of good': 'paladin-aura', 'detect evil': 'paladin-aura' },
    // A source choice (bloodline, order, mystery, spirit) carries its own per-level powers, and the
    // feature that names the choice states the levels they arrive at.
    sorcerer: { 'bloodline power': 'sorc-bloodline' },
    bloodrager: {
      'bloodline power': 'br-bloodline', 'bloodline spell': 'br-bloodline',
      'blood casting': 'br-blood-casting', 'eschew materials': 'br-blood-casting',
    },
    cavalier: { 'order ability': 'cav-order' },
    oracle: { 'mystery spell': 'oracle-mystery', 'final revelation': 'oracle-mystery' },
    shaman: { manifestation: 'shaman-spirit-feature', 'spirit magic': 'shaman-spirit-feature' },
    skald: { 'inspired rage': 'skald-raging-song' },
    investigator: {
      'poison lore': 'inv-poison-lore', 'poison immunity': 'inv-poison-lore',
      'poison resistance': 'inv-poison-lore',
    },
    alchemist: { 'poison immunity': 'alch-poison-resistance', 'poison resistance': 'alch-poison-resistance' },
    arcanist: { 'greater exploits': 'arc-exploit' },
    hunter: { 'second animal focus': 'hunter-animal-focus' },
    shifter: {
      'second aspect': 'shifter-aspect-extra', 'third aspect': 'shifter-aspect-extra',
      'fourth aspect': 'shifter-aspect-extra',
    },
    summoner: { 'summon monster': 'summ-summon-monster' },
    // Ours splits the published "Deeds" line into one feature per deed, so archetypes can swap a
    // single deed; the deed ids themselves are pinned in the test below.
    gunslinger: { deeds: 'gun-deed-deadeye' },
    swashbuckler: { deeds: 'swb-deed-derring-do' },
    // A pick line rather than a feature: the second talent series opens at 10th, when the advanced
    // list unlocks, which is exactly what the published "Advanced talents" entry means.
    rogue: { 'advanced talents': 'rogue-adv-talent' },
    slayer: { 'advanced talents': 'slayer-adv-talent' },
  };

  /** Split a Special cell on commas outside parentheses. */
  const items = (cell: string): string[] => {
    const out: string[] = [];
    let depth = 0, cur = '';
    for (const ch of cell) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
    return out.map((x) => x.trim()).filter(Boolean);
  };

  /** Collapse a rank marker so every step of a scaling ability normalises to one name. */
  const base = (s: string): string =>
    s.toLowerCase().replace(/’/g, "'")
      .replace(/\([^)]*\)/g, ' ')
      .replace(/^\d+(st|nd|rd|th)\s+/, '')
      .replace(/\+?\d+d\d+/g, ' ')
      .replace(/\+\d+/g, ' ')
      .replace(/\b\d+\s*\/\s*(day|-)/g, ' ')
      .replace(/\b\d+\s*ft\.?/g, ' ')
      .replace(/\bany distance\b|\bat will\b|\bincrease\b/g, ' ')
      .replace(/\b\d+\b/g, ' ')
      .replace(/[^a-z' ]/g, ' ')
      .replace(/\s(i{1,3}|iv|vi{0,3}|ix|xi{0,2})$/, '')   // "summon monster ix" -> "summon monster"
      .replace(/\s+/g, ' ')
      .trim();

  // Spell progression columns the engine owns; never a leveled feature.
  const OWNED_ELSEWHERE = new Set(['cantrips', 'orisons', 'spells', 'spellcasting']);

  it('every class has a progression, and every published table is pinned here', () => {
    const withProgression = Object.keys(C.CLASS_PROGRESSION).sort();
    expect(C.CLASSES.map((c) => c.id).sort()).toEqual(withProgression);
    expect(Object.keys(PUBLISHED).sort()).toEqual(withProgression);
    for (const [id, rows] of Object.entries(PUBLISHED)) expect(rows, `${id}: not 20 rows`).toHaveLength(20);
  });

  it('every published ability appears at the level it is first published at', () => {
    const bad: string[] = [];
    for (const [classId, rows] of Object.entries(PUBLISHED)) {
      const prog = C.CLASS_PROGRESSION[classId];
      // What our data offers at each level: features, per-level picks, bonus feats, DR steps.
      const oursAt = new Map<string, number>();
      const note = (name: string, level: number) => {
        const b = base(name);
        if (!oursAt.has(b) || oursAt.get(b)! > level) oursAt.set(b, level);
      };
      for (const f of prog.features) note(f.name, f.level);
      for (const ch of prog.choices ?? []) for (const l of ch.levels ?? [1]) note(ch.label, l);
      if (prog.bonusFeats) for (const l of prog.bonusFeats.levels) {
        note('bonus feat', l);
        // The table names the track after the class: "Combat style feat", "Technique feat".
        if (prog.bonusFeats.label) note(prog.bonusFeats.label, l);
        // A combat-only track is printed as "Bonus combat feat" by the newer classes.
        if (prog.bonusFeats.combatOnly) note('bonus combat feat', l);
      }
      if (prog.damageReduction) for (const l of prog.damageReduction.levels) {
        note('damage reduction', l);
        note('dr', l);   // the skald's table abbreviates it
      }

      const folded = FOLDED[classId] ?? {};
      const firstPublished = new Map<string, number>();
      rows.forEach((cell, i) => {
        for (const entry of items(cell)) {
          const b = base(entry);
          if (!firstPublished.has(b)) firstPublished.set(b, i + 1);
        }
      });
      for (const [name, level] of firstPublished) {
        if (OWNED_ELSEWHERE.has(name)) continue;
        if (name in folded) continue;
        const ours = oursAt.get(name);
        if (ours === undefined) bad.push(`${classId}: "${name}" (published at ${level}) is absent`);
        else if (ours !== level) bad.push(`${classId}: "${name}" published at ${level}, ours at ${ours}`);
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every folded entry names a feature or pick line that actually exists', () => {
    const bad: string[] = [];
    for (const [classId, folded] of Object.entries(FOLDED)) {
      const prog = C.CLASS_PROGRESSION[classId];
      const ids = new Set([...prog.features.map((f) => f.id), ...(prog.choices ?? []).map((c) => c.id)]);
      for (const [entry, target] of Object.entries(folded))
        if (!ids.has(target)) bad.push(`${classId}: "${entry}" folds into "${target}", which does not exist`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every repeated pick falls on exactly the published levels', () => {
    // A per-level pick is machine-consumed — the engine emits one slot per level — so unlike a
    // scaling feature these must match level for level.
    const EXPECTED: Record<string, Record<string, number[]>> = {
      barbarian: { 'rage-power': [2, 4, 6, 8, 10, 12, 14, 16, 18, 20] },
      fighter: { bonusFeats: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20] },
      monk: { bonusFeats: [1, 2, 6, 10, 14, 18] },
      rogue: { 'rogue-talent': [2, 4, 6, 8], 'rogue-adv-talent': [10, 12, 14, 16, 18, 20] },
      ranger: { bonusFeats: [2, 6, 10, 14, 18] },
      paladin: { 'divine-bond': [5], mercy: [3, 6, 9, 12, 15, 18] },
      wizard: { bonusFeats: [5, 10, 15, 20] },
      alchemist: { discovery: [2, 4, 6, 8, 10, 12, 14, 16, 18], 'grand-discovery': [20] },
      cavalier: { bonusFeats: [6, 12, 18] },
      gunslinger: { bonusFeats: [4, 8, 12, 16, 20] },
      inquisitor: { bonusFeats: [3, 6, 9, 12, 15, 18] },
      magus: { bonusFeats: [5, 11, 17], 'magus-arcana': [3, 6, 9, 12, 15, 18] },
      oracle: { revelation: [1, 3, 7, 11, 15, 19] },
      witch: { hex: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20] },
      warpriest: { bonusFeats: [3, 6, 9, 12, 15, 18] },
      arcanist: { exploit: [3, 5, 7, 9, 11, 13, 15, 17, 19] },
      bloodrager: { bonusFeats: [6, 9, 12, 15, 18] },
      brawler: { bonusFeats: [2, 5, 8, 11, 14, 17, 20] },
      slayer: { 'slayer-talent': [2, 4, 6, 8], 'slayer-adv-talent': [10, 12, 14, 16, 18, 20] },
      swashbuckler: { bonusFeats: [4, 8, 12, 16, 20] },
      investigator: { 'investigator-talent': [3, 5, 7, 9, 11, 13, 15, 17, 19] },
      hunter: { bonusFeats: [3, 6, 9, 12, 15, 18] },
      shaman: { 'shaman-hex': [2, 4, 8, 10, 12, 16, 18, 20] },
      skald: { 'skald-rage-power': [3, 6, 9, 12, 15, 18] },
      shifter: { 'shifter-aspect-extra': [5, 10, 15, 20] },
      'vampire-hunter': { bonusFeats: [1, 3, 6, 9, 12, 15, 18] },
    };
    const bad: string[] = [];
    for (const [classId, expected] of Object.entries(EXPECTED)) {
      const prog = C.CLASS_PROGRESSION[classId];
      for (const [key, levels] of Object.entries(expected)) {
        const got = key === 'bonusFeats'
          ? prog.bonusFeats?.levels
          : (prog.choices ?? []).find((c) => c.id === key)?.levels;
        if (!got) { bad.push(`${classId}: no "${key}"`); continue; }
        if ([...got].join(',') !== levels.join(',')) bad.push(`${classId}/${key}: ${got.join(',')} vs published ${levels.join(',')}`);
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
    // Damage reduction: the amount is how many listed levels you have reached.
    expect(C.CLASS_PROGRESSION.barbarian.damageReduction?.levels).toEqual([7, 10, 13, 16, 19]);
    expect(C.CLASS_PROGRESSION.bloodrager.damageReduction?.levels).toEqual([7, 10, 13, 16, 19]);
    expect(C.CLASS_PROGRESSION.skald.damageReduction?.levels).toEqual([9, 14, 19]);
  });

  it('the gunslinger and swashbuckler deeds are the published sets, at the published levels', () => {
    const deedsOf = (classId: string, prefix: string) => C.CLASS_PROGRESSION[classId].features
      .filter((f) => f.id.startsWith(prefix))
      .map((f) => `${f.level} ${f.name.replace(/^Deed: /, '')}`)
      .sort();
    // Ultimate Combat, read off the gunslinger's own page: three deeds at each of 1/3/7/11/15/19.
    expect(deedsOf('gunslinger', 'gun-deed-')).toEqual([
      '1 Deadeye', "1 Gunslinger's Dodge", '1 Quick Clear',
      '11 Bleeding Wound', '11 Expert Loading', '11 Lightning Reload',
      '15 Evasive', '15 Menacing Shot', "15 Slinger's Luck",
      '19 Cheat Death', "19 Death's Shot", '19 Stunning Shot',
      '3 Gunslinger Initiative', '3 Pistol-Whip', '3 Utility Shot',
      '7 Dead Shot', '7 Startling Shot', '7 Targeting',
    ].sort());
    // Advanced Class Guide. The swashbuckler gains four deeds at 3rd and three at each other level.
    expect(deedsOf('swashbuckler', 'swb-deed-')).toEqual([
      '1 Derring-Do', '1 Dodging Panache', '1 Opportune Parry and Riposte',
      '11 Bleeding Wound', '11 Evasive', '11 Subtle Blade',
      '15 Dizzying Defense', '15 Perfect Thrust', '15 Swashbuckler’s Edge',
      '19 Cheat Death', '19 Deadly Stab', '19 Stunning Stab',
      '3 Kip-Up', '3 Menacing Swordplay', '3 Precise Strike', '3 Swashbuckler Initiative',
      '7 Superior Feint', '7 Swashbuckler’s Grace', '7 Targeted Strike',
    ].sort());
  });

  it('the features this audit added stay present', () => {
    const has = (classId: string, id: string, level: number) => {
      const f = C.CLASS_PROGRESSION[classId].features.find((x) => x.id === id);
      expect(f, `${classId}/${id} is missing`).toBeTruthy();
      expect(f!.level, `${classId}/${id} level`).toBe(level);
    };
    // The hunter was missing five published features outright.
    has('hunter', 'hunter-track', 2);
    has('hunter', 'hunter-improved-empathic-link', 4);
    has('hunter', 'hunter-bonus-trick', 7);
    has('hunter', 'hunter-raise-companion', 10);
    has('hunter', 'hunter-greater-empathic-link', 14);
    // Three of the skald's four songs.
    has('skald', 'skald-song-of-marching', 3);
    has('skald', 'skald-song-of-strength', 6);
    has('skald', 'skald-song-of-the-fallen', 14);
    // The shifter's 14th- and 18th-level features.
    has('shifter', 'shifter-greater-chimeric-aspect', 14);
    has('shifter', 'shifter-timeless-body', 18);
    // The cleric's aura, which our own warpriest already had.
    has('cleric', 'cleric-aura', 1);
    // "Slinger's Reload" was invented; the published deed is Slinger's Luck, a reroll.
    expect(C.CLASS_PROGRESSION.gunslinger.features.map((f) => f.id)).not.toContain('gun-deed-slingers-reload');
    has('gunslinger', 'gun-deed-slingers-luck', 15);
  });

  it('no two features in a class share an id, and every level is 1–20', () => {
    const bad: string[] = [];
    for (const [classId, prog] of Object.entries(C.CLASS_PROGRESSION)) {
      const seen = new Set<string>();
      for (const f of prog.features) {
        if (seen.has(f.id)) bad.push(`${classId}: duplicate feature id ${f.id}`);
        seen.add(f.id);
        if (f.level < 1 || f.level > 20) bad.push(`${classId}/${f.id}: level ${f.level}`);
      }
      for (const ch of prog.choices ?? [])
        for (const l of ch.levels ?? [])
          if (l < 1 || l > 20) bad.push(`${classId}/${ch.id}: level ${l}`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });
});

describe('companions, verified against the published tables and stat blocks', () => {
  // Read off d20pfsrd (Animal Companions, Eidolons, Familiars, Wild Caller) and Archives of Nethys
  // (the eidolon base forms, whose values d20pfsrd has lost for the aquatic form, and the Bestiary
  // stat blocks behind the familiars) on 2026-09-22.

  it('Table: Animal Companion Base Statistics matches all twenty published rows', () => {
    // hd bab fort ref will skills feats natural-armor str/dex tricks
    const P = [
      '2 1 3 3 0 2 1 0 0 1', '3 2 3 3 1 3 2 0 0 1', '3 2 3 3 1 3 2 2 1 2', '4 3 4 4 1 4 2 2 1 2',
      '5 3 4 4 1 5 3 2 1 2', '6 4 5 5 2 6 3 4 2 3', '6 4 5 5 2 6 3 4 2 3', '7 5 5 5 2 7 4 4 2 3',
      '8 6 6 6 2 8 4 6 3 4', '9 6 6 6 3 9 5 6 3 4', '9 6 6 6 3 9 5 6 3 4', '10 7 7 7 3 10 5 8 4 5',
      '11 8 7 7 3 11 6 8 4 5', '12 9 8 8 4 12 6 8 4 5', '12 9 8 8 4 12 6 10 5 6', '13 9 8 8 4 13 7 10 5 6',
      '14 10 9 9 4 14 7 10 5 6', '15 11 9 9 5 15 8 12 6 7', '15 11 9 9 5 15 8 12 6 7', '16 12 10 10 5 16 8 12 6 7',
    ];
    const got = C.ANIMAL_COMPANION_TABLE.map((r) =>
      [r.hd, r.bab, r.fort, r.ref, r.will, r.skills, r.feats, r.naturalArmor, r.strDex, r.tricks].join(' '));
    expect(got).toEqual(P);
    // The special column: ability increases at 4/9/14/20, Multiattack at 9th — not the eidolon's levels.
    const at = (s: string) => C.ANIMAL_COMPANION_TABLE.flatMap((r, i) => (r.special.includes(s) ? [i + 1] : []));
    expect(at('Ability score increase')).toEqual([4, 9, 14, 20]);
    expect(at('Multiattack')).toEqual([9]);
    expect(at('Evasion')).toEqual([3]);
    expect(at('Devotion')).toEqual([6]);
    expect(at('Improved evasion')).toEqual([15]);
  });

  it('Table: Eidolon Base Statistics matches all twenty published rows', () => {
    // hd bab good-save poor-save skills feats armor str/dex pool max-attacks
    const P = [
      '1 1 2 0 4 1 0 0 3 3', '2 2 3 0 8 1 2 1 4 3', '3 3 3 1 12 2 2 1 5 3', '3 3 3 1 12 2 2 1 7 4',
      '4 4 4 1 16 2 4 2 8 4', '5 5 4 1 20 3 4 2 9 4', '6 6 5 2 24 3 6 3 10 4', '6 6 5 2 24 3 6 3 11 4',
      '7 7 5 2 28 4 6 3 13 5', '8 8 6 2 32 4 8 4 14 5', '9 9 6 3 36 5 8 4 15 5', '9 9 6 3 36 5 10 5 16 5',
      '10 10 7 3 40 5 10 5 17 5', '11 11 7 3 44 6 10 5 19 6', '12 12 8 4 48 6 12 6 20 6',
      '12 12 8 4 48 6 12 6 21 6', '13 13 8 4 52 7 14 7 22 6', '14 14 9 4 56 7 14 7 23 6',
      '15 15 9 5 60 8 14 7 25 7', '15 15 9 5 60 8 16 8 26 7',
    ];
    const got = C.EIDOLON_TABLE.map((r) =>
      [r.hd, r.bab, r.goodSave, r.poorSave, r.skills, r.feats, r.armor, r.strDex, r.pool, r.maxAttacks].join(' '));
    expect(got).toEqual(P);
    // The eidolon's milestones sit a level earlier than the animal companion's at every step.
    const at = (s: string) => C.EIDOLON_TABLE.flatMap((r, i) => (r.special.includes(s) ? [i + 1] : []));
    expect(at('Ability score increase')).toEqual([5, 10, 15]);
    expect(at('Multiattack')).toEqual([9]);
    expect(at('Evasion')).toEqual([2]);
    expect(at('Devotion')).toEqual([6]);
    expect(at('Improved evasion')).toEqual([14]);
  });

  it('Table: Familiars matches the published natural armour, Intelligence and abilities', () => {
    expect(C.FAMILIAR_TABLE.map((r) => `${r.naturalArmor}/${r.int}`)).toEqual([
      '1/6', '1/6', '2/7', '2/7', '3/8', '3/8', '4/9', '4/9', '5/10', '5/10',
      '6/11', '6/11', '7/12', '7/12', '8/13', '8/13', '9/14', '9/14', '10/15', '10/15',
    ]);
    // The printed table grants abilities on odd levels only, and each is gained once.
    const at = (s: string) => C.FAMILIAR_TABLE.flatMap((r, i) => (r.special.includes(s) ? [i + 1] : []));
    expect(at('Alertness')).toEqual([1]);
    expect(at('Improved evasion')).toEqual([1]);
    expect(at('Share spells')).toEqual([1]);
    expect(at('Empathic link')).toEqual([1]);
    expect(at('Deliver touch spells')).toEqual([3]);
    expect(at('Speak with master')).toEqual([5]);
    expect(at('Speak with animals of its kind')).toEqual([7]);
    expect(at('Spell resistance')).toEqual([11]);
    expect(at('Scry on familiar')).toEqual([13]);
  });

  it('every animal companion has its published size, natural armour, abilities and advancement level', () => {
    // id -> "start-size natural-armor str/dex/con/int/wis/cha | advancement-level advanced-size"
    const P: Record<string, string> = {
      ape: 'medium 1 13/17/10/2/12/7 | 4 large',
      badger: 'small 2 10/17/15/2/12/10 | 4 medium',
      bear: 'small 2 15/15/13/2/12/6 | 4 medium',
      bird: 'small 1 10/15/12/2/14/6 | 4 -',
      boar: 'small 6 13/12/15/2/13/4 | 4 medium',
      camel: 'large 1 18/16/14/2/11/4 | 4 -',
      'cat-big': 'medium 1 13/17/13/2/15/10 | 7 large',
      'cat-small': 'small 1 12/21/13/2/12/6 | 4 medium',
      crocodile: 'small 4 15/14/15/1/12/2 | 4 medium',
      deinonychus: 'small 1 11/17/17/2/12/14 | 7 medium',
      dog: 'small 2 13/17/15/2/12/6 | 4 medium',
      horse: 'large 4 16/13/15/2/12/6 | 4 -',
      pony: 'medium 2 13/13/12/2/11/4 | 4 -',
      shark: 'small 4 13/15/15/1/12/2 | 4 medium',
      'snake-constrictor': 'medium 2 15/17/13/1/12/2 | 4 large',
      'snake-viper': 'small 2 8/17/11/1/12/2 | 4 medium',
      wolf: 'medium 2 13/15/15/2/12/6 | 7 large',
      aurochs: 'medium 1 14/12/12/2/11/4 | 7 large',
      'bat-dire': 'medium 0 9/17/9/2/14/6 | 7 large',
      'bear-grizzly': 'medium 1 17/13/13/2/13/6 | 7 large',
      'beetle-giant': 'small 6 13/12/13/1/11/4 | 4 medium',
      'centipede-giant': 'small 2 8/17/11/1/10/2 | 4 medium',
      'crab-giant': 'small 5 13/14/13/1/11/4 | 4 medium',
      dolphin: 'medium 1 12/15/13/2/12/6 | 4 -',
      elephant: 'medium 4 14/14/13/2/13/7 | 7 large',
      elk: 'medium 1 12/17/14/2/15/5 | 7 large',
      'frog-giant': 'medium 1 15/13/16/1/9/6 | 4 -',
      hyena: 'small 2 10/17/13/2/13/6 | 4 medium',
      'monitor-lizard': 'small 1 13/17/12/2/12/6 | 7 medium',
      octopus: 'small 1 12/17/14/2/12/3 | 4 -',
      pteranodon: 'medium 0 8/21/10/2/14/12 | 7 large',
      rhinoceros: 'medium 4 14/14/15/2/13/5 | 7 large',
      roc: 'medium 5 12/19/9/2/13/11 | 7 large',
      'saber-toothed-cat': 'medium 1 15/15/13/2/13/8 | 7 large',
      'scorpion-giant': 'medium 1 11/12/12/1/10/2 | 7 large',
      'snapping-turtle': 'medium 10 8/10/9/1/13/6 | 7 large',
      'spider-giant': 'small 0 6/17/10/1/10/2 | 4 medium',
      stag: 'small 0 10/19/14/2/15/8 | 4 medium',
      stegosaurus: 'medium 6 10/18/10/2/12/10 | 7 large',
      triceratops: 'medium 6 10/13/11/2/12/7 | 7 large',
      tyrannosaurus: 'medium 4 14/16/10/2/15/10 | 7 large',
      velociraptor: 'small 1 11/17/17/2/12/14 | 7 medium',
    };
    const line = (c: (typeof C.ANIMAL_COMPANIONS)[number]) => {
      const a = c.start.abilities;
      const adv = c.advance!;
      return `${c.start.size} ${c.start.naturalArmor} ${a.str}/${a.dex}/${a.con}/${a.int}/${a.wis}/${a.cha}`
        + ` | ${adv.level} ${adv.size ?? '-'}`;
    };
    expect(C.ANIMAL_COMPANIONS.map((c) => c.id).sort()).toEqual(Object.keys(P).sort());
    const bad = C.ANIMAL_COMPANIONS.filter((c) => line(c) !== P[c.id]).map((c) => `${c.id}: ${line(c)} / published ${P[c.id]}`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('the three animal-companion entries the audit corrected stay corrected', () => {
    const find = (id: string) => C.ANIMAL_COMPANIONS.find((c) => c.id === id)!;
    // The octopus's tentacles only grab; the printed block gives them no damage dice at all.
    const tentacles = find('octopus').start.attacks.find((a) => a.name === 'tentacle')!;
    expect(tentacles.damage).toBe(C.NO_DAMAGE);
    expect(tentacles.note).toBe('grab');
    // The saber-toothed cat gains pounce at 7th, and its bite steps up with it.
    const cat = find('saber-toothed-cat').advance!.specialAttacks ?? [];
    expect(cat).toContain('pounce');
    expect(cat.some((s) => s.includes('2d8')), 'the 2d8 saber-toothed bite').toBe(true);
    // The giant scorpion's tremorsense doubles at 7th.
    expect(find('scorpion-giant').advance!.specialQualities ?? []).toContain('tremorsense 60 ft');
  });

  it('every eidolon base form has its published saves, size, natural armour and abilities', () => {
    // id -> "good-saves size natural-armor str/dex/con/int/wis/cha"
    const P: Record<string, string> = {
      biped: 'fort,will medium 2 16/12/13/7/10/11',
      quadruped: 'fort,ref medium 2 14/14/13/7/10/11',
      serpentine: 'ref,will medium 2 12/16/13/7/10/11',
      aquatic: 'fort,ref medium 4 16/12/13/7/10/11',
      avian: 'ref,will small 2 12/16/13/7/10/11',
      tauric: 'fort,will small 2 14/14/13/7/10/11',
      // The Wild Caller's plant forms (Heroes of the Wild).
      cactus: 'fort,ref medium 2 14/14/13/7/10/11',
      conifer: 'fort,will medium 2 14/12/15/7/10/11',
      mushroom: 'fort,ref medium 2 14/14/13/7/10/11',
      tree: 'fort,ref medium 4 16/12/13/7/10/11',
    };
    const line = (f: (typeof C.EIDOLON_FORMS)[number]) => {
      const a = f.start.abilities;
      return `${(f.goodSaves ?? []).join(',')} ${f.start.size} ${f.start.naturalArmor}`
        + ` ${a.str}/${a.dex}/${a.con}/${a.int}/${a.wis}/${a.cha}`;
    };
    expect(C.EIDOLON_FORMS.map((f) => f.id).sort()).toEqual(Object.keys(P).sort());
    const bad = C.EIDOLON_FORMS.filter((f) => line(f) !== P[f.id]).map((f) => `${f.id}: ${line(f)} / published ${P[f.id]}`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every familiar has its published size, speed, natural armour and abilities', () => {
    // id -> "size base-speed natural-armor str/dex/con/int/wis/cha"
    const P: Record<string, string> = {
      bat: 'diminutive 5 0 1/15/6/2/14/5',
      cat: 'tiny 30 0 3/15/8/2/12/7',
      hawk: 'tiny 10 0 6/17/11/2/14/7',
      lizard: 'tiny 20 0 3/15/8/1/12/2',
      monkey: 'tiny 30 0 3/15/10/2/12/5',
      owl: 'tiny 10 0 6/17/11/2/15/6',
      rat: 'tiny 15 0 2/15/11/2/13/2',
      raven: 'tiny 10 0 2/15/8/2/15/7',
      toad: 'diminutive 5 0 1/12/6/1/15/4',
      viper: 'tiny 20 1 4/17/8/1/13/2',
      weasel: 'tiny 20 1 3/15/10/2/12/5',
      // A mindless familiar prints "—" for Intelligence; the catalogue authors it at 1 and tags it.
      'centipede-house': 'tiny 40 2 1/17/10/1/10/2',
      compsognathus: 'tiny 40 1 8/15/14/2/11/5',
      'crab-king': 'tiny 30 4 7/15/12/1/10/2',
      'donkey-rat': 'small 30 0 6/17/13/2/13/4',
      fox: 'tiny 40 0 9/15/13/2/12/6',
      goat: 'small 30 1 12/13/12/2/11/5',
      hedgehog: 'diminutive 20 1 1/16/6/2/12/7',
      'scorpion-greensting': 'tiny 30 3 3/16/10/1/10/2',
      turtle: 'tiny 5 6 3/6/8/2/12/3',
    };
    const line = (f: (typeof C.FAMILIARS)[number]) => {
      const a = f.start.abilities;
      return `${f.start.size} ${f.start.speed.base} ${f.start.naturalArmor}`
        + ` ${a.str}/${a.dex}/${a.con}/${a.int}/${a.wis}/${a.cha}`;
    };
    expect(C.FAMILIARS.map((f) => f.id).sort()).toEqual(Object.keys(P).sort());
    const bad = C.FAMILIARS.filter((f) => line(f) !== P[f.id]).map((f) => `${f.id}: ${line(f)} / published ${P[f.id]}`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every familiar grants the master benefit the published table names', () => {
    const P: Record<string, string> = {
      bat: 'Fly', cat: 'Stealth', hawk: 'Perception', lizard: 'Climb', monkey: 'Acrobatics',
      owl: 'Perception', rat: 'Fortitude', raven: 'Appraise', toad: 'hit points', viper: 'Bluff',
      weasel: 'Reflex', 'centipede-house': 'Stealth', compsognathus: 'Initiative',
      'crab-king': 'grapple', 'donkey-rat': 'Fortitude', fox: 'Reflex', goat: 'Survival',
      hedgehog: 'Will', 'scorpion-greensting': 'Initiative', turtle: 'natural armor',
    };
    const bad = C.FAMILIARS
      .filter((f) => !(f.masterBenefit ?? '').includes(P[f.id]))
      .map((f) => `${f.id}: "${f.masterBenefit}" does not mention ${P[f.id]}`);
    expect(bad, bad.join(' | ')).toEqual([]);
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

describe('equipment: shapes that must hold', () => {
  it('every weapon damage die and crit line parses', () => {
    const bad: string[] = [];
    // A double weapon states both ends separated by a slash ("1d6/1d6", and the gnome hooked
    // hammer's "×3/×4"). weaponDamageForSize splits on that slash, so the form is load-bearing.
    const die = String.raw`\d+d\d+`;
    const crit = String.raw`(?:\d\d–\d\d\/)?×[234]`;
    const oneOrDouble = (part: string) => new RegExp(`^(?:${part})(?:\/(?:${part}))?$`);
    for (const w of C.WEAPONS) {
      if (!oneOrDouble(die).test(w.dmg) && w.dmg !== '—') bad.push(`${w.id}: damage "${w.dmg}"`);
      if (!oneOrDouble(crit).test(w.crit)) bad.push(`${w.id}: crit "${w.crit}"`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('a ranged weapon has a range and a melee one does not, unless it is thrown', () => {
    const bad: string[] = [];
    for (const w of C.WEAPONS) {
      if (w.hands === 'ranged' && !w.range) bad.push(`${w.id}: ranged with no range increment`);
      // A melee weapon may carry a range (thrown daggers, hand axes); a range of 0 is meaningless.
      if (w.range !== undefined && (w.range <= 0 || w.range % 5 !== 0)) bad.push(`${w.id}: odd range ${w.range}`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('firearm stats appear only on firearms, and every firearm carries them', () => {
    const bad: string[] = [];
    for (const w of C.WEAPONS) {
      if (w.firearm && w.group !== 'firearms') bad.push(`${w.id}: firearm stats but group "${w.group}"`);
      if (!w.firearm && w.group === 'firearms') bad.push(`${w.id}: in the firearms group but carries no firearm stats`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('armour numbers are internally consistent', () => {
    const bad: string[] = [];
    for (const a of C.ARMORS) {
      if (a.acBonus <= 0) bad.push(`${a.id}: acBonus ${a.acBonus}`);
      if (a.acp > 0) bad.push(`${a.id}: armour check penalty ${a.acp} should be zero or negative`);
      if (a.asf < 0 || a.asf > 100) bad.push(`${a.id}: arcane spell failure ${a.asf}%`);
      if (a.maxDex !== null && (a.maxDex < 0 || a.maxDex > 8)) bad.push(`${a.id}: maxDex ${a.maxDex}`);
      // A shield sits in the shield slot and vice versa — the engine keys off `slot`, and the
      // off-hand/armour distinction is exactly the bug the project has hit before.
      if ((a.category === 'shield') !== (a.slot === 'shield')) bad.push(`${a.id}: category "${a.category}" but slot "${a.slot}"`);
      // Heavier categories should not protect less than lighter ones at the same cost of mobility.
      if (a.slot === 'armor' && a.maxDex === null) bad.push(`${a.id}: body armour with no max Dex`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('armour categories rank sensibly: light is lighter and less restrictive than heavy', () => {
    const worst = (cat: string) => C.ARMORS.filter((a) => a.category === cat);
    const light = worst('light'), heavy = worst('heavy');
    expect(light.length, 'no light armour').toBeGreaterThan(0);
    expect(heavy.length, 'no heavy armour').toBeGreaterThan(0);
    // The best heavy armour protects more than the best light armour, and costs more mobility.
    expect(Math.max(...heavy.map((a) => a.acBonus))).toBeGreaterThan(Math.max(...light.map((a) => a.acBonus)));
    expect(Math.min(...heavy.map((a) => a.acp))).toBeLessThan(Math.min(...light.map((a) => a.acp)));
  });

  it('no two items anywhere share an id, since the shop looks one up by id alone', () => {
    const seen = new Map<string, string>();
    const bad: string[] = [];
    for (const [kind, list] of [['weapon', C.WEAPONS], ['armor', C.ARMORS], ['gear', C.GEAR]] as const)
      for (const it of list) {
        const prev = seen.get(it.id);
        if (prev) bad.push(`id "${it.id}" is both a ${prev} and a ${kind}`);
        seen.set(it.id, kind);
      }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('a charged or consumable gear item says which it is, and charges are positive', () => {
    const bad: string[] = [];
    for (const g of C.GEAR) {
      if (g.charges !== undefined && g.charges <= 0) bad.push(`${g.id}: charges ${g.charges}`);
      if (g.charges !== undefined && g.consumable) bad.push(`${g.id}: both charged and consumable`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });
});

describe('subsystem option lists', () => {
  // Most of these lists are not re-exported from content/index — class-features.ts and
  // archetypes.ts import them straight from ./subsystems — so the test does the same.
  const LISTS: [string, { id: string; name: string; desc: string }[]][] = [
    ['BARBARIAN_RAGE_POWERS', S.BARBARIAN_RAGE_POWERS],
    ['ROGUE_TALENTS', S.ROGUE_TALENTS],
    ['ROGUE_ADVANCED_TALENTS', S.ROGUE_ADVANCED_TALENTS],
    ['SLAYER_TALENTS', S.SLAYER_TALENTS],
    ['SLAYER_ADVANCED_TALENTS', S.SLAYER_ADVANCED_TALENTS],
    ['INVESTIGATOR_TALENTS', S.INVESTIGATOR_TALENTS],
    ['PALADIN_MERCIES', S.PALADIN_MERCIES],
    ['PALADIN_DIVINE_BOND', S.PALADIN_DIVINE_BOND],
    ['ALCHEMIST_DISCOVERIES', S.ALCHEMIST_DISCOVERIES],
    ['GRAND_DISCOVERIES', S.GRAND_DISCOVERIES],
    ['MAGUS_ARCANA', S.MAGUS_ARCANA],
    ['CAVALIER_ORDERS', S.CAVALIER_ORDERS],
    ['GUNSLINGER_FIREARMS', S.GUNSLINGER_FIREARMS],
    ['ORACLE_MYSTERIES', S.ORACLE_MYSTERIES],
    ['ORACLE_CURSES', S.ORACLE_CURSES],
    ['WITCH_PATRONS', S.WITCH_PATRONS],
    ['WITCH_HEXES', S.WITCH_HEXES],
    ['SHAMAN_HEXES', S.SHAMAN_HEXES],
    ['NATURE_BOND', S.NATURE_BOND],
    ['HUNTERS_BOND', S.HUNTERS_BOND],
    ['ARCANIST_EXPLOITS', S.ARCANIST_EXPLOITS],
    ['BLOODRAGER_BLOODLINES', S.BLOODRAGER_BLOODLINES],
    ['SHIFTER_ASPECTS', S.SHIFTER_ASPECTS],
    ['SHAMAN_SPIRITS', S.SHAMAN_SPIRITS],
  ];

  it('every list is non-empty and every option is fully written', () => {
    const bad: string[] = [];
    for (const [name, list] of LISTS) {
      if (!list.length) bad.push(`${name}: empty`);
      for (const o of list) {
        if (!o.id || !/^[a-z0-9-]+$/.test(o.id)) bad.push(`${name}/${o.id}: bad id`);
        if (!o.name?.trim()) bad.push(`${name}/${o.id}: no name`);
        // A desc shorter than a phrase tells the player nothing about what they are picking.
        if (!o.desc?.trim() || o.desc.trim().length < 12) bad.push(`${name}/${o.id}: desc too thin ("${o.desc}")`);
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('ids are unique within a list', () => {
    const bad: string[] = [];
    for (const [name, list] of LISTS) {
      const seen = new Set<string>();
      for (const o of list) {
        if (seen.has(o.id)) bad.push(`${name}: duplicate id "${o.id}"`);
        seen.add(o.id);
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('a basic and advanced pair that gets concatenated shares no id', () => {
    // class-features.ts builds SLAYER_TALENTS_ALL and the rogue's advanced-eligible slot by
    // concatenation, so a shared id would make one of the two options unreachable.
    const bad: string[] = [];
    for (const [label, basic, adv] of [
      ['rogue', S.ROGUE_TALENTS, S.ROGUE_ADVANCED_TALENTS],
      ['slayer', S.SLAYER_TALENTS, S.SLAYER_ADVANCED_TALENTS],
    ] as const) {
      const ids = new Set(basic.map((o) => o.id));
      for (const o of adv) if (ids.has(o.id)) bad.push(`${label}: "${o.id}" is in both the basic and advanced list`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('a conditional suppression names a choice option that actually exists, at a level it is offered', () => {
    // The Primalist trades a bloodline power for rage powers at chosen levels. A misspelled
    // swapValue would never match, so the power would silently never be suppressed.
    const bad: string[] = [];
    for (const c of C.CLASSES)
      for (const a of c.archetypes ?? [])
        for (const cs of a.conditionalSuppress ?? []) {
          const offered = [...(c.choices ?? []), ...(a.choices?.add ?? [])].find((ch) => ch.id === cs.choiceId);
          if (!offered) { bad.push(`${a.id}: conditionalSuppress on unknown choice "${cs.choiceId}"`); continue; }
          const opts = offered.options ?? [];
          if (opts.length && !opts.some((o) => o.id === cs.swapValue))
            bad.push(`${a.id}: swapValue "${cs.swapValue}" is not an option of "${cs.choiceId}"`);
          for (const l of cs.levels)
            if (!(offered.levels ?? [1]).includes(l))
              bad.push(`${a.id}: suppresses at level ${l}, but "${cs.choiceId}" is not offered then`);
        }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every eidolon evolution costs 1 to 4 points and states its mechanical effect', () => {
    const bad: string[] = [];
    for (const e of C.EIDOLON_EVOLUTIONS) {
      if (![1, 2, 3, 4].includes(e.cost)) bad.push(`${e.id}: cost ${e.cost}`);
      if (e.minLevel !== undefined && (e.minLevel < 1 || e.minLevel > 20)) bad.push(`${e.id}: minLevel ${e.minLevel}`);
      if (e.forms && !e.forms.length) bad.push(`${e.id}: empty forms list allows nothing`);
      // Either the engine applies it, or `apply.manual` marks it as not folded in.
      if (!e.apply) bad.push(`${e.id}: neither applied nor marked manual`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });
});

describe('subsystem options that were checked against the Advanced Class Guide', () => {
  const ids = (list: { id: string }[]) => new Set(list.map((o) => o.id));

  it("the arcanist's energy exploit is Energy Shield, not the wizard's Energy Absorption", () => {
    // Energy Absorption is an Abjuration *school power*; the ACG arcanist exploit is Energy Shield,
    // which buys resistance to one energy type with a reservoir point.
    expect(ids(S.ARCANIST_EXPLOITS).has('energy-shield')).toBe(true);
    expect(ids(S.ARCANIST_EXPLOITS).has('energy-absorption')).toBe(false);
    const school = C.SCHOOL_POWERS['abjuration'].map((p) => p.name);
    expect(school).toContain('Energy Absorption');
  });

  it('Swift Poison is a rogue talent, reached by a slayer through its Rogue Talent option', () => {
    expect(ids(S.ROGUE_TALENTS).has('swift-poison')).toBe(true);
    expect(ids(S.SLAYER_ADVANCED_TALENTS).has('swift-poison')).toBe(false);
    expect(ids(S.SLAYER_TALENTS).has('rogue-talent')).toBe(true);
  });
});

describe('deities: internal coherence', () => {
  const ALIGN_DOMAIN: Record<string, string> = { good: 'G', evil: 'E', law: 'L', chaos: 'C' };

  it('every deity but (None) grants exactly five domains', () => {
    const bad = C.DEITIES.filter((d) => d.id !== 'none' && d.domains.length !== 5)
      .map((d) => `${d.id}: ${d.domains.length} domains`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('an alignment domain never contradicts the deity that grants it', () => {
    // A Lawful Good god may offer Law and Good, never Chaos or Evil. A transcription slip in the
    // domain list shows up here rather than as a legal-looking cleric.
    const bad: string[] = [];
    for (const d of C.DEITIES) {
      for (const dom of d.domains) {
        const letter = ALIGN_DOMAIN[dom];
        if (!letter) continue;
        const opposed = letter === 'G' ? 'E' : letter === 'E' ? 'G' : letter === 'L' ? 'C' : 'L';
        if (d.alignment.includes(opposed))
          bad.push(`${d.id} (${d.alignment}) grants the ${dom} domain`);
        // A neutral-on-that-axis god may still offer the domain only if its alignment names it.
        if (!d.alignment.includes(letter))
          bad.push(`${d.id} (${d.alignment}) grants ${dom} without being ${letter}`);
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every deity has a portfolio and a unique name', () => {
    const bad: string[] = [];
    const seen = new Set<string>();
    for (const d of C.DEITIES) {
      if (!d.portfolio?.trim()) bad.push(`${d.id}: no portfolio`);
      if (seen.has(d.name)) bad.push(`duplicate deity name "${d.name}"`);
      seen.add(d.name);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });
});

describe('class chassis, verified against the published class tables', () => {
  // Hit die, BAB progression, good saves, skill ranks and average starting wealth for all 31
  // classes, read off each class's own table on 2026-09-22 rather than recalled. BAB is taken from
  // the 20th-level row (+20 full, +15 three-quarters, +10 half) and a good save from that row
  // reaching +12 where a poor one stops at +6.
  const CHASSIS: Record<string, [number, string, string[], number, number]> = {
    fighter: [10, 'full', ['fort'], 2, 175],
    barbarian: [12, 'full', ['fort'], 4, 105],
    bard: [8, 'threequarter', ['ref', 'will'], 6, 105],
    cleric: [8, 'threequarter', ['fort', 'will'], 2, 140],
    druid: [8, 'threequarter', ['fort', 'will'], 4, 70],
    monk: [8, 'threequarter', ['fort', 'ref', 'will'], 4, 35],
    paladin: [10, 'full', ['fort', 'will'], 2, 175],
    ranger: [10, 'full', ['fort', 'ref'], 6, 175],
    rogue: [8, 'threequarter', ['ref'], 8, 140],
    sorcerer: [6, 'half', ['will'], 2, 70],
    warpriest: [8, 'threequarter', ['fort', 'will'], 2, 175],
    wizard: [6, 'half', ['will'], 2, 70],
    alchemist: [8, 'threequarter', ['fort', 'ref'], 4, 105],
    // The cavalier's only good save is Fortitude — its table reads Fort +12, Ref +6, Will +6.
    cavalier: [10, 'full', ['fort'], 4, 175],
    gunslinger: [10, 'full', ['fort', 'ref'], 4, 175],
    inquisitor: [8, 'threequarter', ['fort', 'will'], 6, 140],
    // The magus is three-quarters BAB (+15 at 20th), not full.
    magus: [8, 'threequarter', ['fort', 'will'], 2, 140],
    oracle: [8, 'threequarter', ['will'], 4, 105],
    shifter: [10, 'full', ['fort', 'ref'], 4, 105],
    summoner: [8, 'threequarter', ['will'], 2, 70],
    witch: [6, 'half', ['will'], 2, 105],
    'vampire-hunter': [8, 'full', ['ref', 'will'], 6, 175],
    arcanist: [6, 'half', ['will'], 2, 70],
    // Like the barbarian it descends from, the bloodrager's only good save is Fortitude.
    bloodrager: [10, 'full', ['fort'], 4, 105],
    brawler: [10, 'full', ['fort', 'ref'], 4, 105],
    hunter: [8, 'threequarter', ['fort', 'ref'], 6, 140],
    investigator: [8, 'threequarter', ['ref', 'will'], 6, 105],
    shaman: [8, 'threequarter', ['will'], 4, 105],
    skald: [8, 'threequarter', ['fort', 'will'], 4, 105],
    slayer: [10, 'full', ['fort', 'ref'], 6, 175],
    swashbuckler: [10, 'full', ['ref'], 4, 175],
  };

  it('covers every class the app ships, and no extras', () => {
    expect(Object.keys(CHASSIS).sort()).toEqual(C.CLASSES.map((c) => c.id).sort());
  });

  it('matches the published hit die, BAB, good saves, skill ranks and starting wealth', () => {
    const bad: string[] = [];
    for (const c of C.CLASSES) {
      const [hd, bab, saves, sk, gold] = CHASSIS[c.id];
      if (c.hitDie !== hd) bad.push(`${c.id}: hit die d${c.hitDie}, published d${hd}`);
      if (c.bab !== bab) bad.push(`${c.id}: BAB ${c.bab}, published ${bab}`);
      if ([...c.goodSaves].sort().join('+') !== [...saves].sort().join('+'))
        bad.push(`${c.id}: good saves ${c.goodSaves.join('+')}, published ${saves.join('+')}`);
      if (c.skillRanks !== sk) bad.push(`${c.id}: skill ranks ${c.skillRanks}, published ${sk}`);
      if (c.startingGold !== gold) bad.push(`${c.id}: starting wealth ${c.startingGold}, published ${gold}`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every average starting wealth is a whole number of d6 times ten', () => {
    // Published starting wealth is always Nd6 × 10 gp, so the average is N × 35.
    const bad = C.CLASSES.filter((c) => c.startingGold % 35 !== 0)
      .map((c) => `${c.id}: ${c.startingGold} is not a multiple of 35`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('good saves are a non-empty set with no repeats', () => {
    const bad: string[] = [];
    for (const c of C.CLASSES) {
      if (!c.goodSaves.length) bad.push(`${c.id}: no good save`);
      if (new Set(c.goodSaves).size !== c.goodSaves.length) bad.push(`${c.id}: repeated good save`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every class skill is a real skill, and the list is non-empty', () => {
    const bad: string[] = [];
    for (const c of C.CLASSES) {
      if (!c.classSkills.length) bad.push(`${c.id}: no class skills`);
      for (const s of c.classSkills) if (!skillIds.has(s)) bad.push(`${c.id}: unknown class skill "${s}"`);
      if (new Set(c.classSkills).size !== c.classSkills.length) bad.push(`${c.id}: duplicate class skill`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });
});

describe('magic item pricing, verified against the published tables', () => {
  // Read off d20pfsrd on 2026-09-22: the weapon/armour special-ability tables, the two
  // "pricing by bonus" tables, and the wondrous item and ring price lists.

  it('the enhancement price tables are bonus squared times 2,000 for weapons and 1,000 for armour', () => {
    for (let b = 1; b <= 5; b++) {
      expect(WEAPON_ENHANCEMENT_COST[b], `weapon +${b}`).toBe(b * b * 2_000);
      expect(ARMOR_ENHANCEMENT_COST[b], `armour +${b}`).toBe(b * b * 1_000);
    }
    expect(WEAPON_ENHANCEMENT_COST[1]).toBe(2_000);
    expect(ARMOR_ENHANCEMENT_COST[5]).toBe(25_000);
    expect(MASTERWORK_WEAPON_COST).toBe(300);
    expect(MASTERWORK_ARMOR_COST).toBe(150);
    // Enhancement caps at +5; enhancement plus ability equivalents caps at +10.
    expect(MAX_ENHANCEMENT).toBe(5);
    expect(MAX_TOTAL_BONUS).toBe(10);
  });

  it('every weapon special ability carries its published bonus equivalent', () => {
    const PUBLISHED: Record<string, number> = {
      bane: 1, defending: 1, flaming: 1, frost: 1, shock: 1, 'ghost-touch': 1, keen: 1,
      merciful: 1, vicious: 1,
      anarchic: 2, axiomatic: 2, holy: 2, unholy: 2, 'flaming-burst': 2, wounding: 2,
      speed: 3,
      'brilliant-energy': 4, dancing: 4,
      vorpal: 5,
    };
    expect(C.WEAPON_PROPERTIES.map((p) => p.id).sort()).toEqual(Object.keys(PUBLISHED).sort());
    const bad = C.WEAPON_PROPERTIES.filter((p) => p.equivalent !== PUBLISHED[p.id])
      .map((p) => `${p.id}: +${p.equivalent}, published +${PUBLISHED[p.id]}`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every armour and shield ability carries its published equivalent or flat surcharge', () => {
    // A flat-priced ability adds gp directly; an equivalent raises the squared bonus instead.
    const PUBLISHED: Record<string, { equivalent?: number; flatCost?: number }> = {
      glamered: { flatCost: 2_700 },
      slick: { flatCost: 3_750 },
      shadow: { flatCost: 3_750 },
      'fortification-light': { equivalent: 1 },
      'fortification-moderate': { equivalent: 3 },
      'fortification-heavy': { equivalent: 5 },
      invulnerability: { equivalent: 3 },
      'spell-resistance-13': { equivalent: 2 },
      'spell-resistance-15': { equivalent: 3 },
      'spell-resistance-17': { equivalent: 4 },
      'spell-resistance-19': { equivalent: 5 },
      bashing: { equivalent: 1 },
      'arrow-catching': { equivalent: 1 },
      'arrow-deflection': { equivalent: 2 },
      animated: { equivalent: 2 },
    };
    expect(C.ARMOR_PROPERTIES.map((p) => p.id).sort()).toEqual(Object.keys(PUBLISHED).sort());
    const bad: string[] = [];
    for (const p of C.ARMOR_PROPERTIES) {
      const want = PUBLISHED[p.id];
      if ((p.equivalent ?? undefined) !== want.equivalent) bad.push(`${p.id}: equivalent ${p.equivalent}, published ${want.equivalent}`);
      if ((p.flatCost ?? undefined) !== want.flatCost) bad.push(`${p.id}: flat ${p.flatCost}, published ${want.flatCost}`);
      // The two pricing styles are mutually exclusive.
      if (p.equivalent !== undefined && p.flatCost !== undefined) bad.push(`${p.id}: both an equivalent and a flat cost`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('every wondrous item costs what the published list says', () => {
    // Tiered families are bonus squared times a per-family multiplier; the rest are flat prices.
    const FAMILY: [string, number[], number][] = [
      ['belt-strength', [2, 4, 6], 1_000], ['belt-dexterity', [2, 4, 6], 1_000],
      ['belt-constitution', [2, 4, 6], 1_000], ['headband-intelligence', [2, 4, 6], 1_000],
      ['headband-wisdom', [2, 4, 6], 1_000], ['headband-charisma', [2, 4, 6], 1_000],
      ['cloak-resistance', [1, 2, 3, 4, 5], 1_000],
      ['ring-protection', [1, 2, 3, 4, 5], 2_000],
      ['amulet-natural-armor', [1, 2, 3, 4, 5], 2_000],
      ['bracers-armor', [1, 2, 3, 4, 5, 6, 7, 8], 1_000],
    ];
    const FLAT: Record<string, number> = {
      'boots-elvenkind': 2_500, 'cloak-elvenkind': 2_500, 'eyes-of-the-eagle': 2_500,
      'gloves-swimming-climbing': 6_250, 'vest-of-escape': 5_200, 'circlet-of-persuasion': 4_500,
      'boots-striding-springing': 5_500, 'boots-of-speed': 12_000, 'goggles-of-night': 12_000,
    };
    const bad: string[] = [];
    const seen = new Set<string>();
    for (const [base, tiers, per] of FAMILY)
      for (const b of tiers) {
        const id = `${base}-${b}`;
        seen.add(id);
        const item = C.wondrousItemById.get(id);
        if (!item) { bad.push(`${id}: missing`); continue; }
        if (item.cost !== b * b * per) bad.push(`${id}: ${item.cost}, published ${b * b * per}`);
        if (item.bonus !== b) bad.push(`${id}: bonus ${item.bonus}, expected ${b}`);
        if (!item.tiered) bad.push(`${id}: not marked tiered`);
      }
    for (const [id, cost] of Object.entries(FLAT)) {
      seen.add(id);
      const item = C.wondrousItemById.get(id);
      if (!item) { bad.push(`${id}: missing`); continue; }
      if (item.cost !== cost) bad.push(`${id}: ${item.cost}, published ${cost}`);
      if (item.tiered) bad.push(`${id}: marked tiered but flat-priced`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
    // Nothing in the catalogue escapes the table above.
    const extra = C.WONDROUS_ITEMS.map((i) => i.id).filter((id) => !seen.has(id));
    expect(extra, `unpriced wondrous items: ${extra.join(', ')}`).toEqual([]);
  });

  it('a named ability prices by raising the total bonus, not as a separate line', () => {
    // A +1 flaming sword is a +2 weapon for pricing: 300 masterwork + 2² × 2,000.
    const lookup = (id: string) => propertyPrice(id);
    expect(qualityCost('weapon', { enhancement: 1, properties: ['flaming'] }, lookup)).toBe(300 + 8_000);
    // Two +1 abilities on a +1 weapon price at +3.
    expect(qualityCost('weapon', { enhancement: 1, properties: ['flaming', 'frost'] }, lookup)).toBe(300 + 18_000);
    // A flat-priced armour ability adds gp on top of the squared bonus rather than raising it.
    expect(qualityCost('armor', { enhancement: 1, properties: ['glamered'] }, lookup)).toBe(150 + 1_000 + 2_700);
    // Masterwork alone, with no enhancement.
    expect(qualityCost('weapon', { masterwork: true }, lookup)).toBe(300);
  });
});

describe('skills, conditions and metamagic, verified against the published tables', () => {
  it('every skill has the published key ability, trained-only flag and armour check penalty', () => {
    // Read off the Skills table on 2026-09-22: [key ability, trained only, armour check penalty].
    const P: Record<string, [string, boolean, boolean]> = {
      acrobatics: ['dex', false, true], appraise: ['int', false, false], bluff: ['cha', false, false],
      climb: ['str', false, true], 'craft-alchemy': ['int', false, false], 'craft-armor': ['int', false, false],
      'craft-weapons': ['int', false, false], diplomacy: ['cha', false, false],
      'disable-device': ['dex', true, true], disguise: ['cha', false, false],
      'escape-artist': ['dex', false, true], fly: ['dex', false, true],
      'handle-animal': ['cha', true, false], heal: ['wis', false, false], intimidate: ['cha', false, false],
      'know-arcana': ['int', true, false], 'know-dungeoneering': ['int', true, false],
      'know-engineering': ['int', true, false], 'know-geography': ['int', true, false],
      'know-history': ['int', true, false], 'know-local': ['int', true, false],
      'know-nature': ['int', true, false], 'know-nobility': ['int', true, false],
      'know-planes': ['int', true, false], 'know-religion': ['int', true, false],
      linguistics: ['int', true, false], perception: ['wis', false, false],
      'perform-oratory': ['cha', false, false], 'perform-strings': ['cha', false, false],
      'profession-any': ['wis', true, false], ride: ['dex', false, true],
      'sense-motive': ['wis', false, false], 'sleight-of-hand': ['dex', true, true],
      spellcraft: ['int', true, false], stealth: ['dex', false, true], survival: ['wis', false, false],
      swim: ['str', false, true], 'use-magic-device': ['cha', true, false],
    };
    expect(C.SKILLS.map((s) => s.id).sort()).toEqual(Object.keys(P).sort());
    const bad: string[] = [];
    for (const s of C.SKILLS) {
      const [ability, trained, acp] = P[s.id];
      if (s.ability !== ability) bad.push(`${s.id}: ${s.ability}, published ${ability}`);
      if (s.trainedOnly !== trained) bad.push(`${s.id}: trainedOnly ${s.trainedOnly}, published ${trained}`);
      if (s.acp !== acp) bad.push(`${s.id}: acp ${s.acp}, published ${acp}`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('the nine armour-check-penalty skills are exactly the published set', () => {
    expect(C.SKILLS.filter((s) => s.acp).map((s) => s.id).sort()).toEqual(
      ['acrobatics', 'climb', 'disable-device', 'escape-artist', 'fly', 'ride', 'sleight-of-hand', 'stealth', 'swim']);
  });

  it('every metamagic feat raises the slot by its published amount', () => {
    const P: Record<string, number> = {
      'empower-spell': 2, 'enlarge-spell': 1, 'extend-spell': 1, 'heighten-spell': 0,
      'maximize-spell': 3, 'quicken-spell': 4, 'silent-spell': 1, 'still-spell': 1, 'widen-spell': 3,
    };
    expect(C.METAMAGIC.map((m) => m.id).sort()).toEqual(Object.keys(P).sort());
    const bad = C.METAMAGIC.filter((m) => m.levelAdj !== P[m.id])
      .map((m) => `${m.id}: +${m.levelAdj}, published +${P[m.id]}`);
    expect(bad, bad.join(' | ')).toEqual([]);
    // Heighten alone is variable, and is the only entry flagged as such.
    expect(C.METAMAGIC.filter((m) => m.heighten).map((m) => m.id)).toEqual(['heighten-spell']);
  });

  it('condition penalties match the published entries', () => {
    // Target -> penalty, for the conditions whose numbers the engine computes.
    const P: Record<string, Record<string, number>> = {
      shaken: { 'attack:melee': -2, 'attack:ranged': -2, 'save:all': -2, 'skill:all': -2 },
      frightened: { 'attack:melee': -2, 'attack:ranged': -2, 'save:all': -2, 'skill:all': -2 },
      // Panicked carries no attack penalty: the creature cannot attack at all.
      panicked: { 'save:all': -2, 'skill:all': -2 },
      sickened: { 'attack:melee': -2, 'attack:ranged': -2, 'save:all': -2, 'damage:weapon': -2, 'skill:all': -2 },
      fatigued: { 'ability:str': -2, 'ability:dex': -2 },
      exhausted: { 'ability:str': -6, 'ability:dex': -6 },
      dazzled: { 'attack:melee': -1, 'attack:ranged': -1 },
      prone: { 'attack:melee': -4 },
      entangled: { 'attack:melee': -2, 'attack:ranged': -2, 'ability:dex': -4 },
      grappled: { 'ability:dex': -4, 'attack:melee': -2, 'attack:ranged': -2 },
      deafened: { init: -4 },
      blinded: { ac: -2 },
      cowering: { ac: -2 },
      stunned: { ac: -2 },
      pinned: { ac: -4 },
    };
    const bad: string[] = [];
    for (const [id, want] of Object.entries(P)) {
      const cond = C.conditionById.get(id);
      if (!cond) { bad.push(`${id}: missing`); continue; }
      const got: Record<string, number> = {};
      for (const e of cond.effects) got[e.target] = e.value;
      const keys = new Set([...Object.keys(want), ...Object.keys(got)]);
      for (const k of keys)
        if (want[k] !== got[k]) bad.push(`${id}/${k}: ours ${got[k] ?? 'none'}, published ${want[k] ?? 'none'}`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('the conditions that deny the Dexterity bonus to AC are the published set', () => {
    expect(C.CONDITIONS.filter((c) => c.loseDexToAc).map((c) => c.id).sort()).toEqual(
      ['blinded', 'cowering', 'flat-footed', 'helpless', 'paralyzed', 'pinned', 'stunned']);
  });
});
