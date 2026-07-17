import * as C from '../content/index';
import type {
  Ability, Alignment, CharacterDoc, ChoiceSlot, Effect, Issue, Resolution,
  Sheet, SlotOption, Stat,
} from './types';
import { ABILITIES, abilityMod } from './types';
import { evalPredicate, explainFailure, type PredicateCtx } from './predicates';
import { stack, type Contribution } from './stack';

const POINT_BUY_COST: Record<number, number> = {
  7: -4, 8: -2, 9: -1, 10: 0, 11: 1, 12: 2, 13: 3, 14: 5, 15: 7, 16: 10, 17: 13, 18: 17,
};
const POINT_BUY_TOTAL: Record<string, number> = { pb15: 15, pb20: 20, pb25: 25 };

const babAt1 = (p: 'full' | 'threequarter' | 'half'): number => (p === 'full' ? 1 : 0);
const saveBase1 = (good: boolean): number => (good ? 2 : 0);

/** A friendly display name for any content id (for whyNot messages). */
function displayName(id: string): string {
  return (
    C.featById.get(id)?.name ??
    C.raceById.get(id)?.name ??
    C.classById.get(id)?.name ??
    C.skillById.get(id)?.name ??
    id
  );
}

interface Decisions {
  raceId: string | null;
  altTraits: string[];
  abilityBase: Record<Ability, number>;
  floatingBonus: Ability[]; // human/half-elf/half-orc +2 targets
  alignment: Alignment | null;
  deityId: string | null;
  classId: string | null;
  favoredClass: string | null;
  fcbChoice: 'hp' | 'skill' | null;
  classChoices: Record<string, string[]>; // slotSuffix -> selected ids
  feats: Record<string, string | null>; // slotKey -> featId
  traits: string[];
  drawback: string | null;
  skillRanks: Record<string, number>;
  languages: string[];
  spellPicks: string[];
}

