// Level-1 "pick one" option lists for the Base/Hybrid classes, used by ClassChoiceDef
// kind: 'list'. These are representative core-scope subsets (like our spell/feat content),
// not the exhaustive published lists — the schema supports adding more as pure data.

type Opt = { id: string; name: string; desc: string };

const opt = (id: string, name: string, desc: string): Opt => ({ id, name, desc });

export const BARBARIAN_RAGE_POWERS: Opt[] = [
  opt('animal-fury', 'Animal Fury', 'Gain a bite attack while raging.'),
  opt('guarded-stance', 'Guarded Stance', 'Dodge bonus to AC while raging, scaling with Con.'),
  opt('intimidating-glare', 'Intimidating Glare', 'Demoralize an adjacent foe as a move action.'),
  opt('knockback', 'Knockback', 'Bull rush a foe in place of a melee attack, dealing damage.'),
  opt('low-light-vision', 'Low-Light Vision', 'Gain low-light vision while raging.'),
  opt('night-vision', 'Night Vision', 'Gain 60 ft of darkvision while raging.'),
  opt('no-escape', 'No Escape', 'Move at double speed to pursue a withdrawing foe.'),
  opt('powerful-blow', 'Powerful Blow', 'Once per rage, deal bonus damage on a single hit.'),
  opt('quick-reflexes', 'Quick Reflexes', 'Gain an extra attack of opportunity each round while raging.'),
  opt('reckless-abandon', 'Reckless Abandon', 'Trade AC for a bonus to attack rolls while raging.'),
  opt('renewed-vigor', 'Renewed Vigor', 'Heal yourself as a standard action once per day.'),
  opt('rolling-dodge', 'Rolling Dodge', 'Dodge bonus to AC against ranged attacks for a few rounds.'),
  opt('scent', 'Scent', 'Gain the scent ability while raging.'),
  opt('strength-surge', 'Strength Surge', 'Add your level to one Strength check or combat maneuver.'),
  opt('superstition', 'Superstition', 'Bonus on saves vs spells and spell-like abilities while raging.'),
  opt('surprise-accuracy', 'Surprise Accuracy', 'Once per rage, a morale bonus on one attack roll.'),
  opt('swift-foot', 'Swift Foot', 'Increase your base speed by 5 ft while raging.'),
  opt('lesser-beast-totem', 'Lesser Beast Totem', 'Gain claw attacks while raging.'),
  opt('beast-totem', 'Beast Totem', 'Your claws gain a natural armor bonus and improved crits.'),
  opt('come-and-get-me', 'Come and Get Me', 'Provoke foes for extra damage at the cost of your defenses.'),
  opt('terrifying-howl', 'Terrifying Howl', 'Shake enemies who fail a save against your rage.'),
  opt('unexpected-strike', 'Unexpected Strike', 'Attack of opportunity against a foe that moves adjacent.'),
  opt('ground-breaker', 'Ground Breaker', 'Smash the ground to knock nearby foes off balance.'),
  opt('increased-dr', 'Increased Damage Reduction', 'Raise your damage reduction while raging.'),
  opt('internal-fortitude', 'Internal Fortitude', 'Immune to sickened and nauseated while raging.'),
  opt('roused-anger', 'Roused Anger', 'Enter a rage even while fatigued.'),
  opt('fearless-rage', 'Fearless Rage', 'Immune to the shaken and frightened conditions while raging.'),
  opt('clear-mind', 'Clear Mind', 'Reroll a failed Will save while raging, once per rage.'),
  opt('mighty-swing', 'Mighty Swing', 'Automatically confirm a critical hit, once per rage.'),
  opt('moment-of-clarity', 'Moment of Clarity', 'Act for one round as if you were not raging.'),
  opt('raging-climber', 'Raging Climber', 'Add your barbarian level to Climb checks while raging.'),
  opt('raging-leaper', 'Raging Leaper', 'Add your barbarian level to Acrobatics checks to jump while raging.'),
  opt('raging-swimmer', 'Raging Swimmer', 'Add your barbarian level to Swim checks while raging.'),
  opt('guarded-life', 'Guarded Life', 'When brought below 0 hp, convert some lethal damage to nonlethal and stay stable.'),
  opt('elemental-rage', 'Elemental Rage', 'Your melee attacks deal extra energy damage while raging.'),
  opt('greater-beast-totem', 'Greater Beast Totem', 'Your claws grow and you gain pounce while raging (requires Beast Totem).'),
];

