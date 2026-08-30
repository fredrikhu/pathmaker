// What things look like, for the export that feeds a player's own image generator.
//
// The rest of the catalogue describes what a thing *does*; an image generator needs to know what
// it looks like, and nothing in the engine has ever recorded that. The gap showed up in the worst
// possible way — a generated portrait rendered a character's god wrong, because the export named
// the deity and its portfolio and gave no iconography at all.
//
// Every symbol below is quoted from the Archives of Nethys deity entries rather than recalled.
// That matters more here than anywhere else in the codebase: a wrong number is visible on the
// sheet next to its own breakdown, while a wrong holy symbol is invisible until it is already
// drawn on someone's character portrait.
//
// Deliberately absent: vestment colours, temple architecture, what the faithful wear. Those vary
// by region and sect, and inventing them would reintroduce exactly the failure this file exists
// to fix. The symbol is the part that is canonical, and it is the part that was wrong.

/** Deity id → holy symbol, verbatim from that deity's Archives of Nethys entry. */
export const DEITY_SYMBOL: Record<string, string> = {
  abadar: 'a golden key',
  calistria: 'three daggers touching at the pommel with points out',
  desna: 'a butterfly with two stars, a sun, and a moon on its wings',
  erastil: 'a bow and arrow',
  gorum: 'a sword impaling a mountain',
  groetus: 'a skull-faced moon',
  gozreh: 'a dripping leaf',
  iomedae: 'a sword and sun',
  irori: 'a blue hand',
  lamashtu: 'a three-eyed jackal face',
  nethys: 'a two-toned mask',
  norgorber: 'a one-eyed mask',
  pharasma: 'a spiraling comet',
  rovagug: 'an open maw surrounded by spider legs',
  sarenrae: 'an ankh-shaped angel with upraised wings',
  shelyn: 'a songbird with a multicoloured tail',
  torag: 'an iron hammer',
  urgathoa: 'a skull-decorated fly',
  ydersius: 'a snake skull and ouroboros',
  'zon-kuthon': 'a human skull with chains hanging like streaming tears from its eye sockets',
};

/** A clarifying clause for the symbols whose one-line description leaves a generator guessing.
 *
 *  Held separately from `DEITY_SYMBOL` because the two are sourced differently, and the difference
 *  matters. The line above is the rules text, verbatim. These are drawn from how the symbol is
 *  actually depicted in published art and setting material, and are the softer of the two — so
 *  they only appear where the terse line is genuinely ambiguous and the clarification is
 *  well attested. A symbol that reads unambiguously gets no entry.
 *
 *  Nothing here is a guess at an unstated fact. Abadar's key is often drawn pointing downward, for
 *  instance, and there is no entry for it: the rules text does not say so, and the one secondary
 *  source that did could not be corroborated. Only one of these ever reaches a prompt — a
 *  character has one god — so the cost of the table is nil and the cost of a wrong line is a
 *  picture drawn wrong with confidence.
 *
 *  Sacred and favoured colours were considered and left out. The sources for them disagreed badly
 *  enough to attribute one deity's symbol to another, and a wrong colour is the same failure as a
 *  wrong emblem. */
export const DEITY_SYMBOL_DETAIL: Record<string, string> = {
  iomedae: 'drawn as a longsword surrounded by a burst of light',
  irori: 'an open palm, shown within a circle',
  lamashtu: 'the third eye is vertical, set in the centre of the forehead',
  nethys: 'the face divided down the middle, one half black and one half white',
  norgorber: 'a plain, featureless mask broken only by the single eye',
  pharasma: 'drawn as a spiral, the path of a soul from birth to death',
  rovagug: 'the maw is fanged and open',
  urgathoa: 'the skull sits on the back of the fly',
};

/** What a race looks like, for a generator that has never heard of it.
 *
 *  An image model knows "elf" and "dwarf". It does not know wayang, nagaji, vishkanya or samsaran,
 *  and handed one of those names it draws a human and hopes. Each line here is condensed from that
 *  race's Archives of Nethys entry (d20pfsrd for the two whose AoN pages would not load), and is
 *  restricted to what is *visible* — build, colouring, and the features that make the race itself
 *  recognisable. Temperament, culture and homeland are elsewhere on the sheet and are not things a
 *  portrait can show.
 *
 *  The staples of fantasy — human, dwarf, elf, halfling, half-elf, half-orc — are absent on
 *  purpose: a generator renders them correctly from the name alone, and a line describing an elf
 *  as slender with pointed ears is pure dilution. Gnome is here despite being a staple, because
 *  Golarion's gnomes are not the generic ones: the vivid hair is the whole point of them. */
