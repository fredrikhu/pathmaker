// Pure level→number progression formulas and spell tables. No content or doc imports —
// everything here is a plain function of (progression kind, level, ability modifier), written
// to be multiclass-summable (callers pass one class's levels; sums are the caller's job).

export type BabProgression = 'full' | 'threequarter' | 'half';
export type CasterProgression = 'full' | 'six' | 'four';

/** Base attack bonus contributed by `level` levels of a class with the given BAB progression. */
export function babAt(prog: BabProgression, level: number): number {
  if (level <= 0) return 0;
  if (prog === 'full') return level;
  if (prog === 'threequarter') return Math.floor((level * 3) / 4);
  return Math.floor(level / 2); // half
}

/** Base save bonus from `level` levels on a good or poor save track. */
export function saveBase(good: boolean, level: number): number {
  if (level <= 0) return 0;
  return good ? 2 + Math.floor(level / 2) : Math.floor(level / 3);
}

/** Default (non-rolled) hit points gained at a level after 1st: the PFS fixed average,
 *  hitDie/2 + 1 (d6→4, d8→5, d10→6, d12→7). Level 1 always takes the max die separately. */
export function fixedHpPerLevel(hitDie: number): number {
  return hitDie / 2 + 1;
}

/** Levels at which a character gains a general feat: 1, 3, 5, … up to `level`. */
export function generalFeatLevels(level: number): number[] {
  const out: number[] = [];
  for (let l = 1; l <= level; l += 2) out.push(l);
  return out;
}

/** Levels at which a character gains a +1 ability score increase: 4, 8, 12, 16, 20 up to `level`. */
export function abilityIncreaseLevels(level: number): number[] {
  return [4, 8, 12, 16, 20].filter((l) => l <= level);
}

/** Caster level for a single-class caster. Four-level casters (paladin/ranger) begin casting
 *  at class level 4 with caster level = class level − 3. */
export function casterLevel(prog: CasterProgression, level: number): number {
  if (prog === 'four') return Math.max(0, level - 3);
  return level; // full and six casters: caster level = class level
}

/** Bonus spells per day of spell level `spellLvl` from an ability modifier (0 for cantrips). */
export function bonusSpellSlots(abilityMod: number, spellLvl: number): number {
  if (spellLvl === 0 || abilityMod < spellLvl) return 0;
  return Math.floor((abilityMod - spellLvl) / 4) + 1;
}

// ---- Base spells-per-day tables (index [classLevel-1][spellLevel]) ----------------------
// Cantrips/orisons are the level-0 column. Verified against the core class tables. Four-level
// (paladin/ranger) tables are authored in the Part B content pass alongside their spell lists.

