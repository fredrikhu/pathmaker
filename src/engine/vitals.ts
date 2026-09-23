// Hit points as *state*: what a character's numbers mean, and what a point of damage or healing
// does to them. `damage.ts` decides how much of an incoming hit gets through; this decides where it
// lands and what condition the character is left in.
//
// Every rule here is from d20pfsrd (Combat → Injury and Death, Healing, Nonlethal Damage), quoted
// where the wording is what makes the arithmetic non-obvious.
//
// One rule is deliberately reported rather than applied: a dying character "loses 1 hit point every
// round — this continues until the character dies or becomes stable". Whether they are stable is not
// in the document (it turns on a Constitution check, a Heal check or a point of healing at the
// table), so a round tick that silently bled the character would be wrong as often as right. The
// status carries the rate and the check instead.

/** The hit-point half of PlayState, plus the two build numbers the rules measure it against. */
export interface VitalsInput {
  maxHp: number;
  hpDamage: number;
  tempHp: number;
  nonlethal: number;
  /** The Constitution *score*, which is where the death threshold comes from — not the modifier,
   *  and not maximum hit points. */
  conScore: number;
}

/** The state the numbers put the character in, worst first. `staggered` and `unconscious` here are
 *  the nonlethal ones; a character at exactly 0 hit points is `disabled`, which is also staggered. */
export type VitalStatus = 'healthy' | 'staggered' | 'unconscious' | 'disabled' | 'dying' | 'dead';

export interface Vitals {
  /** Hit points as the sheet prints them: maximum less damage. Temporary hit points sit beside
   *  this rather than in it, so losing them cannot look like taking damage. */
  current: number;
  /** Current plus temporary — the total nonlethal damage is measured against, since temporary hit
   *  points "are in addition to the character's current hit point total". */
  effective: number;
  status: VitalStatus;
  /** The hit-point total at which this character dies: −(Constitution score). */
  deathAt: number;
  /** What the status means at the table, in one line. It does not repeat the status word — a
   *  renderer prints the status itself, and "Dying — Dying — unconscious…" reads like a stammer. */
  note: string;
  /** While dying: the Constitution check to become stable, and the penalty on it ("equal to his
   *  negative hit point total"). */
  stabilize?: { dc: number; penalty: number };
  /** Nonlethal damage has reached maximum hit points, so "all further nonlethal damage is treated
   *  as lethal damage". */
  nonlethalIsLethal: boolean;
}

/** The DC of the Constitution check a dying character makes each round to become stable. */
export const STABILIZE_DC = 10;

/** Read a character's condition off their hit-point state.
 *
 *  The order matters and is the rules' own: a negative total is judged before nonlethal damage,
 *  because a dying character is already unconscious and bruises no longer decide anything. */
export function vitals(input: VitalsInput): Vitals {
  const maxHp = Math.max(0, Math.round(input.maxHp));
  const current = maxHp - Math.round(input.hpDamage);
  const tempHp = Math.max(0, Math.round(input.tempHp));
  const nonlethal = Math.max(0, Math.round(input.nonlethal));
  const deathAt = -Math.max(0, Math.round(input.conScore));
  const effective = current + tempHp;
  const nonlethalIsLethal = maxHp > 0 && nonlethal >= maxHp;

  // "When your character's current hit points drop to a negative amount equal to his Constitution
  // score or lower … he's dead."
  if (current <= deathAt) {
    return { current, effective, status: 'dead', deathAt, nonlethalIsLethal,
      note: `a negative total of ${-deathAt} (your Constitution score) or worse.` };
  }
  // "If your hit point total is negative, but not equal to or greater than your Constitution score,
  // you're dying." Unconscious, no actions, and 1 hit point a round until dead or stable.
  if (current < 0) {
    return {
      current, effective, status: 'dying', deathAt, nonlethalIsLethal,
      note: `unconscious, and losing 1 hp a round until stable. Dead at −${-deathAt}.`,
      stabilize: { dc: STABILIZE_DC, penalty: current },
    };
  }
  // "When your current hit point total drops to exactly 0, you are disabled." Staggered: one move
  // or standard action, and a strenuous one costs another hit point.
  if (current === 0) {
    return { current, effective, status: 'disabled', deathAt, nonlethalIsLethal,
      note: 'staggered — a single move or standard action a round, and a strenuous one costs 1 hp, which starts you dying.' };
  }
  // "When your nonlethal damage equals your current hit points, you're staggered, and when it
  // exceeds your current hit points, you fall unconscious."
  if (nonlethal > effective) {
    return { current, effective, status: 'unconscious', deathAt, nonlethalIsLethal,
      note: `nonlethal damage (${nonlethal}) exceeds your hit points (${effective}), so you are out cold and helpless.` };
  }
  if (nonlethal > 0 && nonlethal === effective) {
    return { current, effective, status: 'staggered', deathAt, nonlethalIsLethal,
      note: `nonlethal damage equals your hit points (${nonlethal}); a single action a round until your hit points exceed it again.` };
  }
  return { current, effective, status: 'healthy', deathAt, nonlethalIsLethal, note: '' };
}

