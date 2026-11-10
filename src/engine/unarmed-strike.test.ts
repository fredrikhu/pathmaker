import { describe, expect, it } from 'vitest';
import { newCharacter, withDecision } from './character';
import { resolve } from './resolve';
import * as C from '../content/index';
import type { AttackLine, CharacterDoc } from './types';

// The unarmed strike line on the sheet. Rules (Core Rulebook, Advanced Class Guide):
//   - anyone: 1d3 (Small 1d2), ×2, bludgeoning, a light weapon everyone is proficient with;
//     nonlethal and provoking unless you have Improved Unarmed Strike.
//   - monk and brawler: their own table by class level — Medium 1d6 / 1d8 / 1d10 / 2d6 / 2d8 / 2d10
//     at 1 / 4 / 8 / 12 / 16 / 20; Small 1d4 / 1d6 / 1d8 / 1d10 / 2d6 / 2d8. Both gain Improved
//     Unarmed Strike at 1st.
// Str 14 (+2) throughout, so damage reads "<die>+2" before any feat.

function build(classId: string, level: number, opts: { race?: string; archetype?: string; classLevels?: string[] } = {}): CharacterDoc {
  let d = newCharacter(`t-${classId}`, 'Rook');
  d = withDecision(d, 'ability-base', { str: 14, dex: 14, con: 14, int: 12, wis: 14, cha: 10 });
  d = withDecision(d, 'race', opts.race ?? 'human');
  if ((opts.race ?? 'human') === 'human') d = withDecision(d, 'floating-bonus', ['wis']);
  d = withDecision(d, 'class', classId);
  if (opts.archetype) d = withDecision(d, 'archetype', opts.archetype);
  if (opts.classLevels) d = withDecision(d, 'class-levels', opts.classLevels);
  return { ...d, level };
}

function withFeats(d: CharacterDoc, feats: Record<string, string>, params: Record<string, string> = {}): CharacterDoc {
  return withDecision(withDecision(d, 'feats', feats), 'feat-params', params);
}

const U = C.UNARMED_STRIKE_ID;
const repeat = (id: string, n: number) => Array.from({ length: n }, () => id);
const unarmed = (d: CharacterDoc): AttackLine | undefined => resolve(d).sheet.attacks.find((a) => a.id === U);
const die = (d: CharacterDoc) => unarmed(d)!.damage.split(/[+−]/)[0];