const PREPARED_FULL: number[][] = [
  [3, 1],
  [4, 2],
  [4, 2, 1],
  [4, 3, 2],
  [4, 3, 2, 1],
  [4, 3, 3, 2],
  [4, 4, 3, 2, 1],
  [4, 4, 3, 3, 2],
  [4, 4, 4, 3, 2, 1],
  [4, 4, 4, 3, 3, 2],
  [4, 4, 4, 4, 3, 2, 1],
  [4, 4, 4, 4, 3, 3, 2],
  [4, 4, 4, 4, 4, 3, 2, 1],
  [4, 4, 4, 4, 4, 3, 3, 2],
  [4, 4, 4, 4, 4, 4, 3, 2, 1],
  [4, 4, 4, 4, 4, 4, 3, 3, 2],
  [4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
  [4, 4, 4, 4, 4, 4, 4, 3, 3, 2],
  [4, 4, 4, 4, 4, 4, 4, 4, 3, 3],
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

const SPONTANEOUS_FULL: number[][] = [
  [4, 3],
  [5, 4],
  [5, 5],
  [6, 6, 3],
  [6, 6, 4],
  [6, 6, 5, 3],
  [6, 6, 6, 4],
  [6, 6, 6, 5, 3],
  [6, 6, 6, 6, 4],
  [6, 6, 6, 6, 5, 3],
  [6, 6, 6, 6, 6, 4],
  [6, 6, 6, 6, 6, 5, 3],
  [6, 6, 6, 6, 6, 6, 4],
  [6, 6, 6, 6, 6, 6, 5, 3],
  [6, 6, 6, 6, 6, 6, 6, 4],
  [6, 6, 6, 6, 6, 6, 6, 5, 3],
  [6, 6, 6, 6, 6, 6, 6, 6, 4],
  [6, 6, 6, 6, 6, 6, 6, 6, 5, 3],
  [6, 6, 6, 6, 6, 6, 6, 6, 6, 4],
  [6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
];

const SIX_LEVEL: number[][] = [
  [1],
  [2],
  [3],
  [3, 1],
  [4, 2],
  [4, 3],
  [4, 3, 1],
  [4, 4, 2],
  [5, 4, 3],
  [5, 4, 3, 1],
  [5, 4, 4, 2],
  [5, 5, 4, 3],
  [5, 5, 4, 3, 1],
  [5, 5, 4, 4, 2],
  [5, 5, 5, 4, 3],
  [5, 5, 5, 4, 3, 1],
  [5, 5, 5, 4, 4, 2],
  [5, 5, 5, 5, 4, 3],
  [5, 5, 5, 5, 5, 4],
  [5, 5, 5, 5, 5, 5],
];

// ---- Spontaneous spells-known tables (fixed; unaffected by ability) --------------------

const SORCERER_KNOWN: number[][] = [
  [4, 2],
  [5, 2],
  [5, 3],
  [6, 3, 1],
  [6, 4, 2],
  [7, 4, 2, 1],
  [7, 5, 3, 2],
  [8, 5, 3, 2, 1],
  [8, 5, 4, 3, 2],
  [9, 5, 4, 3, 2, 1],
  [9, 5, 5, 4, 3, 2],
  [9, 5, 5, 4, 3, 2, 1],
  [9, 5, 5, 4, 4, 3, 2],
  [9, 5, 5, 4, 4, 3, 2, 1],
  [9, 5, 5, 4, 4, 4, 3, 2],
  [9, 5, 5, 4, 4, 4, 3, 2, 1],
  [9, 5, 5, 4, 4, 4, 3, 3, 2],
  [9, 5, 5, 4, 4, 4, 3, 3, 2, 1],
  [9, 5, 5, 4, 4, 4, 3, 3, 3, 2],
  [9, 5, 5, 4, 4, 4, 3, 3, 3, 3],
];

const BARD_KNOWN: number[][] = [
  [4, 2],
  [5, 3],
  [6, 4],
  [6, 4, 2],
  [6, 4, 3],
  [6, 4, 4],
  [6, 5, 4, 2],
  [6, 5, 4, 3],
  [6, 5, 4, 4],
  [6, 5, 5, 4, 2],
  [6, 6, 5, 4, 3],
  [6, 6, 5, 4, 4],
  [6, 6, 5, 5, 4, 2],
  [6, 6, 6, 5, 4, 3],
  [6, 6, 6, 5, 4, 4],
  [6, 6, 6, 5, 5, 4, 2],
  [6, 6, 6, 6, 5, 4, 3],
  [6, 6, 6, 6, 5, 4, 4],
  [6, 6, 6, 6, 5, 5, 4],
  [6, 6, 6, 6, 6, 5, 4],
];

/** A caster's identity for slot lookup: which base table, and (for spontaneous) which known table. */
export type SpellTable = 'prepared-full' | 'spontaneous-full' | 'bard';

function baseSlotTable(table: SpellTable): number[][] {
  switch (table) {
    case 'prepared-full': return PREPARED_FULL;
    case 'spontaneous-full': return SPONTANEOUS_FULL;
    case 'bard': return SIX_LEVEL;
  }
}

/** Total spell slots per day at a class level: the base table plus ability bonus spells.
 *  Returns [] when the class has no table encoded yet (e.g. four-level casters, pre-Part-B). */
export function spellSlotsPerDay(table: SpellTable | undefined, level: number, abilityMod: number): number[] {
  if (!table || level < 1) return [];
  const base = baseSlotTable(table)[Math.min(20, level) - 1] ?? [];
  return base.map((n, spellLvl) => n + bonusSpellSlots(abilityMod, spellLvl));
}

/** Spells known per spell level for a spontaneous caster (fixed; empty for prepared casters). */
export function spellsKnownPerLevel(table: SpellTable | undefined, level: number): number[] {
  if (level < 1) return [];
  const src = table === 'spontaneous-full' ? SORCERER_KNOWN : table === 'bard' ? BARD_KNOWN : null;
  if (!src) return [];
  return src[Math.min(20, level) - 1] ?? [];
}
