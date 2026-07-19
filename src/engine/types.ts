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

/** A running duration on a condition or buff, counted in combat rounds (phase 4).
 *  Everything is stored in rounds so the clock has a single unit; the UI converts. */
export interface Timer {
  id: string;
  label: string;
  /** Rounds left. Counts down as the clock advances; at 0 the timer expires. */
  remaining: number;
  /** When set, expiring this timer also clears that condition from `conditions`. */
  conditionId?: string;
  /** Numeric effects this running buff applies for as long as it lasts. Resolved from the caster
   *  level at cast time and stored as plain data, so a running spell survives a reload and the
   *  sheet does not have to re-derive it. Expiring the timer removes them. */
  effects?: Effect[];
  /** The spell that started this, when one did — for the caveat shown beside it. */
  spellId?: string;
}

/** Session state that changes during play, kept separate from the build `decisions`. */
export interface PlayState {
  /** Damage taken from maximum HP; current HP = max − hpDamage. */
  hpDamage: number;
  tempHp: number;
  nonlethal: number;
  /** Spell slots expended so far: casting class id → spell level → count. Keyed by class
   *  because a multiclass caster spends each class's slots independently. */
  usedSlots: Record<string, Record<number, number>>;
  /** Active conditions (phase-3 increment 2). */
  conditions: string[];
  /** Resource pool points/uses/rounds expended so far, per pool id. */
  usedPools: Record<string, number>;
  /** Prepared casters: class id → spell level → the spell prepared in each slot (index = slot). */
  prepared?: Record<string, Record<number, string[]>>;
  /** Prepared casters: class id → spell level → which prepared slot indices have been cast. */
  castPrepared?: Record<string, Record<number, number[]>>;
  /** Current combat round; 0 when not in an encounter (phase 4). */
  round: number;
  /** Initiative rolled for the current encounter, or null outside one. */
  initiative: number | null;
  /** Running durations on conditions and buffs. */
  timers: Timer[];
  /** Consumables used up in play: item id → quantity consumed (phase 5). */
  consumed: Record<string, number>;
  /** Charges spent from charged items (wands): item id → charges used. */
  usedCharges: Record<string, number>;
  /** Declaring Power Attack: folds its penalty/bonus into every melee attack line. */
  powerAttack: boolean;
  /** Fighting with both weapons this full attack: applies two-weapon penalties to both hands. */
  twoWeapon: boolean;
}

export const emptyPlayState = (): PlayState => ({
  hpDamage: 0, tempHp: 0, nonlethal: 0, usedSlots: {}, conditions: [], usedPools: {},
  prepared: {}, castPrepared: {}, round: 0, initiative: null, timers: [],
  consumed: {}, usedCharges: {}, powerAttack: false, twoWeapon: false,
});

/** Play state with defaults filled in — older saved docs predate the phase-4 fields. */
export const normalizePlayState = (p: PlayState | undefined): PlayState => ({ ...emptyPlayState(), ...p });

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
  /** Conditional bonuses displayed adjacent to the stat, never in the total. Rendered strings,
   *  kept for the breakdown cards that have always shown them this way. */
  annotations: string[];
  /** The same conditional bonuses, structured — so a roll can offer them as toggles and add the
   *  ones that actually apply. A bonus "+2 against fear" is useless as prose when you are rolling
   *  a save against fear. */
  conditional: ConditionalBonus[];
}

/** A bonus that applies only in a named circumstance. Never in a stat's total; offered at the
 *  point a roll is made, where the player knows whether the circumstance holds. */
