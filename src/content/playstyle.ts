// Authored playstyle text, keyed on the tags the fingerprint emits.
//
// This is the half of "how do I play this character" that no amount of arithmetic produces. The
// engine can tell you a Barbarian has 17 rounds of rage; only a person can tell you that rage is a
// budget for the whole day rather than for one fight, and that the round you spend it on the wrong
// enemy is the round you do not have later.
//
// Everything here is prose about how a build plays at a table. It is opinion, and it is meant to
// be — the numbers next to it are the part the engine can defend. Two rules keep it honest:
//
//   1. No fragment states a rule or a number. The moment text says "you get +2" it can go stale
//      against the engine, and the engine is the authority. Text describes intent; the sheet
//      states facts.
//   2. Every fragment has to read correctly on its own, because which ones appear together is
//      decided by the build, not by an author. Nothing may assume a neighbouring sentence.

import type {
  ArmorPosture, CastingLean, CombatRole, FeatTheme, Gap, OffenseStyle, PartyRole, Strength,
} from '../engine/fingerprint';

export interface ClassPlaystyle {
  /** A noun phrase completing "You are …". Kept short; the style clause is appended to it. */
  identity: string;
  /** What the class's own machinery pushes you toward, in two or three sentences. */
  approach: string;
}

/** What each class is for at a table. The single strongest signal in the whole brief, so these
 *  carry the most weight and are written to be read on their own. */
