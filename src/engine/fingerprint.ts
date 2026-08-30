// The build's playstyle fingerprint: the handful of discrete facts that decide how a character is
// actually played, read off a resolved sheet.
//
// Nothing here is a rules computation. Every number this module reads has already been computed
// and verified by `resolve`; what it adds is *classification* — turning "AC 21, a greatsword held
// in two hands, Power Attack, Will +3" into `posture: 'heavy'`, `style: 'two-hander'`,
// `themes: ['power-attack']`, `gaps: ['weak-will']`.
//
// The output is deliberately built out of small enumerated unions rather than prose or raw
// numbers, because what consumes it is a static library of authored text keyed on exactly these
// values. A tag that cannot be enumerated cannot be written for ahead of time.
//
// It is descriptive, not prescriptive. Every judgement is either a comparison of the character
// against itself (which save is lowest, which ability is highest) or a structural fact (there is
// no ranged attack line at all). It deliberately does not grade a build against a power curve —
// "your AC is too low for level 7" depends on the table you play at, and guessing at it would put
// an opinion next to numbers the rest of the engine can defend line by line.

import type { Ability, CharacterDoc, Resolution, Sheet } from './types';
import { readDecisions } from './resolve';
import * as C from '../content/index';
import type { SpellDef } from '../content/model';
import { SPELL_ROLE_OVERRIDES, type SpellRole } from '../content/spell-tactics';

/** How the character's attacks are actually made. Taken from what is equipped, not from what the
 *  character is theoretically capable of — a wizard holding a longspear is a 'one-handed' body
 *  with a 'spell' offense, and both facts matter. */
export type OffenseStyle =
  | 'two-hander' | 'sword-and-board' | 'two-weapon' | 'archery' | 'thrown'
  | 'one-handed' | 'natural' | 'unarmed' | 'spell' | 'none';

export type ArmorPosture = 'heavy' | 'medium' | 'light' | 'unarmored';

/** Where the character stands in a fight. A build can hold more than one. */
export type CombatRole = 'frontline' | 'skirmisher' | 'artillery' | 'controller' | 'support' | 'commander';

/** Jobs outside the initiative order. Also plural — a bard is usually all of them. */
export type PartyRole = 'face' | 'scout' | 'lore' | 'trapfinder' | 'healer';

/** What a caster's chosen spells are mostly for. Named per spell in content/spell-tactics.ts. */
export type CastingLean = SpellRole;

/** Feat clusters that signal intent. A single feat is a purchase; three of a kind is a plan. */
export type FeatTheme =
  | 'power-attack' | 'archery' | 'two-weapon' | 'maneuvers' | 'critical' | 'mobility'
  | 'metamagic' | 'defensive' | 'shield' | 'mounted' | 'channel' | 'crafting' | 'skill';

/** Structural holes. Each is certain from the sheet — none is a judgement about whether the
 *  numbers are big enough. */
export type Gap =
  | 'weak-will' | 'weak-ref' | 'weak-fort'
  | 'no-ranged-option' | 'no-melee-option' | 'no-healing' | 'no-trapfinder' | 'thin-skills'
  | 'ability-hungry';

/** Things the build does that most builds cannot. */
export type Strength =
  | 'full-bab' | 'top-tier-slots' | 'high-save-dc' | 'action-economy' | 'skill-monkey'
  | 'durable' | 'mobile' | 'keen-senses' | 'self-sufficient' | 'resistant';

export interface ResourceRhythm {
  id: string;
  name: string;
  max: number;
  unit: 'rounds' | 'uses' | 'points';
  /** 'duration' burns while switched on (rage rounds, bardic performance); 'discrete' is spent a
   *  use at a time (channel, smite, ki). The two pace a day very differently. */
  pacing: 'duration' | 'discrete';
}

