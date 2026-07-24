// Class archetypes (proof-of-concept scope: Fighter). Each archetype removes a set of the base
// class's features (`replaces`, by feature id) and grants alternates at set levels. Feature names,
// levels and the features they replace are verified against each archetype's d20pfsrd page;
// descriptions are paraphrased. Our fighter feature model treats Armor Training and Weapon Training
// as single features (ids fighter-armor-training / fighter-weapon-training), so an archetype that
// replaces "Armor Training 1–4" replaces that one id and grants its own abilities in their place.

import type { ArchetypeDef, LeveledFeatureDef } from './model';
import { ROGUE_TALENTS, ROGUE_ADVANCED_TALENTS, MAGUS_ARCANA, WITCH_HEXES, ARCANIST_EXPLOITS, BARBARIAN_RAGE_POWERS, SLAYER_TALENTS, SLAYER_ADVANCED_TALENTS, SHAMAN_HEXES, INVESTIGATOR_TALENTS } from './subsystems';

// The advanced slayer-talent line lets you pick a basic or an advanced talent (mirrors class-features).
const SLAYER_TALENTS_ALL = [...SLAYER_TALENTS, ...SLAYER_ADVANCED_TALENTS];

const g = (level: number, id: string, name: string, desc: string): LeveledFeatureDef => ({ level, id, name, desc });

/** The ten Knowledge skills, for archetypes that hand out the whole family. */
const KNOW_ALL_SKILLS = [
  'know-arcana', 'know-dungeoneering', 'know-engineering', 'know-geography', 'know-history',
  'know-local', 'know-nature', 'know-nobility', 'know-planes', 'know-religion',
];

