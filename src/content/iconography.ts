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

/** How a category of armour reads at a glance. The catalogue's own item names ("Full plate",
 *  "Studded leather") are already concrete enough for a generator; this only adds the silhouette,
 *  which is what actually changes a portrait's composition. */
export const ARMOR_SILHOUETTE: Record<'heavy' | 'medium' | 'light' | 'unarmored', string> = {
  heavy: 'bulky, fully enclosed — a heavy armoured silhouette',
  medium: 'substantial but articulated — visible armour over ordinary clothing',
  light: 'lean and unencumbered — light armour that moves with the body',
  unarmored: 'no armour at all — cloth, robes or ordinary clothing',
};
