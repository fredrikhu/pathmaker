// Magic armour and shield special abilities. Equivalents, costs and mechanics verified against
// d20pfsrd's individual ability pages. As with weapons, an ability requires at least a +1
// enhancement bonus and the combined bonus caps at +10.
//
// Unlike weapon abilities, several armour abilities are priced at a FLAT gp amount rather than as a
// bonus equivalent (glamered, slick, shadow) — those do not count toward the +10 cap. The model
// carries both, because assuming symmetry with weapons would misprice them.

import type { Effect } from '../engine/types';

export interface ArmorPropertyDef {
  id: string;
  name: string;
  /** Which item it can go on. */
  slot: 'armor' | 'shield';
  /** Price bonus equivalent, for abilities costed that way. */
  equivalent?: number;
  /** Flat gp surcharge, for abilities costed that way (mutually exclusive with `equivalent`). */
  flatCost?: number;
  desc: string;
  /** Unconditional effects folded into the stat graph (slick/shadow's skill bonuses). */
  effects?: Effect[];
  /** Set when the benefit only applies in a specific circumstance — shown, never totalled. */
  condition?: string;
}

export const ARMOR_PROPERTIES: ArmorPropertyDef[] = [
  // ---- Armour, flat-priced ----
  { id: 'glamered', name: 'Glamered', slot: 'armor', flatCost: 2_700,
    desc: 'On command, appears as normal clothing while keeping all its properties.' },
  { id: 'slick', name: 'Slick', slot: 'armor', flatCost: 3_750,
    desc: '+5 competence bonus on Escape Artist checks.',
    effects: [{ target: 'skill:escape-artist', type: 'competence', value: 5, note: 'Slick armour' }] },
  { id: 'shadow', name: 'Shadow', slot: 'armor', flatCost: 3_750,
    desc: '+5 competence bonus on Stealth checks.',
    effects: [{ target: 'skill:stealth', type: 'competence', value: 5, note: 'Shadow armour' }] },
  // ---- Armour, bonus-equivalent ----
  { id: 'fortification-light', name: 'Light fortification', slot: 'armor', equivalent: 1,
    desc: '25% chance to negate a critical hit or sneak attack (damage is rolled normally instead).',
    condition: '25% to negate crits/sneak attacks' },
  { id: 'fortification-moderate', name: 'Moderate fortification', slot: 'armor', equivalent: 3,
    desc: '50% chance to negate a critical hit or sneak attack.', condition: '50% to negate crits/sneak attacks' },
  { id: 'fortification-heavy', name: 'Heavy fortification', slot: 'armor', equivalent: 5,
    desc: '75% chance to negate a critical hit or sneak attack.', condition: '75% to negate crits/sneak attacks' },
  { id: 'invulnerability', name: 'Invulnerability', slot: 'armor', equivalent: 3,
    desc: 'Grants damage reduction 5/magic.', condition: 'DR 5/magic' },
  { id: 'spell-resistance-13', name: 'Spell resistance 13', slot: 'armor', equivalent: 2, desc: 'Grants spell resistance 13 while worn.', condition: 'SR 13' },
  { id: 'spell-resistance-15', name: 'Spell resistance 15', slot: 'armor', equivalent: 3, desc: 'Grants spell resistance 15 while worn.', condition: 'SR 15' },
  { id: 'spell-resistance-17', name: 'Spell resistance 17', slot: 'armor', equivalent: 4, desc: 'Grants spell resistance 17 while worn.', condition: 'SR 17' },
  { id: 'spell-resistance-19', name: 'Spell resistance 19', slot: 'armor', equivalent: 5, desc: 'Grants spell resistance 19 while worn.', condition: 'SR 19' },
  // ---- Shields ----
  { id: 'bashing', name: 'Bashing', slot: 'shield', equivalent: 1,
    desc: 'Shield bashes deal damage as a shield two size categories larger, and it acts as a +1 weapon when bashing.',
    condition: 'when shield bashing' },
  { id: 'arrow-catching', name: 'Arrow catching', slot: 'shield', equivalent: 1,
    desc: '+1 deflection bonus against ranged weapons; ranged attacks aimed near you divert to you instead.',
    condition: '+1 deflection vs ranged' },
  { id: 'arrow-deflection', name: 'Arrow deflection', slot: 'shield', equivalent: 2,
    desc: 'Once per round, a DC 20 Reflex save deflects a ranged weapon that would hit you (as Deflect Arrows).',
    condition: '1/round vs ranged' },
  { id: 'animated', name: 'Animated', slot: 'shield', equivalent: 2,
    desc: 'As a move action, release the shield to defend you on its own for 4 rounds.' },
];

export const armorPropertyById = new Map(ARMOR_PROPERTIES.map((p) => [p.id, p]));