export interface ConditionalBonus {
  /** Source label, e.g. "Bless" or "Hardy (Dwarf)". */
  note: string;
  value: number;
  /** The circumstance, e.g. "against fear effects". */
  condition: string;
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
  /** The class taken at this character level, and what class level it represents. */
  className?: string;
  classId?: string;
  classLevel?: number;
  /** Running totals at this character level (summed across classes, not one class's column). */
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

/** One casting class's own progression. A multiclass caster has one block per casting class —
 *  there is no merged progression, so these are never summed. */
export interface CastingBlock {
  classId: string;
  className: string;
  kind: string;
  ability: Ability;
  casterLevel: number;
  /** Slots per day, indexed by spell level (index 0 = cantrips). */
  slots?: number[];
  /** Spontaneous casters only: spells known per spell level. */
  known?: number[];
  /** Set only when preparing and casting are counted separately (the arcanist): how many spells
   *  may be prepared per spell level, as opposed to how many castings `slots` allows. */
  preparedPerLevel?: number[];
  /** 10 + this class's casting-ability modifier; the per-spell DC adds the spell's level. */
  dcBase: number;
}

/** A class resource with a per-day/points maximum (rage rounds, ki, channel, grit…). */
export interface ResourcePool {
  id: string;
  name: string;
  max: number;
  unit: 'rounds' | 'uses' | 'points';
}

/** A feat conferred automatically by the class (not a player choice), shown read-only in Feats. */
export interface GrantedFeat {
  level: number;
  featId: string;
  name: string;
  /** Extra qualifier, e.g. "deity's favored weapon" for warpriest Weapon Focus. */
  note?: string;
  /** Feats that take a parameter (Weapon Focus → which weapon) carry the choice here.
   *  `key` is the decision key under `feat-params`; `value` is the chosen option's id. */
  param?: { key: string; label: string; options: { id: string; name: string }[]; value: string | null };
}

/** One carried item, with what is left of it after play (phase 5). */
export interface InventoryItem {
  id: string;
  name: string;
  kind: 'weapon' | 'armor' | 'gear';
  /** Quantity bought on the build. */
  purchased: number;
  /** Quantity still on hand (purchased − consumed); never below 0. */
  qty: number;
  weightEach: number;
  /** Weight actually carried right now (qty × weightEach). */
  weight: number;
  consumable: boolean;
  /** Charged items (wands) only. */
  charges?: { max: number; remaining: number };
  /** Where it is worn/wielded, if it is. */
  equipped?: 'armor' | 'shield' | 'main' | 'off';
  /** Named special abilities on this item (display names). */
  properties?: string[];
  note?: string;
}

/** A ready-to-use attack line for a wielded/carried weapon (for the play sheet). */
export interface AttackLine {
  id: string;
  name: string;
  kind: 'melee' | 'ranged';
  /** Where the weapon sits: main hand, off hand, or otherwise carried. */
  slot: 'main' | 'off' | 'carried';
  /** Present on the second line a throwable melee weapon produces. The melee and thrown modes of
   *  one weapon share an `id`, so anything keying attack lines must include this. */
  mode?: 'thrown';
  /** Iterative attack bonuses, highest first (e.g. [6, 1] = "+6/+1"). */
  bonuses: number[];
  /** Breakdown of the primary (highest) attack bonus. */
  attackLines: BreakdownLine[];
  /** Full damage string including the ability modifier, e.g. "1d8+4". */
  damage: string;
  /** Numeric contributions to the damage modifier (Str-based). */
  damageLines: BreakdownLine[];
  crit: string;
  dmgType: string;
  range?: number;
  /** "+1" / "mwk" when the weapon is magical or masterwork; empty otherwise. */
  qualityLabel?: string;
  /** Named special abilities on this weapon (display names), e.g. ["Flaming", "Keen"]. */
  properties?: string[];
  /** Rules caveats not folded into the numbers (thrown, two-handed Str, TWF penalties…). */
  notes: string[];
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
  /** Spell-save-DC bonuses that apply to one school only (Spell Focus). The base DC is the
   *  `spell:dc` stat; these are listed separately because they are conditional on the school. */
  spellFocus: { school: string; bonus: number }[];
  /** One block per casting class — a multiclass caster progresses in each separately. This is
   *  the authoritative list; the fields below describe only the primary casting class. */
  casting: CastingBlock[];
  /** Caster level and spell slots per day (index = spell level), for the primary casting class. */
  casterLevel?: number;
  spellSlots?: number[];
  /** Known-spell counts per spell level for spontaneous casters (index = spell level). */
  spellsKnown?: number[];
  /** Per-level advancement table for the Advancement view and sheet. */
  progression: ProgressionRow[];
  /** Class resource pools with computed maxima (for the play sheet). */
  pools: ResourcePool[];
  /** Per-weapon attack lines for wielded/carried weapons (for the play sheet). */
  attacks: AttackLine[];
  /** Feats granted automatically by the class up to this level (read-only in Feats). */
  grantedFeats: GrantedFeat[];
  /** Carried items with play-time quantities/charges; `load` is computed from these. */
  inventory: InventoryItem[];
  /** Which declared combat options this character can actually use, so the UI never has to ask
   *  the rules. Power Attack needs the feat; two-weapon fighting needs a weapon in each hand. */
  combatOptions: { canPowerAttack: boolean; canTwoWeapon: boolean };
  /** Worn magic items. `active` false means a full body slot is suppressing it. */
  worn: { id: string; name: string; slot: string; cost: number; desc: string; active: boolean }[];
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
