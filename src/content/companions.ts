// Companion creatures: the three advancement tables and the creature catalogue behind them.
//
// Every number here was read off d20pfsrd (Animal Companions, Eidolons, Familiars, and the
// Bestiary entries for the eleven Core familiar animals) rather than recalled. The tables are
// the whole of the rules math; the catalogue entries are the printed stat blocks unchanged, so
// the engine derives a companion the same way a player would read the two side by side.

import type { Ability } from '../engine/types';
import type {
  CompanionAdvanceDef, CompanionAttackDef, CompanionDef, CompanionStatsDef, CreatureSize,
} from './model';

// ---------- Advancement tables ----------

/** One row of Table: Animal Companion Base Statistics, indexed by effective druid level. */
export interface AnimalCompanionRow {
  hd: number;
  bab: number;
  fort: number;
  ref: number;
  will: number;
  skills: number;
  feats: number;
  /** Natural-armour bonus the table adds on top of the creature's own. */
  naturalArmor: number;
  /** Added to *both* Strength and Dexterity. */
  strDex: number;
  tricks: number;
  special: string[];
}

const acRow = (
  hd: number, bab: number, fort: number, ref: number, will: number, skills: number, feats: number,
  naturalArmor: number, strDex: number, tricks: number, special: string[] = [],
): AnimalCompanionRow => ({ hd, bab, fort, ref, will, skills, feats, naturalArmor, strDex, tricks, special });

/** Table: Animal Companion Base Statistics (Core Rulebook), index 0 = effective druid level 1.
 *  Verified against d20pfsrd. Note the ability-score increases land at 4/9/14/20 and Multiattack
 *  at 9th — both differ from the eidolon table, which is why the two are kept separate. */
export const ANIMAL_COMPANION_TABLE: AnimalCompanionRow[] = [
  acRow(2, 1, 3, 3, 0, 2, 1, 0, 0, 1, ['Link', 'Share spells']),
  acRow(3, 2, 3, 3, 1, 3, 2, 0, 0, 1),
  acRow(3, 2, 3, 3, 1, 3, 2, 2, 1, 2, ['Evasion']),
  acRow(4, 3, 4, 4, 1, 4, 2, 2, 1, 2, ['Ability score increase']),
  acRow(5, 3, 4, 4, 1, 5, 3, 2, 1, 2),
  acRow(6, 4, 5, 5, 2, 6, 3, 4, 2, 3, ['Devotion']),
  acRow(6, 4, 5, 5, 2, 6, 3, 4, 2, 3),
  acRow(7, 5, 5, 5, 2, 7, 4, 4, 2, 3),
  acRow(8, 6, 6, 6, 2, 8, 4, 6, 3, 4, ['Ability score increase', 'Multiattack']),
  acRow(9, 6, 6, 6, 3, 9, 5, 6, 3, 4),
  acRow(9, 6, 6, 6, 3, 9, 5, 6, 3, 4),
  acRow(10, 7, 7, 7, 3, 10, 5, 8, 4, 5),
  acRow(11, 8, 7, 7, 3, 11, 6, 8, 4, 5),
  acRow(12, 9, 8, 8, 4, 12, 6, 8, 4, 5, ['Ability score increase']),
  acRow(12, 9, 8, 8, 4, 12, 6, 10, 5, 6, ['Improved evasion']),
  acRow(13, 9, 8, 8, 4, 13, 7, 10, 5, 6),
  acRow(14, 10, 9, 9, 4, 14, 7, 10, 5, 6),
  acRow(15, 11, 9, 9, 5, 15, 8, 12, 6, 7),
  acRow(15, 11, 9, 9, 5, 15, 8, 12, 6, 7),
  acRow(16, 12, 10, 10, 5, 16, 8, 12, 6, 7, ['Ability score increase']),
];

/** One row of Table: Eidolon Base Statistics, indexed by summoner level. Saves are printed as
 *  "good"/"poor" rather than per-save, because which saves are good comes from the base form. */
export interface EidolonRow {
  hd: number;
  bab: number;
  goodSave: number;
  poorSave: number;
  skills: number;
  feats: number;
  /** Inherent bonus to the eidolon's natural armour. */
  armor: number;
  /** Added to *both* Strength and Dexterity. */
  strDex: number;
  pool: number;
  maxAttacks: number;
  special: string[];
}

const eRow = (
  hd: number, bab: number, goodSave: number, poorSave: number, skills: number, feats: number,
  armor: number, strDex: number, pool: number, maxAttacks: number, special: string[] = [],
): EidolonRow => ({ hd, bab, goodSave, poorSave, skills, feats, armor, strDex, pool, maxAttacks, special });

/** Table: Eidolon Base Statistics (APG), index 0 = summoner level 1. Verified against d20pfsrd.
 *  The `pool` column is the same series as `EIDOLON_EVOLUTION_POOL` in subsystems.ts, which the
 *  evolution point-buy already reads; both are kept because they are consumed in different places. */
export const EIDOLON_TABLE: EidolonRow[] = [
  eRow(1, 1, 2, 0, 4, 1, 0, 0, 3, 3, ['Darkvision', 'Link', 'Share spells']),
  eRow(2, 2, 3, 0, 8, 1, 2, 1, 4, 3, ['Evasion']),
  eRow(3, 3, 3, 1, 12, 2, 2, 1, 5, 3),
  eRow(3, 3, 3, 1, 12, 2, 2, 1, 7, 4),
  eRow(4, 4, 4, 1, 16, 2, 4, 2, 8, 4, ['Ability score increase']),
  eRow(5, 5, 4, 1, 20, 3, 4, 2, 9, 4, ['Devotion']),
  eRow(6, 6, 5, 2, 24, 3, 6, 3, 10, 4),
  eRow(6, 6, 5, 2, 24, 3, 6, 3, 11, 4),
  eRow(7, 7, 5, 2, 28, 4, 6, 3, 13, 5, ['Multiattack']),
  eRow(8, 8, 6, 2, 32, 4, 8, 4, 14, 5, ['Ability score increase']),
  eRow(9, 9, 6, 3, 36, 5, 8, 4, 15, 5),
  eRow(9, 9, 6, 3, 36, 5, 10, 5, 16, 5),
  eRow(10, 10, 7, 3, 40, 5, 10, 5, 17, 5),
  eRow(11, 11, 7, 3, 44, 6, 10, 5, 19, 6, ['Improved evasion']),
  eRow(12, 12, 8, 4, 48, 6, 12, 6, 20, 6, ['Ability score increase']),
  eRow(12, 12, 8, 4, 48, 6, 12, 6, 21, 6),
  eRow(13, 13, 8, 4, 52, 7, 14, 7, 22, 6),
  eRow(14, 14, 9, 4, 56, 7, 14, 7, 23, 6),
  eRow(15, 15, 9, 5, 60, 8, 14, 7, 25, 7),
  eRow(15, 15, 9, 5, 60, 8, 16, 8, 26, 7),
];

