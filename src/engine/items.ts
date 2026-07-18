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

/** Quality of one owned item. An enhancement implies masterwork (all magic gear is masterwork). */
export interface ItemQuality {
  masterwork?: boolean;
  /** 1–5; absent or 0 means non-magical. */
  enhancement?: number;
}

const clampEnh = (n: number | undefined): number => Math.max(0, Math.min(MAX_ENHANCEMENT, Math.round(n ?? 0)));

/** Is this item magical or masterwork at all? */
export function hasQuality(q: ItemQuality | undefined): boolean {
  return !!q && (!!q.masterwork || clampEnh(q.enhancement) > 0);
}

/** Extra gp this quality adds to a weapon or armour piece. Magic gear is masterwork, so the
 *  masterwork surcharge is included once and never double-counted with the enhancement price. */
export function qualityCost(kind: 'weapon' | 'armor', q: ItemQuality | undefined): number {
  if (!q) return 0;
  const enh = clampEnh(q.enhancement);
  const mwkCost = kind === 'weapon' ? MASTERWORK_WEAPON_COST : MASTERWORK_ARMOR_COST;
  const table = kind === 'weapon' ? WEAPON_ENHANCEMENT_COST : ARMOR_ENHANCEMENT_COST;
  if (enh > 0) return mwkCost + table[enh];
  return q.masterwork ? mwkCost : 0;
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
