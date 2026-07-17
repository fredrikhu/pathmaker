// Core model shared by engine, content, and UI. See docs/DESIGN.md.

export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export type Alignment = 'LG' | 'NG' | 'CG' | 'LN' | 'N' | 'CN' | 'LE' | 'NE' | 'CE';
export const ALIGNMENTS: Alignment[] = ['LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE'];

/** Typed bonuses. Same-type bonuses take the highest only, except the STACKING types. */
export type BonusType =
  | 'base' | 'racial' | 'enhancement' | 'dodge' | 'trait' | 'morale' | 'competence'
  | 'luck' | 'insight' | 'sacred' | 'deflection' | 'natural-armor' | 'armor' | 'shield'
  | 'size' | 'circumstance' | 'alchemical' | 'resistance' | 'untyped' | 'penalty';

export const STACKING_TYPES: ReadonlySet<BonusType> = new Set([
  'base', 'dodge', 'circumstance', 'untyped', 'penalty',
]);

export interface Effect {
  /** Stat node id, e.g. "ability:str", "skill:perception", "save:will", "ac", "init". */
  target: string;
  type: BonusType;
  value: number;
  /** Source label for breakdowns, e.g. "Keen Senses (Elf)". */
  note: string;
  /** If set, the effect is an annotation ("+2 vs enchantment"), never folded into totals. */
  condition?: string;
}

// ---------- Predicates ----------

export type Predicate =
  | { all: Predicate[] }
  | { any: Predicate[] }
  | { not: Predicate }
  | { ability: Ability; gte: number }
  | { bab: number }
  | { feat: string }
  | { race: string }
  | { classId: string }
  | { casterLevel: number }
  | { alignment: Alignment[] }
  | { skillRanks: { skill: string; gte: number } };

// ---------- Character document (persisted; decisions only, no derived values) ----------

export type DecisionValue = unknown;

export interface CharacterDoc {
  schemaVersion: number;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Target character level being built, 1–20. Single-class for now. */
  level: number;
  abilityMethod: 'pb15' | 'pb20' | 'pb25' | 'roll' | 'manual';
  /** slotId -> chosen value. Unknown slots are kept (orphans) until cleared.
   *  Per-level decisions reuse the same maps with level-suffixed keys, e.g. the `feats`
   *  map holds `feat-L3`, the `class-choices` map holds `rogue-talent-L2`. Two per-level
   *  decisions live at the top level: `hp-rolls` (Record<level, hpGained> for levels ≥ 2)
   *  and `ability-increases` (Record<level, Ability> for 4/8/12/16/20). */
  decisions: Record<string, DecisionValue>;
  purchases: Record<string, number>;
  goldSpent: number;
  equipped: { armor: string | null; mainHand: string | null; offHand: string | null };
  /** Mutable in-play state layered over the resolved build (phase 3). Absent for fresh/legacy docs. */
  play?: PlayState;
}

/** Session state that changes during play, kept separate from the build `decisions`. */
export interface PlayState {
  /** Damage taken from maximum HP; current HP = max − hpDamage. */
  hpDamage: number;
  tempHp: number;
  nonlethal: number;
  /** Spell slots expended so far, per spell level. */
  usedSlots: Record<number, number>;
  /** Active conditions (phase-3 increment 2). */
  conditions: string[];
  /** Resource pool points/uses/rounds expended so far, per pool id. */
  usedPools: Record<string, number>;
}

export const emptyPlayState = (): PlayState => ({ hpDamage: 0, tempHp: 0, nonlethal: 0, usedSlots: {}, conditions: [], usedPools: {} });

// ---------- Resolver outputs (the UI's entire diet) ----------

export interface BreakdownLine {
  label: string;
  value: number;
}

export interface Stat {
  id: string;
  label: string;
  total: number;
  lines: BreakdownLine[];
  /** Conditional bonuses displayed adjacent to the stat, never in the total. */
  annotations: string[];
}

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  severity: Severity;
  /** Step id for navigation. */
  step: string;
  /** Slot to highlight, when applicable. */
  slot?: string;
  message: string;
  /** Present on orphaned-decision issues: offering one-click clear in the panel. */
  clearSlot?: string;
}