export const CLASS_PLAYSTYLE: Record<string, ClassPlaystyle> = {
  fighter: {
    identity: 'a weapon specialist',
    approach: 'You get more feats than anyone else and no instructions for spending them. That is the design: choose one way of fighting and become unmatched at it, rather than adequate at three. Nothing you do is rationed, so you are exactly as dangerous in the last fight of the day as the first — which makes you the party member who can always act while everyone else is counting what they have left.',
  },
  barbarian: {
    identity: 'a damage engine on a timer',
    approach: 'Rage is the class. It is also a budget for the entire adventuring day rather than for one fight, so the real skill is deciding which fights deserve it and staying out of rage for the ones that do not. While raging you hit far harder and defend worse — rage costs you Armor Class and locks you out of most Charisma-, Dexterity- and Intelligence-based skills. Will is the save the class never fixes, and the enemy who turns you around does its damage with you rather than to you.',
  },
  bard: {
    identity: "the party's force multiplier",
    approach: 'Your own numbers are deliberately middling. Bardic performance is where your power sits, and it raises four other characters at once, which beats anything you could do alone. Start the performance early — it usually costs you a round you would rather spend attacking, and it is still worth it — then fill the rest of the fight with spells and whatever weapon you carry.',
  },
  cleric: {
    identity: "the party's spine",
    approach: 'You are a full caster who can also stand in the front rank, and the temptation is to spend the whole fight healing. Resist it: healing in combat rarely keeps up with damage, and your list is full of buffs that stop the damage happening. Save the healing for after the fight and for the moment someone actually drops. Channel energy is the exception, because it hits everyone at once.',
  },
  druid: {
    identity: 'three characters in one',
    approach: 'You are a full caster, a shapechanger and an animal handler, and trying to be all three in the same round is how druids stall. Pick a mode per fight: cast if the battlefield needs shaping, shift if it needs a body in the way. If your nature bond bought a companion, it acts every round regardless, which quietly gives you the best action economy in the party.',
  },
  monk: {
    identity: 'a mobile skirmisher',
    approach: 'You move further and more freely than anyone, and your defences are built from your own body rather than from gear. The trap is standing still and trading blows, which is the one thing you are not built for. Use your speed to reach the enemy nobody else can — the caster at the back, the archer on the ledge — and let the armoured characters hold the line.',
  },
  paladin: {
    identity: 'a boss-killer with a conscience',
    approach: 'Smite evil is a small number of enormous turns rather than steady output. Spend one on the single most dangerous evil creature in the room and you may end the fight; spread them across minions and you have wasted the class. Your saves are the best in the game and they cover the whole party standing near you, which makes you the answer to fear and magic as much as to a big enemy.',
  },
  ranger: {
    identity: 'a specialist hunter',
    approach: 'Against your favoured enemies and in your favoured terrain you outclass everyone; elsewhere you are a solid martial character with good skills. Play to that: you are the one who tracks, scouts and knows what the thing in the woods is, and then fights it better than anyone. Your spells arrive late and are almost all utility — treat them as tools, not as a caster turn.',
  },
  rogue: {
    identity: 'a precision striker who solves the problems fights cannot',
    approach: 'Sneak attack needs a condition to be met, so most of your combat thinking is about arranging that condition rather than about the attack itself — flanking, catching an enemy flat-footed, striking from where you were not seen. Out of combat you have more skill ranks than anyone and they are the actual reason to bring you.',
  },
  sorcerer: {
    identity: 'narrow, deep arcane power',
    approach: 'You know few spells and can cast each of them many times, which is the exact opposite of a wizard. That makes every spell known a real commitment, and it makes you superb at doing one thing relentlessly. Pick spells that stay useful at every level rather than answers to specific problems — you cannot swap them out tomorrow.',
  },
  warpriest: {
    identity: 'a fighting priest',
    approach: 'You cast in armour, in the front rank, and most of your spells are short buffs meant to be cast on yourself mid-fight rather than prepared in advance. Fervor lets you buff and swing in the same round, which is the trick the class is built around. You are not as strong a caster as a cleric or as strong a fighter as a fighter, and being both at once is the point.',
  },
  wizard: {
    identity: "the party's toolbox",
    approach: 'Your power is preparation. Knowing what tomorrow holds is worth more than any single spell, and the wizard who scouts before resting outperforms the one who prepares the same list every day. In a fight, shaping the battlefield beats adding damage: a spell that removes two enemies from the fight is worth more than one that hurts all of them a little.',
  },
  alchemist: {
    identity: 'a self-buffing artillerist',
    approach: 'Bombs are a ranged attack that needs no weapon, and extracts are spells you can only cast on yourself. That combination makes you self-sufficient in a way no other class is: you buff yourself in advance, then throw. Mutagen turns you into a passable melee combatant for a while, which is worth remembering when the enemy closes.',
  },
  cavalier: {
    identity: 'a mounted charger and a battlefield leader',
    approach: 'A charge from a mount is the single biggest hit most parties will see at low levels, and your order and banner quietly improve everyone around you. The catch is terrain: indoors and underground your mount is a liability, so have a plan for fighting on foot before it comes up rather than during.',
  },
  gunslinger: {
    identity: 'touch-attack artillery',
    approach: 'Firearms resolve against touch AC at close range, which means armoured enemies that frustrate the rest of the party are the ones you shoot most easily. Grit pays for your best tricks and comes back when you do something spectacular, so it rewards aggression rather than hoarding. Reloading is your real constraint — build around it or spend your turns doing it.',
  },
  inquisitor: {
    identity: 'a versatile hunter with a divine mandate',
    approach: 'Judgement lets you decide what kind of fight this is going to be after seeing the enemy, which is a rare and powerful thing. You are a competent caster, a competent fighter and genuinely good at reading people, and the class works best when you use all three rather than committing to one.',
  },
  magus: {
    identity: 'a duelist who casts through the sword',
    approach: 'Spell combat and spellstrike let you attack and cast in the same round, delivering the spell with your weapon. That is the class, and everything else supports it. Your arcane pool sharpens the blade you are already swinging. You are fragile for a front-liner, so pick your moment to close rather than standing in the open.',
  },
  oracle: {
    identity: 'a divine caster who paid for it',
    approach: 'You cast spontaneously from a divine list, which makes you the reliable one when the party needs the same answer three times in a fight. Your curse is not only a drawback — it is the character, and it usually gives back something specific. Your mystery decides far more about how you play than your class does.',
  },
  shifter: {
    identity: 'a shapechanger who fights with the body they are wearing',
    approach: 'Your aspects change what kind of combatant you are between fights rather than during them, so the decision that matters is made before initiative. Natural attacks reward you for closing and staying close, and you have neither the armour nor the healing to make a mistake there cheap.',
  },
  summoner: {
    identity: 'you and your monster',
    approach: 'The eidolon is the class. It is usually a better fighter than you are, and you should read the pair as one character with two bodies. That gives you two turns every round, which is the strongest thing you have — while your own spell list is short and mostly exists to keep the eidolon standing.',
  },
  witch: {
    identity: 'hexes and a patron',
    approach: 'Hexes cost nothing and can be used every fight, forever, which makes them the most reliable thing in your kit and the reason to play the class. Your spells are the heavy artillery on top. Many of your best effects are single-target save-or-suffer, so you want the enemy who matters most, not the nearest one.',
  },
  'vampire-hunter': {
    identity: 'a specialist monster slayer',
    approach: 'You are built against a specific kind of enemy and you are exceptional when facing it. Against everything else you are a capable martial character with useful knowledge. Preparation is most of your advantage: knowing what you are about to fight is worth more than any single ability.',
  },
  arcanist: {
    identity: 'prepared spells cast spontaneously',
    approach: 'You prepare a list like a wizard and then cast from it freely like a sorcerer, which means you get the flexibility of preparation without the sting of having guessed wrong about quantities. Your reservoir buys exploits that bend spells mid-fight. It is a class that rewards knowing your own list very well.',
  },
  bloodrager: {
    identity: 'rage that casts',
    approach: 'You rage like a barbarian and cast a short list of arcane spells while doing it — mostly personal buffs that make the rage hit harder. The bloodline is the character: it decides what your rage actually does. Like any rage class you are on a daily timer, and Will is the save the class never fixes — which matters most in exactly the fights where being turned around would be worst.',
  },
  brawler: {
    identity: 'an unarmed fighter who rewrites their build mid-fight',
    approach: 'Martial flexibility lets you pick up the feat you need for the enemy in front of you, which makes you the most adaptable martial character in the game. That only pays off if you know what feats exist, so the class rewards reading. You fight unarmed, so you are never disarmed and never unarmed.',
  },
  hunter: {
    identity: 'you and your animal, fighting as one',
    approach: 'You and your companion share the same focus and fight as a coordinated pair rather than a character with a pet. Two bodies means two turns a round, which is more raw action than anyone else brings. Your spells are mostly there to keep both of you upright and to shape the ground you fight on.',
  },
  investigator: {
    identity: 'a skill expert who buys certainty',
    approach: 'Inspiration lets you spend a resource to stop relying on luck for the rolls that matter, which is what the class is really about: you are the one who can promise the party a result. Studied combat makes you a real threat in a fight, but the reason to bring you is everything happening outside one.',
  },
  shaman: {
    identity: 'a divine caster with a spirit riding along',
    approach: 'Your spirit decides what kind of caster you are and gives you hexes on top of a full spell list, which is an unusually broad kit. You can heal, control and buff, and the risk is doing all three badly in the same fight. Decide what you are for before initiative is rolled.',
  },
  skald: {
    identity: 'rage for everyone',
    approach: 'Raging song gives your allies the barbarian treatment, which is worth far more spread across the party than kept for yourself. You are a competent fighter singing while you swing. The cost is that your allies inherit rage\'s drawbacks too, so warn the party casters before you start.',
  },
  slayer: {
    identity: 'study, then kill',
    approach: 'Studied target is a small investment at the start of a fight that pays for the whole rest of it, so the first round is usually spent setting up rather than striking. You blend a ranger\'s tracking with a rogue\'s precision and get most of both. You are a straightforwardly excellent single-target killer.',
  },
  swashbuckler: {
    identity: 'a nimble duelist running on nerve',
    approach: 'Panache is spent on deeds and refilled by landing critical hits and dropping enemies, so the class rewards pressing forward rather than playing safe — running out is a sign you stopped taking chances. You fight with a light blade and Dexterity, and you are far better one-on-one than surrounded.',
  },
};

