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

// Cleric domain granted powers, verified against d20pfsrd's per-domain pages. Each domain grants two
// powers (the second at 4th/6th/8th depending on the domain). Bonus domain spells are not modelled;
// the extra domain spell slot is applied as a +1 count in the engine.
const p = (name: string, level: number, desc: string) => ({ name, level, desc });
const ordinalLevel = (l: number) => (l === 1 ? '1st' : l === 2 ? '2nd' : l === 3 ? '3rd' : `${l}th`);

const DOMAIN_POWERS: Record<string, ReturnType<typeof p>[]> = {
  air: [p('Lightning Arc', 1, 'Ranged touch attack for 1d6 electricity +1 per two cleric levels; 3 + Wis/day.'), p('Electricity Resistance', 6, 'Resist electricity 10, rising to 20 at 12th and immunity at 20th.')],
  animal: [p('Speak with Animals', 1, 'Speak with animals for 3 + cleric level rounds/day.'), p('Animal Companion', 4, 'Gain an animal companion at an effective druid level of your cleric level − 3.')],
  artifice: [p("Artificer's Touch", 1, 'Cast mending at will; melee touch damages objects and constructs for 1d6 +1 per two levels; 3 + Wis/day.'), p('Dancing Weapons', 8, 'Give a touched weapon the dancing quality for 4 rounds; 1/day, +1 per four levels after 8th.')],
  chaos: [p('Touch of Chaos', 1, 'Melee touch makes the target roll twice and take the worse result for 1 round; 3 + Wis/day.'), p('Chaos Blade', 8, 'Give a touched weapon the anarchic quality for ½ cleric level rounds; 1/day, +1 per four levels after 8th.')],
  charm: [p('Dazing Touch', 1, 'Melee touch dazes a creature with fewer HD than your level for 1 round; 3 + Wis/day.'), p('Charming Smile', 8, 'Cast charm person as a swift action, one target at a time; cleric level rounds/day.')],
  community: [p('Calming Touch', 1, 'Touch heals 1d6 nonlethal +1 per level and removes fatigued, shaken, and sickened; 3 + Wis/day.'), p('Unity', 8, 'Allies within 30 ft may use your saving throw against an effect targeting you and them; 1/day, +1 per four levels after 8th.')],
  darkness: [p('Touch of Darkness', 1, 'Melee touch gives the target a 20% miss chance for ½ cleric level rounds; 3 + Wis/day.'), p('Eyes of Darkness', 8, 'See normally regardless of darkness for ½ cleric level rounds/day.')],
  death: [p('Bleeding Touch', 1, 'Melee touch deals 1d6 damage per round for ½ cleric level rounds; 3 + Wis/day.'), p("Death's Embrace", 8, 'You heal from channeled negative energy as undead do.')],
  destruction: [p('Destructive Smite', 1, 'One melee attack gains a morale damage bonus equal to ½ your level (min 1); 3 + Wis/day.'), p('Destructive Aura', 8, '30-ft aura: attacks gain ½-level morale damage and all critical threats auto-confirm; cleric level rounds/day.')],
  earth: [p('Acid Dart', 1, 'Ranged touch attack for 1d6 acid +1 per two cleric levels; 3 + Wis/day.'), p('Acid Resistance', 6, 'Resist acid 10, rising to 20 at 12th and immunity at 20th.')],
  evil: [p('Touch of Evil', 1, 'Melee touch sickens a creature for ½ cleric level rounds; 3 + Wis/day.'), p('Scythe of Evil', 8, 'Give a touched weapon the unholy quality for ½ cleric level rounds; 1/day, +1 per four levels after 8th.')],
  fire: [p('Fire Bolt', 1, 'Ranged touch attack for 1d6 fire +1 per two cleric levels; 3 + Wis/day.'), p('Fire Resistance', 6, 'Resist fire 10, rising to 20 at 12th and immunity at 20th.')],
  glory: [p('Touch of Glory', 1, 'Touch grants a bonus equal to your cleric level on one Charisma-based check; 3 + Wis/day.'), p('Divine Presence', 8, '30-ft aura grants allies sanctuary; cleric level rounds/day, ending if anyone in it attacks.')],
  good: [p('Touch of Good', 1, 'Touch grants a sacred bonus of ½ your level (min 1) on attacks, checks, and saves for 1 round; 3 + Wis/day.'), p('Holy Lance', 8, 'Give a touched weapon the holy quality for ½ cleric level rounds; 1/day, +1 per four levels after 8th.')],
  healing: [p('Rebuke Death', 1, 'Touch a creature below 0 HP to heal 1d4 +1 per two cleric levels; 3 + Wis/day.'), p("Healer's Blessing", 6, 'All your cure spells are treated as empowered (+50% healing).')],
  knowledge: [p('Lore Keeper', 1, "Touch a creature to learn its abilities as a Knowledge check of 15 + cleric level + Wis."), p('Remote Viewing', 6, 'Use clairaudience/clairvoyance for cleric level rounds/day.')],
  law: [p('Touch of Law', 1, 'Touch lets a willing creature treat d20 rolls as an 11 for 1 round; 3 + Wis/day.'), p('Staff of Order', 8, 'Give a touched weapon the axiomatic quality for ½ cleric level rounds; 1/day, +1 per four levels after 8th.')],
  liberation: [p('Liberation', 1, 'Move normally despite magic that impedes movement; cleric level rounds/day.'), p("Freedom's Call", 8, '30-ft aura suppresses confused, grappled, frightened, panicked, paralyzed, pinned, and shaken for allies; cleric level rounds/day.')],
  luck: [p('Bit of Luck', 1, 'Touch lets a willing creature roll twice and take the better result for 1 round; 3 + Wis/day.'), p('Good Fortune', 6, 'Reroll one d20 as an immediate action; 1/day, +1 per six levels after 6th.')],
  madness: [p('Vision of Madness', 1, 'Melee touch grants a bonus to one roll type and a penalty to the others; 3 + Wis/day.'), p('Aura of Madness', 8, '30-ft confusion aura (Will negates); cleric level rounds/day.')],
  magic: [p('Hand of the Acolyte', 1, 'Make a melee weapon attack at 30 ft using your Wis modifier to hit; 3 + Wis/day.'), p('Dispelling Touch', 8, 'Use targeted dispel magic as a melee touch attack; 1/day, +1 per four levels after 8th.')],
  nobility: [p('Inspiring Word', 1, 'A creature within 30 ft gains +2 morale on attacks, checks, and saves for ½ level rounds (min 1); 3 + Wis/day.'), p('Leadership', 8, 'Gain the Leadership feat as a bonus feat, plus +2 to your leadership score.')],
  plant: [p('Wooden Fist', 1, 'Unarmed strikes deal lethal damage with a bonus equal to ½ your cleric level; 3 + Wis rounds/day.'), p('Bramble Armor', 6, 'Melee attackers take 1d6 + ½ cleric level piercing damage; cleric level rounds/day.')],
  protection: [p('Resistant Touch', 1, 'Touch an ally to grant it your resistance bonus for 1 minute; 3 + Wis/day.'), p('Aura of Protection', 8, '30-ft aura grants allies +1 deflection AC and energy resistance 5 (scaling); cleric level rounds/day.')],
  repose: [p('Gentle Rest', 1, 'Touch staggers a living creature for 1 round, or puts it to sleep if already staggered; 3 + Wis/day.'), p('Ward Against Death', 8, '30-ft aura grants immunity to death effects and energy drain; cleric level rounds/day.')],
  rune: [p('Blast Rune', 1, 'Create a rune in an adjacent square dealing 1d6 +1 per two cleric levels; 3 + Wis/day.'), p('Spell Rune', 8, 'Attach a spell you cast to a blast rune so it also affects the triggering creature.')],
  strength: [p('Strength Surge', 1, 'Touch grants an enhancement bonus to melee attacks and Str checks for 1 round; 3 + Wis/day.'), p('Might of the Gods', 8, 'Add your cleric level as an enhancement bonus to Strength checks; cleric level rounds/day.')],
  sun: [p("Sun's Blessing", 1, 'Add your cleric level to positive-energy channel damage against undead, ignoring their channel resistance.'), p('Nimbus of Light', 8, '30-ft daylight sphere damages undead for your cleric level each round and dispels darkness; cleric level rounds/day.')],
  travel: [p('Agile Feet', 1, 'Ignore difficult terrain for 1 round as a free action; 3 + Wis/day.'), p('Dimensional Hop', 8, 'Teleport up to 10 ft per cleric level per day as a move action, in 5-ft increments.')],
  trickery: [p('Copycat', 1, 'Create a single mirror image lasting cleric level rounds; 3 + Wis/day.'), p("Master's Illusion", 8, 'Veil-like illusion disguises you and allies within 30 ft; ½ character level rounds/day.')],
  war: [p('Battle Rage', 1, 'Touch grants a melee damage bonus equal to ½ your cleric level (min +1) for 1 round; 3 + Wis/day.'), p('Weapon Master', 8, 'Activate one combat feat you qualify for as a swift action; cleric level rounds/day.')],
  water: [p('Icicle', 1, 'Ranged touch attack for 1d6 cold +1 per two cleric levels; 3 + Wis/day.'), p('Cold Resistance', 6, 'Resist cold 10, rising to 20 at 12th and immunity at 20th.')],
  weather: [p('Storm Burst', 1, 'Ranged touch attack for 1d6 nonlethal +1 per two cleric levels; 3 + Wis/day.'), p('Lightning Lord', 8, 'Call down bolts of lightning (as call lightning); cleric level bolts/day.')],
};