export const FIGHTER_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'polearm-master', classId: 'fighter', name: 'Polearm Master',
    desc: 'Schooled in the ancient wisdom that enemies are best faced at the end of a long striking pole, lashing like a serpent before swords can be brought to bear.',
    // Steadfast Pike alone replaces all four armor-training steps, which our progression models as
    // the single `fighter-armor-training` line.
    replaces: ['fighter-bravery', 'fighter-armor-training', 'fighter-weapon-training', 'fighter-armor-mastery'],
    grants: [
      g(2, 'pm-pole-fighting', 'Pole Fighting', 'As an immediate action, shorten your grip on a reach spear or polearm to strike adjacent targets at a −4 penalty until you spend another immediate action to return to a normal grip; the penalty lessens by 1 for every four levels beyond 2nd. Replaces bravery.'),
      g(3, 'pm-steadfast-pike', 'Steadfast Pike', '+1 on attack rolls with readied attacks and attacks of opportunity made with a spear or polearm, rising by +1 for every four levels beyond 3rd. Replaces armor training 1–4.'),
      g(5, 'pm-polearm-training', 'Polearm Training', '+1 on attack and damage rolls with spears and polearms, rising by +1 for every four levels beyond 5th. Replaces weapon training 1.'),
      g(9, 'pm-flexible-flanker', 'Flexible Flanker', 'Choose any square adjacent to you and treat it as your location for determining whom you flank. Replaces weapon training 2.'),
      g(13, 'pm-sweeping-fend', 'Sweeping Fend', 'Use a spear or polearm to trip or bull rush at range, and shove foes away from your reach. Replaces weapon training 3.'),
      g(17, 'pm-step-aside', 'Step Aside', 'Step 5 feet as an immediate action when a foe you threaten moves adjacent, gaining a dodge bonus to AC against it. Replaces weapon training 4.'),
      g(19, 'pm-polearm-parry', 'Polearm Parry', 'Interpose your weapon to give an adjacent ally a bonus to AC against an attacker who is not adjacent to you. Replaces armor mastery.'),
    ],
  },
  {
    id: 'archer', classId: 'fighter', name: 'Archer',
    desc: 'A fighter who has made the bow an extension of the eye — every arrow a considered, killing choice.',
    replaces: ['fighter-bravery', 'fighter-armor-training', 'fighter-weapon-training', 'fighter-armor-mastery'],
    grants: [
      g(2, 'archer-hawkeye', 'Hawkeye', 'Add to your ranged weapons’ range increments and gain a scaling bonus on ranged attack rolls. Replaces bravery.'),
      g(3, 'archer-trick-shot', 'Trick Shot', 'Perform disarm, feint, and sunder combat maneuvers (and more, as you level) at range with a bow. Replaces armor training.'),
      g(5, 'archer-expert-archer', 'Expert Archer', '+1 on attack and damage with ranged weapons, rising every four levels. Replaces weapon training 1.'),
      g(9, 'archer-safe-shot', 'Safe Shot', 'Firing your chosen bow no longer provokes attacks of opportunity. Replaces weapon training 2.'),
      g(13, 'archer-evasive', 'Evasive Archer', '+2 dodge AC against ranged attacks (+4 at 17th). Replaces weapon training 3.'),
      g(17, 'archer-volley', 'Volley', 'As a full-round action, make a ranged attack against every creature in a 15-foot-radius burst. Replaces weapon training 4.'),
      g(19, 'archer-ranged-defense', 'Ranged Defense', 'Gain DR against ranged attacks and catch or deflect one arrow per round. Replaces armor mastery.'),
    ],
  },
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
    id: 'freebooter', classId: 'ranger', name: 'Freebooter',
    desc: 'A pirate and natural leader who rallies a crew onto a single target rather than studying one kind of foe.',
    replaces: ['ranger-favored-enemy', 'ranger-hunters-bond', 'ranger-woodland-stride'],
    // Freebooter's Bond replaces hunter's bond outright, so the companion branch — and the creature
    // pick hanging off it — goes with it.
    choices: { remove: ['hunters-bond', 'ranger-companion'] },
    grants: [
      g(1, 'fb-freebooters-bane', "Freebooter's Bane", 'As a move action, mark an enemy: you and allies within 30 feet who can see or hear you gain +1 on weapon attack and damage rolls against it, rising by +1 at 5th level and every five levels after. It lasts until the target dies or you mark another. Replaces favored enemy.'),
      g(4, 'fb-freebooters-bond', "Freebooter's Bond", 'Spend a move action to grant your allies a share of your tactical sense, bonding a crew rather than a beast. Replaces hunter’s bond.'),
      g(7, 'fb-fast-swimmer', 'Fast Swimmer', 'Gain a swim speed, or a bonus to your existing one — a freebooter is at home over the side. Replaces woodland stride.'),
    ],
  },
  {
    id: 'guide', classId: 'ranger', name: 'Guide',
    desc: 'A ranger who knows one stretch of wild country better than anyone — and gets clients through it alive.',
    replaces: ['ranger-favored-enemy', 'ranger-hunters-bond', 'ranger-evasion', 'ranger-quarry', 'ranger-improved-quarry', 'ranger-improved-evasion'],
    grants: [
      g(1, 'guide-focus', 'Ranger’s Focus', 'Several times per day, focus on one target for a scaling bonus on attack and damage rolls against it. Replaces favored enemy.'),
      g(4, 'guide-terrain-bond', 'Terrain Bond', 'Grant allies a bonus on initiative, Perception, Stealth, and Survival while in a chosen terrain. Replaces hunter’s bond.'),
      g(9, 'guide-luck', 'Ranger’s Luck', 'Once per focus, reroll an attack roll or force a foe to reroll an attack against you. Replaces evasion.'),
      g(11, 'guide-inspired-moment', 'Inspired Moment', 'Once per day, take a moment of perfect action — extra move, full AC, sure hits — for one round. Replaces quarry and improved quarry.'),
      g(16, 'guide-improved-luck', 'Improved Ranger’s Luck', 'Your Ranger’s Luck reroll applies a larger bonus or penalty. Replaces improved evasion.'),
    ],
  },
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
    id: 'knife-master', classId: 'rogue', name: 'Knife Master',
    desc: 'A trained killer who specialises in the wave and weave of knife fighting — in her hands a dagger is a truly deadly instrument.',
    replaces: ['rogue-trapfinding', 'rogue-trap-sense'],
    grants: [
      g(1, 'km-hidden-blade', 'Hidden Blade', 'Add half your rogue level on Sleight of Hand checks made to conceal a light blade. Replaces trapfinding.'),
      g(1, 'km-sneak-stab', 'Sneak Stab', 'Sneak attacks with a dagger, kerambit, kukri, punching dagger, starknife, or swordbreaker dagger roll d8s instead of d6s; sneak attacks with every other weapon roll d4s. Supplements sneak attack.'),
      g(3, 'km-blade-sense', 'Blade Sense', '+1 dodge bonus to AC against attacks made with light blades, rising by +1 every three levels to +6 at 18th. Replaces trap sense.'),
    ],
  },
  {
    id: 'scout', classId: 'rogue', name: 'Scout',
    desc: 'A rogue who turns momentum into a weapon — striking hardest the instant she closes the distance.',
    replaces: ['rogue-uncanny-dodge', 'rogue-improved-uncanny-dodge'],
    grants: [
      g(4, 'scout-charge', 'Scout’s Charge', 'When you charge, the target is treated as flat-footed against your attack, letting you sneak attack it. Replaces uncanny dodge.'),
      g(8, 'scout-skirmisher', 'Skirmisher', 'If you move at least 10 feet, your attacks that round deal sneak attack damage as though the target were flat-footed. Replaces improved uncanny dodge.'),
    ],
  },
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
    id: 'armored-hulk', classId: 'barbarian', name: 'Armored Hulk',
    desc: 'A barbarian who disdains hides and leather for the heaviest of armors, even those forged by more civilised people, trading speed and instinct for protection and stability.',
    replaces: ['barb-fast-movement', 'barb-uncanny-dodge', 'barb-trap-sense', 'barb-improved-uncanny-dodge'],
    proficiencies: { armor: { add: ['heavy'] } },
    grants: [
      g(1, 'ah-indomitable-stance', 'Indomitable Stance', '+1 on combat maneuver checks and to CMD for overruns, on Reflex saves against trample, to AC against charges, and on attack and damage rolls against charging creatures. Replaces fast movement.'),
      g(2, 'ah-armored-swiftness', 'Armored Swiftness', 'Move 5 feet faster than normal in medium or heavy armor, to a maximum of your base speed. Replaces uncanny dodge.'),
      g(3, 'ah-resilience-of-steel', 'Resilience of Steel', 'While in heavy armor, +1 to AC against critical hit confirmation rolls, rising by +1 every three levels beyond 3rd (maximum +6 at 18th). Replaces trap sense.'),
      g(5, 'ah-improved-armored-swiftness', 'Improved Armored Swiftness', '+10 feet of land speed in any armor, including heavy, applied before any reduction for load or armor. Replaces improved uncanny dodge.'),
    ],
  },
  {
    id: 'titan-mauler', classId: 'barbarian', name: 'Titan Mauler',
    desc: 'A barbarian raised to fell giants — hefting weapons built for creatures far larger than herself.',
    replaces: ['barb-fast-movement', 'barb-uncanny-dodge', 'barb-trap-sense', 'barb-improved-uncanny-dodge', 'barb-indomitable-will'],
    grants: [
      g(1, 'tm-big-game-hunter', 'Big Game Hunter', '+1 on attack rolls and +2 on damage rolls against creatures larger than you. Replaces fast movement.'),
      g(2, 'tm-jotungrip', 'Jotungrip', 'Wield a two-handed melee weapon sized for you in one hand, taking a −2 penalty on attacks with it. Replaces uncanny dodge.'),
      g(3, 'tm-massive-weapons', 'Massive Weapons', 'Wield weapons up to two size categories larger than you with reduced penalties. Replaces trap sense.'),
      g(5, 'tm-evade-reach', 'Evade Reach', 'Once per rage, avoid an attack of opportunity provoked by moving into a foe’s threatened space. Replaces improved uncanny dodge.'),
      g(14, 'tm-titanic-rage', 'Titanic Rage', 'Once per rage, grow one size category (as enlarge person) for a few rounds. Replaces indomitable will.'),
    ],
  },
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
    id: 'sacred-servant', classId: 'paladin', name: 'Sacred Servant',
    desc: 'A paladin who dedicates herself wholly to a single deity, rewarded for her devotion with a domain and powerful celestial allies.',
    // Smite Evil and Aura of Resolve are traded away; the divine bond becomes a fixed holy-symbol
    // bond (no weapon/mount pick), so the divine-bond choice is removed — which also closes the
    // mount branch, since the paladin's bonded-mount pick requires divine-bond = mount.
    replaces: ['paladin-smite', 'paladin-aura-resolve'],
    choices: {
      remove: ['divine-bond'],
      add: [{ id: 'ss-domain', label: 'Domain', kind: 'cleric-domains', count: 1, levels: [4] }],
    },
    grants: [
      g(1, 'ss-smite-evil', 'Smite Evil', 'As the paladin ability, but you gain an additional daily use at 7th level and every six levels thereafter (rather than 4th and every three). Replaces smite evil.'),
      g(4, 'ss-domain', 'Domain', 'When you gain spells at 4th level, choose one domain your deity grants; your effective cleric level for it is your paladin level − 3. You gain one domain spell slot for each level of paladin spells you can cast, which you must fill with that domain’s spell. Adds a domain.'),
      g(5, 'ss-divine-bond', 'Divine Bond (holy symbol)', 'Your divine bond binds a celestial spirit to your holy symbol rather than a weapon or mount. Once per day (plus once per four levels beyond 5th), call the spirit for 1 minute per level; it grants one enhancement at 5th and one more per three levels — each spent on +1 caster level to a paladin spell, +1d6 channel energy, +1 to the DC of channelling against undead, or +1 daily use of lay on hands. Replaces divine bond.'),
      g(8, 'ss-call-celestial-ally', 'Call Celestial Ally', 'Once per week, cast lesser planar ally as a spell-like ability with no material cost (caster level equals your paladin level); this becomes planar ally at 12th and greater planar ally at 16th. Replaces aura of resolve.'),
    ],
  },
  {
    id: 'divine-defender', classId: 'paladin', name: 'Divine Defender',
    desc: 'A paladin who sees herself as the last line between the hordes of evil and the people who should never have to know they exist.',
    replaces: [],
    // Mercies are the price; the divine bond is redirected into armour rather than removed.
    choices: { remove: ['mercy'] },
    grants: [
      g(3, 'dd-shared-defense', 'Shared Defense', 'Spend a use of lay on hands as a standard action to grant all adjacent allies a +1 sacred bonus to AC, CMD and saving throws for rounds equal to your Charisma modifier, rising by +1 at 9th and 15th. At 6th level the range grows to 10 feet and dying allies in it stabilise; at 12th to 15 feet with immunity to bleed; at 18th to 20 feet with a 25% chance to negate any sneak attack or critical hit. Replaces mercy.'),
      g(5, 'dd-divine-bond-armor', 'Divine Bond (armor)', 'Your divine bond binds a spirit into your armor or shield rather than a weapon or a mount, granting it a +1 enhancement bonus at 5th level and more as you advance. Alters divine bond.'),
    ],
  },
  {
    id: 'undead-scourge', classId: 'paladin', name: 'Undead Scourge',
    desc: 'A paladin sworn against the walking dead — every smite a hammer brought down on unlife.',
    replaces: ['paladin-aura-resolve', 'paladin-aura-justice'],
    grants: [
      g(1, 'us-smite-undead', 'Smite Evil (Undead)', 'Your smite evil deals no extra damage against evil dragons or outsiders, but deals double its bonus damage against evil undead. Alters smite evil.'),
      g(8, 'us-aura-of-life', 'Aura of Life', 'A 10-foot aura gives undead a −4 penalty on Will saves against positive energy and stops them from healing via channeled negative energy. Replaces aura of resolve.'),
      g(11, 'us-undead-annihilation', 'Undead Annihilation', 'Expend a use of smite evil to make a melee attack that can destroy an undead outright (Will negates; DC 10 + ½ level + Cha). Replaces aura of justice.'),
    ],
  },
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
    id: 'magician', classId: 'bard', name: 'Magician',
    desc: 'A bard who dabbles in performance but sees it chiefly as a way to tap universal energies and channel them — a spellcaster first, an entertainer second.',
    replaces: [
      'bard-inspire-courage', 'bard-dirge-of-doom', 'bard-frightening-tune',
      'bard-knowledge', 'bard-countersong', 'bard-well-versed',
      'bard-versatile-performance', 'bard-lore-master', 'bard-jack-of-all-trades',
    ],
    grants: [
      g(1, 'mg-dweomercraft', 'Dweomercraft', 'A performance that grants allies +1 on caster level checks, concentration checks, and attack rolls with spells and spell-like abilities, rising by +1 at 5th level and every six levels after. Replaces inspire courage.'),
      g(1, 'mg-magical-talent', 'Magical Talent', 'Add half your bard level on Knowledge (arcana), Spellcraft, and Use Magic Device checks. Replaces bardic knowledge.'),
      g(1, 'mg-improved-counterspell', 'Improved Counterspell', 'Gain Improved Counterspell as a bonus feat. Replaces countersong.'),
      g(2, 'mg-extended-performance', 'Extended Performance', 'Sacrifice a spell slot as a swift action to make a bardic performance linger 1 extra round per level of the spell after you stop concentrating. Replaces well-versed.'),
      g(2, 'mg-expanded-repertoire', 'Expanded Repertoire', 'At 2nd level and every four levels after, add one spell of a level you can cast from any arcane class\u2019s list to your spells known. Replaces versatile performance.'),
      g(5, 'mg-arcane-bond', 'Arcane Bond', 'Gain the wizard\u2019s arcane bond, though never a familiar and never a weapon. Replaces lore master.'),
      g(8, 'mg-spell-suppression', 'Spell Suppression', 'A performance that lets you counter, as an immediate action, any spell you can identify whose level is no greater than the rounds you have been performing; a success ends the performance. Replaces dirge of doom.'),
      g(10, 'mg-wand-mastery', 'Wand Mastery', 'Use your Charisma to set the save DC of a wand holding a spell on your list, and from 16th level your own caster level in place of the wand\u2019s. Replaces jack of all trades.'),
      g(14, 'mg-metamagic-mastery', 'Metamagic Mastery', 'A performance that applies a metamagic feat to a spell without increasing its casting time, though you still expend the higher-level slot and the performance ends. Replaces frightening tune.'),
    ],
  },
  {
    id: 'court-bard', classId: 'bard', name: 'Court Bard',
    desc: 'The artist-in-residence of a noble house — a poised proclaimer whose wit cuts sharper than any blade, and whose gossip can start a riot.',
    replaces: [
      'bard-inspire-courage', 'bard-inspire-competence', 'bard-dirge-of-doom', 'bard-frightening-tune',
      'bard-knowledge', 'bard-lore-master', 'bard-jack-of-all-trades',
    ],
    grants: [
      g(1, 'court-satire', 'Satire', 'Your performance undermines enemies who hear it, imposing a scaling penalty on their attack and damage rolls and on saves against fear and charm. Replaces inspire courage.'),
      g(1, 'court-heraldic-expertise', 'Heraldic Expertise', 'Add half your bard level (minimum +1) on Diplomacy and Knowledge (history, local, nobility), and reroll one such check per day (more at 5th and every five levels). Replaces bardic knowledge.'),
      g(3, 'court-mockery', 'Mockery', 'Ridicule one target who can hear you, imposing a −2 penalty (worsening every four levels after 3rd) on its Charisma checks and Charisma-based skill checks. Replaces inspire competence.'),
      g(5, 'court-wide-audience', 'Wide Audience', 'Your area performances can affect a 60-foot cone instead of a 30-foot radius, growing every five levels beyond 5th (or affecting extra creatures). Replaces lore master and jack of all trades.'),
      g(8, 'court-glorious-epic', 'Glorious Epic', 'Enemies within 30 feet become flat-footed unless they succeed at a Will save; a save grants 24-hour immunity. Replaces dirge of doom.'),
      g(14, 'court-scandal', 'Scandal', 'Enemies within 30 feet are affected as by song of discord while they hear you; a Will save negates and grants 24-hour immunity. Replaces frightening tune.'),
    ],
  },
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
    id: 'mindchemist', classId: 'alchemist', name: 'Mindchemist',
    desc: 'An alchemist who turns the craft inward and upward — sharpening the mind and the memory at the cost of the body.',
    replaces: ['alch-mutagen', 'alch-poison-use'],
    grants: [
      g(1, 'mc-cognatogen', 'Cognatogen', 'Brew a cognatogen instead of a mutagen: it boosts a mental ability score at the cost of a physical one. You cannot make mutagens unless you take Mutagen as a discovery. Replaces mutagen.'),
      g(2, 'mc-perfect-recall', 'Perfect Recall', 'Add your Intelligence bonus a second time on every Knowledge check, and on Intelligence checks to remember something. Replaces poison use.'),
    ],
  },
  {
    id: 'chirurgeon', classId: 'alchemist', name: 'Chirurgeon',
    desc: 'An alchemist who studies anatomy to heal — extracts of cure spells flow to any ally, and death itself can be pushed back.',
    // Our alchemist models the whole poison-resistance→immunity line as one feature (alch-poison-resistance),
    // so Anaesthetic (which replaces poison resistance +4) and Power Over Death (which replaces poison
    // immunity) both map onto that single id; Infused Curative replaces poison use.
    replaces: ['alch-poison-use', 'alch-poison-resistance'],
    grants: [
      g(2, 'chir-infused-curative', 'Infused Curative', 'Your extracts of cure spells automatically act as infusions usable by non-alchemists, and you can render them inert when preparing extracts to reclaim the slots. Replaces poison use.'),
      g(5, 'chir-anaesthetic', 'Anaesthetic', 'Gain Skill Focus (Heal) as a bonus feat; any Heal check that risks harming the patient deals only minimum damage. Replaces poison resistance +4.'),
      g(10, 'chir-power-over-death', 'Power Over Death', 'Add breath of life to your formula book as a 4th-level extract, and your infused curative ability applies to it. Replaces poison immunity.'),
    ],
  },
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
    id: 'staff-magus', classId: 'magus', name: 'Staff Magus',
    desc: 'A lightly armoured magus who uses the quarterstaff as both defence and conduit, and in time learns to wield true arcane staves.',
    replaces: ['magus-medium-armor', 'magus-heavy-armor', 'magus-fighter-training'],
    // Simple weapons only — the staff magus gives up martial training for staff work.
    proficiencies: { weapons: { remove: ['martial'] } },
    grants: [
      g(1, 'sm-quarterstaff-master', 'Quarterstaff Master', 'Gain Quarterstaff Master as a bonus feat without meeting its prerequisites, usable in no armor or light armor. Alters the magus weapon and armor proficiencies.'),
      g(7, 'sm-quarterstaff-defense', 'Quarterstaff Defense', "While wielding a quarterstaff, gain a shield bonus to AC equal to the staff's enhancement bonus, including any from your arcane pool; at 13th level that bonus increases by +3. Replaces medium armor and heavy armor."),
      g(10, 'sm-staff-weapon', 'Staff Weapon', 'Wield a magic staff as a quarterstaff, drawing on its charges through your arcane pool. Replaces fighter training.'),
    ],
  },
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
    id: 'martial-artist', classId: 'monk', name: 'Martial Artist',
    desc: 'A master of pure form who pursues martial arts without the monastic traditions — and so never learns to harness ki.',
    // The archetype's defining trade: everything ki-powered goes, and with it the lawful requirement.
    alignment: null,
    replaces: [
      'monk-still-mind', 'monk-slow-fall', 'monk-ki-pool',
      'monk-purity-of-body', 'monk-diamond-body', 'monk-perfect-self',
      'monk-wholeness-of-body', 'monk-timeless-body', 'monk-tongue',
      'monk-abundant-step', 'monk-diamond-soul', 'monk-empty-body',
    ],
    grants: [
      g(3, 'ma-pain-points', 'Pain Points', '+1 on critical hit confirmation rolls, and +1 to the DC of your Stunning Fist and quivering palm. Replaces still mind.'),
      g(4, 'ma-martial-arts-master', 'Martial Arts Master', 'Use your monk level to qualify for feats with a fighter level prerequisite, when applied to unarmed strikes or monk weapons. Replaces slow fall.'),
      g(4, 'ma-exploit-weakness', 'Exploit Weakness', 'As a swift action, make a Wisdom check plus your monk level against 10 + hardness or CR; on a success gain +2 on attack rolls and ignore the target\u2019s DR or hardness until the end of your turn. Replaces ki pool.'),
      g(5, 'ma-extreme-endurance', 'Extreme Endurance', 'Immunity to fatigue at 5th, exhaustion at 10th, stunning at 15th, and death effects and energy drain at 20th. Replaces purity of body, diamond body and perfect self.'),
      g(7, 'ma-physical-resistance', 'Physical Resistance', 'Damage reduction that grows with your level, resisting the blows a monk would otherwise mend with ki. Replaces wholeness of body, timeless body, and tongue of the sun and moon.'),
      g(12, 'ma-bonus-feat', 'Bonus Feat', 'Gain a monk bonus feat. Replaces abundant step.'),
      g(13, 'ma-defensive-roll', 'Defensive Roll', 'Once per day, roll with a blow that would drop you: a Reflex save halves the damage. Replaces diamond soul.'),
      g(19, 'ma-greater-defensive-roll', 'Greater Defensive Roll', 'Use defensive roll one more time per day for every level above 15th, though only one may be in effect at a time. Replaces empty body.'),
    ],
  },
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
    id: 'divine-strategist', classId: 'cleric', name: 'Divine Strategist',
    desc: 'A cleric who reads a battlefield the way others read scripture — never caught unready, and worth more to the party than any burst of healing.',
    replaces: ['cleric-channel'],
    // A single domain, and the channel pool goes with the feature.
    choices: {
      remove: ['domains'],
      add: [{ id: 'domains', label: 'Domain', kind: 'cleric-domains', count: 1 }],
    },
    grants: [
      g(1, 'ds-master-tactician', 'Master Tactician', 'You may always act in a surprise round even if you failed to notice your enemies, though you are flat-footed until you act, and you gain a bonus on initiative equal to half your cleric level. Allies who can see and hear you gain a bonus equal to a quarter of it. At 20th your initiative roll is automatically a natural 20. Replaces channel energy.'),
      g(1, 'ds-caster-support', 'Caster Support', 'Use aid another to assist a divine spellcaster, granting +2 on caster level checks and concentration checks until the start of your next turn, rising by +1 at 4th level and every four levels after (maximum +7). Arcane casters and item users gain half that.'),
      g(8, 'ds-tactical-expertise', 'Tactical Expertise', 'Add your Intelligence bonus on attack rolls whenever you are flanking or making an attack of opportunity.'),
    ],
  },
  {
    id: 'merciful-healer', classId: 'cleric', name: 'Merciful Healer',
    desc: 'A master of battlefield revivification — one healing domain, positive channeling that cleanses conditions, and safer casting in the thick of the fight.',
    // Must take the Healing domain and gains no second domain (RAW forces the specific domain — we model
    // the count, not the identity), and must channel positive energy.
    replaces: [],
    choices: {
      remove: ['domains'],
      add: [{ id: 'domains', label: 'Domain (Healing)', kind: 'cleric-domains', count: 1 }],
    },
    grants: [
      g(1, 'mh-combat-medic', 'Combat Medic', 'You do not provoke attacks of opportunity when using the Heal skill to stabilize a creature or when casting healing spells.'),
      g(3, 'mh-merciful-healing', 'Merciful Healing', 'When you channel positive energy to heal, remove a chosen harmful condition (more conditions and targets at 6th, 9th, and 12th) from creatures in the burst. Paladin mercy feats and effects also apply.'),
      g(8, 'mh-true-healer', 'True Healer', 'When you channel to heal, choose either to apply merciful healing or to reroll any 1s on the healing dice (decide before rolling).'),
    ],
  },
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
  {
    id: 'ecclesitheurge', classId: 'cleric', name: 'Ecclesitheurge',
    desc: 'A priest who forgoes armor for the protection of faith alone, focusing on the miracles of a single deity and the breadth of that god’s dominion.',
    // Proficient only with club, dagger, heavy/light crossbow, and quarterstaff, and no armor or
    // shield at all. We don't model the non-proficiency attack penalty, so the meaningful change is
    // dropping every armor proficiency; the weapon narrowing is noted in the vow.
    proficiencies: { armor: { remove: ['light', 'medium', 'heavy', 'shield'] } },
    // Keeps both domains (Domain Mastery alters how they work rather than cutting one) and full
    // spellcasting, so nothing is replaced from the feature list.
    replaces: [],
    grants: [
      g(1, 'eccl-vow', "Ecclesitheurge's Vow", 'You vow to be protected by faith alone. While wearing any armor or using a shield you cannot use blessing of the faithful, cleric domain powers, or cast cleric spells. You are proficient only with the club, dagger, heavy and light crossbow, and quarterstaff. Replaces the cleric’s weapon and armor proficiencies.'),
      g(1, 'eccl-blessing-faithful', 'Blessing of the Faithful', 'As a standard action, bless an ally within close range to grant a +2 sacred (or profane) bonus on attack rolls, skill checks, ability checks, or saving throws, or to AC, until your next turn — expend one use of channel energy to extend it to a number of rounds equal to your channel dice.'),
      g(1, 'eccl-domain-mastery', 'Domain Mastery', 'When you choose your two domains, designate one primary and one secondary. You may prepare spells from your primary domain’s list in your normal spell slots, and each day may swap your secondary domain’s spell list for another domain your deity grants (keeping your actual secondary domain’s granted powers). Alters the domain ability.'),
      g(3, 'eccl-bonded-symbol', 'Bonded Holy Symbol', 'You form a bond with a holy symbol that functions as a wizard’s bonded object, but is used to cast your cleric and domain spells and can hold only holy-symbol or neck-slot magic.'),
    ],
  },
];

