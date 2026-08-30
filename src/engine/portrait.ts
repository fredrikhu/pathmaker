// Export a character as text for someone else's language model to work from.
//
// Nothing here calls a model, and nothing in the deployed app ever will. This produces a block of
// text the player copies into whichever assistant they already use, to get a backstory, an
// appearance, or a set of mannerisms back. The app's job is to say exactly what the sheet already
// decided — accurately, compactly, and without pretending to know anything it does not.
//
// Two things make the difference between a prompt that produces a generic elf and one that
// produces this character:
//
//   1. Separating what is settled from what is open. A model told "Lawful Neutral" will not write
//      a charming rogue; a model told nothing about family will happily invent one. Both are what
//      you want, and they have to be stated separately or the model guesses at which is which.
//   2. Pointing at the odd choices. A dumped ability, a lone skill on a character with few, an
//      archetype, a deity — those are where a character's story actually lives, and a model will
//      skate past them unless they are put in front of it.

import type { Ability, CharacterDoc, Resolution, Sheet } from './types';
import { abilityMod, fmtMod, speedLabel } from './types';
import { readDecisions } from './resolve';
import { fingerprint, type BuildFingerprint, type Gap, type OffenseStyle, type CombatRole, type PartyRole, type Strength } from './fingerprint';
import * as C from '../content/index';
import { filledDescription, readDescription } from './description';
import { ARMOR_SILHOUETTE, DEITY_SYMBOL, DEITY_SYMBOL_DETAIL } from '../content/iconography';

/** `prompt` is ready to paste and includes the instructions; `data` is the character block alone,
 *  for a player who already has a prompt they like. */
export type PortraitFormat = 'prompt' | 'data' | 'image';

const ALIGNMENT_NAME: Record<string, string> = {
  LG: 'Lawful Good', NG: 'Neutral Good', CG: 'Chaotic Good',
  LN: 'Lawful Neutral', N: 'True Neutral', CN: 'Chaotic Neutral',
  LE: 'Lawful Evil', NE: 'Neutral Evil', CE: 'Chaotic Evil',
};

const ABILITY_NAME: Record<Ability, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

// Short labels for the fingerprint's tags. Deliberately kept here rather than in the prose library:
// these are captions for a data block, not the library's authored voice, and they should read as
// plain description a model can use without adopting anyone's tone.
const STYLE_LABEL: Record<OffenseStyle, string> = {
  'two-hander': 'a large weapon held in both hands',
  'sword-and-board': 'a weapon and a shield',
  'two-weapon': 'a weapon in each hand',
  archery: 'a bow, at range',
  thrown: 'thrown weapons',
  'one-handed': 'a single weapon, one-handed',
  natural: 'claws and teeth',
  unarmed: 'bare hands',
  spell: 'spells rather than weapons',
  none: 'nothing yet chosen',
};

// Every label below completes a sentence whose subject is "they", so all of them are written to
// agree with a plural. Mixing an adjective into a table of verb phrases produces "They are can
// take a great deal of punishment" — and a model handed that will imitate it.
const ROLE_LABEL: Record<CombatRole, string> = {
  frontline: 'hold the front line',
  skirmisher: 'skirmish around the edges of a fight',
  artillery: 'attack from range',
  controller: 'control the battlefield with magic',
  support: 'support and protect the rest of the party',
  commander: 'fight alongside a companion creature',
};

const PARTY_LABEL: Record<PartyRole, string> = {
  face: 'the one who does the talking',
  scout: 'the one who scouts ahead',
  lore: 'the one who knows things',
  trapfinder: 'the one who finds the traps',
  healer: 'the one who patches people up',
};

const STRENGTH_LABEL: Record<Strength, string> = {
  'full-bab': 'are unusually accurate with a weapon',
  'top-tier-slots': 'are a full spellcaster for their level',
  'high-save-dc': 'cast magic that is hard to resist',
  'action-economy': 'have a companion creature that fights alongside them',
  'skill-monkey': 'are trained in an unusually wide range of skills',
  durable: 'can take a great deal of punishment',
  mobile: 'move faster than most',
  'keen-senses': 'perceive things others miss',
  'self-sufficient': 'can heal without help',
  resistant: 'shrug off some damage outright',
};

