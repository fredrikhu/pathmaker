// Class archetypes (proof-of-concept scope: Fighter). Each archetype removes a set of the base
// class's features (`replaces`, by feature id) and grants alternates at set levels. Feature names,
// levels and the features they replace are verified against each archetype's d20pfsrd page;
// descriptions are paraphrased. Our fighter feature model treats Armor Training and Weapon Training
// as single features (ids fighter-armor-training / fighter-weapon-training), so an archetype that
// replaces "Armor Training 1–4" replaces that one id and grants its own abilities in their place.

import type { ArchetypeDef, LeveledFeatureDef } from './model';
import { ROGUE_TALENTS, ROGUE_ADVANCED_TALENTS, MAGUS_ARCANA, WITCH_HEXES, ARCANIST_EXPLOITS, BARBARIAN_RAGE_POWERS, SLAYER_TALENTS, SHAMAN_HEXES } from './subsystems';

const g = (level: number, id: string, name: string, desc: string): LeveledFeatureDef => ({ level, id, name, desc });

export const FIGHTER_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'two-handed-fighter', classId: 'fighter', name: 'Two-Handed Fighter',
    desc: 'Masters of massive two-handed weapons — trading armor training for brutal, Strength-driven strikes.',
    replaces: ['fighter-bravery', 'fighter-armor-training', 'fighter-weapon-training', 'fighter-armor-mastery'],
    grants: [
      g(2, 'thf-shattering-strike', 'Shattering Strike', '+1 to CMB/CMD on sunder and to damage rolls vs objects, +1 per four levels beyond 2nd. Replaces Bravery.'),
      g(3, 'thf-overhand-chop', 'Overhand Chop', 'On a single attack (attack action or charge) with a two-handed weapon, add double your Strength bonus on damage. Replaces Armor Training 1.'),
      g(5, 'thf-weapon-training', 'Weapon Training (two-handed)', 'As the fighter Weapon Training feature, but the bonuses apply only with two-handed melee weapons. Replaces Weapon Training 1–4.'),
      g(7, 'thf-backswing', 'Backswing', 'On a full attack with a two-handed weapon, add double your Strength bonus on damage for every attack after the first. Replaces Armor Training 2.'),
      g(11, 'thf-piledriver', 'Piledriver', 'As a standard action, a single two-handed melee attack; on a hit you may bull rush or trip the target as a free action that does not provoke. Replaces Armor Training 3.'),
      g(15, 'thf-greater-power-attack', 'Greater Power Attack', 'Power Attack with a two-handed melee weapon doubles its bonus damage (+100% instead of +50%). Replaces Armor Training 4.'),
      g(19, 'thf-devastating-blow', 'Devastating Blow', 'As a standard action, a single two-handed melee attack at −5 that is treated as a critical threat (on-crit weapon abilities do not trigger). Replaces Armor Mastery.'),
    ],
  },
  {
    id: 'weapon-master', classId: 'fighter', name: 'Weapon Master',
    desc: 'Devoted to a single chosen weapon — perfect technique in place of broad armor training.',
    replaces: ['fighter-bravery', 'fighter-armor-training', 'fighter-weapon-training', 'fighter-armor-mastery'],
    grants: [
      g(2, 'wm-weapon-guard', 'Weapon Guard', '+1 to CMD vs disarm/sunder and to saves against effects that target your chosen weapon, +1 per four levels beyond 2nd. Replaces Bravery.'),
      g(3, 'wm-weapon-training', 'Weapon Training (chosen weapon)', '+1 on attack and damage rolls with your chosen weapon, +1 per four levels beyond 3rd. Replaces Armor Training 1–4.'),
      g(5, 'wm-reliable-strike', 'Reliable Strike', 'As an immediate action, reroll an attack, crit-confirmation, miss-chance, or damage roll (you must keep the second result); 1/day at 5th, +1/day per five levels beyond. Replaces Weapon Training 1.'),
      g(9, 'wm-mirror-move', 'Mirror Move', 'Gain your Weapon Training bonus as an insight bonus to AC when attacked by your chosen weapon. Replaces Weapon Training 2.'),
      g(13, 'wm-deadly-critical', 'Deadly Critical', 'On a confirmed critical hit with your chosen weapon, increase its damage multiplier by +1 (immediate action); 1/day at 13th, +1/day per three levels beyond. Replaces Weapon Training 3.'),
      g(17, 'wm-critical-specialist', 'Critical Specialist', '+4 to the save DCs of any effects caused by a critical hit with your chosen weapon. Replaces Weapon Training 4.'),
      g(19, 'wm-unstoppable-strike', 'Unstoppable Strike', 'As a standard action, make one attack with your chosen weapon as a touch attack that ignores DR (or hardness when attacking an object). Replaces Armor Mastery.'),
    ],
  },
];

export const RANGER_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'skirmisher', classId: 'ranger', name: 'Skirmisher',
    desc: 'A ranger who forgoes spellcasting entirely, relying on wits and instinct — trading spells for hunter’s tricks.',
    replaces: [],
    spellcasting: null, // a skirmisher has no spells
    grants: [
      g(5, 'skirmisher-hunters-tricks', 'Hunter’s Tricks', 'Learns a hunter’s trick at 5th level and another at 7th and every two levels after; usable a number of times per day equal to 1/2 the ranger’s level + Wisdom modifier. Replaces the ranger’s spellcasting.'),
    ],
  },
  {
    id: 'trapper', classId: 'ranger', name: 'Trapper',
    desc: 'A ranger who forsakes spells for the cunning of the snare — turning the wilderness itself into a weapon.',
    replaces: ['ranger-spells'],
    spellcasting: null, // a trapper has no spells
    grants: [
      g(1, 'trapper-trapfinding', 'Trapfinding', 'Add half your ranger level to Perception to find traps and to Disable Device, and you can disarm magical traps.'),
      g(5, 'trapper-trap', 'Ranger Traps', 'Learn to craft a snare trap and one other ranger trap at 5th level, and another trap every two levels thereafter. Replaces spellcasting.'),
    ],
  },
];

export const ROGUE_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'thug', classId: 'rogue', name: 'Thug',
    desc: 'A brute who gets what she wants through threat and violence rather than finesse.',
    replaces: ['rogue-trapfinding', 'rogue-trap-sense'],
    grants: [
      g(1, 'thug-frightening', 'Frightening', 'A successful Intimidate to demoralize lasts 1 round longer; if the target ends up shaken for 4+ rounds, you may instead make it frightened for 1 round. Replaces Trapfinding.'),
      g(3, 'thug-brutal-beating', 'Brutal Beating', 'When you deal sneak attack damage you may forgo 1d6 of it to sicken the target for a number of rounds equal to 1/2 your rogue level (does not stack). Replaces Trap Sense.'),
    ],
  },
  {
    id: 'acrobat', classId: 'rogue', name: 'Acrobat',
    desc: 'A daring tumbler and climber who trades trap-sense for agility.',
    replaces: ['rogue-trapfinding', 'rogue-trap-sense'],
    grants: [
      g(1, 'acrobat-expert-acrobat', 'Expert Acrobat', 'No armor check penalty on Acrobatics, Climb, Fly, Sleight of Hand, or Stealth while in light armor; +2 competence on Acrobatics and Fly when unarmored. Replaces Trapfinding.'),
      g(3, 'acrobat-second-chance', 'Second Chance', 'Reroll an Acrobatics, Climb, or Fly check at −5, keeping the second result; usable 1/day at 3rd, +1/day per three levels beyond. Replaces Trap Sense.'),
    ],
  },
];

export const BARBARIAN_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'invulnerable-rager', classId: 'barbarian', name: 'Invulnerable Rager',
    desc: 'A barbarian who shrugs off mortal wounds, turning raw punishment into fuel for her rage.',
    replaces: ['barb-uncanny-dodge', 'barb-improved-uncanny-dodge', 'barb-dr', 'barb-trap-sense'],
    grants: [
      g(2, 'ir-invulnerability', 'Invulnerability', 'DR/— equal to half your barbarian level, doubled against nonlethal damage. Replaces Uncanny Dodge, Improved Uncanny Dodge, and Damage Reduction.'),
      g(3, 'ir-extreme-endurance', 'Extreme Endurance', 'Inured to a hot or cold climate (choose one) as endure elements, plus 1 point of fire or cold resistance for every three levels beyond 3rd. Replaces Trap Sense.'),
    ],
  },
  {
    id: 'mounted-fury', classId: 'barbarian', name: 'Mounted Fury',
    desc: 'A barbarian who rages from the saddle — one being with a savage mount, thundering across the field.',
    replaces: ['barb-fast-movement', 'barb-uncanny-dodge', 'barb-improved-uncanny-dodge'],
    grants: [
      g(1, 'mf-fast-rider', 'Fast Rider', '+10 feet to the speed of any mount you ride. Replaces fast movement.'),
      g(5, 'mf-bestial-mount', 'Bestial Mount', 'Gain a feral mount as an animal companion (druid level = barbarian level − 4); while you rage mounted on it, it gains a +2 morale bonus to Strength. Replaces uncanny dodge and improved uncanny dodge.'),
    ],
  },
];

export const PALADIN_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'warrior-of-the-holy-light', classId: 'paladin', name: 'Warrior of the Holy Light',
    desc: 'A paladin who forgoes spellcasting to channel her faith into radiant light and greater healing.',
    replaces: ['paladin-spells'],
    spellcasting: null, // no spells, no caster level
    grants: [
      g(4, 'wohl-power-of-faith', 'Power of Faith', 'You gain no spells or caster level. Instead you gain one extra use of Lay on Hands per day (and another per four levels beyond 4th); spend one as a standard action to raise a 30-ft nimbus of light that grants you and nearby allies a +1 morale bonus to AC and on attack rolls, damage rolls, and saves vs fear for 1 minute (adds healing at 8th, daylight + energy resistance 10 at 12th, crit protection at 16th, and a larger, stronger nimbus at 20th). Replaces the paladin’s spellcasting.'),
    ],
  },
  {
    id: 'divine-hunter', classId: 'paladin', name: 'Divine Hunter',
    desc: 'A paladin who smites from afar — sanctifying the bow and sharing the blessing of a true aim with allies.',
    replaces: ['paladin-aura-courage', 'paladin-aura-resolve', 'paladin-aura-justice', 'paladin-aura-faith'],
    // Trades heavy armor for a focus on ranged combat.
    proficiencies: { armor: { remove: ['heavy'] } },
    grants: [
      g(1, 'dh-precise-shot', 'Precise Shot', 'Gain Precise Shot as a bonus feat. Replaces heavy armor proficiency.'),
      g(3, 'dh-shared-precision', 'Shared Precision', 'Grant allies within 10 feet the benefit of your Precise Shot for a number of rounds per day. Replaces aura of courage.'),
      g(8, 'dh-aura-of-care', 'Aura of Care', 'Your lay on hands and mercies can reach a target at range. Replaces aura of resolve.'),
      g(11, 'dh-hunters-blessing', 'Hunter’s Blessing', 'Grant an ally the use of your smite evil against a target at range. Replaces aura of justice.'),
      g(14, 'dh-righteous-hunter', 'Righteous Hunter', 'Your ranged smite ignores damage reduction and pierces defenses. Replaces aura of faith.'),
    ],
  },
];

