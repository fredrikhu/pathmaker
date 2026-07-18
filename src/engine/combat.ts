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
