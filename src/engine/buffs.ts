// Turning a cast spell into a running effect. Kept in the engine so the play sheet never has to
// know how a spell scales — it asks for a timer and renders what comes back.

import type { SpellDef } from '../content/model';
import type { Ability, IndependentAttacker, Timer } from './types';
import { iterativeBonuses } from './resolve';

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

/** The caster's numbers a self-directed attacker needs at cast time. */
export interface AttackerContext {
  casterLevel: number;
  /** The caster's base attack bonus, which drives the attacker's iteratives. */
  bab: number;
  /** Ability modifiers, so an attacker that adds one (spiritual weapon → Wis) can. */
  abilityMods: Record<Ability, number>;
  /** 10 + the caster's casting-ability modifier; the spell's own DC adds its level. */
  dcBase: number;
}

/** Build the running-effect timer a self-directed attacker spell places on the field, resolved
 *  against the caster at cast time. Null for a spell that summons no attacker. */
export function spellAttackerTimer(spell: SpellDef, ctx: AttackerContext, id: string): Timer | null {
  const a = spell.attacker;
  if (!a) return null;
  const cl = Math.max(1, Math.floor(ctx.casterLevel));
  const { damage, rounds } = a.at(cl);
  const attacker: IndependentAttacker = a.attacks
    ? {
        // It strikes with the caster's BAB (with iteratives) plus, for spiritual weapon, Wisdom.
        attackBonuses: iterativeBonuses(ctx.bab + (a.attackAbility ? ctx.abilityMods[a.attackAbility] : 0), ctx.bab),
        ...(a.crit ? { crit: a.crit } : {}),
        damage, dmgType: a.dmgType,
      }
    : {
        damage, dmgType: a.dmgType,
        ...(a.save ? { save: `${a.save.replace(/ (negates|half)$/i, '')} DC ${ctx.dcBase + spell.level}${/half$/i.test(a.save) ? ' halves' : ' negates'}` } : {}),
      };
  return { id, label: `${spell.name} (CL ${cl})`, remaining: rounds, spellId: spell.id, attacker };
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
