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
  // Cantrip-indexed (leading 0 = at-will cantrips, hidden in display) so 1st-level spells sit at
  // index 1 and receive the casting-ability bonus. Shared by bard, skald, inquisitor, hunter,
  // and summoner (all standard 6-level spontaneous per-day progressions).
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 3, 1],
  [0, 4, 2],
  [0, 4, 3],
  [0, 4, 3, 1],
  [0, 4, 4, 2],
  [0, 5, 4, 3],
  [0, 5, 4, 3, 1],
  [0, 5, 4, 4, 2],
  [0, 5, 5, 4, 3],
  [0, 5, 5, 4, 3, 1],
  [0, 5, 5, 4, 4, 2],
  [0, 5, 5, 5, 4, 3],
  [0, 5, 5, 5, 4, 3, 1],
  [0, 5, 5, 5, 4, 4, 2],
  [0, 5, 5, 5, 5, 4, 3],
  [0, 5, 5, 5, 5, 5, 4],
  [0, 5, 5, 5, 5, 5, 5],
];

// Prepared 6-level casters (magus, warpriest): cantrips at 0, spells 1st–6th. Verified against
// the magus/warpriest tables (identical). Alchemist/investigator use this minus the cantrip column.
const PREPARED_SIX: number[][] = [
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
  [5, 5, 5, 5, 4, 3, 1],
  [5, 5, 5, 5, 4, 4, 2],
  [5, 5, 5, 5, 5, 4, 3],
  [5, 5, 5, 5, 5, 5, 4],
  [5, 5, 5, 5, 5, 5, 5],
];

// Alchemist / investigator extracts per day = PREPARED_SIX with no 0-level (cantrip) column.
const EXTRACT_SIX: number[][] = PREPARED_SIX.map((r) => [0, ...r.slice(1)]);

// Four-level casters (paladin, ranger): no cantrips; casting begins at class level 4. Verified
// against the paladin/ranger Core table. A 0 base (e.g. 2nd level at 7th) is castable only with a
// high enough ability bonus; display hides slot levels whose total is 0.
const FOUR_LEVEL: number[][] = [
  [], [], [],
  [0, 0],
  [0, 1],
  [0, 1],
  [0, 1, 0],
  [0, 1, 1],
  [0, 2, 1],
  [0, 2, 1, 0],
  [0, 2, 1, 1],
  [0, 2, 2, 1],
  [0, 3, 2, 1, 0],
  [0, 3, 2, 1, 1],
  [0, 3, 2, 2, 1],
  [0, 3, 3, 2, 1],
  [0, 4, 3, 2, 1],
  [0, 4, 3, 2, 2],
  [0, 4, 3, 3, 2],
  [0, 4, 4, 3, 3],
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

// Spells known for the 6-level spontaneous divine/arcane casters (inquisitor, hunter, summoner).
const SPONT_SIX_KNOWN: number[][] = [
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
  [6, 6, 6, 6, 6, 5, 5],
];

/** A caster's slot/known identity. All arrays are indexed by absolute spell level (0 = cantrips). */
export type SpellTable =
  | 'prepared-full' | 'spontaneous-full' | 'bard' | 'spont-six' | 'prepared-six' | 'extract' | 'four';

function baseSlotTable(table: SpellTable): number[][] {
  switch (table) {
    case 'prepared-full': return PREPARED_FULL;
    case 'spontaneous-full': return SPONTANEOUS_FULL;
    case 'bard':
    case 'spont-six': return SIX_LEVEL;
    case 'prepared-six': return PREPARED_SIX;
    case 'extract': return EXTRACT_SIX;
    case 'four': return FOUR_LEVEL;
  }
}

/** Total spell slots per day at a class level: the base table plus ability bonus spells.
 *  Returns [] when the class has no encoded table (e.g. arcanist / vampire-hunter). */
export function spellSlotsPerDay(table: SpellTable | undefined, level: number, abilityMod: number): number[] {
  if (!table || level < 1) return [];
  const base = baseSlotTable(table)[Math.min(20, level) - 1] ?? [];
  return base.map((n, spellLvl) => n + bonusSpellSlots(abilityMod, spellLvl));
}

/** Spells known per spell level for a spontaneous caster (fixed; empty for prepared casters). */
export function spellsKnownPerLevel(table: SpellTable | undefined, level: number): number[] {
  if (level < 1) return [];
  const src = table === 'spontaneous-full' ? SORCERER_KNOWN
    : table === 'bard' ? BARD_KNOWN
    : table === 'spont-six' ? SPONT_SIX_KNOWN
    : null;
  if (!src) return [];
  return src[Math.min(20, level) - 1] ?? [];
}
