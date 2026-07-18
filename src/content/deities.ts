import type { BlessingDef, BloodlineDef, DeityDef, DomainDef, SchoolDef } from './model';

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

// Warpriest blessings (verified against d20pfsrd's blessing list). Keyed by the matching domain id;
// a warpriest chooses blessings from those granted by the deity's domains. Minor power = 1st level,
// major power = 10th; both draw on the shared blessing pool (3 + ½ warpriest level uses/day).
export const BLESSINGS: BlessingDef[] = [
  { id: 'air', name: 'Air', minor: 'A weapon ignores ranged range penalties for 1 min.', major: 'Grant an ally fly 60 ft (with bonus charge damage) for 1 min.' },
  { id: 'animal', name: 'Animal', minor: 'Grant an ally claws/bite (1d6/1d4) for 1 min.', major: "Summon a battle companion (summon nature's ally V) for 1 min." },
  { id: 'artifice', name: 'Artifice', minor: 'A melee weapon bypasses hardness and DR for 1 min.', major: 'Temporarily transfer a +1/+2 weapon or armor property between items.' },
  { id: 'chaos', name: 'Chaos', minor: 'Weapon gains the chaotic property (+1d6 vs lawful) for 1 min.', major: 'Summon a chaotic creature (summon monster IV) for 1 min.' },
  { id: 'charm', name: 'Charm', minor: 'Give an ally a sanctuary effect for 1 min.', major: 'Aura lets you issue a swift-action command spell within 30 ft for 1 min.' },
  { id: 'community', name: 'Community', minor: "An ally's aid another bonus rises to +4 for 1 min.", major: 'Allies gain +2 insight on attacks that match yours for 1 min.' },
  { id: 'darkness', name: 'Darkness', minor: 'Grant an ally 20% concealment in combat for 1 min.', major: 'Blind one foe within 30 ft (blindness/deafness) for 1 min.' },
  { id: 'death', name: 'Death', minor: 'Gain +4 Disguise/Intimidate and +2 saves vs disease and mind-affecting for 1 min.', major: 'Melee touch inflicts a temporary negative level for 1 min.' },
  { id: 'destruction', name: 'Destruction', minor: 'Grant an ally a morale bonus to weapon damage equal to half your level for 1 min.', major: 'A foe gets +4 to confirm crits and 50% to negate crits against them for 1 min.' },
  { id: 'earth', name: 'Earth', minor: 'Weapon deals +1d4 acid for 1 min.', major: 'Grant an ally DR 1/— (+1 per 2 levels) for 1 min.' },
  { id: 'evil', name: 'Evil', minor: 'Weapon deals +1d6 vs good and counts as evil for 1 min.', major: 'Summon an evil creature (summon monster IV) for 1 min.' },
  { id: 'fire', name: 'Fire', minor: 'Weapon deals +1d4 fire for 1 min.', major: 'Wreath an ally in a warm fire shield for 1 min.' },
  { id: 'glory', name: 'Glory', minor: 'Give an ally a sanctuary effect for 1 min.', major: 'Swift-action demoralize a damaged foe using your level.' },
  { id: 'good', name: 'Good', minor: 'Weapon deals +1d6 vs evil and counts as good for 1 min.', major: 'Summon a good creature (summon monster IV) for 1 min.' },
  { id: 'healing', name: 'Healing', minor: 'Empower a cure spell (+50% healing) as a swift action.', major: 'Touch an ally to grant fast healing 3 for 1 min.' },
  { id: 'knowledge', name: 'Knowledge', minor: "Touch attack reveals a creature's abilities (as a Knowledge check of 15 + level + Wis).", major: 'Gain +2 insight against a known opponent for 1 min.' },
  { id: 'law', name: 'Law', minor: 'Weapon deals +1d6 vs chaotic and counts as lawful for 1 min.', major: 'Summon a lawful creature (summon monster IV) for 1 min.' },
  { id: 'liberation', name: 'Liberation', minor: 'Ignore movement impediments and paralysis for 1 round (swift action).', major: '30-ft aura grants allies freedom of movement for 1 round.' },
  { id: 'luck', name: 'Luck', minor: 'Grant an ally one reroll (declared before the roll) for 1 min.', major: 'Force an adjacent foe to reroll and take the lower result (immediate action).' },
  { id: 'madness', name: 'Madness', minor: "Suspend a foe's cowering/frightened/panicked/paralyzed for 1 round, making it confused instead.", major: 'Dictate the confused behavior of all confused creatures within 30 ft for 1 round.' },
  { id: 'magic', name: 'Magic', minor: 'Make a single melee attack at 30-ft reach, adding Wis to the roll.', major: 'Cast a prepared spell 3+ levels below your highest without expending the slot.' },
  { id: 'nobility', name: 'Nobility', minor: 'Grant a creature within 30 ft +2 morale on attacks, checks, or saves for 1 min.', major: 'Allies within 30 ft gain +4 morale on their next action if they copy yours vs the same target.' },
  { id: 'plant', name: 'Plant', minor: 'Entangle a foe you hit in melee for 1 round (Reflex negates).', major: "Summon a plant creature (summon nature's ally IV) for 1 min." },
  { id: 'protection', name: 'Protection', minor: 'Gain +1 sacred bonus to AC and saves for 1 min.', major: '30-ft aura grants resistance 10 to acid/cold/electricity/fire/sonic for 1 min.' },
  { id: 'repose', name: 'Repose', minor: 'Touch staggers a living creature for 1 round (or sleeps it if already staggered).', major: 'When you channel to heal, also damage undead for half the amount.' },
  { id: 'rune', name: 'Rune', minor: 'Create an invisible blast rune (1d6 + ½ level) in an adjacent square.', major: 'Store a spell in a weapon (as spell storing) for up to 10 min.' },
  { id: 'strength', name: 'Strength', minor: 'Gain a ½-level enhancement bonus on melee attacks and Str checks for 1 round.', major: 'Ignore armor penalties and add Str to saves vs entangle/stagger/paralysis for 1 min.' },
  { id: 'sun', name: 'Sun', minor: 'Blind a foe for 1 round (dazzled if it saves).', major: 'Grant a weapon flaming or undead-bane for 1 min.' },
  { id: 'travel', name: 'Travel', minor: 'Ignore difficult terrain for 1 round.', major: 'Teleport up to 20 ft as a move action.' },
  { id: 'trickery', name: 'Trickery', minor: 'Create an illusory double (as mirror image) for several rounds.', major: 'Become invisible (as greater invisibility) for 1 round.' },
  { id: 'war', name: 'War', minor: 'Grant an ally +10 ft speed, +1 dodge AC, +1 insight to attack, or +1 luck on saves for 1 min.', major: 'Your melee attacks gain vicious and +4 insight to confirm crits for 1 min.' },
  { id: 'water', name: 'Water', minor: 'Weapon deals +1d4 cold for 1 min.', major: 'Wreath an ally in a chill fire shield for 1 min.' },
  { id: 'weather', name: 'Weather', minor: 'Weapon deals +1d4 electricity for 1 min.', major: 'Surround yourself with a wind wall (plus feather fall and clear ranged attacks) for 1 min.' },
];

export const blessingById = new Map(BLESSINGS.map((b) => [b.id, b]));

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
