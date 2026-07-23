// Class archetypes (proof-of-concept scope: Fighter). Each archetype removes a set of the base
// class's features (`replaces`, by feature id) and grants alternates at set levels. Feature names,
// levels and the features they replace are verified against each archetype's d20pfsrd page;
// descriptions are paraphrased. Our fighter feature model treats Armor Training and Weapon Training
// as single features (ids fighter-armor-training / fighter-weapon-training), so an archetype that
// replaces "Armor Training 1–4" replaces that one id and grants its own abilities in their place.

import type { ArchetypeDef, LeveledFeatureDef } from './model';

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

export const ARCHETYPES: ArchetypeDef[] = [
  ...FIGHTER_ARCHETYPES, ...RANGER_ARCHETYPES, ...ROGUE_ARCHETYPES, ...BARBARIAN_ARCHETYPES, ...PALADIN_ARCHETYPES,
];
export const archetypeById = new Map(ARCHETYPES.map((a) => [a.id, a]));
export const archetypesForClass = (classId: string): ArchetypeDef[] => ARCHETYPES.filter((a) => a.classId === classId);
