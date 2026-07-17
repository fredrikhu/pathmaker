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
}

const pen = (target: string, value: number, note: string): Effect => ({ target, type: 'penalty', value, note });

export const CONDITIONS: ConditionDef[] = [
  { id: 'shaken', name: 'Shaken', desc: '−2 on attack rolls, saves, and skill/ability checks (fear).',
    effects: [pen('attack:melee', -2, 'Shaken'), pen('attack:ranged', -2, 'Shaken'), pen('save:all', -2, 'Shaken')] },
  { id: 'frightened', name: 'Frightened', desc: 'As shaken (−2 attacks/saves), and must flee the source.',
    effects: [pen('attack:melee', -2, 'Frightened'), pen('attack:ranged', -2, 'Frightened'), pen('save:all', -2, 'Frightened')] },
  { id: 'sickened', name: 'Sickened', desc: '−2 on attack rolls, weapon damage, saves, and skill/ability checks.',
    effects: [pen('attack:melee', -2, 'Sickened'), pen('attack:ranged', -2, 'Sickened'), pen('save:all', -2, 'Sickened')] },
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
  { id: 'blinded', name: 'Blinded', desc: '−2 AC, lose Dex to AC, −4 Str/Dex skills, 50% miss (only AC computed).',
    effects: [pen('ac', -2, 'Blinded')] },
  { id: 'stunned', name: 'Stunned', desc: '−2 AC, lose Dex to AC, drop held items, cannot act (only AC computed).',
    effects: [pen('ac', -2, 'Stunned')] },
];

export const conditionById = new Map(CONDITIONS.map((c) => [c.id, c]));
