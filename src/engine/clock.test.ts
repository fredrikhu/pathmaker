import { describe, it, expect } from 'vitest';
import {
  advanceTime, nextRound, startEncounter, endEncounter, addTimer, removeTimer, rest,
  durationLabel, ROUNDS_PER_MINUTE, ROUNDS_PER_HOUR, REST_ROUNDS,
} from './clock';
import { emptyPlayState, normalizePlayState, type PlayState, type Timer } from './types';

const timer = (id: string, remaining: number, conditionId?: string): Timer =>
  ({ id, label: id, remaining, conditionId });

function play(patch: Partial<PlayState> = {}): PlayState {
  return { ...emptyPlayState(), ...patch };
}

describe('duration units', () => {
  it('uses 10 rounds per minute and 600 per hour', () => {
    expect(ROUNDS_PER_MINUTE).toBe(10);
    expect(ROUNDS_PER_HOUR).toBe(600);
    expect(REST_ROUNDS).toBe(4800); // 8 hours
  });

  it('labels a round count as the shortest honest reading', () => {
    expect(durationLabel(1)).toBe('1 round');
    expect(durationLabel(3)).toBe('3 rounds');
    expect(durationLabel(10)).toBe('1 min');
    expect(durationLabel(13)).toBe('1 min 3 rd');
    expect(durationLabel(600)).toBe('1 hr');
    expect(durationLabel(900)).toBe('1 hr 30 min');
    expect(durationLabel(14400)).toBe('1 day');
    expect(durationLabel(0)).toBe('expired');
  });
});

describe('advancing the clock', () => {
  it('counts timers down without touching the round counter', () => {
    const p = play({ timers: [timer('mage-armor', 100)] });
    const { play: next, expired } = advanceTime(p, 40);
    expect(next.timers[0].remaining).toBe(60);
    expect(next.round).toBe(0);
    expect(expired).toEqual([]);
  });

  it('nextRound ticks the counter up and every timer down by one', () => {
    const p = play({ round: 3, timers: [timer('bless', 5), timer('haste', 2)] });
    const { play: next } = nextRound(p);
    expect(next.round).toBe(4);
    expect(next.timers.map((t) => t.remaining)).toEqual([4, 1]);
  });

  it('expires timers that run out and reports them', () => {
    const p = play({ timers: [timer('short', 2), timer('long', 50)] });
    const { play: next, expired } = advanceTime(p, 2);
    expect(expired.map((t) => t.id)).toEqual(['short']);
    expect(next.timers.map((t) => t.id)).toEqual(['long']);
  });

  it('clears the condition an expiring timer was driving', () => {
    const p = play({ conditions: ['shaken', 'prone'], timers: [timer('t1', 2, 'shaken')] });
    const { play: next } = advanceTime(p, 2);
    expect(next.conditions).toEqual(['prone']);
    expect(next.timers).toEqual([]);
  });

  it('keeps a condition alive while another timer still drives it', () => {
    const p = play({
      conditions: ['shaken'],
      timers: [timer('short', 1, 'shaken'), timer('long', 20, 'shaken')],
    });
    const { play: next } = advanceTime(p, 1);
    expect(next.conditions).toEqual(['shaken']);
    expect(next.timers.map((t) => t.id)).toEqual(['long']);
  });

  it('leaves untimed conditions alone', () => {
    const p = play({ conditions: ['blinded'], timers: [timer('t1', 1, 'shaken')] });
    const { play: next } = advanceTime(p, 5);
    expect(next.conditions).toEqual(['blinded']);
  });

  it('is a no-op for zero or negative time', () => {
    const p = play({ timers: [timer('t', 5)] });
    expect(advanceTime(p, 0).play.timers[0].remaining).toBe(5);
  });
});

