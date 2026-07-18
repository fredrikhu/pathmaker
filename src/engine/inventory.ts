// Phase 5 — live inventory actions. Pure functions over PlayState, mirroring clock.ts: the play
// sheet dispatches these and renders `sheet.inventory`, which resolve() derives from the build's
// purchases minus what has been consumed. Nothing here knows about React.

import { normalizePlayState, type PlayState } from './types';

/** Use `n` of a consumable. Never spends more than `available` (what is still on hand). */
export function consume(play: PlayState, itemId: string, n: number, available: number): PlayState {
  const p = normalizePlayState(play);
  const spend = Math.min(Math.max(0, n), Math.max(0, available));
  if (spend === 0) return p;
  return { ...p, consumed: { ...p.consumed, [itemId]: (p.consumed[itemId] ?? 0) + spend } };
}

/** Put `n` back (picked an arrow back up, undid a misclick). Never restores past the purchased total. */
export function unconsume(play: PlayState, itemId: string, n: number): PlayState {
  const p = normalizePlayState(play);
  const next = Math.max(0, (p.consumed[itemId] ?? 0) - Math.max(0, n));
  const consumed = { ...p.consumed };
  if (next === 0) delete consumed[itemId];
  else consumed[itemId] = next;
  return { ...p, consumed };
}

/** Spend charges from a wand, clamped to what the item has left. */
export function spendCharges(play: PlayState, itemId: string, n: number, remaining: number): PlayState {
  const p = normalizePlayState(play);
  const spend = Math.min(Math.max(0, n), Math.max(0, remaining));
  if (spend === 0) return p;
  return { ...p, usedCharges: { ...p.usedCharges, [itemId]: (p.usedCharges[itemId] ?? 0) + spend } };
}

/** Restore charges (misclick, or a recharged item). */
export function restoreCharges(play: PlayState, itemId: string, n: number): PlayState {
  const p = normalizePlayState(play);
  const next = Math.max(0, (p.usedCharges[itemId] ?? 0) - Math.max(0, n));
  const usedCharges = { ...p.usedCharges };
  if (next === 0) delete usedCharges[itemId];
  else usedCharges[itemId] = next;
  return { ...p, usedCharges };
}

/** Restock everything to the purchased amounts — a shopping trip, not a rest.
 *  Rest deliberately does NOT do this: a night's sleep doesn't refill your potion belt. */
export function restock(play: PlayState): PlayState {
  return { ...normalizePlayState(play), consumed: {}, usedCharges: {} };
}