/** The three hit-point fields, which is all any of these functions touch. */
export interface HpState {
  hpDamage: number;
  tempHp: number;
  nonlethal: number;
}

/** Apply lethal damage: temporary hit points go first ("any damage taken by the character is
 *  subtracted from these hit points first"), and the rest becomes real damage. Damage past the
 *  death threshold is still recorded — how far below zero you are is what decides whether you are
 *  dying or dead. */
export function takeLethal(state: HpState, amount: number): HpState {
  const n = Math.max(0, Math.round(amount));
  const absorbed = Math.min(state.tempHp, n);
  return { ...state, tempHp: state.tempHp - absorbed, hpDamage: state.hpDamage + (n - absorbed) };
}

/** Apply nonlethal damage. It is tracked separately and never subtracted from hit points — but
 *  "if a creature's nonlethal damage is equal to his total maximum hit points, all further
 *  nonlethal damage is treated as lethal damage", so the overflow past the maximum lands as real
 *  damage instead. Temporary hit points are not spent by nonlethal damage (nothing is subtracted
 *  from hit points); they raise the total it is measured against, which `vitals` handles. */
export function takeNonlethal(state: HpState, amount: number, maxHp: number): HpState {
  const n = Math.max(0, Math.round(amount));
  if (n === 0) return state;
  const room = Math.max(0, Math.round(maxHp) - state.nonlethal);
  const asNonlethal = Math.min(n, room);
  const asLethal = n - asNonlethal;
  const next = { ...state, nonlethal: state.nonlethal + asNonlethal };
  return asLethal > 0 ? takeLethal(next, asLethal) : next;
}

/** Magical or ability healing. "You can never recover more hit points than you lost", and "when a
 *  spell or ability cures hit point damage, it also removes an equal amount of nonlethal damage" —
 *  so one cure touches both pools, up to what it heals of each. Temporary hit points are never
 *  restored this way: "when temporary hit points are lost, they cannot be restored as real hit
 *  points can be, even by magic." */
export function heal(state: HpState, amount: number): HpState {
  const n = Math.max(0, Math.round(amount));
  return {
    ...state,
    hpDamage: Math.max(0, state.hpDamage - n),
    nonlethal: Math.max(0, state.nonlethal - n),
  };
}

/** What a stretch of rest heals, by the natural healing rates: **1 hit point per character level**
 *  for a full night's sleep (twice that for a full day and night of complete bed rest), and
 *  nonlethal damage at **1 hit point per hour per character level**. A night's rest is emphatically
 *  not a full heal — how much a party can press on is exactly the decision these rates govern. */
export function naturalHealing(level: number, hours: number, bedRest = false): { hp: number; nonlethal: number } {
  const lvl = Math.max(1, Math.floor(level));
  const hrs = Math.max(0, hours);
  // A night's healing is earned by the night, not by the hour: eight hours pay 1 per level, and a
  // full day of bed rest pays 2. Anything shorter than a night's sleep heals no hit points at all.
  const nights = Math.floor(hrs / 8);
  const hp = bedRest ? Math.floor(hrs / 24) * 2 * lvl : nights * lvl;
  return { hp, nonlethal: Math.floor(hrs) * lvl };
}