export interface StyleText {
  /** A clause completing "…, <clause>." after the class identity. */
  clause: string;
  /** How a round actually goes for this style. */
  round: string;
}

export const STYLE_TEXT: Record<OffenseStyle, StyleText> = {
  'two-hander': {
    clause: 'fighting with both hands on one large weapon',
    round: 'Your best round is a full attack from a standing position, so the fight you want is one where you reached the enemy last round and can stand still this one. Closing the distance and swinging in the same turn costs you every attack after the first, which is why moving is expensive for you and why getting into position early matters more than it does for anyone else.',
  },
  'sword-and-board': {
    clause: 'fighting with a weapon in one hand and a shield in the other',
    round: 'You trade damage for staying upright, which means your job is to be the one the enemy attacks. Stand where you block a path rather than where you can reach the most enemies, and accept that your damage is lower than the two-handed builds — you are buying the party the rounds it needs.',
  },
  'two-weapon': {
    clause: 'fighting with a weapon in each hand',
    round: 'Everything you do depends on getting a full attack, and you lose more than anyone else when you have to move. Your extra attacks come with penalties, so you want them landing often: anything that raises your attack bonus or lowers the enemy\'s defences is worth more to you than raw damage.',
  },
  archery: {
    clause: 'shooting rather than swinging',
    round: 'You get the most attacks of anyone and you get them from safety, which is the whole appeal. The costs are real though: you need a clear line to the target, you are much weaker when something reaches you, and firing into a melee your allies are standing in has consequences. Position for angles, not for distance.',
  },
  thrown: {
    clause: 'throwing your weapons',
    round: 'You cover the awkward middle range where an archer is fine and a melee character is stranded, and you keep working when something closes on you. The constraint is supply and the action it takes to draw — that is the thing to solve, and once solved you are unusually flexible.',
  },
  'one-handed': {
    clause: 'fighting one-handed with your other hand free',
    round: 'One hand on the weapon and one hand free is the most flexible way to fight: you can hold a shield later, drink a potion now, or grab something mid-fight. It is a deliberate middle: less damage than gripping with both hands, more freedom than either alternative.',
  },
  natural: {
    clause: 'fighting with claws and teeth',
    round: 'Your attacks all come at once and none of them require a weapon, so nothing can be taken from you and drawing costs no time. They all need you to be adjacent though, and picking up a manufactured weapon makes every natural attack worse — so commit to one or the other rather than mixing them.',
  },
  unarmed: {
    clause: 'fighting with your hands',
    round: 'You are never disarmed, never caught without a weapon, and never slowed by drawing one. That freedom is the point of fighting this way. You still have to be adjacent to do anything, so the round you spend reaching the enemy is the round you do not spend hitting them.',
  },
  spell: {
    clause: 'casting rather than swinging',
    round: 'Almost everything you do costs your whole turn, so a round is one decision rather than several. That makes target selection the entire skill: the right spell on the wrong enemy is a wasted round you cannot get back, and there is no equivalent of "attack again" to fall back on.',
  },
  none: {
    clause: 'with nothing in hand yet',
    round: 'There is no weapon equipped and no spellcasting to fall back on, so there is nothing here to describe yet. Equipping a weapon on the Equipment step will fill this in.',
  },
};

