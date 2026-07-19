// Applying damage to the character, rather than dealing it. This is the other half of the game
// from the rest of the engine: `resolve()` computes what the character rolls, while this computes
// what a number coming the other way is reduced to.
//
// Rules verified against d20pfsrd (Special Abilities: Damage Reduction, Energy Resistance).

import type { DamageKind, DamageReduction, Defenses, EnergyAbsorption, EnergyResistance, EnergyType } from './types';

export const ENERGY_TYPES: EnergyType[] = ['acid', 'cold', 'electricity', 'fire', 'sonic'];

const isEnergy = (kind: DamageKind): kind is EnergyType => (ENERGY_TYPES as string[]).includes(kind);

export interface DamageResult {
  /** Damage that actually reaches hit points. Never below 0 — reduction can zero a hit, not heal. */
  applied: number;
  /** How much was stopped. */
  prevented: number;
  /** The single reduction that applied, if any. Only ever one: neither DR nor energy resistance
   *  stacks — the best applicable one is used. Absorption (protection from energy) is reported via
   *  `deplete` instead, since it mutates state rather than being a fixed reduction. */
  source: DamageReduction | EnergyResistance | null;
  /** Plain-language reason, for the log. */
  explain: string;
  /** How much a protection-from-energy pool absorbed and which timer to subtract it from. The
   *  caller reduces that pool and ends the spell if it hits zero — this function stays pure. */
  deplete?: { timerId: string; amount: number };
}

/** The best damage reduction that this attack does not bypass.
 *
 *  DR from more than one source does not stack: the creature gets the benefit of the best DR in a
 *  given situation. "Best" depends on the attack, which is why the caller says what it bypassed —
 *  a DR 10/adamantine and a DR 2/— together leave 2 against an adamantine axe, not 10 and not 0. */
export function bestDr(drs: DamageReduction[], bypassed: string[] = []): DamageReduction | null {
  const lowered = bypassed.map((b) => b.toLowerCase());
  const applicable = drs.filter((d) => !lowered.includes(d.bypass.toLowerCase()));
  if (applicable.length === 0) return null;
  return applicable.reduce((best, d) => (d.amount > best.amount ? d : best));
}

/** The best resistance against one energy type. Resistance does not stack either — notably, a
 *  spell's resistance does not add to a racial one. */
export function bestResistance(resistances: EnergyResistance[], type: EnergyType): EnergyResistance | null {
  const applicable = resistances.filter((r) => r.type === type);
  if (applicable.length === 0) return null;
  return applicable.reduce((best, r) => (r.amount > best.amount ? r : best));
}

/** The absorption pool that should soak this energy type. Multiple protection-from-energy of the
 *  same type do not stack, so the one with the most left is used — it lasts longest. */
export function bestAbsorb(pools: EnergyAbsorption[], type: EnergyType): EnergyAbsorption | null {
  const applicable = pools.filter((p) => p.type === type && p.remaining > 0);
  if (applicable.length === 0) return null;
  return applicable.reduce((best, p) => (p.remaining > best.remaining ? p : best));
}

export interface ApplyOptions {
  /** Which DR the incoming attack got through — "adamantine", "magic", "silver"… Only the player
   *  knows what hit them, so this is declared rather than derived. */
  bypassed?: string[];
}

/** Reduce incoming damage by whatever applies, and say what happened.
 *
 *  Three rules do the work, and each excludes the others:
 *  - Energy damage is reduced by energy resistance of that type, and never by DR.
 *  - Physical damage is reduced by DR, and never by energy resistance.
 *  - Untyped damage — a spell that names no damage type — is reduced by neither. */
export function applyDamage(amount: number, kind: DamageKind, defenses: Defenses, opts: ApplyOptions = {}): DamageResult {
  const incoming = Math.max(0, Math.round(amount));
  const none = (explain: string): DamageResult => ({ applied: incoming, prevented: 0, source: null, explain });

  if (incoming === 0) return none('no damage');

  if (isEnergy(kind)) {
    // Protection from energy absorbs the whole type until its pool is spent, and takes precedence
    // over resistance ("the protection spell absorbs damage until its power is exhausted"). Only
    // the overflow on the discharging hit reaches resistance, so the two never touch the same points.
    const pool = bestAbsorb(defenses.absorb, kind);
    const absorbed = pool ? Math.min(incoming, pool.remaining) : 0;
    const afterAbsorb = incoming - absorbed;
    const discharged = pool !== null && absorbed >= pool.remaining;

    const r = bestResistance(defenses.resistances, kind);
    const resisted = r ? Math.min(afterAbsorb, r.amount) : 0;
    const applied = afterAbsorb - resisted;

    if (absorbed === 0 && resisted === 0) return none(`${incoming} ${kind} — no protection`);

    const parts = [`${incoming} ${kind}`];
    if (absorbed) parts.push(`− ${absorbed} absorbed (${pool!.note}${discharged ? ', discharged' : ''})`);
    if (resisted) parts.push(`− ${resisted} (${r!.note}, resist ${r!.amount})`);
    return {
      applied,
      prevented: absorbed + resisted,
      source: r ?? null,
      explain: `${parts.join(' ')} → ${applied}`,
      ...(pool && absorbed > 0 ? { deplete: { timerId: pool.timerId, amount: absorbed } } : {}),
    };
  }

  if (kind === 'untyped') {
    // Spells, spell-like abilities and energy attacks ignore damage reduction; typeless magical
    // damage is not physical either, so nothing here applies to it.
    return none(`${incoming} untyped — DR does not apply to spells or untyped damage`);
  }

  const dr = bestDr(defenses.dr, opts.bypassed);
  if (!dr) {
    const why = defenses.dr.length ? ' — bypassed' : ' — no DR';
    return none(`${incoming} physical${why}`);
  }
  const prevented = Math.min(incoming, dr.amount);
  return {
    applied: incoming - prevented,
    prevented,
    source: dr,
    explain: `${incoming} physical − ${prevented} (${dr.note}, DR ${dr.amount}/${dr.bypass})`,
  };
}

/** Every distinct bypass an incoming attack could claim, for offering as toggles. "—" is dropped:
 *  nothing bypasses DR X/—, so there is nothing to offer. */
export function bypassOptions(defenses: Defenses): string[] {
  return [...new Set(defenses.dr.map((d) => d.bypass))].filter((b) => b !== '—' && b !== '-');
}