const GAP_LABEL: Record<Gap, string> = {
  'weak-will': 'are mentally vulnerable — poor at resisting fear, charm and domination',
  'weak-ref': 'are slow to dodge — poor at avoiding blasts and area effects',
  'weak-fort': 'are physically frail against poison, disease and exhaustion',
  'no-ranged-option': 'carry nothing that reaches further than arm\'s length',
  'no-melee-option': 'have little answer once something closes to arm\'s reach',
  'no-healing': 'cannot restore anyone\'s wounds, including their own',
  'no-trapfinder': 'cannot deal with traps',
  'thin-skills': 'are narrowly trained, with very few skills',
  'ability-hungry': 'are spread thin across many abilities rather than excelling at one',
};

/** Gaps that describe the person rather than the party's coverage. "Nobody here can disable a
 *  trap" matters when picking a party and says nothing about who this character is. */
const CHARACTERFUL_GAPS: Gap[] = [
  'weak-will', 'weak-ref', 'weak-fort', 'thin-skills', 'ability-hungry',
  'no-ranged-option', 'no-melee-option',
];

/** The pronoun line has to change with the sheet. Telling a model "no pronouns are recorded" when
 *  the player has just written "she/her" is worse than saying nothing — it invites the model to
 *  override a choice the player already made. */
const pronounRule = (pronouns: string): string => pronouns
  ? `- The character's pronouns are ${pronouns}. Use them throughout.`
  : '- The sheet records no gender or pronouns. Use they/them unless the player tells you otherwise.';

const instructions = (pronouns: string): string => `You are helping a player flesh out a tabletop roleplaying character for Pathfinder 1st Edition. Their character sheet is below.

Write:
1. **Appearance** — what someone notices on first meeting them, in a short paragraph.
2. **Backstory** — three or four paragraphs. How they came to be who they are, and how they ended up adventuring.
3. **Manner** — three specific habits, tics or turns of phrase.
4. **Drive** — what they want, and what they are afraid of.

How to use the sheet:

- Everything in it is already true. Do not contradict it, and do not quietly drop a detail that is awkward to explain.
- Where the sheet is silent — family, names of other people, what happened to them — invent freely. That is most of the story and it is yours to write.
${pronounRule(pronouns)}
- The specifics are the character. A dumped ability score, one heavily trained skill on someone who has few, a chosen deity, an odd piece of equipment: explain those rather than writing around them. The "Threads worth pulling" section at the end lists the ones the sheet itself finds notable.
- Mechanical terms are Pathfinder 1e. Translate them into things a person in the world would notice — "Intimidate +10" is someone people step back from, not a number anyone mentions.
- Do not invent rules, levels, items or abilities the character does not have.`;

/** The holy symbol as one sentence, with its clarifying clause when the terse form has one.
 *  Returns '' for a deity with no symbol on file, so callers can splice it in unconditionally. */
function describeSymbol(deityId: string, lead: string): string {
  const symbol = DEITY_SYMBOL[deityId];
  if (!symbol) return '';
  const detail = DEITY_SYMBOL_DETAIL[deityId];
  return ` ${lead}${symbol}${detail ? ` — ${detail}` : ''}.`;
}

const line = (label: string, value: string | number | null | undefined): string | null =>
  value === null || value === undefined || value === '' ? null : `${label}: ${value}`;

/** The one-sentence "what kind of character is this" summary, in the third person — the brief's
 *  own identity line is written to the player and would drag its voice into someone else's model. */
function shapeLines(fp: BuildFingerprint): string[] {
  const out: string[] = [];
  out.push(`Fights with: ${STYLE_LABEL[fp.offense.style]}${fp.offense.mainHand ? ` (${fp.offense.mainHand}${fp.offense.offHand ? ` and ${fp.offense.offHand}` : ''})` : ''}`);
  out.push(`In a fight, they: ${fp.combatRoles.map((r) => ROLE_LABEL[r]).join('; ')}`);
  out.push(`Armour: ${fp.defense.posture === 'unarmored' ? 'none' : fp.defense.posture}`);
  if (fp.casting) {
    out.push(`Magic: ${fp.casting.className} spellcasting, mostly ${fp.casting.lean === 'blaster' ? 'destructive' : fp.casting.lean === 'controller' ? 'used to control a fight' : fp.casting.lean === 'buffer' ? 'used to strengthen themselves and their allies' : fp.casting.lean === 'healer' ? 'restorative' : 'practical and utilitarian'}`);
  }
  if (fp.partyRoles.length) out.push(`Outside a fight, they are: ${fp.partyRoles.map((r) => PARTY_LABEL[r]).join('; ')}`);
  if (fp.companions.length) {
    out.push(`Companion: ${fp.companions.map((c) => `${c.name} (${c.label})`).join(', ')}`);
  }
  return out;
}

