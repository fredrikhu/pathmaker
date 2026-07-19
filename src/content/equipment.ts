import type { ArmorDef, GearDef, WeaponDef } from './model';

// Core-rulebook weapon table, verified against d20pfsrd (Medium damage, crit, cost, weight, type).
export const WEAPONS: WeaponDef[] = [
  // --- Simple ---
  { id: 'dagger', name: 'Dagger', cost: 2, weight: 1, dmg: '1d4', crit: '19–20/×2', range: 10, dmgType: 'P or S', group: 'simple', hands: 'light' },
  { id: 'sickle', name: 'Sickle', cost: 6, weight: 2, dmg: '1d6', crit: '×2', dmgType: 'S', group: 'simple', hands: 'light' },
  { id: 'light-mace', name: 'Mace, light', cost: 5, weight: 4, dmg: '1d6', crit: '×2', dmgType: 'B', group: 'simple', hands: 'light' },
  { id: 'club', name: 'Club', cost: 0, weight: 3, dmg: '1d6', crit: '×2', range: 10, dmgType: 'B', group: 'simple', hands: 'one' },
  { id: 'heavy-mace', name: 'Mace, heavy', cost: 12, weight: 8, dmg: '1d8', crit: '×2', dmgType: 'B', group: 'simple', hands: 'one' },
  { id: 'morningstar', name: 'Morningstar', cost: 8, weight: 6, dmg: '1d8', crit: '×2', dmgType: 'B and P', group: 'simple', hands: 'one' },
  { id: 'shortspear', name: 'Shortspear', cost: 1, weight: 3, dmg: '1d6', crit: '×2', range: 20, dmgType: 'P', group: 'simple', hands: 'one' },
  { id: 'quarterstaff', name: 'Quarterstaff', cost: 0, weight: 4, dmg: '1d6/1d6', crit: '×2', dmgType: 'B', group: 'simple', hands: 'two' },
  { id: 'spear', name: 'Spear', cost: 2, weight: 6, dmg: '1d8', crit: '×3', range: 20, dmgType: 'P', group: 'simple', hands: 'two' },
  { id: 'longspear', name: 'Longspear', cost: 5, weight: 9, dmg: '1d8', crit: '×3', dmgType: 'P', group: 'simple', hands: 'two' },
  { id: 'dart', name: 'Dart', cost: 0.5, weight: 0.5, dmg: '1d4', crit: '×2', range: 20, dmgType: 'P', group: 'simple', hands: 'ranged' },
  { id: 'javelin', name: 'Javelin', cost: 1, weight: 2, dmg: '1d6', crit: '×2', range: 30, dmgType: 'P', group: 'simple', hands: 'ranged' },
  { id: 'sling', name: 'Sling', cost: 0, weight: 0, dmg: '1d4', crit: '×2', range: 50, dmgType: 'B', group: 'simple', hands: 'ranged' },
  { id: 'light-crossbow', name: 'Crossbow, light', cost: 35, weight: 4, dmg: '1d8', crit: '19–20/×2', range: 80, dmgType: 'P', group: 'simple', hands: 'ranged' },
  { id: 'heavy-crossbow', name: 'Crossbow, heavy', cost: 50, weight: 8, dmg: '1d10', crit: '19–20/×2', range: 120, dmgType: 'P', group: 'simple', hands: 'ranged' },
  // --- Martial ---
  { id: 'handaxe', name: 'Handaxe', cost: 6, weight: 3, dmg: '1d6', crit: '×3', dmgType: 'S', group: 'martial', hands: 'light' },
  { id: 'kukri', name: 'Kukri', cost: 8, weight: 2, dmg: '1d4', crit: '18–20/×2', dmgType: 'S', group: 'martial', hands: 'light' },
  { id: 'short-sword', name: 'Sword, short', cost: 10, weight: 2, dmg: '1d6', crit: '19–20/×2', dmgType: 'P', group: 'martial', hands: 'light' },
  { id: 'light-pick', name: 'Pick, light', cost: 4, weight: 3, dmg: '1d4', crit: '×4', dmgType: 'P', group: 'martial', hands: 'light' },
  { id: 'longsword', name: 'Longsword', cost: 15, weight: 4, dmg: '1d8', crit: '19–20/×2', dmgType: 'S', group: 'martial', hands: 'one' },
  { id: 'scimitar', name: 'Scimitar', cost: 15, weight: 4, dmg: '1d6', crit: '18–20/×2', dmgType: 'S', group: 'martial', hands: 'one' },
  { id: 'battleaxe', name: 'Battleaxe', cost: 10, weight: 6, dmg: '1d8', crit: '×3', dmgType: 'S', group: 'martial', hands: 'one' },
  { id: 'warhammer', name: 'Warhammer', cost: 12, weight: 5, dmg: '1d8', crit: '×3', dmgType: 'B', group: 'martial', hands: 'one' },
  { id: 'rapier', name: 'Rapier', cost: 20, weight: 2, dmg: '1d6', crit: '18–20/×2', dmgType: 'P', group: 'martial', hands: 'one' },
  { id: 'flail', name: 'Flail', cost: 8, weight: 5, dmg: '1d8', crit: '×2', dmgType: 'B', group: 'martial', hands: 'one' },
  { id: 'heavy-pick', name: 'Pick, heavy', cost: 8, weight: 6, dmg: '1d6', crit: '×4', dmgType: 'P', group: 'martial', hands: 'one' },
  { id: 'trident', name: 'Trident', cost: 15, weight: 4, dmg: '1d8', crit: '×2', range: 10, dmgType: 'P', group: 'martial', hands: 'one' },
  { id: 'lance', name: 'Lance', cost: 10, weight: 10, dmg: '1d8', crit: '×3', dmgType: 'P', group: 'martial', hands: 'one' },
  { id: 'greatsword', name: 'Greatsword', cost: 50, weight: 8, dmg: '2d6', crit: '19–20/×2', dmgType: 'S', group: 'martial', hands: 'two' },
  { id: 'greataxe', name: 'Greataxe', cost: 20, weight: 12, dmg: '1d12', crit: '×3', dmgType: 'S', group: 'martial', hands: 'two' },
  { id: 'falchion', name: 'Falchion', cost: 75, weight: 8, dmg: '2d4', crit: '18–20/×2', dmgType: 'S', group: 'martial', hands: 'two' },
  { id: 'greatclub', name: 'Greatclub', cost: 5, weight: 8, dmg: '1d10', crit: '×2', dmgType: 'B', group: 'martial', hands: 'two' },
  { id: 'heavy-flail', name: 'Flail, heavy', cost: 15, weight: 10, dmg: '1d10', crit: '19–20/×2', dmgType: 'B', group: 'martial', hands: 'two' },
  { id: 'glaive', name: 'Glaive', cost: 8, weight: 10, dmg: '1d10', crit: '×3', dmgType: 'S', group: 'martial', hands: 'two' },
  { id: 'halberd', name: 'Halberd', cost: 10, weight: 12, dmg: '1d10', crit: '×3', dmgType: 'P or S', group: 'martial', hands: 'two' },
  { id: 'shortbow', name: 'Shortbow', cost: 30, weight: 2, dmg: '1d6', crit: '×3', range: 60, dmgType: 'P', group: 'martial', hands: 'ranged' },
  { id: 'comp-shortbow', name: 'Shortbow, composite', cost: 75, weight: 2, dmg: '1d6', crit: '×3', range: 70, dmgType: 'P', group: 'martial', hands: 'ranged' },
  { id: 'longbow', name: 'Longbow', cost: 75, weight: 3, dmg: '1d8', crit: '×3', range: 100, dmgType: 'P', group: 'martial', hands: 'ranged' },
  { id: 'comp-longbow', name: 'Longbow, composite', cost: 100, weight: 3, dmg: '1d8', crit: '×3', range: 110, dmgType: 'P', group: 'martial', hands: 'ranged' },
  // Sap — martial light, referenced by the bard/rogue proficiency lists but never authored.
  { id: 'sap', name: 'Sap', cost: 1, weight: 2, dmg: '1d6', crit: '×2', dmgType: 'B', group: 'martial', hands: 'light' },

  // ---- Exotic weapons (Core Rulebook) ----
  // Wielding one without Exotic Weapon Proficiency (or a racial familiarity that reclassifies it)
  // costs −4 on attack rolls, which the engine folds into the attack line.
  // Double weapons carry both ends in the damage string, as the quarterstaff already does.
  { id: 'kama', name: 'Kama', cost: 2, weight: 2, dmg: '1d6', crit: '×2', dmgType: 'S', group: 'exotic', hands: 'light' },
  { id: 'nunchaku', name: 'Nunchaku', cost: 2, weight: 2, dmg: '1d6', crit: '×2', dmgType: 'B', group: 'exotic', hands: 'light' },
  { id: 'sai', name: 'Sai', cost: 1, weight: 1, dmg: '1d4', crit: '×2', dmgType: 'B', group: 'exotic', hands: 'light' },
  { id: 'siangham', name: 'Siangham', cost: 3, weight: 1, dmg: '1d6', crit: '×2', dmgType: 'P', group: 'exotic', hands: 'light' },
  { id: 'bastard-sword', name: 'Sword, bastard', cost: 35, weight: 6, dmg: '1d10', crit: '19–20/×2', dmgType: 'S', group: 'exotic', hands: 'one' },
  { id: 'dwarven-waraxe', name: 'Waraxe, dwarven', cost: 30, weight: 8, dmg: '1d10', crit: '×3', dmgType: 'S', group: 'exotic', hands: 'one' },
  { id: 'whip', name: 'Whip', cost: 1, weight: 2, dmg: '1d3', crit: '×2', dmgType: 'S', group: 'exotic', hands: 'one' },
  { id: 'orc-double-axe', name: 'Axe, orc double', cost: 60, weight: 15, dmg: '1d8/1d8', crit: '×3', dmgType: 'S', group: 'exotic', hands: 'two' },
  { id: 'spiked-chain', name: 'Chain, spiked', cost: 25, weight: 10, dmg: '2d4', crit: '×2', dmgType: 'P', group: 'exotic', hands: 'two' },
  { id: 'elven-curve-blade', name: 'Curve blade, elven', cost: 80, weight: 7, dmg: '1d10', crit: '18–20/×2', dmgType: 'S', group: 'exotic', hands: 'two' },
  { id: 'dire-flail', name: 'Flail, dire', cost: 90, weight: 10, dmg: '1d8/1d8', crit: '×2', dmgType: 'B', group: 'exotic', hands: 'two' },
  { id: 'gnome-hooked-hammer', name: 'Hammer, gnome hooked', cost: 20, weight: 6, dmg: '1d8/1d6', crit: '×3/×4', dmgType: 'B or P', group: 'exotic', hands: 'two' },
  { id: 'totem-spear', name: 'Spear, totem', cost: 25, weight: 6, dmg: '1d10', crit: '×3', range: 10, dmgType: 'P or S', group: 'exotic', hands: 'two' },
  { id: 'two-bladed-sword', name: 'Sword, two-bladed', cost: 100, weight: 10, dmg: '1d8/1d8', crit: '19–20/×2', dmgType: 'S', group: 'exotic', hands: 'two' },
  { id: 'dwarven-urgrosh', name: 'Urgrosh, dwarven', cost: 50, weight: 12, dmg: '1d8/1d6', crit: '×3', dmgType: 'P or S', group: 'exotic', hands: 'two' },
  { id: 'bola', name: 'Bola', cost: 5, weight: 2, dmg: '1d4', crit: '×2', range: 10, dmgType: 'B', group: 'exotic', hands: 'ranged' },
  { id: 'hand-crossbow', name: 'Crossbow, hand', cost: 100, weight: 2, dmg: '1d4', crit: '19–20/×2', range: 30, dmgType: 'P', group: 'exotic', hands: 'ranged' },
  { id: 'repeating-crossbow-heavy', name: 'Crossbow, repeating heavy', cost: 400, weight: 12, dmg: '1d10', crit: '19–20/×2', range: 120, dmgType: 'P', group: 'exotic', hands: 'ranged' },
  { id: 'repeating-crossbow-light', name: 'Crossbow, repeating light', cost: 250, weight: 6, dmg: '1d8', crit: '19–20/×2', range: 80, dmgType: 'P', group: 'exotic', hands: 'ranged' },
  { id: 'shuriken', name: 'Shuriken', cost: 0.2, weight: 0.1, dmg: '1d2', crit: '×2', range: 10, dmgType: 'P', group: 'exotic', hands: 'ranged' },
  { id: 'halfling-sling-staff', name: 'Sling staff, halfling', cost: 20, weight: 3, dmg: '1d8', crit: '×3', range: 80, dmgType: 'B', group: 'exotic', hands: 'ranged' },
  // Not authored: the net. It deals no damage at all, and the attack line is built around a
  // damage string — listing it would print a damage figure the weapon does not have.
];