export const BARD_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'archaeologist', classId: 'bard', name: 'Archaeologist',
    desc: 'A field researcher who forgoes bardic performance for fortune’s favor and a smattering of rogue talents.',
    // Loses bardic performance and all its performance types, plus versatile performance and well-versed.
    replaces: [
      'bard-performance', 'bard-countersong', 'bard-inspire-competence', 'bard-suggestion', 'bard-dirge-of-doom',
      'bard-inspire-greatness', 'bard-soothing-performance', 'bard-frightening-tune', 'bard-inspire-heroics',
      'bard-mass-suggestion', 'bard-deadly-performance', 'bard-versatile-performance', 'bard-well-versed',
    ],
    grants: [
      g(1, 'arch-luck', 'Archaeologist’s Luck', 'As a swift action, gain a +1 luck bonus on attack rolls, saves, skill checks, and weapon damage rolls for a number of rounds/day equal to 4 + your Charisma modifier (free action to maintain). Improves to +2 at 5th, +3 at 11th, +4 at 17th. Treated as bardic performance. Replaces Bardic Performance.'),
      g(2, 'arch-clever-explorer', 'Clever Explorer', 'A bonus equal to half your class level on Disable Device and Perception; disable devices in half the time and open locks as a standard action; at 6th you can take 10 on Disable Device even when threatened and can disarm magical traps. Replaces Versatile Performance.'),
      g(2, 'arch-uncanny-dodge', 'Uncanny Dodge', 'As the rogue class feature. Replaces Well-Versed.'),
      g(3, 'arch-trap-sense', 'Trap Sense +1', 'As the rogue class feature — +1 at 3rd, improving by +1 for every three levels beyond (max +6 at 18th).'),
      g(6, 'arch-evasion', 'Evasion', 'As the rogue ability.'),
    ],
    // Rogue talents at 4th and every four levels after (advanced talents eligible at 10th+).
    choices: {
      add: [
        { id: 'archaeologist-talent', label: 'Rogue talent', kind: 'list', count: 1, levels: [4, 8], options: ROGUE_TALENTS },
        { id: 'archaeologist-adv-talent', label: 'Rogue talent (advanced eligible)', kind: 'list', count: 1, levels: [12, 16, 20], options: [...ROGUE_TALENTS, ...ROGUE_ADVANCED_TALENTS] },
      ],
    },
  },
  {
    id: 'arcane-duelist', classId: 'bard', name: 'Arcane Duelist',
    desc: 'A bard who fights as a martial spellblade — weaving combat feats and enchanted steel into every performance.',
    replaces: ['bard-knowledge', 'bard-countersong', 'bard-versatile-performance', 'bard-well-versed', 'bard-lore-master', 'bard-suggestion', 'bard-mass-suggestion'],
    grants: [
      g(1, 'ad-arcane-strike', 'Arcane Strike', 'Gain Arcane Strike as a bonus feat. Replaces bardic knowledge.'),
      g(1, 'ad-rallying-cry', 'Rallying Cry', 'A performance that lets allies use your save bonus against fear and reroll a failed save each round. Replaces countersong.'),
      g(2, 'ad-combat-casting', 'Combat Casting', 'Gain Combat Casting as a bonus feat. Replaces versatile performance and well-versed.'),
      g(5, 'ad-arcane-bond', 'Arcane Bond', 'Gain an arcane bond with a bonded object, as a wizard. Replaces lore master.'),
      g(6, 'ad-bladethirst', 'Bladethirst', 'A performance that grants an ally’s weapon a scaling enhancement bonus. Replaces suggestion.'),
      g(18, 'ad-mass-bladethirst', 'Mass Bladethirst', 'Bladethirst empowers the weapons of many allies at once. Replaces mass suggestion.'),
    ],
  },
];

export const ALCHEMIST_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'vivisectionist', classId: 'alchemist', name: 'Vivisectionist',
    desc: 'A grim experimenter who studies living bodies — trading bombs for a surgeon’s deadly precision.',
    replaces: ['alch-bomb'],
    grants: [
      g(1, 'vivi-sneak-attack', 'Sneak Attack +1d6', 'Gain sneak attack as a rogue of the same level; levels from other sneak-attack classes stack. Replaces Bomb.'),
      g(2, 'vivi-torturers-eye', 'Torturer’s Eye', 'Add deathwatch to your formula book as a 1st-level extract.'),
      g(3, 'vivi-cruel-anatomist', 'Cruel Anatomist', 'Use your Knowledge (nature) skill bonus in place of your Heal skill bonus.'),
      g(7, 'vivi-torturous-transformation', 'Torturous Transformation', 'Add anthropomorphic animal (2nd), then awaken and baleful polymorph (3rd, at 9th) and regenerate (5th, at 15th) to your formula book, used through lengthy surgical procedures.'),
    ],
  },
  {
    id: 'grenadier', classId: 'alchemist', name: 'Grenadier',
    desc: 'An alchemist who weaponizes everything — coating blades in acid and fire and placing every bomb with a marksman’s care.',
    replaces: ['alch-brew-potion', 'alch-poison-resistance', 'alch-poison-use', 'alch-swift-poisoning'],
    proficiencies: { weapons: { add: ['martial'] } },
    grants: [
      g(1, 'gren-martial-proficiency', 'Martial Weapon Proficiency', 'Gain proficiency with all martial weapons. Replaces Brew Potion.'),
      g(2, 'gren-alchemical-weapon', 'Alchemical Weapon', 'As a swift action, apply an alchemical liquid or powder (acid, alchemist’s fire, etc.) to a weapon so its next hit deals that item’s damage. Replaces poison resistance.'),
      g(2, 'gren-precise-bombs', 'Precise Bombs', 'Exclude a number of squares equal to your Intelligence modifier from your bombs’ splash. Replaces poison use.'),
      g(6, 'gren-directed-blast', 'Directed Blast', 'Throw a bomb that splashes in a 20-foot cone or line instead of a radius. Replaces swift poisoning.'),
      g(10, 'gren-staggering-blast', 'Staggering Blast', 'A bomb that scores a critical threat can leave the target staggered. Replaces poison immunity.'),
    ],
  },
];

export const MAGUS_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'bladebound', classId: 'magus', name: 'Bladebound',
    desc: 'A magus bonded to a sentient black blade — an intelligent weapon that shares (and covets) his arcane power.',
    replaces: ['magus-arcane-pool'],
    grants: [
      g(1, 'bladebound-arcane-pool', 'Arcane Pool (black blade)', 'Your arcane pool holds points equal to 1/3 your magus level (minimum 1) + your Intelligence bonus, rather than the standard 1/2 level + Int. Changes the Arcane Pool feature.'),
      g(3, 'bladebound-black-blade', 'Black Blade', 'You bond with a sentient black blade of a chosen weapon type — an intelligent partner whose Intelligence, Wisdom, Charisma, and ego rise as you level, with its own arcane pool and powers. You cannot take the familiar magus arcana or have a familiar of any kind. Replaces the 3rd-level magus arcana.'),
    ],
    // The 3rd-level arcana pick becomes the black blade; the rest remain.
    choices: {
      remove: ['magus-arcana'],
      add: [{ id: 'magus-arcana', label: 'Magus arcana', kind: 'list', count: 1, levels: [6, 9, 12, 15, 18], options: MAGUS_ARCANA }],
    },
  },
  {
    id: 'hexcrafter', classId: 'magus', name: 'Hexcrafter',
    desc: 'A magus who bends his arcane pool toward witchcraft — hexing foes and cursing those he strikes.',
    replaces: ['magus-spell-recall'], // Hex Magus replaces spell recall at 4th
    grants: [
      g(1, 'hexcrafter-accursed-strike', 'Accursed Strike', 'You add bestow curse, major curse, and other curse-descriptor spells of 6th level or lower to your magus spell list, and can deliver such spells through Spellstrike even when they are not touch attack spells.'),
    ],
    // Hexes may be taken in place of a magus arcana, plus a dedicated Hex Magus pick at 4th.
    choices: {
      remove: ['magus-arcana'],
      add: [
        { id: 'magus-arcana', label: 'Magus arcana or hex', kind: 'list', count: 1, levels: [3, 6, 9, 12, 15, 18], options: [...MAGUS_ARCANA, ...WITCH_HEXES] },
        { id: 'hexcrafter-hex-magus', label: 'Hex Magus (witch hex)', kind: 'list', count: 1, levels: [4], options: WITCH_HEXES },
      ],
    },
  },
  {
    id: 'kensai', classId: 'magus', name: 'Kensai',
    desc: 'A weapon master who forgoes armor and half his spellcasting to perfect a single blade, defending with wit and intellect.',
    // Diminished Spellcasting: keeps magus casting but one fewer slot of each level per day.
    spellcastingMod: { diminished: true },
    // No armor at all (loses light-armor proficiency); weapon focus on one chosen weapon (the
    // "one martial or exotic weapon" choice itself is not modelled — proficiency stays simple+martial).
    proficiencies: { armor: { remove: ['light'] } },
    replaces: [
      'magus-spell-recall',      // → Perfect Strike (4th)
      'magus-knowledge-pool',    // → Fighter Training (7th)
      'magus-medium-armor',      // → Iaijutsu (7th)
      'magus-improved-spell-recall', // → Superior Reflexes (11th)
      'magus-heavy-armor',       // → Iaijutsu Focus (13th)
      'magus-greater-spell-access', // → Iaijutsu Master (19th)
      'magus-true-magus',        // → Weapon Mastery (20th)
    ],
    grants: [
      g(1, 'kensai-canny-defense', 'Canny Defense', 'While wielding your chosen weapon and unarmored, add your Intelligence bonus (max your kensai level) to AC as a dodge bonus, as the duelist ability.'),
      g(1, 'kensai-weapon-focus', 'Weapon Focus', 'Gain Weapon Focus as a bonus feat with your chosen weapon.'),
      g(4, 'kensai-perfect-strike', 'Perfect Strike', 'Spend 1 arcane pool point to maximize your chosen weapon’s damage on a hit; spend 2 on a critical to raise its multiplier by 1. Replaces spell recall.'),
      g(7, 'kensai-fighter-training', 'Fighter Training', 'Count your magus level − 3 as your fighter level for feat prerequisites, but only with your chosen weapon. Replaces knowledge pool.'),
      g(7, 'kensai-iaijutsu', 'Iaijutsu', 'Add your Intelligence modifier to initiative, make attacks of opportunity while flat-footed, and draw your weapon as a free action when making one. Replaces medium armor.'),
      g(9, 'kensai-critical-perfection', 'Critical Perfection', 'Add your Intelligence bonus to critical confirmation rolls with your chosen weapon, and use your magus level as your BAB for Critical Focus feat prerequisites. Replaces the 9th-level magus arcana.'),
      g(11, 'kensai-superior-reflexes', 'Superior Reflexes', 'You may make a number of attacks of opportunity per round equal to your Intelligence modifier (minimum 1); this stacks with Combat Reflexes. Replaces improved spell recall.'),
      g(13, 'kensai-iaijutsu-focus', 'Iaijutsu Focus', 'You always act in the surprise round, draw your weapon as a swift action, and add your Intelligence modifier to damage against flat-footed foes. Replaces heavy armor.'),
      g(19, 'kensai-iaijutsu-master', 'Iaijutsu Master', 'Treat your initiative roll as a natural 20 and you can never be surprised. Replaces greater spell access.'),
      g(20, 'kensai-weapon-mastery', 'Weapon Mastery', 'Gain the fighter’s weapon mastery with your chosen weapon (automatic confirm, +1 damage multiplier on crits, no disarm). Replaces true magus.'),
    ],
    // Critical Perfection replaces the 9th-level magus arcana; the other arcana picks remain.
    choices: {
      remove: ['magus-arcana'],
      add: [{ id: 'magus-arcana', label: 'Magus arcana', kind: 'list', count: 1, levels: [3, 6, 12, 15, 18], options: MAGUS_ARCANA }],
    },
  },
];

