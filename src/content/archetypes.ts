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
];

export const ARCHETYPES: ArchetypeDef[] = [
  ...FIGHTER_ARCHETYPES, ...RANGER_ARCHETYPES, ...ROGUE_ARCHETYPES, ...BARBARIAN_ARCHETYPES, ...PALADIN_ARCHETYPES,
  ...BARD_ARCHETYPES, ...ALCHEMIST_ARCHETYPES, ...MAGUS_ARCHETYPES, ...MONK_ARCHETYPES, ...CLERIC_ARCHETYPES,
  ...CAVALIER_ARCHETYPES, ...INQUISITOR_ARCHETYPES, ...DRUID_ARCHETYPES, ...WIZARD_ARCHETYPES, ...WITCH_ARCHETYPES,
  ...SORCERER_ARCHETYPES,
];
export const archetypeById = new Map(ARCHETYPES.map((a) => [a.id, a]));
export const archetypesForClass = (classId: string): ArchetypeDef[] => ARCHETYPES.filter((a) => a.classId === classId);
