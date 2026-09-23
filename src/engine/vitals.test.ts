import { describe, it, expect } from 'vitest';
import { vitals, takeLethal, takeNonlethal, heal, naturalHealing, STABILIZE_DC, type VitalStatus } from './vitals';

// Every number here is from d20pfsrd (Combat → Injury and Death, Healing, Nonlethal Damage).
// The thresholds are the whole point: the play sheet used to call anything below 0 "dying /
// disabled" and only call a character dead at −(maximum hit points), which is not a rule at all.

const state = (hpDamage = 0, tempHp = 0, nonlethal = 0) => ({ hpDamage, tempHp, nonlethal });
const at = (maxHp: number, conScore: number, hpDamage: number, tempHp = 0, nonlethal = 0) =>
  vitals({ maxHp, hpDamage, tempHp, nonlethal, conScore });

describe('what a hit-point total means', () => {
  it('is healthy above 0 with no nonlethal damage', () => {
    expect(at(30, 12, 0).status).toBe('healthy');
    expect(at(30, 12, 29).status).toBe('healthy');
    expect(at(30, 12, 29).current).toBe(1);
  });

  it('is disabled at exactly 0, not dying', () => {
    // "When your current hit point total drops to exactly 0, you are disabled." Which is a
    // conscious, acting character — the old label called them dying.
    const v = at(30, 12, 30);
    expect(v.current).toBe(0);
    expect(v.status).toBe('disabled');
    expect(v.stabilize).toBeUndefined();
  });

  it('is dying below 0, and dead at negative hit points equal to Constitution', () => {
    // "If your hit point total is negative, but not equal to or greater than your Constitution
    // score, you're dying" — and dead at −(Con score), which has nothing to do with maximum hp.
    expect(at(30, 12, 31).status).toBe('dying');
    expect(at(30, 12, 41).status).toBe('dying'); // −11, one point from death
    expect(at(30, 12, 42).status).toBe('dead'); // −12 = Constitution 12
    expect(at(30, 12, 99).status).toBe('dead');
    expect(at(30, 12, 42).deathAt).toBe(-12);
  });

  it('kills a frail character long before a tough one, whatever their hit points', () => {
    // The old test for death was −(maximum hit points), so a d10 class with 90 hp and Constitution
    // 14 was reported alive at −50. The threshold is the score, so it moves with Constitution and
    // not with level.
    expect(at(90, 14, 90 + 14).status).toBe('dead');
    expect(at(90, 14, 90 + 13).status).toBe('dying');
    expect(at(8, 7, 8 + 7).status).toBe('dead');
    expect(at(8, 7, 8 + 6).status).toBe('dying');
  });

  it('offers the stabilize check while dying, with the penalty the rules name', () => {
    // "The character must make a DC 10 Constitution check to become stable. The character takes a
    // penalty on this roll equal to his negative hit point total."
    const v = at(30, 12, 37);
    expect(v.current).toBe(-7);
    expect(v.stabilize).toEqual({ dc: STABILIZE_DC, penalty: -7 });
    expect(v.note).toContain('1 hp a round');
    // The note never repeats the status word: the sheet prints the status beside it.
    expect(v.note.toLowerCase().startsWith('dying')).toBe(false);
  });

  it('walks the whole range and changes status exactly where the rules say', () => {
    const seen: [number, VitalStatus][] = [];
    for (let dmg = 0; dmg <= 45; dmg++) seen.push([30 - dmg, at(30, 12, dmg).status]);
    const wrong = seen.filter(([hp, status]) => {
      const expected: VitalStatus = hp <= -12 ? 'dead' : hp < 0 ? 'dying' : hp === 0 ? 'disabled' : 'healthy';
      return status !== expected;
    });
    expect(wrong).toEqual([]);
  });
});

describe('nonlethal damage, which is measured against hit points rather than taken from them', () => {
  it('staggers when it equals current hit points and knocks out when it exceeds them', () => {
    // "When your nonlethal damage equals your current hit points, you're staggered, and when it
    // exceeds your current hit points, you fall unconscious."
    expect(at(30, 12, 20, 0, 9).status).toBe('healthy'); // 9 vs 10
    expect(at(30, 12, 20, 0, 10).status).toBe('staggered');
    expect(at(30, 12, 20, 0, 11).status).toBe('unconscious');
  });

  it('counts temporary hit points towards the total it is measured against', () => {
    // Temporary hit points "are in addition to the character's current hit point total", so they
    // hold off the knockout — 10 nonlethal against 10 real and 5 temporary is not even staggering.
    expect(at(30, 12, 20, 5, 10).status).toBe('healthy');
    expect(at(30, 12, 20, 5, 15).status).toBe('staggered');
    expect(at(30, 12, 20, 5, 16).status).toBe('unconscious');
  });

  it('never overrides a negative hit-point total', () => {
    // A dying character is already unconscious; bruises decide nothing.
    expect(at(30, 12, 35, 0, 99).status).toBe('dying');
    expect(at(30, 12, 45, 0, 99).status).toBe('dead');
  });

  it('flags that further nonlethal damage is lethal once it reaches maximum hit points', () => {
    // "If a creature's nonlethal damage is equal to his total maximum hit points, all further
    // nonlethal damage is treated as lethal damage."
    expect(at(30, 12, 0, 0, 29).nonlethalIsLethal).toBe(false);
    expect(at(30, 12, 0, 0, 30).nonlethalIsLethal).toBe(true);
  });
});