/** The section that earns the whole export: the handful of details a model would otherwise skate
 *  past. Only facts — each one is a question the sheet raises and cannot answer. */
function threads(fp: BuildFingerprint, doc: CharacterDoc, res: Resolution): string[] {
  const dec = readDecisions(doc);
  const out: string[] = [];

  const dumped = (Object.entries(fp.abilities) as [Ability, number][])
    .filter(([, score]) => score <= 9)
    .sort((a, b) => a[1] - b[1]);
  for (const [ab, score] of dumped) {
    out.push(`${ABILITY_NAME[ab]} ${score} is below average for a person. The sheet does not say why — that is yours to decide.`);
  }

  const best = fp.keyAbilities[0];
  if (best) out.push(`Their strongest attribute is ${ABILITY_NAME[best]} (${fp.abilities[best]}).`);

  // The skill someone sank ranks into says more about them than the ones they merely have.
  const ranks = Object.entries(dec.skillRanks).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (ranks[0] && ranks[0][1] >= Math.max(2, Math.ceil(fp.level / 2))) {
    const name = C.skillById.get(ranks[0][0])?.name ?? ranks[0][0];
    out.push(`They have put more training into ${name} than anything else. That was a deliberate choice.`);
  }

  if (fp.archetypeId) {
    const arch = C.classById.get(fp.primaryClassId)?.archetypes?.find((a) => a.id === fp.archetypeId);
    if (arch) out.push(`They are not a standard ${C.classById.get(fp.primaryClassId)?.name ?? 'member of their class'} but a ${arch.name}: ${arch.desc}`);
  }

  if (dec.deityId) {
    const deity = C.deityById.get(dec.deityId);
    if (deity) {
      out.push(`They worship ${deity.name} (${ALIGNMENT_NAME[deity.alignment] ?? deity.alignment}), whose concerns are ${deity.portfolio}.${describeSymbol(deity.id, `The holy symbol of ${deity.name} is `)} How devout they are is not recorded.`);
    }
  }

  for (const g of fp.gaps) {
    if (CHARACTERFUL_GAPS.includes(g)) out.push(`They ${GAP_LABEL[g]}.`);
  }

  if (fp.classes.length > 1) {
    out.push(`They have trained in more than one profession (${fp.classes.map((c) => `${c.name} ${c.levels}`).join(', ')}). Something made them change direction.`);
  }

  if (res.sheet.senses.length) out.push(`They can ${res.sheet.senses.join(', ')}.`);
  return out;
}

const SLOT_LABEL: Record<string, string> = {
  armor: 'Armour', shield: 'Shield', main: 'Main hand', off: 'Off hand',
};

/** What is actually on the character's body, in the order a picture reads it. Quality and named
 *  properties are kept — a flaming keen longsword is a different object to draw than a longsword. */
function wornAndWielded(sheet: Sheet): { slot: string; name: string }[] {
  const order = ['armor', 'shield', 'main', 'off'];
  return sheet.inventory
    .filter((i) => i.equipped)
    .sort((a, b) => order.indexOf(a.equipped!) - order.indexOf(b.equipped!))
    .map((i) => ({
      slot: SLOT_LABEL[i.equipped!] ?? i.equipped!,
      name: i.properties?.length ? `${i.name} (${i.properties.join(', ')})` : i.name,
    }));
}

