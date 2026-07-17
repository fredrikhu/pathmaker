import * as C from '../content/index';
import type {
  Ability, Alignment, CharacterDoc, ChoiceSlot, Effect, Issue, Resolution,
  Sheet, SlotOption, Stat,
} from './types';
import type { ProgressionRow } from './types';
import { ABILITIES, abilityMod } from './types';
import { evalPredicate, explainFailure, type PredicateCtx } from './predicates';
import { stack, type Contribution } from './stack';
import {
  babAt, saveBase, fixedHpPerLevel, generalFeatLevels, abilityIncreaseLevels,
  casterLevel, spellSlotsPerDay, spellsKnownPerLevel, type SpellTable,
} from './progression';

const POINT_BUY_COST: Record<number, number> = {
  7: -4, 8: -2, 9: -1, 10: 0, 11: 1, 12: 2, 13: 3, 14: 5, 15: 7, 16: 10, 17: 13, 18: 17,
};
const POINT_BUY_TOTAL: Record<string, number> = { pb15: 15, pb20: 20, pb25: 25 };

/** The class's verified slot/known table, if one is encoded. Classes without a `table` (arcanist,
 *  vampire-hunter) show no slot numbers rather than guessed ones. */
function spellTableFor(sc: C.SpellcastingDef): SpellTable | undefined {
  return sc.table;
}

