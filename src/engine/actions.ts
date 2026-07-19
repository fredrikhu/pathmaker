// The turn's action economy. Pure functions over the `actionsUsed` budget: the mat spends and
// resets, the engine decides what a cost consumes and whether it fits. Rules verified against
// d20pfsrd (Combat → The Types of Actions).
//
// A turn hands out one standard, one move, and one swift action. Free actions and the 5-foot step
// are not budgeted — the rules cap them loosely, so counting them would be noise, not help.

import type { ActionType } from './types';

/** What an action costs. `full-round` consumes both standard and move (a full attack, a charge);
 *  `standard-or-move` is the common case of "a standard action, but I might spend it as a move". */
export type ActionCost = ActionType | 'full-round';

export type ActionsUsed = Partial<Record<ActionType, boolean>>;

export interface SpendResult {
  used: ActionsUsed;
  /** Whether the action fit in what the turn had left. When false, `used` is unchanged. */
  ok: boolean;
  /** Plain-language note for the log — e.g. the standard-as-move downgrade. */
  note: string;
}

const has = (u: ActionsUsed, a: ActionType) => u[a] === true;

/** Spend an action against the turn's budget, applying the rules that let one slot cover another:
 *  a move you no longer have can be paid for by downgrading your standard action ("you can take a
 *  move action in place of a standard action"). A full-round needs both standard and move free. */
export function spendAction(used: ActionsUsed, cost: ActionCost): SpendResult {
  const fail = (note: string): SpendResult => ({ used, ok: false, note });

  switch (cost) {
    case 'standard':
      if (has(used, 'standard')) return fail('No standard action left this turn.');
      return { used: { ...used, standard: true }, ok: true, note: 'standard action' };

    case 'move':
      if (!has(used, 'move')) return { used: { ...used, move: true }, ok: true, note: 'move action' };
      // Move already spent — you may take a move in place of your standard action.
      if (!has(used, 'standard')) {
        return { used: { ...used, standard: true }, ok: true, note: 'move action (spent your standard action as a second move)' };
      }
      return fail('No move action left, and your standard is already spent.');

    case 'swift':
      if (has(used, 'swift')) return fail('You can take only one swift action per turn.');
      return { used: { ...used, swift: true }, ok: true, note: 'swift action' };

    case 'full-round':
      if (has(used, 'standard') || has(used, 'move')) {
        return fail('A full-round action needs both your standard and move actions.');
      }
      return { used: { ...used, standard: true, move: true }, ok: true, note: 'full-round action' };
  }
}

/** Clear the budget — the start of a new turn. */
export function resetActions(): ActionsUsed {
  return {};
}

export interface ActionDef {
  id: string;
  name: string;
  cost: ActionCost;
  note?: string;
}

/** Common turn actions offered as quick buttons on the mat. Not exhaustive — the buttons cover the
 *  frequent cases, and the bare standard/move/swift toggles handle anything not listed. */
export const COMMON_ACTIONS: ActionDef[] = [
  { id: 'attack', name: 'Attack', cost: 'standard', note: 'a single attack' },
  { id: 'full-attack', name: 'Full attack', cost: 'full-round' },
  { id: 'cast', name: 'Cast a spell', cost: 'standard', note: 'most spells; a 1-round spell is full-round' },
  { id: 'move', name: 'Move', cost: 'move', note: 'up to your speed' },
  { id: 'redirect', name: 'Direct a sphere', cost: 'move', note: 'redirect spiritual weapon or flaming sphere' },
  { id: 'draw', name: 'Draw / sheathe', cost: 'move' },
  { id: 'swift', name: 'Swift action', cost: 'swift' },
];