/** Everything else on the sheet, which a portrait may or may not show. */
function alsoCarried(sheet: Sheet): string {
  return sheet.inventory
    .filter((i) => !i.equipped && i.qty > 0)
    .map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`)
    .join(', ');
}

/** The character block: everything the sheet has settled, as compact labelled text. */
export function characterFacts(doc: CharacterDoc, res: Resolution): string {
  const sheet = res.sheet;
  const dec = readDecisions(doc);
  const fp = fingerprint(doc, res);
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  const klass = C.classById.get(fp.primaryClassId);
  const arch = fp.archetypeId ? klass?.archetypes?.find((a) => a.id === fp.archetypeId) : undefined;

  const abilities = (Object.keys(ABILITY_NAME) as Ability[])
    .map((ab) => `${ABILITY_NAME[ab]} ${fp.abilities[ab]} (${fmtMod(abilityMod(fp.abilities[ab]))})`)
    .join(', ');

  const skills = Object.entries(dec.skillRanks)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => `${sheet.stats[`skill:${id}`]?.label ?? id} ${fmtMod(sheet.stats[`skill:${id}`]?.total ?? 0)}`)
    .join(', ');

  const feats = sheet.feats.map((f) => C.featById.get(f)?.name).filter(Boolean).join(', ');
  const traits = dec.traits.map((t) => C.traitById.get(t)).filter(Boolean)
    .map((t) => `- ${t!.name}: ${t!.desc}`).join('\n');

  const spellsByLevel = Object.entries(dec.spellPicks)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([lvl, ids]) => {
      const names = ids.map((id) => C.spellById.get(id)?.name).filter(Boolean);
      return names.length ? `  ${lvl === '0' ? 'Cantrips' : `Level ${lvl}`}: ${names.join(', ')}` : null;
    })
    .filter(Boolean).join('\n');

  const blocks: string[] = [];

  blocks.push(['## Who they are',
    line('Name', doc.name),
    line('Alignment', dec.alignment ? ALIGNMENT_NAME[dec.alignment] ?? dec.alignment : null),
    line('Race', race?.name),
    line('Class', klass ? `${klass.name} ${fp.level}${arch ? ` (${arch.name})` : ''}` : null),
    line('Deity', dec.deityId ? C.deityById.get(dec.deityId)?.name : 'none recorded'),
    line('Size', race?.size === 'small' ? 'Small' : race ? 'Medium' : null),
    line('Speed', speedLabel(sheet.speed)),
    line('Languages', dec.languages.length ? dec.languages.join(', ') : null),
  ].filter(Boolean).join('\n'));

  // Private fields (the player's real name) are dropped: this text is about to be pasted into
  // someone else's service, and nobody asked for that to carry a real person's name.
  const described = filledDescription(doc, false);
  if (described.length) {
    blocks.push(`## Description\n${described.map((d) => `${d.label}: ${d.value}`).join('\n')}`);
  }

  blocks.push(`## Abilities\n${abilities}`);

  blocks.push(`## How they operate\n${shapeLines(fp).map((l) => `- ${l}`).join('\n')}`);

  const notable = [
    ...fp.strengths.map((s) => `- They ${STRENGTH_LABEL[s]}.`),
  ];
  if (notable.length) blocks.push(`## What they are good at\n${notable.join('\n')}`);

  if (skills) blocks.push(`## Trained skills\n${skills}`);
  if (feats) blocks.push(`## Feats\n${feats}`);
  if (traits) blocks.push(`## Traits (these are backstory the player already chose)\n${traits}`);
  if (spellsByLevel) blocks.push(`## Spells chosen\n${spellsByLevel}`);

  // Split, because a picture only ever shows the first list. Everything a character owns went
  // into one heap before, so three javelins in a backpack read as prominently as the greatsword
  // in their hands.
  const worn = wornAndWielded(sheet);
  if (worn.length) blocks.push(`## Worn and wielded\n${worn.map((w) => `${w.slot}: ${w.name}`).join('\n')}`);
  const stowed = alsoCarried(sheet);
  if (stowed) blocks.push(`## Also carried (not necessarily visible)\n${stowed}`);

  const th = threads(fp, doc, res);
  if (th.length) blocks.push(`## Threads worth pulling\n${th.map((t) => `- ${t}`).join('\n')}`);

  return blocks.join('\n\n');
}

/** A prompt for an image generator rather than a writer.
 *
 *  This is a different document, not the backstory prompt with pictures asked for. An image model
 *  needs the few things that are actually visible — silhouette, what is held, what is worn, the
 *  emblem on the shield — and is actively hurt by the rest of the sheet, which it will try to
 *  render as symbols floating in the frame. It also needs to be told what *not* to invent: the
 *  failure that prompted this was a generated portrait giving a character the wrong god's
 *  iconography, which happens by default when the deity is named and never described. */