const ORDINALS = ['0th', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
const ordinal = (n: number): string => ORDINALS[n] ?? `${n}th`;

/** A friendly display name for any content id (for whyNot messages). */
function displayName(id: string): string {
  return (
    C.featById.get(id)?.name ??
    C.raceById.get(id)?.name ??
    C.classById.get(id)?.name ??
    C.skillById.get(id)?.name ??
    id
  );
}

interface Decisions {
  raceId: string | null;
  altTraits: string[];
  abilityBase: Record<Ability, number>;
  floatingBonus: Ability[]; // human/half-elf/half-orc +2 targets
  alignment: Alignment | null;
  deityId: string | null;
  classId: string | null;
  favoredClass: string | null;
  fcbChoice: 'hp' | 'skill' | null; // overall default for levels without a per-level pick
  fcbByLevel: Record<number, 'hp' | 'skill'>;
  classChoices: Record<string, string[]>; // slotSuffix -> selected ids
  feats: Record<string, string | null>; // slotKey -> featId
  traits: string[];
  drawback: string | null;
  skillRanks: Record<string, number>;
  languages: string[];
  spellPicks: string[];
  hpRolls: Record<number, number>; // level -> hp gained (levels >= 2)
  abilityIncreases: Record<number, Ability>; // level (4/8/12/16/20) -> chosen ability
}

function readDecisions(doc: CharacterDoc): Decisions {
  const d = doc.decisions;
  const get = <T,>(k: string, fallback: T): T => (d[k] === undefined ? fallback : (d[k] as T));
  const base = get<Record<Ability, number>>('ability-base', { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
  return {
    raceId: get<string | null>('race', null),
    altTraits: get<string[]>('alt-traits', []),
    abilityBase: base,
    floatingBonus: get<Ability[]>('floating-bonus', []),
    alignment: get<Alignment | null>('alignment', null),
    deityId: get<string | null>('deity', null),
    classId: get<string | null>('class', null),
    favoredClass: get<string | null>('favored-class', null),
    fcbChoice: get<'hp' | 'skill' | null>('fcb', null),
    fcbByLevel: get<Record<number, 'hp' | 'skill'>>('fcb-by-level', {}),
    classChoices: get<Record<string, string[]>>('class-choices', {}),
    feats: get<Record<string, string | null>>('feats', {}),
    traits: get<string[]>('traits', []),
    drawback: get<string | null>('drawback', null),
    skillRanks: get<Record<string, number>>('skill-ranks', {}),
    languages: get<string[]>('languages', []),
    spellPicks: get<string[]>('spell-picks', []),
    hpRolls: get<Record<number, number>>('hp-rolls', {}),
    abilityIncreases: get<Record<number, Ability>>('ability-increases', {}),
  };
}

/** Standard traits still active after alternate-trait replacements. */
function activeRacialTraits(dec: Decisions): { standard: C.RacialTraitDef[]; alternates: C.AltTraitDef[] } {
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  if (!race) return { standard: [], alternates: [] };
  const chosenAlts = race.altTraits.filter((a) => dec.altTraits.includes(a.id));
  const replaced = new Set<string>(chosenAlts.flatMap((a) => a.replaces));
  const standard = race.traits.filter((t) => !replaced.has(t.id));
  return { standard, alternates: chosenAlts };
}

/** How many floating +2 bonuses the race/trait config currently grants (Dual Talent → 2). */
function floatingCap(dec: Decisions): number {
  return dec.altTraits.includes('human-dual-talent') ? 2 : 1;
}

/** The floating ability picks actually applied — capped to the allowed count. Any excess
 *  (e.g. left over after dropping Dual Talent) is suspended, like an orphaned feat, and
 *  surfaced as a validation Issue rather than silently boosting a stat. */
function appliedFloating(dec: Decisions): Ability[] {
  return dec.floatingBonus.slice(-floatingCap(dec));
}

/** Ability scores after race + floating bonus + the +1 level-up increases gained at or below
 *  `uptoLevel` (default: all of them). The level cap lets skill ranks use the Int mod as of
 *  each level, matching how PF1e assigns ranks at level-up. */
function finalAbilities(dec: Decisions, uptoLevel = Infinity): Record<Ability, number> {
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  const out = { ...dec.abilityBase };
  if (race) {
    if (race.abilityMods === 'choice') {
      for (const ab of appliedFloating(dec)) out[ab] += 2;
    } else {
      for (const ab of ABILITIES) out[ab] += race.abilityMods[ab] ?? 0;
    }
  }
  for (const [lvl, ab] of Object.entries(dec.abilityIncreases)) {
    if (Number(lvl) <= uptoLevel) out[ab] += 1;
  }
  return out;
}

/** Normalized class features gained at or below `level` (uses per-level `features`, else the
 *  level-1 `features1` fallback while Part B authoring is in progress). */
function classFeaturesUpTo(klass: C.ClassDef | undefined, level: number): C.LeveledFeatureDef[] {
  if (!klass) return [];
  const src: C.LeveledFeatureDef[] = klass.features ?? klass.features1.map((f) => ({ ...f, level: 1 }));
  return src.filter((f) => f.level <= level).sort((a, b) => a.level - b.level);
}

/** Feat ids sitting in a currently-valid slot. Orphaned feats (slot removed by an
 *  upstream choice) are suspended — they persist as decisions + Issues but contribute
 *  nothing to the sheet until the user resolves them. */
function validFeatIds(dec: Decisions, level: number): string[] {
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  const klass = dec.classId ? C.classById.get(dec.classId) : undefined;
  const keys = new Set(featSlots(dec, race, klass, level).map((s) => s.key));
  return Object.entries(dec.feats)
    .filter(([k, v]) => v && keys.has(k))
    .map(([, v]) => v as string);
}

function collectEffects(dec: Decisions, doc: CharacterDoc, level: number): Effect[] {
  const effects: Effect[] = [];
  const { standard, alternates } = activeRacialTraits(dec);
  for (const t of [...standard, ...alternates]) if (t.effects) effects.push(...t.effects);

  // Class features gained so far (e.g. druid Nature Sense's +2 to Nature/Survival).
  const klass = dec.classId ? C.classById.get(dec.classId) : undefined;
  for (const feat of classFeaturesUpTo(klass, level)) if (feat.effects) effects.push(...feat.effects);

  // Feats (orphaned feats suspended — see validFeatIds)
  for (const fid of validFeatIds(dec, level)) {
    const f = C.featById.get(fid);
    if (!f?.effects) continue;
    // Toughness scales: +3 HP, plus 1 per Hit Die beyond 3rd (i.e. max(3, character level)).
    if (fid === 'toughness') { effects.push({ target: 'hp:max', type: 'untyped', value: Math.max(3, level), note: 'Toughness' }); continue; }
    effects.push(...f.effects);
  }
  // Traits + drawback
  for (const tid of [...dec.traits, dec.drawback].filter(Boolean) as string[]) {
    const t = C.traitById.get(tid);
    if (t?.effects) effects.push(...t.effects);
  }
  // Equipped armor / shield
  const armor = doc.equipped.armor ? C.armorById.get(doc.equipped.armor) : null;
  const shield = doc.equipped.offHand ? C.armorById.get(doc.equipped.offHand) : null;
  if (armor) effects.push({ target: 'ac', type: 'armor', value: armor.acBonus, note: `${armor.name} (armor)` });
  if (shield && shield.slot === 'shield') effects.push({ target: 'ac', type: 'shield', value: shield.acBonus, note: `${shield.name} (shield)` });
  return effects;
}

/** Total armor check penalty from equipped armor + shield. */
function armorCheckPenalty(doc: CharacterDoc): { total: number; sources: string[] } {
  let total = 0;
  const sources: string[] = [];
  for (const slot of [doc.equipped.armor, doc.equipped.offHand]) {
    const a = slot ? C.armorById.get(slot) : null;
    if (a && a.acp < 0) { total += a.acp; sources.push(a.name); }
  }
  return { total, sources };
}

function maxDexBonus(doc: CharacterDoc): number | null {
  const a = doc.equipped.armor ? C.armorById.get(doc.equipped.armor) : null;
  return a && a.maxDex !== null ? a.maxDex : null;
}

function makeStat(id: string, label: string, contribs: Contribution[], annotations: string[] = []): Stat {
  const { total, lines } = stack(contribs);
  return { id, label, total, lines, annotations };
}

export function resolve(doc: CharacterDoc): Resolution {
  const dec = readDecisions(doc);
  const level = Math.max(1, Math.min(20, Math.floor(doc.level) || 1));
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  const klass = dec.classId ? C.classById.get(dec.classId) : undefined;
  // Ability increases above the current target level are suspended, not applied.
  const abilities = finalAbilities(dec, level);
  const mods: Record<Ability, number> = Object.fromEntries(
    ABILITIES.map((a) => [a, abilityMod(abilities[a])]),
  ) as Record<Ability, number>;
  const { standard, alternates } = activeRacialTraits(dec);
  const effects = collectEffects(dec, doc, level);
  const size = race?.size ?? 'medium';
  const sizeAcAtk = size === 'small' ? 1 : 0;

  // Effects grouped by target for stat assembly.
  const byTarget = new Map<string, Effect[]>();
  for (const e of effects) {
    const arr = byTarget.get(e.target) ?? [];
    arr.push(e);
    byTarget.set(e.target, arr);
  }
  const conds = (target: string): string[] =>
    (byTarget.get(target) ?? []).filter((e) => e.condition).map((e) => `${e.note.replace(/\s*\(.*\)$/, '')}: ${fmtSigned(e.value)} ${e.condition}`);
  const unconds = (target: string): Contribution[] =>
    (byTarget.get(target) ?? []).filter((e) => !e.condition).map((e) => ({ type: e.type, value: e.value, note: e.note }));

  const bab = klass ? babAt(klass.bab, level) : 0;
  const clvl = klass?.spellcasting ? casterLevel(klass.spellcasting.progression ?? 'full', level) : 0;
  const featIds = validFeatIds(dec, level);
  const predCtx: PredicateCtx = {
    abilities, bab, featIds,
    raceId: dec.raceId, classId: dec.classId, alignment: dec.alignment,
    casterLevel: clvl, skillRanks: dec.skillRanks,
  };

  // ---- Stats ----
  const stats: Record<string, Stat> = {};

  for (const ab of ABILITIES) {
    const incCount = Object.entries(dec.abilityIncreases)
      .filter(([l, a]) => a === ab && Number(l) <= level).length;
    stats[`ability:${ab}`] = makeStat(`ability:${ab}`, ab.toUpperCase(), [
      { type: 'base', value: dec.abilityBase[ab], note: 'Base' },
      ...(race && race.abilityMods !== 'choice' && race.abilityMods[ab]
        ? [{ type: 'racial' as const, value: race.abilityMods[ab]!, note: `${race.name} racial` }]
        : []),
      ...(race && race.abilityMods === 'choice' && appliedFloating(dec).includes(ab)
        ? [{ type: 'racial' as const, value: 2, note: `${race.name} +2` }]
        : []),
      ...(incCount > 0
        ? [{ type: 'base' as const, value: incCount, note: `Level-up increase${incCount > 1 ? `s ×${incCount}` : ''}` }]
        : []),
    ]);
  }

  // HP: level 1 = max hit die; each later level adds its rolled/average HP. Con mod applies to
  // every level (a level-up Con increase raises the modifier retroactively, per RAW, because we
  // use the final Con mod × total levels). FCB(hp) adds 1 per level when chosen. Plus Toughness.
  // Favored-class bonus, chosen per level (falling back to the overall default). Count how many
  // levels put the +1 into HP vs skill ranks.
  const favored = dec.favoredClass != null && dec.favoredClass === dec.classId;
  const fcbAt = (l: number): 'hp' | 'skill' | null => dec.fcbByLevel[l] ?? dec.fcbChoice;
  let fcbHpCount = 0;
  let fcbSkillCount = 0;
  if (favored) for (let l = 1; l <= level; l++) { const c = fcbAt(l); if (c === 'hp') fcbHpCount++; else if (c === 'skill') fcbSkillCount++; }
  const hpContribs: Contribution[] = [];
  if (klass) {
    hpContribs.push({ type: 'base', value: klass.hitDie, note: `Max hit die (${klass.name})` });
    let laterLevelsHp = 0;
    for (let l = 2; l <= level; l++) laterLevelsHp += dec.hpRolls[l] ?? fixedHpPerLevel(klass.hitDie);
    if (laterLevelsHp) hpContribs.push({ type: 'base', value: laterLevelsHp, note: `Levels 2–${level}` });
  }
  const hpLevels = klass ? level : 1;
  hpContribs.push({ type: 'base', value: mods.con * hpLevels, note: hpLevels > 1 ? `Con modifier × ${hpLevels}` : 'Con modifier' });
  if (fcbHpCount) hpContribs.push({ type: 'base', value: fcbHpCount, note: `Favored class bonus${fcbHpCount > 1 ? ` × ${fcbHpCount}` : ''}` });
  hpContribs.push(...unconds('hp:max'));
  stats['hp:max'] = makeStat('hp:max', 'Hit Points', hpContribs);

  // AC
  const dexToAc = (() => {
    const cap = maxDexBonus(doc);
    return cap === null ? mods.dex : Math.min(mods.dex, cap);
  })();
  const acContribs: Contribution[] = [
    { type: 'base', value: 10, note: 'Base' },
    ...unconds('ac'),
    { type: 'base', value: dexToAc, note: 'Dex modifier' + (dexToAc !== mods.dex ? ' (capped by armor)' : '') },
    { type: 'size', value: sizeAcAtk, note: 'Size' },
  ];
  stats['ac'] = makeStat('ac', 'Armor Class', acContribs, conds('ac'));
  // Touch = no armor/shield/natural
  stats['ac:touch'] = makeStat('ac:touch', 'Touch AC', [
    { type: 'base', value: 10, note: 'Base' },
    { type: 'base', value: dexToAc, note: 'Dex modifier' },
    { type: 'size', value: sizeAcAtk, note: 'Size' },
    ...unconds('ac').filter((c) => c.type === 'dodge' || c.type === 'deflection'),
  ]);
  // Flat-footed = no Dex, no dodge
  stats['ac:ff'] = makeStat('ac:ff', 'Flat-footed AC', [
    { type: 'base', value: 10, note: 'Base' },
    ...unconds('ac').filter((c) => c.type !== 'dodge'),
    { type: 'size', value: sizeAcAtk, note: 'Size' },
  ]);

  // Saves
  const saveAbility: Record<'fort' | 'ref' | 'will', Ability> = { fort: 'con', ref: 'dex', will: 'wis' };
  for (const sv of ['fort', 'ref', 'will'] as const) {
    const good = klass?.goodSaves.includes(sv) ?? false;
    const contribs: Contribution[] = [
      { type: 'base', value: klass ? saveBase(good, level) : 0, note: `${klass?.name ?? 'Class'} base (${good ? 'good' : 'poor'})` },
      { type: 'base', value: mods[saveAbility[sv]], note: `${saveAbility[sv].toUpperCase()} modifier` },
      ...unconds(`save:${sv}`),
      ...unconds('save:all'),
    ];
    const annotations = [...conds(`save:${sv}`), ...conds('save:all')];
    stats[`save:${sv}`] = makeStat(`save:${sv}`, sv === 'fort' ? 'Fortitude' : sv === 'ref' ? 'Reflex' : 'Will', contribs, annotations);
  }

  // BAB, initiative, CMB, CMD
  stats['bab'] = makeStat('bab', 'Base Attack Bonus', [{ type: 'base', value: bab, note: `${klass?.name ?? 'Class'} level ${level}` }]);
  stats['init'] = makeStat('init', 'Initiative', [
    { type: 'base', value: mods.dex, note: 'Dex modifier' },
    ...unconds('init'),
  ]);
  const cmbSize = size === 'small' ? -1 : 0;
  stats['cmb'] = makeStat('cmb', 'CMB', [
    { type: 'base', value: bab, note: 'BAB' },
    { type: 'base', value: mods.str, note: 'Str modifier' },
    { type: 'size', value: cmbSize, note: 'Size' },
    ...unconds('cmb'),
  ]);
  stats['cmd'] = makeStat('cmd', 'CMD', [
    { type: 'base', value: 10, note: 'Base' },
    { type: 'base', value: bab, note: 'BAB' },
    { type: 'base', value: mods.str, note: 'Str modifier' },
    { type: 'base', value: mods.dex, note: 'Dex modifier' },
    { type: 'size', value: cmbSize, note: 'Size' },
    ...unconds('cmd'),
  ], conds('cmd'));

  // Melee / ranged attack
  stats['attack:melee'] = makeStat('attack:melee', 'Melee attack', [
    { type: 'base', value: bab, note: 'BAB' },
    { type: 'base', value: mods.str, note: 'Str modifier' },
    { type: 'size', value: sizeAcAtk, note: 'Size' },
    ...unconds('attack:melee'),
  ], conds('attack:melee'));
  stats['attack:ranged'] = makeStat('attack:ranged', 'Ranged attack', [
    { type: 'base', value: bab, note: 'BAB' },
    { type: 'base', value: mods.dex, note: 'Dex modifier' },
    { type: 'size', value: sizeAcAtk, note: 'Size' },
    ...unconds('attack:ranged'),
  ]);

  // ---- Skills ----
  const acp = armorCheckPenalty(doc);
  const classSkillSet = new Set<string>(klass?.classSkills ?? []);
  // Bloodline / trait class-skill grants
  for (const bl of dec.classChoices['bloodline'] ?? []) {
    const b = C.bloodlineById.get(bl);
    if (b) classSkillSet.add(b.classSkill);
  }
  const racialSkillPerLevel = standard.reduce((n, t) => n + (t.skillRanksPerLevel ?? 0), 0);
  // Skill-rank budget summed over levels 1..N, using the Int modifier as of each level (an
  // Int increase at level 4 raises ranks from level 4 onward), + the favored-class skill bonuses.
  const skillRanksTotal = (() => {
    if (!klass) return 0;
    let total = 0;
    for (let l = 1; l <= level; l++) {
      const intAtL = abilityMod(finalAbilities(dec, l).int);
      total += Math.max(1, klass.skillRanks + intAtL + racialSkillPerLevel);
    }
    return total + fcbSkillCount;
  })();
  const skillIds = C.SKILLS.map((s) => s.id);
  const classSkillIds: string[] = [];
  const acpSkillIds: string[] = [];
  for (const sk of C.SKILLS) {
    const ranks = dec.skillRanks[sk.id] ?? 0;
    const isClass = classSkillSet.has(sk.id);
    if (isClass) classSkillIds.push(sk.id);
    if (sk.acp) acpSkillIds.push(sk.id);
    const contribs: Contribution[] = [
      { type: 'base', value: ranks, note: `${ranks} rank${ranks === 1 ? '' : 's'}` },
      { type: 'base', value: mods[sk.ability], note: `${sk.ability.toUpperCase()} modifier` },
    ];
    if (isClass && ranks > 0) contribs.push({ type: 'base', value: 3, note: 'Class skill' });
    if (sk.acp && acp.total < 0) contribs.push({ type: 'penalty', value: acp.total, note: `Armor check penalty (${acp.sources.join(', ')})` });
    if (sk.id === 'stealth' && size === 'small') contribs.push({ type: 'size', value: 4, note: 'Size (Small)' });
    contribs.push(...unconds(`skill:${sk.id}`));
    stats[`skill:${sk.id}`] = makeStat(`skill:${sk.id}`, sk.name, contribs, conds(`skill:${sk.id}`));
  }
  const skillRanksSpent = Object.values(dec.skillRanks).reduce((a, b) => a + b, 0);

  // ---- Encumbrance ----
  const strScore = abilities.str;
  const carry = carryingCapacity(strScore);
  let load = 0;
  for (const [id, qty] of Object.entries(doc.purchases)) {
    const item = C.anyItemById(id);
    if (item) load += item.weight * qty;
  }
  const loadLabel = load <= carry.light ? 'Light' : load <= carry.medium ? 'Medium' : load <= carry.heavy ? 'Heavy' : 'Overloaded';

  // Land speed reduction from medium/heavy armor or a medium/heavy load (PF1e), unless the race
  // is exempt (Slow and Steady). Reduction = round-down-to-5(base / 3); e.g. 30→20, 20→15.
  const armorForSpeed = doc.equipped.armor ? C.armorById.get(doc.equipped.armor) : null;
  const encumberingArmor = armorForSpeed?.category === 'medium' || armorForSpeed?.category === 'heavy';
  const encumberingLoad = loadLabel === 'Medium' || loadLabel === 'Heavy' || loadLabel === 'Overloaded';
  const baseSpeed = race?.speed ?? 30;
  const speedReduced = !race?.speedNeverReduced && (encumberingArmor || encumberingLoad);
  const effectiveSpeed = speedReduced ? baseSpeed - Math.floor(baseSpeed / 3 / 5) * 5 : baseSpeed;

  // ---- Gold ----
  let startGold = klass?.startingGold ?? 0;
  for (const tid of dec.traits) {
    const t = C.traitById.get(tid);
    if (t?.bonusGold) startGold = t.bonusGold;
  }
  const gold = Math.round((startGold - doc.goldSpent) * 100) / 100;

  // ---- Caster level + spell slots ----
  const sc = klass?.spellcasting;
  const spellTable = sc ? spellTableFor(sc) : undefined;
  const spellSlots = sc ? spellSlotsPerDay(spellTable, level, mods[sc.ability]) : undefined;
  const spellsKnown = sc && sc.kind === 'spontaneous' ? spellsKnownPerLevel(spellTable, level) : undefined;

  // ---- Per-level advancement table ----
  const featSlotKeys = featSlots(dec, race, klass, level);
  const progression: ProgressionRow[] = [];
  if (klass) {
    for (let l = 1; l <= level; l++) {
      progression.push({
        level: l,
        bab: babAt(klass.bab, l),
        fort: saveBase(klass.goodSaves.includes('fort'), l),
        ref: saveBase(klass.goodSaves.includes('ref'), l),
        will: saveBase(klass.goodSaves.includes('will'), l),
        features: classFeaturesUpTo(klass, l).filter((f) => f.level === l).map((f) => f.name),
        featSlots: featSlotKeys.filter((fs) => fs.level === l).map((fs) => fs.label),
        abilityIncrease: dec.abilityIncreases[l],
        hp: l === 1 ? klass.hitDie : (dec.hpRolls[l] ?? fixedHpPerLevel(klass.hitDie)),
      });
    }
  }

  // ---- Slots + issues ----
  const { slots, issues } = buildSlotsAndIssues(doc, dec, {
    race, klass, abilities, mods, predCtx, skillRanksTotal, skillRanksSpent,
    standard, alternates, gold, load, carry, activeAcp: acp.total, level,
  });

  const steps = deriveSteps(klass);

  const summaryLine = [
    dec.alignment ?? '',
    race?.name ?? '',
    klass ? `${klass.name} ${level}` : '',
  ].filter(Boolean).join(' ');

  const sheet: Sheet = {
    level,
    stats, skillIds, classSkillIds, acpSkillIds,
    skillRanksTotal, skillRanksSpent,
    gold,
    load: { current: load, light: carry.light, medium: carry.medium, heavy: carry.heavy, label: loadLabel },
    speed: { base: effectiveSpeed, ...(speedReduced ? { reducedFrom: baseSpeed } : {}), ...(race?.speeds ?? {}) },
    ...(sc && clvl > 0 ? { casterLevel: clvl, spellSlots } : {}),
    ...(spellsKnown && spellsKnown.length ? { spellsKnown } : {}),
    progression,
    summaryLine,
  };
  return { sheet, slots, issues, steps };
}

function fmtSigned(v: number): string { return v >= 0 ? `+${v}` : `−${Math.abs(v)}`; }

function carryingCapacity(str: number): { light: number; medium: number; heavy: number } {
  // Core carrying-capacity table (heavy load column), medium/light = /2, /3 rounded.
  const table: Record<number, number> = {
    1: 10, 2: 20, 3: 30, 4: 40, 5: 50, 6: 60, 7: 70, 8: 80, 9: 90, 10: 100,
    11: 115, 12: 130, 13: 150, 14: 175, 15: 200, 16: 230, 17: 260, 18: 300, 19: 350, 20: 400,
    21: 460, 22: 520, 23: 600, 24: 700, 25: 800,
  };
  const heavy = table[Math.max(1, Math.min(25, str))] ?? 100;
  return { light: Math.floor(heavy / 3), medium: Math.floor((heavy * 2) / 3), heavy };
}

function deriveSteps(klass?: C.ClassDef): string[] {
  const steps = ['basics', 'race', 'class', 'advancement', 'skills', 'feats'];
  // Only classes that make a spell selection at creation get a Spells step. Prepared-list
  // divine casters (cleric, druid, warpriest) prepare from their whole list daily — nothing
  // to choose at level 1 — so they get no creation-time Spells step.
  // Four-level casters (paladin/ranger/bloodrager) gain no spells at 1st level, so they get no
  // creation-time spell step even when spontaneous.
  const sc = klass?.spellcasting;
  if (sc && sc.progression !== 'four' && (sc.kind === 'prepared-book' || sc.kind === 'spontaneous')) steps.push('spells');
  steps.push('equipment', 'review');
  return steps;
}

interface SlotCtx {
  race?: C.RaceDef;
  klass?: C.ClassDef;
  abilities: Record<Ability, number>;
  mods: Record<Ability, number>;
  predCtx: PredicateCtx;
  skillRanksTotal: number;
  skillRanksSpent: number;
  standard: C.RacialTraitDef[];
  alternates: C.AltTraitDef[];
  gold: number;
  load: number;
  carry: { light: number; medium: number; heavy: number };
  activeAcp: number;
  level: number;
}

function buildSlotsAndIssues(
  doc: CharacterDoc, dec: Decisions, ctx: SlotCtx,
): { slots: ChoiceSlot[]; issues: Issue[] } {
  const slots: ChoiceSlot[] = [];
  const issues: Issue[] = [];
  const { race, klass, predCtx } = ctx;

  // ---------- BASICS ----------
  const method = doc.abilityMethod;
  if (method in POINT_BUY_TOTAL) {
    const spent = ABILITIES.reduce((a, ab) => a + (POINT_BUY_COST[dec.abilityBase[ab]] ?? 0), 0);
    const left = POINT_BUY_TOTAL[method] - spent;
    if (left > 0) issues.push({ severity: 'warning', step: 'basics', slot: 'ability-base', message: `${left} point-buy point${left === 1 ? '' : 's'} unspent` });
    if (left < 0) issues.push({ severity: 'error', step: 'basics', slot: 'ability-base', message: `Over budget by ${-left} point-buy point${left === -1 ? '' : 's'}` });
  }

  // Alignment / deity / class triangle
  if (dec.alignment && klass?.alignment && !klass.alignment.includes(dec.alignment)) {
    issues.push({
      severity: 'error', step: 'basics', slot: 'alignment',
      message: `Alignment ${dec.alignment} conflicts with ${klass.name} (requires ${klass.alignment.join(' / ')})`,
    });
  }
  if (dec.deityId && dec.alignment) {
    const deity = C.deityById.get(dec.deityId);
    if (deity && deity.id !== 'none' && !withinOneStep(dec.alignment, deity.alignment)) {
      issues.push({
        severity: 'warning', step: 'basics', slot: 'deity',
        message: `${deity.name} (${deity.alignment}) is more than one step from your alignment ${dec.alignment}`,
      });
    }
  }

  // ---------- RACE: alternate traits ----------
  if (race) {
    const chosenAlts = new Set(dec.altTraits);
    const replacedByChosen = new Map<string, string>(); // standardTraitId -> altName
    for (const a of race.altTraits) if (chosenAlts.has(a.id)) for (const r of a.replaces) replacedByChosen.set(r, a.name);

    const altOptions: SlotOption[] = race.altTraits.map((a) => {
      const selected = chosenAlts.has(a.id);
      // Hard-illegal: another *chosen* alt already replaces one of this alt's targets.
      const clash = a.replaces.find((r) => replacedByChosen.has(r) && replacedByChosen.get(r) !== a.name);
      const legal = selected || !clash;
      // would-invalidate: replacing a standard trait that a granted feat-slot decision depends on.
      const wouldInvalidate = altWouldInvalidate(a, dec);
      return {
        id: a.id, name: a.name, desc: a.desc, legal,
        whyNot: !legal ? `Replaces ${displayName(clash!)}, already replaced by ${replacedByChosen.get(clash!)}` : undefined,
        wouldInvalidate: wouldInvalidate.length ? wouldInvalidate : undefined,
        meta: { replaces: a.replaces.map(displayName).join(', ') },
      };
    });
    slots.push({ id: 'alt-traits', step: 'race', label: 'Alternate racial traits', count: race.altTraits.length, multi: true, selected: [...chosenAlts], options: altOptions });

    // Floating ability bonus slot
    if (race.abilityMods === 'choice') {
      slots.push({
        id: 'floating-bonus', step: 'basics', label: `${race.name}: +2 to ${dualTalent(dec) ? 'two abilities' : 'one ability'}`,
        count: dualTalent(dec) ? 2 : 1, multi: dualTalent(dec),
        selected: dec.floatingBonus, options: ABILITIES.map((ab) => ({ id: ab, name: ab.toUpperCase(), legal: true })),
      });
      if (dec.floatingBonus.length < (dualTalent(dec) ? 2 : 1))
        issues.push({ severity: 'info', step: 'basics', slot: 'floating-bonus', message: `Choose ${race.name}'s +2 ability bonus` });
    }
  } else {
    issues.push({ severity: 'info', step: 'race', slot: 'race', message: 'Choose a race' });
  }

  // ---------- CLASS choices ----------
  if (!klass) {
    issues.push({ severity: 'info', step: 'class', slot: 'class', message: 'Choose a class' });
  } else {
    for (const ch of klass.choices ?? []) {
      // Universalist wizard → no opposition slot.
      if (ch.kind === 'wizard-opposition' && (dec.classChoices['school'] ?? []).includes('universalist')) continue;
      const options = classChoiceOptions(ch, dec);
      // A choice may recur across levels (e.g. a talent at 2, 4, 6…). Level-1 grants keep the
      // bare key; later grants are suffixed `<id>-L<level>`.
      for (const gLvl of (ch.levels ?? [1])) {
        if (gLvl > ctx.level) continue;
        const slotId = gLvl === 1 ? ch.id : `${ch.id}-L${gLvl}`;
        const selected = dec.classChoices[slotId] ?? [];
        const label = gLvl === 1 ? ch.label : `${ch.label} (level ${gLvl})`;
        slots.push({ id: slotId, step: 'class', label, count: ch.count, multi: ch.count > 1, selected, options });
        if (selected.length < ch.count)
          issues.push({ severity: 'info', step: 'class', slot: slotId, message: `Choose ${label.toLowerCase()} (${selected.length}/${ch.count})` });
      }
    }
    // Favored class + per-level favored-class bonus
    if (!dec.favoredClass) {
      issues.push({ severity: 'info', step: 'class', slot: 'favored-class', message: 'Pick your favored class' });
    } else if (dec.favoredClass === dec.classId) {
      let unset = 0;
      for (let l = 1; l <= ctx.level; l++) if (!(dec.fcbByLevel[l] ?? dec.fcbChoice)) unset++;
      if (unset > 0)
        issues.push({
          severity: 'info', step: 'advancement', slot: 'fcb',
          message: unset >= ctx.level ? 'Choose your favored class bonus (+1 HP or +1 skill rank per level)' : `${unset} level${unset === 1 ? '' : 's'} have no favored class bonus chosen`,
        });
    }
  }

  // ---------- SKILLS ----------
  const ranksLeft = ctx.skillRanksTotal - ctx.skillRanksSpent;
  if (klass) {
    if (ranksLeft > 0) issues.push({ severity: 'warning', step: 'skills', slot: 'skill-ranks', message: `${ranksLeft} skill rank${ranksLeft === 1 ? '' : 's'} unspent` });
    if (ranksLeft < 0) issues.push({ severity: 'error', step: 'skills', slot: 'skill-ranks', message: `${-ranksLeft} skill rank${ranksLeft === -1 ? '' : 's'} over budget` });
    for (const [sid, r] of Object.entries(dec.skillRanks)) {
      if (r > ctx.level) issues.push({ severity: 'error', step: 'skills', slot: `skill:${sid}`, message: `${displayName(sid)}: ${r} ranks exceeds the max of ${ctx.level} (character level)` });
    }
  }

  // ---------- FEATS ----------
  const featSlotKeys = featSlots(dec, race, klass, ctx.level);
  const featOptions: SlotOption[] = C.FEATS.map((f) => {
    const legal = !f.prerequisites || evalPredicate(f.prerequisites, predCtx);
    return {
      id: f.id, name: f.name, desc: f.benefit, tags: f.types, legal,
      whyNot: !legal && f.prerequisites ? explainFailure(f.prerequisites, predCtx, displayName) ?? undefined : undefined,
      meta: { req: f.reqText },
    };
  });
  for (const fs of featSlotKeys) {
    slots.push({
      id: fs.key, step: 'feats', label: fs.label, count: 1, multi: false,
      selected: dec.feats[fs.key] ? [dec.feats[fs.key]!] : [],
      options: fs.combatOnly ? featOptions.filter((o) => C.featById.get(o.id)?.types.includes('combat')) : featOptions,
    });
    if (!dec.feats[fs.key]) issues.push({ severity: 'info', step: 'feats', slot: fs.key, message: `${fs.label}: empty` });
  }
  // Broken prereqs on already-selected feats (upstream edit)
  for (const [key, fid] of Object.entries(dec.feats)) {
    if (!fid) continue;
    // Feats keyed for a level above the target are suspended (see the advancement notice),
    // not orphaned — don't raise prerequisite/orphan errors for them.
    const keyLvl = key.match(/-L(\d+)$/);
    if (keyLvl && Number(keyLvl[1]) > ctx.level) continue;
    const f = C.featById.get(fid);
    if (f?.prerequisites && !evalPredicate(f.prerequisites, predCtx)) {
      issues.push({ severity: 'error', step: 'feats', slot: key, clearSlot: `feats.${key}`, message: `${f.name}: ${explainFailure(f.prerequisites, predCtx, displayName)}` });
    }
    // Orphaned: feat sits in a slot that no longer exists (e.g. Focused Study removed human feat slot).
    if (!featSlotKeys.some((fs) => fs.key === key)) {
      issues.push({ severity: 'error', step: 'feats', slot: key, clearSlot: `feats.${key}`, message: `Decision orphaned: "${f?.name ?? fid}" — its slot was removed by an earlier choice` });
    }
  }

  // ---------- ADVANCEMENT (per-level picks) ----------
  if (klass) {
    for (const l of abilityIncreaseLevels(ctx.level)) {
      if (!dec.abilityIncreases[l])
        issues.push({ severity: 'info', step: 'advancement', slot: `ability-increase-L${l}`, message: `Choose your level-${l} ability score increase` });
    }
    const suspended = countSuspendedAboveLevel(dec, ctx.level);
    if (suspended > 0)
      issues.push({ severity: 'info', step: 'advancement', slot: 'level', message: `${suspended} decision${suspended === 1 ? '' : 's'} for levels above ${ctx.level} are suspended — they return if you level back up` });
  }

  // ---------- TRAITS ----------
  const traitDefs = dec.traits.map((t) => C.traitById.get(t)).filter(Boolean) as C.TraitDef[];
  const cats = traitDefs.map((t) => t.category);
  const dupCat = cats.find((c, i) => cats.indexOf(c) !== i);
  if (dupCat) issues.push({ severity: 'error', step: 'feats', slot: 'traits', message: `Two traits share the ${dupCat} category — pick different categories` });
  const traitBudget = 2 + (dec.drawback ? 1 : 0);
  if (dec.traits.length > traitBudget) issues.push({ severity: 'error', step: 'feats', slot: 'traits', message: `${dec.traits.length} traits selected, only ${traitBudget} allowed` });

  // ---------- SPELLS ----------
  if (klass?.spellcasting && klass.spellcasting.progression !== 'four') {
    const sc = klass.spellcasting;
    const listSpells = C.SPELLS.filter((s) => s.lists.includes(sc.list as C.SpellDef['lists'][number]));
    if (sc.kind === 'prepared-book') {
      const picks1 = 3 + Math.max(0, ctx.mods.int);
      const opposed = new Set((dec.classChoices['opposition'] ?? []).map((o) => C.schoolById.get(o)?.name ?? o));
      const lvl1 = listSpells.filter((s) => s.level === 1);
      slots.push({
        id: 'spell-picks', step: 'spells', label: `1st-level spellbook (${dec.spellPicks.length}/${picks1})`, count: picks1, multi: true,
        selected: dec.spellPicks,
        options: lvl1.map((s) => ({
          id: s.id, name: s.name, desc: s.summary, tags: [s.school],
          legal: true, caution: opposed.has(s.school) ? 'opposed — double slot' : undefined,
          meta: { level: s.level, school: s.school },
        })),
      });
      if (dec.spellPicks.length < picks1)
        issues.push({ severity: 'info', step: 'spells', slot: 'spell-picks', message: `Add ${picks1 - dec.spellPicks.length} more spell(s) to your spellbook` });
      for (const pid of dec.spellPicks) {
        const sp = C.spellById.get(pid);
        if (sp && opposed.has(sp.school))
          issues.push({ severity: 'info', step: 'spells', slot: 'spell-picks', message: `${sp.name} is from an opposition school — it will cost two slots to prepare` });
      }
    } else if (sc.kind === 'spontaneous') {
      const known1 = (sc.known1?.[1] ?? 0);
      const lvl1 = listSpells.filter((s) => s.level === 1);
      slots.push({
        id: 'spell-picks', step: 'spells', label: `1st-level spells known (${dec.spellPicks.length}/${known1})`, count: known1, multi: true,
        selected: dec.spellPicks,
        options: lvl1.map((s) => ({ id: s.id, name: s.name, desc: s.summary, tags: [s.school], legal: true, meta: { level: s.level, school: s.school } })),
      });
      if (dec.spellPicks.length < known1)
        issues.push({ severity: 'info', step: 'spells', slot: 'spell-picks', message: `Choose ${known1 - dec.spellPicks.length} more spell(s) known` });
    }
  }

  // ---------- LANGUAGES ----------
  if (race) {
    const bonusCount = Math.max(0, ctx.mods.int);
    if (bonusCount > 0) {
      slots.push({
        id: 'languages', step: 'basics', label: `Bonus languages (Int)`, count: bonusCount, multi: true,
        selected: dec.languages,
        options: race.languagesBonus.map((l) => ({ id: l, name: cap(l), legal: true })),
      });
    }
  }

  // ---------- EQUIPMENT ----------
  if (ctx.load > ctx.carry.heavy)
    issues.push({ severity: 'warning', step: 'equipment', slot: 'load', message: `Overloaded: ${ctx.load} lb exceeds your heavy load of ${ctx.carry.heavy} lb` });
  if (ctx.gold < 0)
    issues.push({ severity: 'error', step: 'equipment', slot: 'gold', message: `Overspent by ${-ctx.gold} gp` });

  // ---------- REPEATED-PICK UNIQUENESS ----------
  // A recurring subsystem choice (rage power at 2/4/6…, hex, talent, arcana…) may not select the
  // same option twice across its per-level slots. Slots share a series once their `-L<n>` suffix
  // is stripped; flag any option chosen in more than one slot of the same series.
  const seriesPicks = new Map<string, Map<string, number>>(); // seriesId -> optionId -> count
  for (const slot of slots) {
    if (slot.auto || slot.id.startsWith('feat')) continue;
    const series = slot.id.replace(/-L\d+$/, '');
    const counts = seriesPicks.get(series) ?? new Map<string, number>();
    for (const sel of slot.selected) counts.set(sel, (counts.get(sel) ?? 0) + 1);
    seriesPicks.set(series, counts);
  }
  for (const [series, counts] of seriesPicks) {
    for (const [optId, n] of counts) {
      if (n <= 1) continue;
      const slot = slots.find((s) => s.id === series || s.id.startsWith(`${series}-L`));
      const optName = slot?.options.find((o) => o.id === optId)?.name ?? optId;
      issues.push({
        severity: 'error', step: slot?.step ?? 'class', slot: series,
        message: `${slot?.label ?? series}: "${optName}" is chosen ${n} times — each may be taken only once`,
      });
    }
  }

  // ---------- GENERIC SLOT INTEGRITY ----------
  // Catch decisions that became over-count or reference now-illegal/removed options after an
  // upstream change: dropping Dual Talent (2 ability picks → 1 allowed), changing deity
  // (domains/blessings no longer granted), reusing a school as its own opposition, or lowering
  // Int (spellbook/languages shrink). Feat slots are excluded — orphan/prerequisite handling
  // above already covers them, and would double-report here.
  for (const slot of slots) {
    if (slot.auto || slot.id.startsWith('feat')) continue;
    if (slot.selected.length > slot.count) {
      const excess = slot.selected.length - slot.count;
      issues.push({
        severity: 'error', step: slot.step, slot: slot.id,
        message: `${slot.label}: ${slot.selected.length} selected but only ${slot.count} allowed — remove ${excess}`,
      });
    }
    for (const selId of slot.selected) {
      const opt = slot.options.find((o) => o.id === selId);
      if (!opt) {
        issues.push({
          severity: 'error', step: slot.step, slot: slot.id,
          message: `${slot.label}: a selected option is no longer available — reselect`,
        });
      } else if (!opt.legal) {
        issues.push({
          severity: 'error', step: slot.step, slot: slot.id,
          message: `${slot.label}: ${opt.name} is no longer allowed${opt.whyNot ? ` — ${opt.whyNot}` : ''}`,
        });
      }
    }
  }

  // Sort issues: severity then step order.
  const sevRank = { error: 0, warning: 1, info: 2 };
  const stepOrder = deriveSteps(klass);
  issues.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || stepOrder.indexOf(a.step) - stepOrder.indexOf(b.step));

  return { slots, issues };
}

// ---- helpers ----

function withinOneStep(a: Alignment, b: Alignment): boolean {
  const axis = (al: Alignment): [number, number] => {
    const lc = al.includes('L') ? -1 : al.includes('C') ? 1 : 0;
    const ge = al.includes('G') ? -1 : al.includes('E') ? 1 : 0;
    return [lc, ge];
  };
  const [la, ga] = axis(a);
  const [lb, gb] = axis(b);
  return Math.abs(la - lb) + Math.abs(ga - gb) <= 1;
}

function dualTalent(dec: Decisions): boolean {
  return dec.altTraits.includes('human-dual-talent');
}

interface FeatSlotKey { key: string; label: string; combatOnly?: boolean; level: number; }

/** All feat slots opened up through `level`: a general feat at each odd level, racial bonus
 *  feat(s) at level 1, and class bonus feats at the class's `bonusFeats.levels`. Level-1 keys
 *  keep their bare form (`feat-1`, `feat-<class>`) for back-compat; later levels are suffixed. */
function featSlots(dec: Decisions, race: C.RaceDef | undefined, klass: C.ClassDef | undefined, level: number): FeatSlotKey[] {
  const out: FeatSlotKey[] = [];
  for (const l of generalFeatLevels(level))
    out.push({ key: l === 1 ? 'feat-1' : `feat-L${l}`, label: `${ordinal(l)}-level feat`, level: l });
  const { standard, alternates } = activeRacialTraits(dec);
  for (const t of [...standard, ...alternates])
    if (t.grantsFeatSlot) out.push({ key: t.grantsFeatSlot, label: `${race?.name ?? 'Racial'} bonus feat`, level: 1 });
  if (klass?.bonusFeats) {
    const label = `${klass.bonusFeats.label ?? `${klass.name} bonus feat`}${klass.bonusFeats.combatOnly ? ' · combat only' : ''}`;
    for (const l of klass.bonusFeats.levels) {
      if (l > level) continue;
      out.push({ key: l === 1 ? `feat-${klass.id}` : `feat-${klass.id}-L${l}`, label, combatOnly: klass.bonusFeats.combatOnly, level: l });
    }
  }
  return out;
}

/** How many stored decisions belong to levels above the current target (suspended, not lost). */
function countSuspendedAboveLevel(dec: Decisions, level: number): number {
  let n = 0;
  const lvlOf = (k: string): number | null => { const m = k.match(/-L(\d+)$/); return m ? Number(m[1]) : null; };
  for (const [k, v] of Object.entries(dec.feats)) { const l = lvlOf(k); if (l && l > level && v) n++; }
  for (const [k, v] of Object.entries(dec.classChoices)) { const l = lvlOf(k); if (l && l > level && Array.isArray(v) && v.length) n++; }
  for (const k of Object.keys(dec.abilityIncreases)) if (Number(k) > level) n++;
  for (const k of Object.keys(dec.hpRolls)) if (Number(k) > level) n++;
  return n;
}

/** Would selecting this alt trait orphan a feat sitting in a soon-removed slot? */
function altWouldInvalidate(a: C.AltTraitDef, dec: Decisions): { slotLabel: string; decisionName: string }[] {
  const out: { slotLabel: string; decisionName: string }[] = [];
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  if (!race) return out;
  // Find standard traits this alt replaces that currently grant a feat slot that is filled.
  for (const rid of a.replaces) {
    const std = race.traits.find((t) => t.id === rid);
    if (std?.grantsFeatSlot && dec.feats[std.grantsFeatSlot]) {
      const fid = dec.feats[std.grantsFeatSlot]!;
      out.push({ slotLabel: `${race.name} bonus feat`, decisionName: C.featById.get(fid)?.name ?? fid });
    }
  }
  return out;
}

function classChoiceOptions(ch: C.ClassChoiceDef, dec: Decisions): SlotOption[] {
  switch (ch.kind) {
    case 'wizard-school':
      return C.SCHOOLS.map((s) => ({ id: s.id, name: s.name, desc: s.desc, legal: true }));
    case 'wizard-opposition': {
      const school = (dec.classChoices['school'] ?? [])[0];
      const chosenOpp = dec.classChoices['opposition'] ?? [];
      return C.SCHOOLS.filter((s) => s.id !== 'universalist' && s.id !== school).map((s) => ({
        id: s.id, name: s.name, desc: s.desc,
        legal: true,
        caution: chosenOpp.includes(s.id) ? undefined : undefined,
      }));
    }
    case 'arcane-bond':
      return [
        { id: 'familiar', name: 'Familiar', desc: 'A magical animal companion that grants a skill or save bonus.', legal: true },
        { id: 'bonded-object', name: 'Bonded object', desc: 'An amulet, ring, staff, wand, or weapon you can cast through.', legal: true },
      ];
    case 'cleric-domains':
    case 'warpriest-blessings': {
      // Warpriest blessings are chosen from the deity's domains — same filter as cleric domains.
      const noun = ch.kind === 'warpriest-blessings' ? 'blessing' : 'domain';
      const deity = dec.deityId ? C.deityById.get(dec.deityId) : undefined;
      const allowed = deity && deity.id !== 'none' ? new Set(deity.domains) : null;
      return C.DOMAINS.map((d) => ({
        id: d.id, name: d.name, desc: d.desc,
        legal: allowed ? allowed.has(d.id) : true,
        whyNot: allowed && !allowed.has(d.id) ? `${deity!.name} does not grant the ${d.name} ${noun}` : undefined,
      }));
    }
    case 'sorcerer-bloodline':
      return C.BLOODLINES.map((b) => ({ id: b.id, name: b.name, desc: b.desc, legal: true, meta: { classSkill: b.classSkill } }));
    case 'list':
      return (ch.options ?? []).map((o) => ({ id: o.id, name: o.name, desc: o.desc, legal: true }));
    default:
      return [];
  }
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

// Re-export for other modules.
export { activeRacialTraits, finalAbilities };