describe('where a point of damage lands', () => {
  it('spends temporary hit points first and passes the rest through', () => {
    expect(takeLethal(state(0, 5), 3)).toEqual({ hpDamage: 0, tempHp: 2, nonlethal: 0 });
    expect(takeLethal(state(0, 5), 8)).toEqual({ hpDamage: 3, tempHp: 0, nonlethal: 0 });
    expect(takeLethal(state(4, 0), 6)).toEqual({ hpDamage: 10, tempHp: 0, nonlethal: 0 });
  });

  it('keeps nonlethal damage out of hit points until it reaches the maximum', () => {
    expect(takeNonlethal(state(), 6, 30)).toEqual({ hpDamage: 0, tempHp: 0, nonlethal: 6 });
    // 28 nonlethal already, 5 more, maximum 30: two fill the nonlethal pool and three land as real
    // damage, because further nonlethal damage is treated as lethal.
    expect(takeNonlethal(state(0, 0, 28), 5, 30)).toEqual({ hpDamage: 3, tempHp: 0, nonlethal: 30 });
    // And it goes through temporary hit points on the way, like any other lethal damage.
    expect(takeNonlethal(state(0, 2, 30), 4, 30)).toEqual({ hpDamage: 2, tempHp: 0, nonlethal: 30 });
  });

  it('does not spend temporary hit points on nonlethal damage that stays nonlethal', () => {
    expect(takeNonlethal(state(0, 5), 4, 30)).toEqual({ hpDamage: 0, tempHp: 5, nonlethal: 4 });
  });
});

describe('healing', () => {
  it('cures an equal amount of nonlethal damage along with the hit-point damage', () => {
    // "When a spell or ability cures hit point damage, it also removes an equal amount of nonlethal
    // damage." Nothing used to touch nonlethal damage at all.
    expect(heal(state(10, 0, 6), 4)).toEqual({ hpDamage: 6, tempHp: 0, nonlethal: 2 });
    expect(heal(state(10, 0, 6), 8)).toEqual({ hpDamage: 2, tempHp: 0, nonlethal: 0 });
  });

  it('never heals past undamaged, and never restores temporary hit points', () => {
    // "You can never recover more hit points than you lost", and "when temporary hit points are
    // lost, they cannot be restored as real hit points can be, even by magic."
    expect(heal(state(3, 0, 0), 50)).toEqual({ hpDamage: 0, tempHp: 0, nonlethal: 0 });
    expect(heal(state(3, 1, 0), 50).tempHp).toBe(1);
  });
});

describe('natural healing rates', () => {
  it('heals 1 hit point per character level for a full night', () => {
    // "With a full night's rest (8 hours of sleep or more), you recover 1 hit point per character
    // level." A night is not a full heal, which is the decision the rate exists to force.
    expect(naturalHealing(1, 8)).toEqual({ hp: 1, nonlethal: 8 });
    expect(naturalHealing(7, 8)).toEqual({ hp: 7, nonlethal: 56 });
    expect(naturalHealing(20, 8).hp).toBe(20);
  });

  it('doubles it for a full day and night of complete bed rest', () => {
    // "If you undergo complete bed rest for an entire day and night, you recover twice your
    // character level in hit points."
    expect(naturalHealing(7, 24, true)).toEqual({ hp: 14, nonlethal: 168 });
    // Half a day of bed rest has not earned the day's healing.
    expect(naturalHealing(7, 12, true).hp).toBe(0);
  });

  it('heals nonlethal damage at 1 per hour per level, and nothing in less than a night', () => {
    // "You heal nonlethal damage at the rate of 1 hit point per hour per character level."
    expect(naturalHealing(5, 3)).toEqual({ hp: 0, nonlethal: 15 });
    expect(naturalHealing(5, 1).nonlethal).toBe(5);
  });
});
