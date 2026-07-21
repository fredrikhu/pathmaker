import type { FavoredClassBonusDef, RaceDef } from './model';
import { FEATURED_RACES } from './races-featured';
import { UNCOMMON_RACES } from './races-uncommon';
import { EXOTIC_RACES } from './races-exotic';

// Alternative favored-class bonuses for the seven core races across the eleven Core Rulebook classes
// (ARG Favored Class Options). Verified against d20pfsrd. A fraction denominator marks a "+1/N" bonus
// the tracker accumulates; whole/each-time bonuses and content bonuses ("one extra spell known") omit
// it. These are surfaced and counted, not folded into stats.
const FCB_ALT: Record<string, Record<string, FavoredClassBonusDef>> = {
  dwarf: {
    barbarian: { desc: '+1 rage round per day' },
    bard: { desc: '−1% arcane spell failure in medium armor (Medium Armor Proficiency at 10%)' },
    cleric: { desc: '+1/2 use per day of a 1st-level domain power', fraction: 2 },
    druid: { desc: '+1/2 use per day of a 1st-level domain power', fraction: 2 },
    fighter: { desc: '+1 CMD vs bull rush and trip' },
    monk: { desc: 'Reduce by 1 the hardness of clay/stone/metal struck by your unarmed strike' },
    paladin: { desc: '+1 on concentration checks for paladin spells' },
    ranger: { desc: '+1/2 on wild empathy checks underground', fraction: 2 },
    rogue: { desc: '+1/2 on Disable Device and trap sense vs stone traps', fraction: 2 },
    sorcerer: { desc: '+1/2 acid and earth spell/SLA damage', fraction: 2 },
    wizard: { desc: 'Craft a chosen item-creation feat 200 gp/day faster (50 gp adventuring)' },
  },
  elf: {
    barbarian: { desc: '+1 base speed (effective only at multiples of 5)' },
    bard: { desc: '+1 CMD vs disarm and sunder' },
    cleric: { desc: '+1/2 use per day of a 1st-level domain power', fraction: 2 },
    druid: { desc: '+1/3 natural armor while wild-shaped', fraction: 3 },
    fighter: { desc: '+1 CMD vs disarm and sunder' },
    monk: { desc: '+1 base speed (effective only at multiples of 5)' },
    paladin: { desc: '+1/2 hit point of lay on hands', fraction: 2 },
    ranger: { desc: '+1/2 on crit confirmation with a chosen elven weapon (max +4)', fraction: 2 },
    rogue: { desc: '+1 daily casting from the minor/major magic rogue talent' },
    sorcerer: { desc: '+1/2 use per day of a 1st-level bloodline power', fraction: 2 },
    wizard: { desc: '+1/2 use per day of a 1st-level arcane school power', fraction: 2 },
  },
  gnome: {
    barbarian: { desc: '+1/2 to trap sense', fraction: 2 },
    bard: { desc: '+1 bardic performance round per day' },
    cleric: { desc: '+1/2 channel energy healing vs animals, fey, and plants', fraction: 2 },
    druid: { desc: 'Energy resistance 1 vs acid/cold/electricity/fire, +1 each time (max 10 per type)' },
    fighter: { desc: '+1 CMD vs dirty trick and steal' },
    monk: { desc: '+1 to the Acrobatics bonus from spending ki (5th level+)' },
    paladin: { desc: '+1/2 hit point of lay on hands', fraction: 2 },
    ranger: { desc: '+1/2 DR/magic for your animal companion (max 10)', fraction: 2 },
    rogue: { desc: '+1/2 on Disable Device and Use Magic Device vs magical writings', fraction: 2 },
    sorcerer: { desc: '+1/2 use per day of a 1st-level bloodline power', fraction: 2 },
    wizard: { desc: '+1/2 use per day of a 1st-level arcane school power', fraction: 2 },
  },
  'half-elf': {
    barbarian: { desc: '+1/4 to trap sense Reflex saves and dodge AC vs traps', fraction: 4 },
    bard: { desc: '+1 bardic performance round per day' },
    cleric: { desc: '+1/3 channel energy damage or healing', fraction: 3 },
    druid: { desc: '+1/2 use per day of a 1st-level cleric domain power', fraction: 2 },
    fighter: { desc: '+1 CMD vs disarm and overrun' },
    monk: { desc: '+1/2 on Escape Artist and on Acrobatics to cross narrow surfaces', fraction: 2 },
    paladin: { desc: '+1 ft to all aura sizes (effective only at multiples of 5)' },
    ranger: { desc: '+1 skill rank for your animal companion' },
    rogue: { desc: '+1/2 on Bluff to feint and Diplomacy to gather information', fraction: 2 },
    sorcerer: { desc: '+1/2 use per day of a 1st-level bloodline power', fraction: 2 },
    wizard: { desc: '+1/3 caster level for enchantment spell duration', fraction: 3 },
  },
  'half-orc': {
    barbarian: { desc: '+1 rage round per day' },
    bard: { desc: '+1 bardic performance round per day' },
    cleric: { desc: '+1/2 use per day of a 1st-level domain power', fraction: 2 },
    druid: { desc: '+1/3 natural armor while wild-shaped', fraction: 3 },
    fighter: { desc: '+2 on rolls to stabilize when dying' },
    monk: { desc: '+1 CMD vs grapple, and +1/2 stunning attempts per day' },
    paladin: { desc: '+1/3 on crit confirmation with smite evil (max +5)', fraction: 3 },
    ranger: { desc: '+1 hit point for your animal companion' },
    rogue: { desc: '+1/3 on crit confirmation with sneak attack (max +5)', fraction: 3 },
    sorcerer: { desc: '+1/2 fire damage to fire spells', fraction: 2 },
    wizard: { desc: '+1 on concentration checks from taking damage' },
  },
  halfling: {
    barbarian: { desc: '+1/2 to trap sense (or +1/3 to the surprise accuracy rage power)', fraction: 2 },
    bard: { desc: '+1/2 on Bluff (secret messages), Diplomacy (gather info), Disguise (child)', fraction: 2 },
    cleric: { desc: '+1/2 use per day of a 1st-level domain power', fraction: 2 },
    druid: { desc: "+1/4 luck bonus on your animal companion's saves", fraction: 4 },
    fighter: { desc: '+1 CMD vs trip and grapple' },
    monk: { desc: '+1 CMD vs grapple, and +1/2 stunning attempts per day' },
    paladin: { desc: '+1/2 hit point of lay on hands', fraction: 2 },
    ranger: { desc: '+1/4 dodge AC vs your favored enemies', fraction: 4 },
    rogue: { desc: '+1/2 on crit confirmation with sling/dagger/halfling weapons (max +4)', fraction: 2 },
    sorcerer: { desc: '+1/2 use per day of a 1st-level bloodline power', fraction: 2 },
    wizard: { desc: "+1/2 effective level for your familiar's natural armor, Int, and abilities", fraction: 2 },
  },
  human: {
    barbarian: { desc: '+1/2 to trap sense (or +1/3 to the superstition rage power)', fraction: 2 },
    bard: { desc: 'One extra bard spell known (at least one level below your max)' },
    cleric: { desc: '+1 on caster level checks vs outsider spell resistance' },
    druid: { desc: '+1/2 on Diplomacy and Intimidate to change attitude', fraction: 2 },
    fighter: { desc: '+1 CMD vs two chosen combat maneuvers' },
    monk: { desc: '+1/4 point to your ki pool', fraction: 4 },
    paladin: { desc: '+1 energy resistance to one type (max +10)' },
    ranger: { desc: '+1 hit point or +1 skill rank for your animal companion' },
    rogue: { desc: '+1/6 of a new rogue talent', fraction: 6 },
    sorcerer: { desc: 'One extra sorcerer spell known (at least one level below your max)' },
    wizard: { desc: 'One extra spell in your spellbook (at least one level below your max)' },
  },
};

