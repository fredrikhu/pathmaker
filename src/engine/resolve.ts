import * as C from '../content/index';
import type {
  Ability, Alignment, CharacterDoc, ChoiceSlot, Effect, Issue, Resolution,
  Sheet, SlotOption, Stat,
} from './types';
import type { AttackLine, BreakdownLine, CastingBlock, ConditionalBonus, DamageReduction, Defenses, EnergyAbsorption, EnergyResistance, GrantedFeat, InventoryItem, PlayState, ProgressionRow, ResourcePool } from './types';
import { ABILITIES, abilityMod } from './types';
import { evalPredicate, explainFailure, type PredicateCtx } from './predicates';
import { stack, type Contribution } from './stack';
import {
  armorCheckPenaltyReduction, armorQualityBonus, compositeBowEffect, qualityCost, qualityPrefix,
  qualityProblem, strRating, strRatingCost,
  weaponQualityBonus, type ItemQuality, type PropertyPrice,
} from './items';
import {
  saveBase, fixedHpPerLevel, generalFeatLevels, abilityIncreaseLevels,
  casterLevel, spellSlotsPerDay, spellsKnownPerLevel, startingWealth, sumBab, sumSave, spellsPreparedPerLevel, type SpellTable,
} from './progression';
import { powerAttackAmounts, twoWeaponPenalties, offHandAttackBonuses, type PowerAttackScale } from './combat';

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
const spellLevelLabel = (L: number): string => (L === 0 ? 'Cantrips' : `${ordinal(L)}-level spells`);

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
  /** The class taken at each character level (index 0 = level 1). Entries may be absent, in
   *  which case that level falls back to `classId` — so single-class documents store nothing. */
  classLevels: (string | null)[];
  favoredClass: string | null;
  fcbChoice: 'hp' | 'skill' | null; // overall default for levels without a per-level pick
  fcbByLevel: Record<number, 'hp' | 'skill'>;
  classChoices: Record<string, string[]>; // slotSuffix -> selected ids
  feats: Record<string, string | null>; // slotKey -> featId
  traits: string[];
  drawback: string | null;
  skillRanks: Record<string, number>;
  languages: string[];
  spellPicks: Record<number, string[]>; // spell level -> chosen spell ids
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
    classLevels: get<(string | null)[]>('class-levels', []),
    favoredClass: get<string | null>('favored-class', null),
    fcbChoice: get<'hp' | 'skill' | null>('fcb', null),
    fcbByLevel: get<Record<number, 'hp' | 'skill'>>('fcb-by-level', {}),
    classChoices: get<Record<string, string[]>>('class-choices', {}),
    feats: get<Record<string, string | null>>('feats', {}),
    traits: get<string[]>('traits', []),
    drawback: get<string | null>('drawback', null),
    skillRanks: get<Record<string, number>>('skill-ranks', {}),
    languages: get<string[]>('languages', []),
    // Per spell level. Legacy value was a flat array of 1st-level picks — migrate to { 1: [...] }.
    spellPicks: (() => {
      const raw = d['spell-picks'];
      if (Array.isArray(raw)) return { 1: raw as string[] };
      return (raw as Record<number, string[]>) ?? {};
    })(),
    hpRolls: get<Record<number, number>>('hp-rolls', {}),
    abilityIncreases: get<Record<number, Ability>>('ability-increases', {}),
  };
}

/** Standard traits still active after alternate-trait replacements. */
/** Damage reduction and energy resistance in force, from race, class levels and running buffs.
 *  None of these are stat bonuses — they subtract from damage arriving rather than adding to a
 *  roll — so they are gathered separately from the effect pipeline. */
function gatherDefenses(dec: Decisions, classes: ClassEntry[], play: PlayState | undefined): Defenses {
  const dr: DamageReduction[] = [];
  const resistances: EnergyResistance[] = [];
  const absorb: EnergyAbsorption[] = [];

  const { standard, alternates } = activeRacialTraits(dec);
  for (const t of [...standard, ...alternates]) {
    for (const r of t.energyResistance ?? []) resistances.push({ ...r, note: t.name });
  }

  for (const c of classes) {
    const prog = C.CLASS_PROGRESSION[c.klass.id]?.damageReduction;
    if (!prog) continue;
    // The amount is how many of the listed levels this class has reached: DR 1 at the first,
    // rising by 1 at each one after.
    const amount = prog.levels.filter((l) => l <= c.levels).length;
    if (amount > 0) dr.push({ amount, bypass: prog.bypass, note: `${c.klass.name} ${c.levels}` });
  }

  for (const t of play?.timers ?? []) {
    for (const d of t.dr ?? []) dr.push(d);
    for (const r of t.resistances ?? []) resistances.push(r);
    // A protection-from-energy pool with charge left; `timerId` links it back for depletion.
    if (t.absorb && t.absorb.remaining > 0) {
      absorb.push({ type: t.absorb.type, remaining: t.absorb.remaining, note: labelBase(t.label), timerId: t.id });
    }
  }
  return { dr, resistances, absorb };
}

/** The spell name from a timer label — "Protection from Energy (Fire, CL 6)" → "Protection from
 *  Energy (Fire)" — for a defenses readout that names the ward without the caster-level noise. */
function labelBase(label: string): string {
  return label.replace(/, CL \d+\)/, ')');
}

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
 *  level-1 `features1` fallback while Part B authoring is in progress). Includes source-dependent
 *  abilities fixed by an earlier choice (sorcerer bloodline, cavalier order). */
function classFeaturesUpTo(klass: C.ClassDef | undefined, level: number, dec?: Decisions): C.LeveledFeatureDef[] {
  if (!klass) return [];
  const src: C.LeveledFeatureDef[] = klass.features ?? klass.features1.map((f) => ({ ...f, level: 1 }));
  const extra = dec ? sourceFeatures(dec) : [];
  return [...src, ...extra].filter((f) => f.level <= level).sort((a, b) => a.level - b.level);
}

/** Per-level abilities fixed by a chosen source (bloodline/order) — injected into the progression. */
function sourceFeatures(dec: Decisions): C.LeveledFeatureDef[] {
  const out: C.LeveledFeatureDef[] = [];
  const add = (map: Record<string, C.SourceFeature[]>, sourceId: string | undefined, prefix: string) => {
    const list = sourceId ? map[sourceId] : undefined;
    if (list) for (const p of list) out.push({ level: p.level, id: `${prefix}-${sourceId}-${p.level}`, name: p.name, desc: p.desc });
  };
  if (dec.classId === 'sorcerer') add(C.SORCERER_BLOODLINE_POWERS, dec.classChoices['bloodline']?.[0], 'sorc-bl');
  if (dec.classId === 'cavalier') add(C.CAVALIER_ORDER_ABILITIES, dec.classChoices['order']?.[0], 'cav-ord');
  return out;
}

/** Feat ids sitting in a currently-valid slot. Orphaned feats (slot removed by an
 *  upstream choice) are suspended — they persist as decisions + Issues but contribute
 *  nothing to the sheet until the user resolves them. */
function validFeatIds(dec: Decisions, level: number): string[] {
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  const keys = new Set(featSlots(dec, race, level).map((s) => s.key));
  const chosen = Object.entries(dec.feats)
    .filter(([k, v]) => v && keys.has(k))
    .map(([, v]) => v as string);
  // Class-granted fixed feats count toward the feat set for prerequisites (e.g. monk's Improved
  // Unarmed Strike enabling Stunning Fist, warpriest's Weapon Focus).
  return [...chosen, ...allGrantedFeats(dec, level).map((g) => g.featId)];
}

// Multiclass fan-outs: each class contributes at *its own* level, and the results concatenate.
// Single-class characters get exactly the old single-class result.

function allClassFeatures(dec: Decisions, level: number, withDec = true): C.LeveledFeatureDef[] {
  return classBreakdown(dec, level).flatMap((c) => classFeaturesUpTo(c.klass, c.levels, withDec ? dec : undefined));
}

function allGrantedFeats(dec: Decisions, level: number, params: Record<string, string> = {}): GrantedFeat[] {
  return classBreakdown(dec, level).flatMap((c) => grantedFeatsFor(c.klass, c.levels, params));
}

/** Fixed feats a class confers automatically up through `level`, resolved to display names.
 *  Feats that take a parameter (warpriest's Weapon Focus) carry their option list and current
 *  pick so the Feats step can offer a selector. */
function grantedFeatsFor(klass: C.ClassDef | undefined, level: number, params: Record<string, string> = {}): GrantedFeat[] {
  if (!klass?.grantedFeats) return [];
  return klass.grantedFeats
    .filter((g) => g.level <= level)
    .map((g) => {
      const def = C.featById.get(g.feat);
      const key = grantedParamKey(g.feat, g.level);
      return {
        level: g.level, featId: g.feat, name: def?.name ?? g.feat, note: g.note,
        ...(def?.param ? { param: { key, label: def.param.label, options: def.param.options, value: normalizeParam(g.feat, params[key]) } } : {}),
      };
    });
}

/** Decision key (under `feat-params`) for a class-granted feat's parameter. */
export function grantedParamKey(featId: string, level: number): string {
  return `granted:${featId}:${level}`;
}

