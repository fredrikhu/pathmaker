import { describe, expect, it } from 'vitest';
import { newCharacter, withDecision } from './character';
import { featQualifyingClassLevels, resolve } from './resolve';
import * as C from '../content/index';
import type { CharacterDoc } from './types';

// Class features that count one class's levels as another's when qualifying for feats, in every
// feat slot (the warpriest's version covers only its own bonus slots; see warpriest-feats.test.ts).
//
//   Brawler, Martial Training (1st): brawler levels count as fighter AND monk levels. No word on
//     stacking, so the higher of brawler and real fighter levels counts, as for the warpriest.
//   Magus, Fighter Training (10th): half magus level (rounded down) counts as fighter level, and
//     "if he has levels in fighter, these levels stack".
//   Kensai, Fighter Training (7th): magus level − 3 counts as fighter level, stacking with real
//     fighter levels, but only for feats with the kensai's chosen weapon (his Weapon Focus weapon).
//   Martial Artist, Martial Arts Master (4th): monk level counts as fighter level, for feats applied
//     to unarmed strikes or monk weapons only. No word on stacking, so the higher counts.

/** A human character with even, unremarkable scores: no feat here needs more than BAB. */
function build(classId: string, level: number, opts: { archetype?: string; classLevels?: string[] } = {}): CharacterDoc {
  let d = newCharacter(`t-${classId}`, 'Tess');
  d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 14, int: 14, wis: 14, cha: 10 });
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'floating-bonus', ['str']);
  d = withDecision(d, 'class', classId);
  if (opts.archetype) d = withDecision(d, 'archetype', opts.archetype);
  if (opts.classLevels) d = withDecision(d, 'class-levels', opts.classLevels);
  return { ...d, level };
}

/** Add feats to slots, with their weapon picks (keyed by slot, as `feat-params` is). */
function withFeats(d: CharacterDoc, feats: Record<string, string>, params: Record<string, string> = {}): CharacterDoc {
  const priorFeats = (d.decisions.feats as Record<string, string>) ?? {};
  const priorParams = (d.decisions['feat-params'] as Record<string, string>) ?? {};
  return withDecision(withDecision(d, 'feats', { ...priorFeats, ...feats }), 'feat-params', { ...priorParams, ...params });
}

const repeat = (id: string, n: number) => Array.from({ length: n }, () => id);
const option = (d: CharacterDoc, slotId: string, featId: string) =>
  resolve(d).slots.find((s) => s.id === slotId)?.options.find((o) => o.id === featId);
const featIssues = (d: CharacterDoc, severity: 'error' | 'warning') =>
  resolve(d).issues.filter((i) => i.severity === severity && i.step === 'feats');
const fighterLevel = (d: CharacterDoc) => featQualifyingClassLevels(d).fighter ?? 0;