export interface CastingShape {
  classId: string;
  className: string;
  /** As the class defines it — 'prepared-list', 'prepared-book', 'spontaneous'. */
  kind: string;
  ability: Ability;
  list: string;
  casterLevel: number;
  /** Highest spell level with at least one slot. 0 means cantrips only. */
  topSpellLevel: number;
  /** 10 + casting-ability modifier; a given spell's DC adds its own level on top. */
  dcBase: number;
  lean: CastingLean;
  /** Every lean present among the picks, most common first — so prose can say "control first,
   *  with a blasting option" rather than flattening to a single word. */
  leanMix: CastingLean[];
  focusSchools: string[];
  /** How many spells the character has actually chosen. Zero means the picks are still empty and
   *  `lean` falls back to what the class is usually for. */
  pickCount: number;
}

export interface BuildFingerprint {
  level: number;
  /** One entry per class taken, in level order. Single-class builds have one. */
  classes: { id: string; name: string; levels: number }[];
  primaryClassId: string;
  archetypeId: string | null;
  summaryLine: string;

  offense: {
    style: OffenseStyle;
    /** Which ability the character's attacks actually run off. */
    ability: Ability | null;
    /** Highest attack bonus on any line, and how many iteratives that line has. */
    bestAttack: number;
    iteratives: number;
    hasRanged: boolean;
    hasMelee: boolean;
    /** Names for the equipped hands, for prose that wants to be concrete. */
    mainHand: string | null;
    offHand: string | null;
  };

  defense: {
    posture: ArmorPosture;
    ac: number;
    touch: number;
    flatFooted: number;
    hp: number;
    saves: Record<'fort' | 'ref' | 'will', number>;
    /** The lowest save, named only when it trails the highest by 4 or more — below that the
     *  spread is noise rather than a hole worth planning around. */
    weakSave: 'fort' | 'ref' | 'will' | null;
    hasDr: boolean;
    hasResistances: boolean;
  };

  casting: CastingShape | null;
  resources: ResourceRhythm[];
  companions: { kind: string; name: string; label: string; attackCount: number }[];

  abilities: Record<Ability, number>;
  /** Ability scores at 14+, highest first — what the build is actually leaning on. */
  keyAbilities: Ability[];

  skills: {
    /** Skill ids with at least one rank. */
    trained: string[];
    ranksSpent: number;
    faceRanks: number;
    scoutRanks: number;
    knowledgeCount: number;
  };

  combatRoles: CombatRole[];
  partyRoles: PartyRole[];
  featThemes: FeatTheme[];
  gaps: Gap[];
  strengths: Strength[];
}

// ---------------------------------------------------------------------------------------------
// Feat clusters. A theme is claimed once `min` of its feats are present, so a single loose pickup
// is not read as a build direction.

const FEAT_THEMES: { theme: FeatTheme; min: number; feats: string[] }[] = [
  { theme: 'power-attack', min: 1, feats: ['power-attack', 'cleave', 'great-cleave', 'vital-strike', 'improved-vital-strike', 'greater-vital-strike'] },
  { theme: 'archery', min: 1, feats: ['point-blank-shot', 'precise-shot', 'rapid-shot', 'manyshot', 'improved-precise-shot', 'far-shot', 'pinpoint-targeting', 'deadly-aim', 'rapid-reload'] },
  { theme: 'two-weapon', min: 1, feats: ['two-weapon-fighting', 'improved-two-weapon-fighting', 'greater-two-weapon-fighting', 'double-slice', 'two-weapon-rend', 'two-weapon-defense'] },
  { theme: 'maneuvers', min: 2, feats: ['combat-expertise', 'improved-trip', 'greater-trip', 'improved-disarm', 'greater-disarm', 'improved-grapple', 'greater-grapple', 'improved-bull-rush', 'greater-bull-rush', 'improved-sunder', 'greater-sunder', 'improved-overrun', 'greater-overrun', 'improved-feint', 'greater-feint', 'agile-maneuvers', 'awesome-blow', 'stand-still'] },
  { theme: 'critical', min: 2, feats: ['improved-critical', 'critical-focus', 'bleeding-critical', 'blinding-critical', 'deafening-critical', 'exhausting-critical', 'sickening-critical', 'staggering-critical', 'stunning-critical', 'tiring-critical', 'deadly-stroke'] },
  { theme: 'mobility', min: 2, feats: ['dodge', 'mobility', 'spring-attack', 'wind-stance', 'lightning-stance', 'nimble-moves', 'acrobatic-steps', 'fleet', 'run', 'step-up', 'whirlwind-attack'] },
  { theme: 'metamagic', min: 1, feats: ['empower-spell', 'enlarge-spell', 'extend-spell', 'heighten-spell', 'maximize-spell', 'quicken-spell', 'silent-spell', 'still-spell', 'widen-spell'] },
  { theme: 'defensive', min: 2, feats: ['toughness', 'iron-will', 'great-fortitude', 'lightning-reflexes', 'improved-iron-will', 'improved-great-fortitude', 'improved-lightning-reflexes', 'diehard', 'endurance', 'combat-casting', 'blind-fight'] },
  { theme: 'shield', min: 1, feats: ['shield-focus', 'greater-shield-focus', 'improved-shield-bash', 'shield-master', 'shield-slam'] },
  { theme: 'mounted', min: 1, feats: ['mounted-combat', 'ride-by-attack', 'spirited-charge', 'trample', 'unseat', 'mounted-archery'] },
  { theme: 'channel', min: 1, feats: ['extra-channel', 'improved-channel', 'selective-channeling', 'channel-smite', 'alignment-channel', 'elemental-channel', 'command-undead', 'turn-undead'] },
  // Two, because every wizard is handed Scribe Scroll for free and one granted feat is not an
  // investment in anything.
  { theme: 'crafting', min: 2, feats: ['brew-potion', 'craft-magic-arms-and-armor', 'craft-rod', 'craft-staff', 'craft-wand', 'craft-wondrous-item', 'forge-ring', 'scribe-scroll', 'master-craftsman'] },
  { theme: 'skill', min: 2, feats: ['skill-focus', 'acrobatic', 'alertness', 'animal-affinity', 'athletic', 'deceitful', 'deft-hands', 'magical-aptitude', 'persuasive', 'self-sufficient', 'stealthy'] },
];

