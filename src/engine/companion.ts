// Companion creatures: turning a creature entry plus an advancement table into a stat block.
//
// A companion is a second creature the character owns, and the rules build it the way they build
// any monster — hit dice, size, natural armour, natural attacks — rather than the way they build a
// character. So this is a small pipeline of its own rather than a branch inside `resolve`, and it
// deliberately reuses the natural-attack helpers in combat.ts instead of restating them.
//
// The three kinds diverge in what drives them:
//   animal   — its own hit dice and saves, off Table: Animal Companion Base Statistics
//   eidolon  — the same shape, but good/poor saves come from the base form and it advances by
//              spending an evolution pool
//   familiar — almost nothing of its own: hit points, base attack and base saves are the master's

import * as C from '../content';
import type { Ability, CompanionAttackLine, CompanionBlock, Sheet } from './types';
import { abilityMod, ABILITIES } from './types';
import {
  naturalAttackDieUp, naturalAttackPenalty, naturalPowerAttackScale, strengthDamage, type NaturalAttackContext,
} from './combat';

/** What a familiar needs to know about the character it is bonded to. Animals and eidolons ignore
 *  all of it — they are self-contained — but the familiar rules derive most of its block from the
 *  master, so it has to come in from the outside. */
export interface CompanionContext {
  /** The master's maximum hit points; a familiar has half, rounded down. */
  masterHp: number;
  /** The master's base attack bonus from all classes. */
  masterBab: number;
  /** The master's *base* save bonuses from all classes, before ability modifiers. */
  masterSaves: { fort: number; ref: number; will: number };
}

const clampLevel = (level: number): number => Math.min(20, Math.max(1, level));

/** Cumulative special abilities: the tables print what is *gained* at each level, so reaching a
 *  level means holding everything listed at or below it. */
function specialsUpTo(rows: { special: string[] }[], level: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < clampLevel(level); i++) for (const s of rows[i].special) if (!out.includes(s)) out.push(s);
  return out;
}

const ABILITY_INCREASE = 'Ability score increase';

/** Format an attack line's name with its count ("2 claws", "bite"). Only the regular plurals the
 *  companion catalogue actually uses are handled — every name in it takes a bare -s. */
const attackName = (name: string, count: number): string => (count === 1 ? name : `${count} ${name}s`);

/** Build the attack lines for a companion. `sole` — whether the creature has exactly one natural
 *  attack, which earns 1½× Strength — is a property of the whole set, so the lines are built
 *  together rather than one at a time. */
function buildAttacks(
  attacks: C.CompanionAttackDef[], bab: number, attackMod: number, strMod: number,
  sizeAcMod: number, hasMultiattack: boolean,
): CompanionAttackLine[] {
  const total = attacks.reduce((n, a) => n + a.count, 0);
  return attacks.map((a) => {
    const ctx: NaturalAttackContext = {
      primary: !a.secondary, sole: total === 1, withWeapon: false, hasMultiattack,
    };
    const bonus = bab + attackMod + sizeAcMod + naturalAttackPenalty(ctx);
    const scale = naturalPowerAttackScale(ctx);
    const dmgMod = strengthDamage(strMod, scale);
    const damage = dmgMod === 0 ? a.damage : `${a.damage}${dmgMod > 0 ? '+' : '−'}${Math.abs(dmgMod)}`;
    const notes: string[] = [];
    if (a.note) notes.push(a.note);
    if (a.secondary) notes.push('secondary');
    if (ctx.sole && !a.secondary) notes.push('1½× Str (sole natural attack)');
    return { name: attackName(a.name, a.count), bonus, damage, notes };
  });
}

/** Hit points for a creature with its own hit dice: the Bestiary convention of the die's average
 *  over the whole total (floored once), plus Constitution per die, never below 1. */
function creatureHp(hd: number, hitDie: number, conMod: number): number {
  const avg = C.COMPANION_HD_AVERAGE[hitDie] ?? hitDie / 2 + 0.5;
  return Math.max(1, Math.floor(hd * avg) + conMod * hd);
}

function speedOf(s: C.CompanionSpeedDef): Sheet['speed'] {
  return { base: s.base, ...(s.fly ? { fly: s.fly } : {}), ...(s.climb ? { climb: s.climb } : {}), ...(s.swim ? { swim: s.swim } : {}), ...(s.burrow ? { burrow: s.burrow } : {}) };
}

/** Shared tail of the derivation: everything that follows once abilities, natural armour, hit
 *  dice and base attack are settled, regardless of which table produced them. */
