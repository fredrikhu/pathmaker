// Phase 4 — time & campaign clock. Pure functions over PlayState: the UI dispatches these and
// renders the result, keeping the "UI does zero rules math" rule intact.
//
// Everything is stored in combat rounds (6 seconds) so the clock has one unit; callers convert
// at the edges via ROUNDS_PER_*. Timers count down as time passes; an expiring timer clears any
// condition it was driving, so timed conditions flow back through resolve() unchanged.

import { normalizePlayState, type PlayState, type Timer } from './types';

export const ROUNDS_PER_MINUTE = 10;
export const ROUNDS_PER_HOUR = 600;
export const ROUNDS_PER_DAY = 14400;

/** An 8-hour night's rest, in rounds — the span that restores daily resources. */
export const REST_ROUNDS = 8 * ROUNDS_PER_HOUR;

export interface AdvanceResult {
  play: PlayState;
  /** Timers that ran out during this advance (for a "Mage Armor expired" notice). */
  expired: Timer[];
}

/** Count every timer down by `rounds`, dropping those that run out and clearing the conditions
 *  they drove. Never advances the round counter — callers decide whether this is combat time. */
function tick(play: PlayState, rounds: number): AdvanceResult {
  if (rounds <= 0) return { play, expired: [] };
  const expired: Timer[] = [];
  const kept: Timer[] = [];
  for (const t of play.timers) {
    const remaining = t.remaining - rounds;
    if (remaining <= 0) expired.push(t);
    else kept.push({ ...t, remaining });
  }
  // Expiring a linked timer clears its condition — unless another live timer still drives it.
  const stillDriven = new Set(kept.map((t) => t.conditionId).filter(Boolean) as string[]);
  const cleared = new Set(expired.map((t) => t.conditionId).filter((c): c is string => !!c && !stillDriven.has(c)));
  const conditions = cleared.size > 0 ? play.conditions.filter((c) => !cleared.has(c)) : play.conditions;
  return { play: { ...play, timers: kept, conditions }, expired };
}

/** Advance out-of-combat time (exploration, downtime). Leaves the round counter alone. */
export function advanceTime(play: PlayState, rounds: number): AdvanceResult {
  return tick(normalizePlayState(play), rounds);
}

/** Take the next combat round: the round counter ticks up and every timer counts down by one. */
export function nextRound(play: PlayState): AdvanceResult {
  const p = normalizePlayState(play);
  const { play: ticked, expired } = tick(p, 1);
  // A new round is a new turn: the action budget refreshes.
  return { play: { ...ticked, round: p.round + 1, actionsUsed: {} }, expired };
}

/** Begin an encounter at round 1 with the given initiative. Timers carry over — a buff cast
 *  before the fight is still running. */
export function startEncounter(play: PlayState, initiative: number): PlayState {
  return { ...normalizePlayState(play), round: 1, initiative, actionsUsed: {} };
}

/** Leave combat. Durations keep running (they're tracked in rounds either way). */
export function endEncounter(play: PlayState): PlayState {
  return { ...normalizePlayState(play), round: 0, initiative: null, actionsUsed: {} };
}

export function addTimer(play: PlayState, timer: Timer): PlayState {
  const p = normalizePlayState(play);
  return { ...p, timers: [...p.timers, timer] };
}

/** Remove a timer by id. Does not clear a linked condition — cancelling the countdown isn't the
 *  same as the effect ending, so the condition stays until the user says otherwise. */
export function removeTimer(play: PlayState, id: string): PlayState {
  const p = normalizePlayState(play);
  return { ...p, timers: p.timers.filter((t) => t.id !== id) };
}

/** A night's rest: restore the daily resources, then let 8 hours pass so running effects expire
 *  naturally. Conditions the user set by hand are left alone — clearing them is their call. */
export function rest(play: PlayState): AdvanceResult {
  const p = normalizePlayState(play);
  const restored: PlayState = {
    ...p,
    hpDamage: 0, nonlethal: 0, tempHp: 0,
    usedSlots: {}, usedPools: {}, castPrepared: {}, castBonus: {},
    round: 0, initiative: null, actionsUsed: {},
  };
  return tick(restored, REST_ROUNDS);
}

/** "3 rounds", "2 min", "1 hr 30 min", "2 days" — the shortest honest reading of a round count. */
export function durationLabel(rounds: number): string {
  if (rounds <= 0) return 'expired';
  if (rounds < ROUNDS_PER_MINUTE) return `${rounds} round${rounds === 1 ? '' : 's'}`;
  if (rounds < ROUNDS_PER_HOUR) {
    const min = Math.floor(rounds / ROUNDS_PER_MINUTE);
    const rem = rounds % ROUNDS_PER_MINUTE;
    return rem ? `${min} min ${rem} rd` : `${min} min`;
  }
  if (rounds < ROUNDS_PER_DAY) {
    const hr = Math.floor(rounds / ROUNDS_PER_HOUR);
    const min = Math.floor((rounds % ROUNDS_PER_HOUR) / ROUNDS_PER_MINUTE);
    return min ? `${hr} hr ${min} min` : `${hr} hr`;
  }
  const days = Math.floor(rounds / ROUNDS_PER_DAY);
  const hr = Math.floor((rounds % ROUNDS_PER_DAY) / ROUNDS_PER_HOUR);
  return hr ? `${days} day${days === 1 ? '' : 's'} ${hr} hr` : `${days} day${days === 1 ? '' : 's'}`;
}
