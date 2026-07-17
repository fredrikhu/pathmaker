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
  abilityMethod: 'pb15' | 'pb20' | 'pb25' | 'roll' | 'manual';
  /** slotId -> chosen value. Unknown slots are kept (orphans) until cleared. */
  decisions: Record<string, DecisionValue>;
  purchases: Record<string, number>;
  goldSpent: number;
  equipped: { armor: string | null; mainHand: string | null; offHand: string | null };
}

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

export interface Sheet {
  stats: Record<string, Stat>;
  /** Ordered skill rows for the skills step / sheet. */
  skillIds: string[];
  classSkillIds: string[];
  acpSkillIds: string[];
  skillRanksTotal: number;
  skillRanksSpent: number;
  gold: number;
  load: { current: number; light: number; medium: number; heavy: number; label: string };
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
