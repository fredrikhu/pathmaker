// Dice. The one deliberately non-deterministic corner of the engine — so the randomness is
// injected rather than reached for, and every function here is a pure function of (input, rng).
// That keeps `resolve()` untouched (it stays fully deterministic) and makes rolling testable with
// a scripted rng.

/** Returns a float in [0, 1), like Math.random. */
export type Rng = () => number;

export const defaultRng: Rng = Math.random;

/** One die roll, 1..sides. */
export function rollDie(sides: number, rng: Rng = defaultRng): number {
  return Math.floor(rng() * sides) + 1;
}

/** A parsed damage term: either a pool of dice or a flat modifier. */
export interface DamageTerm {
  /** "2d6", "+4" — as written, for display. */
  text: string;
  count: number;
  sides: number;
  /** Flat modifier terms have count 0 and carry their value here. */
  flat: number;
}

const TERM = /^([+-]?)\s*(?:(\d*)d(\d+)|(\d+))$/i;

/** Parse a damage string as the engine writes it: "1d8", "1d8+4", "2d4−1", "1d8+2 + 1d6".
 *  A double weapon's "1d6/1d6" is split on `/` by the caller — only the first end is parsed here,
 *  because you attack with one end at a time. Unparseable input yields no terms, and the caller
 *  shows the string rather than a wrong number. */
export function parseDamage(formula: string): DamageTerm[] {
  const firstEnd = formula.split('/')[0];
  // Normalise the typographic minus the sheet uses, then split into signed terms.
  const normalised = firstEnd.replace(/−/g, '-').replace(/\s+/g, ' ').trim();
  if (!normalised) return [];
  const pieces = normalised.match(/[+-]?\s*\d*d?\d+/gi) ?? [];
  const terms: DamageTerm[] = [];
  for (const raw of pieces) {
    const m = raw.replace(/\s+/g, '').match(TERM);
    if (!m) return [];
    const sign = m[1] === '-' ? -1 : 1;
    if (m[3]) {
      const count = m[2] === '' ? 1 : Number(m[2]);
      terms.push({ text: raw.trim(), count, sides: Number(m[3]), flat: 0 });
    } else {
      terms.push({ text: raw.trim(), count: 0, sides: 0, flat: sign * Number(m[4]) });
    }
  }
  return terms;
}

export interface DamageRoll {
  total: number;
  /** Every die face that counts toward the total, in order, for showing the work. Maximized dice
   *  show their maximum face rather than a random one. */
  dice: number[];
  /** Sum of the flat modifiers. */
  modifier: number;
  formula: string;
  /** Extra points contributed by Empower Spell — half the (normally rolled) dice, floored. Present
   *  and non-zero only when the roll was empowered; folded into `total`. */
  empowerBonus?: number;
  /** True when Maximize Spell set every die to its maximum face (`dice` shows those faces). */
  maximized?: boolean;
}

/** Metamagic that changes the numbers a damage roll produces. Empower and Maximize act on the dice
 *  (variable, numeric effects); flat modifiers are left unchanged — the simplification the play
 *  sheet documents. Both may apply at once, and the rules combine them: the maximized dice plus
 *  half a normally rolled result. */
export interface MetamagicDamageMods {
  empower?: boolean;
  maximize?: boolean;
}

/** Roll a damage formula. A hit always deals at least 1 point, so a total driven to 0 or below by
 *  penalties comes back as 1 — that is the rule, not a clamp for tidiness.
 *
 *  With `meta`, Maximize sets each die to its maximum and Empower adds half the *normally rolled*
 *  dice (so an empowered, maximized spell deals "maximum result plus half the normally rolled
 *  result", per the feats). Each die is still drawn from `rng` exactly once regardless of the
 *  flags, so the number of rng draws does not depend on the metamagic. */
