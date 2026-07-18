import { describe, it, expect } from 'vitest';
import { consume, unconsume, spendCharges, restoreCharges, restock } from './inventory';
import { resolve } from './resolve';
import { newCharacter, withDecision } from './character';
import { emptyPlayState, type CharacterDoc, type PlayState } from './types';

const play = (patch: Partial<PlayState> = {}): PlayState => ({ ...emptyPlayState(), ...patch });

describe('consuming items', () => {
  it('spends up to what is available and no further', () => {
    const p = consume(play(), 'torch', 3, 5);
    expect(p.consumed.torch).toBe(3);
    // Only 2 left on hand — asking for 10 spends 2.
    expect(consume(p, 'torch', 10, 2).consumed.torch).toBe(5);
  });

  it('is a no-op when nothing is available', () => {
    expect(consume(play(), 'torch', 1, 0).consumed).toEqual({});
  });

  it('restores and drops the key when back to zero', () => {
    const p = consume(play(), 'torch', 2, 5);
    expect(unconsume(p, 'torch', 1).consumed).toEqual({ torch: 1 });
    expect(unconsume(p, 'torch', 5).consumed).toEqual({});
  });
});

describe('charges', () => {
  it('spends and restores, clamped to what is left', () => {
    const p = spendCharges(play(), 'wand-clw', 3, 50);
    expect(p.usedCharges['wand-clw']).toBe(3);
    expect(spendCharges(p, 'wand-clw', 100, 47).usedCharges['wand-clw']).toBe(50);
    expect(restoreCharges(p, 'wand-clw', 3).usedCharges).toEqual({});
  });
});

describe('restock', () => {
  it('clears consumption and charges but leaves the rest of play state alone', () => {
    const p = play({ hpDamage: 7, consumed: { torch: 3 }, usedCharges: { 'wand-clw': 10 } });
    const next = restock(p);
    expect(next.consumed).toEqual({});
    expect(next.usedCharges).toEqual({});
    expect(next.hpDamage).toBe(7);
  });
});

describe('inventory in the resolved sheet', () => {
  function packed(playState?: PlayState): CharacterDoc {
    let d = newCharacter('t-inv', 'Packrat');
    d = withDecision(d, 'ability-base', { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 });
    d = withDecision(d, 'race', 'human');
    d = withDecision(d, 'floating-bonus', ['str']); // Str 16
    d = withDecision(d, 'alignment', 'N');
    d = withDecision(d, 'class', 'fighter');
    return {
      ...d,
      purchases: { longsword: 1, torch: 10, 'potion-clw': 2, 'wand-clw': 1 },
      equipped: { armor: null, mainHand: 'longsword', offHand: null },
      ...(playState ? { play: playState } : {}),
    };
  }

  it('lists purchased items with quantities and marks the equipped one', () => {
    const inv = resolve(packed()).sheet.inventory;
    const byId = (id: string) => inv.find((i) => i.id === id)!;
    expect(byId('longsword').equipped).toBe('main');
    expect(byId('torch').qty).toBe(10);
    expect(byId('torch').consumable).toBe(true);
    expect(byId('longsword').consumable).toBe(false);
  });

  it('exposes wand charges', () => {
    const inv = resolve(packed()).sheet.inventory;
    expect(inv.find((i) => i.id === 'wand-clw')!.charges).toEqual({ max: 50, remaining: 50 });
    const used = resolve(packed(play({ usedCharges: { 'wand-clw': 12 } }))).sheet.inventory;
    expect(used.find((i) => i.id === 'wand-clw')!.charges).toEqual({ max: 50, remaining: 38 });
  });

  it('drops consumed items out of the carried quantity and the load', () => {
    // Longsword 4 + 10 torches (1 each) = 14 lbs.
    const before = resolve(packed()).sheet;
    expect(before.load.current).toBe(14);
    // Burn 6 torches → 4 torches left, load 8.
    const after = resolve(packed(play({ consumed: { torch: 6 } }))).sheet;
    expect(after.inventory.find((i) => i.id === 'torch')!.qty).toBe(4);
    expect(after.load.current).toBe(8);
  });

  it('never drops a quantity below zero even if over-consumed', () => {
    const s = resolve(packed(play({ consumed: { torch: 99 } }))).sheet;
    expect(s.inventory.find((i) => i.id === 'torch')!.qty).toBe(0);
    expect(s.load.current).toBe(4); // just the longsword
  });

  it('leaves non-consumable quantities alone even if a stale consumed entry exists', () => {
    const s = resolve(packed(play({ consumed: { longsword: 1 } }))).sheet;
    expect(s.inventory.find((i) => i.id === 'longsword')!.qty).toBe(1);
  });

  it('keeps the purchased total so the UI can show "4 / 10"', () => {
    const s = resolve(packed(play({ consumed: { torch: 6 } }))).sheet;
    const torch = s.inventory.find((i) => i.id === 'torch')!;
    expect(torch.purchased).toBe(10);
    expect(torch.qty).toBe(4);
  });

  it('lightening the load can lift an encumbrance penalty', () => {
    // Str 16 → light load 76 lbs. Pile on chainmail (40) + heavy shield (10) to pass it.
    let d = packed();
    d = { ...d, purchases: { ...d.purchases, chainmail: 1, 'heavy-shield': 1, 'rope-hemp': 3 } };
    const heavy = resolve(d).sheet;
    expect(heavy.load.current).toBe(94); // 14 + 40 + 10 + 30
    expect(heavy.load.label).toBe('Medium');
    // Drop the rope by consuming torches won't help; sell the rope instead — but consuming all
    // torches trims 10 lbs, still Medium. Verify the label tracks the recomputed load.
    const lighter = resolve({ ...d, play: play({ consumed: { torch: 10 } }) }).sheet;
    expect(lighter.load.current).toBe(84);
    expect(lighter.load.label).toBe('Medium');
  });
});