const CORE_RACES: RaceDef[] = [
  {
    id: 'human', name: 'Human', sub: 'Adaptable · +2 any',
    desc: 'Ambitious and varied, humans are the most adaptable of the common races. They claim a flexible ability bonus, an extra feat, and an extra skill rank every level — the strongest chassis for almost any build.',
    size: 'medium', speed: 30, abilityMods: 'choice',
    traits: [
      { id: 'human-bonus-feat', name: 'Bonus feat', desc: 'Humans select one extra feat at 1st level.', grantsFeatSlot: 'feat-human' },
      { id: 'human-skilled', name: 'Skilled', desc: 'Humans gain an additional skill rank at 1st level and one additional rank whenever they gain a level.', skillRanksPerLevel: 1 },
    ],
    altTraits: [
      { id: 'human-dual-talent', name: 'Dual Talent', replaces: ['human-bonus-feat', 'human-skilled'], desc: 'Some humans are uniquely skilled at maximizing their natural gifts. They pick two ability scores and gain a +2 racial bonus in each of those scores, losing the bonus feat and Skilled traits.' },
      { id: 'human-focused-study', name: 'Focused Study', replaces: ['human-bonus-feat'], desc: 'All humans are skillful, but some, rather than being generalists, tend toward intense specialization. They gain Skill Focus at 1st, 8th, and 16th level instead of the bonus feat.' },
      { id: 'human-heart-of-fields', name: 'Heart of the Fields', replaces: ['human-skilled'], desc: 'Humans born in rural areas gain half their character level on one Craft or Profession skill, and once per day may ignore an effect that would make them fatigued or exhausted.' },
    ],
    favoredClassBonuses: FCB_ALT.human,
    languagesAuto: ['common'],
    languagesBonus: ['dwarven', 'elven', 'gnome', 'goblin', 'halfling', 'orc', 'draconic', 'giant', 'sylvan'],
  },
  {
    id: 'dwarf', name: 'Dwarf', sub: '+2 Con, +2 Wis, −2 Cha',
    desc: 'Dwarves are stoic mountain folk — slow but unstoppable, masters of stone and metal, with long memories for both friendship and grudges.',
    size: 'medium', speed: 20, speedNeverReduced: true, abilityMods: { con: 2, wis: 2, cha: -2 },
    traits: [
      { id: 'dwarf-darkvision', name: 'Darkvision', desc: 'Dwarves can see in the dark up to 60 feet.', senses: ['Darkvision 60 ft'] },
      { id: 'dwarf-defensive-training', name: 'Defensive Training', desc: '+4 dodge bonus to AC against monsters of the giant subtype.', effects: [{ target: 'ac', type: 'dodge', value: 4, note: 'Defensive Training (Dwarf)', condition: 'vs giants' }] },
      { id: 'dwarf-hardy', name: 'Hardy', desc: '+2 racial bonus on saving throws against poison, spells, and spell-like abilities.', effects: [{ target: 'save:all', type: 'racial', value: 2, note: 'Hardy (Dwarf)', condition: 'vs poison, spells, and spell-like abilities' }] },
      { id: 'dwarf-stability', name: 'Stability', desc: '+4 racial bonus to CMD when resisting a bull rush or trip attempt while standing on the ground.', effects: [{ target: 'cmd', type: 'racial', value: 4, note: 'Stability (Dwarf)', condition: 'vs bull rush / trip while on the ground' }] },
      { id: 'dwarf-greed', name: 'Greed', desc: '+2 racial bonus on Appraise checks made to determine the price of nonmagical goods that contain precious metals or gemstones.', effects: [{ target: 'skill:appraise', type: 'racial', value: 2, note: 'Greed (Dwarf)', condition: 'precious metals and gems' }] },
      { id: 'dwarf-stonecunning', name: 'Stonecunning', desc: '+2 bonus on Perception checks to notice unusual stonework; automatic check when within 10 feet.', effects: [{ target: 'skill:perception', type: 'racial', value: 2, note: 'Stonecunning (Dwarf)', condition: 'unusual stonework' }] },
      { id: 'dwarf-weapon-familiarity', name: 'Weapon Familiarity', desc: 'Proficient with battleaxes, heavy picks, and warhammers; treat any weapon with "dwarven" in its name as martial.', weaponFamiliarity: { proficient: ['battleaxe', 'heavy-pick', 'warhammer'], martial: ['dwarven-waraxe', 'dwarven-urgrosh'] } },
      { id: 'dwarf-hatred', name: 'Hatred', desc: '+1 bonus on attack rolls against humanoids of the orc and goblinoid subtypes.', effects: [{ target: 'attack:melee', type: 'racial', value: 1, note: 'Hatred (Dwarf)', condition: 'vs orcs and goblinoids' }] },
      { id: 'dwarf-slow-steady', name: 'Slow and Steady', desc: 'Speed 20 feet, never modified by armor or encumbrance.' },
    ],
    altTraits: [
      { id: 'dwarf-craftsman', name: 'Craftsman', replaces: ['dwarf-greed'], desc: '+2 racial bonus on all Craft or Profession checks to create objects from metal or stone.', effects: [{ target: 'skill:craft-weapons', type: 'racial', value: 2, note: 'Craftsman (Dwarf)', condition: 'metal or stone objects' }] },
      { id: 'dwarf-deep-warrior', name: 'Deep Warrior', replaces: ['dwarf-defensive-training'], desc: '+2 dodge bonus to AC against aberrations and +2 on combat maneuver checks to grapple them.' },
    ],
    favoredClassBonuses: FCB_ALT.dwarf,
    languagesAuto: ['common', 'dwarven'],
    languagesBonus: ['giant', 'gnome', 'goblin', 'orc', 'terran', 'undercommon'],
  },
  {
    id: 'elf', name: 'Elf', sub: '+2 Dex, +2 Int, −2 Con',
    desc: 'Long-lived and graceful, elves favor precision in all things — bows, blades, and above all wizardry.',
    size: 'medium', speed: 30, abilityMods: { dex: 2, int: 2, con: -2 },
    traits: [
      { id: 'elf-low-light', name: 'Low-Light Vision', desc: 'Elves can see twice as far as humans in conditions of dim light.', senses: ['Low-light vision'] },
      { id: 'elf-immunities', name: 'Elven Immunities', desc: 'Immune to magic sleep effects; +2 racial saving throw bonus against enchantment spells and effects.', effects: [{ target: 'save:all', type: 'racial', value: 2, note: 'Elven Immunities', condition: 'vs enchantment' }] },
      { id: 'elf-keen-senses', name: 'Keen Senses', desc: '+2 racial bonus on Perception checks.', effects: [{ target: 'skill:perception', type: 'racial', value: 2, note: 'Keen Senses (Elf)' }] },
      { id: 'elf-magic', name: 'Elven Magic', desc: '+2 racial bonus on caster level checks made to overcome spell resistance, and +2 on Spellcraft checks to identify the properties of magic items.', effects: [{ target: 'skill:spellcraft', type: 'racial', value: 2, note: 'Elven Magic', condition: 'identifying magic items' }] },
      { id: 'elf-weapon-familiarity', name: 'Weapon Familiarity', desc: 'Proficient with longbows, longswords, rapiers, and shortbows; treat any weapon with "elven" in its name as martial.', weaponFamiliarity: { proficient: ['longbow', 'comp-longbow', 'longsword', 'rapier', 'shortbow', 'comp-shortbow'], martial: ['elven-curve-blade'] } },
    ],
    altTraits: [
      { id: 'elf-fleet-footed', name: 'Fleet-Footed', replaces: ['elf-keen-senses', 'elf-weapon-familiarity'], desc: 'Receive Run as a bonus feat and a +2 racial bonus on initiative checks.', effects: [{ target: 'init', type: 'racial', value: 2, note: 'Fleet-Footed (Elf)' }] },
      { id: 'elf-dreamspeaker', name: 'Dreamspeaker', replaces: ['elf-immunities'], desc: '+1 to the DC of spells of the divination school and sleep effects cast by the elf.' },
    ],
    favoredClassBonuses: FCB_ALT.elf,
    languagesAuto: ['common', 'elven'],
    languagesBonus: ['celestial', 'draconic', 'gnoll', 'gnome', 'goblin', 'orc', 'sylvan'],
  },
  {
    id: 'gnome', name: 'Gnome', sub: '+2 Con, +2 Cha, −2 Str',
    desc: 'Small, curious, and touched by the fey, gnomes carry illusion magic in their blood and an obsession in every heart.',
    size: 'small', speed: 20, abilityMods: { con: 2, cha: 2, str: -2 },
    traits: [
      { id: 'gnome-low-light', name: 'Low-Light Vision', desc: 'Gnomes can see twice as far as humans in dim light.', senses: ['Low-light vision'] },
      { id: 'gnome-defensive-training', name: 'Defensive Training', desc: '+4 dodge bonus to AC against monsters of the giant subtype.', effects: [{ target: 'ac', type: 'dodge', value: 4, note: 'Defensive Training (Gnome)', condition: 'vs giants' }] },
      { id: 'gnome-illusion-resistance', name: 'Illusion Resistance', desc: '+2 racial saving throw bonus against illusion spells and effects.', effects: [{ target: 'save:all', type: 'racial', value: 2, note: 'Illusion Resistance', condition: 'vs illusions' }] },
      { id: 'gnome-keen-senses', name: 'Keen Senses', desc: '+2 racial bonus on Perception checks.', effects: [{ target: 'skill:perception', type: 'racial', value: 2, note: 'Keen Senses (Gnome)' }] },
      { id: 'gnome-magic', name: 'Gnome Magic', desc: '+1 to the DC of illusion spells cast; spell-like abilities: dancing lights, ghost sound, prestidigitation, speak with animals 1/day.',
        spellLikeAbilities: [
          { name: 'Dancing Lights', uses: 1, note: 'requires Cha 11' },
          { name: 'Ghost Sound', uses: 1, note: 'requires Cha 11' },
          { name: 'Prestidigitation', uses: 1, note: 'requires Cha 11' },
          { name: 'Speak with Animals', uses: 1, note: 'requires Cha 11' },
        ] },
      { id: 'gnome-weapon-familiarity', name: 'Weapon Familiarity', desc: 'Treat any weapon with "gnome" in its name as martial.', weaponFamiliarity: { martial: ['gnome-hooked-hammer'] } },
      { id: 'gnome-hatred', name: 'Hatred', desc: '+1 bonus on attack rolls against humanoids of the reptilian and goblinoid subtypes.', effects: [{ target: 'attack:melee', type: 'racial', value: 1, note: 'Hatred (Gnome)', condition: 'vs reptilians and goblinoids' }] },
      { id: 'gnome-obsessive', name: 'Obsessive', desc: '+2 racial bonus on one Craft or Profession skill.' },
    ],
    altTraits: [
      { id: 'gnome-magical-linguist', name: 'Magical Linguist', replaces: ['gnome-magic', 'gnome-obsessive'], desc: '+1 DC on language-dependent spells; bonus languages; spell-like abilities: arcane mark, comprehend languages, message, read magic 1/day.' },
    ],
    favoredClassBonuses: FCB_ALT.gnome,
    languagesAuto: ['common', 'gnome', 'sylvan'],
    languagesBonus: ['draconic', 'dwarven', 'elven', 'giant', 'goblin', 'orc'],
  },
  {
    id: 'half-elf', name: 'Half-elf', sub: 'Adaptable · +2 any',
    desc: 'Caught between two worlds, half-elves blend human flexibility with elven senses — at home everywhere and nowhere.',
    size: 'medium', speed: 30, abilityMods: 'choice',
    traits: [
      { id: 'halfelf-low-light', name: 'Low-Light Vision', desc: 'Half-elves can see twice as far as humans in dim light.', senses: ['Low-light vision'] },
      { id: 'halfelf-adaptability', name: 'Adaptability', desc: 'Half-elves receive Skill Focus as a bonus feat at 1st level.' },
      { id: 'halfelf-elf-blood', name: 'Elf Blood', desc: 'Half-elves count as both elves and humans for any effect related to race.' },
      { id: 'halfelf-immunities', name: 'Elven Immunities', desc: 'Immune to magic sleep effects; +2 racial saving throw bonus against enchantment spells and effects.', effects: [{ target: 'save:all', type: 'racial', value: 2, note: 'Elven Immunities', condition: 'vs enchantment' }] },
      { id: 'halfelf-keen-senses', name: 'Keen Senses', desc: '+2 racial bonus on Perception checks.', effects: [{ target: 'skill:perception', type: 'racial', value: 2, note: 'Keen Senses (Half-elf)' }] },
      { id: 'halfelf-multitalented', name: 'Multitalented', desc: 'Half-elves choose two favored classes at first level.' },
    ],
    altTraits: [
      { id: 'halfelf-ancestral-arms', name: 'Ancestral Arms', replaces: ['halfelf-adaptability'], desc: 'Gain Exotic Weapon Proficiency or Martial Weapon Proficiency with one weapon as a bonus feat instead of Skill Focus.' },
    ],
    favoredClassBonuses: FCB_ALT['half-elf'],
    languagesAuto: ['common', 'elven'],
    languagesBonus: ['dwarven', 'gnome', 'goblin', 'halfling', 'orc', 'draconic', 'sylvan', 'celestial'],
  },
  {
    id: 'half-orc', name: 'Half-orc', sub: 'Adaptable · +2 any',
    desc: 'Feared and ferocious, half-orcs carry orc blood that grants darkvision and a stubborn refusal to fall.',
    size: 'medium', speed: 30, abilityMods: 'choice',
    traits: [
      { id: 'halforc-darkvision', name: 'Darkvision', desc: 'Half-orcs can see in the dark up to 60 feet.', senses: ['Darkvision 60 ft'] },
      { id: 'halforc-intimidating', name: 'Intimidating', desc: '+2 racial bonus on Intimidate checks.', effects: [{ target: 'skill:intimidate', type: 'racial', value: 2, note: 'Intimidating (Half-orc)' }] },
      { id: 'halforc-ferocity', name: 'Orc Ferocity', desc: 'Once per day, when brought below 0 hit points but not killed, fight on for one more round as if disabled.' },
      { id: 'halforc-weapon-familiarity', name: 'Weapon Familiarity', desc: 'Proficient with greataxes and falchions; treat any weapon with "orc" in its name as martial.', weaponFamiliarity: { proficient: ['greataxe', 'falchion'], martial: ['orc-double-axe'] } },
      { id: 'halforc-orc-blood', name: 'Orc Blood', desc: 'Half-orcs count as both humans and orcs for any effect related to race.' },
    ],
    altTraits: [
      { id: 'halforc-sacred-tattoo', name: 'Sacred Tattoo', replaces: ['halforc-ferocity'], desc: '+1 luck bonus on all saving throws.', effects: [{ target: 'save:all', type: 'luck', value: 1, note: 'Sacred Tattoo' }] },
      { id: 'halforc-shamans-apprentice', name: "Shaman's Apprentice", replaces: ['halforc-intimidating'], desc: 'Gain Endurance as a bonus feat.' },
    ],
    favoredClassBonuses: FCB_ALT['half-orc'],
    languagesAuto: ['common', 'orc'],
    languagesBonus: ['abyssal', 'draconic', 'giant', 'gnoll', 'goblin'],
  },
  {
    id: 'halfling', name: 'Halfling', sub: '+2 Dex, +2 Cha, −2 Str',
    desc: 'Small, lucky, and quietly brave, halflings slip through a dangerous world with a smile and the best saving throws in the game.',
    size: 'small', speed: 20, abilityMods: { dex: 2, cha: 2, str: -2 },
    traits: [
      { id: 'halfling-fearless', name: 'Fearless', desc: '+2 racial bonus on all saving throws against fear. This stacks with halfling luck.', effects: [{ target: 'save:all', type: 'racial', value: 2, note: 'Fearless (Halfling)', condition: 'vs fear' }] },
      { id: 'halfling-luck', name: 'Halfling Luck', desc: '+1 racial bonus on all saving throws.', effects: [{ target: 'save:all', type: 'luck', value: 1, note: 'Halfling Luck' }] },
      { id: 'halfling-keen-senses', name: 'Keen Senses', desc: '+2 racial bonus on Perception checks.', effects: [{ target: 'skill:perception', type: 'racial', value: 2, note: 'Keen Senses (Halfling)' }] },
      { id: 'halfling-sure-footed', name: 'Sure-Footed', desc: '+2 racial bonus on Acrobatics and Climb checks.', effects: [{ target: 'skill:acrobatics', type: 'racial', value: 2, note: 'Sure-Footed (Halfling)' }, { target: 'skill:climb', type: 'racial', value: 2, note: 'Sure-Footed (Halfling)' }] },
      { id: 'halfling-weapon-familiarity', name: 'Weapon Familiarity', desc: 'Proficient with slings; treat any weapon with "halfling" in its name as martial.', weaponFamiliarity: { proficient: ['sling'], martial: ['halfling-sling-staff'] } },
    ],
    altTraits: [
      { id: 'halfling-fleet-of-foot', name: 'Fleet of Foot', replaces: ['halfling-sure-footed', 'halfling-weapon-familiarity'], desc: 'Base speed 30 feet instead of 20 feet.' },
      { id: 'halfling-low-blow', name: 'Low Blow', replaces: ['halfling-keen-senses'], desc: '+1 bonus on critical confirmation rolls against opponents larger than themselves.' },
    ],
    favoredClassBonuses: FCB_ALT.halfling,
    languagesAuto: ['common', 'halfling'],
    languagesBonus: ['dwarven', 'elven', 'gnome', 'goblin'],
  },
];

// Presented alphabetically. The source arrays are grouped by rarity tier (core / featured /
// uncommon / exotic) for authoring; concatenating them left the picker unordered once the later
// tiers were added.
export const RACES: RaceDef[] = [...CORE_RACES, ...FEATURED_RACES, ...UNCOMMON_RACES, ...EXOTIC_RACES]
  .sort((a, b) => a.name.localeCompare(b.name));

export const raceById = new Map(RACES.map((r) => [r.id, r]));