describe('brawler: Martial Training counts brawler levels as fighter and monk levels', () => {
  it('counts from 1st level, as both classes', () => {
    expect(featQualifyingClassLevels(build('brawler', 1))).toMatchObject({ brawler: 1, fighter: 1, monk: 1 });
    expect(featQualifyingClassLevels(build('brawler', 7))).toMatchObject({ brawler: 7, fighter: 7, monk: 7 });
  });

  it('opens Greater Weapon Focus (fighter 8) at exactly brawler 8, in any slot', () => {
    // Weapon Focus in the 1st-level slot; the 8th-level slot is a brawler bonus slot, but the
    // substitution belongs to every slot — the 7th-level general slot is one level short.
    const d = withFeats(build('brawler', 8), { 'feat-1': 'weapon-focus' }, { 'feat-1': 'longsword' });
    expect(option(d, 'feat-brawler-L8', 'greater-weapon-focus')!.legal).toBe(true);
    const short = option(d, 'feat-L7', 'greater-weapon-focus')!;
    expect(short.legal).toBe(false);
    expect(short.whyNot).toMatch(/fighter level 8 — you have 7/i);
  });

  it('opens Weapon Specialization in a general slot, with no issue raised', () => {
    // Brawler 5, general 5th-level slot: fighter level 5 ≥ 4.
    const d = withFeats(build('brawler', 5), { 'feat-1': 'weapon-focus', 'feat-L5': 'weapon-specialization' },
      { 'feat-1': 'longsword', 'feat-L5': 'longsword' });
    expect(featIssues(d, 'error')).toEqual([]);
    expect(featIssues(d, 'warning')).toEqual([]);
  });

  it('takes the higher of brawler and fighter levels, not the sum', () => {
    // Fighter 2 / brawler 3: fighter level 3 for feats, not 5 — one short of Weapon Specialization.
    const d = build('brawler', 5, { classLevels: [...repeat('fighter', 2), ...repeat('brawler', 3)] });
    expect(featQualifyingClassLevels(d)).toMatchObject({ fighter: 3, monk: 3 });
    const withWf = withFeats(d, { 'feat-1': 'weapon-focus' }, { 'feat-1': 'longsword' });
    expect(option(withWf, 'feat-L5', 'weapon-specialization')!.whyNot).toMatch(/you have 3/);
  });

  it('does not make the brawler a fighter or monk outside feat prerequisites: no fighter or monk bonus slots', () => {
    const ids = resolve(build('brawler', 6)).slots.map((s) => s.id);
    expect(ids.some((id) => id.startsWith('feat-fighter') || id.startsWith('feat-monk'))).toBe(false);
  });
});

describe('magus: Fighter Training counts half magus level as fighter level, stacking with fighter', () => {
  it('starts at exactly 10th level, rounding down', () => {
    expect(fighterLevel(build('magus', 9))).toBe(0);
    expect(fighterLevel(build('magus', 10))).toBe(5);
    expect(fighterLevel(build('magus', 11))).toBe(5);
    expect(fighterLevel(build('magus', 12))).toBe(6);
  });

  it('opens Weapon Specialization (fighter 4) but not Disruptive (fighter 6) for a magus 11', () => {
    const d = withFeats(build('magus', 11), { 'feat-1': 'weapon-focus' }, { 'feat-1': 'longsword' });
    expect(option(d, 'feat-L11', 'weapon-specialization')!.legal).toBe(true);
    expect(option(d, 'feat-L11', 'disruptive')!.whyNot).toMatch(/fighter level 6 — you have 5/i);
  });

  it('stacks with real fighter levels: fighter 1 / magus 10 is fighter 6, and qualifies for Disruptive', () => {
    const d = build('magus', 11, { classLevels: ['fighter', ...repeat('magus', 10)] });
    expect(fighterLevel(d)).toBe(6); // 1 + 10/2
    expect(option(d, 'feat-L11', 'disruptive')!.legal).toBe(true);
  });

  it('one magus level short, only the real fighter levels count: fighter 2 / magus 9 is fighter 2', () => {
    const d = build('magus', 11, { classLevels: [...repeat('fighter', 2), ...repeat('magus', 9)] });
    expect(fighterLevel(d)).toBe(2);
    expect(option(d, 'feat-L11', 'disruptive')!.whyNot).toMatch(/you have 2/);
  });

  it('does not apply to a Staff Magus, whose Staff Weapon replaces Fighter Training', () => {
    const d = withFeats(build('magus', 11, { archetype: 'staff-magus' }), { 'feat-1': 'weapon-focus' }, { 'feat-1': 'quarterstaff' });
    expect(fighterLevel(d)).toBe(0);
    expect(option(d, 'feat-L11', 'weapon-specialization')!.whyNot).toMatch(/fighter level 4 — you have 0/i);
  });
});

/** A kensai whose chosen weapon (the weapon of his granted Weapon Focus) is the longsword. */
function kensai(level: number, chosen: string | null = 'longsword'): CharacterDoc {
  const d = build('magus', level, { archetype: 'kensai' });
  return chosen ? withDecision(d, 'feat-params', { 'granted-source:kensai-weapon-focus': chosen }) : d;
}