export const MONK_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'master-of-many-styles', classId: 'monk', name: 'Master of Many Styles',
    desc: 'A collector of fighting styles who fuses several stances at once, seeking a counter for every move.',
    // Monk bonus feats stay at the same levels (1/2/6/10/14/18); the archetype only narrows them to
    // style feats — a list restriction the engine doesn't enforce, so the slots are left untouched.
    replaces: ['monk-flurry', 'monk-perfect-self'],
    grants: [
      g(1, 'moms-fuse-style', 'Fuse Style', 'Maintain the stances of two style feats at once, switching between them as a swift action. Your monk bonus feats must be style feats or Elemental Fist, taken without meeting their prerequisites (except Elemental Fist). Replaces flurry of blows.'),
      g(8, 'moms-fuse-style-improved', 'Improved Fuse Style', 'Maintain three style stances at once and gain a bonus on attack rolls equal to the number of active stances.'),
      g(15, 'moms-fuse-style-greater', 'Greater Fuse Style', 'Maintain four style stances at once and enter up to four as a free action by spending 1 ki point.'),
      g(20, 'moms-perfect-style', 'Perfect Style', 'Maintain the stances of five style feats at once, changing them as a free action. Replaces perfect self.'),
    ],
  },
  {
    id: 'zen-archer', classId: 'monk', name: 'Zen Archer',
    desc: 'A monk who makes the bow an extension of the self — flurrying arrows and guiding each shot with serene focus.',
    // Bonus feats remain at the monk's levels but are drawn from a ranged-combat list (not modelled).
    replaces: [
      'monk-flurry',            // → Flurry of Blows (bows)
      'monk-stunning-fist',     // → Perfect Strike
      'monk-evasion',           // → Way of the Bow
      'monk-maneuver-training', // → Zen Archery
      'monk-still-mind',        // → Point Blank Master
      'monk-purity-of-body',    // → Ki Arrows
      'monk-improved-evasion',  // → Reflexive Shot
      'monk-diamond-body',      // → Trick Shot
      'monk-tongue',            // → Ki Focus Bow
    ],
    grants: [
      g(1, 'zen-flurry', 'Flurry of Blows (bows)', 'Use flurry of blows with any bow, making the additional attacks as ranged attacks. Replaces flurry of blows.'),
      g(1, 'zen-perfect-strike', 'Perfect Strike', 'Gain Perfect Strike as a bonus feat: spend ki to roll a bow attack twice and take the higher result. Replaces Stunning Fist.'),
      g(2, 'zen-way-of-the-bow', 'Way of the Bow', 'Gain Weapon Focus with one type of bow at 2nd level and Weapon Specialization with it at 6th. Replaces evasion.'),
      g(3, 'zen-zen-archery', 'Zen Archery', 'Use your Wisdom modifier instead of your Dexterity modifier on ranged attack rolls with a bow. Replaces maneuver training.'),
      g(3, 'zen-point-blank-master', 'Point Blank Master', 'Gain Point Blank Master with your chosen bow, so firing it provokes no attacks of opportunity. Replaces still mind.'),
      g(5, 'zen-ki-arrows', 'Ki Arrows', 'Spend ki to increase your bow’s damage dice to those of your monk unarmed strike. Replaces purity of body.'),
      g(9, 'zen-reflexive-shot', 'Reflexive Shot', 'Make attacks of opportunity with your bow. Replaces improved evasion.'),
      g(11, 'zen-trick-shot', 'Trick Shot', 'Spend ki to make ranged trick shots — disarm, feint, and similar maneuvers with your bow. Replaces diamond body.'),
      g(17, 'zen-ki-focus-bow', 'Ki Focus Bow', 'Treat your bow as a ki focus weapon, delivering your ki-powered abilities through its arrows. Replaces tongue of the sun and moon.'),
    ],
  },
  {
    id: 'sensei', classId: 'monk', name: 'Sensei',
    desc: 'A monastic mentor who leads from insight — inspiring allies and striking with wisdom rather than raw force.',
    replaces: ['monk-flurry', 'monk-fast-movement', 'monk-improved-evasion', 'monk-evasion'],
    // Advice/Insightful Strike/Mystic Wisdom take the place of the monk's bonus feats at 2/6/10/14
    // (the 1st- and 18th-level bonus feats remain).
    bonusFeatSlots: { remove: [2, 6, 10, 14] },
    grants: [
      g(1, 'sensei-advice', 'Advice', 'Direct your allies as a bardic performance using oratory — inspire courage (1st), inspire competence (3rd), inspire greatness (9th), and inspire heroics (15th) — for a number of rounds per day equal to your monk level + your Wisdom modifier. Replaces flurry of blows, fast movement, and improved evasion.'),
      g(2, 'sensei-insightful-strike', 'Insightful Strike', 'Use your Wisdom modifier in place of Strength or Dexterity on attack rolls and combat maneuver checks with unarmed strikes and monk weapons. Replaces evasion and the 2nd-level bonus feat.'),
      g(6, 'sensei-mystic-wisdom', 'Mystic Wisdom', 'Spend ki to grant your monk abilities to a nearby ally instead of yourself, widening to several allies at 10th and to advanced abilities at 14th. Replaces the bonus feats gained at 6th, 10th, and 14th level.'),
    ],
  },
];

export const CLERIC_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'cloistered-cleric', classId: 'cleric', name: 'Cloistered Cleric',
    desc: 'A scholar-priest who trades martial training and a measure of divine power for deep learning and the support of allies.',
    // Diminished Spellcasting: one fewer non-domain spell of each level. The domain slot is a separate
    // (unreduced) bonus slot in the engine, so the reduction lands only on the normal slots — exactly RAW.
    spellcastingMod: { diminished: true },
    // Adds the remaining Knowledge skills, giving the cleric Knowledge (all) as class skills.
    classSkills: { add: ['know-dungeoneering', 'know-engineering', 'know-geography', 'know-local', 'know-nature'] },
    // Light armor only, no shields (RAW also narrows weapons to a short list — not modelled here).
    proficiencies: { armor: { remove: ['medium', 'heavy', 'shield'] } },
    replaces: [],
    grants: [
      g(1, 'cloistered-breadth-of-knowledge', 'Breadth of Knowledge', 'Add half your cleric level (minimum 1) to all Knowledge checks and make Knowledge checks untrained.'),
      g(2, 'cloistered-well-read', 'Well-Read', '+2 on checks and saves involving glyphs, runes, scrolls, symbols, and the written word.'),
      g(3, 'cloistered-verbal-instruction', 'Verbal Instruction', 'Use aid another at 30 feet to help an ally’s skill or ability check, aiding one more ally for every three cleric levels.'),
      g(4, 'cloistered-scribe-scroll', 'Scribe Scroll', 'Gain Scribe Scroll as a bonus feat.'),
    ],
    // One domain instead of two.
    choices: {
      remove: ['domains'],
      add: [{ id: 'domains', label: 'Domain', kind: 'cleric-domains', count: 1 }],
    },
  },
  {
    id: 'crusader', classId: 'cleric', name: 'Crusader',
    desc: 'A warrior-priest who marches at the front of the faithful — trading a measure of divine magic for martial might.',
    replaces: [],
    // Diminished Spellcasting and a single domain buy martial training and combat feats.
    spellcastingMod: { diminished: true },
    proficiencies: { weapons: { add: ['martial'] } },
    bonusFeatSlots: { add: [1, 5, 10, 15, 20] },
    choices: {
      remove: ['domains'],
      add: [{ id: 'domains', label: 'Domain', kind: 'cleric-domains', count: 1 }],
    },
    grants: [
      g(8, 'crusader-legions-blessing', 'Legion’s Blessing', 'Quickly confer a beneficial touch- or close-range spell you cast to many allies at once. '),
    ],
  },
];