export const CAVALIER_ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'daring-champion', classId: 'cavalier', name: 'Daring Champion',
    desc: 'A younger, more flamboyant cavalier who trades the warhorse and the heavy plate for a swashbuckler\u2019s footwork and panache.',
    replaces: ['cav-mount', 'cav-charge', 'cav-expert-trainer', 'cav-mighty-charge', 'cav-supreme-charge'],
    // No mount at all: the creature pick goes with the feature.
    choices: { remove: ['mount'] },
    proficiencies: { armor: { remove: ['heavy'] } },
    grants: [
      g(1, 'dc-champions-finesse', "Champion's Finesse", 'Gain the benefit of Weapon Finesse with light or one-handed piercing melee weapons, use Charisma in place of Intelligence for combat feat prerequisites, and count as having Weapon Finesse for meeting requirements. Replaces mount.'),
      g(3, 'dc-nimble', 'Nimble', '+1 dodge bonus to AC in light or no armor and no more than a light load, rising by +1 for every four levels beyond 3rd (maximum +5 at 19th). Lost whenever you lose your Dexterity bonus to AC. Replaces cavalier\u2019s charge.'),
      g(4, 'dc-panache-deeds', 'Panache and Deeds', "Gain the swashbuckler's panache, along with the dodging panache, precise strike and swashbuckler initiative deeds. Replaces expert trainer."),
      g(11, 'dc-advanced-deeds', 'Advanced Deeds', 'Gain the superior feint, targeted strike and swashbuckler\u2019s edge deeds. Replaces mighty charge.'),
      g(20, 'dc-champions-weapon-mastery', "Champion's Weapon Mastery", 'Your chosen weapon crits more readily and ignores damage reduction. Replaces supreme charge.'),
    ],
  },
  {
    id: 'beast-rider', classId: 'cavalier', name: 'Beast Rider',
    desc: 'A cavalier who spends his life seeking ever more exotic and powerful mounts — riding to war on a dinosaur or a mammoth rather than a warhorse.',
    replaces: ['cav-mount', 'cav-expert-trainer'],
    // A beast rider gives up heavy armor (light, medium and shields only).
    proficiencies: { armor: { remove: ['heavy'] } },
    grants: [
      g(1, 'br-exotic-mount', 'Exotic Mount', 'Bond with an exotic mount that functions as a druid’s animal companion using your cavalier level as your effective druid level, always combat trained and starting with Endurance as a bonus feat (it gains no share spells). Larger and more impressive mounts unlock at 4th and 7th level, and you may trade up each time you gain a level. Replaces mount and expert trainer.'),
    ],
  },
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
    id: 'abolisher', classId: 'inquisitor', name: 'Abolisher',
    desc: 'An incorruptible inquisitor who hunts the alien and the unnatural, exposing aberrations for what they are.',
    replaces: ['inq-stern-gaze', 'inq-detect-alignment'],
    grants: [
      g(1, 'ab-sworn-to-purity', 'Sworn to Purity', 'You must select the Air, Animal, Earth, Fire, Plant, Water, or Weather domain. Changing to a deity offering none of them costs you the archetype. Alters domains.'),
      g(1, 'ab-revealing-gaze', 'Revealing Gaze', 'Gain a morale bonus equal to half your inquisitor level (minimum +1) on opposed Perception checks against Disguise and Stealth, and grant that bonus to all adjacent allies. Replaces stern gaze.'),
      g(2, 'ab-expose-aberration', 'Expose Aberration', 'Use detect aberration at will, and know on a weapon hit whether the creature is an aberration. From 5th level you may activate bane as an immediate action after hitting an aberration but before damage is rolled. Replaces detect alignment and alters bane.'),
      g(5, 'ab-escape-corruptions-grasp', "Escape Corruption's Grasp", 'For rounds per day equal to your inquisitor level, ignore impediments to movement as freedom of movement.'),
    ],
  },
  {
    id: 'spellbreaker', classId: 'inquisitor', name: 'Spellbreaker',
    desc: 'An inquisitor who has learned to wade through hostile magic — reading a school’s workings well enough to shrug it off, and to foul a caster mid-word.',
    replaces: ['inq-monster-lore', 'inq-solo-tactics', 'inq-true-judgment'],
    // Defense against Magic replaces *all* the inquisitor's bonus teamwork feats.
    bonusFeatSlots: { remove: [3, 6, 9, 12, 15, 18] },
    grants: [
      g(1, 'sbr-strong-willed', 'Strong-Willed', 'Roll twice and take the better result on Will saves against mind-affecting effects. Replaces monster lore.'),
      g(3, 'sbr-defense-against-magic', 'Defense against Magic', 'Pick a wizard school for a +1 bonus on saves against arcane spells of that school; every four levels beyond 3rd pick another school (up to five at 19th) and increase the bonus for each school already chosen by 1. Replaces all bonus teamwork feats.'),
      g(3, 'sbr-foil-casting', 'Foil Casting', 'Casting defensively in your threatened area costs arcane casters +2 DC (stacking with Disruptive), and hitting an arcane caster with a ranged attack raises its concentration DCs by 2 for 1 round. Replaces solo tactics.'),
      g(20, 'sbr-impervious', 'Impervious', 'Become immune to your first chosen school of arcane magic — helpful or harmful — and once per day grant that imperviousness to allies in a 60-foot burst for 1 minute. Replaces true judgment.'),
    ],
  },
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
    id: 'storm-druid', classId: 'druid', name: 'Storm Druid',
    desc: 'A druid whose eyes have ever been cast to the sky rather than the earth, channelling the rawest and most untamed aspects of nature.',
    replaces: ['druid-woodland-stride', 'druid-trackless-step', 'druid-venom-immunity', 'druid-thousand-faces'],
    // A storm druid may not take an animal companion at all: Nature Bond becomes a domain-only
    // choice, which drops the companion branch (and with it the creature pick that hangs off it).
    choices: {
      remove: ['nature-bond', 'animal-companion'],
      add: [{
        id: 'nature-bond', label: 'Nature Bond (storm)', kind: 'list', count: 1,
        options: [{ id: 'domain', name: 'Air or Weather Domain', desc: 'Take the Air or Weather domain, or the Cloud, Storm, or Wind subdomain. A storm druid may not choose an animal companion.' }],
      }],
    },
    grants: [
      g(2, 'sd-windwalker', 'Windwalker', 'Penalties from natural or magical wind effects are treated as one step less severe. Replaces woodland stride.'),
      g(3, 'sd-stormvoice', 'Stormvoice', 'Your voice carries over howling wind and thunder: any Perception DC to hear you is reduced by your druid level. Replaces trackless step.'),
      g(4, 'sd-eyes-of-the-storm', 'Eyes of the Storm', 'See through 10 feet of magical fog, mist, gas, wind, rain or similar weather, ignoring the concealment it grants; +5 feet for every four levels beyond 4th. Replaces resist nature\u2019s lure.'),
      g(9, 'sd-windlord', 'Windlord', 'Select another domain or subdomain from those your nature bond makes available. Replaces venom immunity.'),
      g(13, 'sd-storm-lord', 'Storm Lord', 'Unaffected by natural and magical wind, immune to deafness, and +2 on saving throws against sonic effects. Replaces a thousand faces.'),
    ],
  },
  {
    id: 'cave-druid', classId: 'druid', name: 'Cave Druid',
    desc: 'A guardian of the lightless world below — at home in crawlspaces and cavern dark, and sworn against the horrors that creep up from deeper still.',
    replaces: ['druid-nature-sense', 'druid-woodland-stride', 'druid-trackless-step', 'druid-resist-natures-lure', 'druid-wild-shape'],
    // Cavesense swaps Knowledge (geography) for Knowledge (dungeoneering).
    classSkills: { add: ['know-dungeoneering'], remove: ['know-geography'] },
    grants: [
      g(1, 'cave-cavesense', 'Cavesense', 'Knowledge (dungeoneering) is a class skill instead of Knowledge (geography), and you gain +2 on Knowledge (dungeoneering) and Survival checks. Replaces nature sense.'),
      g(2, 'cave-tunnelrunner', 'Tunnelrunner', 'Move through rubble and passages that require squeezing at your normal speed and without penalty. Replaces woodland stride.'),
      g(3, 'cave-lightfoot', 'Lightfoot', 'You cannot be detected by tremorsense. Replaces trackless step.'),
      g(4, 'cave-resist-corruption', 'Resist Subterranean Corruption', '+2 on saves against the extraordinary, supernatural, and spell-like abilities of oozes and aberrations. Replaces resist nature’s lure.'),
      g(6, 'cave-wild-shape', 'Wild Shape (cave)', 'Gain wild shape at 6th level using your druid level −2, and you cannot take plant forms. From 10th you can become a Small or Medium ooze (beast shape III) and from 12th a Tiny or Large ooze (beast shape IV); in ooze form you are immune to poison, sneak attacks, and critical hits. Also: your nature bond may take the Darkness domain but not Air or Weather, and your wild empathy influences oozes at −4 rather than magical beasts.'),
    ],
  },
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
    id: 'exploiter-wizard', classId: 'wizard', name: 'Exploiter Wizard',
    desc: 'A wizard who forgoes arcane focus and school study for the exploits an arcanist favours — blatant exploitation of arcane magic that traditionalists call cheating.',
    replaces: ['wizard-arcane-bond', 'wizard-arcane-school'],
    // Losing arcane bond takes the familiar branch with it; losing the school takes the opposition
    // schools and the specialist's restricted bonus slot.
    choices: {
      remove: ['arcane-bond', 'familiar', 'school', 'opposition'],
      add: [{ id: 'exploit', label: 'Arcanist exploit', kind: 'list', count: 1, levels: [1, 5, 9, 13, 17], options: ARCANIST_EXPLOITS }],
    },
    grants: [
      g(1, 'ew-arcane-reservoir', 'Arcane Reservoir', "Gain the arcanist's arcane reservoir, using your wizard level as your arcanist level to size it. Replaces arcane bond."),
      g(1, 'ew-exploiter-exploit', 'Exploiter Exploit', 'At 1st level and every four levels after, gain an arcanist exploit, using your wizard level as your arcanist level for its effects and DCs. Replaces arcane school.'),
    ],
  },
  {
    id: 'spell-sage', classId: 'wizard', name: 'Spell Sage',
    desc: 'A wizard who studies spells themselves rather than any one school — pushing a formula past its limits, and eventually borrowing from other traditions entirely.',
    replaces: ['wizard-arcane-bond', 'wizard-arcane-school'],
    // No school at all, so the opposition-school picks go with it (and, via the engine's choice-removal
    // guard, so do the school powers and the specialist bonus slot).
    choices: { remove: ['arcane-bond', 'school', 'opposition'] },
    grants: [
      g(1, 'sage-focused-spells', 'Focused Spells', 'Once per day (twice at 8th, three times at 16th), increase your caster level by 4 for a single spell as you cast it. Replaces arcane bond.'),
      g(2, 'sage-spell-study', 'Spell Study', 'Once per day, spontaneously cast any bard, cleric, or druid spell as a wizard spell you knew and had prepared, spending 1 full round per spell level and expending two prepared spells of that level or higher. One additional use at 6th and every five levels thereafter (four per day at 16th). Replaces arcane school.'),
    ],
  },
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
    id: 'white-haired-witch', classId: 'witch', name: 'White-Haired Witch',
    desc: 'A witch who turns her mysterious power outward into her own prehensile hair, fighting in melee where other witches would hex from afar.',
    replaces: ['witch-hex-feature', 'witch-major-hex', 'witch-grand-hex'],
    // White Hair takes the *1st-level* hex only; the hex line at even levels continues. Removing
    // the shared id drops both, so the recurring line is re-added without its level-1 grant.
    choices: {
      remove: ['hex'],
      add: [{ id: 'hex', label: 'Hex', kind: 'list', count: 1, levels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], options: WITCH_HEXES }],
    },
    grants: [
      g(1, 'whw-white-hair', 'White Hair', 'Your hair is a primary natural attack with 5 feet of reach, dealing 1d4 damage (1d3 if Small) plus your Intelligence modifier. On a hit you may grapple as a free action using Intelligence in place of Strength, without becoming grappled yourself. The reach grows by 5 feet at 4th level and every four levels after, to 30 feet at 20th. (The attack line itself is not yet computed — class features cannot carry a natural attack.) Replaces the 1st-level hex.'),
      g(2, 'whw-constrict', 'Constrict', 'When your hair grapples a foe it can constrict as a swift action, dealing its attack damage again.'),
      g(4, 'whw-trip', 'Trip', 'A successful hair strike lets you attempt a trip combat maneuver as a swift action.'),
      g(6, 'whw-pull', 'Pull', 'A successful hair strike lets you attempt to drag the target closer as a swift action.'),
      g(10, 'whw-greater-white-hair', 'Greater White Hair', 'Your mastery of the hair deepens in place of the major hexes other witches learn. Replaces major hex.'),
      g(18, 'whw-supreme-white-hair', 'Supreme White Hair', 'The hair reaches its full lethal potential in place of the grand hexes. Replaces grand hex.'),
    ],
  },
  {
    id: 'gravewalker', classId: 'witch', name: 'Gravewalker',
    desc: 'A witch whose patron is death itself — she binds the dead as thralls and wears corpses like gloves.',
    replaces: [],
    // Aura of Desecration / Bonethrall / Possess Undead take the hexes at 1st, 4th, and 8th; re-add the
    // rest of the recurring hex line (the 1st-level hex is gone entirely).
    choices: {
      remove: ['hex'],
      add: [{ id: 'hex', label: 'Hex', kind: 'list', count: 1, levels: [2, 6, 10, 12, 14, 16, 18, 20], options: WITCH_HEXES }],
    },
    grants: [
      g(1, 'gw-aura-desecration', 'Aura of Desecration', 'Emit a 20-foot aura that functions as desecrate, strengthening the undead you command. Replaces the 1st-level hex.'),
      g(3, 'gw-spell-poppet', 'Spell Poppet', 'Your familiar is a small effigy that stores your spells and through which you deliver touch spells. Replaces the witch’s familiar.'),
      g(4, 'gw-bonethrall', 'Bonethrall', 'Seize control of an undead creature, binding it to your will as a thrall. Replaces the 4th-level hex.'),
      g(8, 'gw-possess-undead', 'Possess Undead', 'Project your consciousness into an undead you control, acting through its body. Replaces the 8th-level hex.'),
    ],
  },
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
    id: 'seeker-sorcerer', classId: 'sorcerer', name: 'Seeker',
    desc: 'A sorcerer obsessed with the genesis of their own power, ransacking ancient texts and obscure ruins for clues to their bloodline.',
    replaces: ['sorc-eschew'],
    // Seeker Lore and Seeker Magic take the bloodline powers at 3rd and 15th — those come from the
    // chosen bloodline via sourceFeatures, not the class feature list, so they are suppressed.
    suppressSourcePowers: [{ prefix: 'sorc-bl', levels: [3, 15] }],
    classSkills: { add: ['disable-device'] },
    grants: [
      g(1, 'sk-tinkering', 'Tinkering', 'Disable Device becomes a class skill; add half your sorcerer level (minimum +1) on Perception checks to locate traps and on all Disable Device checks, and you can disarm magical traps. Levels in a class with trapfinding stack with your sorcerer levels for this. Replaces the bonus Eschew Materials feat.'),
      g(3, 'sk-seeker-lore', 'Seeker Lore', 'Your study of your own bloodline grants mastery of its magic: add your sorcerer level on caster level checks to overcome spell resistance with bloodline spells, and Knowledge (arcana) becomes a class skill. Replaces the 3rd-level bloodline power.'),
      g(15, 'sk-seeker-magic', 'Seeker Magic', 'Bloodline spells you cast gain the benefit of a metamagic feat you know without increasing their level or casting time, a limited number of times per day. Replaces the 15th-level bloodline power.'),
    ],
  },
  {
    id: 'crossblooded', classId: 'sorcerer', name: 'Crossblooded',
    desc: 'Heir to two distinct bloodlines whose divergent powers war within — greater reach, at the cost of clarity and focus.',
    replaces: [],
    // Two bloodlines instead of one: the class-skill loop and picker both read every bloodline pick,
    // so raising the count grants both class skills and lets the player record both heritages. Bloodline
    // powers stay one-per-level (RAW: you pick one of the two at each bloodline-power level), so the
    // engine's single injected line — the first bloodline's powers — is one legal set of those picks.
    choices: {
      remove: ['bloodline'],
      add: [{ id: 'bloodline', label: 'Bloodlines (choose two)', kind: 'sorcerer-bloodline', count: 2 }],
    },
    // Drawback: one fewer spell known of every level *including cantrips*, and −2 on Will saves.
    spellcastingMod: { diminishedKnown: true },
    grants: [
      {
        level: 1, id: 'crossblooded-divergent', name: 'Divergent Heritage',
        desc: 'You draw on two bloodlines: gain the class skill and bloodline arcana of both, choose bloodline bonus spells, feats, and powers from either, but always take a −2 penalty on Will saves and know one fewer spell of every level (cantrips included).',
        effects: [{ target: 'save:will', type: 'untyped', value: -2, note: 'Crossblooded (divergent heritage)' }],
      },
    ],
  },
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
    id: 'forgepriest', classId: 'warpriest', name: 'Forgepriest',
    desc: 'An armorer of exquisite skill who takes inspiration from their deity to equip the armies of the faithful.',
    replaces: ['wp-channel'],
    // One blessing rather than two, and the bonus feats at 3rd and 6th are spent on the forge.
    choices: {
      remove: ['blessings'],
      add: [{ id: 'blessings', label: 'Blessing', kind: 'warpriest-blessings', count: 1 }],
    },
    bonusFeatSlots: { remove: [3, 6] },
    grants: [
      g(1, 'fp-smiths-spells', "Smith's Spells", 'Add jury rig and shield (1st), heat metal and shatter (2nd), keen edge, quench and versatile weapon (3rd), wreath of blades (4th), fabricate and major creation (5th), and mage’s sword (6th) to your spell list. You select only one blessing. Alters blessings.'),
      g(2, 'fp-forge-mastery', 'Forge Mastery', 'Add half your warpriest level on all Craft checks to make metal items, armor and weapons. You may also take item creation feats when you gain a bonus feat. Alters bonus feats.'),
      g(3, 'fp-craft-magic-arms', 'Craft Magic Arms and Armor', 'Gain Craft Magic Arms and Armor as a bonus feat. Replaces the 3rd-level bonus feat.'),
      g(4, 'fp-creators-bond', "Creator's Bond", 'Your sacred weapon ability extends to armor and shields you have made yourself. Replaces channel energy.'),
      g(6, 'fp-forge-forged', 'Forge-Forged', 'Gain fire resistance 5, rising to 10 at 13th level. Replaces the 6th-level bonus feat.'),
    ],
  },
  {
    id: 'divine-commander', classId: 'warpriest', name: 'Divine Commander',
    desc: 'A warpriest who leads armies from the saddle — trading personal blessings and bonus feats for a blessed mount and battlefield command.',
    replaces: ['wp-blessings'],
    // Mount replaces blessings (the feature and its two-blessing pick). Battle Tactician, Blessed Mount,
    // Greater Battle Tactician and Bless Army replace the bonus feats at 3rd/6th/12th/15th (9th and 18th
    // bonus feats are kept).
    choices: { remove: ['blessings'] },
    bonusFeatSlots: { remove: [3, 6, 12, 15] },
    grants: [
      g(1, 'dc-mount', 'Mount', 'Gain a loyal steed as a druid’s animal companion using your warpriest level as your effective druid level. Replaces blessings.'),
      g(3, 'dc-battle-tactician', 'Battle Tactician', 'Gain a teamwork feat as a bonus feat; as a standard action, grant it to all allies within 30 feet who can see and hear you for several rounds. Usable 1/day, plus once more at 9th and 15th. Replaces the 3rd-level bonus feat.'),
      g(6, 'dc-blessed-mount', 'Blessed Mount', 'Your mount gains the celestial, entropic, fiendish, or resolute template matching your deity’s alignment (or spell resistance and energy resistance if your deity is neutral). Replaces the 6th-level bonus feat.'),
      g(12, 'dc-greater-battle-tactician', 'Greater Battle Tactician', 'Gain a second teamwork feat as a bonus feat you can grant with battle tactician, and using battle tactician becomes a swift action. Replaces the 12th-level bonus feat.'),
      g(15, 'dc-bless-army', 'Bless Army', 'Expend two uses of fervor during the tactics phase to grant your army a +1 sacred or profane bonus to its OM and DV for one battle. Replaces the 15th-level bonus feat.'),
    ],
  },
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
    id: 'wild-child', classId: 'brawler', name: 'Wild Child',
    desc: 'A brawler raised alongside animals — or by them — who fights beside a sworn animal friend instead of collecting combat feats.',
    replaces: ['brawl-close-weapon-mastery'],
    // Every brawler bonus feat goes: 2/8/14/20 pay for the companion, 5/11/17 for the tricks.
    bonusFeatSlots: { remove: [2, 5, 8, 11, 14, 17, 20] },
    classSkills: { add: ['heal'] },
    choices: {
      add: [{ id: 'animal-companion', label: 'Animal Companion', kind: 'companion', companionKind: 'animal', count: 1 }],
    },
    companions: [{ choiceId: 'animal-companion', kind: 'animal', label: 'Animal Companion' }],
    grants: [
      g(1, 'wc-animal-companion', 'Animal Companion', 'Bond with any animal available to a druid, using your brawler level as your effective druid level. Replaces the bonus combat feats at 2nd, 8th, 14th and 20th.'),
      g(5, 'wc-hunters-tricks', "Hunter's Tricks", "Expend a use of martial flexibility to use a skirmisher ranger's hunter trick, choosing a different one each time. No trick that relies on ranged attacks may be chosen. Replaces close weapon mastery."),
      g(5, 'wc-wild-tricks', 'Wild Tricks', 'Your companion learns a trick matching each maneuver you train in, and you gain further tricks in place of feats. Replaces the bonus combat feats at 5th, 11th and 17th.'),
    ],
  },
  {
    id: 'exemplar', classId: 'brawler', name: 'Exemplar',
    desc: 'A brawler who leads by example — her prowess an inspiration that lifts everyone fighting beside her.',
    replaces: ['brawl-unarmed', 'brawl-close-weapon-mastery', 'brawl-maneuver-training', 'brawl-ac-bonus'],
    grants: [
      g(1, 'ex-call-to-arms', 'Call to Arms', 'Gain a scaling bonus with a chosen group of weapons rather than relying on unarmed strikes. Replaces unarmed strike and close weapon mastery.'),
      g(3, 'ex-inspiring-prowess', 'Inspiring Prowess', 'Use bardic performance — inspire courage (3rd), inspire greatness (11th), and inspire heroics (15th) — with rounds per day based on Charisma. Replaces maneuver training and AC bonus.'),
      g(5, 'ex-field-instruction', 'Field Instruction', 'As a standard action, grant a teamwork feat to allies within 30 feet, usable more times per day as you level. Replaces brawler’s strike.'),
    ],
  },
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
    id: 'profiler', classId: 'investigator', name: 'Profiler',
    desc: 'An investigator who reads the criminal rather than the crime scene, predicting a quarry from the shape of its mind.',
    replaces: ['inv-trapfinding', 'inv-poison-lore', 'inv-trap-sense', 'inv-swift-alchemy'],
    choices: {
      remove: ['investigator-talent'],
      add: [{ id: 'investigator-talent', label: 'Investigator talent', kind: 'list', count: 1, levels: [3, 5, 9, 11, 13, 15, 17, 19], options: INVESTIGATOR_TALENTS }],
    },
    grants: [
      g(1, 'pf-expert-profiler', 'Expert Profiler', 'Add half your class level (minimum +1) on Sense Motive checks. From 2nd level you may use inspiration on any Sense Motive check without expending a use. From 3rd level you can predict the movements of a creature familiar to you, tracking it from a place it has been with a Sense Motive check. Replaces trapfinding, poison lore and trap sense.'),
      g(2, 'pf-divination-analysis', 'Divination Analysis', 'Your study of the mind sharpens your divinations, letting you draw more from each one than the reading alone would give. Replaces poison resistance and poison immunity.'),
      g(4, 'pf-blood-sleuth', 'Blood Sleuth', 'Read the traces a creature leaves behind as a spell-like ability, following a quarry by what it sheds. Replaces swift alchemy.'),
      g(7, 'pf-pack-psychology', 'Pack Psychology', 'Turn your read of a group against it, unsettling every member at once. Replaces the 7th-level investigator talent.'),
    ],
  },
  {
    id: 'mastermind', classId: 'investigator', name: 'Mastermind',
    desc: 'An investigator who works through contacts and cunning — pulling strings others never see.',
    replaces: ['inv-trapfinding', 'inv-trap-sense', 'inv-swift-alchemy'],
    // Impregnable Mind takes the investigator talent gained at 9th level; re-add the rest of the line.
    choices: {
      remove: ['investigator-talent'],
      add: [{ id: 'investigator-talent', label: 'Investigator talent', kind: 'list', count: 1, levels: [3, 5, 7, 11, 13, 15, 17, 19], options: INVESTIGATOR_TALENTS }],
    },
    grants: [
      g(1, 'mm-inspiration', 'Mastermind’s Inspiration', 'You can use inspiration on Bluff, Diplomacy, Intimidate, Knowledge, and Sense Motive checks without expending a use. Alters inspiration.'),
      g(1, 'mm-quiet-word', 'A Quiet Word', 'Call on a web of contacts to gather information and pull favors in any settlement. Replaces trapfinding and trap sense.'),
      g(4, 'mm-defense', 'Mastermind’s Defense', 'Gain a bonus to AC and saves against foes you have studied or identified. Replaces swift alchemy.'),
      g(9, 'mm-impregnable-mind', 'Impregnable Mind', 'Gain powerful defenses against mind-affecting effects. Replaces the 9th-level investigator talent.'),
    ],
  },
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
    id: 'spirit-guide', classId: 'oracle', name: 'Spirit Guide',
    desc: 'An oracle who bargains with wandering spirits, borrowing a different one each day in place of the revelations her mystery would grant.',
    replaces: [],
    classSkills: { add: [...KNOW_ALL_SKILLS] },
    // Bonded Spirit takes the revelations at 3rd, 7th and 15th; the rest of the line stays.
    choices: {
      remove: ['revelation'],
      add: [{ id: 'revelation', label: 'Revelation', kind: 'oracle-revelation', count: 1, levels: [1, 11, 19] }],
    },
    grants: [
      g(3, 'sg-bonded-spirit', 'Bonded Spirit', "Each day when you refresh your spells, bond with a spirit as a shaman's wandering spirit and gain one hex from its list, using your oracle level as your shaman level and Charisma in place of Wisdom. At 4th level you add its spirit magic spells to your spells known for the day; at 7th you gain its spirit ability; at 15th its greater spirit ability. You cannot bond with a spirit incompatible with your alignment or mystery. Replaces the revelations at 3rd, 7th and 15th."),
    ],
  },
  {
    id: 'dual-cursed', classId: 'oracle', name: 'Dual-Cursed Oracle',
    desc: 'An oracle who bears two curses and, in exchange, twists fate itself — forcing rerolls on friend and foe alike.',
    // Two curses and the Misfortune/Fortune revelations (added to the revelation list, not modelled as a
    // separate subsystem). The modelled cost/benefit: no additional revelation cost, but two extra
    // revelation picks at 5th and 13th on top of the normal line. (RAW also swaps three mystery bonus
    // spells and grants no mystery class skills — not modelled here.)
    replaces: [],
    choices: {
      add: [{ id: 'revelation', label: 'Revelation (dual-cursed bonus)', kind: 'oracle-revelation', count: 1, levels: [5, 13] }],
    },
    grants: [
      g(1, 'dc-dual-curse', 'Dual Curse', 'Choose two oracle’s curses at 1st level; one (your choice) never advances its abilities as you level, while the other progresses normally. You may take Misfortune (force a nearby creature to reroll a d20) and Fortune (reroll one of your own d20s) in place of mystery revelations.'),
    ],
  },
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
    id: 'primalist', classId: 'bloodrager', name: 'Primalist',
    desc: 'A bloodrager who leavens raw bloodline power with the older, more primal wisdom of the raging tribes.',
    replaces: [],
    // Primal Choices: at 4/8/12/16/20 the primalist keeps that level's bloodline power OR takes two
    // barbarian rage powers instead. The per-level pick decides the swap; the 1st-level bloodline
    // power is never touched.
    conditionalSuppress: [{ prefix: 'br-bl', levels: [4, 8, 12, 16, 20], choiceId: 'primal-choice', swapValue: 'rage-powers' }],
    choices: {
      add: [
        { id: 'primal-choice', label: 'Primal choice', kind: 'list', count: 1, levels: [4, 8, 12, 16, 20],
          options: [
            { id: 'bloodline', name: 'Keep the bloodline power', desc: 'Gain the bloodline power you would normally receive at this level.' },
            { id: 'rage-powers', name: 'Take two rage powers', desc: 'Forgo this level’s bloodline power to select two barbarian rage powers instead (your bloodrager level counts as your barbarian level).' },
          ] },
        { id: 'primal-rage-power', label: 'Rage power', kind: 'list', count: 2, levels: [4, 8, 12, 16, 20],
          requiresPerLevel: { choiceId: 'primal-choice', value: 'rage-powers' }, options: BARBARIAN_RAGE_POWERS },
      ],
    },
    grants: [
      g(1, 'primalist-primal-choices', 'Primal Choices', 'At 4th level and every four levels thereafter, choose to gain your bloodline power for that level or instead select two barbarian rage powers. Rage powers chosen this way work during your bloodrage, using your bloodrager level as your barbarian level; you cannot take a rage power that requires a rage class feature or a specific bloodline, and this ability does not count as the rage power class feature for prerequisites. Alters the bloodline class feature.'),
    ],
  },
  {
    id: 'bloodrider', classId: 'bloodrager', name: 'Bloodrider',
    desc: 'A bloodrager who fights from the saddle, channelling arcane fury straight into a feral mount.',
    replaces: ['br-fast-movement', 'br-uncanny-dodge', 'br-improved-uncanny-dodge'],
    bonusFeatSlots: { remove: [9] },
    choices: {
      add: [{ id: 'feral-mount', label: 'Feral Mount', kind: 'companion', companionKind: 'animal', count: 1, levels: [5] }],
    },
    // The feral mount uses the bloodrager's level − 4, so it arrives at 5th as a 1st-level companion.
    companions: [{ choiceId: 'feral-mount', kind: 'animal', label: 'Feral Mount', levelOffset: 4, minLevel: 5 }],
    grants: [
      g(1, 'brd-fast-rider', 'Fast Rider', 'Any mount you ride has its speed increased by 10 feet. Replaces fast movement.'),
      g(5, 'brd-feral-mount', 'Feral Mount', "Gain a feral mount that functions as a druid's animal companion, using your bloodrager level − 4 as your effective druid level. It must be a creature you can ride. While you are bloodraging it gains a +2 morale bonus to Strength. Replaces uncanny dodge and improved uncanny dodge."),
      g(9, 'brd-blood-bond', 'Blood Bond', 'While bloodraging and mounted, your feral mount shares every immunity and resistance your bloodline powers grant you, and any personal-range spell you cast also affects it. Replaces the 9th-level bloodline feat.'),
    ],
  },
  {
    id: 'metamagic-rager', classId: 'bloodrager', name: 'Metamagic Rager',
    desc: 'A bloodrager who bends his fury into his spellcasting — burning rage rounds to twist a spell mid-cast.',
    replaces: ['br-improved-uncanny-dodge'],
    grants: [
      g(5, 'mr-meta-rage', 'Meta-Rage', 'Sacrifice rounds of bloodrage — twice the spell’s adjusted level, minimum 2 — to apply a metamagic feat you know to a bloodrager spell without raising the slot’s level (casting time still increases, one feat per casting, and you need not be bloodraging). You may also take a metamagic feat in place of a bloodline feat. Replaces improved uncanny dodge.'),
    ],
  },
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
    id: 'picaroon', classId: 'swashbuckler', name: 'Picaroon',
    desc: 'A swashbuckler who closes with a blade in one hand and a pistol in the other, and hits hard with both.',
    replaces: ['swb-finesse', 'swb-deed-opportune-parry', 'swb-deed-kip-up', 'swb-deed-superior-feint', 'swb-deed-bleeding-wound'],
    proficiencies: { weapons: { add: ['martial', 'pistol'] } },
    grants: [
      g(1, 'pc-melee-shooter', 'Deed: Melee Shooter', 'While wielding both a light or one-handed piercing melee weapon and a one-handed firearm, spend 1 panache as a swift action so your first ranged attack that turn provokes no attacks of opportunity. Replaces opportune parry and riposte.'),
      g(1, 'pc-picaroons-panache', "Picaroon's Panache", 'You regain panache on a confirmed critical hit or killing blow with a light or one-handed piercing melee weapon *or* a one-handed firearm. Alters panache and replaces swashbuckler finesse.'),
      g(3, 'pc-quick-clear', 'Deed: Quick Clear', 'Spend 1 panache as a standard action to clear the broken condition from a one-handed firearm you wield, when it came from a misfire. Replaces kip-up.'),
      g(7, 'pc-gun-feint', 'Deed: Gun Feint', 'With at least 1 panache, feint with a firearm instead of attacking, trading on its fearsome reputation. Replaces superior feint.'),
      g(11, 'pc-pistol-whip-shot', 'Deed: Close Shot', 'Spend panache to fire into a melee you are part of without the usual penalty. Replaces bleeding wound.'),
    ],
  },
  {
    id: 'mouser', classId: 'swashbuckler', name: 'Mouser',
    desc: 'A small, quick duelist who fights from within a giant’s own footprint — darting underfoot to turn size against the enemy.',
    // Four deed-for-deed swaps (our deeds are one feature each, so these map cleanly).
    replaces: ['swb-deed-opportune-parry', 'swb-deed-menacing-swordplay', 'swb-deed-targeted-strike', 'swb-deed-bleeding-wound'],
    grants: [
      g(1, 'mouser-underfoot-assault', 'Deed: Underfoot Assault', 'Spend 1 panache to slip into a larger foe’s space when it misses you; while there the foe takes −4 to attacks against others and your adjacent allies flank it. Replaces opportune parry and riposte.'),
      g(3, 'mouser-quick-steal', 'Deed: Quick Steal', 'Spend 1 panache as a swift action when you hit a larger foe with a light or one-handed piercing weapon to attempt a steal combat maneuver without provoking. Replaces menacing swordplay.'),
      g(7, 'mouser-hamstring', 'Deed: Hamstring', 'With panache, when you hit a larger foe with a light or one-handed piercing weapon, attempt a dirty trick as a swift action that can only stagger. Replaces targeted strike.'),
      g(11, 'mouser-cats-charge', 'Deed: Cat’s Charge', 'With panache, when you charge a larger foe you may end the charge in any space you can reach, not just the nearest. Replaces bleeding wound.'),
    ],
  },
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
    id: 'forester', classId: 'hunter', name: 'Forester',
    desc: 'A hunter bound to the land itself rather than to any beast on it — a guardian of the wild who walks alone.',
    replaces: ['hunter-animal-companion', 'hunter-precise-companion', 'hunter-tactics', 'hunter-speak-with-master'],
    // No companion at all: the animal focus turns inward instead, as it does when a hunter's
    // companion dies.
    choices: { remove: ['animal-companion'] },
    companions: [],
    grants: [
      g(1, 'fo-animal-focus', 'Animal Focus (self only)', "With no animal companion, every aspect this ability grants applies to you, exactly as when a hunter's companion is dead. Alters animal focus."),
      g(5, 'fo-favored-terrain', 'Favored Terrain', "Gain the ranger's favored terrain, choosing your first at 5th level and another every four levels after, with the bonus in one chosen terrain rising each time. Replaces precise companion and hunter tactics."),
      g(11, 'fo-breath-of-life', 'Breath of Life', 'Call the land’s vitality back into a fallen ally as a spell-like ability. Replaces speak with master.'),
    ],
  },
  {
    id: 'divine-hunter', classId: 'hunter', name: 'Divine Hunter',
    desc: 'A hunter who answers to a higher power than the wild — her faith flowing into her companion until the beast itself becomes a champion of the god.',
    replaces: ['hunter-tactics'],
    // The domain replaces every teamwork bonus feat.
    bonusFeatSlots: { remove: [3, 6, 9, 12, 15, 18] },
    classSkills: { add: ['know-religion'], remove: ['know-dungeoneering'] },
    grants: [
      g(3, 'dh-domain', 'Domain', 'Choose one domain from those your deity grants, using your hunter level −2 as your cleric level for its granted powers, and add each domain spell to your spells known as you reach the level for it (1st at 3rd, 2nd at 6th, and so on). Replaces teamwork feats.'),
      g(3, 'dh-otherworldly-companion', 'Otherworldly Companion', 'Your animal companion gains the celestial template if you are good (or worship a good deity) or the fiendish template if evil; a neutral hunter of a neutral deity chooses one permanently. Replaces hunter tactics.'),
    ],
  },
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
    id: 'synthesist', classId: 'summoner', name: 'Synthesist',
    desc: 'Rather than summon an eidolon to stand beside him, the synthesist wears it — a translucent living armour whose body becomes his own.',
    // Fused Eidolon replaces the eidolon itself, bond senses and life bond; the remaining swaps are
    // the class abilities that assumed two separate creatures (Ultimate Magic, verified).
    replaces: [
      'summ-eidolon', 'summ-bond-senses', 'summ-life-bond',
      'summ-life-link', 'summ-shield-ally', 'summ-makers-call', 'summ-transposition',
      'summ-greater-shield-ally', 'summ-merge-forms',
    ],
    fusedCompanion: true,
    grants: [
      g(1, 'syn-fused-eidolon', 'Fused Eidolon', "You wear your eidolon. You use its Strength, Dexterity and Constitution and keep your own Intelligence, Wisdom and Charisma; you gain its hit points as temporary hit points, its base attack bonus, its natural armour, its evolutions and its special abilities, and you are limited to its maximum number of natural attacks. You lose the benefit of your armour while fused, and count as both your own type and an outsider, whichever is worse. Replaces eidolon, bond senses and life bond."),
      g(1, 'syn-fused-link', 'Fused Link', 'When your eidolon-granted temporary hit points would drop to 0, sacrifice any number of your own hit points as a free action to prevent that damage point for point. Replaces life link.'),
      {
        level: 4, id: 'syn-shielded-meld', name: 'Shielded Meld',
        desc: 'While fused, gain a +2 shield bonus to AC and a +2 circumstance bonus on saving throws. Replaces shield ally.',
        effects: [
          { target: 'ac', type: 'shield', value: 2, note: 'Shielded Meld' },
          { target: 'save:fort', type: 'circumstance', value: 2, note: 'Shielded Meld' },
          { target: 'save:ref', type: 'circumstance', value: 2, note: 'Shielded Meld' },
          { target: 'save:will', type: 'circumstance', value: 2, note: 'Shielded Meld' },
        ],
      },
      g(6, 'syn-makers-jump', "Maker's Jump", 'Cast dimension door as a spell-like ability at your caster level, affecting only the fused you, once per day at 6th plus once more every six levels after. Replaces maker’s call and transposition.'),
      {
        level: 12, id: 'syn-greater-shielded-meld', name: 'Greater Shielded Meld',
        desc: 'The shielded-meld bonuses rise to a +4 shield bonus to AC and a +4 circumstance bonus on saving throws. Replaces greater shield ally.',
        // The +2 from Shielded Meld is still in force; shield bonuses do not stack, so the higher
        // one wins on AC, while the circumstance save bonuses would — hence +2 more, not +4.
        effects: [
          { target: 'ac', type: 'shield', value: 4, note: 'Greater Shielded Meld' },
          { target: 'save:fort', type: 'circumstance', value: 2, note: 'Greater Shielded Meld' },
          { target: 'save:ref', type: 'circumstance', value: 2, note: 'Greater Shielded Meld' },
          { target: 'save:will', type: 'circumstance', value: 2, note: 'Greater Shielded Meld' },
        ],
      },
      g(16, 'syn-split-forms', 'Split Forms', 'As a swift action, split into yourself and your eidolon, both keeping the same evolutions, for a number of rounds per day equal to your summoner level. Replaces merge forms.'),
    ],
  },
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
    id: 'wild-caller', classId: 'summoner', name: 'Wild Caller',
    desc: 'A summoner bound to the First World — his eidolon grown from extraplanar plant matter, and his summons drawn from the wild rather than the planes.',
    // Fey Friend replaces aspect, which returns at 18th in place of greater aspect.
    replaces: ['summ-aspect', 'summ-greater-aspect'],
    // The plant eidolon uses its own four base forms instead of biped/quadruped/serpentine. Consequence:
    // the five form-gated evolutions (mount, pounce, constrict, rake, trample) are unavailable to a plant
    // eidolon, since none of them list a plant form as a prerequisite — which matches RAW reading these
    // as biped/quadruped/serpentine-only.
    choices: {
      remove: ['eidolon-form'],
      add: [{
        id: 'eidolon-form', label: 'Plant eidolon base form', kind: 'companion',
        companionKind: 'eidolon', companionIds: ['cactus', 'conifer', 'mushroom', 'tree'], count: 1,
      }],
    },
    grants: [
      g(1, 'wc-plant-eidolon', 'Plant Eidolon', 'Your eidolon’s body is extraplanar plant matter housing a First World mind: it gains the plant type and extraplanar subtype and immunity to paralysis, poison, sleep, and stunning, but unlike other plants is not immune to mind-affecting or polymorph effects. When summoned in an environment matching one of the plant base forms, you may switch it to that form by spending a daily use of summon nature’s ally. Alters the eidolon.'),
      g(1, 'wc-summon-natures-ally', 'Summon Nature’s Ally', 'Cast summon nature’s ally as a spell-like ability 3 + your Charisma modifier times per day, lasting 1 minute per summoner level. You gain each new tier where a summoner would gain summon monster (at 19th, summon nature’s ally IX or gate), and each becomes a class spell for you. Alters summon monster.'),
      g(10, 'wc-fey-friend', 'Fey Friend', '+4 on Bluff, Diplomacy, and Sense Motive checks against fey. Replaces aspect.'),
      g(18, 'wc-aspect', 'Aspect', 'Gain the summoner’s aspect ability at 18th level, in place of greater aspect.'),
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
    id: 'herald-of-the-horn', classId: 'skald', name: 'Herald of the Horn',
    desc: 'A skald whose raging song is sounded through a horn — thunderous blasts that bolster allies or shatter castle walls.',
    replaces: ['skald-scribe-scroll', 'skald-lore-master'],
    grants: [
      g(1, 'hh-arcane-bond', 'Arcane Bond (horn)', "Bond with a horn as an arcane-bloodline sorcerer bonds an object. Like a wand or staff, it must be held in one hand when you cast skald spells. Replaces Scribe Scroll."),
      g(5, 'hh-rousing-retort', 'Rousing Retort', 'When beginning a raging song, expend 4 rounds of it to grant all allies within 60 feet a new saving throw at +2 against an ongoing enchantment or fear effect. Replaces the first daily use of spell kenning.'),
      g(7, 'hh-horn-call', 'Horn Call', 'A skald spell with the sonic descriptor cast through the horn has its save DC increased by 1, and by a further 1 at 13th and 19th levels. Replaces lore master.'),
      g(11, 'hh-crumbling-blast', 'Crumbling Blast', 'Sound the horn to shake structures apart, trading further spell kenning for raw destructive noise. Replaces the second and third daily uses of spell kenning.'),
    ],
  },
  {
    id: 'battle-scion', classId: 'skald', name: 'Battle Scion',
    desc: 'A warrior-poet of noble bearing — as deadly with a blade as with a barbed word, and apt to bind brave followers to a quest.',
    // RAW also replaces "song of the fallen", which our skald progression does not model as its own
    // feature; Courtly Presence and Battle Prowess *alter* bardic knowledge and the rage-power line
    // rather than replacing them, so both are granted alongside the abilities they modify.
    replaces: ['skald-dirge-of-doom', 'skald-master'],
    grants: [
      g(1, 'bscion-courtly-presence', 'Courtly Presence', 'Add half your character level on Intimidate checks and begin any verbal duel with an extra edge for the presence tactic. Your bardic knowledge applies only to Knowledge (geography, history, local, nobility). Alters bardic knowledge.'),
      g(3, 'bscion-battle-prowess', 'Battle Prowess', 'Whenever you would gain a rage power, you may instead take a combat or teamwork feat you qualify for, and grant it to allies under inspired rage for 2 rounds of raging song per round granted. Alters the rage power ability.'),
      g(10, 'bscion-song-of-questing', 'Song of Questing', 'Spend 4 rounds of raging song to bind a truly willing target to an agreed quest as geas/quest (the target understands the full terms first); at 14th you may offer it to one willing creature per skald level. Replaces dirge of doom and song of the fallen.'),
      g(20, 'bscion-once-and-future', 'Once and Future Scion', 'When slain, so long as your body is intact you fall into a deathlike sleep for 3 days and then return as raise dead — even from a death effect. Replaces master skald.'),
    ],
  },
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
    id: 'unsworn-shaman', classId: 'shaman', name: 'Unsworn Shaman',
    desc: 'A shaman who never binds herself to one spirit, striking a new bargain each day for whatever the circumstances demand.',
    replaces: ['shaman-spirit-feature'],
    // No sworn spirit at all — the spirit pick goes, and hexes come from whatever she bonds today.
    choices: { remove: ['spirit'] },
    grants: [
      g(1, 'us-minor-spirit', 'Minor Spirit', 'Each day when you prepare spells, bond with a minor spirit and gain one shaman or witch hex of your choice — never a major or grand hex. From 2nd level you may instead take a hex from one of that day\u2019s wandering spirits. A shaman or witch hex uses your shaman level as your witch level and Wisdom in place of Intelligence. You bond two minor spirits at 4th level and one more every four levels after. Replaces spirit and alters hex.'),
      g(1, 'us-unsworn-animal', 'Unsworn Spirit Animal', 'Your spirit animal is not tied to any one spirit, shifting its manifestation with each bargain you strike. Alters spirit animal.'),
      g(4, 'us-broader-wandering', 'Broader Wandering', 'Your wandering spirit is chosen from a wider field, and its hex arrives through your minor spirits instead. Alters wandering spirit and replaces wandering hex.'),
    ],
  },
  {
    id: 'spirit-warden', classId: 'shaman', name: 'Spirit Warden',
    desc: 'A shaman who holds that some spirits deserve no reverence at all — and who has made ending them her business.',
    // Restless Magic swaps the spirit's spirit-magic spells for an undead-themed line; our shaman does not
    // model spirit magic spells as their own feature, so that change is described rather than swapped.
    replaces: [],
    classSkills: { add: ['intimidate'], remove: ['diplomacy', 'handle-animal'] },
    // Rebuke Spirits takes the 2nd-level hex and Laugh at Death the 10th, so the line is re-added without them.
    choices: {
      remove: ['shaman-hex'],
      add: [{ id: 'shaman-hex', label: 'Hex', kind: 'list', count: 1, levels: [4, 8, 12, 16, 18, 20], options: SHAMAN_HEXES }],
    },
    grants: [
      g(1, 'sw-unnatural-mien', 'Unnatural Mien', 'Diplomacy and Handle Animal are no longer class skills; Intimidate is, and you gain +2 on Intimidate checks to demoralize. Your spirit magic spells become an undead-themed list (detect undead, command undead, halt undead, death ward, possess object, undead to death, ethereal jaunt, control undead, foresight).'),
      g(2, 'sw-rebuke-spirits', 'Rebuke Spirits', 'Channel positive energy as a cleric of your level, but only to harm undead, 3 + your Charisma modifier times per day. Replaces the hex gained at 2nd level.'),
      g(10, 'sw-laugh-at-death', 'Laugh at Death', '+4 insight bonus on saves against death effects and to avoid or remove negative levels. Replaces the hex gained at 10th level.'),
    ],
  },
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
    id: 'rageshaper', classId: 'shifter', name: 'Rageshaper',
    desc: 'A shifter who abandons the disciplined aspects for pure wrath, swelling into a living engine of annihilation.',
    // A rageshaper may be any nonlawful alignment, where a shifter must be partly neutral.
    alignment: ['NG', 'CG', 'N', 'CN', 'NE', 'CE'],
    replaces: [
      'shifter-wild-shape', 'shifter-aspect', 'shifter-defensive-instinct',
      'shifter-chimeric-aspect', 'shifter-woodland-stride', 'shifter-trackless-step',
    ],
    // The aspect pick goes with shifter aspect itself.
    choices: { remove: ['aspect'] },
    grants: [
      g(1, 'rs-devastating-form', 'Devastating Form', "Enter a fury that functions as the barbarian's rage, entering as a full-round action that provokes; at the start of your next turn you also grow one size category larger, breaking armor that cannot accommodate it. Replaces wild shape, shifter aspect and every improvement to it."),
      g(1, 'rs-terrible-slam', 'Terrible Slam', 'Your claws become a slam attack that ignores 5 points of an object’s hardness. Alters shifter claws.'),
      g(2, 'rs-devastating-hide', 'Devastating Hide', 'In your devastating form you become difficult to harm, gaining protection that grows with your level. Replaces defensive instinct, chimeric aspect and greater chimeric aspect.'),
      g(3, 'rs-unstoppable', 'Unstoppable', 'Nothing slows your charge through the wild. Replaces woodland stride.'),
      g(5, 'rs-no-trace', 'No Trace', 'What you leave behind is wreckage rather than tracks. Replaces trackless step.'),
    ],
  },
  {
    id: 'fiendflesh-shifter', classId: 'shifter', name: 'Fiendflesh Shifter',
    desc: 'A shifter who bargained with the Outer Planes instead of the wild — wearing daemon, demon, and devil rather than beast. (RAW requires an evil alignment; not enforced here.)',
    // Fiendish Aspect replaces wild shape, shifter aspect and every improvement to it — so both aspect
    // picks go, and with them (via the engine's choice-removal guard) the aspect source powers. RAW also
    // replaces "greater chimeric aspect", which our shifter does not model as its own feature.
    replaces: ['shifter-aspect', 'shifter-wild-shape', 'shifter-defensive-instinct', 'shifter-chimeric-aspect'],
    choices: { remove: ['aspect', 'shifter-aspect-extra'] },
    grants: [
      g(1, 'ff-infernal-claws', 'Infernal Claws', 'Your shifter claws count as evil weapons for overcoming damage reduction; otherwise they work as normal. Alters shifter claws.'),
      g(1, 'ff-fiendish-aspect', 'Fiendish Aspect', 'As a swift action, take an amalgam fiendish form for 3 + your shifter level minutes per day: darkvision 60 ft (or doubled), a 1d6 gore attack, and DR 1/good. DR rises to 2/good at 5th (plus bat wings, fly 30 ft average), 5/good at 10th (doubling your fiendish resilience energy resistances), 7/good at 15th (fly 60 ft), and 10/good at 20th with immunity to electricity and fire and SR 15 + your shifter level. Replaces wild shape and shifter aspect.'),
      g(2, 'ff-fiendish-resilience', 'Fiendish Resilience', '+1 natural armor and resistance 5 to electricity and fire while unencumbered and in no armor or light/medium nonmetal armor; the natural armor rises at 4th, 12th, and 20th and the resistances at 8th and 16th. Replaces defensive instinct.'),
      g(9, 'ff-chimeric-fiend', 'Chimeric Fiend', 'While in fiendish aspect, also gain one of: daemon (acid resistance 10 and +4 profane on saves vs disease), demon (double electricity resistance), or devil (double fire resistance), chosen anew each use. Replaces chimeric aspect.'),
      g(14, 'ff-greater-chimeric-fiend', 'Greater Chimeric Fiend', 'Your chimeric fiend choice also grants: daemon (+4 Constitution and immunity to disease), demon (+4 Strength and natural attack damage dice up one step), or devil (+4 Dexterity and see in darkness). Replaces greater chimeric aspect.'),
    ],
  },
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
    id: 'bolt-ace', classId: 'gunslinger', name: 'Bolt Ace',
    desc: 'A gunslinger who never soils her hands with powder — every deed performed with a crossbow, in a more hushed manner but with just as much flair.',
    replaces: [
      'gun-gunsmith', 'gun-gun-training',
      'gun-deed-deadeye', 'gun-deed-quick-clear', 'gun-deed-utility-shot',
      'gun-deed-startling-shot', 'gun-deed-expert-loading', 'gun-deed-lightning-reload',
      'gun-deed-menacing-shot',
    ],
    proficiencies: { weapons: { add: ['light-crossbow', 'heavy-crossbow', 'hand-crossbow'] } },
    grants: [
      g(1, 'ba-crossbow-maven', 'Crossbow Maven', 'You are proficient with all crossbows instead of all firearms, and begin play with a masterwork crossbow of your choice. Your grit returns on a critical hit or killing blow with any crossbow. Alters weapon proficiencies and replaces gunsmith.'),
      g(1, 'ba-sharp-shoot', 'Deed: Sharp Shoot', 'Spend 1 grit to resolve a crossbow attack against touch AC within the first range increment. This cost cannot be reduced. Replaces deadeye.'),
      g(1, 'ba-vigilant-loading', 'Deed: Vigilant Loading', 'While you have at least 1 grit, loading a crossbow provokes no attacks of opportunity. Replaces quick clear.'),
      g(3, 'ba-shooters-resolve', "Deed: Shooter's Resolve", 'Spend 1 grit on a standard-action crossbow attack to ignore concealment and cover short of total. Replaces utility shot.'),
      g(5, 'ba-crossbow-training', 'Crossbow Training', 'Choose one type of crossbow: add your Dexterity modifier to its damage and treat its misfires as one lower, gaining another choice every four levels. Replaces gun training.'),
      g(7, 'ba-distracting-shot', 'Deed: Distracting Shot', 'Spend 1 grit to deliberately miss a target you could hit; it loses its Dexterity bonus to AC for 1 round. Replaces startling shot.'),
      g(11, 'ba-vigilant-shooter', 'Deed: Vigilant Shooter', 'Spend 1 grit to fire a crossbow without provoking attacks of opportunity. Replaces expert loading.'),
      g(11, 'ba-inexplicable-reload', 'Deed: Inexplicable Reload', 'While you have at least 1 grit you begin every round — even a surprise round — with your crossbow loaded, and reloading drops one step in action cost. Replaces lightning reload.'),
      g(15, 'ba-pinning-shot', 'Deed: Pinning Shot', 'Spend 1 grit to pin a struck target to a wall, an object or the ground, entangling and staggering it until it spends a standard action to free itself. Replaces menacing shot.'),
    ],
  },
  {
    id: 'mysterious-stranger', classId: 'gunslinger', name: 'Mysterious Stranger',
    desc: 'A gunslinger who runs on sheer bravado — luck and charm loaded into every chamber.',
    replaces: ['gun-deed-quick-clear', 'gun-nimble', 'gun-gun-training', 'gun-deed-bleeding-wound'],
    grants: [
      g(1, 'ms-focused-aim', 'Focused Aim', 'Your grit is based on Charisma, not Wisdom, and spending a grit point adds half your gunslinger level to a firearm’s damage on your next shot. Replaces the quick clear deed and alters grit.'),
      g(2, 'ms-lucky', 'Lucky', 'Gain a luck bonus on Will saves that scales as you level. Replaces nimble.'),
      g(5, 'ms-strangers-fortune', 'Stranger’s Fortune', 'Spend grit to reroll a missed attack or to add your grit to confirming a critical hit. Replaces gun training 1.'),
      g(11, 'ms-clipping-shot', 'Clipping Shot', 'On a firearm attack that misses, still deal your Dexterity modifier in damage. Replaces the bleeding wound deed.'),
    ],
  },
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
    id: 'blood-arcanist', classId: 'arcanist', name: 'Blood Arcanist',
    desc: 'An arcanist whose innate gift is no rudiment but a full bloodline — sorcerous heritage married to the spellbook.',
    replaces: ['arc-magical-supremacy'],
    // Replaces the exploits at 1st, 3rd, 9th and 15th: drop both 'exploit' choices and re-add only the
    // recurring line without 3/9/15 (the 1st-level pick is not re-added at all).
    choices: {
      remove: ['exploit'],
      add: [
        { id: 'exploit', label: 'Arcanist exploit', kind: 'list', count: 1, levels: [5, 7, 11, 13, 17, 19], options: ARCANIST_EXPLOITS },
        { id: 'bloodline', label: 'Bloodline', kind: 'sorcerer-bloodline', count: 1 },
      ],
    },
    // Bloodline powers *and* arcana at arcanist level = sorcerer level, but no bonus spells. Our content
    // bundles the arcana (1st) into the bonus-spells table alongside the spells (3rd, 5th, … 19th), so
    // take both tables and suppress exactly the bonus-spell levels. Class skill and bonus feats are not
    // conferred either: the class skill is gated on natively offering the bloodline pick, and the
    // arcanist has no bloodline bonus feats to begin with.
    sourceLines: [
      { choiceId: 'bloodline', table: 'sorcerer-bloodline-powers' },
      { choiceId: 'bloodline', table: 'sorcerer-bloodline-spells' },
    ],
    suppressSourcePowers: [{ prefix: 'sorc-bl-sp', levels: [3, 5, 7, 9, 11, 13, 15, 17, 19] }],
    grants: [
      g(1, 'ba-bloodline', 'Bloodline', 'Choose a sorcerer bloodline. You gain its bloodline arcana and bloodline powers, treating your arcanist level as your sorcerer level — but not its class skill, bonus feats, or bonus spells. You cannot take the bloodline development exploit. Replaces the exploits at 1st, 3rd, 9th, and 15th, and magical supremacy.'),
    ],
  },
  {
    id: 'school-savant', classId: 'arcanist', name: 'School Savant',
    desc: 'An arcanist who trades the school-blind flexibility of her kind for a specialist’s focus — more spells prepared, but a narrower shelf to draw from.',
    replaces: [],
    // Replaces the exploits at 1st, 3rd and 7th; the 1st-level pick is not re-added.
    choices: {
      remove: ['exploit'],
      add: [
        { id: 'exploit', label: 'Arcanist exploit', kind: 'list', count: 1, levels: [5, 9, 11, 13, 15, 17, 19], options: ARCANIST_EXPLOITS },
        { id: 'school', label: 'Arcane School', kind: 'wizard-school', count: 1 },
        { id: 'opposition', label: 'Opposition Schools', kind: 'wizard-opposition', count: 2 },
      ],
    },
    // Wizard school powers at arcanist level = wizard level. Taking the 'school' choice also earns the
    // specialist's one extra prepared spell per level, which the engine now grants off the choice
    // rather than off the wizard class.
    sourceLines: [{ choiceId: 'school', table: 'wizard-school-powers' }],
    grants: [
      g(1, 'ss-school-focus', 'School Focus', 'Choose a school of magic and gain its arcane-school abilities as a wizard of your arcanist level. You may prepare one additional spell per day of each level you can cast, chosen from that school, and must take two opposition schools — preparing a spell from one costs two slots, and crafting an item needing such a spell takes a −4 penalty. You cannot take the school understanding exploit. Replaces the exploits at 1st, 3rd, and 7th.'),
    ],
  },
  {
    id: 'brown-fur-transmuter', classId: 'arcanist', name: 'Brown-Fur Transmuter',
    desc: 'A “brown-fur” — a transmutation specialist who turns herself, and everyone else, into whatever the moment calls for.',
    replaces: ['arc-magical-supremacy'],
    // Powerful Change and Share Transmutation take the exploits gained at 3rd and 9th. The arcanist
    // carries two 'exploit' choices (the 1st-level pick and the recurring line); removing by id drops
    // both, so re-add the 1st-level pick and the recurring line minus 3 and 9.
    choices: {
      remove: ['exploit'],
      add: [
        { id: 'exploit', label: 'Arcanist exploit', kind: 'list', count: 1, options: ARCANIST_EXPLOITS },
        { id: 'exploit', label: 'Arcanist exploit', kind: 'list', count: 1, levels: [5, 7, 11, 13, 15, 17, 19], options: ARCANIST_EXPLOITS },
      ],
    },
    grants: [
      g(3, 'bft-powerful-change', 'Powerful Change', 'When you cast a transmutation spell from an arcanist slot, expend 1 point of your arcane reservoir as a free action to increase the bonus it grants to one ability score by 2 (only one score if it boosts several; never more than 1 point per spell). Replaces the 3rd-level exploit.'),
      g(9, 'bft-share-transmutation', 'Share Transmutation', 'Expend 1 point of your arcane reservoir to change any personal-range transmutation spell to a range of touch; it automatically fails on unwilling creatures. Replaces the 9th-level exploit.'),
      g(20, 'bft-transmutation-supremacy', 'Transmutation Supremacy', 'Your transmutation spells are treated as Extended without changing casting time or slot (and cannot be extended again), powerful change grants +4 instead of +2, and share transmutation reaches a willing creature within 30 feet. Replaces magical supremacy.'),
    ],
  },
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
    id: 'vanguard', classId: 'slayer', name: 'Vanguard',
    desc: 'A battlefield commander who leads allies to bloody victory — scout, officer and tactician rather than lone hunter.',
    replaces: ['slay-track', 'slay-stalker'],
    // Tactician and Vanguard's Bond take the 2nd- and 4th-level talents; the rest of the line stays.
    choices: {
      remove: ['slayer-talent'],
      add: [{ id: 'slayer-talent', label: 'Slayer talent', kind: 'list', count: 1, levels: [6, 8], options: SLAYER_TALENTS }],
    },
    grants: [
      g(1, 'vg-lookout', 'Lookout', 'Add half your slayer level (minimum 1) on initiative checks. Replaces track.'),
      g(2, 'vg-tactician', 'Tactician', 'Gain a teamwork feat you qualify for, and once per day as a standard action grant one of your teamwork feats to all allies within 30 feet who can see and hear you, for 3 rounds plus 1 per two levels. A later slayer talent may instead buy another daily use. Replaces the 2nd-level slayer talent.'),
      g(4, 'vg-vanguards-bond', "Vanguard's Bond", 'As a move action, grant half your studied target bonus against one current studied target to all allies within 30 feet, for rounds equal to your Intelligence modifier (minimum 1). It does not stack with their own favored enemy or studied target bonuses. Replaces the 4th-level slayer talent.'),
      g(7, 'vg-ever-ready', 'Ever Ready', 'You are never caught off guard: your readiness in the opening moments of a fight replaces the stalker’s stealth. Replaces stalker.'),
    ],
  },
  {
    id: 'stygian-slayer', classId: 'slayer', name: 'Stygian Slayer',
    desc: 'A killer who steps out of the deepest shadow — arriving unseen, doing murder, and dissolving into mist before anyone thinks to look.',
    replaces: ['slay-stalker'],
    // Light armor only, no shields.
    proficiencies: { armor: { remove: ['medium', 'shield'] } },
    // Invisibility takes the 4th-level slayer talent and Shadowy Mist Form the 10th-level advanced
    // talent, so each line is re-added without that one level.
    choices: {
      remove: ['slayer-talent', 'slayer-adv-talent'],
      add: [
        { id: 'slayer-talent', label: 'Slayer talent', kind: 'list', count: 1, levels: [2, 6, 8], options: SLAYER_TALENTS },
        { id: 'slayer-adv-talent', label: 'Slayer talent (advanced eligible)', kind: 'list', count: 1, levels: [12, 14, 16, 18, 20], options: SLAYER_TALENTS_ALL },
      ],
    },
    grants: [
      g(4, 'stygian-invisibility', 'Invisibility', 'Cast invisibility once per day at your slayer level (Intelligence for concentration), plus once more at 8th and every four levels thereafter. Replaces the 4th-level slayer talent.'),
      g(7, 'stygian-spell-use', 'Spell Use', 'Use spell-completion and spell-trigger items as an arcane caster with darkness, forced quiet, modify memory, nondetection, obscuring mist, phantom steed, shadow walk, and 0–4th-level illusion wizard spells on your list, using your class level as caster level. Replaces stalker.'),
      g(10, 'stygian-shadowy-mist', 'Shadowy Mist Form', 'Become an inky cloud as gaseous form that also obscures vision like fog cloud, for a number of minutes per day equal to your level (in 1-minute increments). Replaces the 10th-level advanced slayer talent.'),
    ],
  },
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
  {
    id: 'bounty-hunter', classId: 'slayer', name: 'Bounty Hunter',
    desc: 'A slayer who brings the mark back alive — trading a few tricks of the trade for the tools of capture.',
    replaces: [],
    // Dirty Trick / Submission Hold take the slayer talents at 2nd and 6th; Incapacitate takes the
    // advanced talent at 10th. Re-add the remaining talent picks on each line.
    choices: {
      remove: ['slayer-talent', 'slayer-adv-talent'],
      add: [
        { id: 'slayer-talent', label: 'Slayer talent', kind: 'list', count: 1, levels: [4, 8], options: SLAYER_TALENTS },
        { id: 'slayer-adv-talent', label: 'Slayer talent (advanced eligible)', kind: 'list', count: 1, levels: [12, 14, 16, 18, 20], options: SLAYER_TALENTS_ALL },
      ],
    },
    grants: [
      g(1, 'bh-training', 'Manhunter’s Training', 'Gain proficiency with simple and martial weapons plus the aklys, bolas, dan bong, lasso, and net, and with light armor and shields (except tower shields). Replaces the slayer’s weapon and armor proficiencies.'),
      g(2, 'bh-dirty-trick', 'Dirty Trick', 'Forgo your sneak attack dice on a hit against your studied target to attempt a dirty trick combat maneuver as a free action. Replaces the 2nd-level slayer talent.'),
      g(6, 'bh-submission-hold', 'Submission Hold', 'Add your sneak attack damage to a grapple damage roll at a −5 penalty, dealing nonlethal damage if you choose. Replaces the 6th-level slayer talent.'),
      g(10, 'bh-incapacitate', 'Incapacitate', 'As the assassinate talent, but a failed save leaves the target unconscious for 1d6 rounds rather than dead; a successful save still takes nonlethal sneak attack damage. Replaces the 10th-level advanced slayer talent.'),
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