describe('kensai: Fighter Training counts magus level − 3 as fighter level, with the chosen weapon only', () => {
  it('grants Weapon Focus, whose weapon is the chosen weapon', () => {
    const wf = resolve(kensai(1)).sheet.grantedFeats.find((g) => g.featId === 'weapon-focus')!;
    expect(wf.param?.key).toBe('granted-source:kensai-weapon-focus');
    expect(wf.param?.value).toBe('longsword');
  });

  it('is weapon-limited, so it stays out of the plain fighter level', () => {
    expect(fighterLevel(kensai(7))).toBe(0);
    // From 10th the base Fighter Training (half, any weapon) still applies; the kensai keeps it.
    expect(fighterLevel(kensai(11))).toBe(5);
  });

  it('opens Weapon Specialization at exactly 7th (7 − 3 = 4), with a caution naming the weapon', () => {
    const o = option(kensai(7), 'feat-L7', 'weapon-specialization')!;
    expect(o.legal).toBe(true);
    expect(o.caution).toMatch(/Fighter Training.*your chosen weapon \(Longsword\)/);
    // The 5th-level slot is judged at magus 5, before the feature: no fighter level at all.
    const early = option(kensai(7), 'feat-L5', 'weapon-specialization')!;
    expect(early.legal).toBe(false);
    expect(early.whyNot).toMatch(/fighter level 4 — you have 0/i);
  });

  it('raises nothing for Weapon Specialization with the chosen weapon', () => {
    const d = withFeats(kensai(7), { 'feat-L7': 'weapon-specialization' }, { 'feat-L7': 'longsword' });
    expect(featIssues(d, 'error')).toEqual([]);
    expect(featIssues(d, 'warning')).toEqual([]);
  });

  it('refuses it with any other weapon', () => {
    const d = withFeats(kensai(7), { 'feat-L7': 'weapon-specialization' }, { 'feat-L7': 'rapier' });
    const errs = featIssues(d, 'error');
    expect(errs.map((i) => i.slot)).toEqual(['feat-L7']);
    expect(errs[0].message).toMatch(/Weapon Specialization \(Rapier\): Requires fighter level 4 — you have 0/i);
    expect(errs[0].message).toMatch(/chosen weapon \(Longsword\)/);
  });

  it('warns, without blocking, while the feat has no weapon picked', () => {
    const d = withFeats(kensai(7), { 'feat-L7': 'weapon-specialization' });
    expect(featIssues(d, 'error')).toEqual([]);
    expect(featIssues(d, 'warning').map((i) => i.slot)).toEqual(['feat-L7']);
  });

  it('at 11th, the base training covers any weapon to fighter 5, the kensai\'s only the chosen one to 8', () => {
    // Greater Weapon Focus needs fighter 8: 11 − 3 = 8 with the longsword, only 11/2 = 5 otherwise.
    const longsword = withFeats(kensai(11), { 'feat-L11': 'greater-weapon-focus' }, { 'feat-L11': 'longsword' });
    expect(featIssues(longsword, 'error')).toEqual([]);
    const rapier = withFeats(kensai(11), { 'feat-L11': 'greater-weapon-focus' }, { 'feat-L11': 'rapier' });
    expect(featIssues(rapier, 'error')[0].message).toMatch(/fighter level 8 — you have 5/i);
    // Weapon Specialization (fighter 4) needs only the base training, so any weapon will do.
    const spec = withFeats(kensai(11), { 'feat-L11': 'weapon-specialization' }, { 'feat-L11': 'rapier' });
    expect(featIssues(spec, 'error')).toEqual([]);
    expect(featIssues(spec, 'warning')).toEqual([]);
  });

  it('flags a feat that names no weapon instead of refusing it: Disruptive (fighter 6) at kensai 9', () => {
    const d = withFeats(kensai(9), { 'feat-L9': 'disruptive' });
    expect(featIssues(d, 'error')).toEqual([]);
    const warn = featIssues(d, 'warning');
    expect(warn.map((i) => i.slot)).toEqual(['feat-L9']);
    expect(warn[0].message).toMatch(/Disruptive: qualifies only through Fighter Training.*names no weapon/);
  });
});

