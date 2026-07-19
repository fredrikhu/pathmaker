import { describe, it, expect } from 'vitest';
import { spendAction, resetActions, COMMON_ACTIONS, type ActionsUsed } from './actions';
import { nextRound, startEncounter, endEncounter, rest } from './clock';
import { emptyPlayState } from './types';

describe('spendAction', () => {
  const fresh: ActionsUsed = {};

  it('spends each of the three action types once', () => {
    expect(spendAction(fresh, 'standard')).toMatchObject({ ok: true, used: { standard: true } });
    expect(spendAction(fresh, 'move')).toMatchObject({ ok: true, used: { move: true } });
    expect(spendAction(fresh, 'swift')).toMatchObject({ ok: true, used: { swift: true } });
  });

  it('refuses a second action of the same type', () => {
    expect(spendAction({ standard: true }, 'standard').ok).toBe(false);
    expect(spendAction({ swift: true }, 'swift').ok).toBe(false);
  });

  it('leaves the budget unchanged when an action does not fit', () => {
    const used: ActionsUsed = { standard: true };
    const r = spendAction(used, 'standard');
    expect(r.ok).toBe(false);
    expect(r.used).toBe(used); // same reference — nothing spent
  });

  it('lets you take a move in place of your standard action', () => {
    // Move already spent, standard still free → the second move downgrades the standard.
    const r = spendAction({ move: true }, 'move');
    expect(r.ok).toBe(true);
    expect(r.used).toEqual({ move: true, standard: true });
    expect(r.note).toContain('second move');
  });

  it('will not downgrade when the standard is already gone', () => {
    expect(spendAction({ move: true, standard: true }, 'move').ok).toBe(false);
  });

  it('a full-round action needs both the standard and the move free', () => {
    expect(spendAction(fresh, 'full-round')).toMatchObject({ ok: true, used: { standard: true, move: true } });
    expect(spendAction({ move: true }, 'full-round').ok).toBe(false);
    expect(spendAction({ standard: true }, 'full-round').ok).toBe(false);
  });

  it('leaves the swift untouched by a full-round, and vice versa', () => {
    // A full-round action still lets you take a swift.
    const after = spendAction(fresh, 'full-round').used;
    expect(spendAction(after, 'swift').ok).toBe(true);
    // A swift does not consume the standard or move.
    const swift = spendAction(fresh, 'swift').used;
    expect(spendAction(swift, 'full-round').ok).toBe(true);
  });

  it('resetActions clears everything', () => {
    expect(resetActions()).toEqual({});
  });
});

describe('common actions', () => {
  it('has unique ids and valid costs', () => {
    const costs = new Set(['standard', 'move', 'swift', 'full-round']);
    const ids = new Set<string>();
    for (const a of COMMON_ACTIONS) {
      expect(ids.has(a.id), `duplicate ${a.id}`).toBe(false);
      ids.add(a.id);
      expect(costs.has(a.cost), `${a.id} cost`).toBe(true);
    }
  });

  it('a full attack is a full-round action, a single attack is a standard', () => {
    expect(COMMON_ACTIONS.find((a) => a.id === 'full-attack')!.cost).toBe('full-round');
    expect(COMMON_ACTIONS.find((a) => a.id === 'attack')!.cost).toBe('standard');
  });

  it('directing a sphere is a move action', () => {
    expect(COMMON_ACTIONS.find((a) => a.id === 'redirect')!.cost).toBe('move');
  });
});

describe('the clock refreshes the budget', () => {
  const spent = { ...emptyPlayState(), round: 1, actionsUsed: { standard: true, move: true } };

  it('a new round is a new turn', () => {
    expect(nextRound(spent).play.actionsUsed).toEqual({});
  });

  it('starting and ending an encounter clears the budget', () => {
    expect(startEncounter(spent, 15).actionsUsed).toEqual({});
    expect(endEncounter(spent).actionsUsed).toEqual({});
  });

  it('a rest clears it too', () => {
    expect(rest(spent).play.actionsUsed).toEqual({});
  });
});