// The nine domain spells per domain (index 0 = 1st level … index 8 = 9th), from the CRB domain
// lists — now complete for all 33 domains (every entry a catalogue spell id). A cleric with the
// domain gets a bonus slot per level restricted to the matching domain spell. The type still admits
// null so a future domain can leave a level open, but none currently do.
const DOMAIN_SPELLS: Record<string, (string | null)[]> = {
  //        1st                     2nd                 3rd                          4th                     5th                  6th                    7th                8th                9th
  air:       ['obscuring-mist',      'wind-wall',        'gaseous-form',              'air-walk',             'control-winds',     'chain-lightning',     'elemental-body-iv', 'whirlwind',      'elemental-swarm'],
  animal:    ['calm-animals',        'hold-animal',      'dominate-animal',           'summon-natures-ally-iv', 'beast-shape-iii', 'antilife-shell',      'animal-shapes',   'summon-natures-ally-viii', 'shapechange'],
  artifice:  ['animate-rope',        'wood-shape',       'stone-shape',               'minor-creation',       'fabricate',         'major-creation',      'wall-of-iron',    'instant-summons', 'prismatic-sphere'],
  chaos:     ['protection-from-law', 'align-weapon',     'magic-circle-against-law',  'chaos-hammer',         'dispel-law',        'animate-objects',     'word-of-chaos',   'cloak-of-chaos',  'summon-monster-ix'],
  charm:     ['charm-person',        'calm-emotions',    'suggestion',                'heroism',              'charm-monster',     'geas-quest',          'insanity',        'demand',          'dominate-monster'],
  community: ['bless',               'shield-other',     'prayer',                    'imbue-with-spell-ability', 'telepathic-bond', 'heroes-feast',      'refuge',          'mass-cure-critical-wounds', 'miracle'],
  darkness:  ['obscuring-mist',      'blindness',        'deeper-darkness',           'shadow-conjuration',   'summon-monster-v',  'shadow-walk',         'power-word-blind', 'greater-shadow-evocation', 'shades'],
  death:     ['cause-fear',          'death-knell',      'animate-dead',              'death-ward',           'slay-living',       'create-undead',       'destruction',     'create-greater-undead', 'wail-of-the-banshee'],
  destruction:['true-strike',        'shatter',          'rage',                      'inflict-critical-wounds', 'shout',          'harm',                'disintegrate',    'earthquake',      'implosion'],
  earth:     ['magic-stone',         'soften-earth-and-stone', 'stone-shape',         'spike-stones',         'wall-of-stone',     'stoneskin',           'elemental-body-iv', 'earthquake',    'elemental-swarm'],
  evil:      ['protection-from-good', 'align-weapon',    'magic-circle-against-good', 'unholy-blight',        'dispel-good',       'create-undead',       'blasphemy',       'unholy-aura',     'summon-monster-ix'],
  fire:      ['burning-hands',       'produce-flame',    'fireball',                  'wall-of-fire',         'fire-shield',       'fire-seeds',          'elemental-body-iv', 'incendiary-cloud', 'elemental-swarm'],
  glory:     ['shield-of-faith',     'bless-weapon',     'searing-light',             'holy-smite',           'righteous-might',   'undeath-to-death',    'holy-sword',      'holy-aura',       'gate'],
  good:      ['protection-from-evil', 'align-weapon',    'magic-circle-against-evil', 'holy-smite',           'dispel-evil',       'blade-barrier',       'holy-word',       'holy-aura',       'summon-monster-ix'],
  healing:   ['cure-light-wounds',   'cure-moderate-wounds', 'cure-serious-wounds',   'cure-critical-wounds', 'breath-of-life',    'heal',                'regenerate',      'mass-cure-critical-wounds', 'mass-heal'],
  knowledge: ['comprehend-languages', 'detect-thoughts', 'speak-with-dead',          'divination',           'true-seeing',       'find-the-path',       'legend-lore',     'discern-location', 'foresight'],
  law:       ['protection-from-chaos', 'align-weapon',   'magic-circle-against-chaos', 'order-s-wrath',       'dispel-chaos',      'hold-monster',        'dictum',          'shield-of-law',   'summon-monster-ix'],
  liberation:['remove-fear',         'remove-paralysis', 'remove-curse',              'freedom-of-movement',  'break-enchantment', 'greater-dispel-magic', 'refuge',         'mind-blank',      'freedom'],
  luck:      ['true-strike',         'aid',              'protection-from-energy',    'freedom-of-movement',  'break-enchantment', 'mislead',             'spell-turning',   'moment-of-prescience', 'miracle'],
  madness:   ['lesser-confusion',    'touch-of-idiocy',  'rage',                      'confusion',            'nightmare',         'phantasmal-killer',   'insanity',        'scintillating-pattern', 'weird'],
  magic:     ['identify',            'magic-mouth',      'dispel-magic',              'imbue-with-spell-ability', 'spell-resistance', 'antimagic-field',  'spell-turning',   'protection-from-spells', 'mages-disjunction'],
  nobility:  ['divine-favor',        'enthrall',         'magic-vestment',            'discern-lies',         'greater-command',   'geas-quest',          'repulsion',       'demand',          'storm-of-vengeance'],
  plant:     ['entangle',            'barkskin',         'plant-growth',              'command-plants',       'wall-of-thorns',    'repel-wood',          'animate-plants',  'control-plants',  'shambler'],
  protection:['sanctuary',           'shield-other',     'protection-from-energy',    'spell-immunity',       'spell-resistance',  'antimagic-field',     'repulsion',       'mind-blank',      'prismatic-sphere'],
  repose:    ['deathwatch',          'gentle-repose',    'speak-with-dead',           'death-ward',           'slay-living',       'undeath-to-death',    'destruction',     'waves-of-exhaustion', 'wail-of-the-banshee'],
  rune:      ['erase',               'secret-page',      'glyph-of-warding',          'explosive-runes',      'lesser-planar-binding', 'greater-glyph-of-warding', 'instant-summons', 'symbol-of-death', 'teleportation-circle'],
  strength:  ['enlarge-person',      'bulls-strength',   'magic-vestment',            'spell-immunity',       'righteous-might',   'stoneskin',           'grasping-hand',   'clenched-fist',   'crushing-hand'],
  sun:       ['endure-elements',     'heat-metal',       'searing-light',             'fire-shield',          'flame-strike',      'fire-seeds',          'sunbeam',         'sunburst',        'prismatic-sphere'],
  travel:    ['longstrider',         'locate-object',    'fly',                       'dimension-door',       'teleport',          'find-the-path',       'greater-teleport', 'phase-door',     'astral-projection'],
  trickery:  ['disguise-self',       'invisibility',     'nondetection',              'confusion',            'false-vision',      'mislead',             'screen',          'mass-invisibility', 'time-stop'],
  war:       ['magic-weapon',        'spiritual-weapon', 'magic-vestment',            'divine-power',         'flame-strike',      'blade-barrier',       'power-word-blind', 'power-word-stun', 'power-word-kill'],
  water:     ['obscuring-mist',      'fog-cloud',        'water-breathing',           'control-water',        'ice-storm',         'cone-of-cold',        'elemental-body-iv', 'horrid-wilting', 'elemental-swarm'],
  weather:   ['obscuring-mist',      'fog-cloud',        'call-lightning',            'sleet-storm',          'ice-storm',         'control-winds',       'control-weather', 'whirlwind',       'storm-of-vengeance'],
};

export const DOMAINS: DomainDef[] = Object.entries(DOMAIN_POWERS).map(([id, powers]) => ({
  id,
  name: id.charAt(0).toUpperCase() + id.slice(1),
  powers,
  spells: DOMAIN_SPELLS[id] ?? Array(9).fill(null),
  desc: powers.map((pw) => `${pw.name} (${ordinalLevel(pw.level)}): ${pw.desc}`).join(' · '),
}));

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