/** A Martial Artist monk with Weapon Focus in the 1st-level slot (fighter 1 first, for BAB +1). */
function martialArtist(classLevels: string[], wfWeapon = C.UNARMED_STRIKE_ID): CharacterDoc {
  const d = build('monk', classLevels.length, { archetype: 'martial-artist', classLevels });
  return withFeats(d, { 'feat-1': 'weapon-focus' }, { 'feat-1': wfWeapon });
}

describe('Martial Artist: Martial Arts Master counts monk level as fighter level, for unarmed strikes and monk weapons', () => {
  it('lets Weapon Focus name unarmed strike', () => {
    expect(C.featById.get('weapon-focus')!.param!.options.some((o) => o.id === C.UNARMED_STRIKE_ID)).toBe(true);
  });

  it('opens Weapon Specialization at exactly monk 4 (fighter 1 / monk 4), with a caution', () => {
    const o = option(martialArtist(['fighter', ...repeat('monk', 4)]), 'feat-L5', 'weapon-specialization')!;
    expect(o.legal).toBe(true);
    expect(o.caution).toMatch(/Martial Arts Master.*unarmed strikes and monk weapons/);
  });

  it('raises nothing for Weapon Specialization with unarmed strike or a kama', () => {
    for (const weapon of [C.UNARMED_STRIKE_ID, 'kama']) {
      const d = withFeats(martialArtist(['fighter', ...repeat('monk', 4)]), { 'feat-L5': 'weapon-specialization' }, { 'feat-L5': weapon });
      expect(featIssues(d, 'error'), weapon).toEqual([]);
      expect(featIssues(d, 'warning'), weapon).toEqual([]);
    }
  });

  it('refuses it with a longsword, which is no monk weapon', () => {
    const d = withFeats(martialArtist(['fighter', ...repeat('monk', 4)]), { 'feat-L5': 'weapon-specialization' }, { 'feat-L5': 'longsword' });
    const errs = featIssues(d, 'error');
    expect(errs.map((i) => i.slot)).toEqual(['feat-L5']);
    expect(errs[0].message).toMatch(/Weapon Specialization \(Longsword\): Requires fighter level 4 — you have 1/i);
  });

  it('takes the higher, not the sum, and is off below 4th: fighter 2 / monk 3 is fighter 2', () => {
    const d = withFeats(martialArtist([...repeat('fighter', 2), ...repeat('monk', 3)]), { 'feat-L5': 'weapon-specialization' }, { 'feat-L5': C.UNARMED_STRIKE_ID });
    expect(featIssues(d, 'error')[0].message).toMatch(/fighter level 4 — you have 2/i);
  });

  it('does not apply to a monk without the archetype', () => {
    let d = build('monk', 5, { classLevels: ['fighter', ...repeat('monk', 4)] });
    d = withFeats(d, { 'feat-1': 'weapon-focus', 'feat-L5': 'weapon-specialization' }, { 'feat-1': C.UNARMED_STRIKE_ID, 'feat-L5': C.UNARMED_STRIKE_ID });
    expect(featIssues(d, 'error')[0].message).toMatch(/fighter level 4 — you have 1/i);
  });

  it('flags a feat that names no weapon: Disruptive (fighter 6) for a fighter 1 / martial artist 6', () => {
    const d = withFeats(martialArtist(['fighter', ...repeat('monk', 6)]), { 'feat-L7': 'disruptive' });
    expect(featIssues(d, 'error')).toEqual([]);
    expect(featIssues(d, 'warning')[0].message).toMatch(/Disruptive: qualifies only through Martial Arts Master/);
  });
});
