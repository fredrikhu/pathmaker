// Turning a cast spell into a running effect. Kept in the engine so the play sheet never has to
// know how a spell scales — it asks for a timer and renders what comes back.

import type { SpellDef } from '../content/model';
import type { Timer } from './types';

/** Build the running-effect timer a buff spell starts, resolved at the caster level it was cast at.
 *  Returns null for a spell with no engine-computable effect, which is most of them. */
export function spellBuffTimer(spell: SpellDef, casterLevel: number, id: string): Timer | null {
  if (!spell.buff) return null;
  // Caster level 0 is not a thing you can cast at; guard so a half-built character cannot produce
  // a zero-round timer that expires the instant it starts.
  const cl = Math.max(1, Math.floor(casterLevel));
  const { effects, rounds, dr, resistances } = spell.buff.at(cl);
  return {
    id, label: `${spell.name} (CL ${cl})`, remaining: rounds, effects, spellId: spell.id,
    ...(dr?.length ? { dr } : {}),
    ...(resistances?.length ? { resistances } : {}),
  };
}

/** The damage (or healing) a spell rolls at a given caster level, with any caveat the formula
 *  alone does not carry. Null when the spell's damage is not a plain rollable formula. */
export function spellDamageAt(spell: SpellDef, casterLevel: number): { formula: string; label: string; note?: string } | null {
  if (!spell.damage) return null;
  const cl = Math.max(1, Math.floor(casterLevel));
  return {
    formula: spell.damage.at(cl),
    label: spell.damage.label ?? 'damage',
    ...(spell.damage.note ? { note: spell.damage.note(cl) } : {}),
  };
}
