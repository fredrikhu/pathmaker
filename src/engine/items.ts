// Masterwork and magic enhancement on owned gear. Rather than authoring 39 weapons × 5 enhancement
// levels as separate catalogue entries, quality is a property of the *owned* item — which is also
// how the rules read: any weapon can be made masterwork or given a +1..+5 enhancement bonus.
//
// Costs and mechanics verified against d20pfsrd (Magic Weapons / Magic Armor / masterwork rules).

/** Extra gp for masterwork, on top of the base item's price. */
export const MASTERWORK_WEAPON_COST = 300;
export const MASTERWORK_ARMOR_COST = 150;

/** Enhancement price by bonus (index = bonus). Weapons cost bonus² × 2,000; armor bonus² × 1,000. */
export const WEAPON_ENHANCEMENT_COST = [0, 2_000, 8_000, 18_000, 32_000, 50_000];
export const ARMOR_ENHANCEMENT_COST = [0, 1_000, 4_000, 9_000, 16_000, 25_000];

export const MAX_ENHANCEMENT = 5;

/** Enhancement + special-ability equivalents may not exceed this on one weapon. */
export const MAX_TOTAL_BONUS = 10;

/** Quality of one owned item. An enhancement implies masterwork (all magic gear is masterwork). */
export interface ItemQuality {
  masterwork?: boolean;
  /** 1–5; absent or 0 means non-magical. */
  enhancement?: number;
  /** Named weapon special abilities (ids from WEAPON_PROPERTIES). Require an enhancement bonus. */
  properties?: string[];
}

const clampEnh = (n: number | undefined): number => Math.max(0, Math.min(MAX_ENHANCEMENT, Math.round(n ?? 0)));

/** How a named property is priced. Weapon abilities are all bonus-equivalent; several armour
 *  abilities (glamered, slick, shadow) are a flat surcharge instead and do NOT count toward +10. */
export interface PropertyPrice { equivalent: number; flat: number }
export type PropertyLookup = (id: string) => PropertyPrice;

export const NO_PROPERTIES: PropertyLookup = () => ({ equivalent: 0, flat: 0 });

/** Sum of the price-bonus equivalents of an item's named properties. */
export function propertyEquivalents(q: ItemQuality | undefined, lookup: PropertyLookup): number {
  return (q?.properties ?? []).reduce((n, id) => n + lookup(id).equivalent, 0);
}

/** Sum of the flat gp surcharges of an item's named properties. */
export function propertyFlatCost(q: ItemQuality | undefined, lookup: PropertyLookup): number {
  return (q?.properties ?? []).reduce((n, id) => n + lookup(id).flat, 0);
}

/** Enhancement + property equivalents — the figure both the price and the +10 cap work from. */
export function totalBonus(q: ItemQuality | undefined, lookup: PropertyLookup): number {
  return clampEnh(q?.enhancement) + propertyEquivalents(q, lookup);
}

/** Is this item magical or masterwork at all? */
export function hasQuality(q: ItemQuality | undefined): boolean {
  return !!q && (!!q.masterwork || clampEnh(q.enhancement) > 0);
}

/** Extra gp this quality adds to a weapon or armour piece. Magic gear is masterwork, so the
 *  masterwork surcharge is included once and never double-counted with the enhancement price.
 *  Named properties are priced by raising the *total* effective bonus, which is why a +1 flaming
 *  sword costs the same as a +2 one (both price at +2): bonus² × 2,000 for weapons, ×1,000 for armour. */
export function qualityCost(kind: 'weapon' | 'armor', q: ItemQuality | undefined, lookup: PropertyLookup = NO_PROPERTIES): number {
  if (!q) return 0;
  const total = totalBonus(q, lookup);
  const flat = propertyFlatCost(q, lookup);
  const mwkCost = kind === 'weapon' ? MASTERWORK_WEAPON_COST : MASTERWORK_ARMOR_COST;
  const perBonus = kind === 'weapon' ? 2_000 : 1_000;
  if (total > 0) return mwkCost + total * total * perBonus + flat;
  return (q.masterwork ? mwkCost : 0) + flat;
}

/** Why this item's quality is illegal, or null. Named abilities need an enhancement bonus, and the
 *  combined bonus is capped at +10. Flat-priced abilities still require the enhancement bonus but
 *  do not count toward the cap. */
export function qualityProblem(kind: 'weapon' | 'armor', q: ItemQuality | undefined, lookup: PropertyLookup): string | null {
  if (!q?.properties?.length) return null;
  const noun = kind === 'weapon' ? 'A weapon' : 'A suit of armor or a shield';
  if (clampEnh(q.enhancement) < 1) return `${noun} with a special ability must also have at least a +1 enhancement bonus.`;
  const total = totalBonus(q, lookup);
  if (total > MAX_TOTAL_BONUS) return `Combined bonus +${total} exceeds the +${MAX_TOTAL_BONUS} maximum.`;
  return null;
}

/** Attack/damage bonus a weapon's quality grants. Masterwork gives +1 to attack only, and does not
 *  stack with an enhancement bonus — a +1 weapon is +1/+1, not +2/+1. */
export function weaponQualityBonus(q: ItemQuality | undefined): { attack: number; damage: number; label: string } {
  const enh = clampEnh(q?.enhancement);
  if (enh > 0) return { attack: enh, damage: enh, label: `+${enh}` };
  if (q?.masterwork) return { attack: 1, damage: 0, label: 'mwk' };
  return { attack: 0, damage: 0, label: '' };
}

/** AC enhancement from magic armour or a magic shield (stacks with the item's own armour bonus). */
export function armorQualityBonus(q: ItemQuality | undefined): number {
  return clampEnh(q?.enhancement);
}

/** Masterwork armour (including all magic armour) reduces the armour check penalty by 1. */
export function armorCheckPenaltyReduction(q: ItemQuality | undefined): number {
  return hasQuality(q) ? 1 : 0;
}

/** A display prefix for an item name: "+1 Longsword", "Masterwork Longsword". */
export function qualityPrefix(q: ItemQuality | undefined): string {
  const enh = clampEnh(q?.enhancement);
  if (enh > 0) return `+${enh} `;
  return q?.masterwork ? 'Masterwork ' : '';
}