export const ROGUE_TALENTS: Opt[] = [
  opt('bleeding-attack', 'Bleeding Attack', 'Sneak-attacked foes take ongoing bleed damage.'),
  opt('combat-trick', 'Combat Trick', 'Gain a bonus combat feat.'),
  opt('fast-stealth', 'Fast Stealth', 'Move at full speed while using Stealth.'),
  opt('finesse-rogue', 'Finesse Rogue', 'Gain Weapon Finesse as a bonus feat.'),
  opt('ledge-walker', 'Ledge Walker', 'Use Acrobatics on narrow surfaces at full speed.'),
  opt('major-magic', 'Major Magic', 'Cast a chosen 1st-level arcane spell twice per day (requires Minor Magic).'),
  opt('minor-magic', 'Minor Magic', 'Cast a chosen cantrip three times per day.'),
  opt('quick-disable', 'Quick Disable', 'Disarm a trap in half the normal time.'),
  opt('resiliency', 'Resiliency', 'Gain temporary hit points when brought low, once per day.'),
  opt('rogue-crawl', 'Rogue Crawl', 'Move at half speed while prone.'),
  opt('slow-reactions', 'Slow Reactions', 'Sneak-attacked foes cannot make attacks of opportunity.'),
  opt('stand-up', 'Stand Up', 'Stand from prone as a free action.'),
  opt('surprise-attack', 'Surprise Attack', 'All foes are flat-footed to you during the surprise round.'),
  opt('trap-spotter', 'Trap Spotter', 'Automatically attempt Perception near traps.'),
  opt('weapon-training-talent', 'Weapon Training', 'Gain Weapon Focus as a bonus feat.'),
  opt('fast-getaway', 'Fast Getaway', 'Withdraw as a move action after a sneak attack or theft.'),
  opt('coax-information', 'Coax Information', 'Use Bluff or Intimidate in place of Diplomacy to gather info.'),
  opt('expert-leaper', 'Expert Leaper', 'Treat jumps as running and reduce falling damage.'),
  opt('nimble-climber', 'Nimble Climber', 'Catch yourself when a Climb check fails.'),
  opt('positioning-attack', 'Positioning Attack', 'Move around a foe without provoking once per day.'),
  opt('sniper-eye', "Sniper's Eye", 'Deliver sneak attacks at range and ignore some concealment.'),
  opt('distracting-attack', 'Distracting Attack', 'Make a sneak-attacked foe flat-footed to an ally.'),
  opt('cunning-trigger', 'Cunning Trigger', 'Trigger a known trap as a swift action from a distance.'),
  opt('befuddling-strike', 'Befuddling Strike', 'A sneak-attacked foe takes a penalty on attack rolls against you.'),
  opt('offensive-defense', 'Offensive Defense', 'A sneak attack grants you a scaling dodge bonus to AC.'),
  opt('peerless-maneuver', 'Peerless Maneuver', 'Reroll a failed Acrobatics check, once per day.'),
  opt('terrain-mastery', 'Terrain Mastery', 'Ignore difficult terrain in a chosen environment.'),
  opt('canny-observer', 'Canny Observer', '+4 on Perception to hear conversation or find hidden objects.'),
  opt('fast-fingers', 'Fast Fingers', 'Reroll a failed Sleight of Hand check, once per day.'),
  opt('honeyed-words', 'Honeyed Words', 'Reroll a failed Bluff check, once per day.'),
];

