// Level-1 "pick one" option lists for the Base/Hybrid classes, used by ClassChoiceDef
// kind: 'list'. These are representative core-scope subsets (like our spell/feat content),
// not the exhaustive published lists — the schema supports adding more as pure data.

type Opt = { id: string; name: string; desc: string };

const opt = (id: string, name: string, desc: string): Opt => ({ id, name, desc });

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