export const ARMORS: ArmorDef[] = [
  { id: 'padded', name: 'Padded armor', cost: 5, weight: 10, acBonus: 1, maxDex: 8, acp: 0, asf: 5, slot: 'armor', category: 'light' },
  { id: 'leather', name: 'Leather armor', cost: 10, weight: 15, acBonus: 2, maxDex: 6, acp: 0, asf: 10, slot: 'armor', category: 'light' },
  { id: 'studded-leather', name: 'Studded leather', cost: 25, weight: 20, acBonus: 3, maxDex: 5, acp: -1, asf: 15, slot: 'armor', category: 'light' },
  { id: 'chain-shirt', name: 'Chain shirt', cost: 100, weight: 25, acBonus: 4, maxDex: 4, acp: -2, asf: 20, slot: 'armor', category: 'light' },
  { id: 'scale-mail', name: 'Scale mail', cost: 50, weight: 30, acBonus: 5, maxDex: 3, acp: -4, asf: 25, slot: 'armor', category: 'medium' },
  { id: 'chainmail', name: 'Chainmail', cost: 150, weight: 40, acBonus: 6, maxDex: 2, acp: -5, asf: 30, slot: 'armor', category: 'medium' },
  { id: 'breastplate', name: 'Breastplate', cost: 200, weight: 30, acBonus: 6, maxDex: 3, acp: -4, asf: 25, slot: 'armor', category: 'medium' },
  { id: 'full-plate', name: 'Full plate', cost: 1500, weight: 50, acBonus: 9, maxDex: 1, acp: -6, asf: 35, slot: 'armor', category: 'heavy' },
  { id: 'buckler', name: 'Buckler', cost: 5, weight: 5, acBonus: 1, maxDex: null, acp: -1, asf: 5, slot: 'shield', category: 'shield' },
  { id: 'light-shield', name: 'Light wooden shield', cost: 3, weight: 5, acBonus: 1, maxDex: null, acp: -1, asf: 5, slot: 'shield', category: 'shield' },
  { id: 'heavy-shield', name: 'Heavy wooden shield', cost: 7, weight: 10, acBonus: 2, maxDex: null, acp: -2, asf: 15, slot: 'shield', category: 'shield' },
];

