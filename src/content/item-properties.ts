// One lookup across both special-ability catalogues. Weapon and armour ability ids are distinct, so
// "what is on this item?" is a single question with a single answer — and asking it in one place
// means a flaming longsword reads the same on the play mat, the printed sheet, the builder and the
// backstory prompt instead of each of them re-deriving it (and one of them forgetting to).

import { weaponPropertyById } from './weapon-properties';
import { armorPropertyById } from './armor-properties';

/** The part of a special ability any display needs: what it is called, what it does, and the
 *  caveats that are never folded into a number. */
export interface ItemPropertyInfo {
  id: string;
  name: string;
  desc: string;
  /** Set when the benefit only applies in a specific circumstance. */
  condition?: string;
  /** Set when the ability is restricted to certain weapons. */
  restriction?: string;
}

/** A special ability by id, from whichever catalogue defines it. */
export function itemProperty(id: string): ItemPropertyInfo | undefined {
  const w = weaponPropertyById.get(id);
  if (w) return { id: w.id, name: w.name, desc: w.desc, condition: w.condition, restriction: w.restriction };
  const a = armorPropertyById.get(id);
  if (a) return { id: a.id, name: a.name, desc: a.desc, condition: a.condition };
  return undefined;
}

/** The abilities on an item, unknown ids dropped. */
export function itemProperties(ids: string[] | undefined): ItemPropertyInfo[] {
  return (ids ?? []).map(itemProperty).filter(Boolean) as ItemPropertyInfo[];
}

/** Just the display names, for a chip row or a name suffix. */
export function itemPropertyNames(ids: string[] | undefined): string[] {
  return itemProperties(ids).map((p) => p.name);
}

/** The abilities as a parenthetical suffix for a name — "" when there are none, so it can be
 *  concatenated unconditionally. Lowercased, because it reads as prose after the item's name:
 *  "+1 Longsword (flaming, keen)". */
export function itemPropertySuffix(ids: string[] | undefined): string {
  const names = itemPropertyNames(ids);
  return names.length ? ` (${names.map((n) => n.toLowerCase()).join(', ')})` : '';
}
