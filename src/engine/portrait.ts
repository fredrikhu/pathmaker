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

import type { Ability, CharacterDoc, Resolution } from './types';
import { abilityMod, fmtMod, speedLabel } from './types';
import { readDecisions } from './resolve';
import { fingerprint, type BuildFingerprint, type Gap, type OffenseStyle, type CombatRole, type PartyRole, type Strength } from './fingerprint';
import * as C from '../content/index';
import { filledDescription, readDescription } from './description';

/** `prompt` is ready to paste and includes the instructions; `data` is the character block alone,
 *  for a player who already has a prompt they like. */
export type PortraitFormat = 'prompt' | 'data';

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
    if (deity) out.push(`They worship ${deity.name} (${ALIGNMENT_NAME[deity.alignment] ?? deity.alignment}), whose concerns are ${deity.portfolio}. How devout they are is not recorded.`);
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

  const gear = Object.entries(doc.purchases).filter(([, q]) => q > 0)
    .map(([id, q]) => `${C.anyItemById(id)?.name ?? id}${q > 1 ? ` ×${q}` : ''}`).join(', ');

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
  if (gear) blocks.push(`## Equipment\n${gear}`);

  const th = threads(fp, doc, res);
  if (th.length) blocks.push(`## Threads worth pulling\n${th.map((t) => `- ${t}`).join('\n')}`);

  return blocks.join('\n\n');
}

/** The full text to hand to a language model. */
export function characterPortrait(doc: CharacterDoc, res: Resolution, format: PortraitFormat = 'prompt'): string {
  const facts = characterFacts(doc, res);
  if (format === 'data') return facts;
  return `${instructions(readDescription(doc).pronouns)}\n\n---\n\n# Character sheet\n\n${facts}`;
}
