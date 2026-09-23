import type { ClassDef } from './model';
import {
  CAVALIER_ORDERS, GUNSLINGER_FIREARMS, ORACLE_MYSTERIES, ORACLE_CURSES, WITCH_PATRONS,
  WITCH_HEXES, ARCANIST_EXPLOITS, BLOODRAGER_BLOODLINES,
  SHIFTER_ASPECTS, SHAMAN_SPIRITS, EIDOLON_EVOLUTIONS,
  NATURE_BOND, HUNTERS_BOND,
} from './subsystems';
import { CLASS_PROGRESSION } from './class-features';
import { archetypesForClass } from './archetypes';
import type { CasterProgression, SpellTable } from '../engine/progression';

// Caster level progression + the verified slots/known table for each casting class. Every class
// that casts now has one; a content test asserts the set of table-less casters is empty.
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
  // The two four-level *spontaneous* casters share the slots grid but know different numbers
  // of spells, so each carries its own tag.
  bloodrager: { progression: 'four', table: 'bloodrager' },
  'vampire-hunter': { progression: 'four', table: 'vampire-hunter' },
  arcanist: { progression: 'full', table: 'arcanist' },
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
  },
  {
    id: 'barbarian', name: 'Barbarian', sub: 'Martial · d12 · rage',
    desc: 'Fury given form — rage powers, fast movement, and the biggest hit die in the game. Cannot be lawful.',
    hitDie: 12, bab: 'full', goodSaves: ['fort'], skillRanks: 4,
    classSkills: [...CRAFT_ALL, 'handle-animal', 'intimidate', 'know-nature', 'perception', 'ride', 'survival', 'swim', 'climb', 'acrobatics'],
    startingGold: 105, alignment: ['NG', 'CG', 'N', 'CN', 'NE', 'CE'],
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shield'] },
  },
  {
    id: 'bard', name: 'Bard', sub: 'Arcane · d8 · 6 skills',
    desc: 'Jack of all trades: spontaneous arcane spells, songs that lift the whole party, and every skill under the sun.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['ref', 'will'], skillRanks: 6,
    classSkills: [...CRAFT_ALL, ...KNOW_ALL, 'acrobatics', 'appraise', 'bluff', 'climb', 'diplomacy', 'disguise', 'escape-artist', 'intimidate', 'linguistics', 'perception', 'perform-oratory', 'perform-strings', 'profession-any', 'sense-motive', 'sleight-of-hand', 'spellcraft', 'stealth', 'use-magic-device'],
    startingGold: 105,
    proficiencies: { weapons: ['simple', 'longsword', 'rapier', 'sap', 'shortbow', 'short-sword', 'whip'], armor: ['light', 'shield'] },
    spellcasting: { kind: 'spontaneous', ability: 'cha', list: 'bard', progression: 'six', slots1: [999, 1], known1: [4, 2] },
  },
  {
    id: 'cleric', name: 'Cleric', sub: 'Divine · d8 · 9th-level caster',
    desc: 'A conduit of divine power. Two domains chosen from the deity, channel energy, and full prepared divine casting.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['fort', 'will'], skillRanks: 2,
    classSkills: [...CRAFT_ALL, 'appraise', 'diplomacy', 'heal', 'know-arcana', 'know-history', 'know-nobility', 'know-planes', 'know-religion', 'linguistics', 'profession-any', 'sense-motive', 'spellcraft'],
    startingGold: 140,
    proficiencies: { weapons: ['simple'], armor: ['light', 'medium', 'heavy', 'shield'] },
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
    choices: [
      { id: 'nature-bond', label: 'Nature Bond', kind: 'list', count: 1, options: NATURE_BOND },
      { id: 'animal-companion', label: 'Animal Companion', kind: 'companion', companionKind: 'animal', count: 1, requires: { choiceId: 'nature-bond', value: 'animal-companion' } },
    ],
    companions: [{ choiceId: 'animal-companion', kind: 'animal', label: 'Animal Companion' }],
    spellcasting: { kind: 'prepared-list', ability: 'wis', list: 'druid', slots1: [3, 1] },
  },
  {
    id: 'monk', name: 'Monk', sub: 'Martial · d8 · unarmed',
    desc: 'Discipline as a weapon: flurries of blows, mobility, and all three good saves. Must be lawful.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['fort', 'ref', 'will'], skillRanks: 4,
    classSkills: [...CRAFT_ALL, 'acrobatics', 'climb', 'escape-artist', 'intimidate', 'know-history', 'know-religion', 'perception', 'perform-oratory', 'profession-any', 'ride', 'sense-motive', 'stealth', 'swim'],
    startingGold: 35, alignment: ['LG', 'LN', 'LE'],
    proficiencies: { weapons: ['club', 'dagger', 'light-crossbow', 'handaxe', 'javelin', 'kama', 'nunchaku', 'quarterstaff', 'sai', 'shuriken', 'siangham', 'sling', 'spear'], armor: [] },
  },
  {
    id: 'paladin', name: 'Paladin', sub: 'Divine · d10 · LG only',
    desc: 'A holy warrior of unshakeable conviction — smite evil, divine grace, and immunity to fear. Must be Lawful Good.',
    hitDie: 10, bab: 'full', goodSaves: ['fort', 'will'], skillRanks: 2,
    classSkills: [...CRAFT_ALL, 'diplomacy', 'handle-animal', 'heal', 'know-nobility', 'know-religion', 'profession-any', 'ride', 'sense-motive', 'spellcraft'],
    startingGold: 175, alignment: ['LG'],
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'heavy', 'shield'] },
    // The Divine Bond choice itself lives in CLASS_PROGRESSION (it is gained at 5th); this only
    // adds the creature pick that the mount branch opens.
    choices: [
      { id: 'paladin-mount', label: 'Bonded Mount', kind: 'companion', companionKind: 'animal', count: 1, levels: [5], requires: { choiceId: 'divine-bond', value: 'mount' } },
    ],
    // The bonded mount uses the paladin's own level as its effective druid level (verified).
    companions: [{ choiceId: 'paladin-mount', kind: 'animal', label: 'Bonded Mount', minLevel: 5 }],
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
    choices: [
      { id: 'hunters-bond', label: "Hunter's Bond", kind: 'list', count: 1, levels: [4], options: HUNTERS_BOND },
      { id: 'ranger-companion', label: 'Animal Companion', kind: 'companion', companionKind: 'animal', count: 1, levels: [4], requires: { choiceId: 'hunters-bond', value: 'animal-companion' } },
    ],
    // The ranger's effective druid level is his ranger level − 3, so the companion starts at 4th.
    companions: [{ choiceId: 'ranger-companion', kind: 'animal', label: 'Animal Companion', levelOffset: 3, minLevel: 4 }],
    // Divine casting from 4th level (caster level = ranger level − 3); no level-1 spell selection.
    spellcasting: { kind: 'prepared-list', ability: 'wis', list: 'ranger', slots1: [] },
  },
  {
    id: 'rogue', name: 'Rogue', sub: 'Skill · d8 · sneak attack',
    desc: "Precision damage and the party's answer to traps, locks, and awkward questions. Eight skill ranks a level.",
    hitDie: 8, bab: 'threequarter', goodSaves: ['ref'], skillRanks: 8,
    classSkills: [...CRAFT_ALL, 'acrobatics', 'appraise', 'bluff', 'climb', 'diplomacy', 'disable-device', 'disguise', 'escape-artist', 'intimidate', 'know-dungeoneering', 'know-local', 'linguistics', 'perception', 'perform-oratory', 'profession-any', 'sense-motive', 'sleight-of-hand', 'stealth', 'swim', 'use-magic-device'],
    startingGold: 140,
    proficiencies: { weapons: ['simple', 'hand-crossbow', 'rapier', 'sap', 'shortbow', 'short-sword'], armor: ['light'] },
  },
  {
    id: 'sorcerer', name: 'Sorcerer', sub: 'Arcane · d6 · bloodline',
    desc: 'Magic in the blood — spontaneous arcane casting shaped by an inborn bloodline that grants powers, bonus spells, and a class skill.',
    hitDie: 6, bab: 'half', goodSaves: ['will'], skillRanks: 2,
    classSkills: [...CRAFT_ALL, 'appraise', 'bluff', 'intimidate', 'know-arcana', 'profession-any', 'spellcraft', 'use-magic-device'],
    startingGold: 70,
    proficiencies: { weapons: ['simple'], armor: [] },
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
    choices: [{ id: 'blessings', label: 'Blessings', kind: 'warpriest-blessings', count: 2 }],
    spellcasting: { kind: 'prepared-list', ability: 'wis', list: 'divine', slots1: [3, 1] },
  },
  {
    id: 'wizard', name: 'Wizard', sub: 'Arcane · d6 · school',
    desc: 'The scholar of magic. Choosing wizard opens an arcane-school choice; the school in turn opens two opposition-school choices. A prepared caster who learns spells into a spellbook.',
    hitDie: 6, bab: 'half', goodSaves: ['will'], skillRanks: 2,
    classSkills: [...CRAFT_ALL, ...KNOW_ALL, 'appraise', 'fly', 'linguistics', 'profession-any', 'spellcraft'],
    startingGold: 70,
    proficiencies: { weapons: ['club', 'dagger', 'light-crossbow', 'heavy-crossbow', 'quarterstaff'], armor: [] },
    choices: [
      { id: 'arcane-bond', label: 'Arcane Bond', kind: 'arcane-bond', count: 1 },
      { id: 'familiar', label: 'Familiar', kind: 'companion', companionKind: 'familiar', count: 1, requires: { choiceId: 'arcane-bond', value: 'familiar' } },
      { id: 'school', label: 'Arcane School', kind: 'wizard-school', count: 1 },
      { id: 'opposition', label: 'Opposition Schools', kind: 'wizard-opposition', count: 2 },
    ],
    companions: [{ choiceId: 'familiar', kind: 'familiar', label: 'Familiar' }],
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
    // Extracts per day use the 6-level "extract" table (no 0-level); no creation-time selection.
    // Its own formulae list, 1st-6th - not the sorcerer/wizard list it used to borrow.
    spellcasting: { kind: 'prepared-list', ability: 'int', list: 'alchemist', slots1: [] },
  },
  {
    id: 'cavalier', name: 'Cavalier', sub: 'Base · d10 · order & mount',
    desc: 'A mounted champion sworn to an order, issuing challenges and rallying allies with battlefield tactics.',
    hitDie: 10, bab: 'full', goodSaves: ['fort'], skillRanks: 4,
    classSkills: ['bluff', 'climb', ...CRAFT_ALL, 'diplomacy', 'handle-animal', 'intimidate', 'profession-any', 'ride', 'sense-motive', 'swim'],
    startingGold: 175,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'heavy', 'shield'] },
    choices: [
      { id: 'order', label: 'Order', kind: 'list', count: 1, options: CAVALIER_ORDERS },
      { id: 'mount', label: 'Mount', kind: 'companion', companionKind: 'animal', count: 1 },
    ],
    companions: [{ choiceId: 'mount', kind: 'animal', label: 'Mount' }],
  },
  {
    id: 'gunslinger', name: 'Gunslinger', sub: 'Base · d10 · grit & guns',
    desc: 'A daring shootist who spends grit to perform death-defying deeds with firearms.',
    hitDie: 10, bab: 'full', goodSaves: ['fort', 'ref'], skillRanks: 4,
    classSkills: ['acrobatics', 'bluff', 'climb', ...CRAFT_ALL, 'handle-animal', 'heal', 'intimidate', 'know-engineering', 'know-local', 'perception', 'profession-any', 'ride', 'sleight-of-hand', 'survival', 'swim'],
    startingGold: 175,
    proficiencies: { weapons: ['simple', 'martial', 'firearms'], armor: ['light'] },
    choices: [{ id: 'firearm', label: 'Starting firearm', kind: 'list', count: 1, options: GUNSLINGER_FIREARMS }],
  },
  {
    id: 'inquisitor', name: 'Inquisitor', sub: 'Base · d8 · judgment',
    desc: 'A relentless agent of a faith — a divine caster with a domain, teamwork feats, and combat judgments. Alignment must be within one step of the deity.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['fort', 'will'], skillRanks: 6,
    classSkills: ['bluff', 'climb', ...CRAFT_ALL, 'diplomacy', 'disguise', 'heal', 'intimidate', 'know-arcana', 'know-dungeoneering', 'know-nature', 'know-planes', 'know-religion', 'perception', 'profession-any', 'ride', 'sense-motive', 'spellcraft', 'stealth', 'survival', 'swim'],
    startingGold: 140,
    proficiencies: { weapons: ['simple', 'hand-crossbow', 'longbow', 'shortbow'], armor: ['light', 'medium', 'shield'] },
    choices: [{ id: 'domain', label: 'Domain', kind: 'cleric-domains', count: 1 }],
    // Its own list, not the cleric's: the inquisitor tops out at 6th level and reaches for spells
    // no cleric gets (Invisibility, Knock, Heroism, Keen Edge).
    spellcasting: { kind: 'spontaneous', ability: 'wis', list: 'inquisitor', slots1: [999, 1], known1: [4, 2] },
  },
  {
    id: 'magus', name: 'Magus', sub: 'Base · d8 · spell combat',
    desc: 'A blade-and-spell hybrid who channels arcane power through weapons via an arcane pool and spell combat. Prepares spells from a spellbook.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['fort', 'will'], skillRanks: 2,
    classSkills: ['climb', ...CRAFT_ALL, 'fly', 'intimidate', 'know-arcana', 'know-dungeoneering', 'know-planes', 'profession-any', 'ride', 'spellcraft', 'swim', 'use-magic-device'],
    startingGold: 140,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light'] },
    // A narrow, combat-shaped slice of the sorcerer/wizard list, and its own list for that reason:
    // no Wish, no divinations to speak of, and it tops out at 6th level.
    spellcasting: { kind: 'prepared-book', ability: 'int', list: 'magus', slots1: [3, 1], bookPicks1: 'threePlusInt' },
  },
  {
    id: 'oracle', name: 'Oracle', sub: 'Base · d8 · mystery',
    desc: 'A divine spontaneous caster granted power by a mystery, wielding revelations at the price of an oracle’s curse.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['will'], skillRanks: 4,
    classSkills: [...CRAFT_ALL, 'diplomacy', 'heal', 'know-history', 'know-planes', 'know-religion', 'profession-any', 'sense-motive', 'spellcraft'],
    startingGold: 105,
    proficiencies: { weapons: ['simple'], armor: ['light', 'medium', 'shield'] },
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
    choices: [{ id: 'aspect', label: 'Shifter aspect', kind: 'list', count: 1, options: SHIFTER_ASPECTS }],
  },
  {
    id: 'summoner', name: 'Summoner', sub: 'Base · d8 · eidolon',
    desc: 'An arcanist bonded to an eidolon — a customizable outsider companion — and a master of summon monster. Spells are spontaneous.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['will'], skillRanks: 2,
    classSkills: [...CRAFT_ALL, 'fly', 'handle-animal', ...KNOW_ALL, 'linguistics', 'profession-any', 'ride', 'spellcraft', 'use-magic-device'],
    startingGold: 70,
    proficiencies: { weapons: ['simple'], armor: ['light'] },
    choices: [
      { id: 'eidolon-form', label: 'Eidolon base form', kind: 'companion', companionKind: 'eidolon', count: 1 },
      { id: 'evolutions', label: 'Eidolon evolutions', kind: 'eidolon-evolutions', count: EIDOLON_EVOLUTIONS.length },
    ],
    companions: [{ choiceId: 'eidolon-form', kind: 'eidolon', label: 'Eidolon' }],
    // The summoner's own list: heavy on summon monster, the eidolon spells and battlefield
    // control, and it stops at 6th.
    spellcasting: { kind: 'spontaneous', ability: 'cha', list: 'summoner', slots1: [999, 1], known1: [4, 2] },
  },
  {
    id: 'witch', name: 'Witch', sub: 'Base · d6 · hexes & patron',
    desc: 'A spellcaster who draws arcane secrets from a mysterious patron through a familiar, and curses foes with hexes. Prepares spells stored in the familiar.',
    hitDie: 6, bab: 'half', goodSaves: ['will'], skillRanks: 2,
    classSkills: [...CRAFT_ALL, 'fly', 'heal', 'intimidate', 'know-arcana', 'know-history', 'know-nature', 'know-planes', 'profession-any', 'spellcraft', 'use-magic-device'],
    startingGold: 105,
    proficiencies: { weapons: ['simple'], armor: [] },
    choices: [
      { id: 'patron', label: 'Patron', kind: 'list', count: 1, options: WITCH_PATRONS },
      { id: 'familiar', label: 'Familiar', kind: 'companion', companionKind: 'familiar', count: 1 },
      { id: 'hex', label: 'Hex', kind: 'list', count: 1, options: WITCH_HEXES },
    ],
    companions: [{ choiceId: 'familiar', kind: 'familiar', label: "Witch's Familiar" }],
    // WITCH_LEVELS has existed since the Unlettered Arcanist archetype was added, but the witch
    // herself was still reading the sorcerer/wizard list - so she was offered Fireball and every
    // other spell no witch has ever had. Her own list, at last.
    spellcasting: { kind: 'prepared-book', ability: 'int', list: 'witch', slots1: [3, 1], bookPicks1: 'threePlusInt' },
  },
  {
    id: 'vampire-hunter', name: 'Vampire Hunter', sub: 'Base · d8 · monster slayer',
    desc: 'A grim specialist in hunting the undead, with a vampiric focus and a growing arsenal of techniques. Divine spellcasting begins at 4th level.',
    hitDie: 8, bab: 'full', goodSaves: ['ref', 'will'], skillRanks: 6,
    classSkills: ['bluff', 'climb', ...CRAFT_ALL, 'handle-animal', 'heal', 'intimidate', 'know-arcana', 'know-geography', 'know-local', 'know-religion', 'perception', 'profession-any', 'ride', 'sense-motive', 'spellcraft', 'stealth', 'survival', 'swim'],
    startingGold: 175,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shield'] },
    // Spontaneous divine caster from 4th level, drawing on the inquisitor list: no orisons, and
    // nothing above 4th level. Wisdom-based, with bonus spells per day from a high Wisdom.
    // The inquisitor list, as the comment above has always said - it only became expressible
    // once that list existed.
    spellcasting: { kind: 'spontaneous', ability: 'wis', list: 'inquisitor', slots1: [0, 0], known1: [0, 0] },
  },

  // ─────────────────────────── HYBRID CLASSES ───────────────────────────
  {
    id: 'arcanist', name: 'Arcanist', sub: 'Hybrid · d6 · reservoir',
    desc: 'A scholar of magic who prepares spells in a spellbook yet casts them with a sorcerer’s flexibility, fueling exploits from an arcane reservoir.',
    hitDie: 6, bab: 'half', goodSaves: ['will'], skillRanks: 2,
    classSkills: ['appraise', ...CRAFT_ALL, 'fly', ...KNOW_ALL, 'linguistics', 'profession-any', 'spellcraft', 'use-magic-device'],
    startingGold: 70,
    proficiencies: { weapons: ['simple'], armor: [] },
    choices: [{ id: 'exploit', label: 'Arcanist exploit', kind: 'list', count: 1, options: ARCANIST_EXPLOITS }],
    spellcasting: { kind: 'prepared-book', ability: 'int', list: 'arcane', slots1: [4, 2], bookPicks1: 'threePlusInt' },
  },
  {
    id: 'bloodrager', name: 'Bloodrager', sub: 'Hybrid · d10 · bloodrage',
    desc: 'A barbarian whose fury awakens innate magic from a bloodline. (Spontaneous arcane casting begins at 4th level — no spells at 1st.)',
    hitDie: 10, bab: 'full', goodSaves: ['fort'], skillRanks: 4,
    classSkills: ['acrobatics', 'climb', ...CRAFT_ALL, 'handle-animal', 'intimidate', 'know-arcana', 'perception', 'ride', 'spellcraft', 'survival', 'swim'],
    startingGold: 105,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shield'] },
    choices: [{ id: 'bloodline', label: 'Bloodline', kind: 'list', count: 1, options: BLOODRAGER_BLOODLINES }],
    // Spontaneous arcane casting from 4th level (caster level = level − 3); no level-1 spells.
    // Its own list: 1st-4th only, and shaped for a raging melee caster.
    spellcasting: { kind: 'spontaneous', ability: 'cha', list: 'bloodrager', slots1: [] },
  },
  {
    id: 'brawler', name: 'Brawler', sub: 'Hybrid · d10 · martial flexibility',
    desc: 'An unarmed fighter who adapts mid-battle, borrowing combat feats on the fly and flurrying with fists and close weapons.',
    hitDie: 10, bab: 'full', goodSaves: ['fort', 'ref'], skillRanks: 4,
    classSkills: ['acrobatics', 'climb', ...CRAFT_ALL, 'escape-artist', 'handle-animal', 'intimidate', 'know-dungeoneering', 'know-local', 'perception', 'profession-any', 'ride', 'sense-motive', 'swim'],
    startingGold: 105,
    proficiencies: { weapons: ['simple', 'handaxe', 'short-sword'], armor: ['light', 'shield'] },
  },
  {
    id: 'hunter', name: 'Hunter', sub: 'Hybrid · d8 · animal focus',
    desc: 'A wilderness warrior bonded to an animal companion, borrowing animal aspects and casting nature spells spontaneously. Must be partly neutral.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['fort', 'ref'], skillRanks: 6,
    classSkills: ['climb', ...CRAFT_ALL, 'handle-animal', 'heal', 'intimidate', 'know-dungeoneering', 'know-geography', 'know-nature', 'perception', 'profession-any', 'ride', 'spellcraft', 'stealth', 'survival', 'swim'],
    startingGold: 140, alignment: ['NG', 'LN', 'N', 'CN', 'NE'],
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shield'] },
    choices: [{ id: 'animal-companion', label: 'Animal Companion', kind: 'companion', companionKind: 'animal', count: 1 }],
    companions: [{ choiceId: 'animal-companion', kind: 'animal', label: 'Animal Companion' }],
    // Druid spells of 6th and lower plus every ranger spell, at the lower level where a spell is
    // on both - the class feature spells that rule out, so the list is derived in spells.ts.
    spellcasting: { kind: 'spontaneous', ability: 'wis', list: 'hunter', slots1: [999, 1], known1: [4, 2] },
  },
  {
    id: 'investigator', name: 'Investigator', sub: 'Hybrid · d8 · inspiration',
    desc: 'A brilliant sleuth who mixes alchemical extracts with keen deduction, spending inspiration to excel at checks. (Extract selection isn’t modeled yet; features only.)',
    hitDie: 8, bab: 'threequarter', goodSaves: ['ref', 'will'], skillRanks: 6,
    classSkills: ['acrobatics', 'appraise', 'bluff', 'climb', ...CRAFT_ALL, 'diplomacy', 'disable-device', 'disguise', 'escape-artist', 'heal', 'intimidate', ...KNOW_ALL, 'linguistics', 'perception', 'perform-oratory', 'profession-any', 'sense-motive', 'sleight-of-hand', 'spellcraft', 'stealth', 'use-magic-device'],
    startingGold: 105,
    proficiencies: { weapons: ['simple', 'hand-crossbow', 'rapier', 'sap', 'shortbow', 'short-sword'], armor: ['light'] },
    // Extracts per day use the 6-level "extract" table (no 0-level); no creation-time selection.
    // An investigator's extracts come off the alchemist formulae list, per its Alchemy feature.
    spellcasting: { kind: 'prepared-list', ability: 'int', list: 'alchemist', slots1: [] },
  },
  {
    id: 'shaman', name: 'Shaman', sub: 'Hybrid · d8 · spirit',
    desc: 'A divine caster guided by a spirit, blending prepared spells, spontaneous spirit magic, and hexes.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['will'], skillRanks: 4,
    classSkills: [...CRAFT_ALL, 'diplomacy', 'fly', 'handle-animal', 'heal', 'know-nature', 'know-planes', 'know-religion', 'profession-any', 'ride', 'spellcraft', 'survival'],
    startingGold: 105,
    proficiencies: { weapons: ['simple'], armor: ['light', 'medium', 'shield'] },
    choices: [
      { id: 'spirit', label: 'Spirit', kind: 'list', count: 1, options: SHAMAN_SPIRITS },
      { id: 'spirit-animal', label: 'Spirit Animal', kind: 'companion', companionKind: 'familiar', count: 1 },
    ],
    companions: [{ choiceId: 'spirit-animal', kind: 'familiar', label: 'Spirit Animal' }],
    // Its own list - a full 9-level caster drawing on druid, cleric and witch spells alike.
    spellcasting: { kind: 'prepared-list', ability: 'wis', list: 'shaman', slots1: [3, 1] },
  },
  {
    id: 'skald', name: 'Skald', sub: 'Hybrid · d8 · raging song',
    desc: 'A battle-poet whose raging song drives allies into a controlled fury; casts bard spells spontaneously.',
    hitDie: 8, bab: 'threequarter', goodSaves: ['fort', 'will'], skillRanks: 4,
    classSkills: ['acrobatics', 'appraise', 'bluff', 'climb', ...CRAFT_ALL, 'diplomacy', 'escape-artist', 'handle-animal', 'intimidate', ...KNOW_ALL, 'linguistics', 'perception', 'perform-oratory', 'perform-strings', 'profession-any', 'ride', 'sense-motive', 'spellcraft', 'swim', 'use-magic-device'],
    startingGold: 105,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shield'] },
    spellcasting: { kind: 'spontaneous', ability: 'cha', list: 'bard', progression: 'six', slots1: [999, 1], known1: [4, 2] },
  },
  {
    id: 'slayer', name: 'Slayer', sub: 'Hybrid · d10 · studied target',
    desc: 'A lethal hunter of humanoids blending the ranger’s tracking with the rogue’s precision, studying a target for deadly advantage.',
    hitDie: 10, bab: 'full', goodSaves: ['fort', 'ref'], skillRanks: 6,
    classSkills: ['acrobatics', 'bluff', 'climb', ...CRAFT_ALL, 'disable-device', 'disguise', 'escape-artist', 'heal', 'intimidate', 'know-dungeoneering', 'know-geography', 'know-local', 'perception', 'profession-any', 'ride', 'sense-motive', 'sleight-of-hand', 'stealth', 'survival', 'swim'],
    startingGold: 175,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shield'] },
  },
  {
    id: 'swashbuckler', name: 'Swashbuckler', sub: 'Hybrid · d10 · panache',
    desc: 'A daring duelist who spends panache on flashy deeds and finesse-fights with light piercing blades.',
    hitDie: 10, bab: 'full', goodSaves: ['ref'], skillRanks: 4,
    classSkills: ['acrobatics', 'bluff', 'climb', ...CRAFT_ALL, 'diplomacy', 'escape-artist', 'intimidate', 'know-local', 'know-nobility', 'perception', 'perform-oratory', 'profession-any', 'ride', 'sense-motive', 'sleight-of-hand', 'swim'],
    startingGold: 175,
    proficiencies: { weapons: ['simple', 'martial'], armor: ['light'] },
  },
];

