import type { Effect, EnergyType } from '../engine/types';
import type { SpellAttackerDef, SpellBuffDef, SpellDamageDef } from './model';

// Resist energy's cast-time choice, offered by the play sheet and read back by its resolver.
const ENERGY_CHOICES: { id: EnergyType; name: string }[] = [
  { id: 'acid', name: 'Acid' }, { id: 'cold', name: 'Cold' }, { id: 'electricity', name: 'Electricity' },
  { id: 'fire', name: 'Fire' }, { id: 'sonic', name: 'Sonic' },
];

// Structured, engine-computed spell effects. Every number here is verified against that spell's
// own d20pfsrd page — the scaling clauses ("+1 per three levels, maximum +3") are exactly the kind
// of thing a summary gets subtly wrong, so they are read from the spell text and encoded literally.
//
// Only spells whose effect is an unconditional, typed bonus on the *caster's own* sheet get a buff.
// Miss chances (blur, displacement), area control (web, grease), target-dependent bonuses and
// anything that reshapes a roll stay prose: the engine cannot total them honestly.

// Durations are stored in combat rounds, the single unit the clock works in.
const MINUTE = 10;
const HOUR = 600;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** The same bonus on both attack stats — nearly every attack buff hits melee and ranged alike. */
const attack = (value: number, type: Effect['type'], note: string): Effect[] => [
  { target: 'attack:melee', type, value, note },
  { target: 'attack:ranged', type, value, note },
];