export const ROGUE_ADVANCED_TALENTS: Opt[] = [
  opt('crippling-strike', 'Crippling Strike', 'Sneak attacks deal 2 points of Strength damage.'),
  opt('defensive-roll', 'Defensive Roll', 'Reduce a lethal blow to half with a Reflex save, once per day.'),
  opt('dispelling-attack', 'Dispelling Attack', 'Sneak attacks act as a targeted dispel magic.'),
  opt('improved-evasion', 'Improved Evasion', 'Take no damage on a successful Reflex save and half on a failure.'),
  opt('opportunist', 'Opportunist', 'Make an attack of opportunity against a foe an ally just struck.'),
  opt('skill-mastery', 'Skill Mastery', 'Take 10 on chosen skills even under stress.'),
  opt('slippery-mind', 'Slippery Mind', 'Reroll a failed save vs an enchantment one round later.'),
  opt('advanced-feat', 'Feat', 'Gain a bonus feat of your choice.'),
];

/** Oracle revelations, keyed by mystery id — the options for the source-dependent revelation
 *  pick (levels 1/3/7/11/15/19). Core-scope representative sets per mystery. */
export const ORACLE_REVELATIONS: Record<string, Opt[]> = {
  battle: [
    opt('war-sight', 'War Sight', 'Roll initiative twice and take the better result.'),
    opt('battlecry', 'Battlecry', 'A shout grants allies a morale bonus on attacks and saves.'),
    opt('weapon-mastery', 'Weapon Mastery', 'Gain bonus combat feats with a chosen weapon.'),
    opt('skill-at-arms', 'Skill at Arms', 'Gain proficiency with all martial weapons and heavy armor.'),
    opt('surprising-charge', 'Surprising Charge', 'Move as an immediate action once per day (more as you level).'),
    opt('iron-skin', 'Iron Skin', 'Once/day, your skin hardens as stoneskin.'),
  ],
  bones: [
    opt('armor-of-bones', 'Armor of Bones', 'Conjure protective bones for an armor bonus to AC.'),
    opt('bleeding-wounds', 'Bleeding Wounds', 'Creatures you damage take ongoing bleed damage.'),
    opt('deaths-touch', "Death's Touch", 'A touch attack deals negative energy (heals undead).'),
    opt('near-death', 'Near Death', 'Bonus on saves vs disease, death effects, and poison.'),
    opt('raise-the-dead', 'Raise the Dead', 'Summon an undead servant to fight for you.'),
    opt('undead-servitude', 'Undead Servitude', 'Command undead as a bonus feat, usable several times a day.'),
  ],
  flame: [
    opt('touch-of-flame', 'Touch of Flame', 'A melee touch deals fire damage, scaling with level.'),
    opt('firestorm', 'Firestorm', 'Once/day, wreath an area in flame that spares your allies.'),
    opt('form-of-flame', 'Form of Flame', 'Assume the form of a fire elemental.'),
    opt('gaze-of-flames', 'Gaze of Flames', 'See through fire, smoke, and fog; later gain fire sight.'),
    opt('heat-aura', 'Heat Aura', 'Burst of heat damages and dazzles nearby foes.'),
    opt('cinder-dance', 'Cinder Dance', 'Increase your base speed; later gain Nimble Moves.'),
  ],
  heavens: [
    opt('awesome-display', 'Awesome Display', 'Your illusion (pattern) spells treat foes as lower-HD.'),
    opt('coat-of-many-stars', 'Coat of Many Stars', 'Conjure a starry coat granting an armor bonus.'),
    opt('lure-of-the-heavens', 'Lure of the Heavens', 'Hover above the ground; later gain flight.'),
    opt('moonlight-bridge', 'Moonlight Bridge', 'Create a bridge of moonlight you can cross.'),
    opt('spray-of-stars', 'Spray of Shooting Stars', 'Loose a burst of stars dealing fire damage.'),
    opt('star-chart', 'Star Chart', 'Reference a chart to gain commune-like guidance.'),
  ],
  life: [
    opt('channel', 'Channel', 'Channel positive energy as a cleric of your level.'),
    opt('enhanced-cures', 'Enhanced Cures', 'Your cure spells heal as though you were higher level.'),
    opt('healing-hands', 'Healing Hands', 'Bonus on Heal checks and faster, better first aid.'),
    opt('life-link', 'Life Link', 'Bond to allies to share and absorb their wounds.'),
    opt('lifesense', 'Lifesense', 'Sense living creatures around you without sight.'),
    opt('safe-curing', 'Safe Curing', 'Your healing spells provoke no attacks of opportunity.'),
  ],
  lore: [
    opt('lore-keeper', 'Lore Keeper', 'Use Charisma for Knowledge checks by touch.'),
    opt('sidestep-secret', 'Sidestep Secret', 'Use Charisma instead of Dexterity for AC and Reflex.'),
    opt('brain-drain', 'Brain Drain', 'Psychically ransack a foe\'s mind for damage and knowledge.'),
    opt('focused-trance', 'Focused Trance', 'Enter a trance for a bonus on saves and a skill check.'),
    opt('mental-acuity', 'Mental Acuity', 'Gain a permanent, scaling bonus to Intelligence.'),
    opt('think-on-it', 'Think On It', 'Reroll a failed Knowledge check once per day.'),
  ],
  nature: [
    opt('bonded-mount', 'Bonded Mount', 'Gain an animal companion mount.'),
    opt('friend-to-animals', 'Friend to the Animals', 'Nearby animals gain bonuses on saves; they won\'t attack you.'),
    opt('natures-whispers', "Nature's Whispers", 'Use Charisma instead of Dexterity for AC and Reflex.'),
    opt('natural-divination', 'Natural Divination', 'Read the natural world for bonuses and insights.'),
    opt('erosion-touch', 'Erosion Touch', 'A touch deals damage to objects and constructs.'),
    opt('spirit-of-nature', 'Spirit of Nature', 'Gain fast healing when near death in natural settings.'),
  ],
  stone: [
    opt('earth-glide', 'Earth Glide', 'Move through earth and stone as a fish swims water.'),
    opt('rock-throwing', 'Rock Throwing', 'Hurl rocks for scaling damage at range.'),
    opt('stone-stability', 'Stone Stability', 'Bonus to resist bull rush and trip; later slow fall.'),
    opt('mighty-pebble', 'Mighty Pebble', 'Charge and throw a pebble that bursts on impact.'),
    opt('crystal-sight', 'Crystal Sight', 'See through earth and stone up to a range.'),
    opt('steelbreaker-skin', 'Steelbreaker Skin', 'Your skin damages weapons that strike you.'),
  ],
  waves: [
    opt('water-sight', 'Water Sight', 'Scry through bodies of water; later gain water-based sight.'),
    opt('fluid-nature', 'Fluid Nature', 'Bonus to resist combat maneuvers; gain Dodge.'),
    opt('fluid-travel', 'Fluid Travel', 'Walk on or move swiftly through water.'),
    opt('ice-armor', 'Ice Armor', 'Conjure armor of ice for an armor bonus to AC.'),
    opt('wintry-touch', 'Wintry Touch', 'A touch deals cold damage, scaling with level.'),
    opt('freezing-spells', 'Freezing Spells', 'Foes failing saves vs your spells are staggered by cold.'),
  ],
  wind: [
    opt('air-barrier', 'Air Barrier', 'Conjure swirling winds for an armor bonus and deflection.'),
    opt('wings-of-air', 'Wings of Air', 'Sprout wings granting a fly speed.'),
    opt('lightning-breath', 'Lightning Breath', 'Breathe a line of electricity for scaling damage.'),
    opt('touch-of-electricity', 'Touch of Electricity', 'A touch deals electricity damage, scaling with level.'),
    opt('thunderburst', 'Thunderburst', 'A burst of sound and force deafens and knocks foes prone.'),
    opt('wind-sight', 'Wind Sight', 'Ignore concealment from wind and see at a distance.'),
  ],
};

