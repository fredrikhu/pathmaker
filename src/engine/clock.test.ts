import { describe, it, expect } from 'vitest';
import {
  advanceTime, nextRound, startEncounter, endEncounter, addTimer, removeTimer, rest,
  durationLabel, ROUNDS_PER_MINUTE, ROUNDS_PER_HOUR, REST_ROUNDS,
} from './clock';
import { emptyPlayState, type PlayState, type Timer } from './types';

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

describe('rest', () => {
  it('restores daily resources and ends any encounter', () => {
    const p = play({
      hpDamage: 12, nonlethal: 3, tempHp: 5, round: 4, initiative: 9,
      usedSlots: { wizard: { 1: 2 } }, usedPools: { rage: 4 }, castPrepared: { wizard: { 1: [0] } },
    });
    const { play: next } = rest(p);
    expect(next.hpDamage).toBe(0);
    expect(next.nonlethal).toBe(0);
    expect(next.tempHp).toBe(0);
    expect(next.usedSlots).toEqual({});
    expect(next.usedPools).toEqual({});
    expect(next.castPrepared).toEqual({});
    expect(next.round).toBe(0);
    expect(next.initiative).toBeNull();
  });

  it('keeps prepared spells (rest clears what was cast, not the preparation)', () => {
    const p = play({ prepared: { wizard: { 1: ['magic-missile'] } }, castPrepared: { wizard: { 1: [0] } } });
    const { play: next } = rest(p);
    expect(next.prepared).toEqual({ wizard: { 1: ['magic-missile'] } });
    expect(next.castPrepared).toEqual({});
  });

  it('expires effects shorter than 8 hours but keeps longer ones running', () => {
    const p = play({
      conditions: ['shaken'],
      timers: [timer('1hr-buff', ROUNDS_PER_HOUR, 'shaken'), timer('day-buff', 14400)],
    });
    const { play: next, expired } = rest(p);
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
