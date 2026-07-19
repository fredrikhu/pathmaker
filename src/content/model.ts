import type { Ability, Alignment, DamageReduction, EnergyResistance, EnergyType, Effect, Predicate } from '../engine/types';
import type { BabProgression, CasterProgression, SpellTable } from '../engine/progression';

export interface RacialTraitDef {
  id: string;
  name: string;
  desc: string;
  effects?: Effect[];
  /** Extra choice slots this trait opens (e.g. human bonus feat). */
  grantsFeatSlot?: string;
  /** Extra skill ranks per level (human Skilled). */
  skillRanksPerLevel?: number;
  /** Racial Weapon Familiarity. `proficient` grants outright proficiency with those weapons;
   *  `martial` reclassifies exotic weapons as martial, which only helps a character whose class
   *  already has martial proficiency. Living on the trait (not the race) means an alternate
   *  trait that replaces Weapon Familiarity correctly takes the proficiency away with it. */
  weaponFamiliarity?: { proficient?: string[]; martial?: string[] };
  /** Racial energy resistance (aasimar, tiefling, the elemental-blooded races). Structured so the
   *  play sheet can subtract it, rather than only describing it. */
  energyResistance?: { type: EnergyType; amount: number }[];
}

export interface AltTraitDef extends RacialTraitDef {
  replaces: string[]; // standard trait ids
}

export interface RaceDef {
  id: string;
  name: string;
  sub: string;
  desc: string;
  size: 'small' | 'medium';
  speed: number;
  /** "Slow and Steady": land speed is never reduced by armor or encumbrance (dwarf, duergar, oread). */
  speedNeverReduced?: boolean;
  /** Non-land movement modes (fly/swim/climb/burrow), in feet. Display only. */
  speeds?: { fly?: number; swim?: number; climb?: number; burrow?: number };
  /** Fixed modifiers, or 'choice' for the floating +2 (human, half-elf, half-orc). */
  abilityMods: Partial<Record<Ability, number>> | 'choice';
  traits: RacialTraitDef[];
  altTraits: AltTraitDef[];
  languagesAuto: string[];
  languagesBonus: string[];
}

export interface ClassFeatureDef {
  id: string;
  name: string;
  desc: string;
  effects?: Effect[];
}

/** A class feature tagged with the class level at which it is gained. */
export interface LeveledFeatureDef extends ClassFeatureDef {
  level: number;
}

export interface SpellcastingDef {
  kind: 'prepared-book' | 'spontaneous' | 'prepared-list';
  ability: Ability;
  list: 'arcane' | 'bard' | 'divine' | 'druid' | 'ranger' | 'paladin';
  /** Slot/known progression speed ('full' 9-level, 'six', or 'four'). Drives caster level. */
  progression?: CasterProgression;
  /** Which verified slot/known table this class uses. Only set when the table is encoded;
   *  absent ⇒ no slot numbers are shown (e.g. arcanist, vampire-hunter). */
  table?: SpellTable;
  /** Spell slots per day at class level 1, index = spell level. */
  slots1: number[];
  /** Spontaneous: spells known at level 1, index = spell level. */
  known1?: number[];
  /** prepared-book: number of 1st-level spells in the starting spellbook (plus all cantrips). */
  bookPicks1?: 'threePlusInt';
}

export type ClassChoiceKind =
  | 'wizard-school'
  | 'wizard-opposition'
  | 'arcane-bond'
  | 'cleric-domains'
  | 'warpriest-blessings'
  | 'sorcerer-bloodline'
  | 'oracle-revelation'
  | 'list';

export interface ClassChoiceDef {
  id: string; // slot suffix, e.g. "school"
  label: string;
  kind: ClassChoiceKind;
  count: number;
  /** Class levels at which this choice is granted. Omitted ⇒ [1] (a one-time level-1 pick).
   *  The engine emits one slot per granted level ≤ the character's level, keyed `<id>-L<level>`
   *  for levels > 1 (the level-1 grant keeps the bare `<id>` key for back-compat). */
  levels?: number[];
  /** For kind: 'list' — the pick-one(-or-more) options, defined inline as data. */
  options?: { id: string; name: string; desc: string }[];
}