export const POSTURE_TEXT: Record<ArmorPosture, string> = {
  heavy: 'Heavy armour makes you hard to hit and slow to arrive. Expect to be behind the party on the way in, and expect that to be fine — the enemy has to come through you eventually.',
  medium: 'Medium armour is the compromise: enough protection to stand in the front rank, enough movement to get there in reasonable time.',
  light: 'Light armour keeps you quick and quiet at the cost of being able to take a hit. You want to be where the enemy is not looking rather than where they are swinging.',
  unarmored: 'You are wearing no armour, so anything that reaches you will hurt. Distance and cover are your defences, and the round you spend getting out of reach is rarely wasted.',
};

export const ROLE_TEXT: Record<CombatRole, string> = {
  frontline: 'You hold the line. Your job is to be between the enemy and the fragile half of your party, which means where you stand matters more than what you hit — a position that blocks a corridor is worth more than one extra attack.',
  skirmisher: 'You move to where the enemy is weakest rather than where they are thickest. Isolated targets, exposed flanks and the caster at the back are yours; standing in a wall of enemies trading blows is not.',
  artillery: 'You do your work from range and you want the fight to stay that way. Set up somewhere with a clear line and let the front rank keep the enemy busy — every round something spends walking towards you is a round it is not fighting.',
  controller: 'You change the shape of the fight rather than the enemy\'s hit points. A spell that splits the enemy in half or takes one of them out of the round is usually worth more than damage, and it is worth more the earlier you cast it.',
  support: 'You make everyone else better at their job. That work is invisible on your own sheet and decisive on everyone else\'s, and most of it pays best when it lands early — a buff in the first round is worth several in the last.',
  commander: 'You have a second body on the field, so you act twice every round. That is the largest advantage in this brief. Give it a job before initiative rather than deciding mid-fight, because two half-considered turns are worth less than one good one.',
};

export const LEAN_TEXT: Record<CastingLean, string> = {
  blaster: 'Your list is built to hurt things. Damage is the most reliable thing magic does — a successful save usually still leaves half of it — but it is also the least efficient, so pick spells that hit several enemies where you can and save single-target damage for what actually needs killing.',
  controller: 'Your list is built to take enemies out of the fight rather than to kill them. That is the strongest thing casting does, and it is also the most fragile: most of it hangs on a save, so aim at the enemy whose weak save you can guess rather than the one that looks most dangerous.',
  buffer: 'Your list is built to improve people. Most of it is worth casting before anything starts, so knowing that a fight is coming is worth an entire spell slot to you. The buffs cast in the first round are the ones that matter; the ones cast in the last were wasted.',
  healer: 'Your list can put people back on their feet. In the middle of a fight that rarely keeps pace with the damage arriving, so the healing that counts is the kind that stops someone dropping this round, and everything else is better done afterwards.',
  utility: 'Your list solves problems rather than winning fights. That makes you the answer to the situations the party cannot punch through, and it means your value depends almost entirely on knowing what you are carrying before it is needed.',
};

