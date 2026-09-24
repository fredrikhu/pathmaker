import { describe, it, expect } from 'vitest';
import { spendAction, resetActions, COMMON_ACTIONS, COMPANION_ACTIONS, type ActionsUsed } from './actions';
import { nextRound, startEncounter, endEncounter, rest } from './clock';
import { emptyPlayState, type PlayState } from './types';

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
    expect(rest(spent, 5).play.actionsUsed).toEqual({});
  });
});

/** A play state with the given patch over the empty one. */
function play(patch: Partial<PlayState> = {}): PlayState {
  return { ...emptyPlayState(), ...patch };
}

describe("a companion's own turn", () => {
  // A companion acts on its own initiative with its own standard, move and swift action, so the
  // budget cannot be a share of its master's — and the round hands one to every creature at once.
  const inFight = (): PlayState => play({
    round: 3,
    actionsUsed: { standard: true, move: true },
    companions: {
      'animal-companion': { hpDamage: 0, tempHp: 0, nonlethal: 0, actionsUsed: { standard: true } },
      familiar: { hpDamage: 0, tempHp: 0, nonlethal: 0, actionsUsed: { move: true, swift: true } },
    },
  });

  it('refreshes every creature on the next round', () => {
    const { play: next } = nextRound(inFight());
    expect(next.round).toBe(4);
    expect(next.actionsUsed).toEqual({});
    expect(next.companions['animal-companion'].actionsUsed).toEqual({});
    expect(next.companions.familiar.actionsUsed).toEqual({});
  });

  it('refreshes them when a fight starts and when it ends', () => {
    expect(startEncounter(inFight(), 17).companions['animal-companion'].actionsUsed).toEqual({});
    expect(endEncounter(inFight()).companions.familiar.actionsUsed).toEqual({});
  });

  it('keeps everything else about the creature while clearing the budget', () => {
    const p = play({
      companions: { familiar: { hpDamage: 9, tempHp: 2, nonlethal: 3, conditions: ['shaken'], actionsUsed: { swift: true } } },
    });
    const next = nextRound(p).play.companions.familiar;
    expect(next).toEqual({ hpDamage: 9, tempHp: 2, nonlethal: 3, conditions: ['shaken'], actionsUsed: {} });
  });

  it('leaves a creature that has not acted untouched, rather than writing an empty budget', () => {
    // A companion nothing has happened to keeps its single entry unchanged, so the document does not
    // grow a field per creature per round.
    const p = play({ companions: { familiar: { hpDamage: 0, tempHp: 0, nonlethal: 0 } } });
    expect(nextRound(p).play.companions.familiar).toEqual({ hpDamage: 0, tempHp: 0, nonlethal: 0 });
  });

  it('hands out a fresh turn after a rest as well', () => {
    const next = rest(inFight(), 5, { companionHd: { 'animal-companion': 8 } }).play;
    expect(next.actionsUsed).toEqual({});
    expect(next.companions['animal-companion'].actionsUsed).toEqual({});
  });

  it('spends a companion action by the same rules as anyone else', () => {
    // The budget is spent through `spendAction`, so the rule that a move can be paid for by
    // downgrading the standard action, and the one that a full-round action needs both, hold for a
    // wolf exactly as they do for its druid.
    const start = inFight().companions['animal-companion'].actionsUsed!;
    expect(spendAction(start, 'standard').ok).toBe(false);
    expect(spendAction(start, 'move')).toEqual({ used: { standard: true, move: true }, ok: true, note: 'move action' });
    expect(spendAction(start, 'full-round').ok).toBe(false);
    expect(spendAction({}, 'full-round').used).toEqual({ standard: true, move: true });
  });

  it('offers only actions a creature can take, and marks the three that cost a whole turn', () => {
    // A wolf casts nothing and draws nothing; charging, withdrawing and running are all full-round
    // actions, which is the thing a handler forgets.
    const byId = Object.fromEntries(COMPANION_ACTIONS.map((a) => [a.id, a.cost]));
    expect(byId).toEqual({
      attack: 'standard', 'full-attack': 'full-round', charge: 'full-round',
      move: 'move', withdraw: 'full-round', run: 'full-round',
    });
    expect(COMPANION_ACTIONS.every((a) => a.note)).toBe(true);
  });
});