// Gear, consumables, ammunition, and charged items — costs/weights verified against d20pfsrd.
// `consumable` items are used up in play; `charges` items are tracked per charge (phase 5).
export const GEAR: GearDef[] = [
  { id: 'backpack', name: 'Backpack', cost: 2, weight: 2 },
  { id: 'bedroll', name: 'Bedroll', cost: 0.1, weight: 5 },
  { id: 'rope-hemp', name: 'Rope, hemp (50 ft)', cost: 1, weight: 10 },
  { id: 'torch', name: 'Torch', cost: 0.01, weight: 1, consumable: true },
  { id: 'waterskin', name: 'Waterskin', cost: 1, weight: 4 },
  { id: 'rations', name: 'Trail rations (per day)', cost: 0.5, weight: 1, consumable: true },
  { id: 'spell-component-pouch', name: 'Spell component pouch', cost: 5, weight: 2 },
  { id: 'spellbook', name: 'Wizard spellbook (blank)', cost: 15, weight: 3 },
  { id: 'holy-symbol-wood', name: 'Holy symbol, wooden', cost: 1, weight: 0 },
  { id: 'thieves-tools', name: "Thieves' tools", cost: 30, weight: 1, note: 'needed for Disable Device on traps' },
  { id: 'healers-kit', name: "Healer's kit", cost: 50, weight: 1, consumable: true, note: '10 uses' },
  { id: 'flint-steel', name: 'Flint and steel', cost: 1, weight: 0 },
  // --- Alchemical weapons (thrown splash) ---
  { id: 'acid-flask', name: 'Acid (flask)', cost: 10, weight: 1, consumable: true, note: '1d6 acid, splash 1' },
  { id: 'alchemists-fire', name: "Alchemist's fire (flask)", cost: 20, weight: 1, consumable: true, note: '1d6 fire + 1d6 next round' },
  { id: 'holy-water', name: 'Holy water (flask)', cost: 25, weight: 1, consumable: true, note: '2d4 vs undead/evil outsiders' },
  { id: 'thunderstone', name: 'Thunderstone', cost: 30, weight: 1, consumable: true, note: 'DC 15 Fort or deafened 1 hour' },
  { id: 'tanglefoot-bag', name: 'Tanglefoot bag', cost: 50, weight: 4, consumable: true, note: 'entangles on a ranged touch hit' },
  // --- Ammunition (tracked per listed bundle) ---
  { id: 'arrows', name: 'Arrows (20)', cost: 1, weight: 3, consumable: true },
  { id: 'crossbow-bolts', name: 'Crossbow bolts (10)', cost: 1, weight: 1, consumable: true },
  { id: 'sling-bullets', name: 'Sling bullets (10)', cost: 0.1, weight: 5, consumable: true },
  // --- Magic consumables ---
  { id: 'potion-clw', name: 'Potion of cure light wounds', cost: 50, weight: 0, consumable: true, note: 'heals 1d8+1' },
  { id: 'wand-clw', name: 'Wand of cure light wounds', cost: 750, weight: 0, charges: 50, note: '1d8+1 per charge' },
];

export const weaponById = new Map(WEAPONS.map((w) => [w.id, w]));
export const armorById = new Map(ARMORS.map((a) => [a.id, a]));
export const gearById = new Map(GEAR.map((g) => [g.id, g]));

export interface AnyItem { id: string; name: string; cost: number; weight: number; slot?: 'armor' | 'shield' | 'main' | 'off'; }

export function anyItemById(id: string): AnyItem | null {
  const w = weaponById.get(id);
  if (w) return { id: w.id, name: w.name, cost: w.cost, weight: w.weight, slot: w.hands === 'ranged' ? 'main' : w.hands === 'two' ? 'main' : 'main' };
  const a = armorById.get(id);
  if (a) return { id: a.id, name: a.name, cost: a.cost, weight: a.weight, slot: a.slot };
  const g = gearById.get(id);
  if (g) return { id: g.id, name: g.name, cost: g.cost, weight: g.weight };
  return null;
}
