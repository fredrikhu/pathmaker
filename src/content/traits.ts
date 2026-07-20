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

  // ---- Common traits (core-scope), one numeric trait bonus each where the effect is a real stat. ----
  // Combat
  { id: 'resilient', name: 'Resilient', category: 'combat', desc: 'Constant vigilance toughened you. +1 trait bonus on Fortitude saves.', effects: [{ target: 'save:fort', type: 'trait', value: 1, note: 'Resilient' }] },
  { id: 'reckless', name: 'Reckless', category: 'combat', desc: 'You take risks others would not. +1 trait bonus on Acrobatics, and it is a class skill.', effects: [{ target: 'skill:acrobatics', type: 'trait', value: 1, note: 'Reckless' }] },
  { id: 'bruising-intellect', name: 'Bruising Intellect', category: 'social', desc: 'Your sharp wit cuts deep. Intimidate is a class skill and uses your Intelligence modifier instead of Charisma.' },
  { id: 'anatomist', name: 'Anatomist', category: 'combat', desc: 'You know where to strike. +1 trait bonus on rolls to confirm critical hits.' },
  { id: 'armor-expert', name: 'Armor Expert', category: 'combat', desc: 'You trained in armor from a young age. Reduce your armor check penalty by 1 (minimum 0).' },
  // Magic
  { id: 'classically-schooled', name: 'Classically Schooled', category: 'magic', desc: 'Formal training grounds your magic. +1 trait bonus on Spellcraft, and it is a class skill.', effects: [{ target: 'skill:spellcraft', type: 'trait', value: 1, note: 'Classically Schooled' }] },
  { id: 'dangerously-curious', name: 'Dangerously Curious', category: 'magic', desc: 'You love to tinker with magic. +1 trait bonus on Use Magic Device, and it is a class skill.', effects: [{ target: 'skill:use-magic-device', type: 'trait', value: 1, note: 'Dangerously Curious' }] },
  { id: 'focused-mind', name: 'Focused Mind', category: 'magic', desc: 'You concentrate through distraction. +2 trait bonus on concentration checks.' },
  { id: 'magical-knack', name: 'Magical Knack', category: 'magic', desc: 'Magic comes naturally in one class. +2 caster level for a chosen class (never above your Hit Dice).' },
  // Faith
  { id: 'scholar-of-the-great-beyond', name: 'Scholar of the Great Beyond', category: 'faith', desc: 'You study the planes and history. +1 trait bonus on Knowledge (history), and it is a class skill.', effects: [{ target: 'skill:know-history', type: 'trait', value: 1, note: 'Scholar of the Great Beyond' }] },
  { id: 'fates-favored', name: "Fate's Favored", category: 'faith', desc: 'Fortune smiles on you. Whenever you gain a luck bonus, increase it by 1.' },
  { id: 'birthmark', name: 'Birthmark', category: 'faith', desc: 'A holy birthmark steadies your soul. +2 trait bonus on saves to resist charm and compulsion effects.' },
  // Social
  { id: 'fast-talker', name: 'Fast-Talker', category: 'social', desc: 'You lied your way through childhood. +1 trait bonus on Bluff, and it is a class skill.', effects: [{ target: 'skill:bluff', type: 'trait', value: 1, note: 'Fast-Talker' }] },
  { id: 'child-of-the-streets', name: 'Child of the Streets', category: 'social', desc: 'You grew up cutting purses. +1 trait bonus on Sleight of Hand, and it is a class skill.', effects: [{ target: 'skill:sleight-of-hand', type: 'trait', value: 1, note: 'Child of the Streets' }] },
  { id: 'clever-wordplay', name: 'Clever Wordplay', category: 'social', desc: 'You talk circles around people. One Charisma-based skill of your choice uses your Intelligence modifier instead.' },

  // Drawbacks — taking one grants a third trait.
  { id: 'dw-pride', name: 'Pride (drawback)', category: 'drawback', desc: 'You cannot abide insults. Whenever a foe demoralizes you or damages your reputation, take −2 on all attacks against anyone else until you act against the offender.' },
  { id: 'dw-meticulous', name: 'Meticulous (drawback)', category: 'drawback', desc: 'You obsess over detail. −5 penalty on checks made against a time limit (skills, initiative uses cases per GM).' },
  { id: 'dw-oblivious', name: 'Oblivious (drawback)', category: 'drawback', desc: 'You rarely notice trouble brewing. −2 penalty on Sense Motive checks.', effects: [{ target: 'skill:sense-motive', type: 'penalty', value: -2, note: 'Oblivious' }] },
  { id: 'dw-frail', name: 'Frail (drawback)', category: 'drawback', desc: 'Illness left you weak. −1 penalty on Fortitude saves.', effects: [{ target: 'save:fort', type: 'penalty', value: -1, note: 'Frail' }] },
];

export const traitById = new Map(TRAITS.map((t) => [t.id, t]));