export const SPELL_BUFFS: Record<string, SpellBuffDef> = {
  'divine-favor': {
    scaling: '+1 luck per three caster levels (min +1, max +3), for 1 minute',
    caveat: 'The luck bonus does not apply to spell damage.',
    at: (cl) => {
      const bonus = clamp(Math.floor(cl / 3), 1, 3);
      const note = `Divine Favor +${bonus}`;
      return {
        rounds: MINUTE, // a flat 1 minute — this spell does not scale its duration
        effects: [
          ...attack(bonus, 'luck', note),
          { target: 'damage:weapon', type: 'luck', value: bonus, note },
        ],
      };
    },
  },

  'mage-armor': {
    scaling: '+4 armor bonus, for 1 hour per caster level',
    at: (cl) => ({
      rounds: cl * HOUR,
      effects: [{ target: 'ac', type: 'armor', value: 4, note: 'Mage Armor' }],
    }),
  },

  shield: {
    scaling: '+4 shield bonus, for 1 minute per caster level',
    caveat: 'Also negates magic missile against you.',
    at: (cl) => ({
      rounds: cl * MINUTE,
      effects: [{ target: 'ac', type: 'shield', value: 4, note: 'Shield' }],
    }),
  },

  'shield-of-faith': {
    scaling: '+2 deflection, +1 more per six caster levels (max +5), for 1 minute per caster level',
    at: (cl) => {
      const bonus = clamp(2 + Math.floor(cl / 6), 2, 5);
      return {
        rounds: cl * MINUTE,
        effects: [{ target: 'ac', type: 'deflection', value: bonus, note: `Shield of Faith +${bonus}` }],
      };
    },
  },

  bless: {
    scaling: '+1 morale on attacks, for 1 minute per caster level',
    at: (cl) => ({
      rounds: cl * MINUTE,
      effects: [
        ...attack(1, 'morale', 'Bless'),
        // The save half is fear-specific, so it annotates the saves rather than inflating them.
        { target: 'save:all', type: 'morale', value: 1, note: 'Bless', condition: 'against fear effects' },
      ],
    }),
  },

  prayer: {
    scaling: '+1 luck on attacks, weapon damage, saves and skills, for 1 round per caster level',
    caveat: 'Foes in the area take −1 on the same rolls — track that on their side.',
    at: (cl) => ({
      rounds: cl,
      effects: [
        ...attack(1, 'luck', 'Prayer'),
        { target: 'damage:weapon', type: 'luck', value: 1, note: 'Prayer' },
        { target: 'save:all', type: 'luck', value: 1, note: 'Prayer' },
        { target: 'skill:all', type: 'luck', value: 1, note: 'Prayer' },
      ],
    }),
  },

  'expeditious-retreat': {
    scaling: '+30 ft base land speed, for 1 minute per caster level',
    at: (cl) => ({
      rounds: cl * MINUTE,
      effects: [{ target: 'speed', type: 'enhancement', value: 30, note: 'Expeditious Retreat' }],
    }),
  },

  barkskin: {
    scaling: '+2 natural armor, +1 more per three caster levels above 3rd (max +5), for 10 minutes per caster level',
    at: (cl) => {
      const bonus = clamp(2 + Math.floor(Math.max(0, cl - 3) / 3), 2, 5);
      return {
        rounds: cl * 10 * MINUTE,
        effects: [{ target: 'ac', type: 'natural-armor', value: bonus, note: `Barkskin +${bonus}` }],
      };
    },
  },

  haste: {
    scaling: '+1 attack, +1 dodge AC and Reflex, +30 ft speed, for 1 round per caster level',
    caveat: 'Also grants one extra attack at full BAB on a full attack. The speed increase caps at twice your normal speed, which the sheet does not enforce.',
    at: (cl) => ({
      rounds: cl,
      effects: [
        // The spell calls this simply "a +1 bonus on attack rolls" — untyped, unlike the dodge half.
        ...attack(1, 'untyped', 'Haste'),
        { target: 'ac', type: 'dodge', value: 1, note: 'Haste' },
        { target: 'save:ref', type: 'dodge', value: 1, note: 'Haste' },
        { target: 'speed', type: 'untyped', value: 30, note: 'Haste' },
      ],
    }),
  },

  // An ability buff rather than a flat bonus: raising Strength flows out to melee attack, damage,
  // CMB, Climb and everything else derived from it, exactly as a belt of giant strength does.
  'bulls-strength': {
    scaling: '+4 enhancement to Strength, for 1 minute per caster level',
    at: (cl) => ({
      rounds: cl * MINUTE,
      effects: [{ target: 'ability:str', type: 'enhancement', value: 4, note: "Bull's Strength" }],
    }),
  },

  // Both bonuses are evil-specific, so both are annotations. The save panel offers them as a
  // switch at the moment you roll, which is when you know what you are saving against.
  'protection-from-evil': {
    scaling: '+2 deflection AC and +2 on saves, against evil creatures, for 1 minute per caster level',
    caveat: 'Also grants a second save against ongoing mental control, and blocks bodily contact by summoned creatures.',
    at: (cl) => ({
      rounds: cl * MINUTE,
      effects: [
        { target: 'ac', type: 'deflection', value: 2, note: 'Protection from Evil', condition: 'against evil creatures' },
        { target: 'save:all', type: 'resistance', value: 2, note: 'Protection from Evil', condition: 'against evil creatures' },
      ],
    }),
  },

  // A resistance, not a stat bonus, and its energy type is chosen when you cast — the first buff
  // to take a cast-time parameter. Resist 10, rising to 20 at CL 7 and 30 at CL 11.
  'resist-energy': {
    scaling: 'resist 10 against a chosen energy type (20 at CL 7, 30 at CL 11), for 10 minutes per caster level',
    param: { label: 'Energy type', options: ENERGY_CHOICES },
    at: (cl, param) => {
      const amount = cl >= 11 ? 30 : cl >= 7 ? 20 : 10;
      // Default to the first option so a route that cannot prompt still produces a valid resistance;
      // the timer label names the type, so a wrong default is visible and correctable.
      const type = (ENERGY_CHOICES.some((c) => c.id === param) ? param : ENERGY_CHOICES[0].id) as EnergyType;
      return { effects: [], rounds: cl * 10 * MINUTE, resistances: [{ type, amount, note: 'Resist Energy' }] };
    },
  },

  // A depleting pool, not a flat reduction: protection from energy soaks the whole chosen type
  // until 12 points per caster level (max 120) are spent, then discharges. Same cast-time type
  // choice as resist energy; the pool lives on the timer and shrinks as damage is applied.
  'protection-from-energy': {
    scaling: 'absorbs 12 points per caster level of a chosen energy type (max 120), for 10 minutes per level or until spent',
    param: { label: 'Energy type', options: ENERGY_CHOICES },
    caveat: 'Absorbs the whole type until its pool is exhausted, then ends. Overlaps resist energy rather than stacking.',
    at: (cl, param) => {
      const type = (ENERGY_CHOICES.some((c) => c.id === param) ? param : ENERGY_CHOICES[0].id) as EnergyType;
      return { effects: [], rounds: cl * 10 * MINUTE, absorb: { type, amount: Math.min(cl * 12, 120) } };
    },
  },

  // Not a stat bonus at all: stoneskin reduces incoming damage, so it rides `dr` rather than
  // `effects`. Its discharge (10 points prevented per caster level) is not tracked — see caveat.
  stoneskin: {
    scaling: 'DR 10/adamantine, for 10 minutes per caster level',
    caveat: 'Discharges once it has prevented 10 points of damage per caster level (max 150) — the sheet does not count that down for you.',
    at: (cl) => ({
      rounds: cl * 10 * MINUTE,
      effects: [],
      dr: [{ amount: 10, bypass: 'adamantine', note: 'Stoneskin' }],
    }),
  },

  aid: {
    scaling: '+1 morale on attacks, plus 1d8 + caster level temporary HP, for 1 minute per caster level',
    caveat: 'Roll the temporary hit points and enter them in the HP tracker.',
    at: (cl) => ({
      rounds: cl * MINUTE,
      effects: [
        ...attack(1, 'morale', 'Aid'),
        { target: 'save:all', type: 'morale', value: 1, note: 'Aid', condition: 'against fear effects' },
      ],
    }),
  },
};

