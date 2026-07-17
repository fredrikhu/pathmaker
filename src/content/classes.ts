import type { ClassDef } from './model';

// Class skill lists use the skill ids from skills.ts. Craft/Knowledge/Profession/Perform
// families are listed by the specific subskill ids a class actually gets.
const CRAFT_ALL = ['craft-alchemy', 'craft-armor', 'craft-weapons'];
const KNOW_ALL = [
  'know-arcana', 'know-dungeoneering', 'know-engineering', 'know-geography', 'know-history',
  'know-local', 'know-nature', 'know-nobility', 'know-planes', 'know-religion',
];

export const CLASSES: ClassDef[] = [
  {
    id: 'fighter', name: 'Fighter', sub: 'Martial · d10 · full BAB',
    desc: 'The master of arms. Fighters trade flash for an unmatched stream of bonus combat feats and, later, weapon and armor training. Simple to play, deep to build.',
    hitDie: 10, bab: 'full', goodSaves: ['fort'], skillRanks: 2,
    classSkills: [...CRAFT_ALL, 'handle-animal', 'intimidate', 'know-dungeoneering', 'know-engineering', 'profession-any', 'ride', 'survival', 'swim', 'climb'],
    startingGold: 175,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'heavy', 'shield'] },
    features1: [
      { id: 'fighter-bonus-feat', name: 'Bonus Feat', desc: 'A fighter gains a bonus combat feat at 1st level and an additional one at every even level.' },
    ],
  },
  {
    id: 'barbarian', name: 'Barbarian', sub: 'Martial · d12 · rage',
    desc: 'Fury given form — rage powers, fast movement, and the biggest hit die in the game. Cannot be lawful.',
    hitDie: 12, bab: 'full', goodSaves: ['fort'], skillRanks: 4,
    classSkills: [...CRAFT_ALL, 'handle-animal', 'intimidate', 'know-nature', 'perception', 'ride', 'survival', 'swim', 'climb', 'acrobatics'],
    startingGold: 105, alignment: ['NG', 'CG', 'N', 'CN', 'NE', 'CE'],
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shield'] },
    features1: [
      { id: 'barb-rage', name: 'Rage', desc: 'A barbarian can rage for a number of rounds per day, gaining +4 morale to Str and Con, +2 morale on Will saves, and −2 AC.' },
      { id: 'barb-fast-movement', name: 'Fast Movement', desc: '+10 feet base land speed.' },
    ],
  },
  {
    id: 'bard', name: 'Bard', sub: 'Arcane · d8 · 6 skills',
    desc: 'Jack of all trades: spontaneous arcane spells, songs that lift the whole party, and every skill under the sun.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['ref', 'will'], skillRanks: 6,
    classSkills: [...CRAFT_ALL, ...KNOW_ALL, 'acrobatics', 'appraise', 'bluff', 'climb', 'diplomacy', 'disguise', 'escape-artist', 'intimidate', 'linguistics', 'perception', 'perform-oratory', 'perform-strings', 'profession-any', 'sense-motive', 'sleight-of-hand', 'spellcraft', 'stealth', 'use-magic-device'],
    startingGold: 105,
    proficiencies: { weapons: ['simple', 'longsword', 'rapier', 'sap', 'shortbow', 'shortsword', 'whip'], armor: ['light', 'shield'] },
    features1: [
      { id: 'bard-performance', name: 'Bardic Performance', desc: 'Inspire courage: allies gain a morale bonus on attack and damage rolls and saves against fear.' },
      { id: 'bard-knowledge', name: 'Bardic Knowledge', desc: 'Add half class level (minimum 1) on all Knowledge checks, and may make them untrained.' },
    ],
    spellcasting: { kind: 'spontaneous', ability: 'cha', list: 'bard', slots1: [999, 1], known1: [4, 2] },
  },
  {
    id: 'cleric', name: 'Cleric', sub: 'Divine · d8 · 9th-level caster',
    desc: 'A conduit of divine power. Two domains chosen from the deity, channel energy, and full prepared divine casting.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['fort', 'will'], skillRanks: 2,
    classSkills: [...CRAFT_ALL, 'appraise', 'diplomacy', 'heal', 'know-arcana', 'know-history', 'know-nobility', 'know-planes', 'know-religion', 'linguistics', 'profession-any', 'sense-motive', 'spellcraft'],
    startingGold: 140,
    proficiencies: { weapons: ['simple'], armor: ['light', 'medium', 'heavy', 'shield'] },
    features1: [
      { id: 'cleric-channel', name: 'Channel Energy', desc: 'Release a wave of positive or negative energy to heal or harm, a number of times per day equal to 3 + Cha modifier.' },
      { id: 'cleric-spontaneous', name: 'Spontaneous Casting', desc: 'Channel stored spell energy into cure or inflict spells not prepared ahead of time.' },
    ],
    choices: [{ id: 'domains', label: 'Domains', kind: 'cleric-domains', count: 2 }],
    spellcasting: { kind: 'prepared-list', ability: 'wis', list: 'divine', slots1: [3, 1] },
  },
  {
    id: 'druid', name: 'Druid', sub: 'Divine · d8 · wild shape',
    desc: "Nature's champion, with an animal companion or a domain, spontaneous summoning, and eventually the power to take animal shape. Must be partly neutral.",
    hitDie: 8, bab: 'threequarter', goodSaves: ['fort', 'will'], skillRanks: 4,
    classSkills: [...CRAFT_ALL, 'climb', 'fly', 'handle-animal', 'heal', 'know-geography', 'know-nature', 'perception', 'profession-any', 'ride', 'spellcraft', 'survival', 'swim'],
    startingGold: 70, alignment: ['NG', 'LN', 'N', 'CN', 'NE'],
    proficiencies: { weapons: ['club', 'dagger', 'dart', 'quarterstaff', 'scimitar', 'sickle', 'sling', 'spear'], armor: ['light', 'medium', 'shield'] },
    features1: [
      { id: 'druid-nature-bond', name: 'Nature Bond', desc: 'Choose an animal companion or a cleric domain.' },
      { id: 'druid-nature-sense', name: 'Nature Sense', desc: '+2 bonus on Knowledge (nature) and Survival checks.', effects: [{ target: 'skill:know-nature', type: 'untyped', value: 2, note: 'Nature Sense' }, { target: 'skill:survival', type: 'untyped', value: 2, note: 'Nature Sense' }] },
      { id: 'druid-wild-empathy', name: 'Wild Empathy', desc: 'Improve the attitude of an animal as though using Diplomacy.' },
    ],
    spellcasting: { kind: 'prepared-list', ability: 'wis', list: 'druid', slots1: [3, 1] },
  },
  {
    id: 'monk', name: 'Monk', sub: 'Martial · d8 · unarmed',
    desc: 'Discipline as a weapon: flurries of blows, mobility, and all three good saves. Must be lawful.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['fort', 'ref', 'will'], skillRanks: 4,
    classSkills: [...CRAFT_ALL, 'acrobatics', 'climb', 'escape-artist', 'intimidate', 'know-history', 'know-religion', 'perception', 'perform-oratory', 'profession-any', 'ride', 'sense-motive', 'stealth', 'swim'],
    startingGold: 35, alignment: ['LG', 'LN', 'LE'],
    proficiencies: { weapons: ['club', 'dagger', 'crossbow-light', 'handaxe', 'javelin', 'kama', 'nunchaku', 'quarterstaff', 'sai', 'shuriken', 'siangham', 'sling', 'spear'], armor: [] },
    features1: [
      { id: 'monk-flurry', name: 'Flurry of Blows', desc: 'As a full attack, make one extra attack with unarmed strikes or special monk weapons at a −1 penalty to all.' },
      { id: 'monk-unarmed', name: 'Unarmed Strike', desc: 'Deal lethal 1d6 damage with unarmed strikes and are always armed. Gain Improved Unarmed Strike.' },
      { id: 'monk-stunning-fist', name: 'Stunning Fist', desc: 'Gain Stunning Fist as a bonus feat.' },
    ],
  },
  {
    id: 'paladin', name: 'Paladin', sub: 'Divine · d10 · LG only',
    desc: 'A holy warrior of unshakeable conviction — smite evil, divine grace, and immunity to fear. Must be Lawful Good.',
    hitDie: 10, bab: 'full', goodSaves: ['fort', 'will'], skillRanks: 2,
    classSkills: [...CRAFT_ALL, 'diplomacy', 'handle-animal', 'heal', 'know-nobility', 'know-religion', 'profession-any', 'ride', 'sense-motive', 'spellcraft'],
    startingGold: 175, alignment: ['LG'],
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'heavy', 'shield'] },
    features1: [
      { id: 'paladin-smite', name: 'Smite Evil', desc: 'Once per day, add Cha modifier to attack rolls and paladin level to damage against an evil target.' },
      { id: 'paladin-aura', name: 'Aura of Good / Detect Evil', desc: 'Project a strong aura of good and detect evil at will.' },
    ],
  },
  {
    id: 'ranger', name: 'Ranger', sub: 'Martial · d10 · favored enemy',
    desc: 'A hunter of chosen foes, at home in chosen lands, with combat-style feats that skip their prerequisites.',
    hitDie: 10, bab: 'full', goodSaves: ['fort', 'ref'], skillRanks: 6,
    classSkills: [...CRAFT_ALL, 'climb', 'handle-animal', 'heal', 'intimidate', 'know-dungeoneering', 'know-geography', 'know-nature', 'perception', 'profession-any', 'ride', 'spellcraft', 'stealth', 'survival', 'swim'],
    startingGold: 175,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shield'] },
    features1: [
      { id: 'ranger-favored-enemy', name: 'Favored Enemy', desc: '+2 bonus on attack and damage rolls and certain skills against one chosen creature type.' },
      { id: 'ranger-track', name: 'Track', desc: 'Add half level (minimum 1) to Survival checks to follow tracks.' },
      { id: 'ranger-wild-empathy', name: 'Wild Empathy', desc: 'Improve the attitude of an animal as though using Diplomacy.' },
    ],
  },
  {
    id: 'rogue', name: 'Rogue', sub: 'Skill · d8 · sneak attack',
    desc: "Precision damage and the party's answer to traps, locks, and awkward questions. Eight skill ranks a level.",
    hitDie: 8, bab: 'threequarter', goodSaves: ['ref'], skillRanks: 8,
    classSkills: [...CRAFT_ALL, 'acrobatics', 'appraise', 'bluff', 'climb', 'diplomacy', 'disable-device', 'disguise', 'escape-artist', 'intimidate', 'know-dungeoneering', 'know-local', 'linguistics', 'perception', 'perform-oratory', 'profession-any', 'sense-motive', 'sleight-of-hand', 'stealth', 'swim', 'use-magic-device'],
    startingGold: 140,
    proficiencies: { weapons: ['simple', 'hand-crossbow', 'rapier', 'sap', 'shortbow', 'shortsword'], armor: ['light'] },
    features1: [
      { id: 'rogue-sneak-attack', name: 'Sneak Attack', desc: '+1d6 damage when the target is denied its Dex bonus to AC or is flanked.' },
      { id: 'rogue-trapfinding', name: 'Trapfinding', desc: 'Add half level to Perception to locate traps and to Disable Device; can disarm magic traps.' },
    ],
  },
  {
    id: 'sorcerer', name: 'Sorcerer', sub: 'Arcane · d6 · bloodline',
    desc: 'Magic in the blood — spontaneous arcane casting shaped by an inborn bloodline that grants powers, bonus spells, and a class skill.',
    hitDie: 6, bab: 'half', goodSaves: ['will'], skillRanks: 2,
    classSkills: [...CRAFT_ALL, 'appraise', 'bluff', 'intimidate', 'know-arcana', 'profession-any', 'spellcraft', 'use-magic-device'],
    startingGold: 70,
    proficiencies: { weapons: ['simple'], armor: [] },
    features1: [
      { id: 'sorcerer-bloodline', name: 'Bloodline', desc: 'An inborn source of magic granting bonus spells, bonus feats, a bloodline arcana, and bloodline powers.' },
      { id: 'sorcerer-cantrips', name: 'Cantrips', desc: 'Learn a number of 0-level spells that can be cast at will.' },
    ],
    choices: [{ id: 'bloodline', label: 'Bloodline', kind: 'sorcerer-bloodline', count: 1 }],
    spellcasting: { kind: 'spontaneous', ability: 'cha', list: 'arcane', slots1: [999, 3], known1: [4, 2] },
  },
  {
    id: 'wizard', name: 'Wizard', sub: 'Arcane · d6 · school',
    desc: 'The scholar of magic. Choosing wizard opens an arcane-school choice; the school in turn opens two opposition-school choices. A prepared caster who learns spells into a spellbook.',
    hitDie: 6, bab: 'half', goodSaves: ['will'], skillRanks: 2,
    classSkills: [...CRAFT_ALL, ...KNOW_ALL, 'appraise', 'fly', 'linguistics', 'profession-any', 'spellcraft'],
    startingGold: 70,
    proficiencies: { weapons: ['club', 'dagger', 'crossbow-light', 'crossbow-heavy', 'quarterstaff'], armor: [] },
    features1: [
      { id: 'wizard-cantrips', name: 'Cantrips', desc: 'Prepare a number of 0-level spells that can be cast at will (they are not expended).' },
      { id: 'wizard-scribe-scroll', name: 'Scribe Scroll', desc: 'Gain Scribe Scroll as a bonus feat at 1st level.' },
    ],
    choices: [
      { id: 'arcane-bond', label: 'Arcane Bond', kind: 'arcane-bond', count: 1 },
      { id: 'school', label: 'Arcane School', kind: 'wizard-school', count: 1 },
      { id: 'opposition', label: 'Opposition Schools', kind: 'wizard-opposition', count: 2 },
    ],
    spellcasting: { kind: 'prepared-book', ability: 'int', list: 'arcane', slots1: [3, 1], bookPicks1: 'threePlusInt' },
  },
];

export const classById = new Map(CLASSES.map((c) => [c.id, c]));
