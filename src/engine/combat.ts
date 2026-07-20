// Combat options the character declares rather than has: Power Attack (declared before the roll)
// and fighting with two weapons (a choice made on a full attack). Both change the attack lines,
// so they live in play state and are folded in only while switched on — a character who owns
// Power Attack but isn't using it must still see their honest attack bonus.
//
// Numbers verified against d20pfsrd's Power Attack and Two-Weapon Fighting feat pages.

/** How a weapon's Power Attack damage scales, per the feat's weapon-type clauses. */
export type PowerAttackScale = 'normal' | 'oneAndHalf' | 'half';

export interface PowerAttackAmounts {
  /** Attack penalty, always negative. */
  penalty: number;
  /** Damage bonus after weapon-type scaling. */
  damage: number;
}

/** Power Attack: −1 attack / +2 damage, worsening by another −1/+2 at BAB +4 and every 4 after.
 *  Two-handed (and one-handed-in-two-hands, and primary natural) get +50% damage; off-hand −50%. */
export function powerAttackAmounts(bab: number, scale: PowerAttackScale = 'normal'): PowerAttackAmounts {
  const steps = 1 + Math.floor(bab / 4);
  const base = steps * 2;
  const damage = scale === 'oneAndHalf' ? Math.floor(base * 1.5)
    : scale === 'half' ? Math.floor(base * 0.5)
      : base;
  return { penalty: -steps, damage };
}

export interface TwoWeaponPenalties {
  primary: number;
  off: number;
}

/** Fighting with two weapons: −6/−10, improving to −4/−8 when the off-hand weapon is light.
 *  The Two-Weapon Fighting feat lessens the primary penalty by 2 and the off-hand one by 6. */
export function twoWeaponPenalties(hasFeat: boolean, offHandLight: boolean): TwoWeaponPenalties {
  const primary = -6 + (offHandLight ? 2 : 0) + (hasFeat ? 2 : 0);
  const off = -10 + (offHandLight ? 2 : 0) + (hasFeat ? 6 : 0);
  return { primary, off };
}

/** Off-hand attacks on a full attack: one, plus one for Improved and one for Greater Two-Weapon
 *  Fighting. They come at −5 and −10 from the off-hand attack bonus, not from the BAB iteratives. */
export function offHandAttackBonuses(total: number, hasImproved: boolean, hasGreater: boolean): number[] {
  const out = [total];
  if (hasImproved) out.push(total - 5);
  if (hasGreater) out.push(total - 10);
  return out;
}

// Natural attacks (bite, claw, gore…). Their damage die is authored for a Medium creature; a Small
// creature steps once down the standard damage chain. The Strength multiplier and the secondary
// penalty follow the universal natural-attack rules. Verified against d20pfsrd's "Natural Attacks"
// (Universal Monster Rules) and the ARG racial-trait entries.

/** The standard damage-die chain, high to low, used to size natural attacks down for Small races. */
const DAMAGE_STEP_DOWN: Record<string, string> = {
  '2d6': '1d8', '1d10': '1d8', '1d8': '1d6', '1d6': '1d4', '1d4': '1d3', '1d3': '1d2', '1d2': '1',
};

/** A natural attack's damage die at the creature's size. Only Small and Medium playable races exist,
 *  so Medium is authored as-is and Small steps one down the chain (1d4 → 1d3, 1d3 → 1d2). */
export function naturalAttackDamageDie(mediumDie: string, size: 'small' | 'medium'): string {
  return size === 'small' ? (DAMAGE_STEP_DOWN[mediumDie] ?? mediumDie) : mediumDie;
}

export interface NaturalAttackContext {
  /** This attack is a primary natural attack (full bonus, full Str) rather than a secondary one. */
  primary: boolean;
  /** True when this is the creature's *only* natural attack — a lone bite adds 1½× Str. */
  sole: boolean;
  /** The creature is also attacking with a manufactured weapon this round, which turns every
   *  natural attack secondary regardless of its usual status. */
  withWeapon: boolean;
  /** Multiattack lessens the secondary penalty from −5 to −2. */
  hasMultiattack: boolean;
}

/** The Strength-modifier multiplier applied to a natural attack's damage. Secondary attacks (and any
 *  natural attack made alongside a manufactured weapon) get ½×; a creature's sole natural attack gets
 *  1½×; an ordinary primary attack gets 1×. */
export function naturalStrMultiplier(ctx: NaturalAttackContext): number {
  if (ctx.withWeapon || !ctx.primary) return 0.5;
  return ctx.sole ? 1.5 : 1;
}

/** The attack-roll penalty a natural attack takes: none for a primary attack made on its own, −5 for
 *  a secondary one (or any natural attack made alongside a weapon), softened to −2 by Multiattack. */
export function naturalAttackPenalty(ctx: NaturalAttackContext): number {
  const secondary = ctx.withWeapon || !ctx.primary;
  if (!secondary) return 0;
  return ctx.hasMultiattack ? -2 : -5;
}

/** How Power Attack's damage bonus scales for a natural attack: 1½× for the sole primary attack,
 *  ½× for a secondary one (or alongside a weapon), 1× for an ordinary primary attack. */
export function naturalPowerAttackScale(ctx: NaturalAttackContext): PowerAttackScale {
  if (ctx.withWeapon || !ctx.primary) return 'half';
  return ctx.sole ? 'oneAndHalf' : 'normal';
}