export interface ClassDef {
  id: string;
  name: string;
  sub: string;
  desc: string;
  hitDie: number;
  bab: BabProgression;
  goodSaves: ('fort' | 'ref' | 'will')[];
  skillRanks: number;
  classSkills: string[];
  startingGold: number;
  alignment?: Alignment[];
  proficiencies: {
    weapons: ('simple' | 'martial')[] | string[];
    armor: ('light' | 'medium' | 'heavy' | 'shield')[];
  };
  /** Level-1 class features. Retained as the fallback while per-level `features` are authored
   *  class-by-class in Part B; the engine reads `features` when present, else `features1` at L1. */
  features1: ClassFeatureDef[];
  /** Full per-level feature progression (Part B). When present, supersedes `features1`. */
  features?: LeveledFeatureDef[];
  /** Class bonus feat slots, e.g. fighter at every even level, wizard at 5/10/15/20. */
  bonusFeats?: { levels: number[]; combatOnly?: boolean; label?: string };
  /** Fixed feats the class confers automatically (not player choices), e.g. warpriest's Weapon
   *  Focus, wizard's Scribe Scroll, monk's Improved Unarmed Strike / Stunning Fist. Shown read-only
   *  in the Feats step and folded into the character's feat set for prerequisites. */
  grantedFeats?: { level: number; feat: string; note?: string }[];
  choices?: ClassChoiceDef[];
  spellcasting?: SpellcastingDef;
}

export interface SkillDef {
  id: string;
  name: string;
  ability: Ability;
  acp: boolean;
  trainedOnly: boolean;
}

export interface FeatDef {
  id: string;
  name: string;
  types: ('combat' | 'general' | 'metamagic' | 'item-creation')[];
  reqText: string;
  benefit: string;
  prerequisites?: Predicate;
  effects?: Effect[];
  /** Feat takes a parameter (Weapon Focus, Skill Focus…). Options carry a stable `id` (a weapon or
   *  skill id) alongside the display name, so the stored choice survives a rename and can be matched
   *  against the catalogue rather than string-matched on a label. */
  param?: { label: string; options: { id: string; name: string }[] };
}

export interface TraitDef {
  id: string;
  name: string;
  category: 'combat' | 'faith' | 'magic' | 'social' | 'drawback';
  desc: string;
  effects?: Effect[];
  bonusGold?: number; // Rich Parents
}

export interface WeaponDef {
  id: string;
  name: string;
  cost: number;
  weight: number;
  dmg: string;
  crit: string;
  range?: number;
  dmgType: string;
  /** Proficiency group. Firearms are exotic in spirit but form their own group: Exotic Weapon
   *  Proficiency (firearms) grants all of them at once, rather than one weapon at a time. */
  group: 'simple' | 'martial' | 'exotic' | 'firearms';
  hands: 'light' | 'one' | 'two' | 'ranged';
  /** Caveat surfaced on the attack line — e.g. a weapon whose second mode is not modelled. */
  note?: string;
  /** Ranged weapons that add the full Strength modifier to damage, as thrown weapons do —
   *  the sling and the halfling sling staff. */
  strToDamage?: boolean;
  /** Composite bows, which are built to a Strength rating: the rating caps how much of the
   *  wielder's Strength bonus reaches damage, and shooting a bow rated above your own Strength
   *  costs −2 to hit. `costPerPoint` gp is added per point of rating. */
  composite?: { costPerPoint: number };
  /** Firearm-only stats (Ultimate Combat). Present ⇒ the weapon follows the firearm rules:
   *  it resolves against touch AC at close range, misfires, and reloads by the action listed. */
  firearm?: FirearmDef;
}

export interface FirearmDef {
  /** Early firearms touch-attack within one range increment and cap at five; advanced firearms
   *  touch-attack within five increments and cap at ten. */
  era: 'early' | 'advanced';
  /** Whether it is wielded in one or two hands. `WeaponDef.hands` is 'ranged' for every ranged
   *  weapon, so the grip that drives reload time and the one-handed firing penalty lives here. */
  grip: 'one' | 'two';
  /** Natural attack rolls that misfire, as printed ("1" or "1–2"). */
  misfire: string;
  /** Radius of the explosion when a misfire is rolled on an already-broken firearm, in feet.
   *  Absent where the table prints "see text" rather than a distance. */
  burst?: number;
  /** Shots held at once. For early firearms this is usually the number of barrels. */
  capacity: number;
  /** Fires a cone of pellets as an alternative to a single bullet. `cone` is omitted where the
   *  weapon's description does not restate the cone size. */
  scatter?: { cone?: number };
}

export interface ArmorDef {
  id: string;
  name: string;
  cost: number;
  weight: number;
  acBonus: number;
  maxDex: number | null;
  acp: number;
  asf: number;
  slot: 'armor' | 'shield';
  category: 'light' | 'medium' | 'heavy' | 'shield';
}

export interface GearDef {
  id: string;
  name: string;
  cost: number;
  weight: number;
  note?: string;
  /** Used up when used — potions, alchemical splashes, torches, ammunition bundles (phase 5).
   *  Ammunition is tracked per listed bundle ("Arrows (20)"), not per arrow. */
  consumable?: boolean;
  /** Charged item (a wand holds 50 charges when full); tracked per charge in play. */
  charges?: number;
}

