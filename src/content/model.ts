import type { Ability, Alignment, Effect, Predicate } from '../engine/types';

export interface RacialTraitDef {
  id: string;
  name: string;
  desc: string;
  effects?: Effect[];
  /** Extra choice slots this trait opens (e.g. human bonus feat). */
  grantsFeatSlot?: string;
  /** Extra skill ranks per level (human Skilled). */
  skillRanksPerLevel?: number;
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

export interface SpellcastingDef {
  kind: 'prepared-book' | 'spontaneous' | 'prepared-list';
  ability: Ability;
  list: 'arcane' | 'bard' | 'divine' | 'druid' | 'ranger' | 'paladin';
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
  | 'sorcerer-bloodline';

export interface ClassChoiceDef {
  id: string; // slot suffix, e.g. "school"
  label: string;
  kind: ClassChoiceKind;
  count: number;
}

export interface ClassDef {
  id: string;
  name: string;
  sub: string;
  desc: string;
  hitDie: number;
  bab: 'full' | 'threequarter' | 'half';
  goodSaves: ('fort' | 'ref' | 'will')[];
  skillRanks: number;
  classSkills: string[];
  startingGold: number;
  alignment?: Alignment[];
  proficiencies: {
    weapons: ('simple' | 'martial')[] | string[];
    armor: ('light' | 'medium' | 'heavy' | 'shield')[];
  };
  features1: ClassFeatureDef[];
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
  /** Feat takes a parameter (Weapon Focus, Skill Focus…). */
  param?: { label: string; options: string[] };
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
  group: 'simple' | 'martial' | 'exotic';
  hands: 'light' | 'one' | 'two' | 'ranged';
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
}

export interface DeityDef {
  id: string;
  name: string;
  alignment: Alignment;
  domains: string[];
  portfolio: string;
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
}

export interface SchoolDef {
  id: string;
  name: string;
  desc: string;
}

export interface DomainDef {
  id: string;
  name: string;
  desc: string;
}

export interface BloodlineDef {
  id: string;
  name: string;
  desc: string;
  classSkill: string;
}
