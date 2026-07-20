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

/** Bloodrager bloodline powers, keyed by bloodline id (levels 1/4/8/12/16/20). */
export const BLOODRAGER_BLOODLINE_POWERS: Record<string, SourceFeature[]> = {
  aberrant: [
    { level: 1, name: 'Staggering Strike', desc: 'A confirmed critical can leave the target staggered.' },
    { level: 4, name: 'Abnormal Reach', desc: 'Your limbs elongate while bloodraging, extending your reach.' },
    { level: 8, name: 'Aberrant Fortitude', desc: 'Immune to the sickened and nauseated conditions.' },
    { level: 12, name: 'Unusual Anatomy', desc: 'A chance to negate any critical hit or sneak attack against you.' },
    { level: 16, name: 'Aberrant Resistance', desc: 'Gain spell resistance while bloodraging.' },
    { level: 20, name: 'Aberrant Form', desc: 'Immune to critical hits and sneak attacks; gain blindsight.' },
  ],
  abyssal: [
    { level: 1, name: 'Claws', desc: 'Grow claws that strike as natural weapons while bloodraging.' },
    { level: 4, name: 'Demonic Bulk', desc: 'Grow one size larger while bloodraging.' },
    { level: 8, name: 'Demon Resistances', desc: 'Resistance to electricity and a bonus against poison.' },
    { level: 12, name: 'Abyssal Bloodrage', desc: 'Your bloodrage Strength bonus increases, at a steeper AC penalty.' },
    { level: 16, name: 'Demonic Aura', desc: 'A searing aura burns foes that close with you while bloodraging.' },
    { level: 20, name: 'Demonic Immunities', desc: 'Immunity to electricity and poison.' },
  ],
  arcane: [
    { level: 1, name: 'Disruptive Bloodrage', desc: 'Your bloodrage raises the DC for foes to cast defensively near you.' },
    { level: 4, name: 'Arcane Bloodrage', desc: 'Apply a known metamagic feat mid-bloodrage without slowing your casting.' },
    { level: 8, name: 'Greater Arcane Bloodrage', desc: 'Your mid-bloodrage metamagic reaches higher-level spells.' },
    { level: 12, name: "Caster's Scourge", desc: 'Spellcasters you threaten struggle far harder to cast defensively.' },
    { level: 16, name: 'True Arcane Bloodrage', desc: 'Your bloodrage metamagic applies to your highest-level spells.' },
    { level: 20, name: "Caster's Bane", desc: 'A strike can strip a prepared spell or slot from the foe you hit.' },
  ],
  celestial: [
    { level: 1, name: 'Angelic Attacks', desc: 'Your strikes count as good-aligned and magic, biting deeper into evil foes.' },
    { level: 4, name: 'Celestial Resistances', desc: 'Resistance to acid and cold.' },
    { level: 8, name: 'Conviction', desc: 'Once per day, reroll a failed d20 and keep the better result.' },
    { level: 12, name: 'Wings of Heaven', desc: 'Sprout feathered wings granting flight while bloodraging.' },
    { level: 16, name: 'Angelic Protection', desc: 'A radiant aura wards you while bloodraging.' },
    { level: 20, name: 'Ascension', desc: 'Immunity to acid, cold, and petrification; resistances and a protective aura.' },
  ],
  destined: [
    { level: 1, name: 'Destined Strike', desc: 'Add an insight bonus to an attack a few times per day.' },
    { level: 4, name: 'Fated Bloodrager', desc: 'A luck bonus to saves (and AC) as your bloodrage begins.' },
    { level: 8, name: 'Certain Strike', desc: 'Your attacks ignore ordinary concealment.' },
    { level: 12, name: 'Defy Death', desc: 'Fate stays your death — you stabilize where others would fall.' },
    { level: 16, name: 'Unstoppable', desc: 'While bloodraging, nothing slows your advance.' },
    { level: 20, name: 'Victory or Death', desc: 'Your destiny culminates in a decisive, empowered bloodrage.' },
  ],
  draconic: [
    { level: 1, name: 'Claws', desc: 'Grow draconic claws as natural weapons while bloodraging.' },
    { level: 4, name: 'Draconic Resistance', desc: "Resistance to your dragon's energy type and a natural armor bonus." },
    { level: 8, name: 'Breath Weapon', desc: 'Exhale a line or cone of your energy type once per day.' },
    { level: 12, name: 'Dragon Wings', desc: 'Leathery wings grant a fly speed while bloodraging.' },
    { level: 16, name: 'Dragon Form', desc: "Assume a dragon's form (as form of the dragon) while bloodraging." },
    { level: 20, name: 'Power of Wyrms', desc: 'Immunity to your energy type, paralysis, and sleep; blindsense.' },
  ],
  elemental: [
    { level: 1, name: 'Elemental Strikes', desc: "Charge your attacks with your element's energy while bloodraging." },
    { level: 4, name: 'Elemental Resistance', desc: "Resistance to your chosen element's energy type." },
    { level: 8, name: 'Elemental Movement', desc: 'Gain a special movement mode suited to your element.' },
    { level: 12, name: 'Power of the Elements', desc: 'Your elemental power surges, striking past resistances.' },
    { level: 16, name: 'Elemental Form', desc: "Take an elemental's form (as elemental body) while bloodraging." },
    { level: 20, name: 'Elemental Body', desc: "Immune to your element's energy, and to critical hits and sneak attacks." },
  ],
  fey: [
    { level: 1, name: 'Confusing Critical', desc: 'A confirmed critical can leave the target confused.' },
    { level: 4, name: 'Leaping Charger', desc: 'Charge over obstacles and difficult terrain.' },
    { level: 8, name: 'Blurring Movement', desc: 'Moving in a bloodrage blurs you, granting concealment.' },
    { level: 12, name: 'Quickling Bloodrage', desc: 'Your bloodrage quickens you, as haste.' },
    { level: 16, name: 'One with Nature', desc: 'The wild shelters you: damage reduction and easy concealment in natural terrain.' },
    { level: 20, name: 'Fury of the Fey', desc: 'Fey power at its peak — strong DR and lingering confusion on your crits.' },
  ],
  infernal: [
    { level: 1, name: 'Hellfire Strike', desc: 'Sear foes with hellfire damage on your strikes.' },
    { level: 4, name: 'Infernal Resistance', desc: 'Resistance to fire and a bonus against poison.' },
    { level: 8, name: 'Diabolical Arrogance', desc: 'Diabolic pride wards you against fear and mind-affecting effects.' },
    { level: 12, name: 'Dark Wings', desc: 'Bat-like wings grant flight while bloodraging.' },
    { level: 16, name: 'Hellfire Charge', desc: 'Charging in a bloodrage scorches your path with hellfire.' },
    { level: 20, name: 'Fiend of the Pit', desc: 'Immunity to fire and poison, and sight in any darkness.' },
  ],
  undead: [
    { level: 1, name: 'Frightful Charger', desc: 'A charging strike can leave the target shaken.' },
    { level: 4, name: 'Ghost Strike', desc: 'Your blows land solidly on incorporeal foes.' },
    { level: 8, name: "Death's Gift", desc: "The grave's gift: cold resistance and DR against nonlethal harm." },
    { level: 12, name: 'Frightful Strikes', desc: 'Strikes in a bloodrage can leave foes shaken.' },
    { level: 16, name: 'Incorporeal Bloodrager', desc: 'Slip into an incorporeal state for a time while bloodraging.' },
    { level: 20, name: 'One Foot in the Grave', desc: 'Gain the deathless immunities of the undead while bloodraging.' },
  ],
};