/** Per-caster-level dice, capped: "1d6 per level, maximum 10d6". */
const perLevel = (die: number, maxDice: number, label?: string): SpellDamageDef => ({
  ...(label ? { label } : {}),
  at: (cl) => `${clamp(cl, 1, maxDice)}d${die}`,
});

// Self-directed attackers. Both act once a round on your turn, so they belong on the mat as a
// running effect that prompts a roll, not as a bonus to your own numbers. Damage and scaling are
// read from each spell's own page; the attack bonus is filled in from the caster at cast time.
export const SPELL_ATTACKERS: Record<string, SpellAttackerDef> = {
  'spiritual-weapon': {
    scaling: '1d8 force + 1 per three caster levels (max +5), attacks with your BAB + Wis, for 1 round per caster level',
    attacks: true,
    attackAbility: 'wis',
    dmgType: 'force',
    // The weapon takes your deity's favored weapon's form and crit; ×2 is the common case and the
    // fallback, since the engine does not know the deity here.
    crit: '×2',
    caveat: "Takes your deity's favored weapon's threat range and multiplier — ×2 shown as the default. Uses your BAB from cast time, so later buffs to it do not carry.",
    at: (cl) => {
      const bonus = clamp(Math.floor(cl / 3), 0, 5);
      return { damage: bonus ? `1d8+${bonus}` : '1d8', rounds: cl };
    },
  },
  'flaming-sphere': {
    scaling: '3d6 fire, Reflex negates, for 1 round per caster level',
    attacks: false,
    dmgType: 'fire',
    save: 'Reflex negates',
    caveat: 'Directing it each round is a move action. Moving it into a creature deals the damage; the target rolls the save.',
    at: (cl) => ({ damage: '3d6', rounds: cl }),
  },
};

export const SPELL_DAMAGE: Record<string, SpellDamageDef> = {
  // --- Fixed ---
  'acid-splash': { at: () => '1d3' },
  'ray-of-frost': { at: () => '1d3' },
  'disrupt-undead': { at: () => '1d6' },
  'acid-arrow': {
    at: () => '2d4',
    note: (cl) => `and again each round for ${clamp(Math.floor(cl / 3), 0, 6)} more round(s)`,
  },
  'call-lightning': { at: () => '3d6', note: () => 'per bolt, one bolt per round' },
  'ice-storm': { at: () => '3d6 + 2d6', note: () => '3d6 bludgeoning + 2d6 cold' },

  // --- Scaling with caster level ---
  'burning-hands': perLevel(4, 5),
  fireball: perLevel(6, 10),
  'lightning-bolt': perLevel(6, 10),
  'flame-strike': perLevel(6, 15),
  'cone-of-cold': perLevel(6, 15),
  'chain-lightning': perLevel(6, 20),
  'horrid-wilting': perLevel(6, 20),
  'polar-ray': perLevel(6, 25),
  disintegrate: { at: (cl) => `${clamp(cl * 2, 2, 40)}d6` },
  'vampiric-touch': { at: (cl) => `${clamp(Math.floor(cl / 2), 1, 10)}d6`, note: () => 'you gain the damage dealt as temporary HP' },
  'searing-light': {
    at: (cl) => `${clamp(Math.floor(cl / 2), 1, 5)}d8`,
    note: () => 'vs undead 1d6/level (max 10d6); vs objects 1d6 per two levels',
  },
  'produce-flame': { at: (cl) => `1d6+${clamp(cl, 1, 5)}` },

  // Magic missile fires more missiles rather than bigger dice, so the whole volley is one roll
  // against a single target — split it if you aim at several.
  'magic-missile': {
    at: (cl) => {
      const missiles = clamp(1 + Math.floor((cl - 1) / 2), 1, 5);
      return `${missiles}d4+${missiles}`;
    },
    note: (cl) => {
      const missiles = clamp(1 + Math.floor((cl - 1) / 2), 1, 5);
      return `${missiles} missile${missiles === 1 ? '' : 's'} of 1d4+1 — split between targets if you like`;
    },
  },
  'scorching-ray': {
    at: () => '4d6',
    note: (cl) => {
      const rays = clamp(1 + Math.floor(Math.max(0, cl - 3) / 4), 1, 3);
      return `per ray, ${rays} ray${rays === 1 ? '' : 's'}, each a ranged touch attack`;
    },
  },

  // --- Healing (and the temporary hit points Aid grants) ---
  'cure-light-wounds': { label: 'healed', at: (cl) => `1d8+${clamp(cl, 1, 5)}` },
  'cure-moderate-wounds': { label: 'healed', at: (cl) => `2d8+${clamp(cl, 1, 10)}` },
  'cure-serious-wounds': { label: 'healed', at: (cl) => `3d8+${clamp(cl, 1, 15)}` },
  'cure-critical-wounds': { label: 'healed', at: (cl) => `4d8+${clamp(cl, 1, 20)}` },
  aid: { label: 'temporary HP', at: (cl) => `1d8+${clamp(cl, 1, 10)}` },
};