export const PALADIN_MERCIES: Opt[] = [
  opt('fatigued', 'Fatigued', 'Lay on hands also removes the fatigued condition.'),
  opt('shaken', 'Shaken', 'Lay on hands also removes the shaken condition.'),
  opt('sickened', 'Sickened', 'Lay on hands also removes the sickened condition.'),
  opt('dazed', 'Dazed', 'Lay on hands also removes the dazed condition (6th+).'),
  opt('diseased', 'Diseased', 'Lay on hands also neutralizes a disease (6th+).'),
  opt('staggered', 'Staggered', 'Lay on hands also removes the staggered condition (6th+).'),
  opt('cursed', 'Cursed', 'Lay on hands also removes a curse (12th+).'),
  opt('exhausted', 'Exhausted', 'Lay on hands also removes the exhausted condition (12th+).'),
  opt('frightened', 'Frightened', 'Lay on hands also removes the frightened condition (12th+).'),
  opt('nauseated', 'Nauseated', 'Lay on hands also removes the nauseated condition (12th+).'),
  opt('poisoned', 'Poisoned', 'Lay on hands also neutralizes a poison (12th+).'),
  opt('blinded', 'Blinded', 'Lay on hands also removes the blinded condition (18th+).'),
  opt('deafened', 'Deafened', 'Lay on hands also removes the deafened condition (18th+).'),
  opt('paralyzed', 'Paralyzed', 'Lay on hands also removes the paralyzed condition (18th+).'),
  opt('stunned', 'Stunned', 'Lay on hands also removes the stunned condition (18th+).'),
];

