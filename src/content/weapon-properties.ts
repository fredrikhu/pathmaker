// Magic weapon special abilities. Equivalents, costs and mechanics verified against d20pfsrd's
// individual ability pages. A weapon must already have a +1 enhancement bonus to carry any of
// these, and enhancement + all equivalents may not exceed +10 (both enforced in the engine).
//
// `damageDice` is unconditional extra damage we can show on the attack line. Abilities whose damage
// depends on the target (bane, holy, anarchic…) or on a critical (the burst line) are conditional:
// they carry a `condition` and are surfaced as a note, never folded into the damage string.

export interface WeaponPropertyDef {
  id: string;
  name: string;
  /** Price bonus equivalent (+1..+5) added to the enhancement bonus for costing. */
  equivalent: number;
  desc: string;
  /** Unconditional extra damage, e.g. "1d6 fire" — safe to add to the damage line. */
  damageDice?: string;
  /** Set when the ability's benefit only applies in a specific circumstance. */
  condition?: string;
  /** Doubles the weapon's threat range (keen). */
  doublesThreat?: boolean;
  /** Grants one extra attack at full BAB on a full attack (speed). */
  extraAttack?: boolean;
  /** Restricted to certain weapons; shown as a caution, not enforced. */
  restriction?: string;
}

export const WEAPON_PROPERTIES: WeaponPropertyDef[] = [
  // ---- +1 ----
  { id: 'bane', name: 'Bane', equivalent: 1, desc: 'Against its designated foe the enhancement bonus is +2 better and it deals +2d6 damage.', condition: 'vs designated foe' },
  { id: 'defending', name: 'Defending', equivalent: 1, desc: 'As a free action, move any part of the enhancement bonus to AC until your next turn.', restriction: 'melee weapons only' },
  { id: 'flaming', name: 'Flaming', equivalent: 1, desc: 'Sheathed in fire on command: +1d6 fire damage on a hit.', damageDice: '1d6 fire' },
  { id: 'frost', name: 'Frost', equivalent: 1, desc: 'Sheathed in cold on command: +1d6 cold damage on a hit.', damageDice: '1d6 cold' },
  { id: 'shock', name: 'Shock', equivalent: 1, desc: 'Crackles with electricity on command: +1d6 electricity damage on a hit.', damageDice: '1d6 electricity' },
  { id: 'ghost-touch', name: 'Ghost touch', equivalent: 1, desc: 'Damages incorporeal creatures normally, ignoring their 50% reduction; they can wield it too.', condition: 'vs incorporeal' },
  { id: 'keen', name: 'Keen', equivalent: 1, desc: 'Doubles the threat range. Does not stack with Improved Critical or keen edge.', doublesThreat: true, restriction: 'piercing or slashing melee weapons' },
  { id: 'merciful', name: 'Merciful', equivalent: 1, desc: '+1d6 damage and all damage is nonlethal; suppressible on command (losing the bonus).', damageDice: '1d6 nonlethal' },
  { id: 'vicious', name: 'Vicious', equivalent: 1, desc: '+2d6 damage to the target — and 1d6 to you.', damageDice: '2d6' },
  // ---- +2 ----
  { id: 'anarchic', name: 'Anarchic', equivalent: 2, desc: 'Chaos-aligned: +2d6 damage against lawful creatures. A lawful wielder gains a negative level.', condition: 'vs lawful creatures' },
  { id: 'axiomatic', name: 'Axiomatic', equivalent: 2, desc: 'Law-aligned: +2d6 damage against chaotic creatures.', condition: 'vs chaotic creatures' },
  { id: 'holy', name: 'Holy', equivalent: 2, desc: 'Good-aligned: +2d6 damage against evil creatures, and bypasses their DR.', condition: 'vs evil creatures' },
  { id: 'unholy', name: 'Unholy', equivalent: 2, desc: 'Evil-aligned: +2d6 damage against good creatures. A good wielder gains a negative level.', condition: 'vs good creatures' },
  { id: 'flaming-burst', name: 'Flaming burst', equivalent: 2, desc: 'As flaming, and on a critical adds 1d10 fire per point of crit multiplier above 1 (1d10/2d10/3d10).', damageDice: '1d6 fire', condition: 'burst on a critical hit' },
  { id: 'wounding', name: 'Wounding', equivalent: 2, desc: 'Deals 1 bleed damage per hit; bleeds stack, stopped by a DC 15 Heal check or magical healing.', condition: 'bleed, not multiplied by crits' },
  // ---- +3 and up ----
  { id: 'speed', name: 'Speed', equivalent: 3, desc: 'On a full attack, one extra attack at your full base attack bonus. Does not stack with haste.', extraAttack: true },
  { id: 'brilliant-energy', name: 'Brilliant energy', equivalent: 4, desc: 'Ignores nonliving matter — armour and shield bonuses do not apply. Cannot harm undead, constructs or objects.', condition: 'vs living creatures only' },
  { id: 'dancing', name: 'Dancing', equivalent: 4, desc: 'Loose the weapon to fight on its own for 4 rounds at your base attack bonus.' },
  { id: 'vorpal', name: 'Vorpal', equivalent: 5, desc: 'On a confirmed critical from a natural 20, severs the target’s head.', condition: 'natural 20 + confirmed crit', restriction: 'slashing melee weapons' },
];

export const weaponPropertyById = new Map(WEAPON_PROPERTIES.map((p) => [p.id, p]));
