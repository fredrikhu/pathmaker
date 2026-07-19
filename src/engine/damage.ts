// Applying damage to the character, rather than dealing it. This is the other half of the game
// from the rest of the engine: `resolve()` computes what the character rolls, while this computes
// what a number coming the other way is reduced to.
//
// Rules verified against d20pfsrd (Special Abilities: Damage Reduction, Energy Resistance).

import type { DamageKind, DamageReduction, Defenses, EnergyResistance, EnergyType } from './types';

export const ENERGY_TYPES: EnergyType[] = ['acid', 'cold', 'electricity', 'fire', 'sonic'];

const isEnergy = (kind: DamageKind): kind is EnergyType => (ENERGY_TYPES as string[]).includes(kind);

export interface DamageResult {
  /** Damage that actually reaches hit points. Never below 0 — reduction can zero a hit, not heal. */
  applied: number;
  /** How much was stopped. */
  prevented: number;
  /** The single reduction that applied, if any. Only ever one: neither DR nor energy resistance
   *  stacks — the best applicable one is used. */
  source: DamageReduction | EnergyResistance | null;
  /** Plain-language reason, for the log. */
  explain: string;
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
    const r = bestResistance(defenses.resistances, kind);
    if (!r) return none(`${incoming} ${kind} — no resistance`);
    const prevented = Math.min(incoming, r.amount);
    return {
      applied: incoming - prevented,
      prevented,
      source: r,
      explain: `${incoming} ${kind} − ${prevented} (${r.note}, resist ${r.amount})`,
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