export const PALADIN_DIVINE_BOND: Opt[] = [
  opt('mount', 'Celestial Mount', 'Summon a loyal celestial servant to ride into battle.'),
  opt('weapon', 'Bonded Weapon', 'Grant a held weapon temporary magical enhancements.'),
];

export const ALCHEMIST_DISCOVERIES: Opt[] = [
  opt('precise-bombs', 'Precise Bombs', 'Exclude squares from your bomb splash so allies are spared.'),
  opt('fast-bombs', 'Fast Bombs', 'Throw multiple bombs as a full attack.'),
  opt('explosive-bomb', 'Explosive Bomb', 'Bombs catch targets on fire and have a larger splash.'),
  opt('frost-bomb', 'Frost Bomb', 'Bombs deal cold damage and can stagger the target.'),
  opt('acid-bomb', 'Acid Bomb', 'Bombs deal acid damage that bypasses many defenses.'),
  opt('force-bomb', 'Force Bomb', 'Bombs deal force damage and can knock foes prone.'),
  opt('concussive-bomb', 'Concussive Bomb', 'Bombs deal sonic damage and can deafen.'),
  opt('smoke-bomb', 'Smoke Bomb', 'Bombs create a cloud of concealing smoke.'),
  opt('infusion', 'Infusion', 'Your extracts persist and can be used by others.'),
  opt('feral-mutagen', 'Feral Mutagen', 'Your mutagen grants claws and a bite.'),
  opt('spontaneous-healing', 'Spontaneous Healing', 'Heal yourself quickly a number of times per day.'),
  opt('vestigial-arm', 'Vestigial Arm', 'Grow an extra arm that can hold or use items.'),
  opt('tumor-familiar', 'Tumor Familiar', 'Grow a familiar that can detach and reattach.'),
  opt('wings', 'Wings', 'Grow wings granting a fly speed for a time.'),
  opt('dispelling-bomb', 'Dispelling Bomb', 'Bombs act as a targeted dispel magic on the primary target.'),
  opt('stink-bomb', 'Stink Bomb', 'Bombs fill their splash radius with nauseating gas.'),
  opt('healing-bomb', 'Healing Bomb', 'Throw a bomb of your cure extract to heal instead of harm.'),
  opt('tanglefoot-bomb', 'Tanglefoot Bomb', 'Bombs entangle the target like a tanglefoot bag.'),
  opt('delayed-bomb', 'Delayed Bomb', 'Set a bomb to detonate on a later round.'),
  opt('greater-mutagen', 'Greater Mutagen', 'Your mutagen boosts two physical abilities and gives two skill bonuses.'),
  opt('grand-mutagen', 'Grand Mutagen', 'Your mutagen boosts all three physical abilities.'),
  opt('combine-extracts', 'Combine Extracts', 'Prepare two extracts in a single higher-level slot.'),
  opt('mummification', 'Mummification', 'Preserve your body, gaining DR and immunities of the undead.'),
];