export const RACE_LOOK: Record<string, string> = {
  aasimar: 'human but for one celestial trait — hair with a metallic sheen, jewel-toned eyes, lustrous skin, sometimes a faint golden halo',
  android: 'built to pass for human, betrayed on a close look by a metallic sheen in the eyes and biological, tattoo-like circuitry tracing the skin',
  catfolk: 'feline humanoid in soft fine fur, with slit pupils, rounded catlike ears, a sleek slender tail and small retractable claws',
  changeling: 'always female, tall and slender, abnormally pale, hair usually dark, and often with mismatched eyes of two different colours',
  dhampir: 'statuesque and unnervingly beautiful, pale, with over-pronounced features and elongated incisors',
  drow: 'elf-slender with long pointed ears, skin from coal black to dusky purple, white or silver hair, and pupilless eyes of solid white or red',
  duergar: 'grey-skinned dwarves, bearded but bald, with cold lightless eyes',
  fetchling: 'unnaturally lithe humans drained of colour — skin anywhere from stark white through grey to black, white or pale grey hair, and pupilless eyes glowing yellow or greenish-yellow',
  gillman: 'passes for human but for the gills on the neck and vividly purple eyes; pearly, peach or sandy skin, hair dark or sea-coloured',
  gnoll: 'hyena-headed, around seven and a half feet tall, in dirty yellow or reddish-brown fur, standing digitigrade on hyena-like feet',
  gnome: 'barely three feet tall, with hair in vivid natural colour — fiery orange, spring green, deep red or purple — and oversized mouths and eyes',
  goblin: 'barely three feet tall, with an oversized hairless head, massive ears, a huge mouth of jagged teeth and beady red eyes; skin green, grey, blue, black or pale white',
  grippli: 'frog-like humanoid barely two feet tall, in mottled green-and-brown skin',
  hobgoblin: 'muscular and almost apelike — long arms, thick torso, short legs — with grey-green to mossy green skin, fiery orange or red eyes, wholly hairless, and sharply pointed ears',
  ifrit: 'fire-touched: pointed ears, red or mottled horns at the brow, and hair that flickers and waves as though it were aflame',
  kitsune: 'a fox shapechanger, appearing either as a slender, striking human or as an anthropomorphic fox',
  kobold: 'small reptilian humanoid with scales of black, green, blue, red or white, small horns and a tail',
  lizardfolk: 'six to seven feet of reptilian humanoid in grey, green or brown scales, with a short toothy snout and a thick heavy tail; some have dorsal spikes or brightly coloured frills',
  merfolk: 'the upper body of a graceful humanoid above the long tail of a great fish, its scales iridescent in ocean greens and blues',
  nagaji: 'ophidian humanoid whose scaled skin carries the patterning of true nagas, with a forked tongue and lidless, unblinking eyes',
  orc: 'powerfully built and taller than a human with far more muscle — dull green skin, coarse dark hair, beady red eyes and protruding tusks',
  oread: 'earth-touched: solidly built, skin and hair in stony black, brown, grey or white, and sometimes gemstone eyes or hair like crystalline spikes',
  ratfolk: 'small rodent-featured humanoid around four feet tall, often robed, wearing small metal rings in the ears and tail',
  samsaran: 'pale blue skin, dark hair, and solid white eyes with neither pupil nor iris',
  strix: 'winged humanoid with black skin and broad functional wings',
  suli: 'tall and strikingly beautiful, with eyes that glow or shift colour with the element they are attuned to, and sometimes bronze-toned skin',
  svirfneblin: 'a deep gnome — small, wiry, with slate-grey skin',
  sylph: 'air-touched: pale and thin to the point of appearing delicate, with complex blue markings swirling across the skin',
  tengu: 'wingless avian humanoid with a crow-like beak, humanoid hands and clawed feet; plumage usually jet black, sometimes brown or blue-black',
  tiefling: 'fiend-blooded and no two alike — some combination of horns, a barbed tail, fangs, small wings, claws or oddly coloured eyes',
  undine: 'water-touched: skin from pale turquoise through deep blue to sea green, with fin-like ears and webbed hands and feet',
  vanara: 'monkey-like humanoid in a thin coat of soft chestnut, ivory or gold fur, with a long prehensile tail and hand-like feet',
  vishkanya: 'graceful humanoid whose supple skin is covered in tiny scales, often light green, with serpentine eyes of burnished gold',
  wayang: 'small and extremely gaunt, skin the colour of deep shadow, often marked with raised white dots in ornate spirals and geometric patterns',
};

/** How a category of armour reads at a glance. The catalogue's own item names ("Full plate",
 *  "Studded leather") are already concrete enough for a generator; this only adds the silhouette,
 *  which is what actually changes a portrait's composition. */
export const ARMOR_SILHOUETTE: Record<'heavy' | 'medium' | 'light' | 'unarmored', string> = {
  heavy: 'bulky, fully enclosed — a heavy armoured silhouette',
  medium: 'substantial but articulated — visible armour over ordinary clothing',
  light: 'lean and unencumbered — light armour that moves with the body',
  unarmored: 'no armour at all — cloth, robes or ordinary clothing',
};
