import type { TraitDef } from './model';
import { skillById } from './skills';

/** Skill-picker options for a choose-a-skill trait, named from the skill catalogue. */
const skills = (...ids: string[]) => ids.map((id) => ({ id, name: skillById.get(id)!.name }));
const CRAFTS = ['craft-alchemy', 'craft-armor', 'craft-weapons'];
const PERFORMS = ['perform-oratory', 'perform-strings'];

// Basic traits (Advanced Player's Guide, reprinted and extended in Ultimate Campaign), plus drawbacks.
// Numeric skill/save/initiative bonuses are computed; "X is always a class skill" is `classSkills`;
// a trait that names a skill to pick carries `param`. Bonuses the engine cannot see (a situation,
// a creature type, a once-per-day reroll) stay prose. Benefit text verified against d20pfsrd.
export const TRAITS: TraitDef[] = [
  { id: 'reactionary', name: 'Reactionary', category: 'combat', desc: 'Bullied as a child, you learned to strike first. +2 trait bonus on initiative checks.', effects: [{ target: 'init', type: 'trait', value: 2, note: 'Reactionary' }] },
  { id: 'deft-dodger', name: 'Deft Dodger', category: 'combat', desc: 'Growing up in a rough neighborhood honed your reflexes. +1 trait bonus on Reflex saves.', effects: [{ target: 'save:ref', type: 'trait', value: 1, note: 'Deft Dodger' }] },
  { id: 'indomitable-faith', name: 'Indomitable Faith', category: 'faith', desc: 'Your faith carried you through hardship. +1 trait bonus on Will saves.', effects: [{ target: 'save:will', type: 'trait', value: 1, note: 'Indomitable Faith' }] },
  { id: 'sacred-touch', name: 'Sacred Touch', category: 'faith', desc: 'You were exposed to divine power. As a standard action, automatically stabilize a dying creature by touch.' },
  { id: 'magical-lineage', name: 'Magical Lineage', category: 'magic', desc: 'One ancestor was a powerful spellcaster. Pick one spell; when applying metamagic to it, treat its level increase as one lower (minimum +1).' },
  { id: 'gifted-adept', name: 'Gifted Adept', category: 'magic', desc: 'Your gift manifests in one spell. Pick one spell; its caster level is +1.' },
  { id: 'suspicious', name: 'Suspicious', category: 'social', desc: 'You discovered betrayal early. +1 trait bonus on Sense Motive, and it is a class skill.', effects: [{ target: 'skill:sense-motive', type: 'trait', value: 1, note: 'Suspicious' }], classSkills: ['sense-motive'] },
  { id: 'rich-parents', name: 'Rich Parents', category: 'social', desc: 'You were born into wealth. Start with 900 gp instead of your class average.', bonusGold: 900 },

  // ---- Common traits (core-scope), one numeric trait bonus each where the effect is a real stat. ----
  // Combat
  { id: 'resilient', name: 'Resilient', category: 'combat', desc: 'Constant vigilance toughened you. +1 trait bonus on Fortitude saves.', effects: [{ target: 'save:fort', type: 'trait', value: 1, note: 'Resilient' }] },
  { id: 'reckless', name: 'Reckless', category: 'combat', desc: 'You take risks others would not. +1 trait bonus on Acrobatics, and it is a class skill.', effects: [{ target: 'skill:acrobatics', type: 'trait', value: 1, note: 'Reckless' }], classSkills: ['acrobatics'] },
  { id: 'bruising-intellect', name: 'Bruising Intellect', category: 'social', desc: 'Your sharp wit cuts deep. Intimidate is a class skill and uses your Intelligence modifier instead of Charisma.', classSkills: ['intimidate'] },
  { id: 'anatomist', name: 'Anatomist', category: 'combat', desc: 'You know where to strike. +1 trait bonus on rolls to confirm critical hits.' },
  { id: 'armor-expert', name: 'Armor Expert', category: 'combat', desc: 'You trained in armor from a young age. Reduce your armor check penalty by 1 (minimum 0).' },
  // Magic
  { id: 'classically-schooled', name: 'Classically Schooled', category: 'magic', desc: 'Formal training grounds your magic. +1 trait bonus on Spellcraft, and it is a class skill.', effects: [{ target: 'skill:spellcraft', type: 'trait', value: 1, note: 'Classically Schooled' }], classSkills: ['spellcraft'] },
  { id: 'dangerously-curious', name: 'Dangerously Curious', category: 'magic', desc: 'You love to tinker with magic. +1 trait bonus on Use Magic Device, and it is a class skill.', effects: [{ target: 'skill:use-magic-device', type: 'trait', value: 1, note: 'Dangerously Curious' }], classSkills: ['use-magic-device'] },
  { id: 'focused-mind', name: 'Focused Mind', category: 'magic', desc: 'You concentrate through distraction. +2 trait bonus on concentration checks.' },
  { id: 'magical-knack', name: 'Magical Knack', category: 'magic', desc: 'Magic comes naturally in one class. +2 caster level for a chosen class (never above your Hit Dice).' },
  // Faith
  { id: 'scholar-of-the-great-beyond', name: 'Scholar of the Great Beyond', category: 'faith', desc: 'You study the planes and history. +1 trait bonus on Knowledge (history), and it is a class skill.', effects: [{ target: 'skill:know-history', type: 'trait', value: 1, note: 'Scholar of the Great Beyond' }], classSkills: ['know-history'] },
  { id: 'fates-favored', name: "Fate's Favored", category: 'faith', desc: 'Fortune smiles on you. Whenever you gain a luck bonus, increase it by 1.' },
  { id: 'birthmark', name: 'Birthmark', category: 'faith', desc: 'A holy birthmark steadies your soul. +2 trait bonus on saves to resist charm and compulsion effects.' },
  // Social
  { id: 'fast-talker', name: 'Fast-Talker', category: 'social', desc: 'You lied your way through childhood. +1 trait bonus on Bluff, and it is a class skill.', effects: [{ target: 'skill:bluff', type: 'trait', value: 1, note: 'Fast-Talker' }], classSkills: ['bluff'] },
  { id: 'child-of-the-streets', name: 'Child of the Streets', category: 'social', desc: 'You grew up cutting purses. +1 trait bonus on Sleight of Hand, and it is a class skill.', effects: [{ target: 'skill:sleight-of-hand', type: 'trait', value: 1, note: 'Child of the Streets' }], classSkills: ['sleight-of-hand'] },
  { id: 'clever-wordplay', name: 'Clever Wordplay', category: 'social', desc: 'You talk circles around people. One Charisma-based skill of your choice uses your Intelligence modifier instead.' },

  // ---- The rest of the Ultimate Campaign social traits (the general ones; class-tied ones are left out). ----
  { id: 'acrobat', name: 'Acrobat', category: 'social', desc: 'Trained from a young age in feats of daring. +1 bonus on Acrobatics, and an accelerated climb costs only −2 instead of −5.', effects: [{ target: 'skill:acrobatics', type: 'untyped', value: 1, note: 'Acrobat' }] },
  { id: 'adopted', name: 'Adopted', category: 'social', desc: 'Raised by another race, in a society not your own. Choose one race trait from your adoptive parents’ race (not modelled — note it on the sheet).' },
  { id: 'ambitious', name: 'Ambitious', category: 'social', desc: 'You exude confidence before the powerful. +4 trait bonus on Diplomacy to influence creatures with at least 5 more Hit Dice than you.' },
  { id: 'artisan', name: 'Artisan', category: 'social', desc: 'You worked under skilled artisans. +2 trait bonus on one Craft skill of your choice.', param: { label: 'Craft skill', options: skills(...CRAFTS), bonus: 2 } },
  { id: 'bastard', name: 'Bastard', category: 'social', desc: 'Born out of wedlock, always the outsider, your insight sharpened. +1 trait bonus on Sense Motive, and it is a class skill.', effects: [{ target: 'skill:sense-motive', type: 'trait', value: 1, note: 'Bastard' }], classSkills: ['sense-motive'] },
  { id: 'beast-bond', name: 'Beast Bond', category: 'social', desc: 'You share a close bond with animals. +1 bonus on Handle Animal and Ride; one of them (your choice) is a class skill.', effects: [{ target: 'skill:handle-animal', type: 'untyped', value: 1, note: 'Beast Bond' }, { target: 'skill:ride', type: 'untyped', value: 1, note: 'Beast Bond' }], param: { label: 'Class skill', options: skills('handle-animal', 'ride'), classSkill: true } },
  { id: 'bully', name: 'Bully', category: 'social', desc: 'Where you grew up, the meek were ignored. +1 trait bonus on Intimidate, and it is a class skill.', effects: [{ target: 'skill:intimidate', type: 'trait', value: 1, note: 'Bully' }], classSkills: ['intimidate'] },
  { id: 'canter', name: 'Canter', category: 'social', desc: 'You grew up among thieves and their turns of phrase. Anyone passing you a secret message with Bluff gains +5; you gain a +5 trait bonus on Sense Motive to intercept one.' },
  { id: 'charming', name: 'Charming', category: 'social', desc: 'Blessed with good looks. +1 trait bonus on Bluff and Diplomacy against anyone who is (or could be) attracted to you, and +1 to the save DC of language-dependent spells you cast on them.' },
  { id: 'civilized', name: 'Civilized', category: 'social', desc: 'You know the local laws, customs, and politics. +1 trait bonus on Knowledge (nobility) and Knowledge (local); Knowledge (local) is a class skill.', effects: [{ target: 'skill:know-nobility', type: 'trait', value: 1, note: 'Civilized' }, { target: 'skill:know-local', type: 'trait', value: 1, note: 'Civilized' }], classSkills: ['know-local'] },
  { id: 'criminal', name: 'Criminal', category: 'social', desc: 'You robbed and stole to get by. Choose Disable Device, Intimidate, or Sleight of Hand: +1 trait bonus on it, and it is a class skill.', param: { label: 'Skill', options: skills('disable-device', 'intimidate', 'sleight-of-hand'), bonus: 1, classSkill: true } },
  { id: 'friend-in-every-town', name: 'Friend in Every Town', category: 'social', desc: 'You make friends wherever you go. +1 trait bonus on Knowledge (local) and Diplomacy; one of them (your choice) is a class skill.', effects: [{ target: 'skill:know-local', type: 'trait', value: 1, note: 'Friend in Every Town' }, { target: 'skill:diplomacy', type: 'trait', value: 1, note: 'Friend in Every Town' }], param: { label: 'Class skill', options: skills('know-local', 'diplomacy'), classSkill: true } },
  { id: 'grief-filled', name: 'Grief-Filled', category: 'social', desc: 'You are no stranger to loss. +2 trait bonus on saving throws against emotion spells and effects.' },
  { id: 'influence', name: 'Influence', category: 'social', desc: 'Your standing grants you insight and awe. Choose Diplomacy, Intimidate, or Sense Motive: +1 trait bonus on it, and it is a class skill.', param: { label: 'Skill', options: skills('diplomacy', 'intimidate', 'sense-motive'), bonus: 1, classSkill: true } },
  { id: 'life-of-toil', name: 'Life of Toil', category: 'social', desc: 'Hard labor toughened your body and mind. +1 trait bonus on Fortitude saves.', effects: [{ target: 'save:fort', type: 'trait', value: 1, note: 'Life of Toil' }] },
  { id: 'mentored', name: 'Mentored', category: 'social', desc: 'A tutor guided your trade, and taught you to teach. +1 trait bonus on one Craft, Perform, or Profession skill, and +1 trait bonus when you aid another on any skill.', param: { label: 'Skill', options: skills(...CRAFTS, ...PERFORMS, 'profession-any'), bonus: 1 } },
  { id: 'mercenary', name: 'Mercenary', category: 'social', desc: 'Everything has a price. +2 trait bonus on Diplomacy, Intimidate, and Sense Motive while negotiating payment for a quest or service.' },
  { id: 'merchant', name: 'Merchant', category: 'social', desc: 'You bought and sold for a living. +1 trait bonus on Appraise and Sense Motive while bargaining over prices; Appraise is a class skill.', classSkills: ['appraise'] },
  { id: 'natural-born-leader', name: 'Natural-Born Leader', category: 'social', desc: 'Others look to you. Cohorts, followers, and summoned creatures under your leadership gain +1 morale on Will saves against mind-affecting effects; +1 trait bonus to your Leadership score if you take the feat.' },
  { id: 'ordinary', name: 'Ordinary', category: 'social', desc: 'Your face is soon forgotten. +4 trait bonus on Stealth to hide in a crowd.' },
  { id: 'orphaned', name: 'Orphaned', category: 'social', desc: 'You learned to watch out for yourself. +1 trait bonus on Survival, and it is a class skill.', effects: [{ target: 'skill:survival', type: 'trait', value: 1, note: 'Orphaned' }], classSkills: ['survival'] },
  { id: 'poverty-stricken', name: 'Poverty-Stricken', category: 'social', desc: 'Every copper counted, and you often lived off the land. +1 bonus on Survival, and it is a class skill.', effects: [{ target: 'skill:survival', type: 'untyped', value: 1, note: 'Poverty-Stricken' }], classSkills: ['survival'] },
  { id: 'savage', name: 'Savage', category: 'social', desc: 'Raised in untamed lands. +1 trait bonus on Knowledge (nature), +1 trait bonus on Survival to get along in the wild; Knowledge (nature) is a class skill.', effects: [{ target: 'skill:know-nature', type: 'trait', value: 1, note: 'Savage' }], classSkills: ['know-nature'] },
  { id: 'seeker', name: 'Seeker', category: 'social', desc: 'Always on the lookout for reward and danger. +1 trait bonus on Perception, and it is a class skill.', effects: [{ target: 'skill:perception', type: 'trait', value: 1, note: 'Seeker' }], classSkills: ['perception'] },
  { id: 'talented', name: 'Talented', category: 'social', desc: 'A virtuoso musician, actor, or storyteller. +1 trait bonus on one Perform skill of your choice, and all Perform skills are class skills.', classSkills: PERFORMS, param: { label: 'Perform skill', options: skills(...PERFORMS), bonus: 1 } },
  { id: 'tireless-logic', name: 'Tireless Logic', category: 'social', desc: 'Your mind untangles the hardest problems. Once per day, roll an Intelligence-based skill or ability check twice and take the better result.' },
  { id: 'trustworthy', name: 'Trustworthy', category: 'social', desc: 'People put their faith in you. +1 trait bonus on Bluff to fool someone, +1 trait bonus on Diplomacy, and Diplomacy is a class skill.', effects: [{ target: 'skill:diplomacy', type: 'trait', value: 1, note: 'Trustworthy' }], classSkills: ['diplomacy'] },
  { id: 'truths-agent', name: 'Truth’s Agent', category: 'social', desc: 'You weed out information. +1 trait bonus on Diplomacy to gather information and on Knowledge (local); Knowledge (local) is a class skill.', effects: [{ target: 'skill:know-local', type: 'trait', value: 1, note: 'Truth’s Agent' }], classSkills: ['know-local'] },
  { id: 'unintentional-linguist', name: 'Unintentional Linguist', category: 'social', desc: 'You can speak with outsiders. +1 trait bonus on Linguistics, and you know one extra language: Abyssal, Aquan, Celestial, Ignan, Infernal, Protean, or Terran.', effects: [{ target: 'skill:linguistics', type: 'trait', value: 1, note: 'Unintentional Linguist' }] },
  { id: 'unpredictable', name: 'Unpredictable', category: 'social', desc: 'There is method to your madness. +1 trait bonus on Bluff, and it is a class skill.', effects: [{ target: 'skill:bluff', type: 'trait', value: 1, note: 'Unpredictable' }], classSkills: ['bluff'] },
  { id: 'worldly', name: 'Worldly', category: 'social', desc: 'Unusual breadth of life experience. Once per day, roll a check for a skill you are untrained in twice and take the better result.' },
  // Pathfinder Player Companion: Quests & Campaigns
  { id: 'student-of-philosophy', name: 'Student of Philosophy', category: 'social', desc: 'Trained in a defunct philosophical tradition, you persuade with logic. Use your Intelligence modifier instead of Charisma on Diplomacy checks to persuade and on Bluff checks to convince others a lie is true (not to gather information or to feint).' },

  // Drawbacks — taking one grants a third trait.
  { id: 'dw-pride', name: 'Pride (drawback)', category: 'drawback', desc: 'You cannot abide insults. Whenever a foe demoralizes you or damages your reputation, take −2 on all attacks against anyone else until you act against the offender.' },
  { id: 'dw-meticulous', name: 'Meticulous (drawback)', category: 'drawback', desc: 'You obsess over detail. −5 penalty on checks made against a time limit (skills, initiative uses cases per GM).' },
  { id: 'dw-oblivious', name: 'Oblivious (drawback)', category: 'drawback', desc: 'You rarely notice trouble brewing. −2 penalty on Sense Motive checks.', effects: [{ target: 'skill:sense-motive', type: 'penalty', value: -2, note: 'Oblivious' }] },
  { id: 'dw-frail', name: 'Frail (drawback)', category: 'drawback', desc: 'Illness left you weak. −1 penalty on Fortitude saves.', effects: [{ target: 'save:fort', type: 'penalty', value: -1, note: 'Frail' }] },
];

export const traitById = new Map(TRAITS.map((t) => [t.id, t]));