export const MAGUS_ARCANA: Opt[] = [
  opt('arcane-accuracy', 'Arcane Accuracy', 'Spend arcane pool for an insight bonus to attack.'),
  opt('close-range', 'Close Range', 'Deliver ranged touch spells through spellstrike.'),
  opt('empowered-magic', 'Empowered Magic', 'Apply Empower Spell using the arcane pool.'),
  opt('maximized-magic', 'Maximized Magic', 'Apply Maximize Spell using the arcane pool.'),
  opt('pool-strike', 'Pool Strike', 'Spend pool to add energy damage to a spellstrike.'),
  opt('spell-blending', 'Spell Blending', 'Add spells from the wizard list to your spells known.'),
  opt('spell-shield', 'Spell Shield', 'Spend pool for a shield bonus to AC as an immediate action.'),
  opt('accurate-strike', 'Accurate Strike', 'Spend pool to make a melee attack resolve as a touch attack.'),
  opt('concentrate', 'Concentrate', 'Reroll a concentration check using the arcane pool.'),
  opt('familiar', 'Familiar', 'Gain an arcane familiar.'),
  opt('hasted-assault', 'Hasted Assault', 'Spend pool to gain the benefits of haste briefly.'),
  opt('ghost-blade', 'Ghost Blade', 'Your black blade or weapon can strike incorporeal foes.'),
  opt('bane-blade', 'Bane Blade', 'Spend pool to give your weapon the bane property against a chosen foe type.'),
  opt('devoted-blade', 'Devoted Blade', 'Spend pool to add an alignment property to your weapon.'),
  opt('reflection', 'Reflection', 'Spend pool to reflect a spell back at its caster as an immediate action.'),
  opt('wand-wielder', 'Wand Wielder', 'Activate a wand in place of a spell during spellstrike or spell combat.'),
  opt('dispelling-strike', 'Dispelling Strike', 'Spend pool to add a targeted dispel magic to a spellstrike.'),
  opt('broad-study', 'Broad Study', 'Deliver spells from another of your class lists through spellstrike.'),
];

export const CAVALIER_ORDERS: Opt[] = [
  opt('cockatrice', 'Order of the Cockatrice', 'Self-interest and appetite; add Cha to damage vs a challenged foe.'),
  opt('dragon', 'Order of the Dragon', 'Loyalty to companions; aid another grants your allies larger bonuses.'),
  opt('flame', 'Order of the Flame', 'Vengeance and honor; scaling bonuses as a challenge persists.'),
  opt('lion', 'Order of the Lion', 'Service to a sovereign; bonuses to defend and rally allies.'),
  opt('shield', 'Order of the Shield', 'Protector of the common folk; bonuses vs those who threaten the weak.'),
  opt('star', 'Order of the Star', 'Devotion to a faith; channel-supporting and save bonuses.'),
  opt('sword', 'Order of the Sword', 'Chivalry and mounted honor; bonuses while mounted and to challenges.'),
];

export const GUNSLINGER_FIREARMS: Opt[] = [
  opt('pistol', 'Pistol', 'A one-handed firearm — the versatile default.'),
  opt('musket', 'Musket', 'A two-handed firearm with longer range and heavier damage.'),
  opt('blunderbuss', 'Blunderbuss', 'A scatter weapon striking a cone at short range.'),
];

export const ORACLE_MYSTERIES: Opt[] = [
  opt('battle', 'Battle', 'War and carnage; martial revelations and weapon focus.'),
  opt('bones', 'Bones', 'Death and undeath; command and drain the living.'),
  opt('flame', 'Flame', 'Fire and passion; resistances and burning revelations.'),
  opt('heavens', 'Heavens', 'Stars and sky; awe-inspiring light and luck.'),
  opt('life', 'Life', 'Healing and vitality; the classic support mystery.'),
  opt('lore', 'Lore', 'Knowledge and secrets; mental and divination revelations.'),
  opt('nature', 'Nature', 'The wild; companions and natural resilience.'),
  opt('stone', 'Stone', 'Earth and endurance; armor and steadfastness.'),
  opt('waves', 'Waves', 'Water and change; fluid movement and cold.'),
  opt('wind', 'Wind', 'Air and freedom; flight and lightning.'),
];