export const CAVALIER_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'gendarme', classId: 'cavalier', name: 'Gendarme',
    desc: 'A heavy lancer who lives for the charge — pouring the order’s teaching into raw combat prowess.',
    replaces: ['cav-tactician', 'cav-greater-tactician', 'cav-master-tactician', 'cav-supreme-charge'],
    // Bonus feats move to 1st/5th and every three levels after, replacing the cavalier's 6/12/18 feats.
    bonusFeatSlots: { remove: [6, 12, 18], add: [1, 5, 8, 11, 14, 17, 20] },
    grants: [
      g(1, 'gendarme-cavalry-feats', 'Cavalry Feats', 'Your cavalier bonus feats come at 1st, 5th, and every three levels thereafter, chosen from Improved Bull Rush, Mounted Combat, Power Attack, Ride-By Attack, Spirited Charge, Spring Attack, and Unseat until you have them all, then from any combat feat. Replaces tactician, greater tactician, and master tactician.'),
      g(20, 'gendarme-transfixing-charge', 'Transfixing Charge', 'On a mounted charge, deal triple damage (quadruple with a lance); a confirmed critical deals maximum weapon damage. Replaces supreme charge.'),
    ],
  },
  {
    id: 'standard-bearer', classId: 'cavalier', name: 'Standard Bearer',
    desc: 'A cavalier who leads on foot beneath a rallying banner, steeling allies where the fighting is thickest.',
    replaces: ['cav-mount', 'cav-banner', 'cav-mighty-charge', 'cav-supreme-charge'],
    grants: [
      g(1, 'sb-cav-banner', 'Banner', 'Gain the cavalier banner at 1st level (rather than 5th), its bonuses rising at 5th and every five levels thereafter. Replaces mount.'),
      g(5, 'sb-cav-mount', 'Mount', 'Gain a loyal combat-trained mount, as the standard cavalier. Replaces banner.'),
      g(11, 'sb-banner-of-solace', 'Banner of Solace', 'Once per day, wave your banner as a full-round action to grant allies within 60 feet temporary hit points and a morale bonus on damage. Replaces mighty charge.'),
      g(20, 'sb-awesome-pennon', 'Awesome Pennon', 'While your banner is visible, allies within 60 feet gain a morale bonus on attacks, immunity to fear, and a bonus against mind-affecting effects. Replaces supreme charge.'),
    ],
  },
];

export const INQUISITOR_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'sanctified-slayer', classId: 'inquisitor', name: 'Sanctified Slayer',
    desc: 'An inquisitor who hunts the faith’s enemies like a killer — marking a target and striking its vitals rather than passing judgment.',
    replaces: ['inq-judgment', 'inq-second-judgment', 'inq-third-judgment', 'inq-slayer', 'inq-true-judgment'],
    grants: [
      g(1, 'ss-studied-target', 'Studied Target', 'As a move action, study a foe to gain a scaling bonus on attack and damage rolls and several skill checks against it, using your inquisitor level as your slayer level. Replaces judgment 1/day.'),
      g(4, 'ss-sneak-attack', 'Sneak Attack +1d6', 'Deal +1d6 sneak-attack damage (rising by 1d6 every three levels) when your target is denied its Dexterity bonus to AC or you flank it; ranged sneak attacks require the target within 30 feet. Replaces the later daily uses of judgment.'),
      g(8, 'ss-slayer-talent-8', 'Slayer Talent', 'Select a slayer talent. Replaces second judgment.'),
      g(16, 'ss-slayer-talent-16', 'Slayer Talent', 'Select a slayer talent. Replaces third judgment.'),
      g(17, 'ss-slayer-talent-17', 'Slayer Talent', 'Select a slayer talent. Replaces slayer.'),
      g(20, 'ss-slayer-talent-20', 'Slayer Talent', 'Select a slayer talent. Replaces true judgment.'),
    ],
  },
  {
    id: 'sacred-huntsmaster', classId: 'inquisitor', name: 'Sacred Huntsmaster',
    desc: 'An inquisitor who hunts the faith’s foes alongside a bonded beast, the two moving as one relentless pack.',
    replaces: ['inq-judgment', 'inq-solo-tactics', 'inq-second-judgment', 'inq-third-judgment', 'inq-slayer', 'inq-true-judgment'],
    grants: [
      g(1, 'sh-animal-companion', 'Animal Companion', 'Gain an animal companion, as a druid of your inquisitor level − 3. Replaces judgment 1/day.'),
      g(3, 'sh-hunter-tactics', 'Hunter Tactics', 'Automatically grant your teamwork feats to your animal companion. Replaces solo tactics.'),
      g(4, 'sh-animal-focus', 'Animal Focus', 'Take on the aspect of an animal for a scaling bonus, as a hunter. Replaces the later daily uses of judgment.'),
      g(8, 'sh-improved-empathic-link', 'Improved Empathic Link', 'Share senses and a deeper bond with your companion. Replaces second judgment.'),
      g(16, 'sh-raise-companion', 'Raise Animal Companion', 'Return a slain companion to life once per day. Replaces third judgment.'),
      g(17, 'sh-second-animal-focus', 'Second Animal Focus', 'Apply a second animal focus at once. Replaces slayer.'),
      g(20, 'sh-greater-empathic-link', 'Greater Empathic Link', 'Your bond with your companion reaches its height. Replaces true judgment.'),
    ],
  },
];

export const DRUID_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'aquatic-druid', classId: 'druid', name: 'Aquatic Druid',
    desc: 'A guardian of seas, rivers, and marshes — at home beneath the waves where land druids cannot follow.',
    replaces: ['druid-wild-empathy', 'druid-woodland-stride', 'druid-trackless-step', 'druid-resist-natures-lure', 'druid-venom-immunity', 'druid-thousand-faces'],
    grants: [
      g(1, 'aqua-wild-empathy', 'Wild Empathy (aquatic)', 'Influence the attitude of creatures with a swim speed or the aquatic or water subtype — even mindless ones — as a Diplomacy check. Replaces wild empathy.'),
      g(2, 'aqua-adaptation', 'Aquatic Adaptation', 'In aquatic terrain, gain an insight bonus equal to half your druid level on initiative, Knowledge (geography), Perception, Stealth, Survival, and Swim, and you cannot be tracked. Replaces woodland stride.'),
      g(3, 'aqua-natural-swimmer', 'Natural Swimmer', 'Gain a swim speed equal to half your land speed. Replaces trackless step.'),
      g(4, 'aqua-resist-oceans-fury', 'Resist Ocean’s Fury', '+4 on saving throws against water spells and the supernatural and extraordinary abilities of aquatic and water creatures. Replaces resist nature’s lure.'),
      g(9, 'aqua-seaborn', 'Seaborn', 'Gain the aquatic subtype and the amphibious trait, a swim speed equal to your land speed, and endure cold climates as endure elements. Replaces venom immunity.'),
      g(13, 'aqua-deep-diver', 'Deep Diver', 'Gain DR equal to half your druid level against slashing or piercing damage (and crushing or grappling effects), and immunity to pressure damage from deep water. Replaces a thousand faces.'),
    ],
  },
  {
    id: 'blight-druid', classId: 'druid', name: 'Blight Druid',
    desc: 'A druid who tends decay rather than growth — spreading sickness and rot as nature’s grim caretaker.',
    replaces: ['druid-nature-bond', 'druid-wild-empathy', 'druid-trackless-step', 'druid-resist-natures-lure', 'druid-venom-immunity', 'druid-thousand-faces'],
    grants: [
      g(1, 'bd-nature-bond', 'Blight Nature Bond', 'You cannot bond with an animal companion; instead call a familiar as a wizard of your druid level, or choose from the Darkness, Death, and Destruction domains in addition to the usual options. Replaces nature bond.'),
      g(1, 'bd-vermin-empathy', 'Vermin Empathy', 'Influence the attitude of vermin as a Diplomacy check, and animals and undead at a penalty. Replaces wild empathy.'),
      g(5, 'bd-miasma', 'Miasma', 'Creatures adjacent to you must save or be sickened (nauseated for animals, fey, and plants). Replaces trackless step and resist nature’s lure.'),
      g(9, 'bd-blightblooded', 'Blightblooded', 'Gain immunity to disease and to the sickened and nauseated conditions. Replaces venom immunity.'),
      g(13, 'bd-plaguebearer', 'Plaguebearer', 'Creatures that strike you with a touch, unarmed strike, or natural weapon must save or contract a disease. Replaces a thousand faces.'),
    ],
  },
];

export const WIZARD_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'scrollmaster', classId: 'wizard', name: 'Scrollmaster',
    desc: 'A battle-scholar who wields scrolls as blade and shield, turning written magic into a martial art.',
    replaces: ['wizard-arcane-bond'],
    // The 10th-level bonus feat becomes Improved Scroll Casting.
    bonusFeatSlots: { remove: [10] },
    // No familiar or bonded object — the arcane-bond pick goes away with the feature.
    choices: { remove: ['arcane-bond'] },
    grants: [
      g(1, 'scroll-blade', 'Scroll Blade', 'Wield a scroll from your spellbook as a magic short sword whose enhancement bonus scales with the highest-level spell it holds; the spell is expended when the blade fades. Replaces arcane bond.'),
      g(1, 'scroll-shield', 'Scroll Shield', 'Wield a scroll as a light wooden shield granting a scaling shield bonus, expending the spell. Part of the arcane bond replacement.'),
      g(10, 'scroll-improved-casting', 'Improved Scroll Casting', 'When casting from a scroll, use your own Intelligence and feats to set the spell’s save DC and other variables. Replaces the 10th-level wizard bonus feat.'),
    ],
  },
  {
    id: 'spellbinder', classId: 'wizard', name: 'Spellbinder',
    desc: 'An elven wizard who bonds not with a familiar or object but with the spells themselves, ready at a thought.',
    replaces: ['wizard-arcane-bond'],
    choices: { remove: ['arcane-bond'] },
    grants: [
      g(1, 'sb-spellbound', 'Spellbound', 'Bond with one spell you know; as a full-round action you can swap a prepared spell of equal or higher level for your bonded spell. Bond another spell at 3rd level and every two levels after, up to nine at 17th. Replaces arcane bond.'),
    ],
  },
];