describe('the unarmed strike line', () => {
  it('is left off a sheet with nothing unarmed about it', () => {
    expect(unarmed(build('wizard', 5))).toBeUndefined();
    expect(unarmed(build('fighter', 1))).toBeUndefined();
  });

  it('shows for a monk at 1st: 1d6 + Str, ×2, bludgeoning, lethal', () => {
    const line = unarmed(build('monk', 1))!;
    expect(line).toMatchObject({ name: 'Unarmed strike', kind: 'melee', slot: 'unarmed', damage: '1d6+2', crit: '×2', dmgType: 'B' });
    expect(line.bonuses).toEqual([2]); // BAB +0, Str +2
    expect(line.notes.join(' ')).toMatch(/Lethal damage/);
    expect(line.notes.join(' ')).toMatch(/Flurry of blows is not folded in/);
  });

  it('follows the monk table at each band boundary', () => {
    const at: [number, string][] = [[3, '1d6'], [4, '1d8'], [7, '1d8'], [8, '1d10'], [11, '1d10'], [12, '2d6'], [15, '2d6'], [16, '2d8'], [19, '2d8'], [20, '2d10']];
    for (const [level, expected] of at) expect(die(build('monk', level)), `monk ${level}`).toBe(expected);
  });

  it('uses the printed Small column for a halfling monk', () => {
    const at: [number, string][] = [[1, '1d4'], [4, '1d6'], [8, '1d8'], [12, '1d10'], [16, '2d6'], [20, '2d8']];
    for (const [level, expected] of at) expect(die(build('monk', level, { race: 'halfling' })), `halfling monk ${level}`).toBe(expected);
  });

  it('gives a brawler the same table and Improved Unarmed Strike', () => {
    expect(die(build('brawler', 1))).toBe('1d6');
    expect(die(build('brawler', 8))).toBe('1d10');
    expect(resolve(build('brawler', 1)).sheet.feats).toContain('improved-unarmed-strike');
    expect(unarmed(build('brawler', 1))!.notes.join(' ')).toMatch(/Lethal damage/);
  });

  it('does not apply to an Exemplar brawler, whose Call to Arms replaces unarmed strike', () => {
    const d = build('brawler', 5, { archetype: 'exemplar' });
    expect(resolve(d).sheet.feats).not.toContain('improved-unarmed-strike');
    expect(unarmed(d)).toBeUndefined();
  });

  it('a monk / brawler takes the higher class level, not the sum: brawler 3 / monk 5 is 1d8', () => {
    const d = build('monk', 8, { classLevels: [...repeat('brawler', 3), ...repeat('monk', 5)] });
    expect(die(d)).toBe('1d8'); // monk 5 → 4–7 band; the sum, 8, would be 1d10
    expect(unarmed(d)!.notes.join(' ')).toMatch(/Monk unarmed strike: 1d8 at monk level 5/);
  });

  it('gives anyone with Improved Unarmed Strike a lethal 1d3 (Small 1d2)', () => {
    const line = unarmed(withFeats(build('fighter', 1), { 'feat-1': 'improved-unarmed-strike' }))!;
    expect(line.damage).toBe('1d3+2');
    expect(line.notes.join(' ')).toMatch(/Lethal damage/);
    const small = withFeats(build('fighter', 1, { race: 'halfling' }), { 'feat-1': 'improved-unarmed-strike' });
    expect(die(small)).toBe('1d2');
  });

  it('shows a nonlethal line when a weapon feat names unarmed strike, with the feat folded in', () => {
    // Fighter 1, Weapon Focus (unarmed strike), no Improved Unarmed Strike: BAB 1 + Str 2 + WF 1.
    const line = unarmed(withFeats(build('fighter', 1), { 'feat-1': 'weapon-focus' }, { 'feat-1': U }))!;
    expect(line.bonuses).toEqual([4]);
    expect(line.attackLines).toContainEqual({ label: 'Weapon Focus', value: 1 });
    expect(line.notes.join(' ')).toMatch(/nonlethal damage/);
    // The feat lands on the unarmed line only, not on a wielded weapon.
    const sword = { ...withFeats(build('fighter', 1), { 'feat-1': 'weapon-focus' }, { 'feat-1': U }), purchases: { longsword: 1 } };
    expect(resolve(sword).sheet.attacks.find((a) => a.id === 'longsword')!.attackLines).not.toContainEqual({ label: 'Weapon Focus', value: 1 });
  });

  it('adds Weapon Specialization (unarmed strike) to a Martial Artist\'s damage', () => {
    // Fighter 1 / martial artist 4: monk level 4 → 1d8; Str 2 + Weapon Specialization 2.
    const d = withFeats(build('monk', 5, { archetype: 'martial-artist', classLevels: ['fighter', ...repeat('monk', 4)] }),
      { 'feat-1': 'weapon-focus', 'feat-L5': 'weapon-specialization' }, { 'feat-1': U, 'feat-L5': U });
    const line = unarmed(d)!;
    expect(line.damage).toBe('1d8+4');
    expect(line.damageLines).toContainEqual({ label: 'Weapon Specialization', value: 2 });
  });

  it('doubles the threat range with Improved Critical (unarmed strike)', () => {
    // Fighter 8: Improved Critical needs BAB +8, so it sits in the 8th-level fighter bonus slot.
    const d = withFeats(build('fighter', 8), { 'feat-1': 'improved-unarmed-strike', 'feat-fighter-L8': 'improved-critical' }, { 'feat-fighter-L8': U });
    expect(unarmed(d)!.crit).toBe('19–20/×2');
  });
});