export const ORACLE_CURSES: Opt[] = [
  opt('clouded-vision', 'Clouded Vision', 'Limited sight, but eventually darkvision and blindsense.'),
  opt('deaf', 'Deaf', 'Cannot hear, but gain bonuses and eventually tremorsense.'),
  opt('haunted', 'Haunted', 'Spirits hinder your gear, but grant you defensive spells.'),
  opt('lame', 'Lame', 'Reduced speed that can never be slowed further; later immunity to fatigue.'),
  opt('tongues', 'Tongues', 'You speak only one language in combat, but learn many others.'),
  opt('wasting', 'Wasting', 'Sickness clings to you, but you gain disease immunity in time.'),
];

export const WITCH_PATRONS: Opt[] = [
  opt('agility', 'Agility', 'Grace and speed; adds mobility spells to your familiar.'),
  opt('animals', 'Animals', 'The beasts of the world; summoning and animal spells.'),
  opt('deception', 'Deception', 'Lies and illusions; trickery spells.'),
  opt('elements', 'Elements', 'Raw energy; blasting spells.'),
  opt('endurance', 'Endurance', 'Resilience; protective and enduring spells.'),
  opt('healing', 'Healing', 'Mending; the cure line added to your list.'),
  opt('plague', 'Plague', 'Disease and decay; contagion spells.'),
  opt('shadow', 'Shadow', 'Darkness; concealment and shadow spells.'),
  opt('strength', 'Strength', 'Might; enhancement and enlarging spells.'),
  opt('winter', 'Winter', 'Cold and ice; frost spells.'),
];

export const WITCH_HEXES: Opt[] = [
  opt('cackle', 'Cackle', 'Extend the duration of your ongoing hexes as a move action.'),
  opt('charm', 'Charm', 'Improve a creature’s attitude toward you.'),
  opt('evil-eye', 'Evil Eye', 'Impose a lingering penalty on a foe’s rolls.'),
  opt('flight', 'Flight', 'Gain feather fall, then levitate and fly as you advance.'),
  opt('fortune', 'Fortune', 'Let an ally reroll and take the better result.'),
  opt('healing', 'Healing', 'Heal a creature with a touch, once per day per target.'),
  opt('misfortune', 'Misfortune', 'Force a foe to take the worse of two rolls.'),
  opt('slumber', 'Slumber', 'Send a creature into a deep sleep — a signature control hex.'),
  opt('ward', 'Ward', 'Grant a creature a bonus to AC and saves until it is hit.'),
  opt('prehensile-hair', 'Prehensile Hair', 'Animate your hair to manipulate objects and strike at reach.'),
  opt('ice-tomb', 'Ice Tomb', 'Encase a foe in ice, paralyzing and damaging it (major hex).'),
  opt('retribution', 'Retribution', 'A foe that harms an ally takes sickening lash-back damage.'),
  opt('tongues-hex', 'Tongues', 'Understand and speak any language for a time.'),
  opt('water-lung', 'Water Lung', 'Let a creature breathe water (or air) for a time.'),
  opt('vision', 'Vision', 'Grant a target a prophetic vision by touch.'),
  opt('nails', 'Nails', 'Grow claws that deal scaling damage.'),
  opt('disguise-hex', 'Disguise', 'Alter your appearance at will as disguise self.'),
  opt('blight', 'Blight', 'Wither the plants and land in an area over time (major hex).'),
  opt('hoarfrost', 'Hoarfrost', 'Coat a foe in frost that deals cold damage each round (major hex).'),
  opt('agony', 'Agony', 'Wrack a foe with debilitating pain, leaving it nauseated (major hex).'),
  opt('beast-of-ill-omen', 'Beast of Ill Omen', 'Send your familiar to curse a foe with misfortune (major hex).'),
  opt('coven', 'Coven', 'Join with other witches and hags to work greater magic together.'),
  opt('scar', 'Scar', 'Mark a creature to hex it at any distance.'),
  opt('life-giver', 'Life Giver', 'Once per day, restore a dead creature to life (grand hex).'),
  opt('eternal-slumber', 'Eternal Slumber', 'Put a foe into a sleep from which it cannot wake normally (grand hex).'),
];