function readDecisions(doc: CharacterDoc): Decisions {
  const d = doc.decisions;
  const get = <T,>(k: string, fallback: T): T => (d[k] === undefined ? fallback : (d[k] as T));
  const base = get<Record<Ability, number>>('ability-base', { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
  return {
    raceId: get<string | null>('race', null),
    altTraits: get<string[]>('alt-traits', []),
    abilityBase: base,
    floatingBonus: get<Ability[]>('floating-bonus', []),
    alignment: get<Alignment | null>('alignment', null),
    deityId: get<string | null>('deity', null),
    classId: get<string | null>('class', null),
    favoredClass: get<string | null>('favored-class', null),
    fcbChoice: get<'hp' | 'skill' | null>('fcb', null),
    classChoices: get<Record<string, string[]>>('class-choices', {}),
    feats: get<Record<string, string | null>>('feats', {}),
    traits: get<string[]>('traits', []),
    drawback: get<string | null>('drawback', null),
    skillRanks: get<Record<string, number>>('skill-ranks', {}),
    languages: get<string[]>('languages', []),
    spellPicks: get<string[]>('spell-picks', []),
  };
}

/** Standard traits still active after alternate-trait replacements. */
function activeRacialTraits(dec: Decisions): { standard: C.RacialTraitDef[]; alternates: C.AltTraitDef[] } {
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  if (!race) return { standard: [], alternates: [] };
  const chosenAlts = race.altTraits.filter((a) => dec.altTraits.includes(a.id));
  const replaced = new Set<string>(chosenAlts.flatMap((a) => a.replaces));
  const standard = race.traits.filter((t) => !replaced.has(t.id));
  return { standard, alternates: chosenAlts };
}

function finalAbilities(dec: Decisions): Record<Ability, number> {
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  const out = { ...dec.abilityBase };
  if (race) {
    if (race.abilityMods === 'choice') {
      for (const ab of dec.floatingBonus) out[ab] += 2;
    } else {
      for (const ab of ABILITIES) out[ab] += race.abilityMods[ab] ?? 0;
    }
  }
  return out;
}

/** Feat ids sitting in a currently-valid slot. Orphaned feats (slot removed by an
 *  upstream choice) are suspended — they persist as decisions + Issues but contribute
 *  nothing to the sheet until the user resolves them. */
function validFeatIds(dec: Decisions): string[] {
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  const klass = dec.classId ? C.classById.get(dec.classId) : undefined;
  const keys = new Set(featSlots(dec, race, klass).map((s) => s.key));
  return Object.entries(dec.feats)
    .filter(([k, v]) => v && keys.has(k))
    .map(([, v]) => v as string);
}

function collectEffects(dec: Decisions, doc: CharacterDoc): Effect[] {
  const effects: Effect[] = [];
  const { standard, alternates } = activeRacialTraits(dec);
  for (const t of [...standard, ...alternates]) if (t.effects) effects.push(...t.effects);

  // Feats (orphaned feats suspended — see validFeatIds)
  for (const fid of validFeatIds(dec)) {
    const f = C.featById.get(fid);
    if (f?.effects) effects.push(...f.effects);
  }
  // Traits + drawback
  for (const tid of [...dec.traits, dec.drawback].filter(Boolean) as string[]) {
    const t = C.traitById.get(tid);
    if (t?.effects) effects.push(...t.effects);
  }
  // Equipped armor / shield
  const armor = doc.equipped.armor ? C.armorById.get(doc.equipped.armor) : null;
  const shield = doc.equipped.offHand ? C.armorById.get(doc.equipped.offHand) : null;
  if (armor) effects.push({ target: 'ac', type: 'armor', value: armor.acBonus, note: `${armor.name} (armor)` });
  if (shield && shield.slot === 'shield') effects.push({ target: 'ac', type: 'shield', value: shield.acBonus, note: `${shield.name} (shield)` });
  return effects;
}

/** Total armor check penalty from equipped armor + shield. */
function armorCheckPenalty(doc: CharacterDoc): { total: number; sources: string[] } {
  let total = 0;
  const sources: string[] = [];
  for (const slot of [doc.equipped.armor, doc.equipped.offHand]) {
    const a = slot ? C.armorById.get(slot) : null;
    if (a && a.acp < 0) { total += a.acp; sources.push(a.name); }
  }
  return { total, sources };
}

function maxDexBonus(doc: CharacterDoc): number | null {
  const a = doc.equipped.armor ? C.armorById.get(doc.equipped.armor) : null;
  return a && a.maxDex !== null ? a.maxDex : null;
}

function makeStat(id: string, label: string, contribs: Contribution[], annotations: string[] = []): Stat {
  const { total, lines } = stack(contribs);
  return { id, label, total, lines, annotations };
}

export function resolve(doc: CharacterDoc): Resolution {
  const dec = readDecisions(doc);
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  const klass = dec.classId ? C.classById.get(dec.classId) : undefined;
  const abilities = finalAbilities(dec);
  const mods: Record<Ability, number> = Object.fromEntries(
    ABILITIES.map((a) => [a, abilityMod(abilities[a])]),
  ) as Record<Ability, number>;
  const { standard, alternates } = activeRacialTraits(dec);
  const effects = collectEffects(dec, doc);
  const size = race?.size ?? 'medium';
  const sizeAcAtk = size === 'small' ? 1 : 0;

  // Effects grouped by target for stat assembly.
  const byTarget = new Map<string, Effect[]>();
  for (const e of effects) {
    const arr = byTarget.get(e.target) ?? [];
    arr.push(e);
    byTarget.set(e.target, arr);
  }
  const conds = (target: string): string[] =>
    (byTarget.get(target) ?? []).filter((e) => e.condition).map((e) => `${e.note.replace(/\s*\(.*\)$/, '')}: ${fmtSigned(e.value)} ${e.condition}`);
  const unconds = (target: string): Contribution[] =>
    (byTarget.get(target) ?? []).filter((e) => !e.condition).map((e) => ({ type: e.type, value: e.value, note: e.note }));

  const featIds = validFeatIds(dec);
  const predCtx: PredicateCtx = {
    abilities, bab: klass ? babAt1(klass.bab) : 0, featIds,
    raceId: dec.raceId, classId: dec.classId, alignment: dec.alignment,
    casterLevel: klass?.spellcasting ? 1 : 0, skillRanks: dec.skillRanks,
  };

  // ---- Stats ----
  const stats: Record<string, Stat> = {};
  const bab = klass ? babAt1(klass.bab) : 0;

  for (const ab of ABILITIES) {
    stats[`ability:${ab}`] = makeStat(`ability:${ab}`, ab.toUpperCase(), [
      { type: 'base', value: dec.abilityBase[ab], note: 'Base' },
      ...(race && race.abilityMods !== 'choice' && race.abilityMods[ab]
        ? [{ type: 'racial' as const, value: race.abilityMods[ab]!, note: `${race.name} racial` }]
        : []),
      ...(race && race.abilityMods === 'choice' && dec.floatingBonus.includes(ab)
        ? [{ type: 'racial' as const, value: 2, note: `${race.name} +2` }]
        : []),
    ]);
  }

  // HP: max hit die + Con mod + FCB(hp) + effects (Toughness)
  const hpContribs: Contribution[] = [];
  if (klass) hpContribs.push({ type: 'base', value: klass.hitDie, note: `Max hit die (${klass.name})` });
  hpContribs.push({ type: 'base', value: mods.con, note: 'Con modifier' });
  if (dec.favoredClass && dec.favoredClass === dec.classId && dec.fcbChoice === 'hp')
    hpContribs.push({ type: 'base', value: 1, note: 'Favored class bonus' });
  hpContribs.push(...unconds('hp:max'));
  stats['hp:max'] = makeStat('hp:max', 'Hit Points', hpContribs);

  // AC
  const dexToAc = (() => {
    const cap = maxDexBonus(doc);
    return cap === null ? mods.dex : Math.min(mods.dex, cap);
  })();
  const acContribs: Contribution[] = [
    { type: 'base', value: 10, note: 'Base' },
    ...unconds('ac'),
    { type: 'base', value: dexToAc, note: 'Dex modifier' + (dexToAc !== mods.dex ? ' (capped by armor)' : '') },
    { type: 'size', value: sizeAcAtk, note: 'Size' },
  ];
  stats['ac'] = makeStat('ac', 'Armor Class', acContribs, conds('ac'));
  // Touch = no armor/shield/natural
  stats['ac:touch'] = makeStat('ac:touch', 'Touch AC', [
    { type: 'base', value: 10, note: 'Base' },
    { type: 'base', value: dexToAc, note: 'Dex modifier' },
    { type: 'size', value: sizeAcAtk, note: 'Size' },
    ...unconds('ac').filter((c) => c.type === 'dodge' || c.type === 'deflection'),
  ]);
  // Flat-footed = no Dex, no dodge
  stats['ac:ff'] = makeStat('ac:ff', 'Flat-footed AC', [
    { type: 'base', value: 10, note: 'Base' },
    ...unconds('ac').filter((c) => c.type !== 'dodge'),
    { type: 'size', value: sizeAcAtk, note: 'Size' },
  ]);

  // Saves
  const saveAbility: Record<'fort' | 'ref' | 'will', Ability> = { fort: 'con', ref: 'dex', will: 'wis' };
  for (const sv of ['fort', 'ref', 'will'] as const) {
    const good = klass?.goodSaves.includes(sv) ?? false;
    const contribs: Contribution[] = [
      { type: 'base', value: saveBase1(good), note: `${klass?.name ?? 'Class'} base (${good ? 'good' : 'poor'})` },
      { type: 'base', value: mods[saveAbility[sv]], note: `${saveAbility[sv].toUpperCase()} modifier` },
      ...unconds(`save:${sv}`),
      ...unconds('save:all'),
    ];
    const annotations = [...conds(`save:${sv}`), ...conds('save:all')];
    stats[`save:${sv}`] = makeStat(`save:${sv}`, sv === 'fort' ? 'Fortitude' : sv === 'ref' ? 'Reflex' : 'Will', contribs, annotations);
  }

  // BAB, initiative, CMB, CMD
  stats['bab'] = makeStat('bab', 'Base Attack Bonus', [{ type: 'base', value: bab, note: `${klass?.name ?? 'Class'} level 1` }]);
  stats['init'] = makeStat('init', 'Initiative', [
    { type: 'base', value: mods.dex, note: 'Dex modifier' },
    ...unconds('init'),
  ]);
  const cmbSize = size === 'small' ? -1 : 0;
  stats['cmb'] = makeStat('cmb', 'CMB', [
    { type: 'base', value: bab, note: 'BAB' },
    { type: 'base', value: mods.str, note: 'Str modifier' },
    { type: 'size', value: cmbSize, note: 'Size' },
    ...unconds('cmb'),
  ]);
  stats['cmd'] = makeStat('cmd', 'CMD', [
    { type: 'base', value: 10, note: 'Base' },
    { type: 'base', value: bab, note: 'BAB' },
    { type: 'base', value: mods.str, note: 'Str modifier' },
    { type: 'base', value: mods.dex, note: 'Dex modifier' },
    { type: 'size', value: cmbSize, note: 'Size' },
    ...unconds('cmd'),
  ], conds('cmd'));

  // Melee / ranged attack
  stats['attack:melee'] = makeStat('attack:melee', 'Melee attack', [
    { type: 'base', value: bab, note: 'BAB' },
    { type: 'base', value: mods.str, note: 'Str modifier' },
    { type: 'size', value: sizeAcAtk, note: 'Size' },
    ...unconds('attack:melee'),
  ], conds('attack:melee'));
  stats['attack:ranged'] = makeStat('attack:ranged', 'Ranged attack', [
    { type: 'base', value: bab, note: 'BAB' },
    { type: 'base', value: mods.dex, note: 'Dex modifier' },
    { type: 'size', value: sizeAcAtk, note: 'Size' },
    ...unconds('attack:ranged'),
  ]);

  // ---- Skills ----
  const acp = armorCheckPenalty(doc);
  const classSkillSet = new Set<string>(klass?.classSkills ?? []);
  // Bloodline / trait class-skill grants
  for (const bl of dec.classChoices['bloodline'] ?? []) {
    const b = C.bloodlineById.get(bl);
    if (b) classSkillSet.add(b.classSkill);
  }
  const skillRanksPerLevel = (() => {
    if (!klass) return 0;
    let n = klass.skillRanks + mods.int;
    for (const t of standard) if (t.skillRanksPerLevel) n += t.skillRanksPerLevel;
    return Math.max(1, n);
  })();
  const skillIds = C.SKILLS.map((s) => s.id);
  const classSkillIds: string[] = [];
  const acpSkillIds: string[] = [];
  for (const sk of C.SKILLS) {
    const ranks = dec.skillRanks[sk.id] ?? 0;
    const isClass = classSkillSet.has(sk.id);
    if (isClass) classSkillIds.push(sk.id);
    if (sk.acp) acpSkillIds.push(sk.id);
    const contribs: Contribution[] = [
      { type: 'base', value: ranks, note: `${ranks} rank${ranks === 1 ? '' : 's'}` },
      { type: 'base', value: mods[sk.ability], note: `${sk.ability.toUpperCase()} modifier` },
    ];
    if (isClass && ranks > 0) contribs.push({ type: 'base', value: 3, note: 'Class skill' });
    if (sk.acp && acp.total < 0) contribs.push({ type: 'penalty', value: acp.total, note: `Armor check penalty (${acp.sources.join(', ')})` });
    contribs.push(...unconds(`skill:${sk.id}`));
    stats[`skill:${sk.id}`] = makeStat(`skill:${sk.id}`, sk.name, contribs, conds(`skill:${sk.id}`));
  }
  const skillRanksSpent = Object.values(dec.skillRanks).reduce((a, b) => a + b, 0);

  // ---- Encumbrance ----
  const strScore = abilities.str;
  const carry = carryingCapacity(strScore);
  let load = 0;
  for (const [id, qty] of Object.entries(doc.purchases)) {
    const item = C.anyItemById(id);
    if (item) load += item.weight * qty;
  }
  const loadLabel = load <= carry.light ? 'Light' : load <= carry.medium ? 'Medium' : load <= carry.heavy ? 'Heavy' : 'Overloaded';

  // ---- Gold ----
  let startGold = klass?.startingGold ?? 0;
  for (const tid of dec.traits) {
    const t = C.traitById.get(tid);
    if (t?.bonusGold) startGold = t.bonusGold;
  }
  const gold = Math.round((startGold - doc.goldSpent) * 100) / 100;

  // ---- Slots + issues ----
  const { slots, issues } = buildSlotsAndIssues(doc, dec, {
    race, klass, abilities, mods, predCtx, skillRanksPerLevel, skillRanksSpent,
    standard, alternates, gold, load, carry, activeAcp: acp.total,
  });

  const steps = deriveSteps(klass);

  const summaryLine = [
    dec.alignment ?? '',
    race?.name ?? '',
    klass ? `${klass.name} 1` : '',
  ].filter(Boolean).join(' ');

  const sheet: Sheet = {
    stats, skillIds, classSkillIds, acpSkillIds,
    skillRanksTotal: skillRanksPerLevel, skillRanksSpent,
    gold,
    load: { current: load, light: carry.light, medium: carry.medium, heavy: carry.heavy, label: loadLabel },
    summaryLine,
  };
  return { sheet, slots, issues, steps };
}

function fmtSigned(v: number): string { return v >= 0 ? `+${v}` : `−${Math.abs(v)}`; }

function carryingCapacity(str: number): { light: number; medium: number; heavy: number } {
  // Core carrying-capacity table (heavy load column), medium/light = /2, /3 rounded.
  const table: Record<number, number> = {
    1: 10, 2: 20, 3: 30, 4: 40, 5: 50, 6: 60, 7: 70, 8: 80, 9: 90, 10: 100,
    11: 115, 12: 130, 13: 150, 14: 175, 15: 200, 16: 230, 17: 260, 18: 300, 19: 350, 20: 400,
    21: 460, 22: 520, 23: 600, 24: 700, 25: 800,
  };
  const heavy = table[Math.max(1, Math.min(25, str))] ?? 100;
  return { light: Math.floor(heavy / 3), medium: Math.floor((heavy * 2) / 3), heavy };
}

function deriveSteps(klass?: C.ClassDef): string[] {
  const steps = ['basics', 'race', 'class', 'skills', 'feats'];
  if (klass?.spellcasting) steps.push('spells');
  steps.push('equipment', 'review');
  return steps;
}

interface SlotCtx {
  race?: C.RaceDef;
  klass?: C.ClassDef;
  abilities: Record<Ability, number>;
  mods: Record<Ability, number>;
  predCtx: PredicateCtx;
  skillRanksPerLevel: number;
  skillRanksSpent: number;
  standard: C.RacialTraitDef[];
  alternates: C.AltTraitDef[];
  gold: number;
  load: number;
  carry: { light: number; medium: number; heavy: number };
  activeAcp: number;
}

function buildSlotsAndIssues(
  doc: CharacterDoc, dec: Decisions, ctx: SlotCtx,
): { slots: ChoiceSlot[]; issues: Issue[] } {
  const slots: ChoiceSlot[] = [];
  const issues: Issue[] = [];
  const { race, klass, predCtx } = ctx;

  // ---------- BASICS ----------
  const method = doc.abilityMethod;
  if (method in POINT_BUY_TOTAL) {
    const spent = ABILITIES.reduce((a, ab) => a + (POINT_BUY_COST[dec.abilityBase[ab]] ?? 0), 0);
    const left = POINT_BUY_TOTAL[method] - spent;
    if (left > 0) issues.push({ severity: 'warning', step: 'basics', slot: 'ability-base', message: `${left} point-buy point${left === 1 ? '' : 's'} unspent` });
    if (left < 0) issues.push({ severity: 'error', step: 'basics', slot: 'ability-base', message: `Over budget by ${-left} point-buy point${left === -1 ? '' : 's'}` });
  }

  // Alignment / deity / class triangle
  if (dec.alignment && klass?.alignment && !klass.alignment.includes(dec.alignment)) {
    issues.push({
      severity: 'error', step: 'basics', slot: 'alignment',
      message: `Alignment ${dec.alignment} conflicts with ${klass.name} (requires ${klass.alignment.join(' / ')})`,
    });
  }
  if (dec.deityId && dec.alignment) {
    const deity = C.deityById.get(dec.deityId);
    if (deity && deity.id !== 'none' && !withinOneStep(dec.alignment, deity.alignment)) {
      issues.push({
        severity: 'warning', step: 'basics', slot: 'deity',
        message: `${deity.name} (${deity.alignment}) is more than one step from your alignment ${dec.alignment}`,
      });
    }
  }

  // ---------- RACE: alternate traits ----------
  if (race) {
    const chosenAlts = new Set(dec.altTraits);
    const replacedByChosen = new Map<string, string>(); // standardTraitId -> altName
    for (const a of race.altTraits) if (chosenAlts.has(a.id)) for (const r of a.replaces) replacedByChosen.set(r, a.name);

    const altOptions: SlotOption[] = race.altTraits.map((a) => {
      const selected = chosenAlts.has(a.id);
      // Hard-illegal: another *chosen* alt already replaces one of this alt's targets.
      const clash = a.replaces.find((r) => replacedByChosen.has(r) && replacedByChosen.get(r) !== a.name);
      const legal = selected || !clash;
      // would-invalidate: replacing a standard trait that a granted feat-slot decision depends on.
      const wouldInvalidate = altWouldInvalidate(a, dec);
      return {
        id: a.id, name: a.name, desc: a.desc, legal,
        whyNot: !legal ? `Replaces ${displayName(clash!)}, already replaced by ${replacedByChosen.get(clash!)}` : undefined,
        wouldInvalidate: wouldInvalidate.length ? wouldInvalidate : undefined,
        meta: { replaces: a.replaces.map(displayName).join(', ') },
      };
    });
    slots.push({ id: 'alt-traits', step: 'race', label: 'Alternate racial traits', count: race.altTraits.length, multi: true, selected: [...chosenAlts], options: altOptions });

    // Floating ability bonus slot
    if (race.abilityMods === 'choice') {
      slots.push({
        id: 'floating-bonus', step: 'basics', label: `${race.name}: +2 to ${dualTalent(dec) ? 'two abilities' : 'one ability'}`,
        count: dualTalent(dec) ? 2 : 1, multi: dualTalent(dec),
        selected: dec.floatingBonus, options: ABILITIES.map((ab) => ({ id: ab, name: ab.toUpperCase(), legal: true })),
      });
      if (dec.floatingBonus.length < (dualTalent(dec) ? 2 : 1))
        issues.push({ severity: 'info', step: 'basics', slot: 'floating-bonus', message: `Choose ${race.name}'s +2 ability bonus` });
    }
  } else {
    issues.push({ severity: 'info', step: 'race', slot: 'race', message: 'Choose a race' });
  }

  // ---------- CLASS choices ----------
  if (!klass) {
    issues.push({ severity: 'info', step: 'class', slot: 'class', message: 'Choose a class' });
  } else {
    for (const ch of klass.choices ?? []) {
      const selected = dec.classChoices[ch.id] ?? [];
      const options = classChoiceOptions(ch, dec);
      // Universalist wizard → no opposition slot.
      if (ch.kind === 'wizard-opposition' && (dec.classChoices['school'] ?? []).includes('universalist')) continue;
      slots.push({ id: ch.id, step: 'class', label: ch.label, count: ch.count, multi: ch.count > 1, selected, options });
      if (selected.length < ch.count)
        issues.push({ severity: 'info', step: 'class', slot: ch.id, message: `Choose ${ch.label.toLowerCase()} (${selected.length}/${ch.count})` });
    }
    // Favored class + FCB
    if (!dec.favoredClass)
      issues.push({ severity: 'info', step: 'class', slot: 'favored-class', message: 'Pick your favored class' });
    else if (dec.favoredClass === dec.classId && !dec.fcbChoice)
      issues.push({ severity: 'info', step: 'class', slot: 'fcb', message: 'Choose favored class bonus: +1 HP or +1 skill rank' });
  }

  // ---------- SKILLS ----------
  const ranksLeft = ctx.skillRanksPerLevel - ctx.skillRanksSpent;
  if (klass) {
    if (ranksLeft > 0) issues.push({ severity: 'warning', step: 'skills', slot: 'skill-ranks', message: `${ranksLeft} skill rank${ranksLeft === 1 ? '' : 's'} unspent` });
    if (ranksLeft < 0) issues.push({ severity: 'error', step: 'skills', slot: 'skill-ranks', message: `${-ranksLeft} skill rank${ranksLeft === -1 ? '' : 's'} over budget` });
    for (const [sid, r] of Object.entries(dec.skillRanks)) {
      if (r > 1) issues.push({ severity: 'error', step: 'skills', slot: `skill:${sid}`, message: `${displayName(sid)}: ${r} ranks exceeds level-1 cap of 1` });
    }
  }

  // ---------- FEATS ----------
  const featSlotKeys = featSlots(dec, race, klass);
  const featOptions: SlotOption[] = C.FEATS.map((f) => {
    const legal = !f.prerequisites || evalPredicate(f.prerequisites, predCtx);
    return {
      id: f.id, name: f.name, desc: f.benefit, tags: f.types, legal,
      whyNot: !legal && f.prerequisites ? explainFailure(f.prerequisites, predCtx, displayName) ?? undefined : undefined,
      meta: { req: f.reqText },
    };
  });
  for (const fs of featSlotKeys) {
    slots.push({
      id: fs.key, step: 'feats', label: fs.label, count: 1, multi: false,
      selected: dec.feats[fs.key] ? [dec.feats[fs.key]!] : [],
      options: fs.combatOnly ? featOptions.filter((o) => C.featById.get(o.id)?.types.includes('combat')) : featOptions,
    });
    if (!dec.feats[fs.key]) issues.push({ severity: 'info', step: 'feats', slot: fs.key, message: `${fs.label}: empty` });
  }
  // Broken prereqs on already-selected feats (upstream edit)
  for (const [key, fid] of Object.entries(dec.feats)) {
    if (!fid) continue;
    const f = C.featById.get(fid);
    if (f?.prerequisites && !evalPredicate(f.prerequisites, predCtx)) {
      issues.push({ severity: 'error', step: 'feats', slot: key, clearSlot: `feats.${key}`, message: `${f.name}: ${explainFailure(f.prerequisites, predCtx, displayName)}` });
    }
    // Orphaned: feat sits in a slot that no longer exists (e.g. Focused Study removed human feat slot).
    if (!featSlotKeys.some((fs) => fs.key === key)) {
      issues.push({ severity: 'error', step: 'feats', slot: key, clearSlot: `feats.${key}`, message: `Decision orphaned: "${f?.name ?? fid}" — its slot was removed by an earlier choice` });
    }
  }

  // ---------- TRAITS ----------
  const traitDefs = dec.traits.map((t) => C.traitById.get(t)).filter(Boolean) as C.TraitDef[];
  const cats = traitDefs.map((t) => t.category);
  const dupCat = cats.find((c, i) => cats.indexOf(c) !== i);
  if (dupCat) issues.push({ severity: 'error', step: 'feats', slot: 'traits', message: `Two traits share the ${dupCat} category — pick different categories` });
  const traitBudget = 2 + (dec.drawback ? 1 : 0);
  if (dec.traits.length > traitBudget) issues.push({ severity: 'error', step: 'feats', slot: 'traits', message: `${dec.traits.length} traits selected, only ${traitBudget} allowed` });

  // ---------- SPELLS ----------
  if (klass?.spellcasting) {
    const sc = klass.spellcasting;
    const listSpells = C.SPELLS.filter((s) => s.lists.includes(sc.list as C.SpellDef['lists'][number]));
    if (sc.kind === 'prepared-book') {
      const picks1 = 3 + Math.max(0, ctx.mods.int);
      const opposed = new Set((dec.classChoices['opposition'] ?? []).map((o) => C.schoolById.get(o)?.name ?? o));
      const lvl1 = listSpells.filter((s) => s.level === 1);
      slots.push({
        id: 'spell-picks', step: 'spells', label: `1st-level spellbook (${dec.spellPicks.length}/${picks1})`, count: picks1, multi: true,
        selected: dec.spellPicks,
        options: lvl1.map((s) => ({
          id: s.id, name: s.name, desc: s.summary, tags: [s.school],
          legal: true, caution: opposed.has(s.school) ? 'opposed — double slot' : undefined,
          meta: { level: s.level, school: s.school },
        })),
      });
      if (dec.spellPicks.length < picks1)
        issues.push({ severity: 'info', step: 'spells', slot: 'spell-picks', message: `Add ${picks1 - dec.spellPicks.length} more spell(s) to your spellbook` });
      for (const pid of dec.spellPicks) {
        const sp = C.spellById.get(pid);
        if (sp && opposed.has(sp.school))
          issues.push({ severity: 'info', step: 'spells', slot: 'spell-picks', message: `${sp.name} is from an opposition school — it will cost two slots to prepare` });
      }
    } else if (sc.kind === 'spontaneous') {
      const known1 = (sc.known1?.[1] ?? 0);
      const lvl1 = listSpells.filter((s) => s.level === 1);
      slots.push({
        id: 'spell-picks', step: 'spells', label: `1st-level spells known (${dec.spellPicks.length}/${known1})`, count: known1, multi: true,
        selected: dec.spellPicks,
        options: lvl1.map((s) => ({ id: s.id, name: s.name, desc: s.summary, tags: [s.school], legal: true, meta: { level: s.level, school: s.school } })),
      });
      if (dec.spellPicks.length < known1)
        issues.push({ severity: 'info', step: 'spells', slot: 'spell-picks', message: `Choose ${known1 - dec.spellPicks.length} more spell(s) known` });
    }
  }

  // ---------- LANGUAGES ----------
  if (race) {
    const bonusCount = Math.max(0, ctx.mods.int);
    if (bonusCount > 0) {
      slots.push({
        id: 'languages', step: 'basics', label: `Bonus languages (Int)`, count: bonusCount, multi: true,
        selected: dec.languages,
        options: race.languagesBonus.map((l) => ({ id: l, name: cap(l), legal: true })),
      });
    }
  }

  // ---------- EQUIPMENT ----------
  if (ctx.load > ctx.carry.heavy)
    issues.push({ severity: 'warning', step: 'equipment', slot: 'load', message: `Overloaded: ${ctx.load} lb exceeds your heavy load of ${ctx.carry.heavy} lb` });
  if (ctx.gold < 0)
    issues.push({ severity: 'error', step: 'equipment', slot: 'gold', message: `Overspent by ${-ctx.gold} gp` });

  // Sort issues: severity then step order.
  const sevRank = { error: 0, warning: 1, info: 2 };
  const stepOrder = deriveSteps(klass);
  issues.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || stepOrder.indexOf(a.step) - stepOrder.indexOf(b.step));

  return { slots, issues };
}

// ---- helpers ----

function withinOneStep(a: Alignment, b: Alignment): boolean {
  const axis = (al: Alignment): [number, number] => {
    const lc = al.includes('L') ? -1 : al.includes('C') ? 1 : 0;
    const ge = al.includes('G') ? -1 : al.includes('E') ? 1 : 0;
    return [lc, ge];
  };
  const [la, ga] = axis(a);
  const [lb, gb] = axis(b);
  return Math.abs(la - lb) + Math.abs(ga - gb) <= 1;
}

function dualTalent(dec: Decisions): boolean {
  return dec.altTraits.includes('human-dual-talent');
}

function featSlots(dec: Decisions, race?: C.RaceDef, klass?: C.ClassDef): { key: string; label: string; combatOnly?: boolean }[] {
  const out: { key: string; label: string; combatOnly?: boolean }[] = [{ key: 'feat-1', label: '1st-level feat' }];
  const { standard, alternates } = activeRacialTraits(dec);
  const active = [...standard, ...alternates];
  for (const t of active) if (t.grantsFeatSlot) out.push({ key: t.grantsFeatSlot, label: `${race?.name ?? 'Racial'} bonus feat` });
  if (klass?.id === 'fighter') out.push({ key: 'feat-fighter', label: 'Fighter bonus feat · combat only', combatOnly: true });
  return out;
}

/** Would selecting this alt trait orphan a feat sitting in a soon-removed slot? */
function altWouldInvalidate(a: C.AltTraitDef, dec: Decisions): { slotLabel: string; decisionName: string }[] {
  const out: { slotLabel: string; decisionName: string }[] = [];
  const race = dec.raceId ? C.raceById.get(dec.raceId) : undefined;
  if (!race) return out;
  // Find standard traits this alt replaces that currently grant a feat slot that is filled.
  for (const rid of a.replaces) {
    const std = race.traits.find((t) => t.id === rid);
    if (std?.grantsFeatSlot && dec.feats[std.grantsFeatSlot]) {
      const fid = dec.feats[std.grantsFeatSlot]!;
      out.push({ slotLabel: `${race.name} bonus feat`, decisionName: C.featById.get(fid)?.name ?? fid });
    }
  }
  return out;
}

function classChoiceOptions(ch: C.ClassChoiceDef, dec: Decisions): SlotOption[] {
  switch (ch.kind) {
    case 'wizard-school':
      return C.SCHOOLS.map((s) => ({ id: s.id, name: s.name, desc: s.desc, legal: true }));
    case 'wizard-opposition': {
      const school = (dec.classChoices['school'] ?? [])[0];
      const chosenOpp = dec.classChoices['opposition'] ?? [];
      return C.SCHOOLS.filter((s) => s.id !== 'universalist' && s.id !== school).map((s) => ({
        id: s.id, name: s.name, desc: s.desc,
        legal: true,
        caution: chosenOpp.includes(s.id) ? undefined : undefined,
      }));
    }
    case 'arcane-bond':
      return [
        { id: 'familiar', name: 'Familiar', desc: 'A magical animal companion that grants a skill or save bonus.', legal: true },
        { id: 'bonded-object', name: 'Bonded object', desc: 'An amulet, ring, staff, wand, or weapon you can cast through.', legal: true },
      ];
    case 'cleric-domains': {
      const deity = dec.deityId ? C.deityById.get(dec.deityId) : undefined;
      const allowed = deity && deity.id !== 'none' ? new Set(deity.domains) : null;
      return C.DOMAINS.map((d) => ({
        id: d.id, name: d.name, desc: d.desc,
        legal: allowed ? allowed.has(d.id) : true,
        whyNot: allowed && !allowed.has(d.id) ? `${deity!.name} does not grant the ${d.name} domain` : undefined,
      }));
    }
    case 'sorcerer-bloodline':
      return C.BLOODLINES.map((b) => ({ id: b.id, name: b.name, desc: b.desc, legal: true, meta: { classSkill: b.classSkill } }));
    default:
      return [];
  }
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

// Re-export for other modules.
export { activeRacialTraits, finalAbilities };