export interface DeityDef {
  id: string;
  name: string;
  alignment: Alignment;
  domains: string[];
  portfolio: string;
}

/** A spell that puts a running, numeric effect on the caster's own sheet.
 *
 *  Only spells whose bonus is unconditional and expressible as a typed bonus carry one. Anything
 *  that depends on the target ("+2 AC against evil"), grants a miss chance, or changes the shape of
 *  a roll stays prose — the same line the rest of the engine draws between totals and annotations.
 *
 *  `at(casterLevel)` is a function rather than a table because the scaling rules genuinely differ:
 *  "+1 per three levels, max +3" and "+2, plus 1 per six levels, max +5" have no common shape. */
export interface SpellBuffDef {
  /** `param` is the cast-time choice (resist energy's energy type), when the spell has one. */
  at(casterLevel: number, param?: string): {
    effects: Effect[];
    rounds: number;
    /** Damage reduction / energy resistance the spell grants, which are not stat bonuses. */
    dr?: DamageReduction[];
    resistances?: EnergyResistance[];
  };
  /** How the spell scales, in words, for the play sheet's cast button. */
  scaling: string;
  /** Parts of the spell the engine does not compute — an extra attack, temporary hit points —
   *  surfaced on the running-effect so the reader is not misled by what the numbers omit. */
  caveat?: string;
  /** A choice made at cast time — resist energy picks its energy type. The first option is the
   *  default when a route can't prompt for it (the prepared-list cast button). */
  param?: { label: string; options: { id: string; name: string }[] };
}

/** A spell that puts a self-directed attacker onto the field — spiritual weapon, flaming sphere.
 *  It acts each round on the caster's turn, so it lives on the play mat as a running effect that
 *  prompts a roll rather than as a bonus to the caster's own numbers. */
export interface SpellAttackerDef {
  scaling: string;
  /** True ⇒ it makes an attack roll each round (spiritual weapon). False ⇒ no attack roll; the
   *  target rolls the save instead (flaming sphere). */
  attacks: boolean;
  /** Ability whose modifier is added to its attack roll — spiritual weapon adds Wisdom, not the
   *  caster's casting ability, whatever that is. Only meaningful when `attacks`. */
  attackAbility?: Ability;
  /** Weapon crit string for its threat range, when it strikes like a weapon. */
  crit?: string;
  dmgType: string;
  /** What a target rolls to avoid the damage, when there is no attack roll ("Reflex negates"). */
  save?: string;
  /** Damage per hit and duration in rounds, from caster level. */
  at(casterLevel: number): { damage: string; rounds: number };
  caveat?: string;
}

/** Damage a spell deals, as a dice formula at a given caster level ("5d6" for a fireball at CL 5).
 *  Only spells whose damage is a plain formula carry this; anything conditional stays prose. */
export interface SpellDamageDef {
  at(casterLevel: number): string;
  /** What the roll represents when it is not simply "damage" — "healed", "temporary HP". */
  label?: string;
  /** Caster-level detail the formula alone does not carry ("4 missiles", "2 rays"). */
  note?(casterLevel: number): string;
}

export interface SpellDef {
  id: string;
  name: string;
  level: number; // on this list
  school: string;
  lists: ('arcane' | 'bard' | 'divine' | 'druid')[];
  summary: string;
  cast: string;
  comp: string;
  range: string;
  dur: string;
  save: string;
  desc: string;
  /** Present when casting this spell starts a numeric, running effect on the caster. */
  buff?: SpellBuffDef;
  /** Present when the spell's damage (or healing) is a rollable formula. */
  damage?: SpellDamageDef;
  /** Present when casting the spell places a self-directed attacker on the field. */
  attacker?: SpellAttackerDef;
}

export interface SchoolDef {
  id: string;
  name: string;
  desc: string;
}

export interface DomainDef {
  id: string;
  name: string;
  /** Composed from `powers` — "Name (1st): effect · Name (8th): effect". */
  desc: string;
  /** The domain's two granted powers (cleric). Bonus domain spells are not modelled. */
  powers: { name: string; level: number; desc: string }[];
}

/** Warpriest blessing (keyed by the matching domain id): the minor power granted at 1st level and
 *  the major power granted at 10th. Usable a shared 3 + ½ level times/day (the blessing pool). */
export interface BlessingDef {
  id: string;
  name: string;
  minor: string;
  major: string;
}

export interface BloodlineDef {
  id: string;
  name: string;
  desc: string;
  classSkill: string;
}
