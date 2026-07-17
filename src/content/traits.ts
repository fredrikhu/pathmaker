import type { TraitDef } from './model';

// A sampling of common traits (one per category shown), plus a drawback.
export const TRAITS: TraitDef[] = [
  { id: 'reactionary', name: 'Reactionary', category: 'combat', desc: 'Bullied as a child, you learned to strike first. +2 trait bonus on initiative checks.', effects: [{ target: 'init', type: 'trait', value: 2, note: 'Reactionary' }] },
  { id: 'deft-dodger', name: 'Deft Dodger', category: 'combat', desc: 'Growing up in a rough neighborhood honed your reflexes. +1 trait bonus on Reflex saves.', effects: [{ target: 'save:ref', type: 'trait', value: 1, note: 'Deft Dodger' }] },
  { id: 'indomitable-faith', name: 'Indomitable Faith', category: 'faith', desc: 'Your faith carried you through hardship. +1 trait bonus on Will saves.', effects: [{ target: 'save:will', type: 'trait', value: 1, note: 'Indomitable Faith' }] },
  { id: 'sacred-touch', name: 'Sacred Touch', category: 'faith', desc: 'You were exposed to divine power. As a standard action, automatically stabilize a dying creature by touch.' },
  { id: 'magical-lineage', name: 'Magical Lineage', category: 'magic', desc: 'One ancestor was a powerful spellcaster. Pick one spell; when applying metamagic to it, treat its level increase as one lower (minimum +1).' },
  { id: 'gifted-adept', name: 'Gifted Adept', category: 'magic', desc: 'Your gift manifests in one spell. Pick one spell; its caster level is +1.' },
  { id: 'suspicious', name: 'Suspicious', category: 'social', desc: 'You discovered betrayal early. +1 trait bonus on Sense Motive, and it is a class skill.', effects: [{ target: 'skill:sense-motive', type: 'trait', value: 1, note: 'Suspicious' }] },
  { id: 'rich-parents', name: 'Rich Parents', category: 'social', desc: 'You were born into wealth. Start with 900 gp instead of your class average.', bonusGold: 900 },
  // Drawbacks — taking one grants a third trait.
  { id: 'dw-pride', name: 'Pride (drawback)', category: 'drawback', desc: 'You cannot abide insults. Whenever a foe demoralizes you or damages your reputation, take −2 on all attacks against anyone else until you act against the offender.' },
  { id: 'dw-meticulous', name: 'Meticulous (drawback)', category: 'drawback', desc: 'You obsess over detail. −5 penalty on checks made against a time limit (skills, initiative uses cases per GM).' },
];

export const traitById = new Map(TRAITS.map((t) => [t.id, t]));