/** One row of Table: Familiars, indexed by master class level. */
export interface FamiliarRow {
  /** Natural-armour adjustment the familiar gains from its master's level. */
  naturalArmor: number;
  /** The familiar's Intelligence score, which the table sets outright. */
  int: number;
  special: string[];
}

/** Table: Familiars (Core Rulebook), index 0 = master class level 1. The printed table has one row
 *  per two levels; it is expanded here so lookup is uniform with the other two tables. Abilities
 *  are cumulative, so only what is *gained* at that level appears. Verified against d20pfsrd. */
export const FAMILIAR_TABLE: FamiliarRow[] = [
  { naturalArmor: 1, int: 6, special: ['Alertness', 'Improved evasion', 'Share spells', 'Empathic link'] },
  { naturalArmor: 1, int: 6, special: [] },
  { naturalArmor: 2, int: 7, special: ['Deliver touch spells'] },
  { naturalArmor: 2, int: 7, special: [] },
  { naturalArmor: 3, int: 8, special: ['Speak with master'] },
  { naturalArmor: 3, int: 8, special: [] },
  { naturalArmor: 4, int: 9, special: ['Speak with animals of its kind'] },
  { naturalArmor: 4, int: 9, special: [] },
  { naturalArmor: 5, int: 10, special: [] },
  { naturalArmor: 5, int: 10, special: [] },
  { naturalArmor: 6, int: 11, special: ['Spell resistance'] },
  { naturalArmor: 6, int: 11, special: [] },
  { naturalArmor: 7, int: 12, special: ['Scry on familiar'] },
  { naturalArmor: 7, int: 12, special: [] },
  { naturalArmor: 8, int: 13, special: [] },
  { naturalArmor: 8, int: 13, special: [] },
  { naturalArmor: 9, int: 14, special: [] },
  { naturalArmor: 9, int: 14, special: [] },
  { naturalArmor: 10, int: 15, special: [] },
  { naturalArmor: 10, int: 15, special: [] },
];

/** Size modifiers a companion's size contributes: to AC and attack rolls, and (inverted) to CMB
 *  and CMD. Verified against the Table: Size Modifiers entries these sizes use. */
export const SIZE_MODIFIERS: Record<CreatureSize, { ac: number; cmb: number }> = {
  diminutive: { ac: 4, cmb: -4 },
  tiny: { ac: 2, cmb: -2 },
  small: { ac: 1, cmb: -1 },
  medium: { ac: 0, cmb: 0 },
  large: { ac: -1, cmb: 1 },
};

export const SIZE_LABEL: Record<CreatureSize, string> = {
  diminutive: 'Diminutive', tiny: 'Tiny', small: 'Small', medium: 'Medium', large: 'Large',
};

/** Average hit points per Hit Die, by die size — the Bestiary convention of ½ die + ½, taken
 *  before the Constitution bonus and floored over the whole total (a 3d8 animal has 13, not 13.5). */
export const COMPANION_HD_AVERAGE: Record<number, number> = { 8: 4.5, 10: 5.5 };

// A mindless creature prints "—" for Intelligence rather than a score. The stat block has no way
// to say "no score", so mindless vermin are authored at Int 1 and carry a 'mindless vermin' tag;
// nothing in the engine reads a companion's Intelligence, and a familiar's is set by its table.

// ---------- Catalogue helpers ----------

const abil = (str: number, dex: number, con: number, int: number, wis: number, cha: number): Record<Ability, number> =>
  ({ str, dex, con, int, wis, cha });

const atk = (name: string, count: number, damage: string, extra: Partial<CompanionAttackDef> = {}): CompanionAttackDef =>
  ({ name, count, damage, ...extra });

const stats = (s: CompanionStatsDef): CompanionStatsDef => s;

const animal = (
  id: string, name: string, start: CompanionStatsDef, advance: CompanionAdvanceDef,
): CompanionDef => ({ id, name, kind: 'animal', start, advance });

// ---------- Animal companions (Core Rulebook, PZO1110) ----------

const LOW_SCENT = ['low-light vision', 'scent'];

/** The seventeen Core Rulebook animal companions. Each entry is its printed Starting Statistics
 *  plus its 4th- or 7th-level advancement, verbatim. A companion whose advancement lands at 7th
 *  is the stronger pick that starts weaker — the level is part of the data, not a constant. */
