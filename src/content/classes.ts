import type { ClassDef } from './model';
import {
  CAVALIER_ORDERS, GUNSLINGER_FIREARMS, ORACLE_MYSTERIES, ORACLE_CURSES, WITCH_PATRONS,
  WITCH_HEXES, SUMMONER_EIDOLON_FORMS, ARCANIST_EXPLOITS, BLOODRAGER_BLOODLINES,
  SHIFTER_ASPECTS, SHAMAN_SPIRITS,
} from './subsystems';
import { CLASS_PROGRESSION } from './class-features';
import type { CasterProgression, SpellTable } from '../engine/progression';

// Caster level progression + the verified slots/known table for each casting class. Classes with
// unique tables not yet encoded (arcanist, vampire-hunter) are omitted → no slot numbers shown.
const CASTER: Record<string, { progression: CasterProgression; table: SpellTable }> = {
  cleric: { progression: 'full', table: 'prepared-full' },
  druid: { progression: 'full', table: 'prepared-full' },
  wizard: { progression: 'full', table: 'prepared-full' },
  witch: { progression: 'full', table: 'prepared-full' },
  shaman: { progression: 'full', table: 'prepared-full' },
  sorcerer: { progression: 'full', table: 'spontaneous-full' },
  oracle: { progression: 'full', table: 'spontaneous-full' },
  bard: { progression: 'six', table: 'bard' },
  skald: { progression: 'six', table: 'bard' },
  inquisitor: { progression: 'six', table: 'spont-six' },
  hunter: { progression: 'six', table: 'spont-six' },
  summoner: { progression: 'six', table: 'spont-six' },
  magus: { progression: 'six', table: 'prepared-six' },
  warpriest: { progression: 'six', table: 'prepared-six' },
  alchemist: { progression: 'six', table: 'extract' },
  investigator: { progression: 'six', table: 'extract' },
  paladin: { progression: 'four', table: 'four' },
  ranger: { progression: 'four', table: 'four' },
  bloodrager: { progression: 'four', table: 'four' },
};

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
    spellcasting: { kind: 'spontaneous', ability: 'cha', list: 'bard', progression: 'six', slots1: [999, 1], known1: [4, 2] },
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
    // Divine casting from 4th level (caster level = paladin level − 3); no level-1 spell selection.
    spellcasting: { kind: 'prepared-list', ability: 'cha', list: 'paladin', slots1: [] },
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
    // Divine casting from 4th level (caster level = ranger level − 3); no level-1 spell selection.
    spellcasting: { kind: 'prepared-list', ability: 'wis', list: 'ranger', slots1: [] },
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
    id: 'warpriest', name: 'Warpriest', sub: 'Hybrid · d8 · blessings',
    desc: 'A holy champion who fights with weapon and spell alike. Warpriests choose two blessings from their deity, wield the deity’s favored weapon with growing power, and prepare divine spells. Alignment must be within one step of the deity.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['fort', 'will'], skillRanks: 2,
    classSkills: [...CRAFT_ALL, 'climb', 'diplomacy', 'handle-animal', 'heal', 'intimidate', 'know-engineering', 'know-religion', 'profession-any', 'ride', 'sense-motive', 'spellcraft', 'survival', 'swim'],
    startingGold: 175,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'heavy', 'shield'] },
    features1: [
      { id: 'warpriest-blessings', name: 'Blessings', desc: 'Choose two blessings from those granted by your deity (matching the deity’s domains). Each grants minor and major powers usable a few times per day.' },
      { id: 'warpriest-focus-weapon', name: 'Focus Weapon', desc: 'Gain Weapon Focus with your deity’s favored weapon as a bonus feat.' },
      { id: 'warpriest-sacred-weapon', name: 'Sacred Weapon', desc: 'Deal increased damage with your deity’s favored weapon, and later enhance it with fervor.' },
      { id: 'warpriest-orisons', name: 'Orisons', desc: 'Prepare a number of 0-level spells that can be cast at will.' },
    ],
    choices: [{ id: 'blessings', label: 'Blessings', kind: 'warpriest-blessings', count: 2 }],
    spellcasting: { kind: 'prepared-list', ability: 'wis', list: 'divine', slots1: [3, 1] },
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

  // ─────────────────────────── BASE CLASSES ───────────────────────────
  {
    id: 'alchemist', name: 'Alchemist', sub: 'Base · d8 · bombs & extracts',
    desc: 'A master of volatile chemistry — hurling bombs, drinking mutagens, and preparing spell-like extracts from a formula book. (Extract selection isn’t modeled yet; features only.)',
    hitDie: 8, bab: 'threequarter', goodSaves: ['fort', 'ref'], skillRanks: 4,
    classSkills: ['appraise', ...CRAFT_ALL, 'disable-device', 'fly', 'heal', 'know-arcana', 'know-nature', 'perception', 'profession-any', 'sleight-of-hand', 'spellcraft', 'survival', 'use-magic-device'],
    startingGold: 105,
    proficiencies: { weapons: ['simple'], armor: ['light'] },
    features1: [
      { id: 'alch-alchemy', name: 'Alchemy', desc: 'Prepare Int-based extracts from a formula book (a private, potion-like magic). Begins with two 1st-level formulae plus Int modifier more.' },
      { id: 'alch-bomb', name: 'Bombs', desc: 'Throw splash bombs dealing 1d6 + Int fire damage, a number per day equal to level + Int modifier.' },
      { id: 'alch-mutagen', name: 'Mutagen', desc: 'Brew a mutagen granting +4 to one physical ability and +2 natural armor (with a mental penalty).' },
      { id: 'alch-throw', name: 'Throw Anything', desc: 'Gain Throw Anything as a bonus feat; add Int to splash damage.' },
    ],
    // Extracts per day use the 6-level "extract" table (no 0-level); no creation-time selection.
    spellcasting: { kind: 'prepared-list', ability: 'int', list: 'arcane', slots1: [] },
  },
  {
    id: 'cavalier', name: 'Cavalier', sub: 'Base · d10 · order & mount',
    desc: 'A mounted champion sworn to an order, issuing challenges and rallying allies with battlefield tactics.',
    hitDie: 10, bab: 'full', goodSaves: ['fort', 'will'], skillRanks: 4,
    classSkills: ['bluff', 'climb', ...CRAFT_ALL, 'diplomacy', 'handle-animal', 'intimidate', 'profession-any', 'ride', 'sense-motive', 'swim'],
    startingGold: 175,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'heavy', 'shield'] },
    features1: [
      { id: 'cav-challenge', name: 'Challenge', desc: 'Once per day, single out a foe for extra damage equal to your level (with an order-specific benefit).' },
      { id: 'cav-mount', name: 'Mount', desc: 'Gain a mount functioning as a druid’s animal companion.' },
      { id: 'cav-tactician', name: 'Tactician', desc: 'Gain a teamwork feat and can grant it to nearby allies for a few rounds.' },
    ],
    choices: [{ id: 'order', label: 'Order', kind: 'list', count: 1, options: CAVALIER_ORDERS }],
  },
  {
    id: 'gunslinger', name: 'Gunslinger', sub: 'Base · d10 · grit & guns',
    desc: 'A daring shootist who spends grit to perform death-defying deeds with firearms.',
    hitDie: 10, bab: 'full', goodSaves: ['fort', 'ref'], skillRanks: 4,
    classSkills: ['acrobatics', 'bluff', 'climb', ...CRAFT_ALL, 'handle-animal', 'heal', 'intimidate', 'know-engineering', 'know-local', 'perception', 'profession-any', 'ride', 'sleight-of-hand', 'survival', 'swim'],
    startingGold: 175,
    proficiencies: { weapons: ['simple', 'martial', 'firearms'], armor: ['light'] },
    features1: [
      { id: 'gun-grit', name: 'Grit', desc: 'A pool of Wis-based grit points (regained by crits and killing blows) that fuel deeds.' },
      { id: 'gun-gunsmith', name: 'Gunsmith', desc: 'Start with a battered firearm and Gunsmithing as a bonus feat.' },
      { id: 'gun-deeds', name: 'Deeds', desc: 'Deadeye, Gunslinger’s Dodge, and Quick Clear at 1st level.' },
    ],
    choices: [{ id: 'firearm', label: 'Starting firearm', kind: 'list', count: 1, options: GUNSLINGER_FIREARMS }],
  },
  {
    id: 'inquisitor', name: 'Inquisitor', sub: 'Base · d8 · judgment',
    desc: 'A relentless agent of a faith — a divine caster with a domain, teamwork feats, and combat judgments. Alignment must be within one step of the deity.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['fort', 'will'], skillRanks: 6,
    classSkills: ['bluff', 'climb', ...CRAFT_ALL, 'diplomacy', 'disguise', 'heal', 'intimidate', 'know-arcana', 'know-dungeoneering', 'know-nature', 'know-planes', 'know-religion', 'perception', 'profession-any', 'ride', 'sense-motive', 'spellcraft', 'stealth', 'survival', 'swim'],
    startingGold: 140,
    proficiencies: { weapons: ['simple', 'hand-crossbow', 'longbow', 'shortbow'], armor: ['light', 'medium', 'shield'] },
    features1: [
      { id: 'inq-judgment', name: 'Judgment', desc: 'Once per day, pronounce a combat judgment (destruction, healing, justice, protection, and more) as a swift action.' },
      { id: 'inq-domain', name: 'Domain', desc: 'Gain one domain from your deity’s list (granted power only, not domain spells).' },
      { id: 'inq-stern-gaze', name: 'Stern Gaze', desc: 'A morale bonus on Intimidate and Sense Motive equal to half your level.' },
    ],
    choices: [{ id: 'domain', label: 'Domain', kind: 'cleric-domains', count: 1 }],
    spellcasting: { kind: 'spontaneous', ability: 'wis', list: 'divine', slots1: [999, 1], known1: [4, 2] },
  },
  {
    id: 'magus', name: 'Magus', sub: 'Base · d8 · spell combat',
    desc: 'A blade-and-spell hybrid who channels arcane power through weapons via an arcane pool and spell combat. Prepares spells from a spellbook.',
    hitDie: 8, bab: 'full', goodSaves: ['fort', 'will'], skillRanks: 2,
    classSkills: ['climb', ...CRAFT_ALL, 'fly', 'intimidate', 'know-arcana', 'know-dungeoneering', 'know-planes', 'profession-any', 'ride', 'spellcraft', 'swim', 'use-magic-device'],
    startingGold: 140,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light'] },
    features1: [
      { id: 'mag-arcane-pool', name: 'Arcane Pool', desc: 'A pool of ½ level + Int points; spend to grant your weapon a temporary enhancement bonus.' },
      { id: 'mag-spell-combat', name: 'Spell Combat', desc: 'Cast a spell and make all your weapon attacks in the same round, at a penalty.' },
      { id: 'mag-cantrips', name: 'Cantrips', desc: 'Prepare 0-level magus spells, cast at will.' },
    ],
    spellcasting: { kind: 'prepared-book', ability: 'int', list: 'arcane', slots1: [3, 1], bookPicks1: 'threePlusInt' },
  },
  {
    id: 'oracle', name: 'Oracle', sub: 'Base · d8 · mystery',
    desc: 'A divine spontaneous caster granted power by a mystery, wielding revelations at the price of an oracle’s curse.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['will'], skillRanks: 4,
    classSkills: [...CRAFT_ALL, 'diplomacy', 'heal', 'know-history', 'know-planes', 'know-religion', 'profession-any', 'sense-motive', 'spellcraft'],
    startingGold: 105,
    proficiencies: { weapons: ['simple'], armor: ['light', 'medium', 'shield'] },
    features1: [
      { id: 'ora-revelation', name: 'Revelation', desc: 'Gain one revelation from your mystery at 1st level.' },
      { id: 'ora-orisons', name: 'Orisons', desc: 'Know a number of 0-level divine spells, cast at will.' },
    ],
    choices: [
      { id: 'mystery', label: 'Mystery', kind: 'list', count: 1, options: ORACLE_MYSTERIES },
      { id: 'curse', label: 'Oracle’s Curse', kind: 'list', count: 1, options: ORACLE_CURSES },
    ],
    spellcasting: { kind: 'spontaneous', ability: 'cha', list: 'divine', slots1: [999, 3], known1: [4, 2] },
  },
  {
    id: 'shifter', name: 'Shifter', sub: 'Base · d10 · animal aspects',
    desc: 'A martial shapeshifter who takes on animal aspects and fights with shifter claws. Must be partly neutral.',
    hitDie: 10, bab: 'full', goodSaves: ['fort', 'ref'], skillRanks: 4,
    classSkills: ['acrobatics', 'climb', ...CRAFT_ALL, 'fly', 'handle-animal', 'heal', 'intimidate', 'know-nature', 'perception', 'profession-any', 'ride', 'survival', 'swim'],
    startingGold: 105, alignment: ['NG', 'LN', 'N', 'CN', 'NE'],
    proficiencies: { weapons: ['club', 'dagger', 'quarterstaff', 'scimitar', 'spear'], armor: ['light', 'medium'] },
    features1: [
      { id: 'shf-claws', name: 'Shifter Claws', desc: 'Grow magical claws dealing 1d4 damage as natural attacks.' },
      { id: 'shf-aspect', name: 'Shifter Aspect', desc: 'Take on a chosen animal aspect for a few minutes per day as a swift action.' },
      { id: 'shf-wild-empathy', name: 'Wild Empathy', desc: 'Influence animal attitudes as though using Diplomacy.' },
    ],
    choices: [{ id: 'aspect', label: 'Shifter aspect', kind: 'list', count: 1, options: SHIFTER_ASPECTS }],
  },
  {
    id: 'summoner', name: 'Summoner', sub: 'Base · d8 · eidolon',
    desc: 'An arcanist bonded to an eidolon — a customizable outsider companion — and a master of summon monster. Spells are spontaneous.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['will'], skillRanks: 2,
    classSkills: [...CRAFT_ALL, 'fly', 'handle-animal', ...KNOW_ALL, 'linguistics', 'profession-any', 'ride', 'spellcraft', 'use-magic-device'],
    startingGold: 70,
    proficiencies: { weapons: ['simple'], armor: ['light'] },
    features1: [
      { id: 'sum-eidolon', name: 'Eidolon', desc: 'Summon and customize an outsider companion using evolution points.' },
      { id: 'sum-life-link', name: 'Life Link', desc: 'Sacrifice your own hit points to keep your eidolon in the fight.' },
      { id: 'sum-summon-monster', name: 'Summon Monster I', desc: 'Cast summon monster I as a spell-like ability 3 + Cha modifier times per day.' },
    ],
    choices: [{ id: 'eidolon-form', label: 'Eidolon base form', kind: 'list', count: 1, options: SUMMONER_EIDOLON_FORMS }],
    spellcasting: { kind: 'spontaneous', ability: 'cha', list: 'arcane', slots1: [999, 1], known1: [4, 2] },
  },
  {
    id: 'witch', name: 'Witch', sub: 'Base · d6 · hexes & patron',
    desc: 'A spellcaster who draws arcane secrets from a mysterious patron through a familiar, and curses foes with hexes. Prepares spells stored in the familiar.',
    hitDie: 6, bab: 'half', goodSaves: ['will'], skillRanks: 2,
    classSkills: [...CRAFT_ALL, 'fly', 'heal', 'intimidate', 'know-arcana', 'know-history', 'know-nature', 'know-planes', 'profession-any', 'spellcraft', 'use-magic-device'],
    startingGold: 105,
    proficiencies: { weapons: ['simple'], armor: [] },
    features1: [
      { id: 'wit-familiar', name: 'Witch’s Familiar', desc: 'A familiar stores your spells; you prepare from it each day.' },
      { id: 'wit-cantrips', name: 'Cantrips', desc: 'Prepare 0-level witch spells, cast at will.' },
    ],
    choices: [
      { id: 'patron', label: 'Patron', kind: 'list', count: 1, options: WITCH_PATRONS },
      { id: 'hex', label: 'Hex', kind: 'list', count: 1, options: WITCH_HEXES },
    ],
    spellcasting: { kind: 'prepared-book', ability: 'int', list: 'arcane', slots1: [3, 1], bookPicks1: 'threePlusInt' },
  },
  {
    id: 'vampire-hunter', name: 'Vampire Hunter', sub: 'Base · d8 · monster slayer',
    desc: 'A grim specialist in hunting the undead, with a vampiric focus and a growing arsenal of techniques. Divine spellcasting begins at 4th level.',
    hitDie: 8, bab: 'full', goodSaves: ['ref', 'will'], skillRanks: 6,
    classSkills: ['bluff', 'climb', ...CRAFT_ALL, 'handle-animal', 'heal', 'intimidate', 'know-arcana', 'know-geography', 'know-local', 'know-religion', 'perception', 'profession-any', 'ride', 'sense-motive', 'spellcraft', 'stealth', 'survival', 'swim'],
    startingGold: 175,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shield'] },
    features1: [
      { id: 'vh-detect-undead', name: 'Detect Undead', desc: 'Detect undead at will as a spell-like ability.' },
      { id: 'vh-focus', name: 'Vampiric Focus', desc: 'A pool of focus fueling anti-undead techniques and blessings.' },
      { id: 'vh-technique', name: 'Technique Feat', desc: 'Gain a bonus combat or technique feat.' },
      { id: 'vh-track', name: 'Track', desc: 'Add half your level to Survival checks to follow tracks.' },
    ],
  },

  // ─────────────────────────── HYBRID CLASSES ───────────────────────────
  {
    id: 'arcanist', name: 'Arcanist', sub: 'Hybrid · d6 · reservoir',
    desc: 'A scholar of magic who prepares spells in a spellbook yet casts them with a sorcerer’s flexibility, fueling exploits from an arcane reservoir.',
    hitDie: 6, bab: 'half', goodSaves: ['will'], skillRanks: 2,
    classSkills: ['appraise', ...CRAFT_ALL, 'fly', ...KNOW_ALL, 'linguistics', 'profession-any', 'spellcraft', 'use-magic-device'],
    startingGold: 70,
    proficiencies: { weapons: ['simple'], armor: [] },
    features1: [
      { id: 'arc-reservoir', name: 'Arcane Reservoir', desc: 'A daily pool of magic (3 + ½ level points) that fuels exploits and empowers spells.' },
      { id: 'arc-consume', name: 'Consume Spells', desc: 'Expend a prepared spell slot to refill the reservoir.' },
      { id: 'arc-cantrips', name: 'Cantrips', desc: 'Prepare 0-level arcanist spells, cast at will.' },
    ],
    choices: [{ id: 'exploit', label: 'Arcanist exploit', kind: 'list', count: 1, options: ARCANIST_EXPLOITS }],
    spellcasting: { kind: 'prepared-book', ability: 'int', list: 'arcane', slots1: [3, 1], bookPicks1: 'threePlusInt' },
  },
  {
    id: 'bloodrager', name: 'Bloodrager', sub: 'Hybrid · d10 · bloodrage',
    desc: 'A barbarian whose fury awakens innate magic from a bloodline. (Spontaneous arcane casting begins at 4th level — no spells at 1st.)',
    hitDie: 10, bab: 'full', goodSaves: ['fort', 'will'], skillRanks: 4,
    classSkills: ['acrobatics', 'climb', ...CRAFT_ALL, 'handle-animal', 'intimidate', 'know-arcana', 'perception', 'ride', 'spellcraft', 'survival', 'swim'],
    startingGold: 105,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shield'] },
    features1: [
      { id: 'blr-bloodrage', name: 'Bloodrage', desc: 'Rage for 4 + Con rounds/day, gaining +4 Str/Con, +2 Will, −2 AC, and triggering bloodline powers.' },
      { id: 'blr-fast-movement', name: 'Fast Movement', desc: '+10 feet base land speed in light or medium armor.' },
    ],
    choices: [{ id: 'bloodline', label: 'Bloodline', kind: 'list', count: 1, options: BLOODRAGER_BLOODLINES }],
    // Spontaneous arcane casting from 4th level (caster level = level − 3); no level-1 spells.
    spellcasting: { kind: 'spontaneous', ability: 'cha', list: 'arcane', slots1: [] },
  },
  {
    id: 'brawler', name: 'Brawler', sub: 'Hybrid · d10 · martial flexibility',
    desc: 'An unarmed fighter who adapts mid-battle, borrowing combat feats on the fly and flurrying with fists and close weapons.',
    hitDie: 10, bab: 'full', goodSaves: ['fort', 'ref'], skillRanks: 4,
    classSkills: ['acrobatics', 'climb', ...CRAFT_ALL, 'escape-artist', 'handle-animal', 'intimidate', 'know-dungeoneering', 'know-local', 'perception', 'profession-any', 'ride', 'sense-motive', 'swim'],
    startingGold: 105,
    proficiencies: { weapons: ['simple', 'handaxe', 'shortsword'], armor: ['light', 'shield'] },
    features1: [
      { id: 'brw-unarmed', name: 'Improved Unarmed Strike', desc: 'Deal 1d6 lethal unarmed damage and count as armed; gain Improved Unarmed Strike.' },
      { id: 'brw-flexibility', name: 'Martial Flexibility', desc: 'As a move action, gain a combat feat you don’t have for a short time, a few times per day.' },
      { id: 'brw-training', name: 'Martial Training', desc: 'Count as both fighter and monk for feat and item prerequisites.' },
    ],
  },
  {
    id: 'hunter', name: 'Hunter', sub: 'Hybrid · d8 · animal focus',
    desc: 'A wilderness warrior bonded to an animal companion, borrowing animal aspects and casting nature spells spontaneously. Must be partly neutral.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['fort', 'ref'], skillRanks: 6,
    classSkills: ['climb', ...CRAFT_ALL, 'handle-animal', 'heal', 'intimidate', 'know-dungeoneering', 'know-geography', 'know-nature', 'perception', 'profession-any', 'ride', 'spellcraft', 'stealth', 'survival', 'swim'],
    startingGold: 140, alignment: ['NG', 'LN', 'N', 'CN', 'NE'],
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shield'] },
    features1: [
      { id: 'hun-companion', name: 'Animal Companion', desc: 'Gain a companion as a druid of your level.' },
      { id: 'hun-focus', name: 'Animal Focus', desc: 'Take on an animal’s aspect (and grant one to your companion) for minutes per day.' },
      { id: 'hun-nature-training', name: 'Nature Training', desc: 'Count as both druid and ranger for feats and options.' },
    ],
    spellcasting: { kind: 'spontaneous', ability: 'wis', list: 'druid', slots1: [999, 1], known1: [4, 2] },
  },
  {
    id: 'investigator', name: 'Investigator', sub: 'Hybrid · d8 · inspiration',
    desc: 'A brilliant sleuth who mixes alchemical extracts with keen deduction, spending inspiration to excel at checks. (Extract selection isn’t modeled yet; features only.)',
    hitDie: 8, bab: 'threequarter', goodSaves: ['ref', 'will'], skillRanks: 6,
    classSkills: ['acrobatics', 'appraise', 'bluff', 'climb', ...CRAFT_ALL, 'diplomacy', 'disable-device', 'disguise', 'escape-artist', 'heal', 'intimidate', ...KNOW_ALL, 'linguistics', 'perception', 'perform-oratory', 'profession-any', 'sense-motive', 'sleight-of-hand', 'spellcraft', 'stealth', 'use-magic-device'],
    startingGold: 105,
    proficiencies: { weapons: ['simple', 'hand-crossbow', 'rapier', 'sap', 'shortbow', 'shortsword'], armor: ['light'] },
    features1: [
      { id: 'inv-alchemy', name: 'Alchemy', desc: 'Prepare Int-based extracts from a formula book, like an alchemist.' },
      { id: 'inv-inspiration', name: 'Inspiration', desc: 'A pool of ½ level + Int; spend to add 1d6 to a check.' },
      { id: 'inv-trapfinding', name: 'Trapfinding', desc: 'Add half your level to find and disable traps, including magical ones.' },
    ],
    // Extracts per day use the 6-level "extract" table (no 0-level); no creation-time selection.
    spellcasting: { kind: 'prepared-list', ability: 'int', list: 'arcane', slots1: [] },
  },
  {
    id: 'shaman', name: 'Shaman', sub: 'Hybrid · d8 · spirit',
    desc: 'A divine caster guided by a spirit, blending prepared spells, spontaneous spirit magic, and hexes.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['will'], skillRanks: 4,
    classSkills: [...CRAFT_ALL, 'diplomacy', 'fly', 'handle-animal', 'heal', 'know-nature', 'know-planes', 'know-religion', 'profession-any', 'ride', 'spellcraft', 'survival'],
    startingGold: 105,
    proficiencies: { weapons: ['simple'], armor: ['light', 'medium', 'shield'] },
    features1: [
      { id: 'sha-spirit-animal', name: 'Spirit Animal', desc: 'A familiar that stores your spells and links you to your spirit.' },
      { id: 'sha-spirit-magic', name: 'Spirit Magic', desc: 'Spontaneously cast a small set of spells granted by your chosen spirit.' },
      { id: 'sha-orisons', name: 'Orisons', desc: 'Prepare 0-level shaman spells, cast at will.' },
    ],
    choices: [{ id: 'spirit', label: 'Spirit', kind: 'list', count: 1, options: SHAMAN_SPIRITS }],
    spellcasting: { kind: 'prepared-list', ability: 'wis', list: 'divine', slots1: [3, 1] },
  },
  {
    id: 'skald', name: 'Skald', sub: 'Hybrid · d8 · raging song',
    desc: 'A battle-poet whose raging song drives allies into a controlled fury; casts bard spells spontaneously.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['fort', 'will'], skillRanks: 4,
    classSkills: ['acrobatics', 'appraise', 'bluff', 'climb', ...CRAFT_ALL, 'diplomacy', 'escape-artist', 'handle-animal', 'intimidate', ...KNOW_ALL, 'linguistics', 'perception', 'perform-oratory', 'perform-strings', 'profession-any', 'ride', 'sense-motive', 'spellcraft', 'swim', 'use-magic-device'],
    startingGold: 105,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shield'] },
    features1: [
      { id: 'skd-raging-song', name: 'Raging Song', desc: 'Perform to grant allies a barbarian-like rage or other rousing effects.' },
      { id: 'skd-knowledge', name: 'Bardic Knowledge', desc: 'Add half your level to all Knowledge checks and make them untrained.' },
      { id: 'skd-scribe', name: 'Scribe Scroll', desc: 'Gain Scribe Scroll as a bonus feat.' },
    ],
    spellcasting: { kind: 'spontaneous', ability: 'cha', list: 'bard', progression: 'six', slots1: [999, 1], known1: [4, 2] },
  },
  {
    id: 'slayer', name: 'Slayer', sub: 'Hybrid · d10 · studied target',
    desc: 'A lethal hunter of humanoids blending the ranger’s tracking with the rogue’s precision, studying a target for deadly advantage.',
    hitDie: 10, bab: 'full', goodSaves: ['fort', 'ref'], skillRanks: 6,
    classSkills: ['acrobatics', 'bluff', 'climb', ...CRAFT_ALL, 'disable-device', 'disguise', 'escape-artist', 'heal', 'intimidate', 'know-dungeoneering', 'know-geography', 'know-local', 'perception', 'profession-any', 'ride', 'sense-motive', 'sleight-of-hand', 'stealth', 'survival', 'swim'],
    startingGold: 175,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shield'] },
    features1: [
      { id: 'sly-studied-target', name: 'Studied Target', desc: 'Study a foe as a move action to gain scaling bonuses on attacks, damage, and skills against it.' },
      { id: 'sly-track', name: 'Track', desc: 'Add half your level to Survival checks to follow tracks.' },
    ],
  },
  {
    id: 'swashbuckler', name: 'Swashbuckler', sub: 'Hybrid · d10 · panache',
    desc: 'A daring duelist who spends panache on flashy deeds and finesse-fights with light piercing blades.',
    hitDie: 10, bab: 'full', goodSaves: ['ref'], skillRanks: 4,
    classSkills: ['acrobatics', 'bluff', 'climb', ...CRAFT_ALL, 'diplomacy', 'escape-artist', 'intimidate', 'know-local', 'know-nobility', 'perception', 'perform-oratory', 'profession-any', 'ride', 'sense-motive', 'sleight-of-hand', 'swim'],
    startingGold: 175,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light'] },
    features1: [
      { id: 'swb-panache', name: 'Panache', desc: 'A Cha-based pool (regained by crits and killing blows with piercing weapons) that fuels deeds.' },
      { id: 'swb-deeds', name: 'Deeds', desc: 'Derring-Do, Dodging Panache, and Opportune Parry and Riposte at 1st level.' },
      { id: 'swb-finesse', name: 'Swashbuckler Finesse', desc: 'Use Weapon Finesse for free with light and one-handed piercing weapons.' },
    ],
  },
];

// Attach the Part-B per-level progression (features, bonus feats, per-level subsystem picks).
// Classes without an entry keep only their level-1 `features1` fallback (the engine handles that).
for (const c of CLASSES) {
  const prog = CLASS_PROGRESSION[c.id];
  if (!prog) continue;
  c.features = prog.features;
  if (prog.bonusFeats) c.bonusFeats = prog.bonusFeats;
  if (prog.choices) c.choices = [...(c.choices ?? []), ...prog.choices];
}
for (const c of CLASSES) {
  const cfg = CASTER[c.id];
  if (c.spellcasting && cfg) { c.spellcasting.progression = cfg.progression; c.spellcasting.table = cfg.table; }
}

export const classById = new Map(CLASSES.map((c) => [c.id, c]));