export const WITCH_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'beast-bonded', classId: 'witch', name: 'Beast-Bonded',
    desc: 'A witch whose bond with her familiar runs soul-deep — pouring her hexes into the beast rather than herself.',
    replaces: [],
    // Enhanced Familiar / Familiar Form / Twin Soul take the place of the hexes gained at 4th, 8th, and 10th.
    // The witch carries two 'hex' choices (the 1st-level hex and the recurring line); removing by id drops
    // both, so re-add the 1st-level hex unchanged and the recurring line without its 4th/8th/10th picks.
    choices: {
      remove: ['hex'],
      add: [
        { id: 'hex', label: 'Hex', kind: 'list', count: 1, options: WITCH_HEXES },
        { id: 'hex', label: 'Hex', kind: 'list', count: 1, levels: [2, 6, 12, 14, 16, 18, 20], options: WITCH_HEXES },
      ],
    },
    grants: [
      g(1, 'bb-transfer-feats', 'Transfer Feats', 'Whenever you could learn a feat, you may instead have your familiar learn it as a bonus feat.'),
      g(4, 'bb-enhanced-familiar', 'Enhanced Familiar', 'Your familiar is treated as belonging to a witch one level higher for its abilities. Replaces the 4th-level hex.'),
      g(8, 'bb-familiar-form', 'Familiar Form', 'Assume the shape of your familiar (or a similar animal) for a number of minutes per day equal to your level. Replaces the 8th-level hex.'),
      g(10, 'bb-twin-soul', 'Twin Soul', 'When you or your familiar would die, your souls merge in the survivor’s body — able to communicate and trade control. Replaces the major hex gained at 10th level.'),
    ],
  },
  {
    id: 'hedge-witch', classId: 'witch', name: 'Hedge Witch',
    desc: 'A village witch who turns her patron’s gifts to mending and mercy rather than curses.',
    replaces: [],
    // Spontaneous / Empathic Healing take the hexes gained at 4th and 8th. The witch carries two 'hex'
    // choices (the 1st-level hex and the recurring line); re-add the 1st-level hex and the line minus 4/8.
    choices: {
      remove: ['hex'],
      add: [
        { id: 'hex', label: 'Hex', kind: 'list', count: 1, options: WITCH_HEXES },
        { id: 'hex', label: 'Hex', kind: 'list', count: 1, levels: [2, 6, 10, 12, 14, 16, 18, 20], options: WITCH_HEXES },
      ],
    },
    grants: [
      g(4, 'hw-spontaneous-healing', 'Spontaneous Healing', 'Expend a prepared spell to spontaneously cast a cure spell of the same level, even one you do not know. Replaces the 4th-level hex.'),
      g(8, 'hw-empathic-healing', 'Empathic Healing', 'Draw a poison or disease from an ally onto yourself without suffering its effect. Replaces the 8th-level hex.'),
    ],
  },
];

export const SORCERER_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'tattooed-sorcerer', classId: 'sorcerer', name: 'Tattooed Sorcerer',
    desc: 'A sorcerer whose magic is etched in living ink — a familiar that rides as a tattoo, and spells stored in the skin.',
    replaces: ['sorc-eschew', 'sorc-bloodline-feat'],
    // Familiar Tattoo and Enhanced Magical Tattoo take the place of the 1st- and 9th-level bloodline
    // powers, which come from the chosen bloodline rather than the class's own feature list.
    suppressSourcePowers: [{ prefix: 'sorc-bl', levels: [1, 9] }],
    grants: [
      g(1, 'tattoo-familiar', 'Familiar Tattoo', 'Gain a familiar as an arcane bond; as a move action it becomes a tattoo on your body, still granting its special ability while it rests there. Replaces the 1st-level bloodline power.'),
      g(1, 'tattoo-mages-tattoo', 'Mage’s Tattoo', 'Gain Mage’s Tattoo as a bonus feat, choosing its school freely if you lack Spell Focus. Replaces Eschew Materials.'),
      g(7, 'tattoo-create-spell-tattoo', 'Create Spell Tattoo', 'Once per day (twice at 11th, three times at 15th), inscribe a spell without costly components onto a willing creature as a tattoo it can later trigger. Replaces the bloodline feat gained at 7th level.'),
      g(9, 'tattoo-enhanced-magical', 'Enhanced Magical Tattoo', 'Choose a spell you know that is enhanced by Mage’s Tattoo; once per day cast it as a spell-like ability at +2 caster levels. Replaces the 9th-level bloodline power.'),
    ],
  },
  {
    id: 'razmiran-priest', classId: 'sorcerer', name: 'Razmiran Priest',
    desc: 'A sorcerer who cloaks arcane power in the trappings of a false faith — miracle-worker, charlatan, and cult agent.',
    replaces: ['sorc-eschew'],
    // Lay Healer takes the 3rd/5th bloodline bonus spells; False Channel takes the 9th bloodline power.
    suppressSourcePowers: [
      { prefix: 'sorc-bl-sp', levels: [3, 5] },
      { prefix: 'sorc-bl', levels: [9] },
    ],
    grants: [
      g(1, 'rp-false-piety', 'False Piety', 'You can use and activate divine scrolls and wands as if the spells were on your spell list, and pass your arcane magic off as divine. Replaces Eschew Materials.'),
      g(3, 'rp-lay-healer', 'Lay Healer', 'Add aid to your spells known as a 2nd-level spell. Replaces the 3rd-level bloodline bonus spell.'),
      g(5, 'rp-lay-healer-greater', 'Lay Healer (greater)', 'Add remove disease to your spells known as a 3rd-level spell. Replaces the 5th-level bloodline bonus spell.'),
      g(9, 'rp-false-channel', 'False Channel', 'Expend a spell slot to mimic a cleric channeling positive energy, healing or dazzling onlookers. Replaces the 9th-level bloodline power.'),
    ],
  },
];

export const WARPRIEST_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'sacred-fist', classId: 'warpriest', name: 'Sacred Fist',
    desc: 'A warrior-monk of the faith who forgoes armor and blessed steel to strike with blessed fists.',
    replaces: ['wp-sacred-weapon', 'wp-focus-weapon', 'wp-sacred-armor'],
    // No armor or shields — a sacred fist fights unarmored.
    proficiencies: { armor: { remove: ['light', 'medium', 'heavy', 'shield'] } },
    grants: [
      g(1, 'sf-flurry', 'Flurry of Blows', 'Make a flurry of blows as a full-attack action (as the monk ability), though your warpriest levels do not count as your base attack bonus for it. Replaces sacred weapon.'),
      g(1, 'sf-unarmed', 'Unarmed Strike', 'Gain Improved Unarmed Strike as a bonus feat and deal unarmed damage as a monk of your warpriest level. Replaces focus weapon.'),
      g(1, 'sf-ac-bonus', 'AC Bonus', 'While unarmored and unencumbered, add your Wisdom modifier to AC and CMD, plus a +1 dodge bonus at 4th level that rises by 1 every four levels.'),
      g(7, 'sf-ki-pool', 'Ki Pool', 'Gain a ki pool as a monk, using your warpriest level − 3 as your monk level for its size and unarmed-strike bonuses. Replaces sacred armor.'),
    ],
  },
  {
    id: 'champion-of-the-faith', classId: 'warpriest', name: 'Champion of the Faith',
    desc: 'A crusading warpriest sworn to an ideal — smiting the opposed and reading the guilt in their eyes.',
    replaces: ['wp-sacred-weapon', 'wp-channel'],
    // Detect Alignment takes the place of the 3rd-level bonus feat.
    bonusFeatSlots: { remove: [3] },
    grants: [
      g(1, 'cf-chosen-alignment', 'Chosen Alignment', 'Choose an alignment component (chaos, evil, good, or law) shared with your deity, and take the matching blessing even if it is not on your deity’s domain list.'),
      g(1, 'cf-sacred-weapon', 'Sacred Weapon (aligned)', 'Your sacred weapon gains no enhancement bonus, but counts as your chosen alignment for overcoming DR and can be charged with an alignment weapon property for a short time. Alters sacred weapon.'),
      g(3, 'cf-detect-alignment', 'Detect Alignment', 'As a move action, detect creatures of your opposed alignment within 60 feet. Replaces the 3rd-level bonus feat.'),
      g(4, 'cf-smite', 'Smite', 'Spend two fervor uses to smite a creature of your opposed alignment, adding Charisma to attack and your warpriest level to damage. Replaces channel energy.'),
    ],
  },
];

export const BRAWLER_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'snakebite-striker', classId: 'brawler', name: 'Snakebite Striker',
    desc: 'A brawler who fights like a gutter-scrapper — reading openings and striking vital spots instead of drilling maneuvers.',
    replaces: ['brawl-martial-flexibility', 'brawl-maneuver-training'],
    grants: [
      g(1, 'sbs-sneak-attack', 'Sneak Attack +1d6', 'Deal +1d6 sneak-attack damage (rising at 6th, 10th, 12th, and 20th) against a foe denied its Dexterity bonus or that you flank. Replaces martial flexibility.'),
      g(3, 'sbs-snake-feint', 'Snake Feint', 'Move and feint (Bluff vs Sense Motive) as a standard action; at higher levels, treat additional squares as your flanking position. Replaces maneuver training gained at 3rd and 7th.'),
      g(11, 'sbs-opportunist', 'Opportunist', 'Once per round (twice at 19th), make an attack of opportunity against a foe just struck in melee by another creature. Replaces maneuver training gained at 11th and 19th.'),
    ],
  },
  {
    id: 'mutagenic-mauler', classId: 'brawler', name: 'Mutagenic Mauler',
    desc: 'A brawler who brews a bestial draught, swelling into a savage predator mid-fight.',
    replaces: ['brawl-martial-flexibility', 'brawl-ac-bonus'],
    grants: [
      g(1, 'mm-mutagen', 'Mutagen', 'Brew and drink a mutagen as an alchemist, using your brawler level as your alchemist level. Replaces martial flexibility.'),
      g(4, 'mm-beastmorph', 'Beastmorph', 'While mutagenic, gain low-light vision, darkvision, a climb speed, and a large enhancement bonus to speed, improving at 13th and 18th. Replaces AC bonus.'),
      g(6, 'mm-mutagen-damage', 'Mutagen Damage', '+2 on melee damage rolls while mutagenic, rising to +3 at 11th and +4 at 16th.'),
      g(10, 'mm-discovery', 'Alchemist Discovery', 'Learn one of feral mutagen, infuse mutagen, preserve organs, or spontaneous healing.'),
      g(12, 'mm-greater-mutagen', 'Greater Mutagen', 'Gain the greater mutagen discovery, boosting a second physical ability.'),
    ],
  },
];