function assemble(args: {
  slotId: string; kind: CompanionBlock['kind']; label: string; name: string; className: string;
  level: number; hd: number; hitDie?: number; size: C.CreatureSize; naturalArmor: number;
  abilities: Record<Ability, number>; hp: number; bab: number;
  saves: { fort: number; ref: number; will: number };
  attacks: C.CompanionAttackDef[]; attackAbility: 'str' | 'best';
  speed: C.CompanionSpeedDef; skillRanks: number; feats: number; special: string[];
  senses: string[]; notes: string[]; hasMultiattack: boolean;
}): CompanionBlock {
  const mods = Object.fromEntries(ABILITIES.map((a) => [a, abilityMod(args.abilities[a])])) as Record<Ability, number>;
  const size = C.SIZE_MODIFIERS[args.size];
  const ac = 10 + size.ac + mods.dex + args.naturalArmor;
  const attackMod = args.attackAbility === 'best' ? Math.max(mods.str, mods.dex) : mods.str;
  return {
    slotId: args.slotId, kind: args.kind, label: args.label, name: args.name, className: args.className,
    level: args.level, hd: args.hd, hitDie: args.hitDie, size: C.SIZE_LABEL[args.size],
    abilities: args.abilities, mods,
    hp: args.hp,
    ac, touch: 10 + size.ac + mods.dex, flatFooted: ac - Math.max(0, mods.dex),
    naturalArmor: args.naturalArmor,
    fort: args.saves.fort + mods.con, ref: args.saves.ref + mods.dex, will: args.saves.will + mods.wis,
    bab: args.bab,
    cmb: args.bab + mods.str + size.cmb,
    cmd: 10 + args.bab + mods.str + mods.dex + size.cmb,
    speed: speedOf(args.speed),
    attacks: buildAttacks(args.attacks, args.bab, attackMod, mods.str, size.ac, args.hasMultiattack),
    skillRanks: args.skillRanks, feats: args.feats,
    // The eidolon table lists "Darkvision" as a special while the base form already states the
    // range as a sense. Drop the bare table entry rather than print the same thing twice.
    special: args.special.filter((s) => !args.senses.some((n) => n.toLowerCase().startsWith(s.toLowerCase()))),
    senses: args.senses,
    pendingAbilityIncreases: 0,
    notes: args.notes,
  };
}

/** An animal companion: its own hit dice and saves, off Table: Animal Companion Base Statistics,
 *  with the creature's printed 4th- or 7th-level advancement applied once it is reached. */
function resolveAnimal(
  def: C.CompanionDef, slotId: string, label: string, className: string, level: number,
): CompanionBlock {
  const lvl = clampLevel(level);
  const row = C.ANIMAL_COMPANION_TABLE[lvl - 1];
  const adv = def.advance && lvl >= def.advance.level ? def.advance : undefined;

  const abilities = { ...def.start.abilities };
  for (const a of ABILITIES) abilities[a] += adv?.abilityAdj?.[a] ?? 0;
  // The table's Str/Dex column raises both scores; it is not a bonus to a roll, so it lands here.
  abilities.str += row.strDex;
  abilities.dex += row.strDex;

  const specials = specialsUpTo(C.ANIMAL_COMPANION_TABLE, lvl);
  const increases = C.ANIMAL_COMPANION_TABLE.slice(0, lvl).filter((r) => r.special.includes(ABILITY_INCREASE)).length;

  const notes: string[] = [];
  if (def.advance && lvl < def.advance.level)
    notes.push(`Advances at effective level ${def.advance.level}.`);
  notes.push('Instead of the listed 4th/7th-level benefit you may take +2 Dexterity and +2 Constitution.');

  const block = assemble({
    slotId, kind: 'animal', label, name: def.name, className, level: lvl,
    hd: row.hd, hitDie: 8, size: adv?.size ?? def.start.size,
    naturalArmor: def.start.naturalArmor + (adv?.naturalArmor ?? 0) + row.naturalArmor,
    abilities,
    hp: creatureHp(row.hd, 8, abilityMod(abilities.con)),
    bab: row.bab, saves: { fort: row.fort, ref: row.ref, will: row.will },
    attacks: adv?.attacks ?? def.start.attacks, attackAbility: 'str',
    speed: def.start.speed, skillRanks: row.skills, feats: row.feats,
    special: [
      ...specials.filter((s) => s !== ABILITY_INCREASE),
      ...(def.start.specialAttacks ?? []), ...(def.start.specialQualities ?? []),
      ...(adv?.specialAttacks ?? []), ...(adv?.specialQualities ?? []),
    ],
    senses: def.start.senses ?? [], notes,
    hasMultiattack: specials.includes('Multiattack'),
  });
  return { ...block, tricks: row.tricks, pendingAbilityIncreases: increases };
}

