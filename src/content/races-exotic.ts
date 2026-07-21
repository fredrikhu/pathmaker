import type { RaceDef } from './model';

// Exotic races that are cleanly "just data" at our fidelity. The rest of the exotic/monstrous
// tier is deferred: the 31+ RP monster PCs (Drider, Gargoyle, Trox, Drow Noble) are full monster
// stat blocks, Kasatha's four arms is a combat mechanic, and several others need fly speeds /
// construct types / dual heritages.

export const EXOTIC_RACES: RaceDef[] = [
  {
    id: 'android', name: 'Android', sub: '+2 Dex, +2 Int, −2 Cha',
    desc: 'Artificial people of flesh over a synthetic frame, androids are logical, emotionally reserved, and driven by nanite-laced blood.',
    size: 'medium', speed: 30, abilityMods: { dex: 2, int: 2, cha: -2 },
    traits: [
      { id: 'android-darkvision', name: 'Darkvision', desc: 'See in the dark up to 60 feet (plus low-light vision).', senses: ['Darkvision 60 ft', 'Low-light vision'] },
      { id: 'android-constructed', name: 'Constructed', desc: 'Count as both humanoid and construct. +4 on saves vs mind-affecting effects, paralysis, poison, and stun; immune to fatigue, exhaustion, disease, sleep, fear, and emotion effects; cannot gain morale bonuses.', effects: [{ target: 'save:all', type: 'racial', value: 4, note: 'Constructed (Android)', condition: 'vs mind-affecting, paralysis, poison, and stun' }] },
      { id: 'android-nanite-surge', name: 'Nanite Surge', desc: 'Once per day as an immediate action, gain a bonus of 3 + character level on any one d20 roll.' },
      { id: 'android-alert', name: 'Alert', desc: '+2 racial bonus on Perception checks.', effects: [{ target: 'skill:perception', type: 'racial', value: 2, note: 'Alert (Android)' }] },
      { id: 'android-emotionless', name: 'Emotionless', desc: '−4 penalty on Sense Motive checks.', effects: [{ target: 'skill:sense-motive', type: 'penalty', value: -4, note: 'Emotionless (Android)' }] },
    ],
    altTraits: [],
    languagesAuto: ['common'],
    languagesBonus: ['aklo', 'draconic', 'dwarven', 'elven', 'gnome', 'goblin', 'halfling', 'orc'],
  },
  {
    id: 'gnoll', name: 'Gnoll', sub: '+2 Str, +2 Con',
    desc: 'Hulking hyena-headed humanoids, gnolls are pack hunters and raiders with a scavenger’s cunning and cruelty.',
    size: 'medium', speed: 30, abilityMods: { str: 2, con: 2 },
    traits: [
      { id: 'gnoll-darkvision', name: 'Darkvision', desc: 'See in the dark up to 60 feet.', senses: ['Darkvision 60 ft'] },
      { id: 'gnoll-armor', name: 'Natural Armor', desc: '+1 natural armor bonus from a thick hide.', effects: [{ target: 'ac', type: 'natural-armor', value: 1, note: 'Natural Armor (Gnoll)' }] },
    ],
    altTraits: [],
    languagesAuto: ['gnoll'],
    languagesBonus: ['abyssal', 'common', 'draconic', 'elven', 'gnome', 'goblin', 'orc'],
  },
  {
    // The playable lizardfolk is the 8-RP race-builder entry, whose natural armour is +1. The
    // +5 that gets quoted belongs to the Bestiary monster, which is a different stat block —
    // the RP budget settles it: 2 (flexible) + 2 (natural armour) + 1 (swim) + 1 (bite)
    // + 2 (claws) = 8, and a +5 natural armour could not fit an 8-RP race at all.
    id: 'lizardfolk', name: 'Lizardfolk', sub: '+2 Str, +2 Con',
    desc: 'Proud reptilian predators of the deep swamps, at home in the water and fiercely protective of their wetland territories.',
    size: 'medium', speed: 30, speeds: { swim: 30 }, abilityMods: { str: 2, con: 2 },
    traits: [
      { id: 'lizardfolk-armor', name: 'Natural Armor', desc: '+1 natural armor bonus from tough scaly skin.', effects: [{ target: 'ac', type: 'natural-armor', value: 1, note: 'Natural Armor (Lizardfolk)' }] },
      { id: 'lizardfolk-swim', name: 'Swim', desc: 'A 30-ft swim speed and a +8 racial bonus on Swim checks.' },
      { id: 'lizardfolk-bite', name: 'Bite', desc: 'A natural bite attack dealing 1d3 damage — a primary attack, or secondary while wielding manufactured weapons.', naturalAttacks: [{ name: 'Bite', count: 1, damage: '1d3', dmgType: 'B/P/S', primary: true }] },
      { id: 'lizardfolk-claws', name: 'Claws', desc: 'Two claw attacks dealing 1d4 damage each, both primary natural attacks.', naturalAttacks: [{ name: 'Claw', count: 2, damage: '1d4', dmgType: 'S', primary: true }] },
      { id: 'lizardfolk-xenophobic', name: 'Xenophobic', desc: 'Lizardfolk begin play knowing only their own racial language.' },
    ],
    altTraits: [],
    // Xenophobic: their racial language only — notably no Common.
    languagesAuto: ['draconic'],
    languagesBonus: ['aklo', 'aquan', 'boggard', 'common', 'goblin', 'gnoll', 'orc'],
  },
];
