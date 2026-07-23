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

/** One class's contribution to a multiclass character: its progression tracks and how many
 *  levels of it the character has. */
export interface ClassLevels {
  bab: BabProgression;
  goodSaves: readonly ('fort' | 'ref' | 'will')[];
  levels: number;
}

/** Multiclass base attack bonus: each class's BAB is computed on its own level count and the
 *  results are added (core rule — fractional base bonuses are an optional variant we don't use).
 *  Rounding down per class before summing is exactly why Fighter 1/Rogue 1 has BAB +1, not +2. */
export function sumBab(entries: readonly ClassLevels[]): number {
  return entries.reduce((n, e) => n + babAt(e.bab, e.levels), 0);
}

/** Multiclass base save: each class contributes its own good/poor progression, summed. This is
 *  why a multiclass character's saves outrun a single-class character's — every class re-pays
 *  the +2 that a good save grants at 1st level. */
export function sumSave(which: 'fort' | 'ref' | 'will', entries: readonly ClassLevels[]): number {
  return entries.reduce((n, e) => n + saveBase(e.goodSaves.includes(which), e.levels), 0);
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

// ---- Four-level spontaneous casters (bloodrager, vampire hunter) ------------------------
// Both spend the shared FOUR_LEVEL slots table but know *different* numbers of spells, so each
// needs its own known grid. Neither has orisons, hence the leading 0. Read from each class's
// own table markup; the repeated rows near the top are in the source (these tables plateau).

const BLOODRAGER_KNOWN: number[][] = [
  [], [], [],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 4, 2],
  [0, 4, 3],
  [0, 5, 4],
  [0, 5, 4, 2],
  [0, 5, 4, 3],
  [0, 6, 5, 4],
  [0, 6, 5, 4, 2],
  [0, 6, 5, 4, 3],
  [0, 6, 6, 5, 4],
  [0, 6, 6, 5, 4],
  [0, 6, 6, 5, 4],
  [0, 6, 6, 6, 5],
  [0, 6, 6, 6, 5],
  [0, 6, 6, 6, 5],
];

const VAMPIRE_HUNTER_KNOWN: number[][] = [
  [], [], [],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 4, 2],
  [0, 4, 3],
  [0, 4, 4],
  [0, 5, 4, 2],
  [0, 5, 4, 3],
  [0, 5, 4, 4],
  [0, 5, 5, 4, 2],
  [0, 6, 5, 4, 3],
  [0, 6, 5, 4, 4],
  [0, 6, 5, 5, 4],
  [0, 6, 6, 5, 4],
  [0, 6, 6, 5, 4],
  [0, 6, 6, 5, 5],
  [0, 6, 6, 6, 5],
];

// ---- Arcanist ---------------------------------------------------------------------------
// The arcanist is the one class with *two* spell tables: it prepares spells like a wizard and
// then casts them spontaneously from a separate pool of slots. Both are transcribed from the
// class's own d20pfsrd tables (read from the page's markup, not a summary — an earlier attempt
// at this class shipped nothing because two secondary sources disagreed).
//
// "Spells per Day" has no 0-level column at all: the arcanist's cantrips are cast at will. The
// cantrip entry below is therefore the *number of cantrips prepared* (the 0-level column of the
// Spells Prepared table), which is the only meaningful cantrip count — it is not a per-day cap.

