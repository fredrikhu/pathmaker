// Per-source, per-level class abilities that are FIXED by an earlier choice (sorcerer bloodline,
// cavalier order) rather than picked from a list. The engine injects the matching source's
// abilities into the advancement progression once the source is chosen (see resolve.ts →
// sourceFeatures). Core-scope; sources not listed here fall back to the class's descriptive feature.

export interface SourceFeature { level: number; name: string; desc: string; }

/** Sorcerer bloodline powers, keyed by bloodline id (levels 1/3/9/15/20). */
export const SORCERER_BLOODLINE_POWERS: Record<string, SourceFeature[]> = {
  draconic: [
    { level: 1, name: 'Claws', desc: 'Grow claws dealing energy-boosted damage a few rounds/day.' },
    { level: 3, name: 'Dragon Resistances', desc: "Resistance to your dragon's energy type and a natural armor bonus." },
    { level: 9, name: 'Breath Weapon', desc: 'Exhale a line or cone of your energy type.' },
    { level: 15, name: 'Wings', desc: 'Grow leathery wings granting a fly speed.' },
    { level: 20, name: 'Power of Wyrms', desc: 'Immunity to your energy type, paralysis, and sleep; blindsense.' },
  ],
  arcane: [
    { level: 1, name: 'Arcane Bond', desc: 'Bond with a familiar or an object to cast through.' },
    { level: 3, name: 'Metamagic Adept', desc: 'Apply metamagic a few times per day without increasing casting time.' },
    { level: 9, name: 'New Arcana', desc: 'Add extra spells to your spells known.' },
    { level: 15, name: 'School Power', desc: '+2 to the save DCs of one chosen school.' },
    { level: 20, name: 'Arcane Apotheosis', desc: 'Expend spell slots to power magic items instead of charges.' },
  ],
  celestial: [
    { level: 1, name: 'Heavenly Fire', desc: 'A ray that heals allies or sears evil foes.' },
    { level: 3, name: 'Celestial Resistances', desc: 'Resistance to acid and cold.' },
    { level: 9, name: 'Wings of Heaven', desc: 'Sprout feathered wings granting flight for a time.' },
    { level: 15, name: 'Conviction', desc: 'Reroll a failed check or save once per day.' },
    { level: 20, name: 'Ascension', desc: 'Immunity to acid, cold, and petrification; DR and SR.' },
  ],
  infernal: [
    { level: 1, name: 'Corrupting Touch', desc: 'A touch that leaves a foe shaken.' },
    { level: 3, name: 'Infernal Resistances', desc: 'Resistance to fire and a bonus vs poison.' },
    { level: 9, name: 'Hellfire', desc: 'Loose a blast of hellfire that damages and shakes foes.' },
    { level: 15, name: 'On Dark Wings', desc: 'Grow bat-like wings granting flight.' },
    { level: 20, name: 'Power of the Pit', desc: 'Immunity to fire and poison; darkvision and resistances.' },
  ],
  abyssal: [
    { level: 1, name: 'Claws', desc: 'Grow claws dealing extra damage against good foes.' },
    { level: 3, name: 'Demon Resistances', desc: 'Resistance to electricity and a bonus vs poison.' },
    { level: 9, name: 'Strength of the Abyss', desc: 'A scaling bonus to Strength.' },
    { level: 15, name: 'Added Summonings', desc: 'Your summoned creatures gain fiendish templates and allies.' },
    { level: 20, name: 'Demonic Might', desc: 'Immunity to electricity and poison; telepathy and resistances.' },
  ],
  fey: [
    { level: 1, name: 'Laughing Touch', desc: 'A touch leaves a foe helpless with laughter.' },
    { level: 3, name: 'Woodland Stride', desc: 'Move through undergrowth unhindered.' },
    { level: 9, name: 'Fleeting Glance', desc: 'Turn invisible (as greater invisibility) for rounds/day.' },
    { level: 15, name: 'Fey Magic', desc: 'Reroll caster level checks to overcome spell resistance.' },
    { level: 20, name: 'Soul of the Fey', desc: 'Immunity to poison; step through shadows; undead ignore you.' },
  ],
};

/** Cavalier order abilities, keyed by order id (levels 2/8/15). */
export const CAVALIER_ORDER_ABILITIES: Record<string, SourceFeature[]> = {
  cockatrice: [
    { level: 2, name: 'Braggart', desc: 'Demoralize foes; gain a bonus to hit those who are shaken.' },
    { level: 8, name: 'Steal Glory', desc: 'When an ally crits a challenged foe, make an attack of opportunity.' },
    { level: 15, name: 'Rages of Vanity', desc: 'Goad a foe into attacking you at a penalty.' },
  ],
  dragon: [
    { level: 2, name: 'Aid Allies', desc: 'Your aid another grants a larger bonus.' },
    { level: 8, name: 'Strategy', desc: 'Grant nearby allies a bonus of your choosing for a round.' },
    { level: 15, name: 'Act as One', desc: 'Once per battle, allies act with you in a coordinated assault.' },
  ],
  lion: [
    { level: 2, name: 'For the King', desc: "Grant allies a bonus on attack and damage when you issue a challenge." },
    { level: 8, name: "Lion's Call", desc: 'Rally allies against fear with a rousing shout.' },
    { level: 15, name: 'Shield of the Liege', desc: 'Redirect attacks aimed at an adjacent ally to yourself.' },
  ],
  shield: [
    { level: 2, name: 'Resolute', desc: 'Convert some damage to nonlethal while defending the weak.' },
    { level: 8, name: 'Stem the Tide', desc: 'Gain Stand Still as a bonus feat.' },
    { level: 15, name: 'Protect the Meek', desc: 'Move to an endangered ally and attack as an immediate action.' },
  ],
  sword: [
    { level: 2, name: 'By My Honor', desc: 'A bonus to one save while you uphold your code.' },
    { level: 8, name: 'Mounted Mastery', desc: 'Ignore your mount armor-check penalty and gain a charge bonus.' },
    { level: 15, name: "Knight's Challenge", desc: 'Once per day, a greatly empowered challenge.' },
  ],
};
