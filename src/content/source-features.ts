// Per-source, per-level class abilities that are FIXED by an earlier choice (sorcerer bloodline,
// cavalier order) rather than picked from a list. The engine injects the matching source's
// abilities into the advancement progression once the source is chosen (see resolve.ts →
// sourceFeatures). Core-scope; sources not listed here fall back to the class's descriptive feature.

export interface SourceFeature { level: number; name: string; desc: string; grantsFeat?: string; grantsFeatChoice?: string[]; }

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
  flame: [
    { level: 2, name: 'Foolhardy Rush', desc: 'On a high initiative roll, move up to your speed as an immediate action to reach the fray.' },
    { level: 8, name: 'Daunting Success', desc: 'On a confirmed critical hit, attempt to demoralize all foes near you.' },
    { level: 15, name: 'Blaze of Glory', desc: 'Once per combat, surge with speed and a large attack bonus, ignoring difficult terrain as you charge.' },
  ],
  lion: [
    { level: 2, name: 'For the King', desc: "Grant allies a bonus on attack and damage when you issue a challenge." },
    { level: 8, name: "Lion's Call", desc: 'Rally allies against fear with a rousing shout.' },
    { level: 15, name: 'Shield of the Liege', desc: 'Redirect attacks aimed at an adjacent ally to yourself.' },
  ],
  shield: [
    { level: 2, name: 'Resolute', desc: 'Convert some damage to nonlethal while defending the weak.' },
    { level: 8, name: 'Stem the Tide', desc: 'Gain Stand Still as a bonus feat.', grantsFeat: 'stand-still' },
    { level: 15, name: 'Protect the Meek', desc: 'Move to an endangered ally and attack as an immediate action.' },
  ],
  star: [
    { level: 2, name: 'Calling', desc: 'A short prayer grants you a competence bonus on your rolls for a time.' },
    { level: 8, name: 'For the Faith', desc: 'Invoke your deity to gain an attack bonus, sharing part of it with allies of your faith.' },
    { level: 15, name: 'Retribution', desc: 'When a foe strikes you or a nearby ally of your faith, answer with an attack of opportunity.' },
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

/** Shaman spirit abilities, keyed by spirit id — the fixed spirit ability (1st), greater (8th),
 *  true (16th), and manifestation (20th). Spirit hexes and spirit magic are handled separately. */
export const SHAMAN_SPIRIT_ABILITIES: Record<string, SourceFeature[]> = {
  battle: [
    { level: 1, name: 'Battle Spirit', desc: 'You and allies within 30 ft gain a morale bonus on attack and weapon damage rolls.' },
    { level: 8, name: "Enemies' Bane", desc: 'As a swift action, imbue a wielded weapon with the bane special ability for a few rounds.' },
    { level: 16, name: 'Paragon of Battle', desc: 'Become a juggernaut of war for a time, growing larger and deadlier as you fell foes.' },
    { level: 20, name: 'Manifestation', desc: 'You embody war — moving through full attacks, ignoring DR on crits, and clinging to life past mortal wounds.' },
  ],
  bones: [
    { level: 1, name: 'Touch of the Grave', desc: 'A melee touch deals negative energy damage to the living or heals undead.' },
    { level: 8, name: 'Shard Soul', desc: 'Gain damage reduction and burst jagged bone shards at foes around you.' },
    { level: 16, name: 'Shedding Form', desc: 'Become incorporeal, your attacks striking as though ghost touch.' },
    { level: 20, name: 'Manifestation', desc: 'You become a spirit of death — stabilizing automatically, animating the dead at will, and speaking words that kill.' },
  ],
  flame: [
    { level: 1, name: 'Touch of Flames', desc: 'A melee touch deals fire damage that scales with your level, later setting weapons alight.' },
    { level: 8, name: 'Fiery Soul', desc: 'Gain fire resistance and exhale a cone of flame a few times per day.' },
    { level: 16, name: 'Elemental Form', desc: 'Assume the form of a Huge fire elemental for a time.' },
    { level: 20, name: 'Manifestation', desc: 'You embody fire — nearly immune to it, and shaping your fire spells with free metamagic.' },
  ],
  heavens: [
    { level: 1, name: 'Stardust', desc: 'Wreathe a foe in stardust, penalizing its attacks and Perception and foiling concealment.' },
    { level: 8, name: 'Void Adaptation', desc: 'Gain greater darkvision, see in supernatural darkness, and no longer need to breathe.' },
    { level: 16, name: 'Phantasmagoric Display', desc: 'Cast prismatic wall and prismatic spray, each once per day.' },
    { level: 20, name: 'Manifestation', desc: 'You become a spirit of the heavens — fearless, hard to fell, and reborn as a star child if slain.' },
  ],
  life: [
    { level: 1, name: 'Channel', desc: 'Channel positive energy as a cleric of your shaman level.' },
    { level: 8, name: "Healer's Touch", desc: 'Bonuses to your healing, and stabilize several dying creatures at a touch.' },
    { level: 16, name: 'Quick Healing', desc: 'Channel energy or cast a cure spell as a swift action.' },
    { level: 20, name: 'Manifestation', desc: 'You become a font of life — immune to bleed, death effects, and negative energy.' },
  ],
  lore: [
    { level: 1, name: 'Monstrous Insight', desc: 'Identify a creature and gain a bonus on attacks and AC against it.' },
    { level: 8, name: 'Automatic Writing', desc: 'Once per day, meditate to produce an augury, divination, or commune.' },
    { level: 16, name: 'Perfect Knowledge', desc: 'Gain permanent tongues and large competence bonuses on Knowledge, Linguistics, and Spellcraft.' },
    { level: 20, name: 'Manifestation', desc: 'You become a spirit of lore — never failing a Knowledge check and casting wish once per day.' },
  ],
  nature: [
    { level: 1, name: 'Storm Burst', desc: 'Batter a foe with a burst of wind and rain, dealing nonlethal damage and hampering its attacks.' },
    { level: 8, name: 'Spirit of Nature', desc: 'When brought low you stabilize and gain fast healing for a few rounds.' },
    { level: 16, name: 'Companion Animal', desc: 'Your spirit animal becomes a full animal companion using your shaman level.' },
    { level: 20, name: 'Manifestation', desc: 'You become one with nature — cocooning to reshape your very body and creature type.' },
  ],
  stone: [
    { level: 1, name: 'Touch of Acid', desc: 'A melee touch deals acid damage that scales with your level, later making weapons corrosive.' },
    { level: 8, name: 'Body of Earth', desc: 'Gain damage reduction and burst stone shards at nearby foes.' },
    { level: 16, name: 'Elemental Form', desc: 'Assume the form of a Huge earth elemental for a time.' },
    { level: 20, name: 'Manifestation', desc: 'You embody earth and acid — resistant to acid and shaping earth spells with free metamagic.' },
  ],
  waves: [
    { level: 1, name: 'Wave Strike', desc: 'A melee touch deals nonlethal damage and shoves the target back.' },
    { level: 8, name: 'Fluid Mastery', desc: 'Gain a swim speed and water breathing, and loose a cone of freezing water.' },
    { level: 16, name: 'Elemental Form', desc: 'Assume the form of a Huge water elemental for a time.' },
    { level: 20, name: 'Manifestation', desc: 'You embody water — resistant to cold and shaping cold or water spells with free metamagic.' },
  ],
  wind: [
    { level: 1, name: 'Shocking Touch', desc: 'A melee touch deals electricity damage that scales with your level.' },
    { level: 8, name: 'Spark Soul', desc: 'Gain electricity resistance and loose a line of sparks a few times per day.' },
    { level: 16, name: 'Elemental Form', desc: 'Assume the form of a Huge air (lightning) elemental for a time.' },
    { level: 20, name: 'Manifestation', desc: 'You embody air and lightning — resistant to electricity and shaping air spells with free metamagic.' },
  ],
};

/** Oracle final revelations, keyed by mystery id — the fixed 20th-level capstone of each mystery.
 *  (The revelations chosen along the way are a separate per-mystery pick; see ORACLE_REVELATIONS.) */
export const ORACLE_FINAL_REVELATIONS: Record<string, SourceFeature[]> = {
  battle: [{ level: 20, name: 'Final Revelation', desc: 'Move your full speed during a full attack; your crits ignore DR, you gain AC against crits confirmed on you, and you cling to life well past 0 hp.' }],
  bones: [{ level: 20, name: 'Final Revelation', desc: 'Cast bleed or stabilize as a free action once per round (and auto-stabilize); animate dead at will and, once per day, power word kill a frail foe.' }],
  flame: [{ level: 20, name: 'Final Revelation', desc: 'Apply Enlarge, Extend, Silent, or Still Spell to any fire spell without raising its level or casting time.' }],
  heavens: [{ level: 20, name: 'Final Revelation', desc: 'A bonus on all saves equal to your Charisma modifier; auto-stabilize, immunity to fear, auto-confirmed crits, and rebirth as a star child if slain.' }],
  life: [{ level: 20, name: 'Final Revelation', desc: 'Immunity to bleed, death effects, exhaustion, fatigue, nausea, negative levels, and sickened; auto-succeed massive-damage saves and cling to life past 0 hp.' }],
  lore: [{ level: 20, name: 'Final Revelation', desc: 'Take 20 on every Knowledge check, and cast wish once per day without material components.' }],
  nature: [{ level: 20, name: 'Final Revelation', desc: 'Once per day, cocoon yourself and emerge with a new creature type — cleansed of poison and disease and fully healed.' }],
  stone: [{ level: 20, name: 'Final Revelation', desc: 'Apply Enlarge, Extend, Silent, or Still Spell to any acid or earth spell without raising its level or casting time.' }],
  waves: [{ level: 20, name: 'Final Revelation', desc: 'Apply Enlarge, Extend, Silent, or Still Spell to any cold or water spell without raising its level or casting time.' }],
  wind: [{ level: 20, name: 'Final Revelation', desc: 'Apply Enlarge, Extend, Silent, or Still Spell to any air or electricity spell without raising its level or casting time.' }],
};

/** Oracle curse effects, keyed by curse id — the drawback and its compensating benefits deepen at
 *  1st/5th/10th/15th. Each entry is named for the curse; the row's level says which benefit it is. */
export const ORACLE_CURSE_ABILITIES: Record<string, SourceFeature[]> = {
  'clouded-vision': [
    { level: 1, name: 'Clouded Vision', desc: 'You cannot see beyond 30 ft, but you gain darkvision to that range (even in magical darkness).' },
    { level: 5, name: 'Clouded Vision', desc: 'Your limited sight and darkvision extend to 60 ft.' },
    { level: 10, name: 'Clouded Vision', desc: 'Gain blindsense out to 30 ft.' },
    { level: 15, name: 'Clouded Vision', desc: 'Gain blindsight out to 15 ft.' },
  ],
  deaf: [
    { level: 1, name: 'Deaf', desc: 'You cannot hear (−4 initiative), but you cast all spells as though using Silent Spell, with no level increase.' },
    { level: 5, name: 'Deaf', desc: 'A competence bonus on sight-based Perception, and your initiative penalty eases to −2.' },
    { level: 10, name: 'Deaf', desc: 'Gain the scent ability, and no longer take an initiative penalty from deafness.' },
    { level: 15, name: 'Deaf', desc: 'Gain tremorsense out to 30 ft.' },
  ],
  haunted: [
    { level: 1, name: 'Haunted', desc: 'Spirits hinder your gear (retrieving stored items is slower, dropped items scatter), but you add mage hand and ghost sound to your spells known.' },
    { level: 5, name: 'Haunted', desc: 'Add levitate and minor image to your spells known.' },
    { level: 10, name: 'Haunted', desc: 'Add telekinesis to your spells known.' },
    { level: 15, name: 'Haunted', desc: 'Add reverse gravity to your spells known.' },
  ],
  lame: [
    { level: 1, name: 'Lame', desc: 'Your base speed is reduced by 10 ft, but it can never be further reduced by encumbrance.' },
    { level: 5, name: 'Lame', desc: 'You are immune to the fatigued condition.' },
    { level: 10, name: 'Lame', desc: 'Your speed is never reduced by armor.' },
    { level: 15, name: 'Lame', desc: 'You are immune to the exhausted condition.' },
  ],
  tongues: [
    { level: 1, name: 'Tongues', desc: 'In combat you can speak and understand only one chosen outsider/elemental language (which you also learn).' },
    { level: 5, name: 'Tongues', desc: 'Choose an additional language you can speak in combat.' },
    { level: 10, name: 'Tongues', desc: 'You understand any spoken language, even in combat.' },
    { level: 15, name: 'Tongues', desc: 'You can speak and understand any language (the combat speaking restriction still applies).' },
  ],
  wasting: [
    { level: 1, name: 'Wasting', desc: 'A −4 penalty on Charisma-based skill checks (except Intimidate), but a +4 bonus on saves against disease.' },
    { level: 5, name: 'Wasting', desc: 'You are immune to the sickened condition.' },
    { level: 10, name: 'Wasting', desc: 'You are immune to disease.' },
    { level: 15, name: 'Wasting', desc: 'You are immune to the nauseated condition.' },
  ],
};

/** Wizard arcane school powers, keyed by school id — the specialist powers a wizard gains (usually
 *  two at 1st and one at 6th/8th; universalist gets two). The bonus specialty spell slot is handled
 *  separately (CastingBlock.bonusSlot). */
export const SCHOOL_POWERS: Record<string, SourceFeature[]> = {
  abjuration: [
    { level: 1, name: 'Resistance', desc: 'Gain resistance to one energy type, scaling up to immunity at 20th.' },
    { level: 1, name: 'Protective Ward', desc: 'As a standard action, project an aura granting nearby allies a deflection bonus to AC.' },
    { level: 6, name: 'Energy Absorption', desc: 'A daily pool that soaks incoming energy damage.' },
  ],
  conjuration: [
    { level: 1, name: "Summoner's Charm", desc: 'Your summoning spells last extra rounds (summon monster becomes permanent at 20th).' },
    { level: 1, name: 'Acid Dart', desc: 'Loose a ranged touch dart of acid a few times per day.' },
    { level: 8, name: 'Dimensional Steps', desc: 'Teleport short distances each day, spent from a per-day pool of feet.' },
  ],
  divination: [
    { level: 1, name: 'Forewarned', desc: 'Always act in the surprise round, with a bonus to initiative.' },
    { level: 1, name: "Diviner's Fortune", desc: 'Touch a creature to grant it an insight bonus on its rolls for a round.' },
    { level: 8, name: 'Scrying Adept', desc: 'Always aware of scrying sensors, and your own scrying improves.' },
  ],
  enchantment: [
    { level: 1, name: 'Enchanting Smile', desc: 'A bonus on Bluff, Diplomacy, and Intimidate (and reflect enchantments at 20th).' },
    { level: 1, name: 'Dazing Touch', desc: 'A melee touch dazes a weaker living creature for a round.' },
    { level: 8, name: 'Aura of Despair', desc: "An aura penalizes nearby foes' rolls for rounds per day." },
  ],
  evocation: [
    { level: 1, name: 'Intense Spells', desc: 'Add half your wizard level to one target’s damage from your evocation spells.' },
    { level: 1, name: 'Force Missile', desc: 'Unleash a missile of force (as magic missile) a few times per day.' },
    { level: 8, name: 'Elemental Wall', desc: 'Create a wall of your chosen energy type each day.' },
  ],
  illusion: [
    { level: 1, name: 'Extended Illusions', desc: 'Your concentration illusions linger for extra rounds after you stop concentrating.' },
    { level: 1, name: 'Blinding Ray', desc: 'A ray that blinds or dazzles a foe a few times per day.' },
    { level: 8, name: 'Invisibility Field', desc: 'Turn invisible (as greater invisibility) as a swift action for rounds per day.' },
  ],
  necromancy: [
    { level: 1, name: 'Power over Undead', desc: 'Gain Command Undead or Turn Undead as a bonus feat.', grantsFeatChoice: ['command-undead', 'turn-undead'] },
    { level: 1, name: 'Grave Touch', desc: 'A melee touch leaves a living creature shaken, then frightened, a few times per day.' },
    { level: 8, name: 'Life Sight', desc: 'Blindsight that senses living and undead creatures for rounds per day.' },
  ],
  transmutation: [
    { level: 1, name: 'Physical Enhancement', desc: 'An enhancement bonus to one physical ability score, rising as you level.' },
    { level: 1, name: 'Telekinetic Fist', desc: 'Strike a foe within 30 ft with a telekinetic fist a few times per day.' },
    { level: 8, name: 'Change Shape', desc: 'Assume beast or elemental forms for a time each day.' },
  ],
  universalist: [
    { level: 1, name: 'Hand of the Apprentice', desc: 'Hurl your melee weapon at a foe as a ranged attack several times per day.' },
    { level: 8, name: 'Metamagic Mastery', desc: 'Apply a metamagic feat without increasing casting time a few times per day.' },
  ],
};

/** Shifter aspect abilities, keyed by the primary (major) aspect chosen at 1st level. The minor
 *  form benefit applies constantly from 1st; the major form applies while wild shaped (from 4th);
 *  both improve at 8th and 15th. Levels 1/4/8/15. Verified against the class table (Ultimate
 *  Wilderness). Our 'eagle' id uses the Falcon major form. */
export const SHIFTER_ASPECT_ABILITIES: Record<string, SourceFeature[]> = {
  bear: [
    { level: 1, name: 'Bear Aspect (Minor)', desc: '+2 enhancement bonus to Constitution.' },
    { level: 4, name: 'Bear Aspect (Major)', desc: 'While wild shaped: dire bear form — two claws (1d6), bite (1d8), 40 ft speed, low-light vision, scent 30 ft.' },
    { level: 8, name: 'Greater Bear Aspect', desc: 'Constitution bonus rises to +4; your claws gain Improved Natural Attack.' },
    { level: 15, name: 'True Bear Aspect', desc: 'Constitution bonus rises to +6; claw critical multiplier increases by one and you gain Awesome Blow.' },
  ],
  bull: [
    { level: 1, name: 'Bull Aspect (Minor)', desc: '+2 enhancement bonus to Strength.' },
    { level: 4, name: 'Bull Aspect (Major)', desc: 'While wild shaped: Large bull form — gore (1d8) with powerful charge (+1d8), 40 ft speed, low-light vision, scent 30 ft.' },
    { level: 8, name: 'Greater Bull Aspect', desc: 'Strength bonus rises to +4; you gain trample.' },
    { level: 15, name: 'True Bull Aspect', desc: 'Strength bonus rises to +6; gore damage increases to 2d8 and you gain Awesome Blow.' },
  ],
  eagle: [
    { level: 1, name: 'Falcon Aspect (Minor)', desc: '+4 competence bonus on Perception checks.' },
    { level: 4, name: 'Falcon Aspect (Major)', desc: 'While wild shaped: falcon form — bite (1d4), two claws (1d3), fly 60 ft (good), low-light vision, +4 racial bonus on vision-based Perception.' },
    { level: 8, name: 'Greater Falcon Aspect', desc: 'Perception bonus rises to +6; you gain darkvision 120 ft.' },
    { level: 15, name: 'True Falcon Aspect', desc: 'Perception bonus rises to +8; fly speed increases to 90 ft (perfect) and you gain blindsense 60 ft.' },
  ],
  frog: [
    { level: 1, name: 'Frog Aspect (Minor)', desc: '+4 competence bonus on Acrobatics checks to jump and on Swim checks.' },
    { level: 4, name: 'Frog Aspect (Major)', desc: 'While wild shaped: Large frog form — bite (1d6) with grab, swim 30 ft, low-light vision, scent 30 ft, treat all jumps as if you had a running start.' },
    { level: 8, name: 'Greater Frog Aspect', desc: 'Acrobatics/Swim bonus rises to +6; you gain a tongue attack with 15 ft reach.' },
    { level: 15, name: 'True Frog Aspect', desc: 'Acrobatics/Swim bonus rises to +8; swim speed increases to 60 ft and tongue reach to 30 ft.' },
  ],
  lion: [
    { level: 1, name: 'Lion Aspect (Minor)', desc: '+4 competence bonus on Intimidate checks.' },
    { level: 4, name: 'Lion Aspect (Major)', desc: 'While wild shaped: dire lion form — 40 ft speed, low-light vision, scent 30 ft; roar once per day per two shifter levels grants allies a +1 morale bonus on attack and damage rolls.' },
    { level: 8, name: 'Greater Lion Aspect', desc: 'Intimidate bonus rises to +6; gain a bonus teamwork feat you can grant allies as a swift action.' },
    { level: 15, name: 'True Lion Aspect', desc: 'Intimidate bonus rises to +8; you always count as flanking and can swap places with allies.' },
  ],
  monkey: [
    { level: 1, name: 'Monkey Aspect (Minor)', desc: '+4 competence bonus on Climb checks.' },
    { level: 4, name: 'Monkey Aspect (Major)', desc: 'While wild shaped: Large ape form — two claws (1d6), bite (1d6), climb 30 ft, low-light vision, scent 30 ft, and you retain the use of your hands.' },
    { level: 8, name: 'Greater Monkey Aspect', desc: 'Climb bonus rises to +6; climb speed increases to 50 ft and your tail can manipulate objects.' },
    { level: 15, name: 'True Monkey Aspect', desc: 'Climb bonus rises to +8; you gain a rend attack.' },
  ],
  snake: [
    { level: 1, name: 'Snake Aspect (Minor)', desc: '+2 bonus on attack rolls for attacks of opportunity and a +2 dodge bonus to AC against attacks of opportunity.' },
    { level: 4, name: 'Snake Aspect (Major)', desc: 'While wild shaped: emperor cobra form — bite (2d6), climb 30 ft, swim 30 ft, low-light vision, scent 30 ft, and Combat Reflexes.' },
    { level: 8, name: 'Greater Snake Aspect', desc: 'Opportunity bonuses rise to +4; gain +4 racial bonus on Acrobatics and Stealth.' },
    { level: 15, name: 'True Snake Aspect', desc: 'Opportunity bonuses rise to +6; your opportunity bites deliver a Constitution-damaging poison.' },
  ],
  stag: [
    { level: 1, name: 'Stag Aspect (Minor)', desc: '+5 ft enhancement bonus to your base speed.' },
    { level: 4, name: 'Stag Aspect (Major)', desc: 'While wild shaped: Large stag form — gore (1d6), two hooves (1d4), 50 ft speed, low-light vision, scent 30 ft.' },
    { level: 8, name: 'Greater Stag Aspect', desc: 'Speed bonus rises to +10 ft; gain +4 racial bonus on Acrobatics checks to jump.' },
    { level: 15, name: 'True Stag Aspect', desc: 'Speed bonus rises to +20 ft; you gain Awesome Blow and Improved Natural Attack with your gore.' },
  ],
  tiger: [
    { level: 1, name: 'Tiger Aspect (Minor)', desc: '+2 enhancement bonus to Dexterity.' },
    { level: 4, name: 'Tiger Aspect (Major)', desc: 'While wild shaped: dire tiger form — two claws (2d4), bite (2d6) with grab, 40 ft speed, low-light vision, scent 30 ft, and pounce.' },
    { level: 8, name: 'Greater Tiger Aspect', desc: 'Dexterity bonus rises to +4; gain +4 racial bonus on Stealth.' },
    { level: 15, name: 'True Tiger Aspect', desc: 'Dexterity bonus rises to +6; you gain a rake attack with your rear claws.' },
  ],
  wolf: [
    { level: 1, name: 'Wolf Aspect (Minor)', desc: 'Gain the scent ability with a range of 10 ft (or extend your existing scent).' },
    { level: 4, name: 'Wolf Aspect (Major)', desc: 'While wild shaped: dire wolf form — bite (1d8) with a trip attempt, 50 ft speed, low-light vision, scent 30 ft.' },
    { level: 8, name: 'Greater Wolf Aspect', desc: 'Scent range rises to 40 ft; gain +4 racial bonus on Survival to track by scent.' },
    { level: 15, name: 'True Wolf Aspect', desc: 'Scent range increases further; you gain Improved Natural Attack with your bite.' },
  ],
};

/** Witch patron bonus spells, keyed by patron id. A patron adds one spell to the witch's
 *  spell list at 2nd level and every two levels thereafter (levels 2/4/6/8/10/12/14/16/18),
 *  of spell level 1st through 9th respectively. Verified against the APG witch patron table
 *  (cross-checked d20pfsrd + Archives of Nethys). Some entries are off-Core spells (e.g.
 *  vortex, polar midnight) — they name the granted spell descriptively; they need not exist
 *  in the spell catalogue. */
const ORD9 = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
const patron = (...spells: string[]): SourceFeature[] =>
  spells.map((s, i) => ({
    level: 2 + i * 2,
    name: `Patron Spell (${ORD9[i]}): ${s}`,
    desc: `Your patron adds ${s} to your witch spell list.`,
  }));

export const WITCH_PATRON_SPELLS: Record<string, SourceFeature[]> = {
  agility: patron('Jump', "Cat's Grace", 'Haste', 'Freedom of Movement', 'Polymorph', "Mass Cat's Grace", 'Ethereal Jaunt', 'Animal Shapes', 'Shapechange'),
  animals: patron('Charm Animal', 'Speak with Animals', 'Dominate Animal', "Summon Nature's Ally IV", 'Animal Growth', 'Antilife Shell', 'Beast Shape IV', 'Animal Shapes', "Summon Nature's Ally IX"),
  deception: patron('Ventriloquism', 'Invisibility', 'Blink', 'Confusion', 'Passwall', 'Programmed Image', 'Mass Invisibility', 'Scintillating Pattern', 'Time Stop'),
  elements: patron('Shocking Grasp', 'Flaming Sphere', 'Fireball', 'Wall of Ice', 'Flame Strike', 'Freezing Sphere', 'Vortex', 'Fire Storm', 'Meteor Swarm'),
  endurance: patron('Endure Elements', "Bear's Endurance", 'Protection from Energy', 'Spell Immunity', 'Spell Resistance', "Mass Bear's Endurance", 'Greater Restoration', 'Iron Body', 'Miracle'),
  healing: patron('Remove Fear', 'Lesser Restoration', 'Remove Disease', 'Restoration', 'Cleanse', 'Pillar of Life', 'Greater Restoration', 'Mass Cure Critical Wounds', 'True Resurrection'),
  plague: patron('Detect Undead', 'Command Undead', 'Contagion', 'Animate Dead', 'Giant Vermin', 'Create Undead', 'Control Undead', 'Create Greater Undead', 'Energy Drain'),
  shadow: patron('Silent Image', 'Darkness', 'Deeper Darkness', 'Shadow Conjuration', 'Shadow Evocation', 'Shadow Walk', 'Greater Shadow Conjuration', 'Greater Shadow Evocation', 'Shades'),
  strength: patron('Divine Favor', "Bull's Strength", 'Greater Magic Weapon', 'Divine Power', 'Righteous Might', "Mass Bull's Strength", 'Giant Form I', 'Giant Form II', 'Shapechange'),
  winter: patron('Unshakable Chill', 'Resist Energy', 'Ice Storm', 'Wall of Ice', 'Cone of Cold', 'Freezing Sphere', 'Control Weather', 'Polar Ray', 'Polar Midnight'),
};

/** Sorcerer bloodline arcana + bonus spells, keyed by bloodline id. The arcana (a passive) is
 *  gained at 1st level; the nine bonus spells are added to spells known at 3rd level and every two
 *  levels thereafter (3/5/7/9/11/13/15/17/19), of spell level 1st–9th. Verified against the CRB
 *  bloodline entries (d20pfsrd). The level-1 bloodline *power* is authored separately in
 *  SORCERER_BLOODLINE_POWERS; both surface together at 1st level. */
const ORDSP = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
const sorcBloodline = (arcana: string, ...spells: string[]): SourceFeature[] => [
  { level: 1, name: 'Bloodline Arcana', desc: arcana },
  ...spells.map((s, i) => ({ level: 3 + i * 2, name: `Bonus Spell (${ORDSP[i]}): ${s}`, desc: `Your bloodline adds ${s} to your spells known.` })),
];

export const SORCERER_BLOODLINE_SPELLS: Record<string, SourceFeature[]> = {
  draconic: sorcBloodline(
    "Whenever you cast a spell that deals energy damage of your bloodline's energy type, it deals +1 point of damage per die.",
    'Mage Armor', 'Resist Energy', 'Fly', 'Fear', 'Spell Resistance', 'Form of the Dragon I', 'Form of the Dragon II', 'Form of the Dragon III', 'Wish'),
  arcane: sorcBloodline(
    "Whenever you apply a metamagic feat that increases the spell's slot by at least one level, that spell's save DC increases by +1.",
    'Identify', 'Invisibility', 'Dispel Magic', 'Dimension Door', 'Overland Flight', 'True Seeing', 'Greater Teleport', 'Power Word Stun', 'Wish'),
  celestial: sorcBloodline(
    'Whenever you cast a summoning spell, the summoned creatures gain DR/evil equal to half your sorcerer level (minimum 1).',
    'Bless', 'Resist Energy', 'Magic Circle against Evil', 'Remove Curse', 'Flame Strike', 'Greater Dispel Magic', 'Banishment', 'Sunburst', 'Gate'),
  infernal: sorcBloodline(
    "Whenever you cast a spell of the charm subschool, increase the spell's save DC by +2.",
    'Protection from Good', 'Scorching Ray', 'Suggestion', 'Charm Monster', 'Dominate Person', 'Planar Binding', 'Greater Teleport', 'Power Word Stun', 'Meteor Swarm'),
  abyssal: sorcBloodline(
    'Whenever you cast a summoning spell, the summoned creatures gain DR/good equal to half your sorcerer level (minimum 1).',
    'Cause Fear', "Bull's Strength", 'Rage', 'Stoneskin', 'Dismissal', 'Transformation', 'Greater Teleport', 'Unholy Aura', 'Summon Monster IX'),
  fey: sorcBloodline(
    "Whenever you cast a spell of the compulsion subschool, increase the spell's save DC by +2.",
    'Entangle', 'Hideous Laughter', 'Deep Slumber', 'Poison', 'Tree Stride', 'Mislead', 'Phase Door', 'Irresistible Dance', 'Shapechange'),
};

/** Bloodrager bloodline bonus spells, keyed by bloodline id. A bloodrager adds four spells to
 *  spells known at 7th/10th/13th/16th level (spell level 1st–4th). Bloodrager bloodlines have NO
 *  bloodline arcana (only sorcerers do) — verified against the ACG bloodrager (d20pfsrd). Bloodline
 *  powers are authored separately in BLOODRAGER_BLOODLINE_POWERS. */
const BR_SPELL_LEVELS = [7, 10, 13, 16];
const brBloodline = (...spells: string[]): SourceFeature[] =>
  spells.map((s, i) => ({ level: BR_SPELL_LEVELS[i], name: `Bonus Spell (${ORDSP[i]}): ${s}`, desc: `Your bloodline adds ${s} to your spells known.` }));

export const BLOODRAGER_BLOODLINE_SPELLS: Record<string, SourceFeature[]> = {
  aberrant: brBloodline('Enlarge Person', 'See Invisibility', 'Displacement', 'Black Tentacles'),
  abyssal: brBloodline('Ray of Enfeeblement', "Bull's Strength", 'Rage', 'Stoneskin'),
  arcane: brBloodline('Magic Missile', 'Invisibility', 'Lightning Bolt', 'Dimension Door'),
  celestial: brBloodline('Bless', 'Resist Energy', 'Heroism', 'Holy Smite'),
  destined: brBloodline('Shield', 'Blur', 'Protection from Energy', 'Freedom of Movement'),
  draconic: brBloodline('Shield', 'Resist Energy', 'Fly', 'Fear'),
  elemental: brBloodline('Burning Hands', 'Scorching Ray', 'Protection from Energy', 'Elemental Body I'),
  fey: brBloodline('Entangle', 'Hideous Laughter', 'Haste', 'Confusion'),
  infernal: brBloodline('Protection from Good', 'Scorching Ray', 'Suggestion', 'Fire Shield'),
  undead: brBloodline('Chill Touch', 'False Life', 'Vampiric Touch', 'Enervation'),
};
