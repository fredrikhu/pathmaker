import type { Effect } from '../engine/types';

// Combat conditions whose mechanical penalties the engine can compute cleanly (attack, saves, AC,
// and ability scores — which flow to everything). Conditions with non-numeric effects (can't act,
// lose Dex to AC, 50% miss) note those in the description. Toggled from the play sheet; the engine
// folds active conditions' effects into the resolved sheet.

export interface ConditionDef {
  id: string;
  name: string;
  desc: string;
  effects: Effect[];
  /** The creature loses its Dexterity bonus to AC (and takes any Dex penalty) while this is active. */
  loseDexToAc?: boolean;
}

const pen = (target: string, value: number, note: string): Effect => ({ target, type: 'penalty', value, note });

export const CONDITIONS: ConditionDef[] = [
  { id: 'shaken', name: 'Shaken', desc: '−2 on attack rolls, saves, and skill/ability checks (fear).',
    effects: [pen('attack:melee', -2, 'Shaken'), pen('attack:ranged', -2, 'Shaken'), pen('save:all', -2, 'Shaken'),
      pen('skill:all', -2, 'Shaken')] },
  { id: 'frightened', name: 'Frightened', desc: 'As shaken (−2 attacks/saves), and must flee the source.',
    effects: [pen('attack:melee', -2, 'Frightened'), pen('attack:ranged', -2, 'Frightened'), pen('save:all', -2, 'Frightened'),
      pen('skill:all', -2, 'Frightened')] },
  { id: 'sickened', name: 'Sickened', desc: '−2 on attack rolls, weapon damage, saves, and skill/ability checks.',
    effects: [pen('attack:melee', -2, 'Sickened'), pen('attack:ranged', -2, 'Sickened'), pen('save:all', -2, 'Sickened'),
      pen('damage:weapon', -2, 'Sickened'), pen('skill:all', -2, 'Sickened')] },
  { id: 'fatigued', name: 'Fatigued', desc: '−2 Strength and Dexterity; cannot run or charge.',
    effects: [pen('ability:str', -2, 'Fatigued'), pen('ability:dex', -2, 'Fatigued')] },
  { id: 'exhausted', name: 'Exhausted', desc: '−6 Strength and Dexterity; move at half speed (also fatigued).',
    effects: [pen('ability:str', -6, 'Exhausted'), pen('ability:dex', -6, 'Exhausted')] },
  { id: 'dazzled', name: 'Dazzled', desc: '−1 on attack rolls and sight-based Perception.',
    effects: [pen('attack:melee', -1, 'Dazzled'), pen('attack:ranged', -1, 'Dazzled')] },
  { id: 'prone', name: 'Prone', desc: '−4 on melee attacks; +4 AC vs ranged, −4 AC vs melee (not computed).',
    effects: [pen('attack:melee', -4, 'Prone')] },
  { id: 'entangled', name: 'Entangled', desc: '−2 on attacks, −4 Dexterity; movement halved, no run/charge.',
    effects: [pen('attack:melee', -2, 'Entangled'), pen('attack:ranged', -2, 'Entangled'), pen('ability:dex', -4, 'Entangled')] },
  { id: 'grappled', name: 'Grappled', desc: '−4 Dexterity, −2 on attacks and most checks; cannot move.',
    effects: [pen('ability:dex', -4, 'Grappled'), pen('attack:melee', -2, 'Grappled'), pen('attack:ranged', -2, 'Grappled')] },
  { id: 'panicked', name: 'Panicked', desc: '−2 on saves and attacks; drop held items and flee in terror.',
    effects: [pen('attack:melee', -2, 'Panicked'), pen('attack:ranged', -2, 'Panicked'), pen('save:all', -2, 'Panicked')] },
  { id: 'deafened', name: 'Deafened', desc: '−4 on initiative; 20% arcane spell failure with verbal components.',
    effects: [pen('init', -4, 'Deafened')] },
  { id: 'blinded', name: 'Blinded', desc: '−2 AC, lose Dex to AC, −4 on Str/Dex skills, 50% miss chance.',
    effects: [pen('ac', -2, 'Blinded')], loseDexToAc: true },
  { id: 'cowering', name: 'Cowering', desc: '−2 AC, lose Dex to AC, and can take no actions.',
    effects: [pen('ac', -2, 'Cowering')], loseDexToAc: true },
  { id: 'stunned', name: 'Stunned', desc: '−2 AC, lose Dex to AC, drop held items, and can take no actions.',
    effects: [pen('ac', -2, 'Stunned')], loseDexToAc: true },
  { id: 'pinned', name: 'Pinned', desc: '−4 AC, lose Dex to AC, and are held immobile.',
    effects: [pen('ac', -4, 'Pinned')], loseDexToAc: true },
  { id: 'flat-footed', name: 'Flat-footed', desc: 'Lose your Dexterity bonus to AC (e.g. before you act).',
    effects: [], loseDexToAc: true },
  { id: 'helpless', name: 'Helpless', desc: 'Lose Dex to AC (treated as Dex 0); melee attackers gain +4 and may coup de grace.',
    effects: [], loseDexToAc: true },
  { id: 'paralyzed', name: 'Paralyzed', desc: 'Str and Dex drop to 0; helpless and unable to act (lose Dex to AC).',
    effects: [], loseDexToAc: true },
  { id: 'dazed', name: 'Dazed', desc: 'Can take no actions for the duration (no stat penalty).',
    effects: [] },
  { id: 'staggered', name: 'Staggered', desc: 'Only a single move or standard action each round.',
    effects: [] },
  { id: 'nauseated', name: 'Nauseated', desc: 'Only a single move action; cannot attack or cast.',
    effects: [] },
  { id: 'confused', name: 'Confused', desc: 'Act randomly each round (attack, flee, babble, or act normally).',
    effects: [] },
];

export const conditionById = new Map(CONDITIONS.map((c) => [c.id, c]));
