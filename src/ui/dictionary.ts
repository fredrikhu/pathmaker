// Teaching dictionary for the tooltip system. Keyed by term id; `related` drills in.
export interface Term {
  kicker: string;
  title: string;
  body: string;
  related?: string[];
}

export const DICTIONARY: Record<string, Term> = {
  ability: { kicker: 'PF1e rules', title: 'Ability scores', body: 'Six scores describe raw talent. Everything else — attacks, saves, skills, spells — derives from their modifiers.', related: ['mod', 'pointbuy', 'racial'] },
  pointbuy: { kicker: 'PF1e rules', title: 'Point buy', body: 'You spend a pool of points to raise scores from 10. Costs climb steeply: 14 costs 5, but 18 costs 17. Dropping a score below 10 refunds points.', related: ['ability', 'mod'] },
  mod: { kicker: 'PF1e rules', title: 'Ability modifier', body: 'The number added to rolls: (score − 10) ÷ 2, rounded down. A 17 gives +3; an 8 gives −1.', related: ['ability'] },
  racial: { kicker: 'PF1e rules', title: 'Racial modifier', body: 'Your race adjusts ability scores. Humans, half-elves, and half-orcs add +2 to any one score; other races have fixed adjustments.', related: ['ability'] },
  classskill: { kicker: 'PF1e rules', title: 'Class skill', body: 'Skills your class practices. Put at least 1 rank in a class skill and you gain a one-time +3 bonus.', related: ['rank'] },
  rank: { kicker: 'PF1e rules', title: 'Skill ranks', body: 'Points invested in a skill, capped at your character level. You get class ranks + Int modifier each level.', related: ['classskill'] },
  acp: { kicker: 'PF1e rules', title: 'Armor check penalty', body: 'Heavier armor and shields hinder physical skills. The penalty applies to Str- and Dex-based skills — marked ▲ in the table.', related: ['classskill'] },
  bab: { kicker: 'PF1e rules', title: 'Base attack bonus', body: 'Your class-granted attack bonus. Full-BAB classes get +1 per level; casters get half.', related: ['cmb'] },
  cmb: { kicker: 'Stat', title: 'CMB / CMD', body: 'Combat Maneuver Bonus (BAB + Str) drives trips and grapples; CMD (10 + BAB + Str + Dex) defends against them.', related: ['bab'] },
  hp: { kicker: 'Stat', title: 'Hit points', body: 'Damage you can take before falling. Max hit die at level 1, plus Con modifier, plus favored-class bonus if chosen.', related: ['favored'] },
  ac: { kicker: 'Stat', title: 'Armor Class', body: 'What enemies must roll to hit you: 10 + armor + shield + Dex + size + dodge + others.', related: ['touch', 'ff'] },
  touch: { kicker: 'Stat', title: 'Touch AC', body: 'AC against attacks that only need contact (rays, grapples). Ignores armor, shield, and natural armor.', related: ['ac'] },
  ff: { kicker: 'Stat', title: 'Flat-footed AC', body: 'AC when caught off guard, before you act in combat. Ignores your Dex and dodge bonuses.', related: ['ac'] },
  fort: { kicker: 'Save', title: 'Fortitude', body: 'Resists poison, disease, and effects that attack the body. Con-based.', related: [] },
  ref: { kicker: 'Save', title: 'Reflex', body: 'Dodges area effects like fireballs and dragon breath. Dex-based.', related: [] },
  will: { kicker: 'Save', title: 'Will', body: 'Resists charms, fear, and mind control. Wis-based.', related: [] },
  init: { kicker: 'Stat', title: 'Initiative', body: 'Determines turn order: d20 + Dex modifier + feats like Improved Initiative.', related: [] },
  favored: { kicker: 'PF1e rules', title: 'Favored class', body: 'Your first class choice. Each level in it grants +1 hit point or +1 skill rank.', related: ['hp'] },
  encumbrance: { kicker: 'PF1e rules', title: 'Encumbrance', body: 'Carry too much and you slow down and take penalties. Light/medium/heavy thresholds scale with Strength.', related: [] },
  alignment: { kicker: 'PF1e rules', title: 'Alignment', body: 'Your moral compass on two axes: law–chaos and good–evil. Some classes restrict it — paladins must be Lawful Good.', related: [] },
  deity: { kicker: 'PF1e rules', title: 'Deity', body: 'Clerics, paladins, and warpriests draw power from a god, and a cleric’s domains must come from the deity’s list.', related: [] },
  combatfeat: { kicker: 'PF1e rules', title: 'Combat feats', body: 'A subset of feats. Fighter bonus feats must come from this list — it is tagged on each feat.', related: [] },
  humanfeat: { kicker: 'Racial trait', title: 'Bonus feat (human)', body: 'Humans select one extra feat at 1st level — any feat they qualify for.', related: ['combatfeat'] },
  school: { kicker: 'PF1e rules', title: 'Arcane school', body: 'A wizard specializes in one of eight schools for bonus powers, at the cost of two opposition schools.', related: ['opposition'] },
  opposition: { kicker: 'PF1e rules', title: 'Opposition schools', body: 'A specialist names two opposed schools. Their spells can still be learned and prepared, but each one prepared consumes two slots instead of one. A marker, never a lock.', related: ['school', 'spelllevel'] },
  cantrip: { kicker: 'PF1e rules', title: 'Cantrip', body: 'A 0-level spell. Wizards prepare them but they are never expended — cast at will.', related: ['spelllevel'] },
  components: { kicker: 'PF1e rules', title: 'Components', body: 'What a spell requires to cast: Verbal (V), Somatic (S), Material (M), Focus (F), or Divine Focus (DF).', related: [] },
  spelllevel: { kicker: 'PF1e rules', title: 'Spell level', body: 'A spell’s power tier from 0 (cantrip) to 9, distinct from your character level. Your class table sets how many of each you cast per day.', related: ['cantrip'] },
};