export const INVESTIGATOR_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'empiricist', classId: 'investigator', name: 'Empiricist',
    desc: 'An investigator who trusts cold observation over instinct — turning a keen intellect on every problem.',
    replaces: ['inv-poison-lore', 'inv-swift-alchemy', 'inv-true-inspiration'],
    grants: [
      g(2, 'emp-ceaseless-observation', 'Ceaseless Observation', 'Use your Intelligence modifier in place of the usual ability for Disable Device, Perception, Sense Motive, and Use Magic Device, and for Diplomacy checks to gather information. Replaces poison lore and poison resistance.'),
      g(4, 'emp-unfailing-logic', 'Unfailing Logic', '+2 insight bonus on Will saves against illusions you can disbelieve (rising to +4 at 8th, immunity at 16th); spend inspiration to use Intelligence rather than Wisdom on such saves. Replaces swift alchemy.'),
      g(20, 'emp-master-intellect', 'Master Intellect', 'Apply inspiration to any skill or ability check, including initiative, without spending inspiration points. Replaces true inspiration.'),
    ],
  },
  {
    id: 'sleuth', classId: 'investigator', name: 'Sleuth',
    desc: 'An investigator who trusts luck and daring over alchemy — a two-fisted detective who makes his own breaks.',
    replaces: ['inv-alchemy', 'inv-swift-alchemy'],
    spellcasting: null, // a sleuth brews no extracts
    grants: [
      g(1, 'sleuth-luck', 'Sleuth’s Luck', 'A pool of luck points equal to your Charisma modifier (minimum 1), refreshed by natural 20s and high inspiration rolls during an investigation. Replaces alchemy.'),
      g(1, 'sleuth-daring', 'Daring', 'Spend a luck point to add a rolled d6 (exploding on a 6) to an Acrobatics, Climb, Escape Artist, Fly, Ride, or Swim check.'),
      g(1, 'sleuth-opportunistic-evasion', 'Opportunistic Evasion', 'Spend a luck point after a successful Reflex save to take no damage at all.'),
      g(1, 'sleuth-initiative', 'Sleuth’s Initiative', '+2 on initiative while you have at least 1 luck point, and draw a weapon during initiative if you have Quick Draw.'),
      g(4, 'sleuth-make-it-count', 'Make It Count', 'Spend a luck point to apply an investigator talent you don’t know to a studied strike. Replaces swift alchemy.'),
      g(4, 'sleuth-run-like-hell', 'Run Like Hell', 'Spend a luck point for +20 ft speed for 1 minute and a dodge bonus while moving.'),
      g(4, 'sleuth-second-chance', 'Second Chance', 'Spend a luck point to reroll an inspiration die or daring die.'),
    ],
  },
];

export const ORACLE_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'warsighted', classId: 'oracle', name: 'Warsighted',
    desc: 'An oracle whose visions are of battle — trading mystic revelations for a warrior’s ever-shifting repertoire.',
    replaces: [],
    // Martial Flexibility takes the place of the revelations gained at 1st, 7th, 11th, and 15th;
    // the 3rd- and 19th-level revelations remain.
    choices: {
      remove: ['revelation'],
      add: [{ id: 'revelation', label: 'Revelation', kind: 'oracle-revelation', count: 1, levels: [3, 19] }],
    },
    grants: [
      g(1, 'ws-martial-flexibility', 'Martial Flexibility', 'As a move action, gain the benefit of a combat feat you lack for 1 minute, 3 + ½ your oracle level times per day; at 7th, 11th, and 15th you can borrow two or three feats at once or use faster action types. Replaces the revelations gained at 1st, 7th, 11th, and 15th.'),
    ],
  },
  {
    id: 'seeker', classId: 'oracle', name: 'Seeker',
    desc: 'An oracle drawn to lost lore and hidden mechanisms — reading magic like a locksmith reads a tumbler.',
    replaces: [],
    // Tinkering grants a few skills in place of the mystery's bonus class skills (the mystery's own
    // skill grants aren't modelled, so this only adds).
    classSkills: { add: ['disable-device', 'know-engineering', 'use-magic-device'] },
    // Seeker Lore / Seeker Magic take the revelations gained at 3rd and 15th.
    choices: {
      remove: ['revelation'],
      add: [{ id: 'revelation', label: 'Revelation', kind: 'oracle-revelation', count: 1, levels: [1, 7, 11, 19] }],
    },
    grants: [
      g(1, 'seeker-tinkering', 'Tinkering', 'Gain Disable Device, Knowledge (engineering), and Use Magic Device as class skills, and disarm magical traps with Disable Device. Replaces the mystery’s bonus class skills.'),
      g(3, 'seeker-lore', 'Seeker Lore', 'Add half your oracle level to Spellcraft and Use Magic Device, and identify magic items more readily. Replaces the 3rd-level revelation.'),
      g(15, 'seeker-magic', 'Seeker Magic', 'Apply metamagic to your spells without increasing casting time a few times per day. Replaces the 15th-level revelation.'),
    ],
  },
];

export const BLOODRAGER_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'steelblood', classId: 'bloodrager', name: 'Steelblood',
    desc: 'A bloodrager who fights from within a steel shell, wading through the fray heedless of the blows that ring off his armor.',
    replaces: ['br-fast-movement', 'br-uncanny-dodge', 'br-improved-uncanny-dodge', 'br-dr'],
    // Gains heavy armor (and casts in it without failure); Blood Deflection takes the place of DR.
    proficiencies: { armor: { add: ['heavy'] } },
    damageReduction: null,
    grants: [
      g(1, 'sb-heavy-armor', 'Heavy Armor Training', 'Gain proficiency with heavy armor and cast bloodrager spells in heavy armor without arcane spell failure. Replaces the bloodrager’s armor proficiency.'),
      g(1, 'sb-indomitable-stance', 'Indomitable Stance', '+1 on combat maneuver checks, CMD vs overrun, Reflex saves vs trample, AC vs charges, and attack/damage against charging foes. Replaces fast movement.'),
      g(2, 'sb-armored-swiftness', 'Armored Swiftness', 'Move at full speed in medium or heavy armor. Replaces uncanny dodge.'),
      g(5, 'sb-armor-training', 'Armor Training', 'Reduce your armor’s check penalty and raise its maximum Dexterity bonus, improving as you level. Replaces improved uncanny dodge.'),
      g(7, 'sb-blood-deflection', 'Blood Deflection', 'Sacrifice a bloodrager spell slot as an immediate action for a deflection bonus to AC equal to the spell’s level until your next turn — even after seeing an attack roll. Replaces damage reduction.'),
    ],
  },
  {
    id: 'blood-conduit', classId: 'bloodrager', name: 'Blood Conduit',
    desc: 'A bloodrager who channels spells through his grip — every lock and throw a doorway for his magic.',
    replaces: ['br-fast-movement', 'br-uncanny-dodge', 'br-improved-uncanny-dodge', 'br-indomitable-will'],
    grants: [
      g(1, 'bc-contact-specialist', 'Contact Specialist', 'Gain a bonus combat-maneuver feat, and your bloodline feats must be combat feats. Replaces fast movement.'),
      g(5, 'bc-spell-conduit', 'Spell Conduit', 'Deliver a touch-range spell through a successful combat maneuver. Replaces uncanny dodge and improved uncanny dodge.'),
      g(14, 'bc-reflexive-conduit', 'Reflexive Conduit', 'Cast a touch spell as an immediate action against a foe that targets you with a combat maneuver. Replaces indomitable will.'),
    ],
  },
];

export const SWASHBUCKLER_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'inspired-blade', classId: 'swashbuckler', name: 'Inspired Blade',
    desc: 'A duelist who perfects the science of the rapier — reading swordplay like geometry and striking with inspired precision.',
    replaces: ['swb-panache', 'swb-finesse', 'swb-weapon-training', 'swb-weapon-mastery', 'swb-deed-bleeding-wound'],
    grants: [
      g(1, 'ib-inspired-panache', 'Inspired Panache', 'Your panache pool equals your Charisma modifier + your Intelligence modifier (each minimum 1); you regain panache only by scoring a critical hit with a rapier, never from a killing blow. Alters panache.'),
      g(1, 'ib-inspired-finesse', 'Inspired Finesse', 'Gain Weapon Finesse and Weapon Focus (rapier) as bonus feats. Replaces swashbuckler finesse.'),
      g(5, 'ib-rapier-training', 'Rapier Training', 'Gain a scaling +1 (rising every four levels) on attack and damage rolls with the rapier. Replaces swashbuckler weapon training.'),
      g(11, 'ib-inspired-strike', 'Inspired Strike', 'Spend a panache point to add your Intelligence bonus to the damage of a rapier attack. Replaces the bleeding wound deed.'),
      g(20, 'ib-rapier-weapon-mastery', 'Rapier Weapon Mastery', 'Critical hits with a rapier are automatically confirmed, and its threat range and critical multiplier each increase by 1. Replaces swashbuckler weapon mastery.'),
    ],
  },
  {
    id: 'flying-blade', classId: 'swashbuckler', name: 'Flying Blade',
    desc: 'A swashbuckler who fights with the thrown dagger and starknife — deadly at a distance as at arm’s reach.',
    replaces: ['swb-deed-dodging-panache', 'swb-deed-kip-up', 'swb-deed-menacing-swordplay', 'swb-deed-targeted-strike', 'swb-deed-perfect-thrust', 'swb-weapon-training', 'swb-weapon-mastery'],
    grants: [
      g(1, 'fb-flying-panache', 'Flying Panache', 'You regain panache only by confirming a critical hit or making a killing blow with a dagger or starknife. Alters panache.'),
      g(1, 'fb-subtle-throw', 'Deed: Subtle Throw', 'Spend panache to throw a dagger or starknife without provoking an attack of opportunity. Replaces dodging panache.'),
      g(3, 'fb-disrupting-counter', 'Deed: Disrupting Counter', 'Spend panache to throw a blade at a foe who provokes, disrupting its action. Replaces kip-up.'),
      g(3, 'fb-precise-throw', 'Deed: Precise Throw', 'Add your level to thrown-blade damage while you have panache. Replaces menacing swordplay.'),
      g(5, 'fb-flying-blade-training', 'Flying Blade Training', 'Gain a scaling bonus on attack and damage with thrown daggers and starknives. Replaces swashbuckler weapon training.'),
      g(7, 'fb-targeted-throw', 'Deed: Targeted Throw', 'Make a thrown called strike to a limb, head, or body. Replaces targeted strike.'),
      g(15, 'fb-perfect-throw', 'Deed: Perfect Throw', 'Spend panache to ignore a foe’s DR and hardness with a thrown blade. Replaces perfect thrust.'),
      g(20, 'fb-flying-blade-mastery', 'Flying Blade Mastery', 'Critical hits with a thrown dagger or starknife are automatically confirmed and bypass DR. Replaces swashbuckler weapon mastery.'),
    ],
  },
];

