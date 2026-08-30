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

/** How a category of armour reads at a glance. The catalogue's own item names ("Full plate",
 *  "Studded leather") are already concrete enough for a generator; this only adds the silhouette,
 *  which is what actually changes a portrait's composition. */
export const ARMOR_SILHOUETTE: Record<'heavy' | 'medium' | 'light' | 'unarmored', string> = {
  heavy: 'bulky, fully enclosed — a heavy armoured silhouette',
  medium: 'substantial but articulated — visible armour over ordinary clothing',
  light: 'lean and unencumbered — light armour that moves with the body',
  unarmored: 'no armour at all — cloth, robes or ordinary clothing',
};