function collectEffects(dec: Decisions, doc: CharacterDoc, level: number): Effect[] {
  const effects: Effect[] = [];
  const { standard, alternates } = activeRacialTraits(dec);
  for (const t of [...standard, ...alternates]) if (t.effects) effects.push(...t.effects);

  // Class features gained so far (e.g. druid Nature Sense's +2 to Nature/Survival).
  for (const feat of allClassFeatures(dec, level, false)) if (feat.effects) effects.push(...feat.effects);

  // Feats (orphaned feats suspended — see validFeatIds)
  const featSet = new Set(validFeatIds(dec, level));
  for (const fid of featSet) {
    const f = C.featById.get(fid);
    if (!f?.effects) continue;
    // Toughness scales: +3 HP, plus 1 per Hit Die beyond 3rd (i.e. max(3, character level)).
    if (fid === 'toughness') { effects.push({ target: 'hp:max', type: 'untyped', value: Math.max(3, level), note: 'Toughness' }); continue; }
    effects.push(...f.effects);
  }
  // Parameterised feats whose bonus lands on a specific stat (Skill Focus → that skill).
  effects.push(...paramFeatEffects(doc, dec, level));

  // Worn magic items — only those the body slots can actually support.
  for (const { item, active } of wornItemsWithStatus(doc)) if (active) effects.push(...item.effects);

  // Traits + drawback
  for (const tid of [...dec.traits, dec.drawback].filter(Boolean) as string[]) {
    const t = C.traitById.get(tid);
    if (t?.effects) effects.push(...t.effects);
  }
  // Equipped armor / shield
  const armor = doc.equipped.armor ? C.armorById.get(doc.equipped.armor) : null;
  const shield = doc.equipped.offHand ? C.armorById.get(doc.equipped.offHand) : null;
  if (armor) effects.push({ target: 'ac', type: 'armor', value: armor.acBonus, note: `${armor.name} (armor)` });
  if (shield && shield.slot === 'shield') {
    // Shield Focus increases the AC bonus granted by the shield rather than adding a separate
    // shield bonus — so it is folded into this effect's value (a separate 'shield'-type bonus would
    // be shadowed by the shield's own, both being highest-wins). Greater Shield Focus adds one more.
    const shieldFocus = (featSet.has('shield-focus') ? 1 : 0) + (featSet.has('greater-shield-focus') ? 1 : 0);
    effects.push({ target: 'ac', type: 'shield', value: shield.acBonus + shieldFocus,
      note: `${shield.name} (shield)${shieldFocus ? ` +${shieldFocus} Shield Focus` : ''}` });
  }
  // Magic armour/shield: the enhancement is its own bonus type, so it stacks with the item's own
  // armour or shield bonus.
  const quality = itemQuality(doc);
  for (const [slotId, item] of [[doc.equipped.armor, armor], [doc.equipped.offHand, shield]] as const) {
    if (!slotId || !item) continue;
    const enh = armorQualityBonus(quality[slotId]);
    if (enh > 0) effects.push({ target: 'ac', type: 'enhancement', value: enh, note: `${item.name} +${enh}` });
    // Armour abilities with an unconditional effect (slick, shadow) fold into the stat graph;
    // conditional ones (fortification, SR…) are surfaced on the item, never totalled.
    for (const pid of quality[slotId]?.properties ?? []) {
      const p = C.armorPropertyById.get(pid);
      if (p?.effects) effects.push(...p.effects);
    }
  }
  // Active conditions (play state).
  for (const cid of doc.play?.conditions ?? []) {
    const c = C.conditionById.get(cid);
    if (c) effects.push(...c.effects);
  }
  // Running buffs — a cast spell is a timer carrying its resolved effects, so it flows through the
  // same typed-stacking pipeline as everything else and stops applying the moment the timer expires.
  for (const t of doc.play?.timers ?? []) {
    if (t.effects) effects.push(...t.effects);
  }
  return effects;
}

/** Total armor check penalty from equipped armor + shield. */
/** Worn magic items (cloak of resistance, stat belts…), in the order the user added them.
 *  Like item quality these are declarative: cost is derived, so removing one refunds it. */
function wornItems(doc: CharacterDoc): C.WondrousItemDef[] {
  const ids = (doc.decisions['worn-items'] as string[]) ?? [];
  return ids.map((id) => C.wondrousItemById.get(id)).filter(Boolean) as C.WondrousItemDef[];
}

/** Worn items tagged with whether they actually function: a slot only supports so many (rings two,
 *  the rest one). Extras beyond the capacity are kept but contribute nothing, and raise an Issue.
 *  Tagged per position rather than per id, so two identical rings are handled correctly. */
function wornItemsWithStatus(doc: CharacterDoc): { item: C.WondrousItemDef; active: boolean }[] {
  const used = new Map<string, number>();
  return wornItems(doc).map((item) => {
    const n = used.get(item.slot) ?? 0;
    const active = n < C.SLOT_CAPACITY[item.slot];
    if (active) used.set(item.slot, n + 1);
    return { item, active };
  });
}

/** Item quality (masterwork / magic enhancement / named properties) per owned item id. */
function itemQuality(doc: CharacterDoc): Record<string, ItemQuality> {
  return (doc.decisions['item-quality'] as Record<string, ItemQuality>) ?? {};
}

/** Pricing for a named property, looked up across both catalogues (ids are distinct). Weapon
 *  abilities are all bonus-equivalent; some armour ones are a flat surcharge instead. */
export function propertyPrice(id: string): PropertyPrice {
  const w = C.weaponPropertyById.get(id);
  if (w) return { equivalent: w.equivalent, flat: 0 };
  const a = C.armorPropertyById.get(id);
  if (a) return { equivalent: a.equivalent ?? 0, flat: a.flatCost ?? 0 };
  return { equivalent: 0, flat: 0 };
}

function armorCheckPenalty(doc: CharacterDoc): { total: number; sources: string[] } {
  let total = 0;
  const sources: string[] = [];
  const quality = itemQuality(doc);
  for (const slot of [doc.equipped.armor, doc.equipped.offHand]) {
    const a = slot ? C.armorById.get(slot) : null;
    if (!a || a.acp >= 0) continue;
    // Masterwork (and therefore all magic) armour reduces the penalty by 1, never past zero.
    const reduced = Math.min(0, a.acp + armorCheckPenaltyReduction(quality[slot!]));
    if (reduced < 0) { total += reduced; sources.push(a.name); }
  }
  return { total, sources };
}

function maxDexBonus(doc: CharacterDoc): number | null {
  const a = doc.equipped.armor ? C.armorById.get(doc.equipped.armor) : null;
  return a && a.maxDex !== null ? a.maxDex : null;
}

// ---------- Multiclass: which class was taken at each character level ----------

/** One class the character has levels in. `levels` is that class's own level, which is what
 *  class features, bonus feats and caster level key off — never the character level. */
export interface ClassEntry {
  klass: C.ClassDef;
  levels: number;
  /** Character level at which this class was first taken, for stable ordering. */
  firstAt: number;
}

/** The class id taken at each character level, 1..level. Unset entries fall back to the primary
 *  class, so a single-class document stores nothing and gaining a level needs no write. */
function classIdAtLevels(dec: Decisions, level: number): (string | null)[] {
  return Array.from({ length: level }, (_, i) => dec.classLevels[i] ?? dec.classId);
}

/** The character's classes with their own level counts, ordered by when each was first taken. */
function classBreakdown(dec: Decisions, level: number): ClassEntry[] {
  const out = new Map<string, ClassEntry>();
  classIdAtLevels(dec, level).forEach((id, i) => {
    if (!id) return;
    const existing = out.get(id);
    if (existing) { existing.levels += 1; return; }
    const klass = C.classById.get(id);
    if (klass) out.set(id, { klass, levels: 1, firstAt: i + 1 });
  });
  return [...out.values()].sort((a, b) => a.firstAt - b.firstAt);
}

/** How many levels of `classId` the character has by character level `atLevel` — the class level
 *  used for that class's features. */
function classLevelAt(dec: Decisions, classId: string, atLevel: number): number {
  return classIdAtLevels(dec, atLevel).filter((id) => id === classId).length;
}

function makeStat(id: string, label: string, contribs: Contribution[], conditional: ConditionalBonus[] = []): Stat {
  const { total, lines } = stack(contribs);
  // One place renders a conditional bonus, so the breakdown card and the roll toggles cannot drift.
  const annotations = conditional.map((c) => `${c.note}: ${fmtSigned(c.value)} ${c.condition}`);
  return { id, label, total, lines, annotations, conditional };
}

/** Class resource pools (rage rounds, ki, channel, grit…) with computed maxima. Verified formulas;
 *  classes with murky/varied pools (oracle, sorcerer, witch, druid wild shape) are omitted for now. */
