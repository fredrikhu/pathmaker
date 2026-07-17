import type { BloodlineDef, DeityDef, DomainDef, SchoolDef } from './model';

export const DEITIES: DeityDef[] = [
  { id: 'none', name: '(None)', alignment: 'N', domains: [], portfolio: 'Atheism or unaffiliated' },
  { id: 'abadar', name: 'Abadar', alignment: 'LN', domains: ['earth', 'law', 'nobility', 'protection', 'travel'], portfolio: 'Cities, law, merchants, wealth' },
  { id: 'calistria', name: 'Calistria', alignment: 'CN', domains: ['chaos', 'charm', 'knowledge', 'luck', 'trickery'], portfolio: 'Trickery, lust, revenge' },
  { id: 'desna', name: 'Desna', alignment: 'CG', domains: ['chaos', 'good', 'liberation', 'luck', 'travel'], portfolio: 'Dreams, stars, travelers, luck' },
  { id: 'erastil', name: 'Erastil', alignment: 'LG', domains: ['animal', 'community', 'good', 'law', 'plant'], portfolio: 'Farming, hunting, family' },
  { id: 'gorum', name: 'Gorum', alignment: 'CN', domains: ['chaos', 'destruction', 'glory', 'strength', 'war'], portfolio: 'Strength, battle, weapons' },
  { id: 'gozreh', name: 'Gozreh', alignment: 'N', domains: ['air', 'animal', 'plant', 'water', 'weather'], portfolio: 'Nature, weather, the sea' },
  { id: 'iomedae', name: 'Iomedae', alignment: 'LG', domains: ['glory', 'good', 'law', 'sun', 'war'], portfolio: 'Valor, rulership, justice, honor' },
  { id: 'irori', name: 'Irori', alignment: 'LN', domains: ['healing', 'knowledge', 'law', 'rune', 'strength'], portfolio: 'History, knowledge, self-perfection' },
  { id: 'lamashtu', name: 'Lamashtu', alignment: 'CE', domains: ['chaos', 'evil', 'madness', 'strength', 'trickery'], portfolio: 'Madness, monsters, nightmares' },
  { id: 'nethys', name: 'Nethys', alignment: 'N', domains: ['destruction', 'knowledge', 'magic', 'protection', 'rune'], portfolio: 'Magic' },
  { id: 'norgorber', name: 'Norgorber', alignment: 'NE', domains: ['charm', 'death', 'evil', 'knowledge', 'trickery'], portfolio: 'Greed, secrets, poison, murder' },
  { id: 'pharasma', name: 'Pharasma', alignment: 'N', domains: ['death', 'healing', 'knowledge', 'repose', 'water'], portfolio: 'Birth, death, fate, prophecy' },
  { id: 'rovagug', name: 'Rovagug', alignment: 'CE', domains: ['chaos', 'destruction', 'evil', 'war', 'weather'], portfolio: 'Wrath, disaster, destruction' },
  { id: 'sarenrae', name: 'Sarenrae', alignment: 'NG', domains: ['fire', 'glory', 'good', 'healing', 'sun'], portfolio: 'Sun, redemption, healing' },
  { id: 'shelyn', name: 'Shelyn', alignment: 'NG', domains: ['air', 'charm', 'good', 'luck', 'protection'], portfolio: 'Beauty, art, love, music' },
  { id: 'torag', name: 'Torag', alignment: 'LG', domains: ['artifice', 'earth', 'good', 'law', 'protection'], portfolio: 'Forge, protection, strategy' },
  { id: 'urgathoa', name: 'Urgathoa', alignment: 'NE', domains: ['death', 'evil', 'magic', 'strength', 'war'], portfolio: 'Gluttony, disease, undeath' },
  { id: 'zon-kuthon', name: 'Zon-Kuthon', alignment: 'LE', domains: ['darkness', 'death', 'destruction', 'evil', 'law'], portfolio: 'Envy, pain, darkness, loss' },
];

export const deityById = new Map(DEITIES.map((d) => [d.id, d]));

export const DOMAINS: DomainDef[] = [
  'air', 'animal', 'artifice', 'chaos', 'charm', 'community', 'darkness', 'death', 'destruction',
  'earth', 'evil', 'fire', 'glory', 'good', 'healing', 'knowledge', 'law', 'liberation', 'luck',
  'madness', 'magic', 'nobility', 'plant', 'protection', 'repose', 'rune', 'strength', 'sun',
  'travel', 'trickery', 'war', 'water', 'weather',
].map((id) => ({ id, name: id.charAt(0).toUpperCase() + id.slice(1), desc: `The ${id} domain grants a granted power and one bonus spell per spell level.` }));

export const domainById = new Map(DOMAINS.map((d) => [d.id, d]));

export const SCHOOLS: SchoolDef[] = [
  { id: 'abjuration', name: 'Abjuration', desc: 'Protective magic — wards, barriers, and dispelling.' },
  { id: 'conjuration', name: 'Conjuration', desc: 'Summoning creatures, objects, and teleportation.' },
  { id: 'divination', name: 'Divination', desc: 'Revealing information — the one school with no opposition cost for universalists.' },
  { id: 'enchantment', name: 'Enchantment', desc: 'Charms and compulsions affecting minds.' },
  { id: 'evocation', name: 'Evocation', desc: 'Raw energy and damage — the archetypal blaster school.' },
  { id: 'illusion', name: 'Illusion', desc: 'Deceiving the senses with false images and sounds.' },
  { id: 'necromancy', name: 'Necromancy', desc: 'The magic of life force, death, and undeath.' },
  { id: 'transmutation', name: 'Transmutation', desc: 'Changing the properties of creatures and objects.' },
  { id: 'universalist', name: 'Universalist', desc: 'No specialization: no opposition schools, but fewer bonus powers.' },
];

export const schoolById = new Map(SCHOOLS.map((s) => [s.id, s]));

export const BLOODLINES: BloodlineDef[] = [
  { id: 'draconic', name: 'Draconic', desc: 'Dragon blood grants claws, a damage bonus with one energy type, and eventually wings.', classSkill: 'know-arcana' },
  { id: 'arcane', name: 'Arcane', desc: 'A legacy of pure magic: a bonus metamagic or item-creation feat and a school power.', classSkill: 'know-arcana' },
  { id: 'celestial', name: 'Celestial', desc: 'Celestial heritage: resistances, a halo of light, and eventually wings of an angel.', classSkill: 'heal' },
  { id: 'infernal', name: 'Infernal', desc: 'A pact in the blood: charm effects, fire resistance, and a serpentine cunning.', classSkill: 'diplomacy' },
  { id: 'abyssal', name: 'Abyssal', desc: 'Demonic ancestry: claws, strength in melee, and resistances.', classSkill: 'know-planes' },
  { id: 'fey', name: 'Fey', desc: 'Fey blood: compulsion magic, laughing touch, and woodland stealth.', classSkill: 'know-nature' },
];

export const bloodlineById = new Map(BLOODLINES.map((b) => [b.id, b]));

export const LANGUAGES = [
  'common', 'dwarven', 'elven', 'gnome', 'goblin', 'halfling', 'orc', 'draconic', 'giant',
  'sylvan', 'celestial', 'abyssal', 'infernal', 'terran', 'undercommon', 'gnoll', 'aquan', 'auran', 'ignan',
  // Additional tongues used by featured/uncommon races.
  'aklo', 'catfolk', 'tengu', 'aboleth', 'grippli', 'nagaji', 'samsaran', 'vanaran', 'vishkanya', 'wayang', 'boggard', 'strix',
];