export function rollDamage(formula: string, rng: Rng = defaultRng, meta: MetamagicDamageMods = {}): DamageRoll | null {
  const terms = parseDamage(formula);
  if (terms.length === 0) return null;
  const dice: number[] = [];
  let rolledSum = 0;
  let maxSum = 0;
  let modifier = 0;
  for (const t of terms) {
    if (t.count > 0) {
      for (let i = 0; i < t.count; i++) {
        const face = rollDie(t.sides, rng);
        rolledSum += face;
        maxSum += t.sides;
        dice.push(meta.maximize ? t.sides : face);
      }
    } else {
      modifier += t.flat;
    }
  }
  const baseDice = meta.maximize ? maxSum : rolledSum;
  const empowerBonus = meta.empower ? Math.floor(rolledSum / 2) : 0;
  const raw = baseDice + empowerBonus + modifier;
  const roll: DamageRoll = { total: Math.max(1, raw), dice, modifier, formula };
  if (meta.empower) roll.empowerBonus = empowerBonus;
  if (meta.maximize) roll.maximized = true;
  return roll;
}

/** Lowest natural d20 that threatens a critical, read from a weapon's crit string
 *  ("×3" → 20, "19–20/×2" → 19, "18–20/×2" → 18). */
export function threatRange(crit: string): number {
  const m = crit.replace(/−|–/g, '-').match(/^(\d+)\s*-/);
  return m ? Number(m[1]) : 20;
}

export interface AttackRoll {
  /** The face on the d20, before any modifier. */
  natural: number;
  total: number;
  bonus: number;
  /** A natural 20 always hits, and a roll in the weapon's threat range may be a critical. */
  threat: boolean;
  /** A natural 1 always misses. */
  fumble: boolean;
}

/** Roll a d20 against an attack bonus. `threshold` is the weapon's threat range (20 by default);
 *  a natural 1 always misses whatever the total says. */
export function rollAttack(bonus: number, threshold = 20, rng: Rng = defaultRng): AttackRoll {
  const natural = rollDie(20, rng);
  return {
    natural,
    total: natural + bonus,
    bonus,
    threat: natural !== 1 && natural >= threshold,
    fumble: natural === 1,
  };
}

export interface SaveRoll {
  natural: number;
  total: number;
  bonus: number;
  /** The DC rolled against, when one was given. */
  dc?: number;
  /** Whether the save succeeded. Undefined when no DC was supplied — the roll still stands. */
  success?: boolean;
  /** True when the result was decided by the die alone rather than by the total. */
  automatic: boolean;
}

/** Roll a saving throw. A natural 1 always fails and a natural 20 always succeeds, whatever the
 *  DC and the modifiers say — which is why the outcome cannot be left to the caller comparing
 *  totals. Without a DC the roll is reported and judged by whoever set the difficulty. */
export function rollSave(bonus: number, dc: number | null = null, rng: Rng = defaultRng): SaveRoll {
  const natural = rollDie(20, rng);
  const total = natural + bonus;
  const automatic = natural === 1 || natural === 20;
  if (dc === null) return { natural, total, bonus, automatic };
  const success = natural === 20 ? true : natural === 1 ? false : total >= dc;
  return { natural, total, bonus, dc, success, automatic };
}

/** A target's concealment against an attack: neither stacks, so this is the single applicable
 *  miss chance. Percentages match the rules — ordinary concealment 20%, total concealment 50%. */
export const CONCEALMENT = { none: 0, concealment: 20, total: 50 } as const;
export type Concealment = keyof typeof CONCEALMENT;

export interface MissChanceRoll {
  /** The percentile rolled, 1..100. */
  roll: number;
  /** The chance to miss (20 for concealment, 50 for total). */
  chance: number;
  /** True when concealment turned a hit into a miss — a percentile at or under the chance. */
  missed: boolean;
}

/** Roll a concealment miss chance. Per the rules this happens *after* an attack connects: the
 *  attack is resolved normally, and only if it hits does concealment get a chance to spoil it.
 *  A percentile at or under the miss chance (≤20 for 20% concealment) means the blow misses. */
export function rollMissChance(chance: number, rng: Rng = defaultRng): MissChanceRoll {
  const roll = rollDie(100, rng);
  return { roll, chance, missed: roll <= chance };
}