/** What the bought evolutions add up to. The base form's *free* evolutions are already printed in
 *  its starting statistics — a biped's two claws are the claws evolution — so they are never
 *  applied again here; only what the summoner paid points for. */
interface EvolutionTotals {
  attacks: C.CompanionAttackDef[];
  abilities: Partial<Record<Ability, number>>;
  naturalArmor: number;
  size?: C.CreatureSize;
  speed: C.CompanionSpeedDef;
  senses: string[];
  special: string[];
  /** Evolutions whose effect needs a choice this model doesn't carry, named so the card can say
   *  the block leaves them out rather than implying they're included. */
  manual: string[];
}

function evolutionTotals(taken: string[], base: C.CompanionSpeedDef): EvolutionTotals {
  const out: EvolutionTotals = {
    attacks: [], abilities: {}, naturalArmor: 0, speed: { ...base }, senses: [], special: [], manual: [],
  };
  // Deferred until the base land speed is final, because "equal to base speed" has to mean the
  // speed *after* every extra pair of legs has raised it.
  const derived: { climb?: 'base' | number; swim?: 'base' | number; fly?: number; burrow?: 'half' | number }[] = [];

  for (const id of taken) {
    const evo = C.EIDOLON_EVOLUTIONS.find((e) => e.id === id);
    const ap = evo?.apply;
    if (!evo || !ap) continue;
    if (ap.manual) { out.manual.push(evo.name); continue; }
    out.attacks.push(...(ap.attacks ?? []));
    for (const [ab, v] of Object.entries(ap.abilities ?? {})) out.abilities[ab as Ability] = (out.abilities[ab as Ability] ?? 0) + v;
    out.naturalArmor += ap.naturalArmor ?? 0;
    if (ap.size) out.size = ap.size;
    for (const s of ap.senses ?? []) if (!out.senses.includes(s)) out.senses.push(s);
    for (const s of ap.special ?? []) if (!out.special.includes(s)) out.special.push(s);
    if (ap.speed) {
      out.speed.base += ap.speed.baseBonus ?? 0;
      if (ap.speed.climb || ap.speed.swim || ap.speed.fly || ap.speed.burrow) derived.push(ap.speed);
    }
  }

  for (const s of derived) {
    if (s.climb) out.speed.climb = Math.max(out.speed.climb ?? 0, s.climb === 'base' ? out.speed.base : s.climb);
    if (s.swim) out.speed.swim = Math.max(out.speed.swim ?? 0, s.swim === 'base' ? out.speed.base : s.swim);
    if (s.fly) out.speed.fly = Math.max(out.speed.fly ?? 0, s.fly);
    if (s.burrow) out.speed.burrow = Math.max(out.speed.burrow ?? 0, s.burrow === 'half' ? Math.floor(out.speed.base / 2) : s.burrow);
  }
  return out;
}

/** An eidolon: the same derivation as an animal companion, but its good saves come from the base
 *  form rather than the table, its hit dice are an outsider's d10, and it advances by spending an
 *  evolution pool — so the bought evolutions are folded in before anything is computed. */
function resolveEidolon(
  def: C.CompanionDef, slotId: string, label: string, className: string, level: number,
  taken: string[],
): CompanionBlock {
  const lvl = clampLevel(level);
  const row = C.EIDOLON_TABLE[lvl - 1];
  const good = new Set(def.goodSaves ?? []);
  const evo = evolutionTotals(taken, def.start.speed);

  const abilities = { ...def.start.abilities };
  for (const ab of ABILITIES) abilities[ab] += evo.abilities[ab] ?? 0;
  abilities.str += row.strDex;
  abilities.dex += row.strDex;

  const specials = specialsUpTo(C.EIDOLON_TABLE, lvl);
  const increases = C.EIDOLON_TABLE.slice(0, lvl).filter((r) => r.special.includes(ABILITY_INCREASE)).length;

  const spent = taken.reduce((n, id) => n + (C.EIDOLON_EVOLUTIONS.find((e) => e.id === id)?.cost ?? 0), 0);

  // Every natural attack an eidolon has comes from an evolution, and each evolution prints its own
  // Large damage — so growing to Large steps the whole set up, base form included.
  const size = evo.size ?? def.start.size;
  const grown = size === 'large' && def.start.size !== 'large';
  const scale = (a: C.CompanionAttackDef) => (grown ? { ...a, damage: naturalAttackDieUp(a.damage) } : a);
  const attacks = [...def.start.attacks, ...evo.attacks].map(scale);
  const attackCount = attacks.reduce((n, a) => n + a.count, 0);

  const notes = ['Free evolutions from the base form cost no points, and are already in these numbers.'];
  if (evo.manual.length)
    notes.push(`Not folded into the numbers (each needs a choice this sheet doesn't carry): ${evo.manual.join(', ')}.`);
  if (attackCount > row.maxAttacks)
    notes.push(`Over the ${row.maxAttacks}-attack limit for this level.`);
  if (grown && def.id === 'biped') notes.push('A Large biped also gains 10-foot reach.');

  const block = assemble({
    slotId, kind: 'eidolon', label, name: def.name, className, level: lvl,
    hd: row.hd, hitDie: 10, size,
    naturalArmor: def.start.naturalArmor + row.armor + evo.naturalArmor,
    abilities,
    hp: creatureHp(row.hd, 10, abilityMod(abilities.con)),
    bab: row.bab,
    saves: {
      fort: good.has('fort') ? row.goodSave : row.poorSave,
      ref: good.has('ref') ? row.goodSave : row.poorSave,
      will: good.has('will') ? row.goodSave : row.poorSave,
    },
    attacks, attackAbility: 'str',
    speed: evo.speed, skillRanks: row.skills, feats: row.feats,
    special: [...specials.filter((s) => s !== ABILITY_INCREASE), ...(def.start.specialQualities ?? []), ...evo.special],
    senses: [...(def.start.senses ?? []), ...evo.senses], notes,
    hasMultiattack: specials.includes('Multiattack'),
  });
  return {
    ...block,
    pendingAbilityIncreases: increases,
    evolutions: {
      budget: row.pool, spent, maxAttacks: row.maxAttacks, attackCount,
      free: def.freeEvolutions ?? [], taken,
    },
  };
}

