// Worn magic items — the "big six" ability boosters plus the standard defensive trio, which is what
// nearly every character above low level actually buys. Slots, costs and bonus types verified
// against d20pfsrd's individual item pages.
//
// Item families are generated from a single definition per family rather than hand-listing every
// tier, so a family's cost curve and bonus type can only be wrong in one place.

import type { Ability, Effect } from '../engine/types';

/** Body slots that matter for worn items. One item per slot, except rings (two). */
export type BodySlot =
  | 'head' | 'headband' | 'eyes' | 'neck' | 'shoulders' | 'chest' | 'body'
  | 'belt' | 'wrists' | 'hands' | 'ring' | 'feet';

export const BODY_SLOTS: BodySlot[] = [
  'head', 'headband', 'eyes', 'neck', 'shoulders', 'chest', 'body', 'belt', 'wrists', 'hands', 'ring', 'feet',
];

/** How many items of a slot actually function at once. */
export const SLOT_CAPACITY: Record<BodySlot, number> = {
  head: 1, headband: 1, eyes: 1, neck: 1, shoulders: 1, chest: 1, body: 1,
  belt: 1, wrists: 1, hands: 1, ring: 2, feet: 1,
};

export interface WondrousItemDef {
  id: string;
  name: string;
  slot: BodySlot;
  cost: number;
  /** The item's bonus value, for display ("+2"). */
  bonus: number;
  desc: string;
  effects: Effect[];
}

/** Ability-boosting items: enhancement bonus, +2/+4/+6, priced bonus² × 1,000. */
function abilityItems(idBase: string, name: string, slot: BodySlot, ability: Ability, abilityName: string): WondrousItemDef[] {
  return [2, 4, 6].map((b) => ({
    id: `${idBase}-${b}`,
    name: `${name} +${b}`,
    slot,
    cost: b * b * 1_000,
    bonus: b,
    desc: `+${b} enhancement bonus to ${abilityName}.`,
    effects: [{ target: `ability:${ability}`, type: 'enhancement' as const, value: b, note: `${name} +${b}` }],
  }));
}

/** A +1..+5 family priced bonus² × `per`. */
function tieredItems(
  idBase: string, name: string, slot: BodySlot, per: number,
  effectFor: (b: number) => Effect, descFor: (b: number) => string,
): WondrousItemDef[] {
  return [1, 2, 3, 4, 5].map((b) => ({
    id: `${idBase}-${b}`,
    name: `${name} +${b}`,
    slot,
    cost: b * b * per,
    bonus: b,
    desc: descFor(b),
    effects: [effectFor(b)],
  }));
}

export const WONDROUS_ITEMS: WondrousItemDef[] = [
  // ---- Ability boosters (belt / headband), 4,000 / 16,000 / 36,000 ----
  ...abilityItems('belt-strength', 'Belt of giant strength', 'belt', 'str', 'Strength'),
  ...abilityItems('belt-dexterity', 'Belt of incredible dexterity', 'belt', 'dex', 'Dexterity'),
  ...abilityItems('belt-constitution', 'Belt of mighty constitution', 'belt', 'con', 'Constitution'),
  ...abilityItems('headband-intelligence', 'Headband of vast intelligence', 'headband', 'int', 'Intelligence'),
  ...abilityItems('headband-wisdom', 'Headband of inspired wisdom', 'headband', 'wis', 'Wisdom'),
  ...abilityItems('headband-charisma', 'Headband of alluring charisma', 'headband', 'cha', 'Charisma'),
  // ---- Defensive trio ----
  ...tieredItems('cloak-resistance', 'Cloak of resistance', 'shoulders', 1_000,
    (b) => ({ target: 'save:all', type: 'resistance', value: b, note: `Cloak of resistance +${b}` }),
    (b) => `+${b} resistance bonus on all saving throws.`),
  ...tieredItems('ring-protection', 'Ring of protection', 'ring', 2_000,
    (b) => ({ target: 'ac', type: 'deflection', value: b, note: `Ring of protection +${b}` }),
    (b) => `+${b} deflection bonus to AC.`),
  ...tieredItems('amulet-natural-armor', 'Amulet of natural armor', 'neck', 2_000,
    (b) => ({ target: 'ac', type: 'natural-armor', value: b, note: `Amulet of natural armor +${b}` }),
    (b) => `+${b} enhancement bonus to natural armor.`),
];

export const wondrousItemById = new Map(WONDROUS_ITEMS.map((i) => [i.id, i]));
