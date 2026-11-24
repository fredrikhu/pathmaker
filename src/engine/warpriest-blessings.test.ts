import { describe, expect, it } from 'vitest';
import { newCharacter, withDecision } from './character';
import { resolve } from './resolve';
import { rest } from './clock';
import { emptyPlayState, type CharacterDoc } from './types';
import * as C from '../content/index';

// Warpriest blessings on the play mat (Advanced Class Guide). A warpriest calls on his blessings
// 3 + ½ his warpriest level times a day, in any combination, so one pool covers both blessings and
// both of their powers. The save DC is 10 + ½ warpriest level + Wisdom modifier. Each blessing has a
// minor power from 1st level and a major power from 10th.

/** A human warpriest of Sarenrae with Wisdom 14 (+2). */
function warpriest(level: number, opts: { blessings?: string[]; archetype?: string; classLevels?: string[]; baseClass?: string } = {}): CharacterDoc {
  let d = newCharacter('t-blessings', 'Kestrel');
  d = withDecision(d, 'ability-base', { str: 15, dex: 12, con: 14, int: 10, wis: 14, cha: 8 });
  d = withDecision(d, 'race', 'human');
  d = withDecision(d, 'floating-bonus', ['str']);
  d = withDecision(d, 'alignment', 'NG');
  d = withDecision(d, 'deity', 'sarenrae'); // fire, glory, good, healing, sun
  d = withDecision(d, 'class', opts.baseClass ?? 'warpriest');
  if (opts.classLevels) d = withDecision(d, 'class-levels', opts.classLevels);
  if (opts.blessings) d = withDecision(d, 'class-choices', { blessings: opts.blessings });
  if (opts.archetype) d = withDecision(d, 'archetype', opts.archetype);
  return { ...d, level };
}

const sheetOf = (d: CharacterDoc) => resolve(d).sheet;

describe('warpriest blessings on the play mat', () => {
  it('lists the chosen blessings with both powers, read from the catalogue', () => {
    const b = sheetOf(warpriest(1, { blessings: ['fire', 'sun'] })).blessings!;
    expect(b.blessings.map((x) => x.name)).toEqual(['Fire', 'Sun']);
    expect(b.blessings[0].minor).toBe(C.blessingById.get('fire')!.minor);
    expect(b.blessings[0].major).toBe(C.blessingById.get('fire')!.major);
  });

  it('at 1st level: 3 uses a day, save DC 12 (10 + 0 + 2 Wis), major powers not yet open', () => {
    const b = sheetOf(warpriest(1, { blessings: ['fire', 'sun'] })).blessings!;
    expect(b.perDay).toBe(3);
    expect(b.saveDc).toBe(12);
    expect(b.majorAt).toBe(10);
    expect(b.majorReady).toBe(false);
  });

  it('opens the major powers at 10th level, not 9th', () => {
    expect(sheetOf(warpriest(9, { blessings: ['fire', 'sun'] })).blessings!.majorReady).toBe(false);
    const b = sheetOf(warpriest(10, { blessings: ['fire', 'sun'] })).blessings!;
    expect(b.majorReady).toBe(true);
    expect(b.perDay).toBe(8);   // 3 + 5
    expect(b.saveDc).toBe(17);  // 10 + 5 + 2
  });

  it('reaches 13 uses a day at 20th level', () => {
    expect(sheetOf(warpriest(20, { blessings: ['fire', 'sun'] })).blessings!.perDay).toBe(13);
  });

  it('adds one shared "Blessings" pool after fervor, sized to the uses per day', () => {
    const pools = sheetOf(warpriest(4, { blessings: ['fire', 'sun'] })).pools;
    expect(pools.map((p) => p.id)).toEqual(['fervor', 'blessings']);
    expect(pools.find((p) => p.id === 'blessings')).toEqual({ id: 'blessings', name: 'Blessings', max: 5, unit: 'uses' });
  });

  it('counts warpriest levels only: a fighter 4 / warpriest 6 runs them as a 6th-level warpriest', () => {
    const levels = ['fighter', 'fighter', 'fighter', 'fighter', ...Array(6).fill('warpriest')];
    const b = sheetOf(warpriest(10, { blessings: ['fire', 'sun'], baseClass: 'fighter', classLevels: levels })).blessings!;
    expect(b.classLevel).toBe(6);
    expect(b.perDay).toBe(6);         // 3 + 3
    expect(b.saveDc).toBe(15);        // 10 + 3 + 2
    expect(b.majorReady).toBe(false); // character level 10, warpriest level 6
  });

  it('shows nothing, and adds no pool, until a blessing is chosen', () => {
    const s = sheetOf(warpriest(3));
    expect(s.blessings).toBeUndefined();
    expect(s.pools.some((p) => p.id === 'blessings')).toBe(false);
  });

  it('shows nothing for a Divine Commander, who trades blessings for a mount — even with a stale pick', () => {
    const s = sheetOf(warpriest(5, { blessings: ['fire', 'sun'], archetype: 'divine-commander' }));
    expect(s.blessings).toBeUndefined();
    expect(s.pools.some((p) => p.id === 'blessings')).toBe(false);
  });

  it('gives a Forgepriest only the one blessing the archetype allows', () => {
    const b = sheetOf(warpriest(5, { blessings: ['fire', 'sun'], archetype: 'forgepriest' })).blessings!;
    expect(b.blessings.map((x) => x.id)).toEqual(['fire']);
    expect(b.perDay).toBe(5); // the pool itself is unchanged
  });

  it('still shows a blessing the deity does not grant — the builder warns, the player decides', () => {
    const b = sheetOf(warpriest(1, { blessings: ['fire', 'war'] })).blessings!;
    expect(b.blessings.map((x) => x.id)).toEqual(['fire', 'war']);
  });

  it('restores spent blessing uses on a night’s rest, like any daily pool', () => {
    const play = { ...emptyPlayState(), usedPools: { blessings: 3, fervor: 1 } };
    expect(rest(play, 4).play.usedPools.blessings).toBeUndefined();
  });
});