export const HUNTER_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'feral-hunter', classId: 'hunter', name: 'Feral Hunter',
    desc: 'A hunter who becomes the beast rather than keeping one — wearing animal aspects like a second skin.',
    replaces: ['hunter-animal-companion', 'hunter-precise-companion', 'hunter-tactics', 'hunter-speak-with-master'],
    // Summon Pack takes the place of the teamwork feats gained at 6th/9th/12th/15th/18th (3rd remains).
    bonusFeatSlots: { remove: [6, 9, 12, 15, 18] },
    grants: [
      g(1, 'fh-feral-focus', 'Feral Focus', 'You gain no animal companion; instead you can apply your animal focus to yourself an unlimited number of times per day, and eventually keep several active at once. Alters animal focus; replaces hunter tactics and speak with master.'),
      g(3, 'fh-precise-summoned', 'Precise Summoned Animal', 'Apply your Precise Companion teamwork feat to creatures you summon rather than to a companion. Alters precise companion.'),
      g(4, 'fh-wild-shape', 'Wild Shape', 'Assume animal forms as a druid of your hunter level − 3. Replaces the animal-companion improvements.'),
      g(6, 'fh-summon-pack', 'Summon Pack', 'Summon a pack of natural creatures that share your active animal focus. Replaces the teamwork feats gained at 6th, 9th, 12th, 15th, and 18th.'),
    ],
  },
  {
    id: 'packmaster', classId: 'hunter', name: 'Packmaster',
    desc: 'A hunter who runs with a pack of small beasts rather than one great companion — many teeth, one will.',
    replaces: ['hunter-animal-companion', 'hunter-animal-focus', 'hunter-master-hunter'],
    grants: [
      g(1, 'pm-pack-bond', 'Pack Bond', 'Gain several small animal companions instead of one, dividing your effective druid levels among them. Replaces animal companion.'),
      g(1, 'pm-pack-focus', 'Pack Focus', 'Apply an animal focus to your whole pack at once. Replaces animal focus.'),
      g(8, 'pm-second-pack-focus', 'Second Pack Focus', 'Apply a second animal focus to the pack. Replaces the second animal focus.'),
      g(20, 'pm-master-of-pack', 'Master of the Pack', 'Your pack strikes as one against a studied foe. Replaces master hunter.'),
    ],
  },
];

export const SUMMONER_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'master-summoner', classId: 'summoner', name: 'Master Summoner',
    desc: 'A conjurer who floods the field with called creatures, keeping a lesser eidolon at their side.',
    replaces: ['summ-eidolon', 'summ-summon-monster', 'summ-shield-ally', 'summ-bond-senses'],
    grants: [
      g(1, 'ms-lesser-eidolon', 'Lesser Eidolon', 'Your eidolon uses half your summoner level (minimum 1) for its Hit Dice, evolution pool, and abilities. Replaces the normal eidolon.'),
      g(1, 'ms-summoning-mastery', 'Summoning Mastery', 'Cast summon monster as a spell-like ability 5 + your Charisma modifier times per day (its level rising as you advance), and keep several summons active at once. Replaces summon monster and shield ally.'),
      g(2, 'ms-augment-summoning', 'Augment Summoning', 'Gain Augment Summoning as a bonus feat without meeting its prerequisites. Replaces bond senses.'),
    ],
  },
  {
    id: 'broodmaster', classId: 'summoner', name: 'Broodmaster',
    desc: 'A summoner bonded not to one great eidolon but to a brood of lesser ones, sharing a single well of power.',
    replaces: ['summ-eidolon', 'summ-life-link', 'summ-life-bond', 'summ-merge-forms'],
    grants: [
      g(1, 'bm-eidolon-brood', 'Eidolon Brood', 'Gain two Small eidolons instead of one, sharing your base attack and saves but dividing Hit Dice, skills, feats, and the evolution pool between them. Replaces the normal eidolon.'),
      g(1, 'bm-brood-link', 'Brood Link', 'Sacrifice hit points to protect one eidolon of your brood at a time, as life link. Replaces life link.'),
      g(14, 'bm-brood-bond', 'Brood Bond', 'One eidolon of your brood can keep you from dying, as life bond. Replaces life bond.'),
      g(18, 'bm-merge-forms', 'Merge Forms', 'Meld into a single eidolon of your brood to weather danger. Replaces merge forms.'),
    ],
  },
];

export const SKALD_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'spell-warrior', classId: 'skald', name: 'Spell Warrior',
    desc: 'A skald whose songs sharpen steel and unravel magic — a battle-mage’s bane at the front line.',
    replaces: ['skald-scribe-scroll', 'skald-raging-song', 'skald-spell-kenning', 'skald-dirge-of-doom', 'skald-master'],
    grants: [
      g(1, 'sw-improved-counterspell', 'Improved Counterspell', 'Counterspell using any spell of the same school (or one level higher), not just the identical spell. Replaces Scribe Scroll.'),
      g(1, 'sw-weapon-song', 'Weapon Song (Enhance Weapons)', 'Your raging song instead grants your allies’ weapons a scaling enhancement bonus and, later, weapon special abilities. Replaces inspired rage.'),
      g(5, 'sw-greater-counterspell', 'Greater Counterspell', 'Counterspell as an immediate action, and weaken rather than fully negate a foe’s spell. Replaces spell kenning.'),
      g(10, 'sw-song-arcane-manipulation', 'Song of Arcane Manipulation', 'A raging song that lets affected allies apply metamagic or dispel magic through your performance. Replaces dirge of doom.'),
      g(20, 'sw-spell-tamper', 'Spell Tamper', 'Your counterspelling can seize a foe’s spell and turn it back on them. Replaces master skald.'),
    ],
  },
  {
    id: 'totemic-skald', classId: 'skald', name: 'Totemic Skald',
    desc: 'A skald who channels a primal totem beast — howling its fury into allies and wearing its shape into battle.',
    replaces: ['skald-uncanny-dodge', 'skald-improved-uncanny-dodge', 'skald-spell-kenning'],
    // Totem takes the rage power gained at 3rd level.
    choices: {
      remove: ['skald-rage-power'],
      add: [{ id: 'skald-rage-power', label: 'Rage power', kind: 'list', count: 1, levels: [6, 9, 12, 15, 18], options: BARBARIAN_RAGE_POWERS }],
    },
    grants: [
      g(3, 'ts-totem', 'Totem', 'Gain the Song of the Beast rage power, tied to your chosen totem animal. Replaces the rage power gained at 3rd level.'),
      g(4, 'ts-totem-empathy', 'Totem Empathy', 'Improve the attitude of animals and cast charm animal a few times per day. Replaces uncanny dodge and improved uncanny dodge.'),
      g(5, 'ts-wild-shape', 'Wild Shape', 'Transform into your totem animal’s form (Small or Medium) once per day, more often as you level. Replaces spell kenning.'),
    ],
  },
];

export const SHAMAN_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'speaker-for-the-past', classId: 'shaman', name: 'Speaker for the Past',
    desc: 'A shaman who gives voice to ancestral spirits — trading a familiar bond for the wisdom of ages.',
    replaces: ['shaman-spirit-animal', 'shaman-wandering-spirit', 'shaman-wandering-hex'],
    classSkills: { add: ['linguistics', 'know-history', 'know-local', 'perception', 'use-magic-device'] },
    grants: [
      g(1, 'sfp-mysteries-of-past', 'Mysteries of the Past', 'You gain no spirit familiar; instead add the Ancestor and Time oracle-mystery spells to your list and gain Linguistics, Knowledge (history), Knowledge (local), Perception, and Use Magic Device as class skills. Replaces the shaman’s familiar.'),
      g(4, 'sfp-revelations-of-past', 'Revelations of the Past', 'At 4th, 6th, 12th, 14th, and 20th level, select a revelation from the Ancestor or Time mystery, using your shaman level as your oracle level and Wisdom in place of Charisma. Replaces wandering spirit and wandering hex.'),
    ],
  },
  {
    id: 'witch-doctor', classId: 'shaman', name: 'Witch Doctor',
    desc: 'A shaman who wards a community against curse and plague — mending with one hand, unmaking dark magic with the other.',
    replaces: [],
    // Channel Energy / Counter Curse / Countering Hex take the hexes gained at 4th, 8th, 10th, and 12th.
    choices: {
      remove: ['shaman-hex'],
      add: [{ id: 'shaman-hex', label: 'Hex', kind: 'list', count: 1, levels: [2, 16, 18, 20], options: SHAMAN_HEXES }],
    },
    grants: [
      g(4, 'wd-channel', 'Channel Energy', 'Channel positive energy to heal, as a cleric of your shaman level − 3. Replaces the hexes gained at 4th and 12th.'),
      g(8, 'wd-counter-curse', 'Counter Curse', 'Sacrifice a prepared spirit magic spell to cast dispel magic or remove curse on an ally. Replaces the 8th-level hex.'),
      g(10, 'wd-countering-hex', 'Countering Hex', 'Counterspell a spell with a dispel magic check rather than the identical spell. Replaces the 10th-level hex.'),
    ],
  },
];