const ARCANIST_PER_DAY: number[][] = [
  [4, 2],
  [5, 3],
  [5, 4],
  [6, 4, 2],
  [6, 4, 3],
  [7, 4, 4, 2],
  [7, 4, 4, 3],
  [8, 4, 4, 4, 2],
  [8, 4, 4, 4, 3],
  [9, 4, 4, 4, 4, 2],
  [9, 4, 4, 4, 4, 3],
  [9, 4, 4, 4, 4, 4, 2],
  [9, 4, 4, 4, 4, 4, 3],
  [9, 4, 4, 4, 4, 4, 4, 2],
  [9, 4, 4, 4, 4, 4, 4, 3],
  [9, 4, 4, 4, 4, 4, 4, 4, 2],
  [9, 4, 4, 4, 4, 4, 4, 4, 3],
  [9, 4, 4, 4, 4, 4, 4, 4, 4, 2],
  [9, 4, 4, 4, 4, 4, 4, 4, 4, 3],
  [9, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

/** How many spells the arcanist may have prepared, per spell level (0 = cantrips). Distinct from
 *  the slots she spends casting them, and unaffected by Intelligence — the bonus spells a high
 *  Intelligence grants are bonus spells *per day*. */
const ARCANIST_PREPARED: number[][] = [
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

/** A caster's slot/known identity. All arrays are indexed by absolute spell level (0 = cantrips). */
export type SpellTable =
  | 'prepared-full' | 'spontaneous-full' | 'bard' | 'spont-six' | 'prepared-six' | 'extract'
  | 'four' | 'arcanist' | 'bloodrager' | 'vampire-hunter';

function baseSlotTable(table: SpellTable): number[][] {
  switch (table) {
    case 'prepared-full': return PREPARED_FULL;
    case 'spontaneous-full': return SPONTANEOUS_FULL;
    case 'bard':
    case 'spont-six': return SIX_LEVEL;
    case 'prepared-six': return PREPARED_SIX;
    case 'extract': return EXTRACT_SIX;
    // The two four-level spontaneous casters share the slots table and differ only in what
    // they know, so they are separate tags with the same per-day grid.
    case 'four':
    case 'bloodrager':
    case 'vampire-hunter': return FOUR_LEVEL;
    case 'arcanist': return ARCANIST_PER_DAY;
  }
}

/** How many spells may be prepared per spell level, for classes whose preparation count differs
 *  from their slots per day. Empty for every other class, where the two are the same table. */
export function spellsPreparedPerLevel(table: SpellTable | undefined, level: number): number[] {
  if (table !== 'arcanist' || level < 1) return [];
  return ARCANIST_PREPARED[Math.min(20, level) - 1] ?? [];
}

/** Total spell slots per day at a class level: the base table plus ability bonus spells.
 *  Returns [] when the class has no encoded table. With `diminished` (Kensai / Cloistered Cleric /
 *  Spellslinger), each spell level's base slots drop by 1 (min 0) before the ability bonus is added,
 *  so a high casting stat can still grant a slot at a level whose base fell to 0. Cantrips unaffected. */
export function spellSlotsPerDay(table: SpellTable | undefined, level: number, abilityMod: number, diminished = false): number[] {
  if (!table || level < 1) return [];
  const base = baseSlotTable(table)[Math.min(20, level) - 1] ?? [];
  return base.map((n, spellLvl) => {
    const b = diminished && spellLvl > 0 ? Math.max(0, n - 1) : n;
    return b + bonusSpellSlots(abilityMod, spellLvl);
  });
}

/** Spells known per spell level for a spontaneous caster (fixed; empty for prepared casters). */
export function spellsKnownPerLevel(table: SpellTable | undefined, level: number): number[] {
  if (level < 1) return [];
  const src = table === 'spontaneous-full' ? SORCERER_KNOWN
    : table === 'bard' ? BARD_KNOWN
    : table === 'spont-six' ? SPONT_SIX_KNOWN
    : table === 'bloodrager' ? BLOODRAGER_KNOWN
    : table === 'vampire-hunter' ? VAMPIRE_HUNTER_KNOWN
    : null;
  if (!src) return [];
  return src[Math.min(20, level) - 1] ?? [];
}

/** Character Wealth by Level (Core, verified against d20pfsrd): the gold a character *created* at
 *  that level starts with. Index 0 = 2nd level; 1st level uses the class's own starting gold roll. */
const WEALTH_BY_LEVEL = [
  1_000, 3_000, 6_000, 10_500, 16_000, 23_500, 33_000, 46_000, 62_000, 82_000,
  108_000, 140_000, 185_000, 240_000, 315_000, 410_000, 530_000, 685_000, 880_000,
];

/** Starting gold for a character built at `level`: the class's 1st-level roll, or the
 *  wealth-by-level figure from 2nd on (a 3rd-level character does not start with 175 gp). */
export function startingWealth(level: number, classStartingGold: number): number {
  if (level <= 1) return classStartingGold;
  return WEALTH_BY_LEVEL[Math.min(20, level) - 2] ?? classStartingGold;
}