export const THEME_TEXT: Record<FeatTheme, string> = {
  'power-attack': 'You have invested in trading accuracy for damage. It is worth taking against anything you were going to hit comfortably anyway, and worth turning off against something you can barely hit at all.',
  archery: 'You have invested in shooting. The feats compound, so each new one is worth more than the last — this is a build that gets noticeably stronger every few levels rather than gradually.',
  'two-weapon': 'You have invested in fighting with both hands full. It is feat-hungry and pays out only on a full attack, so the build is at its best in fights where you are already in position.',
  maneuvers: 'You have invested in doing things to enemies other than damage — tripping, disarming, grappling. These end fights that damage would only slowly win, and they work best on the enemy nobody expects you to target.',
  critical: 'You have invested in critical hits. It is a build that swings between ordinary and devastating, so judge it across a whole session rather than a single fight.',
  mobility: 'You have invested in moving safely through a crowded battlefield. That lets you reach places other characters cannot get to without being punished for the trip.',
  metamagic: 'You have invested in reshaping your own spells. The flexibility is real, but each altered spell costs a higher slot, so the question is always whether this one is worth two of something else.',
  defensive: 'You have invested in not dying — saves, hit points, fighting through what would stop other people. It never shows up as a good turn; it shows up as still being there in round five.',
  shield: 'You have invested in the shield as equipment rather than as an afterthought, which turns a defensive choice into part of how you attack.',
  mounted: 'You have invested in fighting from a mount. Outdoors and in the open you are the hardest hitter in the party; the moment the ceiling gets low, have a plan.',
  channel: 'You have invested in channelling energy — an effect that reaches the whole party at once. That makes it the most efficient healing in the game and the reason to keep uses in reserve.',
  crafting: 'You have invested in making magic items. It is time and money rather than combat power, and it quietly raises the whole party\'s equipment over a campaign.',
  skill: 'You have invested in being good outside combat. Those feats do nothing in a fight and decide entire sessions elsewhere.',
};

export const STRENGTH_TEXT: Record<Strength, string> = {
  'full-bab': 'Your attack bonus advances as fast as it can, so you hit more reliably than anyone and gain extra attacks earlier.',
  'top-tier-slots': 'You have the highest-level spells available at your level, which means you reach each tier of magic before the partial casters do.',
  'high-save-dc': 'Your spells are hard to resist, which makes the save-or-suffer half of your list genuinely reliable rather than a gamble.',
  'action-economy': 'You control two bodies, so you take two turns every round. Nothing else in this brief is worth as much.',
  'skill-monkey': 'You are trained in a wide spread of skills, so you are the party\'s answer to most problems that are not solved by fighting.',
  durable: 'You can absorb a great deal of punishment, which means you can afford to be where the danger is.',
  mobile: 'You cover ground faster than the party, which lets you reach things others cannot and leave places others cannot.',
  'keen-senses': 'You perceive things other characters miss, which quietly makes you the one who should be looking.',
  'self-sufficient': 'You can restore hit points without help, so the party does not need a dedicated healer to keep going.',
  resistant: 'You shrug off some damage outright, which matters most against the many small hits that wear other characters down.',
};

export const GAP_TEXT: Record<Gap, string> = {
  'weak-will': 'Your Will save trails the others badly. That is the save against being charmed, frightened, confused or dominated — the effects that do not hurt you but do turn you on your own party. It is the most likely way this character is removed from a fight.',
  'weak-ref': 'Your Reflex save trails the others badly. That is the save against fireballs, breath weapons and anything filling an area, so being caught in the open with the rest of the party grouped around you is genuinely dangerous.',
  'weak-fort': 'Your Fortitude save trails the others badly. That is the save against poison, disease, exhaustion and effects that attack the body directly — including a few that simply kill outright at higher levels.',
  'no-ranged-option': 'You have no way to attack anything you cannot reach. Against a flying enemy, one behind a chasm, or one that keeps stepping away, you have no turn at all. Even a cheap thrown weapon fixes this.',
  'no-melee-option': 'You have nothing to fight with once something closes to arm\'s reach, which is exactly what enemies will try to do to you.',
  'no-healing': 'Nothing on this sheet restores hit points. That is normal and entirely survivable, but it means the party needs someone else who can, or a supply of potions bought before you need them.',
  'no-trapfinder': 'Nobody here can disable a trap. Worth knowing before the party walks into a dungeon assuming somebody has it covered.',
  'thin-skills': 'You have very few skills trained, so you will be a spectator in the parts of a session that are not fights. That may be the right trade for this character — it is worth making it deliberately.',
  'ability-hungry': 'This build leans on four or more ability scores at once, and there are not enough points to make all of them good. Something here is going to be mediocre; better to choose which than to discover it at the table.',
};