export const SUMMONER_EIDOLON_FORMS: Opt[] = [
  opt('biped', 'Biped', 'Two legs, two arms; strong at wielding weapons and reach.'),
  opt('quadruped', 'Quadruped', 'Four legs; fast and strong, good for mounts and maulers.'),
  opt('serpentine', 'Serpentine', 'A long body with reach and a grabbing tail.'),
];

export const ARCANIST_EXPLOITS: Opt[] = [
  opt('arcane-weapon', 'Arcane Weapon', 'Spend reservoir to give your weapon a temporary enhancement.'),
  opt('dimensional-slide', 'Dimensional Slide', 'Teleport a short distance as part of your movement.'),
  opt('energy-absorption', 'Energy Absorption', 'Absorb incoming energy damage using the reservoir.'),
  opt('familiar', 'Familiar', 'Gain an arcane familiar.'),
  opt('flame-arc', 'Flame Arc', 'Loose a line of fire as a reservoir-fueled attack.'),
  opt('potent-magic', 'Potent Magic', 'Spend reservoir to raise a spell’s caster level or save DC.'),
  opt('quick-study', 'Quick Study', 'Prepare a spell in a slot on the fly using the reservoir.'),
];

export const BLOODRAGER_BLOODLINES: Opt[] = [
  opt('aberrant', 'Aberrant', 'Alien flesh; reach and rubbery resilience while raging.'),
  opt('abyssal', 'Abyssal', 'Demonic fury; claws and raw strength.'),
  opt('arcane', 'Arcane', 'Innate magic; enhance your spells and gear mid-rage.'),
  opt('celestial', 'Celestial', 'Heavenly blood; resistances and radiant strikes.'),
  opt('destined', 'Destined', 'Fate favors you; saves and defensive luck.'),
  opt('draconic', 'Draconic', 'Dragon blood; a breath-like strike and natural armor.'),
  opt('elemental', 'Elemental', 'A chosen element; energy damage and resistance.'),
  opt('fey', 'Fey', 'Trickster blood; confusion and woodland speed.'),
  opt('infernal', 'Infernal', 'Devilish heritage; fire and iron will.'),
  opt('undead', 'Undead', 'Deathless blood; resistance to the tricks of the grave.'),
];

export const SHIFTER_ASPECTS: Opt[] = [
  opt('bear', 'Bear', 'Might and toughness; a bonus to Strength and Con-like resilience.'),
  opt('bull', 'Bull', 'Powerful build and charging force.'),
  opt('eagle', 'Eagle', 'Keen sight and, later, flight (falcon/owl aspects).'),
  opt('frog', 'Frog', 'Reach with a grabbing tongue and swimming.'),
  opt('lion', 'Lion', 'Pounce and pack tactics.'),
  opt('monkey', 'Monkey', 'Climbing and dexterous grace.'),
  opt('snake', 'Snake', 'A venomous bite and sinuous defense.'),
  opt('stag', 'Stag', 'Speed and antler gore attacks.'),
  opt('tiger', 'Tiger', 'Rending claws and predatory leaps.'),
  opt('wolf', 'Wolf', 'Trip attacks and scent-driven tracking.'),
];

export const SHAMAN_SPIRITS: Opt[] = [
  opt('battle', 'Battle', 'War fury; martial hexes and weapon prowess.'),
  opt('bones', 'Bones', 'Death and undeath; draining and command hexes.'),
  opt('flame', 'Flame', 'Fire; resistances and burning hexes.'),
  opt('heavens', 'Heavens', 'Sky and stars; dazzling, luck-shifting hexes.'),
  opt('life', 'Life', 'Vitality; potent healing hexes.'),
  opt('lore', 'Lore', 'Knowledge; mental and divination hexes.'),
  opt('nature', 'Nature', 'The wild; companion and natural hexes.'),
  opt('stone', 'Stone', 'Earth; steadfast, armoring hexes.'),
  opt('waves', 'Waves', 'Water; cold and fluid hexes.'),
  opt('wind', 'Wind', 'Air; flight and lightning hexes.'),
];