function classPools(klass: C.ClassDef | undefined, level: number, mods: Record<Ability, number>): ResourcePool[] {
  if (!klass) return [];
  const out: ResourcePool[] = [];
  const add = (id: string, name: string, max: number, unit: ResourcePool['unit']) => { if (max > 0) out.push({ id, name, max, unit }); };
  const half = Math.floor(level / 2);
  const per3 = 1 + Math.floor((level - 1) / 3); // 1/day, +1 at 4/7/10/13/16/19
  switch (klass.id) {
    case 'barbarian': add('rage', 'Rage', 4 + mods.con + 2 * (level - 1), 'rounds'); break;
    case 'bloodrager': add('bloodrage', 'Bloodrage', 4 + mods.con + 2 * (level - 1), 'rounds'); break;
    case 'monk':
      if (level >= 4) add('ki', 'Ki pool', half + mods.wis, 'points');
      add('stunning-fist', 'Stunning Fist', level, 'uses');
      break;
    case 'cleric': add('channel', 'Channel energy', 3 + mods.cha, 'uses'); break;
    case 'warpriest': add('fervor', 'Fervor', half + mods.wis, 'uses'); break;
    case 'paladin':
      if (level >= 2) add('lay-on-hands', 'Lay on hands', half + mods.cha, 'uses');
      add('smite-evil', 'Smite evil', per3, 'uses');
      break;
    case 'druid': if (level >= 4 && level < 20) add('wild-shape', 'Wild shape', Math.floor((level - 4) / 2) + 1, 'uses'); break;
    case 'bard': add('performance', 'Bardic performance', 4 + mods.cha + 2 * (level - 1), 'rounds'); break;
    case 'skald': add('raging-song', 'Raging song', 4 + mods.cha + 2 * (level - 1), 'rounds'); break;
    case 'gunslinger': add('grit', 'Grit', Math.max(1, mods.wis), 'points'); break;
    case 'swashbuckler': add('panache', 'Panache', Math.max(1, mods.cha), 'points'); break;
    case 'magus': add('arcane-pool', 'Arcane pool', Math.max(1, half + mods.int), 'points'); break;
    case 'arcanist': add('reservoir', 'Arcane reservoir', 3 + half, 'points'); break;
    case 'alchemist': add('bombs', 'Bombs', level + mods.int, 'uses'); break;
    case 'investigator': add('inspiration', 'Inspiration', Math.max(1, half + mods.int), 'points'); break;
    case 'inquisitor': add('judgment', 'Judgment', per3, 'uses'); break;
    case 'cavalier': add('challenge', 'Challenge', per3, 'uses'); break;
  }
  return out;
}