export const ANIMAL_COMPANIONS: CompanionDef[] = [
  animal('ape', 'Ape',
    stats({
      size: 'medium', speed: { base: 30, climb: 30 }, naturalArmor: 1,
      attacks: [atk('bite', 1, '1d4'), atk('claw', 2, '1d4')],
      abilities: abil(13, 17, 10, 2, 12, 7), senses: LOW_SCENT,
    }),
    { level: 4, size: 'large', naturalArmor: 2, attacks: [atk('bite', 1, '1d6'), atk('claw', 2, '1d6')], abilityAdj: { str: 8, dex: -2, con: 4 } }),
  animal('badger', 'Badger',
    stats({
      size: 'small', speed: { base: 30, burrow: 10, climb: 10 }, naturalArmor: 2,
      attacks: [atk('bite', 1, '1d4'), atk('claw', 2, '1d3')],
      abilities: abil(10, 17, 15, 2, 12, 10), senses: LOW_SCENT,
      specialAttacks: ['rage (as a barbarian, 6 rounds per day)'],
    }),
    { level: 4, size: 'medium', attacks: [atk('bite', 1, '1d6'), atk('claw', 2, '1d4')], abilityAdj: { str: 4, dex: -2, con: 2 } }),
  animal('bear', 'Bear',
    stats({
      size: 'small', speed: { base: 40 }, naturalArmor: 2,
      attacks: [atk('bite', 1, '1d4'), atk('claw', 2, '1d3')],
      abilities: abil(15, 15, 13, 2, 12, 6), senses: LOW_SCENT,
    }),
    { level: 4, size: 'medium', attacks: [atk('bite', 1, '1d6'), atk('claw', 2, '1d4')], abilityAdj: { str: 4, dex: -2, con: 2 } }),
  animal('bird', 'Bird',
    stats({
      size: 'small', speed: { base: 10, fly: 80, flyManeuver: 'average' }, naturalArmor: 1,
      attacks: [atk('bite', 1, '1d4'), atk('talon', 2, '1d4')],
      abilities: abil(10, 15, 12, 2, 14, 6), senses: ['low-light vision'],
    }),
    { level: 4, abilityAdj: { str: 2, con: 2 } }),
  animal('boar', 'Boar',
    stats({
      size: 'small', speed: { base: 40 }, naturalArmor: 6,
      attacks: [atk('gore', 1, '1d6')],
      abilities: abil(13, 12, 15, 2, 13, 4), senses: LOW_SCENT,
    }),
    { level: 4, size: 'medium', attacks: [atk('gore', 1, '1d8')], abilityAdj: { str: 4, dex: -2, con: 2 }, specialAttacks: ['ferocity'] }),
  animal('camel', 'Camel',
    stats({
      size: 'large', speed: { base: 50 }, naturalArmor: 1,
      attacks: [atk('bite', 1, '1d4', { note: 'or spit (ranged touch, sickened 1d4 rounds, 10 ft)' })],
      abilities: abil(18, 16, 14, 2, 11, 4), senses: LOW_SCENT,
    }),
    { level: 4, abilityAdj: { str: 2, con: 2 } }),
  animal('cat-big', 'Cat, big',
    stats({
      size: 'medium', speed: { base: 40 }, naturalArmor: 1,
      attacks: [atk('bite', 1, '1d6'), atk('claw', 2, '1d4')],
      abilities: abil(13, 17, 13, 2, 15, 10), senses: LOW_SCENT,
      specialAttacks: ['rake (1d4)'],
    }),
    {
      level: 7, size: 'large', naturalArmor: 2, attacks: [atk('bite', 1, '1d8'), atk('claw', 2, '1d6')],
      abilityAdj: { str: 8, dex: -2, con: 4 }, specialAttacks: ['grab', 'pounce', 'rake (1d6)'],
    }),
  animal('cat-small', 'Cat, small',
    stats({
      size: 'small', speed: { base: 50 }, naturalArmor: 1,
      attacks: [atk('bite', 1, '1d4', { note: 'plus trip' }), atk('claw', 2, '1d2')],
      abilities: abil(12, 21, 13, 2, 12, 6), senses: LOW_SCENT,
    }),
    {
      level: 4, size: 'medium', attacks: [atk('bite', 1, '1d6'), atk('claw', 2, '1d3')],
      abilityAdj: { str: 4, dex: -2, con: 2 }, specialQualities: ['sprint'],
    }),
  animal('crocodile', 'Crocodile',
    stats({
      size: 'small', speed: { base: 20, swim: 30 }, naturalArmor: 4,
      attacks: [atk('bite', 1, '1d6', { note: 'plus grab' })],
      abilities: abil(15, 14, 15, 1, 12, 2), senses: ['low-light vision'],
      specialQualities: ['hold breath'],
    }),
    {
      level: 4, size: 'medium', attacks: [atk('bite', 1, '1d8', { note: 'or tail slap 1d12' })],
      abilityAdj: { str: 4, dex: -2, con: 2 }, specialAttacks: ['death roll', 'sprint'],
    }),
  animal('deinonychus', 'Deinonychus',
    stats({
      size: 'small', speed: { base: 60 }, naturalArmor: 1,
      attacks: [atk('talon', 2, '1d6'), atk('bite', 1, '1d4')],
      abilities: abil(11, 17, 17, 2, 12, 14), senses: LOW_SCENT,
    }),
    {
      level: 7, size: 'medium', naturalArmor: 2,
      attacks: [atk('talon', 2, '1d8'), atk('bite', 1, '1d6'), atk('claw', 2, '1d4')],
      abilityAdj: { str: 4, dex: -2, con: 2 }, specialAttacks: ['pounce'],
    }),
  animal('dog', 'Dog',
    stats({
      size: 'small', speed: { base: 40 }, naturalArmor: 2,
      attacks: [atk('bite', 1, '1d4')],
      abilities: abil(13, 17, 15, 2, 12, 6), senses: LOW_SCENT,
    }),
    { level: 4, size: 'medium', attacks: [atk('bite', 1, '1d6')], abilityAdj: { str: 4, dex: -2, con: 2 } }),
  animal('horse', 'Horse',
    stats({
      size: 'large', speed: { base: 50 }, naturalArmor: 4,
      attacks: [atk('bite', 1, '1d4'), atk('hoof', 2, '1d6', { secondary: true })],
      abilities: abil(16, 13, 15, 2, 12, 6), senses: LOW_SCENT,
    }),
    { level: 4, abilityAdj: { str: 2, con: 2 }, specialQualities: ['combat trained'] }),
  animal('pony', 'Pony',
    stats({
      size: 'medium', speed: { base: 40 }, naturalArmor: 2,
      attacks: [atk('hoof', 2, '1d3')],
      abilities: abil(13, 13, 12, 2, 11, 4), senses: LOW_SCENT,
    }),
    { level: 4, abilityAdj: { str: 2, con: 2 }, specialQualities: ['combat trained'] }),
  animal('shark', 'Shark',
    stats({
      size: 'small', speed: { base: 0, swim: 60 }, naturalArmor: 4,
      attacks: [atk('bite', 1, '1d4')],
      abilities: abil(13, 15, 15, 1, 12, 2), senses: LOW_SCENT,
    }),
    {
      level: 4, size: 'medium', attacks: [atk('bite', 1, '1d6')],
      abilityAdj: { str: 4, dex: -2, con: 2 }, specialQualities: ['blindsense 30 ft'],
    }),
  animal('snake-constrictor', 'Snake, constrictor',
    stats({
      size: 'medium', speed: { base: 20, climb: 20, swim: 20 }, naturalArmor: 2,
      attacks: [atk('bite', 1, '1d3', { note: 'plus grab' })],
      abilities: abil(15, 17, 13, 1, 12, 2), senses: LOW_SCENT,
    }),
    {
      level: 4, size: 'large', naturalArmor: 1, attacks: [atk('bite', 1, '1d4')],
      abilityAdj: { str: 8, dex: -2, con: 4 }, specialAttacks: ['constrict 1d4'],
    }),
  animal('snake-viper', 'Snake, viper',
    stats({
      size: 'small', speed: { base: 20, climb: 20, swim: 20 }, naturalArmor: 2,
      attacks: [atk('bite', 1, '1d3', { note: 'plus poison' })],
      abilities: abil(8, 17, 11, 1, 12, 2), senses: LOW_SCENT,
    }),
    { level: 4, size: 'medium', attacks: [atk('bite', 1, '1d4', { note: 'plus poison' })], abilityAdj: { str: 4, dex: -2, con: 2 } }),
  animal('wolf', 'Wolf',
    stats({
      size: 'medium', speed: { base: 50 }, naturalArmor: 2,
      attacks: [atk('bite', 1, '1d6', { note: 'plus trip' })],
      abilities: abil(13, 15, 15, 2, 12, 6), senses: LOW_SCENT,
    }),
    { level: 7, size: 'large', naturalArmor: 2, attacks: [atk('bite', 1, '1d8', { note: 'plus trip' })], abilityAdj: { str: 8, dex: -2, con: 4 } }),
  // — Bestiary and Ultimate Magic additions —
  animal('aurochs', 'Aurochs',
    stats({
      size: 'medium', speed: { base: 40 }, naturalArmor: 1,
      attacks: [atk('gore', 1, '1d6')],
      abilities: abil(14, 12, 12, 2, 11, 4), senses: LOW_SCENT,
    }),
    {
      level: 7, size: 'large', naturalArmor: 3, attacks: [atk('gore', 1, '1d8')],
      abilityAdj: { str: 8, dex: -2, con: 4 }, specialQualities: ['stampede', 'trample'],
    }),
  animal('bat-dire', 'Bat, dire',
    stats({
      size: 'medium', speed: { base: 20, fly: 40, flyManeuver: 'good' }, naturalArmor: 0,
      attacks: [atk('bite', 1, '1d6')],
      abilities: abil(9, 17, 9, 2, 14, 6), senses: ['blindsense 40 ft'],
    }),
    { level: 7, size: 'large', naturalArmor: 3, attacks: [atk('bite', 1, '1d8')], abilityAdj: { str: 8, dex: -2, con: 4 } }),
  animal('bear-grizzly', 'Bear, grizzly',
    stats({
      size: 'medium', speed: { base: 40 }, naturalArmor: 1,
      attacks: [atk('bite', 1, '1d6'), atk('claw', 2, '1d4')],
      abilities: abil(17, 13, 13, 2, 13, 6), senses: LOW_SCENT,
    }),
    {
      level: 7, size: 'large', naturalArmor: 4,
      attacks: [atk('bite', 1, '1d8'), atk('claw', 2, '1d6', { note: 'plus grab' })],
      abilityAdj: { str: 4, dex: -2, con: 4 },
    }),
  animal('beetle-giant', 'Beetle, giant',
    stats({
      size: 'small', speed: { base: 20, fly: 20, flyManeuver: 'poor' }, naturalArmor: 6,
      attacks: [atk('bite', 1, '1d6')],
      abilities: abil(13, 12, 13, 1, 11, 4), senses: ['darkvision'],
      specialQualities: ['mindless vermin'],
    }),
    {
      level: 4, size: 'medium', attacks: [atk('bite', 1, '1d8')],
      abilityAdj: { str: 4, dex: -2, con: 2 }, specialAttacks: ['trample (1d4)'],
    }),
  animal('centipede-giant', 'Centipede, giant',
    stats({
      size: 'small', speed: { base: 20, climb: 20 }, naturalArmor: 2,
      attacks: [atk('bite', 1, '1d4', { note: 'plus poison' })],
      abilities: abil(8, 17, 11, 1, 10, 2), senses: ['darkvision 60 ft'],
      specialAttacks: ['poison (1 Dex damage)'], specialQualities: ['mindless vermin', 'cannot be tripped'],
    }),
    { level: 4, size: 'medium', attacks: [atk('bite', 1, '1d6', { note: 'plus poison' })], abilityAdj: { str: 4, dex: -2, con: 2 } }),
  animal('crab-giant', 'Crab, giant',
    stats({
      size: 'small', speed: { base: 30, swim: 20 }, naturalArmor: 5,
      attacks: [atk('claw', 2, '1d3', { note: 'plus grab' })],
      abilities: abil(13, 14, 13, 1, 11, 4), senses: ['darkvision'],
      specialAttacks: ['constrict (1d3)'], specialQualities: ['aquatic', 'mindless vermin', 'water dependency'],
    }),
    {
      level: 4, size: 'medium', attacks: [atk('claw', 2, '1d4', { note: 'plus grab' })],
      abilityAdj: { str: 2, dex: -2, con: 2 }, specialAttacks: ['constrict (1d4)'],
    }),
  animal('dolphin', 'Dolphin',
    stats({
      size: 'medium', speed: { base: 0, swim: 80 }, naturalArmor: 1,
      attacks: [atk('slam', 1, '1d4')],
      abilities: abil(12, 15, 13, 2, 12, 6), senses: ['low-light vision'],
      specialQualities: ['hold breath'],
    }),
    { level: 4, abilityAdj: { str: 2, dex: 2, con: 2 }, specialQualities: ['blindsight 120 ft'] }),
  animal('elephant', 'Elephant',
    stats({
      size: 'medium', speed: { base: 40 }, naturalArmor: 4,
      attacks: [atk('gore', 1, '1d8'), atk('slam', 1, '1d6')],
      abilities: abil(14, 14, 13, 2, 13, 7), senses: LOW_SCENT,
    }),
    {
      level: 7, size: 'large', naturalArmor: 3,
      attacks: [atk('gore', 1, '2d6'), atk('slam', 1, '1d8')],
      abilityAdj: { str: 8, dex: -2, con: 4 }, specialAttacks: ['trample (2d6)'],
    }),
  animal('elk', 'Elk',
    stats({
      size: 'medium', speed: { base: 50 }, naturalArmor: 1,
      attacks: [atk('gore', 1, '1d6', { note: 'or 2 hooves 1d3' })],
      abilities: abil(12, 17, 14, 2, 15, 5), senses: ['low-light vision'],
    }),
    {
      level: 7, size: 'large', naturalArmor: 2,
      attacks: [atk('gore', 1, '1d8', { note: 'or 2 hooves 1d4' })],
      abilityAdj: { str: 8, dex: -2, con: 4 },
    }),
  animal('frog-giant', 'Frog, giant',
    stats({
      size: 'medium', speed: { base: 30, swim: 30 }, naturalArmor: 1,
      attacks: [atk('bite', 1, '1d6')],
      abilities: abil(15, 13, 16, 1, 9, 6), senses: LOW_SCENT,
      specialAttacks: ['tongue (reach 15 ft, grabs but deals no damage)', 'pull'],
    }),
    { level: 4, abilityAdj: { str: 2, dex: 2 }, specialAttacks: ['swallow whole'] }),
  animal('hyena', 'Hyena',
    stats({
      size: 'small', speed: { base: 50 }, naturalArmor: 2,
      attacks: [atk('bite', 1, '1d4', { note: 'plus trip' })],
      abilities: abil(10, 17, 13, 2, 13, 6), senses: LOW_SCENT,
    }),
    { level: 4, size: 'medium', attacks: [atk('bite', 1, '1d6')], abilityAdj: { str: 4, dex: -2, con: 2 } }),
  animal('monitor-lizard', 'Monitor lizard',
    stats({
      size: 'small', speed: { base: 30, swim: 30 }, naturalArmor: 1,
      attacks: [atk('bite', 1, '1d6', { note: 'plus grab' })],
      abilities: abil(13, 17, 12, 2, 12, 6), senses: LOW_SCENT,
    }),
    {
      level: 7, size: 'medium', naturalArmor: 2,
      attacks: [atk('bite', 1, '1d8', { note: 'plus grab and poison' })],
      abilityAdj: { str: 4, dex: -2, con: 4 },
    }),
  animal('octopus', 'Octopus',
    stats({
      size: 'small', speed: { base: 20, swim: 30 }, naturalArmor: 1,
      attacks: [atk('bite', 1, '1d3'), atk('tentacle', 1, '1d2', { secondary: true, note: 'grab' })],
      abilities: abil(12, 17, 14, 2, 12, 3), senses: ['low-light vision'],
      specialQualities: ['ink cloud', 'jet 200 ft'],
    }),
    { level: 4, attacks: [atk('bite', 1, '1d3', { note: 'plus poison' }), atk('tentacle', 1, '1d2', { secondary: true, note: 'grab' })], abilityAdj: { str: 2, con: 2 } }),
  animal('pteranodon', 'Pteranodon',
    stats({
      size: 'medium', speed: { base: 10, fly: 50, flyManeuver: 'clumsy' }, naturalArmor: 0,
      attacks: [atk('bite', 1, '1d8')],
      abilities: abil(8, 21, 10, 2, 14, 12), senses: LOW_SCENT,
    }),
    { level: 7, size: 'large', naturalArmor: 2, attacks: [atk('bite', 1, '2d6')], abilityAdj: { str: 8, dex: -2, con: 4 } }),
  animal('rhinoceros', 'Rhinoceros',
    stats({
      size: 'medium', speed: { base: 40 }, naturalArmor: 4,
      attacks: [atk('gore', 1, '1d8')],
      abilities: abil(14, 14, 15, 2, 13, 5), senses: ['scent'],
    }),
    {
      level: 7, size: 'large', naturalArmor: 3, attacks: [atk('gore', 1, '2d6')],
      abilityAdj: { str: 8, dex: -2, con: 4 }, specialQualities: ['powerful charge (gore, 2d8)'],
    }),
  animal('roc', 'Roc',
    stats({
      size: 'medium', speed: { base: 20, fly: 80 }, naturalArmor: 5,
      attacks: [atk('talon', 2, '1d4'), atk('bite', 1, '1d6')],
      abilities: abil(12, 19, 9, 2, 13, 11), senses: ['low-light vision'],
    }),
    {
      level: 7, size: 'large', naturalArmor: 3,
      attacks: [atk('talon', 2, '1d6', { note: 'plus grab' }), atk('bite', 1, '1d8')],
      abilityAdj: { str: 8, dex: -2, con: 4 },
    }),
  animal('saber-toothed-cat', 'Saber-toothed cat',
    stats({
      size: 'medium', speed: { base: 40 }, naturalArmor: 1,
      attacks: [atk('claw', 2, '1d4', { note: 'plus grab' })],
      abilities: abil(15, 15, 13, 2, 13, 8), senses: LOW_SCENT,
      specialAttacks: ['saber-toothed bite (1d10, only on a grapple check to deal damage)'],
    }),
    {
      level: 7, size: 'large', naturalArmor: 2,
      attacks: [atk('claw', 2, '1d6', { note: 'plus grab' })],
      abilityAdj: { str: 8, dex: -2, con: 4 },
    }),
  animal('scorpion-giant', 'Scorpion, giant',
    stats({
      size: 'medium', speed: { base: 40 }, naturalArmor: 1,
      attacks: [atk('claw', 2, '1d4', { note: 'plus grab' }), atk('sting', 1, '1d4', { note: 'plus poison' })],
      abilities: abil(11, 12, 12, 1, 10, 2), senses: ['darkvision', 'tremorsense 30 ft'],
      specialAttacks: ['poison (1 Str damage)'], specialQualities: ['mindless vermin'],
    }),
    {
      level: 7, size: 'large', naturalArmor: 3,
      attacks: [atk('claw', 2, '1d6', { note: 'plus grab' }), atk('sting', 1, '1d6', { note: 'plus poison' })],
      abilityAdj: { str: 8, dex: -2, con: 4 }, specialAttacks: ['poison (1d2 Str damage)'],
    }),
  animal('snapping-turtle', 'Snapping turtle',
    stats({
      size: 'medium', speed: { base: 20, swim: 20 }, naturalArmor: 10,
      attacks: [atk('bite', 1, '1d6')],
      abilities: abil(8, 10, 9, 1, 13, 6), senses: LOW_SCENT,
      specialQualities: ['hold breath'],
    }),
    {
      level: 7, size: 'large', naturalArmor: 2, attacks: [atk('bite', 1, '1d8', { note: 'plus grab' })],
      abilityAdj: { str: 8, dex: -2, con: 4 },
    }),
  animal('spider-giant', 'Spider, giant',
    stats({
      size: 'small', speed: { base: 30, climb: 30 }, naturalArmor: 0,
      attacks: [atk('bite', 1, '1d4', { note: 'plus poison' })],
      abilities: abil(6, 17, 10, 1, 10, 2), senses: ['darkvision', 'tremorsense 30 ft'],
      specialAttacks: ['poison (1 Str damage)'], specialQualities: ['mindless vermin'],
    }),
    {
      level: 4, size: 'medium', naturalArmor: 1,
      attacks: [atk('bite', 1, '1d6', { note: 'plus poison' })], abilityAdj: { str: 4, dex: -2, con: 2 },
    }),
  animal('stag', 'Stag',
    stats({
      size: 'small', speed: { base: 40 }, naturalArmor: 0,
      attacks: [atk('gore', 1, '1d4')],
      abilities: abil(10, 19, 14, 2, 15, 8), senses: LOW_SCENT,
    }),
    {
      level: 4, size: 'medium', attacks: [atk('gore', 1, '1d6'), atk('hoof', 2, '1d4', { secondary: true })],
      abilityAdj: { str: 2, dex: -2, con: 2 },
    }),
  animal('stegosaurus', 'Stegosaurus',
    stats({
      size: 'medium', speed: { base: 30 }, naturalArmor: 6,
      attacks: [atk('tail', 1, '2d6')],
      abilities: abil(10, 18, 10, 2, 12, 10), senses: LOW_SCENT,
    }),
    {
      level: 7, size: 'large', naturalArmor: 3, attacks: [atk('tail', 1, '2d8', { note: 'plus trip' })],
      abilityAdj: { str: 8, dex: -2, con: 4 },
    }),
  animal('triceratops', 'Triceratops',
    stats({
      size: 'medium', speed: { base: 30 }, naturalArmor: 6,
      attacks: [atk('gore', 1, '1d8')],
      abilities: abil(10, 13, 11, 2, 12, 7),
    }),
    {
      level: 7, size: 'large', naturalArmor: 3, attacks: [atk('gore', 1, '2d6')],
      abilityAdj: { str: 8, dex: -2, con: 4 }, specialQualities: ['powerful charge (gore, 2d8)'],
    }),
  animal('tyrannosaurus', 'Tyrannosaurus',
    stats({
      size: 'medium', speed: { base: 30 }, naturalArmor: 4,
      attacks: [atk('bite', 1, '1d8')],
      abilities: abil(14, 16, 10, 2, 15, 10), senses: LOW_SCENT,
    }),
    {
      level: 7, size: 'large', naturalArmor: 3, attacks: [atk('bite', 1, '2d6', { note: 'plus grab' })],
      abilityAdj: { str: 8, dex: -2, con: 4 },
      specialQualities: ['powerful bite (twice Strength modifier on bite damage)'],
    }),
  animal('velociraptor', 'Velociraptor',
    stats({
      size: 'small', speed: { base: 60 }, naturalArmor: 1,
      attacks: [atk('talon', 2, '1d6'), atk('bite', 1, '1d4')],
      abilities: abil(11, 17, 17, 2, 12, 14), senses: LOW_SCENT,
    }),
    {
      level: 7, size: 'medium', naturalArmor: 2,
      attacks: [atk('talon', 2, '1d8'), atk('bite', 1, '1d6'), atk('claw', 2, '1d4')],
      abilityAdj: { str: 4, dex: -2, con: 2 }, specialAttacks: ['pounce'],
    }),
];