export const PARTY_TEXT: Record<PartyRole, string> = {
  face: 'You are the one who talks. Negotiations, interrogations and any situation where the party would rather not draw weapons are yours to lead.',
  scout: 'You are the one who looks first. Going ahead of the party and coming back with information is worth more than anything you would have added to the fight you avoided.',
  lore: 'You are the one who knows things. Identifying what the party is facing — and what it is weak to — usually decides the fight before it starts.',
  trapfinder: 'You are the one who checks. Nobody else on this sheet can disable a trap, which makes you the reason the party can open doors.',
  healer: 'You are the one who patches people up afterwards. Most of that work happens between fights, where it costs nothing but time.',
};

/** How a class resource paces a day, keyed by the pool id the engine emits. A pool with no entry
 *  simply gets the generic line from its `pacing`, so this table only has to cover the ones with
 *  something particular to say. */
export const POOL_TEXT: Record<string, string> = {
  rage: 'Rage is measured in rounds across the whole day, not per fight. Turning it on for a fight you would have won anyway is how barbarians run out before the fight that mattered.',
  bloodrage: 'Bloodrage is a daily pool of rounds rather than a per-fight one, so the decision is which fights deserve it.',
  ki: 'Ki buys your best tricks a use at a time. It refreshes on a rest, so what matters is not saving it but noticing the round that is worth spending it on.',
  'stunning-fist': 'Stunning Fist can take an enemy out of the fight for a round. Against a single dangerous opponent that is worth far more than the damage you skipped.',
  channel: 'Channel energy reaches everyone at once, which makes it the most efficient healing available to anyone. Keep at least one use back for the moment two people are down.',
  fervor: 'Fervor lets you heal or buff and still act, which is what makes fighting and casting in the same round possible.',
  'lay-on-hands': 'Lay on hands works on yourself as a swift action, so it is as much a way to stay standing mid-fight as it is a way to heal others afterwards.',
  'smite-evil': 'Smite is a small number of enormous turns. Spend one on the most dangerous evil creature in the room; spending them on minions wastes the class.',
  'wild-shape': 'Wild shape changes what kind of character you are for a whole fight, so the decision is made before initiative rather than during.',
  performance: 'Performance is rounds per day across every fight. Starting it costs you a round and is almost always worth it — the party is getting more from that round than you would have.',
  'raging-song': 'Raging song is rounds per day spread across the party. Warn the casters before you start it, because they inherit rage\'s restrictions too.',
  grit: 'Grit refills when you do something dramatic, so hoarding it is self-defeating — the class is built to reward pressing forward.',
  panache: 'Panache comes back on critical hits and on dropping enemies, so running out is usually a sign you stopped taking chances.',
  'arcane-pool': 'The arcane pool sharpens the weapon you are already swinging, which is almost always a better use than anything more exotic.',
  reservoir: 'The reservoir pays for bending spells as you cast them, which is what separates you from an ordinary prepared caster.',
  bombs: 'Bombs are a daily allowance of ranged attacks, which makes you useful in fights where your extracts are the wrong answer — but they are counted, so the last fight of the day is the one to keep some back for.',
  inspiration: 'Inspiration buys certainty on the rolls that matter. It is worth spending on the check the party is depending on rather than the one you would probably pass anyway.',
  judgment: 'Judgement is declared after you see the enemy, so it is worth taking the moment to look before choosing.',
  challenge: 'A challenge marks one enemy as yours for the rest of the fight, so pick the one you actually intend to stay next to.',
};

/** The fallback when a pool has no entry above. */
export const POOL_PACING_TEXT: Record<'duration' | 'discrete', string> = {
  duration: 'burns while it is switched on, and the pool covers the whole day rather than one fight',
  discrete: 'is spent a use at a time and comes back on a rest',
};