export interface SlotOption {
  id: string;
  name: string;
  desc?: string;
  tags?: string[];
  legal: boolean;
  whyNot?: string;
  /** Decisions this option would orphan (legal, selectable, warning voice). */
  wouldInvalidate?: { slotLabel: string; decisionName: string }[];
  /** Persistent cautionary marker (e.g. "opposed school — double slot"). */
  caution?: string;
  meta?: Record<string, string | number>;
}

export interface ChoiceSlot {
  id: string;
  step: string;
  label: string;
  count: number;
  multi: boolean;
  selected: string[];
  options: SlotOption[];
  /** Display-only slots render without interaction (e.g. "all cantrips: automatic"). */
  auto?: boolean;
}

/** One row of the class advancement table: what the character gains at a given level. */
export interface ProgressionRow {
  level: number;
  bab: number;
  fort: number;
  ref: number;
  will: number;
  /** Class-feature names gained at this level. */
  features: string[];
  /** Feat-slot labels opened at this level (general + class bonus + racial). */
  featSlots: string[];
  /** The chosen ability increase at this level, if any (4/8/12/16/20). */
  abilityIncrease?: Ability;
  /** Hit points gained at this level (max die at 1; roll/average after). */
  hp: number;
}

/** A class resource with a per-day/points maximum (rage rounds, ki, channel, grit…). */
export interface ResourcePool {
  id: string;
  name: string;
  max: number;
  unit: 'rounds' | 'uses' | 'points';
}

export interface Sheet {
  level: number;
  stats: Record<string, Stat>;
  /** Ordered skill rows for the skills step / sheet. */
  skillIds: string[];
  classSkillIds: string[];
  acpSkillIds: string[];
  skillRanksTotal: number;
  skillRanksSpent: number;
  gold: number;
  load: { current: number; light: number; medium: number; heavy: number; label: string };
  /** Effective land speed plus any special movement modes (feet). `reducedFrom` is the
   *  unencumbered land speed when armor/load has slowed it. Display only in phase 1. */
  speed: { base: number; reducedFrom?: number; fly?: number; swim?: number; climb?: number; burrow?: number };
  /** Caster level and spell slots per day (index = spell level), when the class casts. */
  casterLevel?: number;
  spellSlots?: number[];
  /** Known-spell counts per spell level for spontaneous casters (index = spell level). */
  spellsKnown?: number[];
  /** Per-level advancement table for the Advancement view and sheet. */
  progression: ProgressionRow[];
  /** Class resource pools with computed maxima (for the play sheet). */
  pools: ResourcePool[];
  summaryLine: string; // "LN Human Fighter 1"
}

export interface Resolution {
  sheet: Sheet;
  slots: ChoiceSlot[];
  issues: Issue[];
  /** Steps in display order, derived from emitted slots. */
  steps: string[];
}

export const abilityMod = (score: number): number => Math.floor((score - 10) / 2);

export const fmtMod = (v: number): string => (v >= 0 ? `+${v}` : `−${Math.abs(v)}`);

/** Non-land movement modes, e.g. "fly 60 ft, swim 30 ft" (empty if none). */
export const speedExtra = (s: Sheet['speed']): string => {
  const p: string[] = [];
  if (s.fly) p.push(`fly ${s.fly} ft`);
  if (s.swim) p.push(`swim ${s.swim} ft`);
  if (s.climb) p.push(`climb ${s.climb} ft`);
  if (s.burrow) p.push(`burrow ${s.burrow} ft`);
  return p.join(', ');
};

/** "30 ft", "20 ft (30 base) · swim 30 ft", etc. Includes the pre-reduction base when slowed. */
export const speedLabel = (s: Sheet['speed']): string => {
  const parts = [s.reducedFrom ? `${s.base} ft (${s.reducedFrom} base)` : `${s.base} ft`];
  const extra = speedExtra(s);
  if (extra) parts.push(extra);
  return parts.join(' · ');
};