// ---------- Eidolon base forms (APG) ----------

/** The three APG eidolon base forms. Free evolutions cost no pool points; a repeated id means the
 *  form grants that evolution twice (the quadruped's two pairs of legs). The aquatic, avian and
 *  tauric forms from later books are not authored. */
export const EIDOLON_FORMS: CompanionDef[] = [
  {
    id: 'biped', name: 'Biped', kind: 'eidolon',
    desc: 'Two legs, two arms; strong at wielding weapons and reach.',
    goodSaves: ['fort', 'will'],
    freeEvolutions: ['claws', 'limbs', 'limbs'],
    start: {
      size: 'medium', speed: { base: 30 }, naturalArmor: 2,
      attacks: [atk('claw', 2, '1d4')],
      abilities: abil(16, 12, 13, 7, 10, 11), senses: ['darkvision 60 ft'],
    },
  },
  {
    id: 'quadruped', name: 'Quadruped', kind: 'eidolon',
    desc: 'Four legs; fast and strong, good for mounts and maulers.',
    goodSaves: ['fort', 'ref'],
    freeEvolutions: ['bite', 'limbs', 'limbs'],
    start: {
      size: 'medium', speed: { base: 40 }, naturalArmor: 2,
      attacks: [atk('bite', 1, '1d6')],
      abilities: abil(14, 14, 13, 7, 10, 11), senses: ['darkvision 60 ft'],
    },
  },
  {
    id: 'serpentine', name: 'Serpentine', kind: 'eidolon',
    desc: 'A long body with reach and a grabbing tail.',
    goodSaves: ['ref', 'will'],
    freeEvolutions: ['bite', 'climb', 'reach', 'tail', 'tail-slap'],
    start: {
      size: 'medium', speed: { base: 20, climb: 20 }, naturalArmor: 2,
      attacks: [atk('bite', 1, '1d6'), atk('tail slap', 1, '1d6', { secondary: true })],
      abilities: abil(12, 16, 13, 7, 10, 11), senses: ['darkvision 60 ft'],
    },
  },
  {
    id: 'aquatic', name: 'Aquatic', kind: 'eidolon',
    desc: 'Built for water; a strong swimmer with thick hide and gills.',
    goodSaves: ['fort', 'ref'],
    freeEvolutions: ['bite', 'improved-natural-armor', 'gills', 'swim', 'swim'],
    start: {
      size: 'medium', speed: { base: 20, swim: 40 }, naturalArmor: 4,
      attacks: [atk('bite', 1, '1d6')],
      abilities: abil(16, 12, 13, 7, 10, 11), senses: ['darkvision 60 ft'],
      specialQualities: ['May select the mount evolution'],
    },
  },
  {
    id: 'avian', name: 'Avian', kind: 'eidolon',
    desc: 'Birdlike in shape, flying from the moment it is summoned.',
    goodSaves: ['ref', 'will'],
    freeEvolutions: ['claws', 'flight', 'limbs'],
    start: {
      size: 'small', speed: { base: 30, fly: 30, flyManeuver: 'good' }, naturalArmor: 2,
      attacks: [atk('claw', 2, '1d3')],
      abilities: abil(12, 16, 13, 7, 10, 11), senses: ['darkvision 60 ft'],
      specialQualities: [
        'Small unless 2 evolution points are spent to be Medium',
        "At 5th level a Medium or larger avian's fly speed rises by 40 ft",
      ],
    },
  },
  {
    id: 'tauric', name: 'Tauric', kind: 'eidolon',
    desc: 'A humanoid upper body on a quadrupedal lower one — arms to wield with, four legs to run on.',
    goodSaves: ['fort', 'will'],
    freeEvolutions: ['claws', 'limbs', 'limbs', 'limbs'],
    start: {
      size: 'small', speed: { base: 40 }, naturalArmor: 2,
      attacks: [atk('claw', 2, '1d4')],
      abilities: abil(14, 14, 13, 7, 10, 11), senses: ['darkvision 60 ft'],
      specialQualities: ['Small unless 2 evolution points are spent to be Medium'],
    },
  },
  // The Wild Caller's plant base forms (Heroes of the Wild). Offered in place of the four APG
  // forms, never alongside them — the archetype names them explicitly via `companionIds`.
  {
    id: 'cactus', name: 'Cactus', kind: 'eidolon',
    desc: 'Desert. A spined trunk that clubs and stings.',
    goodSaves: ['fort', 'ref'],
    freeEvolutions: ['limbs', 'limbs', 'sting', 'tail'],
    start: {
      size: 'medium', speed: { base: 30 }, naturalArmor: 2,
      attacks: [atk('slam', 1, '1d8'), atk('sting', 1, '1d4')],
      abilities: abil(14, 14, 13, 7, 10, 11), senses: ['darkvision 60 ft'],
      specialQualities: ['plant type', 'extraplanar'],
    },
  },
  {
    id: 'conifer', name: 'Conifer', kind: 'eidolon',
    desc: 'Forest and mountain. Needled boughs that rake, and sap that shrugs off the cold.',
    goodSaves: ['fort', 'will'],
    freeEvolutions: ['claws', 'limbs', 'limbs', 'resistance'],
    start: {
      size: 'medium', speed: { base: 30 }, naturalArmor: 2,
      attacks: [atk('claw', 2, '1d4')],
      abilities: abil(14, 12, 15, 7, 10, 11), senses: ['darkvision 60 ft'],
      specialQualities: ['plant type', 'extraplanar', 'resist cold 10'],
    },
  },
  {
    id: 'mushroom', name: 'Mushroom', kind: 'eidolon',
    desc: 'Swamp and underground. A squat fungal body with a venomous bite.',
    goodSaves: ['fort', 'ref'],
    freeEvolutions: ['bite', 'limbs', 'limbs', 'poison'],
    start: {
      size: 'medium', speed: { base: 20 }, naturalArmor: 2,
      attacks: [atk('bite', 1, '1d6', { note: 'plus poison' })],
      abilities: abil(14, 14, 13, 7, 10, 11), senses: ['darkvision 60 ft'],
      specialQualities: ['plant type', 'extraplanar'],
    },
  },
  {
    id: 'tree', name: 'Tree', kind: 'eidolon',
    desc: 'Forest, jungle and swamp. Heavy bark and two crushing limbs.',
    goodSaves: ['fort', 'ref'],
    freeEvolutions: ['improved-natural-armor', 'limbs', 'limbs', 'slam', 'slam'],
    start: {
      size: 'medium', speed: { base: 20 }, naturalArmor: 4,
      attacks: [atk('slam', 2, '1d8')],
      abilities: abil(16, 12, 13, 7, 10, 11), senses: ['darkvision 60 ft'],
      specialQualities: ['plant type', 'extraplanar'],
    },
  },
];