/** A familiar: hit points are half the master's, base attack is the master's, and each base save
 *  is the better of the master's and the familiar's own (Fort +2, Ref +2, Will +0). Its own
 *  ability modifiers still apply on top, and its attack uses the better of Strength and Dexterity. */
function resolveFamiliar(
  def: C.CompanionDef, slotId: string, label: string, className: string, level: number,
  ctx: CompanionContext,
): CompanionBlock {
  const lvl = clampLevel(level);
  const row = C.FAMILIAR_TABLE[lvl - 1];

  const abilities = { ...def.start.abilities, int: row.int };
  const specials = specialsUpTo(C.FAMILIAR_TABLE, lvl);

  // The familiar's own base saves, as the Familiar Basics rules print them for a 1-HD animal.
  const own = { fort: 2, ref: 2, will: 0 };

  const block = assemble({
    slotId, kind: 'familiar', label, name: def.name, className, level: lvl,
    hd: Math.max(1, lvl), size: def.start.size,
    naturalArmor: def.start.naturalArmor + row.naturalArmor,
    abilities,
    hp: Math.max(1, Math.floor(ctx.masterHp / 2)),
    bab: ctx.masterBab,
    saves: {
      fort: Math.max(own.fort, ctx.masterSaves.fort),
      ref: Math.max(own.ref, ctx.masterSaves.ref),
      will: Math.max(own.will, ctx.masterSaves.will),
    },
    attacks: def.start.attacks, attackAbility: 'best',
    speed: def.start.speed,
    // A familiar has no ranks of its own: it uses the better of its animal's skills and its
    // master's ranks, which is a per-skill comparison the sheet leaves to the player.
    skillRanks: 0, feats: 0,
    special: specials,
    senses: def.start.senses ?? [],
    notes: [
      'Hit points are half the master\'s, recomputed whenever the master\'s change.',
      'For each skill, use the better of the animal\'s own ranks and the master\'s, with the familiar\'s ability modifiers.',
      ...(def.masterBenefit ? [def.masterBenefit] : []),
    ],
    hasMultiattack: false,
  });
  return { ...block, intelligence: row.int };
}

/** Resolve one companion creature to a stat block. `level` is the *effective* companion level the
 *  granting class arrived at (a ranger's is his level − 3), not the character level. */
export function resolveCompanion(args: {
  def: C.CompanionDef;
  slotId: string;
  label: string;
  className: string;
  level: number;
  /** Eidolons: the evolution ids bought so far. */
  evolutions?: string[];
  /** Familiars: what their master brings. */
  context?: CompanionContext;
}): CompanionBlock {
  const { def, slotId, label, className, level } = args;
  switch (def.kind) {
    case 'eidolon':
      return resolveEidolon(def, slotId, label, className, level, args.evolutions ?? []);
    case 'familiar':
      return resolveFamiliar(def, slotId, label, className, level,
        args.context ?? { masterHp: 0, masterBab: 0, masterSaves: { fort: 0, ref: 0, will: 0 } });
    default:
      return resolveAnimal(def, slotId, label, className, level);
  }
}
