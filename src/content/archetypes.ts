// Class archetypes (proof-of-concept scope: Fighter). Each archetype removes a set of the base
// class's features (`replaces`, by feature id) and grants alternates at set levels. Feature names,
// levels and the features they replace are verified against each archetype's d20pfsrd page;
// descriptions are paraphrased. Our fighter feature model treats Armor Training and Weapon Training
// as single features (ids fighter-armor-training / fighter-weapon-training), so an archetype that
// replaces "Armor Training 1–4" replaces that one id and grants its own abilities in their place.

import type { ArchetypeDef, LeveledFeatureDef } from './model';
import { ROGUE_TALENTS, ROGUE_ADVANCED_TALENTS, MAGUS_ARCANA, WITCH_HEXES } from './subsystems';

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

export const ARCHETYPES: ArchetypeDef[] = [
  ...FIGHTER_ARCHETYPES, ...RANGER_ARCHETYPES, ...ROGUE_ARCHETYPES, ...BARBARIAN_ARCHETYPES, ...PALADIN_ARCHETYPES,
  ...BARD_ARCHETYPES, ...ALCHEMIST_ARCHETYPES, ...MAGUS_ARCHETYPES,
];
export const archetypeById = new Map(ARCHETYPES.map((a) => [a.id, a]));
export const archetypesForClass = (classId: string): ArchetypeDef[] => ARCHETYPES.filter((a) => a.classId === classId);