export function resolve(doc: CharacterDoc): Resolution {
  const dec = readDecisions(doc);
  const level = Math.max(1, Math.min(20, Math.floor(doc.level) || 1));
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  const klass = dec.classId ? C.classById.get(dec.classId) : undefined;
  // Every class the character has levels in. For a single-class character this is just [klass],
  // so all the summing below collapses to the old single-class arithmetic.
  const classes = classBreakdown(dec, level);
  const isMulticlass = classes.length > 1;
  /** The class taken at each character level (index 0 = level 1). */
  const levelClasses = classIdAtLevels(dec, level).map((id) => (id ? C.classById.get(id) : undefined));
  const classAt = (l: number) => levelClasses[l - 1];
  // Ability increases above the current target level are suspended, not applied.
  const abilities = finalAbilities(dec, level);
  const { standard, alternates } = activeRacialTraits(dec);
  const effects = collectEffects(dec, doc, level);
  // Apply unconditional ability-score effects (conditions like Fatigued, and future items) to the
  // ability scores before deriving modifiers, so the penalty flows to everything.
  for (const e of effects) {
    if (e.condition || !e.target.startsWith('ability:')) continue;
    const ab = e.target.slice('ability:'.length);
    if (ab in abilities) abilities[ab as Ability] += e.value;
  }
  const mods: Record<Ability, number> = Object.fromEntries(
    ABILITIES.map((a) => [a, abilityMod(abilities[a])]),
  ) as Record<Ability, number>;
  const size = race?.size ?? 'medium';
  const sizeAcAtk = size === 'small' ? 1 : 0;

  // Effects grouped by target for stat assembly.
  const byTarget = new Map<string, Effect[]>();
  for (const e of effects) {
    const arr = byTarget.get(e.target) ?? [];
    arr.push(e);
    byTarget.set(e.target, arr);
  }
  const conds = (target: string): ConditionalBonus[] =>
    (byTarget.get(target) ?? []).filter((e) => e.condition)
      .map((e) => ({ note: e.note.replace(/\s*\(.*\)$/, ''), value: e.value, condition: e.condition! }));
  const unconds = (target: string): Contribution[] =>
    (byTarget.get(target) ?? []).filter((e) => !e.condition).map((e) => ({ type: e.type, value: e.value, note: e.note }));

  const bab = sumBab(classes.map((c) => ({ bab: c.klass.bab, goodSaves: c.klass.goodSaves, levels: c.levels })));
  // Parameterised feats (Weapon/Skill/Spell Focus, Exotic Weapon Proficiency), resolved once.
  const featParams = activeFeatParams(doc, dec, level);
  // For prerequisites ("caster level 5th"), a multiclass caster is judged on their best class.
  const clvl = classes.reduce((best, c) => {
    const p = c.klass.spellcasting;
    return p ? Math.max(best, casterLevel(p.progression ?? 'full', c.levels)) : best;
  }, 0);
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
      ...unconds(`ability:${ab}`),
    ]);
  }

  // HP: level 1 = max hit die; each later level adds its rolled/average HP. Con mod applies to
  // every level (a level-up Con increase raises the modifier retroactively, per RAW, because we
  // use the final Con mod × total levels). FCB(hp) adds 1 per level when chosen. Plus Toughness.
  // Favored-class bonus, chosen per level (falling back to the overall default). Count how many
  // levels put the +1 into HP vs skill ranks.
  // The bonus is earned only on levels taken in the favored class, so a fighter/wizard with
  // fighter favored gets nothing for the wizard level.
  const fcbAt = (l: number): 'hp' | 'skill' | null => dec.fcbByLevel[l] ?? dec.fcbChoice;
  let fcbHpCount = 0;
  let fcbSkillCount = 0;
  for (let l = 1; l <= level; l++) {
    if (!dec.favoredClass || classAt(l)?.id !== dec.favoredClass) continue;
    const c = fcbAt(l);
    if (c === 'hp') fcbHpCount++; else if (c === 'skill') fcbSkillCount++;
  }
  const hpContribs: Contribution[] = [];
  const firstClass = classAt(1);
  if (firstClass) {
    // Each level rolls the hit die of the class taken *at that level*, so a fighter who dips
    // wizard gains d6 for the wizard level, not d10.
    // 1st level takes the maximum die by default; a table that rolls for 1st can override it.
    const firstLevelHp = dec.hpRolls[1] ?? firstClass.hitDie;
    hpContribs.push({
      type: 'base', value: firstLevelHp,
      note: firstLevelHp === firstClass.hitDie ? `Max hit die (${firstClass.name})` : `1st level (rolled ${firstLevelHp})`,
    });
    let laterLevelsHp = 0;
    for (let l = 2; l <= level; l++) {
      const kl = classAt(l);
      laterLevelsHp += dec.hpRolls[l] ?? (kl ? fixedHpPerLevel(kl.hitDie) : 0);
    }
    if (laterLevelsHp) hpContribs.push({ type: 'base', value: laterLevelsHp, note: `Levels 2–${level}` });
  }
  const hpLevels = klass ? level : 1;
  hpContribs.push({ type: 'base', value: mods.con * hpLevels, note: hpLevels > 1 ? `Con modifier × ${hpLevels}` : 'Con modifier' });
  if (fcbHpCount) hpContribs.push({ type: 'base', value: fcbHpCount, note: `Favored class bonus${fcbHpCount > 1 ? ` × ${fcbHpCount}` : ''}` });
  hpContribs.push(...unconds('hp:max'));
  stats['hp:max'] = makeStat('hp:max', 'Hit Points', hpContribs);

  // AC. Some play-sheet conditions (flat-footed, blinded, stunned, paralyzed…) make you lose your
  // Dexterity bonus to AC — you keep a Dex penalty but not a positive bonus.
  const loseDexToAc = (doc.play?.conditions ?? []).some((cid) => C.conditionById.get(cid)?.loseDexToAc);
  const dexToAc = (() => {
    const cap = maxDexBonus(doc);
    const capped = cap === null ? mods.dex : Math.min(mods.dex, cap);
    return loseDexToAc ? Math.min(0, capped) : capped;
  })();
  const dexNote = loseDexToAc && mods.dex > 0 ? 'Dex modifier (lost)' : 'Dex modifier' + (dexToAc !== mods.dex ? ' (capped by armor)' : '');
  const acContribs: Contribution[] = [
    { type: 'base', value: 10, note: 'Base' },
    ...unconds('ac'),
    { type: 'base', value: dexToAc, note: dexNote },
    { type: 'size', value: sizeAcAtk, note: 'Size' },
  ];
  stats['ac'] = makeStat('ac', 'Armor Class', acContribs, conds('ac'));
  // Touch = no armor/shield/natural
  stats['ac:touch'] = makeStat('ac:touch', 'Touch AC', [
    { type: 'base', value: 10, note: 'Base' },
    { type: 'base', value: dexToAc, note: dexNote },
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
    // Each class contributes its own track and they add — a multiclass character re-pays the +2
    // that a good save grants at 1st level, so the breakdown lists one line per class.
    const saveLines: Contribution[] = classes.map((c) => {
      const g = c.klass.goodSaves.includes(sv);
      return {
        type: 'base' as const,
        value: saveBase(g, c.levels),
        note: `${c.klass.name}${isMulticlass ? ` ${c.levels}` : ''} base (${g ? 'good' : 'poor'})`,
      };
    });
    const contribs: Contribution[] = [
      ...(saveLines.length ? saveLines : [{ type: 'base' as const, value: 0, note: 'Class base' }]),
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
  const cmdDex = loseDexToAc ? Math.min(0, mods.dex) : mods.dex;
  stats['cmd'] = makeStat('cmd', 'CMD', [
    { type: 'base', value: 10, note: 'Base' },
    { type: 'base', value: bab, note: 'BAB' },
    { type: 'base', value: mods.str, note: 'Str modifier' },
    { type: 'base', value: cmdDex, note: loseDexToAc && mods.dex > 0 ? 'Dex modifier (lost)' : 'Dex modifier' },
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
  ], conds('attack:ranged'));
  // Bonuses and penalties to *weapon damage* — Divine Favor's luck bonus, Sickened's −2. These
  // ride every attack line's damage rather than a single printed number, because damage is
  // per-weapon; the stat exists so they stack by type like everything else.
  stats['damage:weapon'] = makeStat('damage:weapon', 'Weapon damage', [
    ...unconds('damage:weapon'),
  ], conds('damage:weapon'));

  // ---- Skills ----
  const acp = armorCheckPenalty(doc);
  // Class skills are the union across every class the character has levels in.
  const classSkillSet = new Set<string>(classes.flatMap((c) => c.klass.classSkills));
  // Bloodline / trait class-skill grants
  for (const bl of dec.classChoices['bloodline'] ?? []) {
    const b = C.bloodlineById.get(bl);
    if (b) classSkillSet.add(b.classSkill);
  }
  const racialSkillPerLevel = standard.reduce((n, t) => n + (t.skillRanksPerLevel ?? 0), 0);
  // Skill-rank budget summed over levels 1..N, using the Int modifier as of each level (an
  // Int increase at level 4 raises ranks from level 4 onward), + the favored-class skill bonuses.
  // Each level grants the ranks of the class taken at *that* level, so a 2-rank fighter level and
  // a 6-rank rogue level are budgeted separately rather than averaged.
  const skillRanksTotal = (() => {
    let total = 0;
    for (let l = 1; l <= level; l++) {
      const kl = classAt(l);
      if (!kl) continue;
      const intAtL = abilityMod(finalAbilities(dec, l).int);
      total += Math.max(1, kl.skillRanks + intAtL + racialSkillPerLevel);
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
    // `skill:all` is the across-the-board bonus (Prayer), mirroring how `save:all` already works.
    contribs.push(...unconds(`skill:${sk.id}`), ...unconds('skill:all'));
    stats[`skill:${sk.id}`] = makeStat(`skill:${sk.id}`, sk.name, contribs, [...conds(`skill:${sk.id}`), ...conds('skill:all')]);
  }
  const skillRanksSpent = Object.values(dec.skillRanks).reduce((a, b) => a + b, 0);

  // ---- Inventory & encumbrance ----
  // Load comes from what is still carried, so consuming items in play lightens the character.
  const strScore = abilities.str;
  const carry = carryingCapacity(strScore);
  const inventory = buildInventory(doc);
  const load = Math.round(inventory.reduce((n, it) => n + it.weight, 0) * 100) / 100;
  const loadLabel = load <= carry.light ? 'Light' : load <= carry.medium ? 'Medium' : load <= carry.heavy ? 'Heavy' : 'Overloaded';

  // Land speed reduction from medium/heavy armor or a medium/heavy load (PF1e), unless the race
  // is exempt (Slow and Steady). Reduction = round-down-to-5(base / 3); e.g. 30→20, 20→15.
  const armorForSpeed = doc.equipped.armor ? C.armorById.get(doc.equipped.armor) : null;
  const encumberingArmor = armorForSpeed?.category === 'medium' || armorForSpeed?.category === 'heavy';
  const encumberingLoad = loadLabel === 'Medium' || loadLabel === 'Heavy' || loadLabel === 'Overloaded';
  const baseSpeed = race?.speed ?? 30;
  const speedReduced = !race?.speedNeverReduced && (encumberingArmor || encumberingLoad);
  const reducedSpeed = speedReduced ? baseSpeed - Math.floor(baseSpeed / 3 / 5) * 5 : baseSpeed;
  // Speed-boosting items (boots of striding and springing) add on top, after any armor/load
  // reduction — the reduction is computed from base land speed, not from the boosted figure.
  const speedBonus = stack(unconds('speed')).total;
  // Fleet: +5 ft per instance while in light or no armour and no more than a light load — a
  // condition the flat-bonus effect model can't express, so it is gated here where armour and
  // load are known. The feat may be taken more than once, so it counts instances.
  const armorLightOrNone = !armorForSpeed || armorForSpeed.category === 'light';
  const fleetCount = featParams.filter((f) => f.featId === 'fleet').length;
  const fleetBonus = armorLightOrNone && !encumberingLoad ? 5 * fleetCount : 0;
  const effectiveSpeed = reducedSpeed + speedBonus + fleetBonus;

  // ---- Gold ----
  // A character built above 1st level uses Character Wealth by Level, not the class's 1st-level
  // starting roll. Trait gold (Rich Parents) only ever replaces the 1st-level figure.
  let startGold = klass?.startingGold ?? 0;
  for (const tid of dec.traits) {
    const t = C.traitById.get(tid);
    if (t?.bonusGold) startGold = t.bonusGold;
  }
  startGold = klass ? startingWealth(level, startGold) : startGold;
  // Masterwork/magic upgrades are a declarative property of an owned item rather than a purchase
  // transaction, so their cost is derived here — toggling an enhancement off refunds it.
  const qualitySpend = Object.entries(itemQuality(doc)).reduce((sum, [id, q]) => {
    const kind = C.weaponById.has(id) ? 'weapon' : C.armorById.has(id) ? 'armor' : null;
    if (!kind || !(doc.purchases[id] ?? 0)) return sum;
    // A composite bow's Strength rating is priced per point of rating by the bow, not by the
    // enhancement curve, so it is charged alongside rather than through qualityCost.
    return sum + qualityCost(kind, q, propertyPrice)
      + strRatingCost(q, C.weaponById.get(id)?.composite?.costPerPoint);
  }, 0);
  // Worn items are charged whether or not a slot conflict suppresses them — you still bought them.
  const wornSpend = wornItems(doc).reduce((sum, item) => sum + item.cost, 0);
  // `?? 0` guards imported documents that omit goldSpent — without it the whole gold figure
  // silently becomes NaN rather than merely being wrong.
  const gold = Math.round((startGold - (doc.goldSpent ?? 0) - qualitySpend - wornSpend) * 100) / 100;

  // ---- Caster level + spell slots, per casting class ----
  // A wizard 5 / cleric 2 casts as *both* a 5th-level wizard and a 2nd-level cleric; there is no
  // single merged progression, so each casting class gets its own block.
  const casting: CastingBlock[] = classes.flatMap((c) => {
    const csc = c.klass.spellcasting;
    if (!csc) return [];
    const table = spellTableFor(csc);
    const slots = spellSlotsPerDay(table, c.levels, mods[csc.ability]);
    // Domain (cleric) and specialist-school (non-universalist wizard) grant one bonus slot per spell
    // level, restricted to a domain spell / a specialty-school spell. Modelled as its own slot
    // (rather than the old +1 to the count), so the restriction can actually be enforced.
    const hasDomains = c.klass.id === 'cleric' && (dec.classChoices['domains']?.length ?? 0) > 0;
    const isSpecialist = c.klass.id === 'wizard' && (dec.classChoices['school']?.length ?? 0) > 0 && !(dec.classChoices['school'] ?? []).includes('universalist');
    let bonusSlot: CastingBlock['bonusSlot'];
    if (hasDomains) {
      const doms = (dec.classChoices['domains'] ?? []).map((id) => C.domainById.get(id)).filter(Boolean) as C.DomainDef[];
      // allowedByLevel[L] = the union of the chosen domains' spells at spell level L (skipping the
      // levels whose domain spell isn't in the catalogue yet).
      const allowedByLevel: string[][] = [];
      for (let L = 1; L <= 9; L++) {
        allowedByLevel[L] = [...new Set(doms.map((d) => d.spells[L - 1]).filter((x): x is string => !!x))];
      }
      bonusSlot = { kind: 'domain', label: 'Domain', allowedByLevel };
    } else if (isSpecialist) {
      const schoolName = C.schoolById.get((dec.classChoices['school'] ?? [])[0])?.name ?? 'School';
      bonusSlot = { kind: 'school', label: schoolName, school: schoolName };
    }
    return [{
      classId: c.klass.id,
      className: c.klass.name,
      kind: csc.kind,
      ability: csc.ability,
      casterLevel: casterLevel(csc.progression ?? 'full', c.levels),
      slots,
      known: csc.kind === 'spontaneous' ? spellsKnownPerLevel(table, c.levels) : undefined,
      // Only the arcanist prepares a different number of spells than it can cast.
      ...(spellsPreparedPerLevel(table, c.levels).length
        ? { preparedPerLevel: spellsPreparedPerLevel(table, c.levels) }
        : {}),
      // Each class's DC uses its own casting ability.
      dcBase: 10 + mods[csc.ability],
      ...(bonusSlot ? { bonusSlot } : {}),
    }];
  });
  // The primary casting class, kept for the single-caster views that show one number.
  const sc = klass?.spellcasting;
  const primaryCasting = casting.find((b) => b.classId === klass?.id) ?? casting[0];
  const spellSlots = primaryCasting?.slots;
  const spellsKnown = primaryCasting?.known;

  // ---- Per-level advancement table ----
  const featSlotKeys = featSlots(dec, race, level);
  // BAB and saves are the *running totals* at each character level, so a multiclass table reads
  // as the character's actual numbers rather than one class's column.
  const progression: ProgressionRow[] = [];
  if (classes.length) {
    for (let l = 1; l <= level; l++) {
      const kl = classAt(l);
      const soFar = classBreakdown(dec, l).map((c) => ({ bab: c.klass.bab, goodSaves: c.klass.goodSaves, levels: c.levels }));
      const clsLevel = kl ? classLevelAt(dec, kl.id, l) : 0;
      progression.push({
        level: l,
        ...(kl ? { className: kl.name, classId: kl.id, classLevel: clsLevel } : {}),
        bab: sumBab(soFar),
        fort: sumSave('fort', soFar),
        ref: sumSave('ref', soFar),
        will: sumSave('will', soFar),
        // Features gained at this character level are the ones this class grants at its own level.
        features: kl ? classFeaturesUpTo(kl, clsLevel, dec).filter((f) => f.level === clsLevel).map((f) => f.name) : [],
        featSlots: featSlotKeys.filter((fs) => fs.charLevel === l).map((fs) => fs.label),
        abilityIncrease: dec.abilityIncreases[l],
        hp: l === 1
          ? (dec.hpRolls[1] ?? kl?.hitDie ?? 0)
          : (dec.hpRolls[l] ?? (kl ? fixedHpPerLevel(kl.hitDie) : 0)),
      });
    }
  }

  // Highest spell level with at least one slot per day (0 if not a caster).
  const maxSpellLevel = spellSlots ? spellSlots.reduce((m: number, n: number, i: number) => (n > 0 ? i : m), 0) : 0;

  // ---- Spell save DC ----
  // The per-spell DC is this + the spell's level; Spell Focus adds on top for its school only, so
  // those stay alongside the stat rather than folded into a single number.
  const spellFocus = spellFocusBonuses(doc, dec, level);
  if (sc) {
    stats['spell:dc'] = makeStat('spell:dc', 'Spell save DC (+ spell level)', [
      { type: 'base', value: 10, note: 'Base' },
      { type: 'base', value: mods[sc.ability], note: `${sc.ability.toUpperCase()} modifier` },
      ...unconds('spell:dc'),
    ], spellFocus.map((f) => ({ note: 'Spell Focus', value: f.bonus, condition: `vs ${f.school} spells` })));
  }

  // ---- Slots + issues ----
  const { slots, issues } = buildSlotsAndIssues(doc, dec, {
    race, klass, abilities, mods, predCtx, skillRanksTotal, skillRanksSpent,
    standard, alternates, gold, load, carry, activeAcp: acp.total, level,
    spellSlots, spellsKnown, maxSpellLevel,
  });

  const steps = deriveSteps(klass);

  const summaryLine = [
    dec.alignment ?? '',
    race?.name ?? '',
    // "Fighter 5 / Wizard 1" for a multiclass character, in the order the classes were taken.
    classes.map((c) => `${c.klass.name} ${c.levels}`).join(' / '),
  ].filter(Boolean).join(' ');

  const sheet: Sheet = {
    level,
    stats, skillIds, classSkillIds, acpSkillIds,
    skillRanksTotal, skillRanksSpent,
    gold,
    load: { current: load, light: carry.light, medium: carry.medium, heavy: carry.heavy, label: loadLabel },
    speed: { base: effectiveSpeed, ...(speedReduced ? { reducedFrom: baseSpeed + speedBonus } : {}), ...(race?.speeds ?? {}) },
    spellFocus,
    casting,
    ...(primaryCasting && primaryCasting.casterLevel > 0
      ? { casterLevel: primaryCasting.casterLevel, spellSlots }
      : {}),
    ...(spellsKnown && spellsKnown.length ? { spellsKnown } : {}),
    progression,
    pools: classes.flatMap((c) => classPools(c.klass, c.levels, mods)),
    attacks: weaponAttacks(doc, stats, bab, mods.str, weaponFeatBonuses(featParams), itemQuality(doc), new Set(featIds),
      proficiencyCtx(dec, classes, featParams)),
    combatOptions: {
      canPowerAttack: featIds.includes('power-attack'),
      canTwoWeapon: Boolean(doc.equipped.mainHand && doc.equipped.offHand),
    },
    defenses: gatherDefenses(dec, classes, doc.play),
    grantedFeats: allGrantedFeats(dec, level, (doc.decisions['feat-params'] as Record<string, string>) ?? {}),
    inventory,
    worn: wornItemsWithStatus(doc).map(({ item, active }) =>
      ({ id: item.id, name: item.name, slot: item.slot, cost: item.cost, desc: item.desc, active })),
    summaryLine,
  };
  return { sheet, slots, issues, steps };
}

function fmtSigned(v: number): string { return v >= 0 ? `+${v}` : `−${Math.abs(v)}`; }

/** Every feat the character actually has (chosen in a live slot, or class-granted), paired with its
 *  chosen parameter. Values are catalogue ids; a legacy display name is tolerated and mapped back. */
function activeFeatParams(doc: CharacterDoc, dec: Decisions, level: number): { featId: string; param: string | null }[] {
  const params = (doc.decisions['feat-params'] as Record<string, string>) ?? {};
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  const slotKeys = new Set(featSlots(dec, race, level).map((s) => s.key));
  const out: { featId: string; param: string | null }[] = [];
  for (const [key, fid] of Object.entries(dec.feats)) {
    if (!fid || !slotKeys.has(key)) continue;
    out.push({ featId: fid, param: normalizeParam(fid, params[key]) });
  }
  // Granted feats come from every class, each at its own class level.
  for (const c of classBreakdown(dec, level)) {
    for (const g of c.klass.grantedFeats ?? []) {
      if (g.level > c.levels) continue;
      out.push({ featId: g.feat, param: normalizeParam(g.feat, params[grantedParamKey(g.feat, g.level)]) });
    }
  }
  return out;
}

/** Params are stored as catalogue ids. Docs saved before that change hold the display name, so fall
 *  back to a name lookup rather than silently dropping the user's pick. */
function normalizeParam(featId: string, raw: string | undefined): string | null {
  if (!raw) return null;
  const opts = C.featById.get(featId)?.param?.options;
  if (!opts) return raw;
  if (opts.some((o) => o.id === raw)) return raw;
  return opts.find((o) => o.name === raw)?.id ?? raw;
}

/** Effects from parameterised feats that land on a named stat. Weapon feats are handled separately
 *  (they apply per attack line, not to a stat); this covers the skill-targeted ones. */
function paramFeatEffects(doc: CharacterDoc, dec: Decisions, level: number): Effect[] {
  const out: Effect[] = [];
  for (const { featId, param } of activeFeatParams(doc, dec, level)) {
    if (!param) continue;
    if (featId === 'skill-focus') {
      // +3, rising to +6 once you have 10 ranks in that skill.
      const value = (dec.skillRanks[param] ?? 0) >= 10 ? 6 : 3;
      out.push({ target: `skill:${param}`, type: 'untyped', value, note: 'Skill Focus' });
    }
  }
  return out;
}

/** Spell-save-DC bonuses per school, from Spell Focus and Greater Spell Focus. */
function spellFocusBonuses(doc: CharacterDoc, dec: Decisions, level: number): { school: string; bonus: number }[] {
  const map = new Map<string, number>();
  for (const { featId, param } of activeFeatParams(doc, dec, level)) {
    if (!param) continue;
    if (featId === 'spell-focus' || featId === 'greater-spell-focus') {
      map.set(param, (map.get(param) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([school, bonus]) => ({ school: C.schoolById.get(school)?.name ?? school, bonus }))
    .sort((a, b) => a.school.localeCompare(b.school));
}

/** Per-weapon attack/damage bonuses from weapon-parameterised feats. Keyed by weapon id. */
interface WeaponFeatBonus { attack: number; damage: number; attackLines: BreakdownLine[]; damageLines: BreakdownLine[]; doublesThreat: boolean }

const WEAPON_FEAT_BONUSES: Record<string, { attack?: number; damage?: number }> = {
  'weapon-focus': { attack: 1 },
  'greater-weapon-focus': { attack: 1 },
  'weapon-specialization': { damage: 2 },
  'greater-weapon-specialization': { damage: 2 },
};

function weaponFeatBonuses(entries: { featId: string; param: string | null }[]): Map<string, WeaponFeatBonus> {
  const map = new Map<string, WeaponFeatBonus>();
  for (const { featId, param } of entries) {
    if (!param) continue;
    const spec = WEAPON_FEAT_BONUSES[featId];
    // Improved Critical widens the chosen weapon's threat range rather than adding a flat bonus,
    // so it rides the same per-weapon map as the Weapon Focus line without an attack/damage value.
    const isImprovedCrit = featId === 'improved-critical';
    if (!spec && !isImprovedCrit) continue;
    const name = C.featById.get(featId)?.name ?? featId;
    const cur = map.get(param) ?? { attack: 0, damage: 0, attackLines: [], damageLines: [], doublesThreat: false };
    if (spec?.attack) { cur.attack += spec.attack; cur.attackLines.push({ label: name, value: spec.attack }); }
    if (spec?.damage) { cur.damage += spec.damage; cur.damageLines.push({ label: name, value: spec.damage }); }
    if (isImprovedCrit) cur.doublesThreat = true;
    map.set(param, cur);
  }
  return map;
}

/** Everything the character is carrying, with play-time quantities and charges applied.
 *  Consumed items drop out of the load, so spending torches or drinking potions lightens you. */
function buildInventory(doc: CharacterDoc): InventoryItem[] {
  const consumed = doc.play?.consumed ?? {};
  const usedCharges = doc.play?.usedCharges ?? {};
  const quality = itemQuality(doc);
  const { armor, mainHand, offHand } = doc.equipped;
  const out: InventoryItem[] = [];
  for (const [id, purchased] of Object.entries(doc.purchases)) {
    if (purchased <= 0) continue;
    const w = C.weaponById.get(id);
    const a = C.armorById.get(id);
    const g = C.gearById.get(id);
    const base = w ?? a ?? g;
    if (!base) continue;
    const kind: InventoryItem['kind'] = w ? 'weapon' : a ? 'armor' : 'gear';
    const isConsumable = !!g?.consumable;
    const qty = Math.max(0, purchased - (isConsumable ? consumed[id] ?? 0 : 0));
    const equipped: InventoryItem['equipped'] | undefined =
      id === armor ? (a?.slot === 'shield' ? 'shield' : 'armor') : id === mainHand ? 'main' : id === offHand ? 'off' : undefined;
    const maxCharges = g?.charges;
    // Masterwork / magic gear reads as "+1 Longsword" in the carried list.
    const qName = `${qualityPrefix(quality[id])}${base.name}`;
    const propNames = (quality[id]?.properties ?? [])
      .map((pid) => C.weaponPropertyById.get(pid)?.name ?? C.armorPropertyById.get(pid)?.name)
      .filter(Boolean) as string[];
    out.push({
      id, name: qName, kind, purchased, qty,
      weightEach: base.weight,
      weight: Math.round(base.weight * qty * 100) / 100,
      consumable: isConsumable,
      ...(maxCharges ? { charges: { max: maxCharges, remaining: Math.max(0, maxCharges - (usedCharges[id] ?? 0)) } } : {}),
      ...(equipped ? { equipped } : {}),
      ...(propNames.length ? { properties: propNames } : {}),
      ...(g?.note ? { note: g.note } : {}),
    });
  }
  // Worn/wielded first, then consumables, then the rest — the order you scan at the table.
  const rank = (it: InventoryItem) => (it.equipped ? 0 : it.charges ? 1 : it.consumable ? 2 : 3);
  return out.sort((x, y) => rank(x) - rank(y) || x.name.localeCompare(y.name));
}

/** Double a weapon's threat range for keen: "×2" → "19–20/×2", "19–20/×2" → "17–20/×2".
 *  The multiplier is untouched — keen widens the range, it never raises the multiplier. */
export function doubleThreatRange(crit: string): string {
  const m = crit.match(/^(?:(\d+)\s*[–-]\s*20\s*\/\s*)?(×\d+)$/);
  if (!m) return crit;
  const low = m[1] ? Number(m[1]) : 20;
  const widened = 20 - (20 - low + 1) * 2 + 1; // 20 → 19–20; 19 → 17–20; 18 → 15–20
  return `${widened}–20/${m[2]}`;
}

/** Iterative attack bonuses from a primary bonus and BAB: +6 → [6,1], +11 → [11,6,1], etc. */
export function iterativeBonuses(primary: number, bab: number): number[] {
  const count = Math.max(1, Math.min(4, Math.floor((bab + 4) / 5)));
  return Array.from({ length: count }, (_, i) => primary - 5 * i);
}

/** Ready-to-use attack lines for the character's wielded/carried weapons: the iterative sequence,
 *  Strength-scaled damage, the weapon's own dice/crit, and any weapon-parameterised feat bonuses
 *  (Weapon Focus & co.) that name this specific weapon. Magic enhancement is still not modelled. */
/** Penalty on attack rolls for using a weapon you are not proficient with. */
export const NON_PROFICIENT_PENALTY = -4;

/** A thrown weapon reaches five range increments; a projectile weapon reaches ten. */
export const THROWN_MAX_INCREMENTS = 5;

/** What the character may wield without penalty. Assembled once per resolve, because it draws on
 *  class proficiency lists, racial Weapon Familiarity, and Exotic Weapon Proficiency picks. */
interface ProficiencyCtx {
  /** Weapon groups the classes grant outright ('simple', 'martial'). */
  groups: Set<string>;
  /** Specific weapon ids granted by a class list, a racial trait, or a feat. */
  weapons: Set<string>;
  /** Exotic weapons a racial familiarity reclassifies as martial. */
  asMartial: Set<string>;
}

function proficiencyCtx(dec: Decisions, classes: ClassEntry[], featParams: { featId: string; param: string | null }[]): ProficiencyCtx {
  const groups = new Set<string>();
  const weapons = new Set<string>();
  const asMartial = new Set<string>();
  for (const c of classes) {
    for (const entry of c.klass.proficiencies.weapons) {
      // The lists mix group names with specific weapon ids.
      if (entry === 'simple' || entry === 'martial' || entry === C.FIREARM_GROUP_ID) groups.add(entry);
      else weapons.add(entry);
    }
  }
  const { standard, alternates } = activeRacialTraits(dec);
  for (const t of [...standard, ...alternates]) {
    for (const id of t.weaponFamiliarity?.proficient ?? []) weapons.add(id);
    for (const id of t.weaponFamiliarity?.martial ?? []) asMartial.add(id);
  }
  for (const f of featParams) {
    // Simple Weapon Proficiency grants the whole simple group; the others name one weapon.
    if (f.featId === 'simple-weapon-proficiency') { groups.add('simple'); continue; }
    if (f.featId === 'martial-weapon-proficiency' && f.param) { weapons.add(f.param); continue; }
    // Exotic Weapon Proficiency names one weapon, except for firearms — that pick grants the group.
    if (f.featId !== 'exotic-weapon-proficiency' || !f.param) continue;
    if (f.param === C.FIREARM_GROUP_ID) groups.add(C.FIREARM_GROUP_ID);
    else weapons.add(f.param);
  }
  return { groups, weapons, asMartial };
}

/** What a firearm does that no other weapon does. None of this is a bonus — it changes which AC
 *  you roll against, how far you can shoot, and what happens on a natural 1 — so it stays notes
 *  on the attack line rather than being folded into a total the engine cannot know is right. */
function firearmNotes(w: C.WeaponDef, proficient: boolean): string[] {
  const f = w.firearm;
  if (!f) return [];
  const notes: string[] = [];
  const maxIncrements = f.era === 'early' ? 5 : 10;
  const touchIncrements = f.era === 'early' ? 1 : 5;
  if (w.range) {
    const touch = w.range * touchIncrements;
    notes.push(`${f.era === 'early' ? 'Early' : 'Advanced'} firearm: resolves against touch AC within ${touch} ft`
      + `${touchIncrements > 1 ? ` (${touchIncrements} range increments)` : ''}, then normally at −2 per further increment.`
      + ` Maximum range ${w.range * maxIncrements} ft.`);
    notes.push('Touch-AC shots are not touch attacks for feats such as Deadly Aim.');
  }
  notes.push(`Misfire ${f.misfire}: the shot misses and the firearm gains the broken condition`
    + ` (−2 attack, half damage, misfire value +4)${f.burst ? `; a misfire while broken makes it explode in a ${f.burst} ft burst` : ''}.`);
  const reload = f.era === 'advanced'
    ? 'a move action to reload to full capacity'
    : `${f.grip === 'one' ? 'a standard action' : 'a full-round action'} to reload each barrel`;
  notes.push(`Capacity ${f.capacity}; ${reload}. Loading provokes, and needs a free hand.`);
  if (f.grip === 'two') notes.push('Two-handed firearm: −4 on the attack roll if fired one-handed.');
  if (f.scatter) {
    notes.push(f.scatter.cone
      ? `Scatter: instead of a bullet, fire pellets in a ${f.scatter.cone} ft cone — a separate attack roll at −2 against each creature, with no precision damage.`
      : 'Scatter: instead of a bullet, fire pellets in a cone — a separate attack roll at −2 against each creature, with no precision damage.');
  }
  if (!proficient) notes.push('Not proficient: shots you load also take +4 to the misfire value.');
  return notes;
}

function isProficientWith(w: C.WeaponDef, p: ProficiencyCtx): boolean {
  if (p.weapons.has(w.id)) return true;
  // Racial familiarity reclassifies an exotic weapon as martial — which only helps if the
  // character's class actually grants martial proficiency.
  const group = p.asMartial.has(w.id) ? 'martial' : w.group;
  return p.groups.has(group);
}

function weaponAttacks(doc: CharacterDoc, stats: Record<string, Stat>, bab: number, strMod: number, featBonuses: Map<string, WeaponFeatBonus>, quality: Record<string, ItemQuality>, featIds: Set<string>, prof: ProficiencyCtx): AttackLine[] {
  const melee = stats['attack:melee'];
  const ranged = stats['attack:ranged'];
  if (!melee || !ranged) return [];
  const seen = new Set<string>();
  const lines: AttackLine[] = [];
  // Declared combat options. Power Attack needs the feat; two-weapon penalties apply to anyone
  // wielding two weapons, with the feat only reducing them.
  const usingPowerAttack = (doc.play?.powerAttack ?? false) && featIds.has('power-attack');
  const offHandWeapon = doc.equipped.offHand ? C.weaponById.get(doc.equipped.offHand) : null;
  // Gated on actually holding two weapons: the flag can outlive the off-hand weapon (unequip it
  // while the toggle is on) and a stale flag must not penalise a single-weapon attack.
  const usingTwoWeapon = (doc.play?.twoWeapon ?? false) && Boolean(doc.equipped.mainHand && offHandWeapon);
  const twp = twoWeaponPenalties(featIds.has('two-weapon-fighting'), offHandWeapon?.hands === 'light');
  // A melee weapon with a range increment can be thrown, which is a different attack entirely:
  // it rolls off Dex rather than Str and never gets the two-handed damage multiplier. Rather than
  // annotate the melee line with rules the reader has to apply themselves, throwing gets its own
  // line — same weapon, same enhancement and feats, different numbers.
  const push = (w: C.WeaponDef, slot: AttackLine['slot'], thrown: boolean): void => {
    const kind: 'melee' | 'ranged' = thrown || w.hands === 'ranged' ? 'ranged' : 'melee';
    const base = kind === 'ranged' ? ranged : melee;
    // Weapon-parameterised feats (Weapon Focus & co.) apply only to the weapon they name.
    const fb = featBonuses.get(w.id);
    // Masterwork / magic enhancement on this specific weapon.
    const q = quality[w.id];
    const qb = weaponQualityBonus(q);
    const qualityLines: BreakdownLine[] = qb.attack ? [{ label: qb.label === 'mwk' ? 'Masterwork' : `Enhancement ${qb.label}`, value: qb.attack }] : [];
    const props = (q?.properties ?? []).map((id) => C.weaponPropertyById.get(id)).filter(Boolean) as C.WeaponPropertyDef[];
    // A composite bow's Strength rating both caps its damage bonus and penalises a wielder too weak
    // to draw it, so it is resolved once here and feeds both the attack and the damage lines.
    const rating = strRating(q, Boolean(w.composite));
    const bow = w.composite ? compositeBowEffect(strMod, rating) : null;
    // Power Attack is melee-only and scales with how the weapon is held; two-weapon penalties hit
    // both hands, so a carried (unwielded) weapon takes neither.
    const paScale: PowerAttackScale = slot === 'off' ? 'half' : w.hands === 'two' ? 'oneAndHalf' : 'normal';
    const pa = usingPowerAttack && kind === 'melee' ? powerAttackAmounts(bab, paScale) : null;
    const twfPenalty = usingTwoWeapon && slot === 'main' ? twp.primary : usingTwoWeapon && slot === 'off' ? twp.off : 0;
    const proficient = isProficientWith(w, prof);
    const optionLines: BreakdownLine[] = [
      ...(proficient ? [] : [{ label: 'Not proficient', value: NON_PROFICIENT_PENALTY }]),
      ...(pa ? [{ label: 'Power Attack', value: pa.penalty }] : []),
      ...(twfPenalty ? [{ label: slot === 'off' ? 'Two-weapon (off hand)' : 'Two-weapon (primary)', value: twfPenalty }] : []),
      ...(bow?.attack ? [{ label: `Bow rated +${rating}, above your Str`, value: bow.attack }] : []),
    ];
    const attackTotal = base.total + (fb?.attack ?? 0) + qb.attack + (pa?.penalty ?? 0) + twfPenalty
      + (proficient ? 0 : NON_PROFICIENT_PENALTY) + (bow?.attack ?? 0);
    // The off hand gets one attack (plus Improved/Greater), not the BAB iteratives.
    const bonuses = usingTwoWeapon && slot === 'off'
      ? offHandAttackBonuses(attackTotal, featIds.has('improved-two-weapon-fighting'), featIds.has('greater-two-weapon-fighting'))
      : iterativeBonuses(attackTotal, bab);
    // Speed grants one extra attack at full BAB on a full attack.
    if (props.some((p) => p.extraAttack)) bonuses.splice(1, 0, attackTotal);
    // Strength contribution, scaled by how the weapon is held; feat damage adds on top.
    let strDamage = 0;
    const notes: string[] = [];
    if (thrown) {
      // A thrown weapon adds Strength to damage, but never the 1½× two-handed multiplier: that
      // rule is about a weapon "you are wielding two-handed", and a thrown one has left your hands.
      strDamage = slot === 'off' ? Math.floor(strMod * 0.5) : strMod;
      notes.push('Thrown: rolls off Dex, adds Str to damage (no 1½× — the weapon has left your hands).');
      if (w.range) notes.push(`Maximum range ${w.range * THROWN_MAX_INCREMENTS} ft (${THROWN_MAX_INCREMENTS} range increments), at −2 per increment past the first.`);
    } else if (kind === 'ranged') {
      if (w.strToDamage) {
        // The sling and halfling sling staff add Strength to damage just as thrown weapons do.
        strDamage = strMod;
        notes.push(`${w.name}: Str applies to damage, as it does for a thrown weapon.`);
      } else if (bow) {
        strDamage = bow.damage;
        notes.push(`Composite bow rated +${rating}: it adds Str to damage up to +${rating}`
          + `${strMod > rating ? ` — your Str bonus of +${strMod} is capped here` : ''}.`);
        if (bow.attack) notes.push(`Your Str bonus is below the bow's +${rating} rating: −2 on attack rolls. A bow rated to your own Strength removes this.`);
        if (strMod < 0) notes.push('A Strength penalty applies to a composite bow\'s damage in full, whatever the rating.');
      } else {
        notes.push('Ranged: no Str to damage (composite bows and slings excepted).');
      }
    } else if (slot === 'off') {
      strDamage = Math.floor(strMod * 0.5);
      notes.push(usingTwoWeapon
        ? 'Off-hand: ½× Str to damage; two-weapon penalties are folded in below.'
        : 'Off-hand: ½× Str to damage. Switch on two-weapon fighting to apply its penalties.');
    } else if (w.hands === 'two') {
      strDamage = Math.floor(strMod * 1.5);
      notes.push('Two-handed: 1½× Str to damage.');
    } else {
      strDamage = strMod;
    }
    // Buffs and penalties that hit weapon damage generally (Divine Favor, Sickened) ride here.
    const dmgStat = stats['damage:weapon'];
    const dmgMod = strDamage + (fb?.damage ?? 0) + qb.damage + (pa?.damage ?? 0) + (dmgStat?.total ?? 0);
    if (!proficient) {
      notes.push(w.group === 'exotic'
        ? `Not proficient: −4 to attack. ${w.name} is exotic — Exotic Weapon Proficiency removes the penalty.`
        : w.group === 'firearms'
          ? 'Not proficient: −4 to attack. Exotic Weapon Proficiency (firearms) covers every firearm at once.'
          : `Not proficient: −4 to attack. Your class does not grant ${w.group} weapons.`);
    }
    if (fb?.doublesThreat) notes.push('Improved Critical: this weapon’s threat range is doubled (does not stack with keen).');
    if (w.note) notes.push(w.note);
    notes.push(...firearmNotes(w, proficient));
    if (kind === 'melee' && w.range) notes.push(`Can be thrown (${w.range} ft) — its thrown attack is listed separately.`);
    // Unconditional property damage rides on the damage string; conditional ones become notes.
    const extraDice = props.map((p) => p.damageDice).filter(Boolean) as string[];
    const baseDamage = dmgMod !== 0 ? `${w.dmg}${fmtSigned(dmgMod)}` : w.dmg;
    const damage = extraDice.length ? `${baseDamage} + ${extraDice.join(' + ')}` : baseDamage;
    for (const p of props) {
      if (p.condition) notes.push(`${p.name}: ${p.desc}`);
      else if (!p.damageDice && !p.extraAttack && !p.doublesThreat) notes.push(`${p.name}: ${p.desc}`);
      if (p.restriction) notes.push(`${p.name} applies to ${p.restriction}.`);
    }
    const scaleNote = slot === 'off' ? ' (½×)'
      : thrown ? ''
      : w.hands === 'two' ? ' (1½×)'
      : bow && strMod > rating ? ` (capped at the bow's +${rating})` : '';
    // Most ranged weapons add no Strength at all, so the row is omitted rather than shown as +0 —
    // but slings and composite bows do, and for them it has to be visible.
    const showStrDamage = kind !== 'ranged' || strDamage !== 0;
    const damageLines: BreakdownLine[] = [
      ...(showStrDamage ? [{ label: `Str modifier${scaleNote}`, value: strDamage }] : []),
      ...(fb?.damageLines ?? []),
      ...(qb.damage ? [{ label: `Enhancement ${qb.label}`, value: qb.damage }] : []),
      ...(pa ? [{ label: `Power Attack${paScale === 'oneAndHalf' ? ' (1½×)' : paScale === 'half' ? ' (½×)' : ''}`, value: pa.damage }] : []),
      ...(dmgStat?.lines ?? []),
    ];
    lines.push({
      id: w.id, name: thrown ? `${w.name} (thrown)` : w.name, kind, slot, bonuses,
      ...(thrown ? { mode: 'thrown' as const } : {}),
      attackLines: [...base.lines, ...(fb?.attackLines ?? []), ...qualityLines, ...optionLines],
      damage, damageLines,
      // Keen and Improved Critical both double the threat range, and never together — applying
      // doubleThreatRange once when either is present is exactly the "does not stack" rule.
      crit: (fb?.doublesThreat || props.some((p) => p.doublesThreat)) ? doubleThreatRange(w.crit) : w.crit,
      dmgType: w.dmgType, range: w.range,
      ...(qb.label ? { qualityLabel: qb.label } : {}),
      ...(props.length ? { properties: props.map((p) => p.name) } : {}),
      notes,
    });
  };
  const add = (id: string | null, slot: AttackLine['slot']): void => {
    if (!id || seen.has(id)) return;
    const w = C.weaponById.get(id);
    if (!w) return;
    seen.add(id);
    push(w, slot, false);
    // Melee weapons that carry a range increment (dagger, spear, trident…) get a thrown line too.
    // Weapons that are already ranged do not — a javelin is thrown in its only mode.
    if (w.hands !== 'ranged' && w.range) push(w, slot, true);
  };
  add(doc.equipped.mainHand, 'main');
  add(doc.equipped.offHand, 'off');
  for (const pid of Object.keys(doc.purchases)) add(pid, 'carried');
  return lines;
}

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
  spellSlots?: number[];
  spellsKnown?: number[];
  maxSpellLevel: number;
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
    // Every class the character has levels in offers its own picks, each gated on that class's
    // level rather than the character level — a rogue 2 / fighter 3 gets the level-2 rogue talent.
    for (const entry of classBreakdown(dec, ctx.level))
    for (const ch of entry.klass.choices ?? []) {
      // Universalist wizard → no opposition slot.
      if (ch.kind === 'wizard-opposition' && (dec.classChoices['school'] ?? []).includes('universalist')) continue;
      const options = classChoiceOptions(ch, dec);
      // A choice may recur across levels (e.g. a talent at 2, 4, 6…). Level-1 grants keep the
      // bare key; later grants are suffixed `<id>-L<level>`.
      for (const gLvl of (ch.levels ?? [1])) {
        if (gLvl > entry.levels) continue;
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
  const featSlotKeys = featSlots(dec, race, ctx.level);
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

  // ---------- SPELLS (per accessible spell level) ----------
  if (klass?.spellcasting && klass.spellcasting.progression !== 'four') {
    const sc = klass.spellcasting;
    const listSpells = C.SPELLS.filter((s) => s.lists.includes(sc.list as C.SpellList));
    // Filter by the spell's level *on this class's list*, not its flat level — a spell that is bard 2
    // but wizard 3 must appear at the right level for each caster.
    const spellsAt = (lvl: number) => listSpells.filter((s) => C.spellLevelOn(s, sc.list) === lvl);
    const opposed = new Set((dec.classChoices['opposition'] ?? []).map((o) => C.schoolById.get(o)?.name ?? o));
    const optFor = (s: C.SpellDef): SlotOption => ({
      id: s.id, name: s.name, desc: s.summary, tags: [s.school],
      legal: true, caution: opposed.has(s.school) ? 'opposed — double slot' : undefined,
      meta: { level: C.spellLevelOn(s, sc.list), school: s.school },
    });
    const M = ctx.maxSpellLevel;

    if (sc.kind === 'spontaneous') {
      // A hard "spells known" cap per spell level, from the known table.
      const known = ctx.spellsKnown ?? [];
      for (let L = 0; L <= M; L++) {
        const cnt = known[L] ?? 0;
        if (cnt <= 0) continue;
        const sel = dec.spellPicks[L] ?? [];
        slots.push({
          id: `spell-picks-L${L}`, step: 'spells', label: `${spellLevelLabel(L)} known (${sel.length}/${cnt})`,
          count: cnt, multi: true, selected: sel, options: spellsAt(L).map(optFor),
        });
        if (sel.length < cnt)
          issues.push({ severity: 'info', step: 'spells', slot: `spell-picks-L${L}`, message: `Choose ${cnt - sel.length} more ${spellLevelLabel(L).toLowerCase()} spell(s)` });
      }
    } else if (sc.kind === 'prepared-book') {
      // Spellbook: cantrips are all known; 1st..M are a free-distribution book with a total budget
      // of 3 + Int at 1st, plus 2 new spells per level thereafter.
      if (M >= 0) {
        const cantrips = spellsAt(0);
        slots.push({ id: 'spell-picks-L0', step: 'spells', label: 'Cantrips (all in spellbook)', count: cantrips.length, multi: true, selected: cantrips.map((s) => s.id), options: cantrips.map(optFor), auto: true });
      }
      let totalPicked = 0;
      for (let L = 1; L <= M; L++) {
        const opts = spellsAt(L);
        const sel = dec.spellPicks[L] ?? [];
        totalPicked += sel.length;
        slots.push({ id: `spell-picks-L${L}`, step: 'spells', label: `${spellLevelLabel(L)} spellbook`, count: opts.length, multi: true, selected: sel, options: opts.map(optFor) });
      }
      const budget = 3 + Math.max(0, ctx.mods.int) + 2 * Math.max(0, ctx.level - 1);
      if (totalPicked > budget)
        issues.push({ severity: 'error', step: 'spells', slot: 'spell-picks-L1', message: `Spellbook: ${totalPicked} spells exceeds your ${budget} — remove ${totalPicked - budget}` });
      else if (totalPicked < budget)
        issues.push({ severity: 'info', step: 'spells', slot: 'spell-picks-L1', message: `Spellbook: ${totalPicked}/${budget} spells — add ${budget - totalPicked} more (any accessible level)` });
      for (const [L, ids] of Object.entries(dec.spellPicks)) for (const pid of ids) {
        const sp = C.spellById.get(pid);
        if (sp && opposed.has(sp.school))
          issues.push({ severity: 'info', step: 'spells', slot: `spell-picks-L${L}`, message: `${sp.name} is from an opposition school — it costs two slots to prepare` });
      }
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
  // A body slot only supports so many items; extras are worn but do nothing.
  for (const { item, active } of wornItemsWithStatus(doc)) {
    if (active) continue;
    issues.push({
      severity: 'warning', step: 'equipment', slot: 'worn-items',
      message: `${item.name} does nothing — your ${item.slot} slot is already full.`,
    });
  }
  // Named weapon abilities need a +1 enhancement, and the combined bonus caps at +10.
  for (const [id, q] of Object.entries(itemQuality(doc))) {
    if (!(doc.purchases[id] ?? 0)) continue;
    const kind = C.weaponById.has(id) ? 'weapon' : 'armor';
    const problem = qualityProblem(kind, q, propertyPrice);
    if (problem) {
      const name = C.weaponById.get(id)?.name ?? C.armorById.get(id)?.name ?? id;
      issues.push({ severity: 'error', step: 'equipment', slot: 'item-quality', message: `${name}: ${problem}` });
    }
  }

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

/** `level` is the level the slot belongs to *within its own track* — the character level for a
 *  general feat, the class level for a class bonus feat. `charLevel` is always the character
 *  level at which it was actually gained, which is what the advancement table rows key off. */
interface FeatSlotKey { key: string; label: string; combatOnly?: boolean; level: number; charLevel: number; }

/** All feat slots opened up through `level`: a general feat at each odd level, racial bonus
 *  feat(s) at level 1, and class bonus feats at the class's `bonusFeats.levels`. Level-1 keys
 *  keep their bare form (`feat-1`, `feat-<class>`) for back-compat; later levels are suffixed. */
function featSlots(dec: Decisions, race: C.RaceDef | undefined, level: number): FeatSlotKey[] {
  const out: FeatSlotKey[] = [];
  // General feats come from the *character* level — they don't care how the levels are split.
  for (const l of generalFeatLevels(level))
    out.push({ key: l === 1 ? 'feat-1' : `feat-L${l}`, label: `${ordinal(l)}-level feat`, level: l, charLevel: l });
  const { standard, alternates } = activeRacialTraits(dec);
  for (const t of [...standard, ...alternates])
    if (t.grantsFeatSlot) out.push({ key: t.grantsFeatSlot, label: `${race?.name ?? 'Racial'} bonus feat`, level: 1, charLevel: 1 });
  // Class bonus feats key off that class's own level, so the slot key is stable no matter which
  // character levels the class was taken at.
  const ids = classIdAtLevels(dec, level);
  for (const c of classBreakdown(dec, level)) {
    const bf = c.klass.bonusFeats;
    if (!bf) continue;
    const label = `${bf.label ?? `${c.klass.name} bonus feat`}${bf.combatOnly ? ' · combat only' : ''}`;
    // Character levels at which this class was taken, in order: index n-1 is its nth class level.
    const takenAt = ids.map((id, i) => (id === c.klass.id ? i + 1 : 0)).filter(Boolean);
    for (const l of bf.levels) {
      if (l > c.levels) continue;
      out.push({
        key: l === 1 ? `feat-${c.klass.id}` : `feat-${c.klass.id}-L${l}`,
        label, combatOnly: bf.combatOnly, level: l, charLevel: takenAt[l - 1] ?? l,
      });
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
      const isBlessing = ch.kind === 'warpriest-blessings';
      const noun = isBlessing ? 'blessing' : 'domain';
      const deity = dec.deityId ? C.deityById.get(dec.deityId) : undefined;
      const allowed = deity && deity.id !== 'none' ? new Set(deity.domains) : null;
      return C.DOMAINS.map((d) => {
        const bless = isBlessing ? C.blessingById.get(d.id) : undefined;
        const desc = bless ? `Minor (1st): ${bless.minor}  ·  Major (10th): ${bless.major}` : d.desc;
        return {
          id: d.id, name: d.name, desc,
          legal: allowed ? allowed.has(d.id) : true,
          whyNot: allowed && !allowed.has(d.id) ? `${deity!.name} does not grant the ${d.name} ${noun}` : undefined,
        };
      });
    }
    case 'sorcerer-bloodline':
      return C.BLOODLINES.map((b) => ({ id: b.id, name: b.name, desc: b.desc, legal: true, meta: { classSkill: b.classSkill } }));
    case 'oracle-revelation': {
      // Source-dependent: revelations come from the chosen mystery.
      const mystery = (dec.classChoices['mystery'] ?? [])[0];
      const list = mystery ? C.ORACLE_REVELATIONS[mystery] : undefined;
      if (!list) return [];
      return list.map((o) => ({ id: o.id, name: o.name, desc: o.desc, legal: true }));
    }
    case 'list':
      return (ch.options ?? []).map((o) => ({ id: o.id, name: o.name, desc: o.desc, legal: true }));
    default:
      return [];
  }
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

// Re-export for other modules.
export { activeRacialTraits, finalAbilities };