describe('encounters', () => {
  it('starts at round 1 with the rolled initiative, carrying timers over', () => {
    const p = play({ timers: [timer('mage-armor', 600)] });
    const next = startEncounter(p, 17);
    expect(next.round).toBe(1);
    expect(next.initiative).toBe(17);
    expect(next.timers[0].remaining).toBe(600); // starting combat doesn't burn time
  });

  it('ending an encounter resets the counter but keeps running durations', () => {
    const p = play({ round: 6, initiative: 17, timers: [timer('mage-armor', 500)] });
    const next = endEncounter(p);
    expect(next.round).toBe(0);
    expect(next.initiative).toBeNull();
    expect(next.timers[0].remaining).toBe(500);
  });
});

describe('timers', () => {
  it('adds and removes by id', () => {
    const withOne = addTimer(play(), timer('a', 10));
    expect(withOne.timers.map((t) => t.id)).toEqual(['a']);
    expect(removeTimer(withOne, 'a').timers).toEqual([]);
  });

  it('removing a timer does not clear its condition (cancelling ≠ expiring)', () => {
    const p = play({ conditions: ['shaken'], timers: [timer('a', 10, 'shaken')] });
    expect(removeTimer(p, 'a').conditions).toEqual(['shaken']);
  });
});

describe('older saved documents', () => {
  it('fills in the companion hit-point map that predates it', () => {
    // Play state is persisted with the character, so a document saved before companions had hit
    // points of their own arrives without the field; every reader goes through normalizePlayState.
    const old = { hpDamage: 4, tempHp: 0, nonlethal: 0, usedSlots: {}, conditions: [], usedPools: {} };
    expect(normalizePlayState(old as unknown as PlayState).companions).toEqual({});
    expect(rest(old as unknown as PlayState, 2).play.companions).toEqual({});
  });
});