// Attach the per-level progression (features, bonus feats, per-level subsystem picks). Every
// class has an entry, and a golden asserts it: `features` is the single source for what a
// class grants, so nothing has to agree with a second copy.
for (const c of CLASSES) {
  const prog = CLASS_PROGRESSION[c.id];
  if (!prog) continue;
  c.features = prog.features;
  if (prog.bonusFeats) c.bonusFeats = prog.bonusFeats;
  if (prog.grantedFeats) c.grantedFeats = prog.grantedFeats;
  if (prog.choices) c.choices = [...(c.choices ?? []), ...prog.choices];
}
for (const c of CLASSES) {
  const cfg = CASTER[c.id];
  if (c.spellcasting && cfg) { c.spellcasting.progression = cfg.progression; c.spellcasting.table = cfg.table; }
}
// Attach archetypes to their class.
for (const c of CLASSES) {
  const arch = archetypesForClass(c.id);
  if (arch.length) c.archetypes = arch;
}

// Presented alphabetically. The definitions above are grouped by tier (core / base / hybrid) for
// authoring, which left the picker jumping from Wizard back to Alchemist; each class carries its
// tier in `sub`, so the grouping is still visible without dictating list order.
CLASSES.sort((a, b) => a.name.localeCompare(b.name));

export const classById = new Map(CLASSES.map((c) => [c.id, c]));