export const SHIFTER_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'weretouched', classId: 'shifter', name: 'Weretouched',
    desc: 'A shifter of lycanthropic blood, bound to a single beast whose hybrid form they can assume at will.',
    replaces: ['shifter-aspect', 'shifter-wild-empathy', 'shifter-wild-shape'],
    grants: [
      g(1, 'wt-lycanthrope-aspect', 'Lycanthrope Aspect', 'Choose a single animal aspect at 1st level — the only aspect you can ever gain — and take on lycanthrope traits and its hybrid form. Alters shifter aspect.'),
      g(1, 'wt-lycanthropic-empathy', 'Lycanthropic Empathy', '+4 to influence animals of your chosen type as a Diplomacy check, but only that type. Replaces wild empathy.'),
      g(4, 'wt-lycanthropic-wild-shape', 'Lycanthropic Wild Shape', 'Wild shape only into your chosen animal or its hybrid form (+2 Strength, +2 natural armor); your equipment does not merge. Alters wild shape.'),
      g(5, 'wt-lycanthrope-enhancement', 'Lycanthrope Aspect Enhancement', 'Gain DR equal to half your shifter level (maximum 10) bypassed by silver, and immunity to the curse of lycanthropy. Alters shifter aspect.'),
    ],
  },
  {
    id: 'verdant-shifter', classId: 'shifter', name: 'Verdant Shifter',
    desc: 'A shifter attuned to root and vine rather than fang and claw, taking on the resilient body of a plant.',
    replaces: ['shifter-wild-empathy', 'shifter-aspect', 'shifter-defensive-instinct', 'shifter-chimeric-aspect'],
    grants: [
      g(1, 'vs-speak-plants', 'Speak with Plants', 'Communicate with plants at will, as speak with plants. Replaces wild empathy.'),
      g(1, 'vs-verdant-body', 'Verdant Body', 'Take on a plantlike body in place of an animal aspect, gaining a scaling Constitution bonus and, later, resistance to critical hits and other plant traits. Replaces shifter aspect.'),
      g(2, 'vs-wild-armor', 'Wild Armor', 'Gain a natural armor bonus that improves as you level. Replaces defensive instinct.'),
      g(6, 'vs-plant-shape', 'Plant Shape', 'Your wild shape assumes plant forms (plant shape I, then II and III) rather than animal forms. Alters wild shape; replaces chimeric aspect.'),
    ],
  },
];

export const GUNSLINGER_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'musket-master', classId: 'gunslinger', name: 'Musket Master',
    desc: 'A gunslinger devoted to the two-handed musket — reloading with uncanny speed and reaching out to touch distant foes.',
    replaces: ['gun-deed-gunslingers-dodge', 'gun-deed-utility-shot', 'gun-gun-training'],
    grants: [
      g(1, 'mm-rapid-reload', 'Rapid Reload (musket)', 'Gain Rapid Reload with muskets as a bonus feat (your gunsmith firearm must be a musket).'),
      g(1, 'mm-steady-aim', 'Deed: Steady Aim', 'As a move action, spend 1 grit to increase the range increment of your two-handed firearm by 10 feet for the rest of your turn. Replaces the gunslinger’s dodge deed.'),
      g(3, 'mm-fast-musket', 'Deed: Fast Musket', 'Spend 1 grit to reload a two-handed firearm as if it were a one-handed firearm. Replaces the utility shot deed.'),
      g(5, 'mm-musket-training', 'Musket Training', 'Add your Dexterity modifier to two-handed firearm damage and reduce their misfire value, improving at 9th, 13th, and 17th. Replaces gun training.'),
    ],
  },
  {
    id: 'pistolero', classId: 'gunslinger', name: 'Pistolero',
    desc: 'A gunslinger wed to the one-handed pistol — quick, close, and lethal, planting shots where they hurt most.',
    replaces: ['gun-deed-deadeye', 'gun-deed-startling-shot', 'gun-deed-bleeding-wound', 'gun-gun-training'],
    grants: [
      g(1, 'pist-up-close', 'Deed: Up Close and Deadly', 'Spend 1 grit to add 1d6 (rising as you level) precision damage to a one-handed firearm hit within the first range increment. Replaces the deadeye deed.'),
      g(5, 'pist-pistol-training', 'Pistol Training', 'Add your Dexterity modifier to one-handed firearm damage and reduce their misfire value, improving at 9th, 13th, and 17th. Replaces gun training.'),
      g(7, 'pist-deadeye', 'Deed: Deadeye', 'Spend grit to resolve a one-handed firearm attack against touch AC beyond the first range increment. Replaces the startling shot deed.'),
      g(11, 'pist-twin-shot-knockdown', 'Deed: Twin Shot Knockdown', 'Spend grit to fire both barrels or two shots at once and attempt to knock the target prone. Replaces the bleeding wound deed.'),
    ],
  },
];

export const ARCANIST_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'eldritch-font', classId: 'arcanist', name: 'Eldritch Font',
    desc: 'An arcanist who is a wellspring of raw magic — surging with power at the cost of exhaustion rather than learning subtle tricks.',
    replaces: ['arc-magical-supremacy'],
    // Eldritch Surge and its improvements take the place of the exploits gained at 3rd, 7th, and 13th.
    // The arcanist carries two 'exploit' choices (the 1st-level pick and the recurring line); removing
    // by id drops both, so re-add the 1st-level pick and the recurring line minus 3/7/13.
    choices: {
      remove: ['exploit'],
      add: [
        { id: 'exploit', label: 'Arcanist exploit', kind: 'list', count: 1, options: ARCANIST_EXPLOITS },
        { id: 'exploit', label: 'Arcanist exploit', kind: 'list', count: 1, levels: [5, 9, 11, 15, 17, 19], options: ARCANIST_EXPLOITS },
      ],
    },
    grants: [
      g(1, 'ef-font-of-power', 'Font of Power', 'You gain one bonus spell slot of each spell level but prepare one fewer spell of each level; unused slots can refill your reservoir or fuel metamagic.'),
      g(3, 'ef-eldritch-surge', 'Eldritch Surge', 'As a swift action, add 2 to a spell’s caster level and DC, or treat your arcanist level as 2 higher for an exploit — becoming fatigued (then exhausted) that only rest can cure. Replaces the 3rd-level arcanist exploit.'),
      g(7, 'ef-improved-surge', 'Improved Surge', 'While surging, reroll an attack roll tied to a spell or exploit, or reroll all its damage dice, taking the new result. Replaces the 7th-level arcanist exploit.'),
      g(13, 'ef-greater-surge', 'Greater Surge', 'While surging, force one target to reroll a saving throw against your spell or exploit and take the lower result. Replaces the 13th-level arcanist exploit.'),
      g(20, 'ef-bottomless-well', 'Bottomless Well', 'After an hour of study, regain reservoir points equal to half your arcanist level and prepare new spells — usable several times per day. Replaces magical supremacy.'),
    ],
  },
  {
    id: 'unlettered-arcanist', classId: 'arcanist', name: 'Unlettered Arcanist',
    desc: 'An arcanist who keeps no spellbook — her magic is bound in a familiar, and she draws on the witch’s tradition rather than the wizard’s.',
    replaces: [],
    // Familiar replaces the spellbook (a flavour feature in our model — the arcanist has no discrete
    // spellbook slot), and the witch spell list replaces the arcanist's normal (arcane) list.
    spellcastingMod: { list: 'witch' },
    grants: [
      g(1, 'ua-familiar', 'Familiar', 'You store your spells in a familiar rather than a spellbook, gaining a familiar as a witch of your arcanist level. Anything that would add spells to your spellbook adds them to the familiar instead. Replaces spellbooks.'),
      g(1, 'ua-witch-magic', 'Witch Magic', 'You draw your spells from the witch spell list instead of the sorcerer/wizard list. Alters the arcanist’s spells.'),
    ],
  },
];

export const SLAYER_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'sniper', classId: 'slayer', name: 'Sniper',
    desc: 'A slayer who kills from the shadows at a distance — patient, precise, and gone before the body falls.',
    replaces: ['slay-track'],
    // Deadly Range takes the slayer talent gained at 2nd level.
    choices: {
      remove: ['slayer-talent'],
      add: [{ id: 'slayer-talent', label: 'Slayer talent', kind: 'list', count: 1, levels: [4, 6, 8], options: SLAYER_TALENTS }],
    },
    grants: [
      g(1, 'sniper-accuracy', 'Accuracy', 'Halve all range increment penalties when attacking with a bow, crossbow, or firearm. Replaces track.'),
      g(2, 'sniper-deadly-range', 'Deadly Range', 'Against a target within the first range increment who is unaware of you, ignore the 30-foot limit on ranged sneak attacks and add your slayer level to the sneak-attack damage. Replaces the 2nd-level slayer talent.'),
    ],
  },
];

export const ARCHETYPES: ArchetypeDef[] = [
  ...FIGHTER_ARCHETYPES, ...RANGER_ARCHETYPES, ...ROGUE_ARCHETYPES, ...BARBARIAN_ARCHETYPES, ...PALADIN_ARCHETYPES,
  ...BARD_ARCHETYPES, ...ALCHEMIST_ARCHETYPES, ...MAGUS_ARCHETYPES, ...MONK_ARCHETYPES, ...CLERIC_ARCHETYPES,
  ...CAVALIER_ARCHETYPES, ...INQUISITOR_ARCHETYPES, ...DRUID_ARCHETYPES, ...WIZARD_ARCHETYPES, ...WITCH_ARCHETYPES,
  ...SORCERER_ARCHETYPES, ...WARPRIEST_ARCHETYPES, ...BRAWLER_ARCHETYPES, ...INVESTIGATOR_ARCHETYPES,
  ...ORACLE_ARCHETYPES, ...BLOODRAGER_ARCHETYPES, ...SWASHBUCKLER_ARCHETYPES,
  ...HUNTER_ARCHETYPES, ...SUMMONER_ARCHETYPES, ...SKALD_ARCHETYPES, ...SHAMAN_ARCHETYPES, ...SHIFTER_ARCHETYPES,
  ...GUNSLINGER_ARCHETYPES, ...ARCANIST_ARCHETYPES, ...SLAYER_ARCHETYPES,
];
export const archetypeById = new Map(ARCHETYPES.map((a) => [a.id, a]));
export const archetypesForClass = (classId: string): ArchetypeDef[] => ARCHETYPES.filter((a) => a.classId === classId);
