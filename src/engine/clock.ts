// Phase 4 — time & campaign clock. Pure functions over PlayState: the UI dispatches these and
// renders the result, keeping the "UI does zero rules math" rule intact.
//
// Everything is stored in combat rounds (6 seconds) so the clock has one unit; callers convert
// at the edges via ROUNDS_PER_*. Timers count down as time passes; an expiring timer clears any
// condition it was driving, so timed conditions flow back through resolve() unchanged.

import { normalizePlayState, type PlayState, type Timer } from './types';
import { naturalHealing } from './vitals';

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
  // Expiring a linked timer clears its condition — on the creature it was running on, and only when
  // no other live timer on that same creature still drives it. The scope is part of the key because
  // a wolf and its druid can both be entangled, on their own clocks.
  // Slot ids and condition ids are both kebab-case catalogue ids, so "::" cannot occur in either
  // and the pair round-trips as one string.
  const key = (slot: string | undefined, conditionId: string) => `${slot ?? ''}::${conditionId}`;
  const stillDriven = new Set(kept.filter((t) => t.conditionId).map((t) => key(t.companionSlot, t.conditionId!)));
  const cleared = new Set(expired.filter((t) => t.conditionId)
    .map((t) => key(t.companionSlot, t.conditionId!))
    .filter((k) => !stillDriven.has(k)));
  if (cleared.size === 0) return { play: { ...play, timers: kept }, expired };
  const conditions = play.conditions.filter((c) => !cleared.has(key(undefined, c)));
  // Only the companions whose conditions actually changed are rebuilt.
  const companions = Object.fromEntries(Object.entries(play.companions).map(([slot, st]) => {
    const left = (st.conditions ?? []).filter((c) => !cleared.has(key(slot, c)));
    return [slot, left.length === (st.conditions ?? []).length ? st : { ...st, conditions: left }];
  }));
  return { play: { ...play, timers: kept, conditions, companions }, expired };
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

/** Begin an encounter at round 1 with the given initiative. `roll` is the d20 face behind that
 *  total, kept so the sheet can show what was luck and what was the character; pass null when the
 *  initiative was entered rather than rolled. Timers carry over — a buff cast before the fight is
 *  still running. */
export function startEncounter(play: PlayState, initiative: number, roll: number | null = null): PlayState {
  return { ...normalizePlayState(play), round: 1, initiative, initiativeRoll: roll, actionsUsed: {} };
}

/** Leave combat. Durations keep running (they're tracked in rounds either way). */
export function endEncounter(play: PlayState): PlayState {
  return { ...normalizePlayState(play), round: 0, initiative: null, initiativeRoll: null, actionsUsed: {} };
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

/** A night's rest: restore the daily resources, heal at the **natural healing** rates, then let the
 *  time pass so running effects expire naturally. Conditions the user set by hand are left alone —
 *  clearing them is their call.
 *
 *  A night is not a full heal. "With a full night's rest (8 hours of sleep or more), you recover 1
 *  hit point per character level", and nonlethal damage goes at 1 per hour per level; `bedRest` is
 *  the full day and night that pays double. This used to zero `hpDamage`, which quietly removed the
 *  decision those rates exist to force — whether the party can press on tomorrow.
 *
 *  Temporary hit points go, because whatever granted them has expired by morning. */
export function rest(
  play: PlayState, level: number,
  opts: { bedRest?: boolean; companionHd?: Record<string, number> } = {},
): AdvanceResult {
  const p = normalizePlayState(play);
  const hours = opts.bedRest ? 24 : 8;
  const healed = naturalHealing(level, hours, opts.bedRest);
  // A companion sleeps too, and heals on its own hit dice rather than its master's level — it is a
  // separate creature. Its hit dice come in from the caller, which is the only thing that knows the
  // resolved companion blocks. A companion with no entry heals nothing, which is right: a slot with
  // no damage recorded has nothing to heal.
  const companions = Object.fromEntries(Object.entries(p.companions).map(([slotId, st]) => {
    const hd = opts.companionHd?.[slotId];
    const rate = hd ? naturalHealing(hd, hours, opts.bedRest) : { hp: 0, nonlethal: 0 };
    // Spread the rest of the creature's state: a night heals it, it does not clear the conditions
    // someone set by hand — the same courtesy the character's own conditions get.
    return [slotId, {
      ...st,
      hpDamage: Math.max(0, st.hpDamage - rate.hp),
      nonlethal: Math.max(0, st.nonlethal - rate.nonlethal),
      tempHp: 0,
    }];
  }));
  const restored: PlayState = {
    ...p,
    hpDamage: Math.max(0, p.hpDamage - healed.hp),
    nonlethal: Math.max(0, p.nonlethal - healed.nonlethal),
    tempHp: 0,
    companions,
    usedSlots: {}, usedPools: {}, castPrepared: {}, castBonus: {},
    round: 0, initiative: null, initiativeRoll: null, actionsUsed: {},
  };
  return tick(restored, hours * ROUNDS_PER_HOUR);
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