function imagePrompt(doc: CharacterDoc, res: Resolution): string {
  const sheet = res.sheet;
  const dec = readDecisions(doc);
  const fp = fingerprint(doc, res);
  const d = readDescription(doc);
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  const klass = C.classById.get(fp.primaryClassId);
  const deity = dec.deityId ? C.deityById.get(dec.deityId) : undefined;
  const symbol = deity ? DEITY_SYMBOL[deity.id] : undefined;

  const subject = [
    race?.size === 'small' ? 'Small' : race ? 'Medium' : null,
    race?.name,
    klass ? `${klass.name}${fp.archetypeId ? ` (${klass.archetypes?.find((a) => a.id === fp.archetypeId)?.name ?? ''})` : ''}` : null,
  ].filter(Boolean).join(' ');

  // Gender, pronouns and homeland are already in the Subject line; repeating them here reads to a
  // model as emphasis and tends to come back as text stamped on the image.
  const saidAbove = new Set(['Gender', 'Pronouns', 'Homeland']);
  const appearance = filledDescription(doc, false)
    .filter((f) => !saidAbove.has(f.label))
    .map((f) => `${f.label}: ${f.value}`);
  const homeland = d.homeland ? `From ${d.homeland}.` : null;

  const worn = wornAndWielded(sheet);
  const mustGetRight: string[] = [];
  if (symbol && deity) {
    // Naming forbidden emblems by shape backfires: "no sunburst" contradicts Iomedae, whose symbol
    // is a sword and sun. Say it once, generically, and let the required symbol do the work.
    // Names the symbol but not its detail: the full description is under Faith, and repeating it
    // here is the same over-emphasis that got gender stamped onto the image as text.
    mustGetRight.push(`The holy symbol is **${symbol}**, exactly as described under Faith. Use that emblem and no other.`);
  }
  mustGetRight.push(worn.length
    ? 'Only the equipment listed above may appear. Do not add weapons, shields or armour that is on neither list.'
    : 'No armour or weapons are recorded. Do not invent a full panoply — dress them plainly.');
  // Only worth saying for a race a generator is likely to default to a human, which is every race
  // except the one it would default to.
  if (race && race.id !== 'human') {
    // "They are Elf" needs an article and "a Elf" needs a vowel check; naming the field sidesteps
    // both and stays correct for every entry in the roster.
    mustGetRight.push(`Their race is ${race.name}. Render that race's distinctive features rather than a human in costume.`);
  }
  mustGetRight.push('Ability scores, hit points and other game numbers are not visible things. Do not render text, numbers, dice, stat blocks or a character sheet in the image.');

  const parts: string[] = [
    'Create a single character portrait for a high-fantasy tabletop roleplaying game (Pathfinder, set in Golarion).',
    `## Subject\n${subject || 'An adventurer'}${d.gender ? `, ${d.gender}` : ''}.${d.pronouns ? ` Pronouns ${d.pronouns}.` : ''}${homeland ? ` ${homeland}` : ''}`,
  ];
  if (appearance.length) parts.push(`## Appearance the player has already decided\n${appearance.map((a) => `- ${a}`).join('\n')}`);

  const silhouette = ARMOR_SILHOUETTE[fp.defense.posture];
  parts.push(`## Worn and wielded\n${worn.length ? worn.map((w) => `- ${w.slot}: ${w.name}`).join('\n') : '- Nothing recorded'}\n- Overall silhouette: ${silhouette}`);

  if (deity) {
    parts.push(`## Faith\nThey worship ${deity.name}, a deity of ${deity.portfolio.toLowerCase()}.${describeSymbol(deity.id, `${deity.name}'s holy symbol is `)}${symbol ? ' If a symbol appears anywhere — pendant, shield, banner, tabard, pommel — it must be this one.' : ''}`);
  }

  // Weapons on the sheet but not in hand are frequently visible on a person — a quiver, a slung
  // bow, javelins at the back. Everything else they own is in a pack and is not worth drawing.
  const carriedWeapons = sheet.inventory
    .filter((i) => !i.equipped && i.kind === 'weapon' && i.qty > 0)
    .map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`);
  if (carriedWeapons.length) {
    parts.push(`## Also carried, optional to show\n${carriedWeapons.map((w) => `- ${w}`).join('\n')}`);
  }

  parts.push(`## Bearing\n${fp.combatRoles.map((r) => `- They ${ROLE_LABEL[r]}.`).join('\n')}`);
  parts.push(`## Get these right\n${mustGetRight.map((m) => `- ${m}`).join('\n')}`);
  parts.push('## Left to you\nAnything not stated above — face, age, expression, pose, lighting, background and palette. Where this sheet is silent, choose something that fits the rest.');

  return parts.join('\n\n');
}

/** The full text to hand to a model. */
export function characterPortrait(doc: CharacterDoc, res: Resolution, format: PortraitFormat = 'prompt'): string {
  if (format === 'image') return imagePrompt(doc, res);
  const facts = characterFacts(doc, res);
  if (format === 'data') return facts;
  return `${instructions(readDescription(doc).pronouns)}\n\n---\n\n# Character sheet\n\n${facts}`;
}
