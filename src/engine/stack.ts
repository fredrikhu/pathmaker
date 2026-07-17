// Typed-bonus stacking — the one function every displayed total goes through.
import type { BreakdownLine, Effect } from './types';
import { STACKING_TYPES } from './types';

export interface Contribution {
  type: Effect['type'];
  value: number;
  note: string;
}

export interface Stacked {
  total: number;
  lines: BreakdownLine[];
}

/**
 * PF1e stacking: bonuses of the same type don't stack (highest wins), except
 * dodge/circumstance/untyped bonuses and all penalties, which always stack.
 * 'base' contributions (class base save, armor's own AC, ability modifiers…)
 * always add; they are structural, not bonuses.
 */
export function stack(contribs: Contribution[]): Stacked {
  const lines: BreakdownLine[] = [];
  let total = 0;
  const bestOfType = new Map<string, Contribution>();

  for (const c of contribs) {
    if (c.value === 0) continue;
    if (STACKING_TYPES.has(c.type) || c.value < 0) {
      total += c.value;
      lines.push({ label: c.note, value: c.value });
    } else {
      const prev = bestOfType.get(c.type);
      if (!prev || c.value > prev.value) bestOfType.set(c.type, c);
    }
  }
  for (const c of bestOfType.values()) {
    total += c.value;
    lines.push({ label: c.note, value: c.value });
  }
  return { total, lines };
}