const FACE_SKILLS = ['bluff', 'diplomacy', 'intimidate', 'sense-motive', 'disguise'];
const SCOUT_SKILLS = ['perception', 'stealth', 'survival'];

/** What a class's list is usually for. Consulted only as the fallback lean while the spell picks
 *  are still empty — a freshly created cleric should not be described as having no direction. */
const CLASS_DEFAULT_LEAN: Record<string, CastingLean> = {
  cleric: 'healer', oracle: 'healer', druid: 'controller', bard: 'buffer', skald: 'buffer',
  wizard: 'controller', arcanist: 'controller', witch: 'controller', sorcerer: 'blaster',
  magus: 'blaster', alchemist: 'blaster', inquisitor: 'buffer', paladin: 'buffer',
  ranger: 'utility', summoner: 'buffer', shaman: 'controller', hunter: 'buffer',
  bloodrager: 'buffer', warpriest: 'buffer', investigator: 'utility',
};

/** Pools that restore other people's hit points, so "can this party heal itself" does not have to
 *  be answered by string-matching a pool name. */
const HEALING_POOLS = new Set(['channel', 'lay-on-hands', 'fervor']);

// ---------------------------------------------------------------------------------------------

/** Classify one spell by what it is for.
 *
 *  Structure first: the engine's own `buff` / `damage` / `attacker` hooks, and the "(harmless)"
 *  marker that appears only on a save a target would decline to make — i.e. a spell cast on your
 *  own side. Descriptive prose is never read; a summary that happens to contain the word "damage"
 *  must not be able to move a spell into the wrong bucket. Spell *names* are treated as the stable
 *  identifiers they are, not as prose.
 *
 *  Where structure runs out this falls back to the school, which is a blunt proxy — so the
 *  authored table in content/spell-tactics.ts overrides it for the spells it gets wrong, and is
 *  consulted first. */