describe('rest', () => {
  it('restores daily resources and ends any encounter', () => {
    const p = play({
      hpDamage: 12, nonlethal: 3, tempHp: 5, round: 4, initiative: 9,
      usedSlots: { wizard: { 1: 2 } }, usedPools: { rage: 4 }, castPrepared: { wizard: { 1: [0] } },
    });
    const { play: next } = rest(p, 5);
    expect(next.tempHp).toBe(0);
    expect(next.usedSlots).toEqual({});
    expect(next.usedPools).toEqual({});
    expect(next.castPrepared).toEqual({});
    expect(next.round).toBe(0);
    expect(next.initiative).toBeNull();
  });

  it('heals at the natural rate rather than clearing the damage', () => {
    // "With a full night's rest (8 hours of sleep or more), you recover 1 hit point per character
    // level", and nonlethal damage at 1 per hour per level. This used to zero both, which made
    // every night a full heal and removed the decision the rates exist to force.
    const hurt = play({ hpDamage: 12, nonlethal: 30 });
    const { play: next } = rest(hurt, 5);
    expect(next.hpDamage).toBe(7); // 12 − 5
    expect(next.nonlethal).toBe(0); // 5 × 8 hours covers all 30
    const lowLevel = rest(play({ hpDamage: 12, nonlethal: 30 }), 1).play;
    expect(lowLevel.hpDamage).toBe(11);
    expect(lowLevel.nonlethal).toBe(22); // 1 × 8 hours
  });

  it('pays double for a day and night of complete bed rest, and takes the day', () => {
    const { play: next } = rest(play({ hpDamage: 12 }), 4, { bedRest: true });
    expect(next.hpDamage).toBe(4); // 12 − 2 × 4
    const { expired } = rest(play({ timers: [timer('12hr', 12 * ROUNDS_PER_HOUR)] }), 4, { bedRest: true });
    expect(expired.map((t) => t.id)).toEqual(['12hr']);
  });

  it("heals a companion on its own hit dice, not on its master's level", () => {
    // A companion is a separate creature: an 8-HD animal companion recovers 8 hit points a night
    // whatever its master's level, and its nonlethal damage goes at 8 an hour.
    const p = play({
      hpDamage: 20,
      companions: { 'animal-companion': { hpDamage: 30, tempHp: 4, nonlethal: 90 } },
    });
    const { play: next } = rest(p, 3, { companionHd: { 'animal-companion': 8 } });
    expect(next.hpDamage).toBe(17); // the master heals 3, for 3 levels
    expect(next.companions['animal-companion']).toEqual({
      hpDamage: 22, // 30 − 8 hit dice
      nonlethal: 26, // 90 − 8 × 8 hours
      tempHp: 0, // whatever granted them has expired by morning
    });
  });

  it('heals a companion double for a day of bed rest, like anyone else', () => {
    const p = play({ companions: { eidolon: { hpDamage: 30, tempHp: 0, nonlethal: 0 } } });
    const { play: next } = rest(p, 5, { bedRest: true, companionHd: { eidolon: 6 } });
    expect(next.companions.eidolon.hpDamage).toBe(18); // 30 − 2 × 6
  });

  it('leaves a companion alone when the caller does not say what it is', () => {
    // No hit dice for that slot means no healing rather than a guess — and a companion with nothing
    // recorded has nothing to heal in the first place.
    const p = play({ companions: { familiar: { hpDamage: 5, tempHp: 0, nonlethal: 3 } } });
    const { play: next } = rest(p, 5);
    expect(next.companions.familiar).toEqual({ hpDamage: 5, nonlethal: 3, tempHp: 0 });
    expect(rest(play(), 5).play.companions).toEqual({});
  });

  it('keeps prepared spells (rest clears what was cast, not the preparation)', () => {
    const p = play({ prepared: { wizard: { 1: ['magic-missile'] } }, castPrepared: { wizard: { 1: [0] } } });
    const { play: next } = rest(p, 5);
    expect(next.prepared).toEqual({ wizard: { 1: ['magic-missile'] } });
    expect(next.castPrepared).toEqual({});
  });

  it('expires effects shorter than 8 hours but keeps longer ones running', () => {
    const p = play({
      conditions: ['shaken'],
      timers: [timer('1hr-buff', ROUNDS_PER_HOUR, 'shaken'), timer('day-buff', 14400)],
    });
    const { play: next, expired } = rest(p, 5);
    expect(expired.map((t) => t.id)).toEqual(['1hr-buff']);
    expect(next.conditions).toEqual([]);
    expect(next.timers.map((t) => t.id)).toEqual(['day-buff']);
    expect(next.timers[0].remaining).toBe(14400 - REST_ROUNDS);
  });
});

describe('legacy play state', () => {
  it('fills in phase-4 fields missing from older saved docs', () => {
    // A doc saved before phase 4 has no round/initiative/timers.
    const legacy = { hpDamage: 4, tempHp: 0, nonlethal: 0, usedSlots: {}, conditions: [], usedPools: {} } as unknown as PlayState;
    const { play: next } = nextRound(legacy);
    expect(next.round).toBe(1);
    expect(next.timers).toEqual([]);
    expect(next.hpDamage).toBe(4);
  });
});

describe('initiative provenance', () => {
  it('keeps the d20 face alongside the total, so the sheet can show what was luck', () => {
    const p = startEncounter(play(), 17, 12);
    expect(p.initiative).toBe(17);
    expect(p.initiativeRoll).toBe(12);
    // The modifier actually used is recoverable from the pair — the sheet reads it back this way
    // rather than trusting the current modifier, which a mid-fight buff can have changed.
    expect(p.initiative! - p.initiativeRoll!).toBe(5);
  });

  it('records no die when initiative was entered rather than rolled', () => {
    expect(startEncounter(play(), 14).initiativeRoll).toBeNull();
  });

  it('clears the die with the total when combat ends or the night passes', () => {
    const fighting = startEncounter(play(), 17, 12);
    expect(endEncounter(fighting).initiativeRoll).toBeNull();
    expect(rest(fighting, 5).play.initiativeRoll).toBeNull();
  });
});