// ---------- Familiars (Core Rulebook) ----------

const familiar = (
  id: string, name: string, start: CompanionStatsDef, masterBenefit: string,
): CompanionDef => ({ id, name, kind: 'familiar', start, masterBenefit });

/** The eleven Core familiar animals, as their Bestiary stat blocks print them. A familiar keeps
 *  its own size, speed, senses and damage dice; almost everything else is derived from its master,
 *  so these blocks are deliberately thin. */
export const FAMILIARS: CompanionDef[] = [
  familiar('bat', 'Bat',
    stats({
      size: 'diminutive', speed: { base: 5, fly: 40, flyManeuver: 'good' }, naturalArmor: 0,
      attacks: [atk('bite', 1, '1d3')],
      abilities: abil(1, 15, 6, 2, 14, 5), senses: ['blindsense 20 ft', 'low-light vision'],
    }),
    'Master gains a +3 bonus on Fly checks.'),
  familiar('cat', 'Cat',
    stats({
      size: 'tiny', speed: { base: 30 }, naturalArmor: 0,
      attacks: [atk('claw', 2, '1d2'), atk('bite', 1, '1d3')],
      abilities: abil(3, 15, 8, 2, 12, 7), senses: LOW_SCENT,
    }),
    'Master gains a +3 bonus on Stealth checks.'),
  familiar('hawk', 'Hawk',
    stats({
      size: 'tiny', speed: { base: 10, fly: 60, flyManeuver: 'average' }, naturalArmor: 0,
      attacks: [atk('talon', 2, '1d4')],
      abilities: abil(6, 17, 11, 2, 14, 7), senses: ['low-light vision'],
    }),
    'Master gains a +3 bonus on sight-based and opposed Perception checks in bright light.'),
  familiar('lizard', 'Lizard',
    stats({
      size: 'tiny', speed: { base: 20, climb: 20 }, naturalArmor: 0,
      attacks: [atk('bite', 1, '1d4')],
      abilities: abil(3, 15, 8, 1, 12, 2), senses: ['low-light vision'],
    }),
    'Master gains a +3 bonus on Climb checks.'),
  familiar('monkey', 'Monkey',
    stats({
      size: 'tiny', speed: { base: 30, climb: 30 }, naturalArmor: 0,
      attacks: [atk('bite', 1, '1d3')],
      abilities: abil(3, 15, 10, 2, 12, 5), senses: ['low-light vision'],
    }),
    'Master gains a +3 bonus on Acrobatics checks.'),
  familiar('owl', 'Owl',
    stats({
      size: 'tiny', speed: { base: 10, fly: 60, flyManeuver: 'average' }, naturalArmor: 0,
      attacks: [atk('talon', 2, '1d4')],
      abilities: abil(6, 17, 11, 2, 15, 6), senses: ['low-light vision'],
    }),
    'Master gains a +3 bonus on sight-based and opposed Perception checks in shadows or darkness.'),
  familiar('rat', 'Rat',
    stats({
      size: 'tiny', speed: { base: 15, climb: 15, swim: 15 }, naturalArmor: 0,
      attacks: [atk('bite', 1, '1d3')],
      abilities: abil(2, 15, 11, 2, 13, 2), senses: LOW_SCENT,
    }),
    'Master gains a +2 bonus on Fortitude saves.'),
  familiar('raven', 'Raven',
    stats({
      size: 'tiny', speed: { base: 10, fly: 40, flyManeuver: 'average' }, naturalArmor: 0,
      attacks: [atk('bite', 1, '1d3')],
      abilities: abil(2, 15, 8, 2, 15, 7), senses: ['low-light vision'],
    }),
    'Master gains a +3 bonus on Appraise checks.'),
  familiar('toad', 'Toad',
    stats({
      size: 'diminutive', speed: { base: 5 }, naturalArmor: 0,
      attacks: [],
      abilities: abil(1, 12, 6, 1, 15, 4), senses: LOW_SCENT,
    }),
    'Master gains +3 hit points.'),
  familiar('viper', 'Viper',
    stats({
      size: 'tiny', speed: { base: 20, climb: 20, swim: 20 }, naturalArmor: 1,
      attacks: [atk('bite', 1, '1d2', { note: 'plus poison' })],
      abilities: abil(4, 17, 8, 1, 13, 2), senses: LOW_SCENT,
    }),
    'Master gains a +3 bonus on Bluff checks.'),
  familiar('weasel', 'Weasel',
    stats({
      size: 'tiny', speed: { base: 20, climb: 20 }, naturalArmor: 1,
      attacks: [atk('bite', 1, '1d3', { note: 'plus attach' })],
      abilities: abil(3, 15, 10, 2, 12, 5), senses: LOW_SCENT,
    }),
    'Master gains a +2 bonus on Reflex saves.'),
  // — Bestiary and Ultimate Magic additions —
  familiar('centipede-house', 'Centipede, house',
    stats({
      size: 'tiny', speed: { base: 40, climb: 40 }, naturalArmor: 2,
      attacks: [atk('bite', 1, '1d3', { note: 'plus poison' })],
      abilities: abil(1, 17, 10, 1, 10, 2), senses: ['darkvision 60 ft'],
      specialQualities: ['mindless vermin', 'immune to mind-affecting effects'],
    }),
    'Master gains a +3 bonus on Stealth checks.'),
  familiar('compsognathus', 'Compsognathus',
    stats({
      size: 'tiny', speed: { base: 40, swim: 20 }, naturalArmor: 1,
      attacks: [atk('bite', 1, '1d3', { note: 'plus poison' })],
      abilities: abil(8, 15, 14, 2, 11, 5), senses: LOW_SCENT,
    }),
    'Master gains a +4 bonus on Initiative checks.'),
  familiar('crab-king', 'Crab, king',
    stats({
      size: 'tiny', speed: { base: 30, swim: 20 }, naturalArmor: 4,
      attacks: [atk('claw', 2, '1d2', { note: 'plus grab' })],
      abilities: abil(7, 15, 12, 1, 10, 2), senses: ['darkvision 60 ft'],
      specialAttacks: ['constrict'],
      specialQualities: ['aquatic', 'mindless vermin', 'immune to mind-affecting effects'],
    }),
    'Master gains a +2 bonus on CMB checks to start and maintain a grapple.'),
  familiar('donkey-rat', 'Donkey rat',
    stats({
      size: 'small', speed: { base: 30, swim: 20 }, naturalArmor: 0,
      attacks: [atk('bite', 1, '1d3')],
      abilities: abil(6, 17, 13, 2, 13, 4), senses: LOW_SCENT,
    }),
    'Master gains a +2 bonus on Fortitude saves.'),
  familiar('fox', 'Fox',
    stats({
      size: 'tiny', speed: { base: 40 }, naturalArmor: 0,
      attacks: [atk('bite', 1, '1d3')],
      abilities: abil(9, 15, 13, 2, 12, 6), senses: LOW_SCENT,
    }),
    'Master gains a +2 bonus on Reflex saves.'),
  familiar('goat', 'Goat',
    stats({
      size: 'small', speed: { base: 30 }, naturalArmor: 1,
      attacks: [atk('gore', 1, '1d4')],
      abilities: abil(12, 13, 12, 2, 11, 5), senses: ['low-light vision'],
    }),
    'Master gains a +3 bonus on Survival checks.'),
  familiar('hedgehog', 'Hedgehog',
    stats({
      size: 'diminutive', speed: { base: 20 }, naturalArmor: 1,
      attacks: [],
      abilities: abil(1, 16, 6, 2, 12, 7), senses: ['low-light vision'],
      specialQualities: ['spiny defense'],
    }),
    'Master gains a +2 bonus on Will saves.'),
  familiar('scorpion-greensting', 'Scorpion, greensting',
    stats({
      size: 'tiny', speed: { base: 30 }, naturalArmor: 3,
      attacks: [atk('sting', 1, '1d2', { note: 'plus poison' })],
      abilities: abil(3, 16, 10, 1, 10, 2), senses: ['darkvision 60 ft'],
      specialQualities: ['mindless vermin', 'immune to mind-affecting effects'],
    }),
    'Master gains a +4 bonus on Initiative checks.'),
  familiar('turtle', 'Turtle',
    stats({
      size: 'tiny', speed: { base: 5, swim: 20 }, naturalArmor: 6,
      attacks: [atk('bite', 1, '1d3')],
      abilities: abil(3, 6, 8, 2, 12, 3), senses: ['low-light vision'],
    }),
    'Master gains a +1 natural armor bonus to AC.'),
];

export const COMPANIONS: CompanionDef[] = [...ANIMAL_COMPANIONS, ...EIDOLON_FORMS, ...FAMILIARS];

const byId = new Map(COMPANIONS.map((c) => [`${c.kind}:${c.id}`, c]));

/** Companions are keyed by kind *and* id. The three catalogues describe the same animals from
 *  different angles — a cat is an animal companion at one size and a familiar at another — so ids
 *  are only unique within a kind, and the kind is always part of the lookup. */
export const companionById = (kind: CompanionDef['kind'], id: string): CompanionDef | undefined =>
  byId.get(`${kind}:${id}`);

export const companionsOfKind = (kind: CompanionDef['kind']): CompanionDef[] =>
  COMPANIONS.filter((c) => c.kind === kind);
