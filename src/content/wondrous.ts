// Worn magic items — the "big six" ability boosters plus the standard defensive trio, which is what
// nearly every character above low level actually buys. Slots, costs and bonus types verified
// against d20pfsrd's individual item pages.
//
// Item families are generated from a single definition per family rather than hand-listing every
// tier, so a family's cost curve and bonus type can only be wrong in one place.

import type { Ability, Effect } from '../engine/types';
import { SKILLS } from './skills';

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
  /** The item's bonus value, for display ("+2"). 0 for items with no numeric bonus. */
  bonus: number;
  /** True for members of a +N family priced on the bonus² curve; false for flat-priced items. */
  tiered: boolean;
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
    tiered: true,
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
    tiered: true,
    desc: descFor(b),
    effects: [effectFor(b)],
  }));
}

/** A single-price item granting a competence bonus to one or more skills. */
function skillItem(
  id: string, name: string, slot: BodySlot, cost: number,
  bonuses: { skill: string; value: number }[], desc: string,
): WondrousItemDef {
  return {
    id, name, slot, cost, bonus: bonuses[0].value, tiered: false, desc,
    effects: bonuses.map((b) => ({
      target: `skill:${b.skill}`, type: 'competence' as const, value: b.value, note: name,
    })),
  };
}

/** Charisma-based skills, for the circlet of persuasion's "Charisma-based checks". */
const CHA_SKILLS = SKILLS.filter((s) => s.ability === 'cha').map((s) => s.id);

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
  // ---- Wrists: bracers of armor, +1..+8, bonus² × 1,000 ----
  // The armor bonus is the same type worn armor grants, so the engine's same-type rule already
  // stops these stacking with a suit of armor — the higher of the two simply wins.
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((b) => ({
    id: `bracers-armor-${b}`,
    name: `Bracers of armor +${b}`,
    slot: 'wrists' as BodySlot,
    cost: b * b * 1_000,
    bonus: b,
    tiered: true,
    desc: `+${b} armor bonus to AC. Does not stack with worn armor; the higher bonus applies.`,
    effects: [{ target: 'ac', type: 'armor' as const, value: b, note: `Bracers of armor +${b}` }],
  })),
  // ---- Skill items (single price, competence bonuses) ----
  skillItem('boots-elvenkind', 'Boots of elvenkind', 'feet', 2_500,
    [{ skill: 'acrobatics', value: 5 }], '+5 competence bonus on Acrobatics checks.'),
  skillItem('cloak-elvenkind', 'Cloak of elvenkind', 'shoulders', 2_500,
    [{ skill: 'stealth', value: 5 }], '+5 competence bonus on Stealth checks (hood drawn up).'),
  skillItem('eyes-of-the-eagle', 'Eyes of the eagle', 'eyes', 2_500,
    [{ skill: 'perception', value: 5 }], '+5 competence bonus on Perception checks.'),
  skillItem('gloves-swimming-climbing', 'Gloves of swimming and climbing', 'hands', 6_250,
    [{ skill: 'swim', value: 5 }, { skill: 'climb', value: 5 }],
    '+5 competence bonus on Swim and Climb checks.'),
  skillItem('vest-of-escape', 'Vest of escape', 'chest', 5_200,
    [{ skill: 'escape-artist', value: 6 }, { skill: 'disable-device', value: 4 }],
    '+6 competence bonus on Escape Artist and +4 on Disable Device checks.'),
  skillItem('circlet-of-persuasion', 'Circlet of persuasion', 'head', 4_500,
    CHA_SKILLS.map((skill) => ({ skill, value: 3 })),
    '+3 competence bonus on Charisma-based checks.'),
  // ---- Boots of striding and springing: speed is a total, the Acrobatics bonus is not ----
  // The +5 Acrobatics applies only to jumping, so it is carried as a condition and shown as an
  // annotation rather than folded into the Acrobatics total.
  {
    id: 'boots-striding-springing',
    name: 'Boots of striding and springing',
    slot: 'feet',
    cost: 5_500,
    bonus: 10,
    tiered: false,
    desc: '+10 ft. enhancement bonus to base land speed, and +5 competence on Acrobatics checks made to jump.',
    effects: [
      { target: 'speed', type: 'enhancement', value: 10, note: 'Boots of striding and springing' },
      { target: 'skill:acrobatics', type: 'competence', value: 5, note: 'Boots of striding and springing', condition: 'to jump' },
    ],
  },
  // ---- Items whose effect the engine does not model as a number; carried for the description
  // and the gold they cost, with no bonus claimed anywhere. ----
  {
    id: 'boots-of-speed',
    name: 'Boots of speed',
    slot: 'feet',
    cost: 12_000,
    bonus: 0,
    tiered: false,
    desc: 'Free action: act as though hasted for up to 10 rounds per day; the rounds need not be consecutive.',
    effects: [],
  },
  {
    id: 'goggles-of-night',
    name: 'Goggles of night',
    slot: 'eyes',
    cost: 12_000,
    bonus: 0,
    tiered: false,
    desc: 'Grants the wearer 60-foot darkvision.',
    effects: [],
  },
];

export const wondrousItemById = new Map(WONDROUS_ITEMS.map((i) => [i.id, i]));
