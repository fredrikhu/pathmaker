import { describe, expect, it } from 'vitest';
import { newCharacter, withDecision } from './character';
import { resolve } from './resolve';
import * as C from '../content/index';
import type { CharacterDoc } from './types';

// Warpriest bonus feats (Advanced Class Guide): at 3rd level and every 3 levels after, a bonus
// combat feat — and for those feats only, warpriest levels count as fighter levels. Real fighter
// levels do not add on: the higher of the two counts (whether they stack is unsettled; the higher
// is the reading no GM objects to).

/** A human warpriest. Weapon Focus — Weapon Specialization's other prerequisite — is granted by the
 *  class at 1st level, so no slot needs to hold it. */
function warpriest(level: number, classLevels?: string[]): CharacterDoc {
  let d = newCharacter('t-warpriest', 'Ilsa');
  d = withDecision(d, 'ability-base', { str: 15, dex: 12, con: 14, int: 10, wis: 14, cha: 8 });
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'floating-bonus', ['str']);
  d = withDecision(d, 'class', 'warpriest');
  if (classLevels) d = withDecision(d, 'class-levels', classLevels);
  return { ...d, level };
}

const slot = (d: CharacterDoc, id: string) => resolve(d).slots.find((s) => s.id === id);
const option = (d: CharacterDoc, slotId: string, featId: string) => slot(d, slotId)?.options.find((o) => o.id === featId);
const prereqErrors = (d: CharacterDoc) => resolve(d).issues.filter((i) => i.severity === 'error' && i.step === 'feats');

describe('warpriest bonus feats count warpriest levels as fighter levels', () => {
  it('opens Weapon Specialization in the 6th-level bonus slot, where the warpriest is fighter 6', () => {
    const o = option(warpriest(6), 'feat-warpriest-L6', 'weapon-specialization')!;
    expect(o.legal).toBe(true);
  });

  it('judges the slot at the level it was gained: the 3rd-level slot is fighter 3, too low for it', () => {
    const o = option(warpriest(6), 'feat-warpriest-L3', 'weapon-specialization')!;
    expect(o.legal).toBe(false);
    expect(o.whyNot).toMatch(/fighter level 4 — you have 3/i);
  });

  it('does not apply to a general feat slot — warpriest levels are not fighter levels there', () => {
    const o = option(warpriest(6), 'feat-L5', 'weapon-specialization')!;
    expect(o.legal).toBe(false);
    expect(o.whyNot).toMatch(/fighter level 4 — you have 0/i);
  });

  it('a chosen Weapon Specialization raises no issue in the bonus slot, but does in a general one', () => {
    const inBonus = withDecision(warpriest(6), 'feats', { 'feat-warpriest-L6': 'weapon-specialization' });
    expect(prereqErrors(inBonus)).toEqual([]);
    const inGeneral = withDecision(warpriest(6), 'feats', { 'feat-L5': 'weapon-specialization' });
    expect(prereqErrors(inGeneral).map((i) => i.slot)).toEqual(['feat-L5']);
  });

  it('takes the higher of warpriest and fighter levels, not the sum', () => {
    // Fighter 2 / warpriest 3: the warpriest's 3rd-level slot is fighter level 3, not 5.
    const split = warpriest(5, ['fighter', 'fighter', 'warpriest', 'warpriest', 'warpriest']);
    const o = option(split, 'feat-warpriest-L3', 'weapon-specialization')!;
    expect(o.legal).toBe(false);
    expect(o.whyNot).toMatch(/you have 3/);
    // Fighter 4 / warpriest 3: the real fighter levels are the higher, and they still count.
    const fighterHeavy = warpriest(7, ['fighter', 'fighter', 'fighter', 'fighter', 'warpriest', 'warpriest', 'warpriest']);
    expect(option(fighterHeavy, 'feat-warpriest-L3', 'weapon-specialization')!.legal).toBe(true);
  });

  it('offers only combat feats in the bonus slots', () => {
    const offered = slot(warpriest(3), 'feat-warpriest-L3')!.options;
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.every((o) => C.featById.get(o.id)?.types.includes('combat'))).toBe(true);
    expect(offered.some((o) => o.id === 'iron-will')).toBe(false);
  });
});