export function spellLean(sp: SpellDef): CastingLean {
  const override = SPELL_ROLE_OVERRIDES[sp.id];
  if (override) return override;
  // A labelled damage formula is not an attack: `label` is set for healing and for temporary hit
  // points, both of which land on an ally. Aid carries a buff *and* a temp-HP roll, so this has to
  // be settled before the plain damage check.
  if (sp.damage?.label) return /heal/i.test(sp.damage.label) ? 'healer' : 'buffer';
  if (/^(cure|mass cure|heal\b|breath of life|lesser restoration|restoration)/i.test(sp.name)) return 'healer';
  if (sp.buff) return 'buffer';
  if (sp.damage || sp.attacker) return 'blaster';
  if (/\(harmless\)/i.test(sp.save) || /^personal/i.test(sp.range)) return 'buffer';
  switch (sp.school) {
    case 'Evocation': return 'blaster';
    case 'Enchantment': case 'Illusion': case 'Necromancy': case 'Conjuration': return 'controller';
    case 'Abjuration': case 'Transmutation': return 'buffer';
    default: return 'utility';
  }
}

/** Distinct values ordered by how often they occur, most common first. */
function tally<T extends string>(values: T[]): T[] {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

function equippedWeapon(sheet: Sheet, where: 'main' | 'off') {
  const item = sheet.inventory.find((i) => i.equipped === where && i.kind === 'weapon');
  if (!item) return null;
  return { item, def: C.weaponById.get(item.id) };
}

function offenseStyle(sheet: Sheet, featIds: Set<string>, hasCasting: boolean): OffenseStyle {
  const main = equippedWeapon(sheet, 'main');
  const off = equippedWeapon(sheet, 'off');
  // A shield worn on the arm is filed under the off *hand* — `equipped: 'shield'` is reserved for
  // a shield put in the armour slot instead of a suit of armour. Both have to count here.
  const shield = sheet.inventory.some((i) =>
    (i.equipped === 'off' || i.equipped === 'shield') && C.armorById.get(i.id)?.slot === 'shield');
  const naturals = sheet.attacks.filter((a) => a.slot === 'natural');

  if (main?.def) {
    if (main.def.hands === 'ranged') return 'archery';
    if (off?.def) return 'two-weapon';
    if (shield) return 'sword-and-board';
    if (main.def.hands === 'two') return 'two-hander';
    // A thrown weapon is a melee weapon with a range, so it only reads as a *thrower's* build when
    // the character has invested in drawing them quickly. Otherwise it is a melee build that
    // happens to be able to throw.
    if (main.def.range && featIds.has('quick-draw') && sheet.attacks.some((a) => a.mode === 'thrown')) {
      return 'thrown';
    }
    return 'one-handed';
  }
  if (naturals.length > 0) return 'natural';
  if (featIds.has('improved-unarmed-strike')) return 'unarmed';
  if (hasCasting) return 'spell';
  return 'none';
}

function armorPosture(sheet: Sheet): ArmorPosture {
  const worn = sheet.inventory.find((i) => i.equipped === 'armor');
  const def = worn ? C.armorById.get(worn.id) : undefined;
  if (!def || def.category === 'shield') return 'unarmored';
  return def.category;
}

/** Build the fingerprint from an already-resolved character. Takes the resolution rather than the
 *  document so a screen that already has one does not pay to compute it twice. */
export function fingerprint(doc: CharacterDoc, res: Resolution): BuildFingerprint {
  const sheet = res.sheet;
  const dec = readDecisions(doc);
  const stat = (id: string) => sheet.stats[id]?.total ?? 0;
  const featIds = new Set(sheet.feats);
  const level = sheet.level;

  // --- classes ------------------------------------------------------------------------------
  const classCounts = new Map<string, { name: string; levels: number }>();
  for (const row of sheet.progression) {
    if (!row.classId) continue;
    const entry = classCounts.get(row.classId) ?? { name: row.className ?? row.classId, levels: 0 };
    entry.levels += 1;
    classCounts.set(row.classId, entry);
  }
  const classes = [...classCounts.entries()].map(([id, v]) => ({ id, name: v.name, levels: v.levels }));
  const primaryClassId = dec.classId ?? classes[0]?.id ?? '';

  // --- abilities ----------------------------------------------------------------------------
  const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const abilities = Object.fromEntries(ABILITIES.map((a) => [a, stat(`ability:${a}`)])) as Record<Ability, number>;
  const keyAbilities = ABILITIES.filter((a) => abilities[a] >= 14).sort((a, b) => abilities[b] - abilities[a]);

  // --- offense ------------------------------------------------------------------------------
  const casting0 = sheet.casting[0];
  const style = offenseStyle(sheet, featIds, !!casting0);
  const best = sheet.attacks.reduce<Sheet['attacks'][number] | null>(
    (acc, a) => (!acc || (a.bonuses[0] ?? -99) > (acc.bonuses[0] ?? -99) ? a : acc), null);
  const mainItem = equippedWeapon(sheet, 'main');
  const offItem = equippedWeapon(sheet, 'off');
  const offenseAbility: Ability | null =
    style === 'spell' || style === 'none' ? (casting0?.ability ?? null)
      : style === 'archery' ? 'dex'
        : featIds.has('weapon-finesse') && abilities.dex > abilities.str ? 'dex' : 'str';

  // --- defense ------------------------------------------------------------------------------
  const saves = { fort: stat('save:fort'), ref: stat('save:ref'), will: stat('save:will') };
  const bySave = (['fort', 'ref', 'will'] as const).slice().sort((a, b) => saves[a] - saves[b]);
  const lowest = bySave[0];
  const highest = bySave[2];
  // 4 is roughly one "good save vs poor save" step at low level; below that the spread is noise
  // rather than something a player can plan around.
  const weakSave = saves[highest] - saves[lowest] >= 4 ? lowest : null;

  // --- casting ------------------------------------------------------------------------------
  const picks = Object.values(dec.spellPicks).flat()
    .map((id) => C.spellById.get(id)).filter((s): s is SpellDef => !!s);
  // A spell that reaches past arm's length is a way to act on something you cannot walk to, whether
  // or not it does damage — a Web at the far end of a room is an answer, and calling that "no
  // ranged option" would be plainly wrong to anyone reading it.
  const hasRangedSpell = casting0 !== undefined && picks.some((sp) => !/^(personal|touch)/i.test(sp.range));

  let casting: CastingShape | null = null;
  if (casting0) {
    const leans = tally(picks.map(spellLean));
    const slots = casting0.slots ?? [];
    let top = 0;
    for (let i = slots.length - 1; i >= 0; i--) {
      if ((slots[i] ?? 0) > 0) { top = i; break; }
    }
    casting = {
      classId: casting0.classId,
      className: casting0.className,
      kind: casting0.kind,
      ability: casting0.ability,
      list: casting0.list,
      casterLevel: casting0.casterLevel,
      topSpellLevel: top,
      dcBase: casting0.dcBase,
      lean: leans[0] ?? CLASS_DEFAULT_LEAN[casting0.classId] ?? 'utility',
      leanMix: leans,
      focusSchools: sheet.spellFocus.map((f) => f.school),
      pickCount: picks.length,
    };
  }

  // --- resources ----------------------------------------------------------------------------
  const resources: ResourceRhythm[] = sheet.pools.map((p) => ({
    id: p.id,
    name: p.name,
    max: p.max,
    unit: p.unit,
    pacing: p.unit === 'rounds' ? 'duration' : 'discrete',
  }));

  // --- skills -------------------------------------------------------------------------------
  const trained = Object.entries(dec.skillRanks).filter(([, n]) => n > 0).map(([id]) => id);
  const trainedSet = new Set(trained);
  const ranksIn = (ids: string[]) => ids.reduce((n, id) => n + (dec.skillRanks[id] ?? 0), 0);
  const skills = {
    trained,
    ranksSpent: sheet.skillRanksSpent,
    faceRanks: ranksIn(FACE_SKILLS),
    scoutRanks: ranksIn(SCOUT_SKILLS),
    knowledgeCount: trained.filter((id) => id.startsWith('know-')).length,
  };

  // --- feat themes --------------------------------------------------------------------------
  const featThemes = FEAT_THEMES
    .filter((t) => t.feats.filter((f) => featIds.has(f)).length >= t.min)
    .map((t) => t.theme);

  // --- roles --------------------------------------------------------------------------------
  const bab = stat('bab');
  const posture = armorPosture(sheet);
  const hasRanged = sheet.attacks.some((a) => a.kind === 'ranged');
  const hasMelee = sheet.attacks.some((a) => a.kind === 'melee');
  const heals = (casting?.leanMix.includes('healer') ?? false)
    || resources.some((r) => HEALING_POOLS.has(r.id));

  const combatRoles: CombatRole[] = [];
  if (bab >= level && (posture === 'heavy' || posture === 'medium')) combatRoles.push('frontline');
  if (style === 'two-weapon' || style === 'unarmed' || featThemes.includes('mobility')) combatRoles.push('skirmisher');
  if (style === 'archery' || style === 'thrown' || casting?.lean === 'blaster') combatRoles.push('artillery');
  if (casting?.lean === 'controller') combatRoles.push('controller');
  if (casting?.lean === 'buffer' || heals) combatRoles.push('support');
  if (sheet.companions.length > 0) combatRoles.push('commander');
  // Never leave this empty: a build with no distinguishing marks still stands somewhere, and the
  // renderer would otherwise have nothing at all to say about the most common case of all.
  if (combatRoles.length === 0) combatRoles.push(bab >= level ? 'frontline' : 'skirmisher');

  const partyRoles: PartyRole[] = [];
  // Keeping pace with your own level is the bar for "this is my job" — a single rank in Diplomacy
  // at level 9 is not a face.
  if (skills.faceRanks >= level) partyRoles.push('face');
  if (skills.scoutRanks >= level) partyRoles.push('scout');
  if (skills.knowledgeCount >= 3) partyRoles.push('lore');
  if (trainedSet.has('disable-device')) partyRoles.push('trapfinder');
  if (heals) partyRoles.push('healer');

  // --- gaps ---------------------------------------------------------------------------------
  const gaps: Gap[] = [];
  if (weakSave) gaps.push(`weak-${weakSave}` as Gap);
  if (!hasRanged && !hasRangedSpell) gaps.push('no-ranged-option');
  if (!hasMelee && hasRanged) gaps.push('no-melee-option');
  if (!heals) gaps.push('no-healing');
  if (!trainedSet.has('disable-device')) gaps.push('no-trapfinder');
  if (trained.length <= 3) gaps.push('thin-skills');
  // A build leaning on four or more abilities cannot afford to be good at any of them.
  if (keyAbilities.length >= 4) gaps.push('ability-hungry');

  // --- strengths ----------------------------------------------------------------------------
  const strengths: Strength[] = [];
  if (bab >= level) strengths.push('full-bab');
  // A full caster's top slot is half its level rounded up; anything less is a partial caster.
  if (casting && casting.topSpellLevel >= Math.ceil(level / 2)) strengths.push('top-tier-slots');
  if (casting && casting.dcBase >= 14) strengths.push('high-save-dc');
  if (sheet.companions.length > 0) strengths.push('action-economy');
  if (trained.length >= 8) strengths.push('skill-monkey');
  if (posture === 'heavy' || stat('hp:max') >= level * 9) strengths.push('durable');
  if (sheet.speed.base >= 40 || sheet.speed.fly) strengths.push('mobile');
  if (sheet.senses.length > 0) strengths.push('keen-senses');
  if (heals) strengths.push('self-sufficient');
  if (sheet.defenses.dr.length > 0 || sheet.defenses.resistances.length > 0) strengths.push('resistant');

  return {
    level,
    classes,
    primaryClassId,
    archetypeId: dec.archetype,
    summaryLine: sheet.summaryLine,
    offense: {
      style,
      ability: offenseAbility,
      bestAttack: best?.bonuses[0] ?? 0,
      iteratives: best?.bonuses.length ?? 0,
      hasRanged,
      hasMelee,
      mainHand: mainItem?.item.name ?? null,
      offHand: offItem?.item.name ?? null,
    },
    defense: {
      posture,
      ac: stat('ac'),
      touch: stat('ac:touch'),
      flatFooted: stat('ac:ff'),
      hp: stat('hp:max'),
      saves,
      weakSave,
      hasDr: sheet.defenses.dr.length > 0,
      hasResistances: sheet.defenses.resistances.length > 0,
    },
    casting,
    resources,
    companions: sheet.companions.map((c) => ({
      kind: c.kind, name: c.name, label: c.label, attackCount: c.attacks.length,
    })),
    abilities,
    keyAbilities,
    skills,
    combatRoles,
    partyRoles,
    featThemes,
    gaps,
    strengths,
  };
}
