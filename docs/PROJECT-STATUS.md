# Pathmaker — Project Status & Backlog

Snapshot of where the project stands, what was deliberately deferred (and why), and the
phase roadmap. Written so context isn't lost across sessions/compaction. Companion to
[DESIGN.md](DESIGN.md) (architecture) and the HANDOVER docs (UI).

## ▶ Resume here (last session end)

**Current state** — branch `main`, working tree clean, **567 tests** passing; run
`npx tsc --noEmit && npx vitest run && npm run build` to confirm.

**Latest — Archetypes: third-per-class breadth batch (5 popular Core classes).** With every class at ≥2, brought
the most-played Core classes to a third (matching monk/magus): Fighter **Archer**, Rogue **Scout**, Barbarian
**Titan Mauler**, Ranger **Guide**, Paladin **Undead Scourge**. All verified vs d20pfsrd; clean feature swaps
(Archer keeps weapon mastery; the fighter's intermediate weapon/armor-training ranks aren't modelled as separate
features, so Safe Shot/Evasive/Volley grant at their levels without a removal target). **vampire-hunter stays at
0 by design** — no standard published archetypes. 5 golden tests; **685 pass**; browser-verified Archer.

**Prior — Slayer Bounty Hunter (its second archetype).** The capture-focused slayer: swaps the slayer talents
at 2nd and 6th and the advanced talent at 10th for Dirty Trick, Submission Hold, and Incapacitate, plus a
Manhunter’s Training proficiency grant. Verified vs d20pfsrd. 1 golden test; **680 pass**; browser-verified the
features render (needed a hard reload — stale HMR). **Slayer now has 2**, so every class with any archetype has
≥2 except vampire-hunter (no standard published archetypes).

**Prior — Spell-list-swap + Unlettered Arcanist (every class with an archetype now has ≥2).** Added a `witch`
`SpellList` and tagged the 144 curated spells that sit on the witch list — parsed authoritatively from the
d20pfsrd witch spell list (loaded via the browser pane to dodge WebFetch truncation, then intersected with our
inventory by name), including 19 per-list level overrides (`levelByList.witch`: cures +1, Cone of Cold 6, Plane
Shift 7…). Fireball et al. are correctly excluded. Applied in one post-processing loop in `spells.ts` via a
`WITCH_LEVELS` id→level map, so all existing list-filtering code keeps working. The `spellcastingMod.list`
mechanism already existed; **Unlettered Arcanist** (Arcanist) now uses `list: 'witch'` + a Familiar grant.
Fixed two places that read the *base* class list instead of the archetype-effective one: `Spells.tsx` (builder
picker) and the play-sheet — added `list` to the resolved `CastingBlock` and taught `Spells.tsx` to use
`effectiveClass` + `spellLevelOn`. 2 new tests; **679 pass**; browser-verified the Unlettered Arcanist draws the
witch list (Cure/Inflict Light Wounds shown, Magic Missile/Fireball/Scorching Ray hidden, per-list levels gated
right). **The "2 archetypes per class" goal is complete** for every class that has any (Slayer has 1;
vampire-hunter has none published).

**Prior — Archetypes: second-per-base/hybrid class, batch C (Swashbuckler deed-split + 7 archetypes).** Split the
swashbuckler **deeds** into one feature per deed (`swb-deed-<name>`, as done for the gunslinger) so archetypes can
swap individual deeds — and fixed **Inspired Blade** to actually replace the bleeding-wound deed. Added second
archetypes: Swashbuckler **Flying Blade** (thrown-blade deed swaps), Summoner **Broodmaster**, Brawler **Mutagenic
Mauler**, Bloodrager **Blood Conduit**, Shaman **Witch Doctor** (channel/counter magic for the 4/8/10/12 hexes),
Witch **Hedge Witch** (healing for the 4th/8th hexes), Shifter **Verdant Shifter** (plant body). Verified vs
d20pfsrd. 8 golden tests; 677 pass; browser-verified Flying Blade (2 swashbuckler archetypes now, deed swaps) and
Witch Doctor. **Remaining to hit "2 per class": Arcanist only** — its second (Unlettered/Blood Arcanist/School
Savant) needs modelling the engine doesn't have (witch spell-list swap, or adding a bloodline/arcane-school
subsystem to the arcanist); deferred. **vampire-hunter** has no standard published archetypes.

**Prior — Archetypes: second-per-base/hybrid class, batches A+B (10 archetypes).** Corrected an earlier
miscount — there are **31 classes**, and Slayer + vampire-hunter had been missed (zero archetypes). Added second
archetypes for: Alchemist **Grenadier**, Cavalier **Standard Bearer**, Gunslinger **Pistolero** (uses the split
deed model), Inquisitor **Sacred Huntsmaster**, Oracle **Seeker**, Investigator **Sleuth**, Warpriest **Champion
of the Faith**, Skald **Totemic Skald**, Hunter **Packmaster** — plus **Sniper**, the Slayer's *first* archetype.
All verified vs d20pfsrd. 11 golden tests; 669 pass; browser-verified batch A (Cleric picker etc.). **Still one
archetype each** (to finish the "2 per class" goal): Summoner, Arcanist, Bloodrager, Brawler, Shaman, Shifter,
Witch, Swashbuckler (+ a 2nd for Slayer). **Swashbuckler** needs its deeds split into individual features first
(grouped 3-per-level, as the gunslinger's were) so a deed-swapping archetype can be authored; **vampire-hunter**
has no standard published archetypes. Several d20pfsrd pages 404 / return partial extracts, so each remaining one
needs a careful re-verify.

**Prior — Archetypes: a second one for every core class.** Each of the 11 Core Rulebook classes now has ≥2
archetypes (Fighter/Rogue/Monk already did). Added: Barbarian **Mounted Fury**, Paladin **Divine Hunter**, Bard
**Arcane Duelist**, Cleric **Crusader** (diminished + martial + one domain + bonus feats — the martial foil to
Cloistered), Druid **Blight Druid**, Sorcerer **Razmiran Priest** (suppresses the 3rd/5th bloodline *bonus spells*
via `sorc-bl-sp` + the 9th bloodline power via `sorc-bl`), Ranger **Trapper** (spells → ranger traps), Wizard
**Spellbinder** (arcane bond → bonded spells). All verified vs d20pfsrd. 8 golden tests; 659 pass; browser-verified
the Cleric picker (Cloistered + Crusader), Crusader's bonus-feat slots, Razmiran's bloodline-spell/power
suppression, and Blight Druid's swaps. **34 total → 44 archetypes across all 29 classes.**

**Prior — Archetypes: deed/exploit granularity → Gunslinger + Arcanist (all 29 classes done).** Split the
gunslinger **deeds** from six grouped features (three deeds bundled per level) into **one feature per deed**
(`gun-deed-<name>`), so an archetype can swap an individual deed — and the progression now lists each deed by
name. The arcanist **exploit** was already a discrete choice (the 1st-level pick is its own `exploit` slot,
recurring picks are `exploit` at [3,5,…], the witch-`hex` double-choice pattern), so no refactor was needed
there. Shipped **Musket Master** (Gunslinger — Steady Aim and Fast Musket replace the gunslinger's-dodge and
utility-shot *deeds*, Musket Training replaces gun training, plus Rapid Reload) and **Eldritch Font** (Arcanist —
Eldritch/Improved/Greater Surge replace the exploits gained at 3rd/7th/13th via `choices`, Bottomless Well
replaces magical supremacy). 3 golden tests (deeds are now individual; Musket Master deed swaps; Eldritch Font
exploit-slot removal at 3/7/13 + surge features + still casts); 651 pass; browser-verified both pickers/Advancement
(Musket Master: dodge/utility/gun-training gone, Deadeye kept; Eldritch Font: exploit picks at 5/9/11/15/17/19 only).
**Every one of the 29 classes now has at least one archetype — 36 total.** The archetype system is complete:
model (feature swaps, proficiency, spellcasting replace/remove/diminish + stat/list, choice slots, class skills,
bonus-feat slots, source-power suppression, DR override) + verified content across all classes.

**Prior — Archetypes: final classes (Hunter, Summoner, Skald, Shaman, Shifter).** First archetypes for five
more classes, all verified vs d20pfsrd: **Feral Hunter** (drops the animal companion + its teamwork feats at
6/9/12/15/18 for Feral Focus / Wild Shape / Summon Pack), **Master Summoner** (lesser eidolon + Summoning Mastery
+ Augment Summoning in place of eidolon/summon/shield/bond-senses), **Spell Warrior** (Skald — counterspell
abilities in place of raging song, spell kenning, dirge of doom, master skald), **Speaker for the Past** (Shaman —
adds lore class skills via `classSkills.add`, swaps the familiar + wandering spirit/hex for ancestral
revelations), and **Weretouched** (Shifter — lycanthrope aspect/empathy/wild-shape). 5 golden tests; 648 pass;
browser-verified all five pickers + Advancement (and Speaker's Knowledge-history class-skill marker). Archetypes
now span **27 of 29 classes, 34 total**.

**Two classes deferred (subsystem granularity):** **Gunslinger** — its deeds are modelled as grouped features
(gun-deeds-1 bundles three deeds each), but archetypes (Musket Master, Pistolero, Mysterious Stranger…) swap
*individual* deeds within those groups, which `replaces` can't reach. **Arcanist** — its archetypes hinge on the
exploit subsystem (e.g. altering "the exploit gained at 1st level", which isn't a discrete choice slot in our
model — the exploit choice starts at 3rd) and spell-prep restrictions. Both would need finer-grained
deed/exploit modelling to author faithfully; noted rather than shipped inaccurately.

**Prior — Archetypes: breadth batch (Oracle, Bloodrager, Swashbuckler) + DR-override hook.** Added a
`ArchetypeDef.damageReduction?: { levels; bypass } | null` hook: the barbarian/bloodrager DR is a numeric class
progression (not a feature `replaces` can reach), so an archetype that trades it away sets `null` — `gatherDefenses`
now consults the active archetype before applying the class DR. First archetypes for three more classes, all
verified vs d20pfsrd. **Warsighted** (Oracle) swaps the revelations gained at 1st/7th/11th/15th (keeping 3rd/19th)
for **Martial Flexibility**. **Steelblood** (Bloodrager) gains heavy armor, swaps fast movement / uncanny dodge /
improved uncanny dodge / DR for Indomitable Stance, Armored Swiftness, Armor Training, and **Blood Deflection**
(`damageReduction: null`, so the numeric DR is gone too). **Inspired Blade** (Swashbuckler) rebuilds panache and
weapon features around the rapier (Inspired Panache/Finesse, Rapier Training, Inspired Strike, Rapier Weapon
Mastery). 3 golden tests (Warsighted revelation-slot removal + still casts; Steelblood feature swaps + heavy armor
+ `defenses.dr` empty; Inspired Blade rapier swaps) + a DR-override integrity guard; 643 pass; browser-verified all
three pickers/Advancement and that the Steelblood sheet shows no DR line. Archetypes now span **22 classes, 29
total**. Remaining with none: Summoner, Gunslinger, Arcanist, Hunter, Shaman, Skald, Shifter. (Note: the numeric-DR
gap also affected the earlier Invulnerable Rager, whose Invulnerability isn't cleanly expressible as a fixed table
— left as-is for now.)

**Prior — Archetypes: breadth batch (Warpriest, Brawler, Investigator).** First archetypes for three more
classes, all verified vs d20pfsrd. **Sacred Fist** (Warpriest) drops all armor and swaps Sacred Weapon / Focus
Weapon / Sacred Armor for monk-style **Flurry of Blows**, **Unarmed Strike**, **AC Bonus**, and a **Ki Pool** at
7th — keeping full casting. **Snakebite Striker** (Brawler) trades Martial Flexibility and Maneuver Training for
**Sneak Attack**, **Snake Feint**, and **Opportunist**. **Empiricist** (Investigator) swaps Poison Lore, Swift
Alchemy, and True Inspiration for **Ceaseless Observation**, **Unfailing Logic**, and **Master Intellect**. 3
golden tests (Sacred Fist unarmed swaps + no armor + still casts; Snakebite sneak-attack swaps; Empiricist
observation swaps); 640 pass; browser-verified all three pickers and Advancement tables. Archetypes now span
**19 classes, 26 total**. Remaining with none: Oracle, Summoner, Gunslinger, Arcanist, Bloodrager, Swashbuckler,
Hunter, Shaman, Skald, Shifter.

**Prior — Archetypes: source-power suppression + Tattooed Sorcerer.** Closed the sorcerer blocker with a small
hook: `ArchetypeDef.suppressSourcePowers?: { prefix; levels }[]` drops specific *source-granted* powers (those
injected by `sourceFeatures` from a chosen bloodline/order/school/etc. — ids like `sorc-bl-<bloodline>-<level>`),
which `replaces` can't reach because they aren't the class's own features. `sourceFeatures` now looks up the
active archetype and skips matching prefix+level entries. Demonstrated with **Tattooed Sorcerer**: suppresses the
1st- and 9th-level bloodline powers (`{ prefix: 'sorc-bl', levels: [1, 9] }`) for Familiar Tattoo and Enhanced
Magical Tattoo, replaces Eschew Materials with Mage's Tattoo and the 7th-level bloodline feat with Create Spell
Tattoo. The rest of the chosen bloodline (3rd/15th/20th powers, arcana, bonus spells) is untouched. Verified vs
d20pfsrd. 2 golden tests (standard draconic sorcerer keeps Claws/Breath Weapon; Tattooed suppresses both, keeps
Dragon Resistances, swaps in the tattoo abilities, still casts) + a content-integrity guard; 637 pass;
browser-verified the picker + Advancement (Claws/Breath Weapon gone, Dragon Resistances kept, tattoo features
present). Archetypes now span **16 classes, 23 total**. **Crossblooded** still needs a *diminished spells-known*
variant (today's `diminished` = slots/day only) — the last narrow casting gap.

**Prior — Archetypes: core casters (Wizard, Witch) + Sorcerer blocker noted.** **Scrollmaster** (Wizard) swaps
Arcane Bond for **Scroll Blade** and **Scroll Shield** (wielding scrolls as weapon/shield), drops the arcane-bond
pick (`choices.remove`), and replaces the 10th-level bonus feat with Improved Scroll Casting (`bonusFeatSlots`).
**Beast-Bonded** (Witch) trades the hexes gained at 4th/8th/10th for Enhanced Familiar, Familiar Form, and Twin
Soul, plus Transfer Feats — modelled by re-adding the witch's two `hex` choices (the 1st-level hex kept, the
recurring line minus levels 4/8/10). Note: the witch carries **two choices sharing id `hex`** (1st-level + the
recurring line), so `remove: ['hex']` drops both — the archetype re-adds both, keeping the 1st-level pick.
Verified vs d20pfsrd. 2 golden tests (Scrollmaster arcane-bond→scroll features + arcane-bond pick gone + 10th
feat gone + still casts; Beast-Bonded hex-slot removal at 4/8/10 + familiar features + still casts); 635 pass;
browser-verified both pickers and Advancement tables. Archetypes now span 15 classes, 22 total.

**Sorcerer is deferred** — nearly every sorcerer archetype (Tattooed, Crossblooded, the Wildblooded family,
Razmiran Priest…) swaps specific **bloodline powers/arcana**, which the engine grants monolithically from the
bloodline subsystem via `sourceFeatures` (ids like `sorc-bl-<bloodline>-<level>`), not as discrete class features
an archetype can `replace`. Cleanly supporting them needs a small new hook — "suppress a source-granted power at
given level(s)" on `ArchetypeDef` — plus `Crossblooded` additionally needs a *diminished spells-known* variant
(the current `diminished` only touches slots/day). Both are modest additions; deferred rather than ship an
archetype that double-shows the powers it's supposed to remove.

**Prior — Archetypes: breadth batch (Cavalier, Inquisitor, Druid).** With the model feature-complete, added
first archetypes for three more classes — all verified vs d20pfsrd. **Gendarme** (Cavalier) moves its bonus feats
to 1st/5th/8th/… (`bonusFeatSlots` add [1,5,8,11,14,17,20] / remove [6,12,18]), trades the tactician line for a
cavalry-feat list, and gains Transfixing Charge at 20th. **Sanctified Slayer** (Inquisitor) swaps the whole
judgment progression for **Studied Target** (1st), **Sneak Attack** (4th), and slayer talents at 8/16/17/20 —
keeping full casting. **Aquatic Druid** trades the woodland line (wild empathy, woodland stride, trackless step,
resist nature's lure, venom immunity, a thousand faces) for aquatic features (Aquatic Adaptation, Natural Swimmer,
Resist Ocean's Fury, Seaborn, Deep Diver). 3 golden tests (Gendarme feat-slot relocation + Transfixing Charge;
Sanctified Slayer judgment→studied-target/sneak/talents + still casts; Aquatic Druid woodland→aquatic swaps +
still casts); 633 pass; browser-verified all three (Gendarme shows 7 bonus-feat slots not 3; the Inquisitor and
Druid Advancement tables show the swaps). Archetypes now span Fighter, Ranger, Rogue, Barbarian, Paladin, Bard,
Alchemist, Magus, Monk, Cleric, **Cavalier, Inquisitor, Druid** (20 total across 13 classes). Remaining classes
with no archetype yet: Wizard, Sorcerer, Witch, Oracle, Summoner, Gunslinger, and the base/hybrid classes.

**Prior — Archetypes: class-skill + bonus-feat-slot model (Sensei, Cloistered Cleric).** Closed the last two
archetype-model gaps. `ArchetypeDef` gained `classSkills?: { add?; remove? }` and `bonusFeatSlots?: { add?;
remove? }` (class levels). `effectiveClass` applies both onto the effective class; since every consumer already
reads class skills and bonus-feat slots off `classBreakdown` (which runs `effectiveClass`), no downstream wiring
was needed — the class-skill set and the feat-slot emission just follow. Demonstrated with two previously-blocked
archetypes: **Sensei** (Monk) trades its 2nd/6th/10th/14th bonus feats (`bonusFeatSlots.remove`) for Advice
(bardic-performance-style inspiration), Insightful Strike (Wis-to-hit), and Mystic Wisdom, keeping only the 1st-
and 18th-level bonus feats; **Cloistered Cleric** adds Knowledge (all) to class skills (`classSkills.add`),
diminishes non-domain casting (`spellcastingMod.diminished` — the domain slot is a separate, unreduced bonus slot,
so this is exactly RAW), drops to one domain (`choices`), and loses medium/heavy armor and shields
(`proficiencies`). Verified vs d20pfsrd. 4 golden tests (Sensei slot removal + features; Cloistered class-skill
add, one-domain/diminished/armor via `effectiveClass`, and −1 non-domain slots at level 9) + content-integrity
guards (class-skill/bonus-feat-slot refs valid); 630 pass; browser-verified the Sensei shows 2 bonus-feat slots
(not 6), the Cloistered sheet shows "diminished" casting, and Knowledge (nature) carries the class-skill marker.
Archetypes now span Fighter, Ranger, Rogue, Barbarian, Paladin, Bard, Alchemist, Magus, Monk, **Cleric** (17
total). **The archetype model is now feature-complete**: feature swaps, proficiency, spellcasting
(replace/remove/diminish + stat/list), choice slots, class skills, and bonus-feat slots.

**Prior — Archetypes: Monk batch (Master of Many Styles, Zen Archer).** Gave the Monk its first archetypes,
both pure feature swaps (no casting, no new model work). **Master of Many Styles** trades flurry of blows for
**Fuse Style** (two stances at once; monk bonus feats become style feats) — improving at 8/15 — and perfect
self for **Perfect Style** (five stances). **Zen Archer** rebuilds the monk around the bow: **Flurry of Blows
(bows)** and **Perfect Strike** at 1st (replacing flurry and Stunning Fist), then Way of the Bow, **Zen Archery**
(Wis-to-hit), Point Blank Master, Ki Arrows, Reflexive Shot, Trick Shot, and Ki Focus Bow — replacing evasion,
maneuver training, still mind, purity of body, improved evasion, diamond body, and tongue of the sun and moon.
Both keep the monk's bonus-feat slots at their normal levels (the archetypes only narrow *which* feats qualify —
a list restriction the engine doesn't enforce). Verified vs d20pfsrd. 2 golden tests (MoMS flurry→Fuse Style /
perfect self→Perfect Style; Zen Archer's bow-feature swaps in and monk defensive line out); 626 pass;
browser-verified the Monk picker shows both and the Advancement table reflects the Zen Archer swaps. Archetypes
now span Fighter, Ranger, Rogue, Barbarian, Paladin, Bard, Alchemist, Magus, **Monk** (15 total). **Sensei was
excluded** — it removes bonus-feat *slots* at 2/6/10/14, a dimension the archetype model doesn't cover yet (a
bonus-feat-slot change, cousin to the class-skill gap); shipping it would show phantom feat slots.

**Prior — Archetypes: partial-casting model (Diminished Spellcasting) + Kensai.** Closed the partial-casting
gap so an archetype can keep a class's spellcasting but *adjust* it rather than replace/remove wholesale.
`SpellcastingDef` gained `diminished?: boolean`; `ArchetypeDef` gained `spellcastingMod?: { diminished?;
ability?; list? }`, which `effectiveClass` merges onto whatever casting survives (a no-op if casting was
removed). `spellSlotsPerDay(table, level, mod, diminished?)` now subtracts 1 from each spell level's base
slots (min 0) before adding ability-bonus slots, so a high casting stat can still backfill a level whose base
fell to 0 — matching RAW ("if this reduces the number to 0, you may cast only if your ability allows bonus
spells of that level"). Cantrips are never reduced. `CastingBlock.diminished` surfaces it; the sheet's Spells
line shows a **diminished** tag. Demonstrated by shipping **Kensai** (the previously-deferred Magus archetype):
`spellcastingMod: { diminished: true }`, loses light-armor proficiency, and swaps 7 magus features for
Canny Defense / Weapon Focus / Perfect Strike / Fighter Training / Iaijutsu (+Focus/Master) / Critical
Perfection / Superior Reflexes / Weapon Mastery, with Critical Perfection dropping the 9th-level arcana pick.
Verified vs d20pfsrd (Diminished text quoted). 4 progression unit tests (−1/level, floor-at-0, high-stat
backfill, default off) + 3 Kensai golden tests (diminished slots one below standard at every level with
cantrips intact + still casts; Perfect Strike swaps spell recall + no 9th arcana; `effectiveClass` merges the
flag + strips armor) + a content-integrity guard (spellcastingMod requires surviving casting); 624 pass.
Browser-verified a Kensai 20 shows "diminished" and slots one below a standard Magus 20 at each spell level.
Archetypes now span Fighter, Ranger, Rogue, Barbarian, Paladin, Bard, Alchemist, Magus (13 total). The
`ability`/`list` mod fields round out "casting-stat/list tweaks"; the last remaining archetype gap is
**class-skill-list changes** (e.g. Cloistered Cleric) — not a spellcasting concern.

**Prior — Archetypes: subsystem casters (Magus).** With the choice-slot model in place, authored the two
Magus archetypes that reshape the magus-arcana subsystem. **Bladebound** replaces the 3rd-level arcana with
the **Black Blade** (a sentient bonded weapon) and swaps Arcane Pool for the black-blade pool (1/3 level + Int):
`replaces: ['magus-arcane-pool']`, grants the black-blade pool at 1 + Black Blade at 3, and re-adds the arcana
choice at levels 6/9/12/15/18 only (dropping the 3rd-level pick). **Hexcrafter** lets witch hexes stand in for
magus arcana and adds a dedicated **Hex Magus** hex pick at 4th (replacing `magus-spell-recall`), plus **Accursed
Strike**: `choices` re-add the arcana slot with `[...MAGUS_ARCANA, ...WITCH_HEXES]` options and a
`hexcrafter-hex-magus` pick at level 4. Both keep full magus spellcasting. Verified vs d20pfsrd. 3 golden tests
(standard magus arcana at 3rd + casts; Bladebound → black-blade pool at 1, Black Blade at 3, arcana starts at 6,
still casts; Hexcrafter → hexes in the arcana list, Hex Magus slot at 4, Accursed Strike, still casts); 617 pass;
browser-verified the Magus picker shows both archetypes and the Advancement table shows the black-blade pool at
1 and Black Blade at 3. Archetypes now span Fighter, Ranger, Rogue, Barbarian, Paladin, Bard, Alchemist, Magus
(12 total at the time; Kensai was deferred here for its Diminished Spellcasting, then shipped in the Latest
entry above once that math was modelled). Also fixed the **Class step "level 1 features" preview**
to run through `effectiveClass` when an archetype is selected, so swapped level-1 features (e.g. Bladebound's
black-blade Arcane Pool) show there too — previously it read the base `features1` list and ignored the
archetype. The standard (no-archetype) preview is unchanged.

**Prior — Archetypes: model extended for subsystem/choice changes.** Archetypes can now add and remove
class **choice slots** — the whole `ClassChoiceDef` family, which turns out to cover both subsystem picks
(rage powers, rogue talents, discoveries, arcana, hexes, exploits…) *and* the structural picks (domains,
school, bloodline, mystery, patron, nature bond), since they're all `ClassDef.choices`. `ArchetypeDef` gained
`choices?: { remove?: string[]; add?: ClassChoiceDef[] }` (to *change* a choice — e.g. two domains → one —
remove its id and add a replacement). `effectiveClass` filters removed ids and appends added ones; the
existing class-choice slot emission already reads `entry.klass.choices` from `classBreakdown`, so slots,
options, and the Class-step UI all follow with no further wiring. Demonstrated by upgrading **Archaeologist**
to grant its Rogue Talents as a real choice (levels 4/8 basic, 12/16/20 advanced-eligible, reusing the
existing `ROGUE_TALENTS` lists) instead of a flat feature. 2 tests (Archaeologist emits talent slots a
standard bard lacks; `effectiveClass` add/remove) — 614 pass; browser-verified the two "Choose rogue talent"
picks appear. **The archetype model now covers**: feature swaps, weapon/armor proficiency, spellcasting
(replace/remove), and choice-slot add/remove. Still unmodeled: partial spellcasting math (diminished slots,
casting-stat/list tweaks short of a full replace) and class-skill lists — the last gaps for a few archetypes.

**Prior — Archetypes: caster classes (Bard, Alchemist).** Added verified archetypes for the two caster
classes whose archetypes are clean *feature* swaps: Bard **Archaeologist** (drops the entire bardic-performance
suite + versatile performance + well-versed for Archaeologist's Luck, Clever Explorer, Uncanny Dodge, Trap
Sense, Rogue Talent, Evasion — keeps spellcasting) and Alchemist **Vivisectionist** (Bomb → rogue Sneak
Attack, plus Torturer's Eye / Cruel Anatomist / Torturous Transformation). Verified vs d20pfsrd. 2 golden
tests (Archaeologist swap + still-casts; Vivisectionist bomb→sneak) + content-integrity; 612 pass;
browser-verified the bard picker, the swap, and that the Archaeologist still shows spell slots. **Scope note:**
the remaining casters can't be modeled accurately yet — the 9-level casters (Wizard/Cleric/Druid/Sorcerer) and
subsystem-driven ones (Oracle mysteries, Witch hexes, Summoner eidolon, Magus arcana, Arcanist exploits,
Sorcerer bloodlines, Wizard schools, Cleric/Druid domains & nature bond, Inquisitor judgment swaps) hinge on
subsystem/choice changes the archetype model doesn't cover (only feature swaps + proficiency + spellcasting
override). Archetypes now span Fighter, Ranger, Rogue, Barbarian, Paladin, Bard, Alchemist (10 total).

**Prior — Archetypes: content batch (three more classes).** Added verified archetypes for Rogue
(**Thug**: Trapfinding→Frightening, Trap Sense→Brutal Beating; **Acrobat**: Trapfinding→Expert Acrobat,
Trap Sense→Second Chance), Barbarian (**Invulnerable Rager**: Uncanny/Improved Uncanny Dodge + DR →
Invulnerability, Trap Sense → Extreme Endurance), and Paladin (**Warrior of the Holy Light**: removes
spellcasting via `spellcasting: null`, replaces the `paladin-spells` feature with Power of Faith). All
verified against d20pfsrd. Archetypes now cover Fighter, Ranger, Rogue, Barbarian, Paladin (8 total). 3
golden tests (Thug swap, Invulnerable Rager DR swap, Warrior-of-the-Holy-Light casting removal) + the
content-integrity check; 610 pass. Browser-verified the barbarian picker and the Invulnerability swap.

**Prior — Archetypes: model extended for proficiency + spellcasting.** The archetype model now covers
weapon/armor proficiency and spellcasting changes, not just feature swaps. `ArchetypeDef` gained
`proficiencies?: { weapons?:{add?,remove?}, armor?:{add?,remove?} }` and `spellcasting?: SpellcastingDef |
null` (omit = keep, `null` = remove casting, a def = replace). Engine: a new `effectiveClass(klass, dec)`
applies the whole archetype (features + proficiencies + spellcasting) **once**, at `classBreakdown` time and
to the primary class, so every consumer (proficiency ctx, the per-class spellcasting/caster-level reads, the
progression) sees the effective class; `classFeaturesUpTo` no longer re-applies it. Content: **Skirmisher
(Ranger)** — removes spellcasting, grants Hunter's Tricks (verified vs d20pfsrd). Tests: golden (Skirmisher
casts nothing vs a standard ranger; gains Hunter's Tricks at 5) + a unit test on `effectiveClass` for
weapon/armor add-remove and a spellcasting override; 607 pass. Browser-verified the ranger archetype picker
and no caster level. **Note:** armor proficiency is recorded but not yet consumed by the engine (no
arcane-failure/penalty modelling); class-skill changes remain unmodeled — so archetypes that also alter
domains/slots/skills (e.g. Cloistered Cleric) aren't shippable accurately yet. **⚠ resolve.test.ts is being
edited by a parallel session (reorder churn); this commit deliberately excludes it — the new archetype tests
sit there uncommitted, to be committed once the other session lands.**

**Prior — Archetypes proof-of-concept (friend feedback #2).** The mechanism is in, scoped to Fighter as
a proof-of-concept per the user's choice. New `ArchetypeDef { classId, name, desc, replaces:[featureId],
grants:[LeveledFeatureDef] }` on `ClassDef.archetypes`; content in `src/content/archetypes.ts` — **Two-Handed
Fighter** and **Weapon Master**, verified against d20pfsrd (each swaps Bravery/Armor Training/Weapon Training/
Armor Mastery for its own abilities; our fighter model treats Armor/Weapon Training as single features, so
"replaces Armor Training 1–4" maps to the one id). Decision key `archetype`; `readDecisions` reads it;
`classFeaturesUpTo` drops replaced ids and folds in the grants (only the archetype attached to *that* class
matches, so multiclass/stale is a no-op). Class-step picker (Standard / archetypes) that clears on class
change; the swapped features flow through the Advancement preview + tooltips built in #3. 5 tests (golden
swap/restore for both archetypes + content integrity: replaces reference real feature ids, grant levels 1–20,
unique grant ids); 604 pass. Browser-verified the picker + swaps (L2 Shattering Strike, L3 Overhand Chop, L20
Weapon Mastery kept) and reversibility. **Scope/next:** other alterations (proficiencies, class skills,
spellcasting) are out of the current model; expanding to more classes/archetypes is content batching (verify
each vs d20pfsrd) — awaiting the user's review of the mechanism. This closes the friend-feedback batch (#5,
#1, #3, #4, #2 all addressed).

**Prior — Advancement preview + feature tooltips (friend feedback #3); larger text (#1).** The
Advancement table now shows the **full 1–20 progression**: rows above your current level render greyed and
read-only under a "Preview — what later levels bring" divider (a level-20 `resolve({...doc, level:20})`
memoised on the doc; a planning view, not a lock), and each **class feature is a hover/click tooltip** with
its rules text (name→desc map built from each class's `features1`+`features`). #1 (larger text): base 16px +
`font-size-adjust: 0.52` on the body so IM Fell English's small x-height reads ~18% larger everywhere,
Cinzel/MedievalSharp opting out. Both browser-verified (fighter-3: 20 rows, greyed future, Weapon Training
tooltip; no overflow). #4 reset buttons: added conditional "↺" resets — Basics scores→10, Skills clear
ranks, Advancement reset HP overrides, Feats clear all — each shown only when there's something to reset
(browser-verified all four). Remaining friend feedback: #2 archetypes (its own project — content+engine).

**Prior — Per-level feat prerequisites (Swedish-friend feedback #5).** Feat prerequisites are now judged
at the character level the feat is *gained*, not the final level. Before, options and the already-selected
checks used one `predCtx` at the target level, so a feat in your 3rd-level slot that needs BAB +4 counted as
legal if you'd reach +4 later — RAW requires prereqs met when the feat is taken. New `predCtxAt(dec, L)` in
resolve.ts rebuilds the context (abilities/BAB/caster level/feat set) at level L; the FEATS section now
memoises a context + option list per level and validates each slot's options and each placed feat against
its own `charLevel` (already on `FeatSlotKey`). UI (Feats.tsx): the picker's legality follows the slot being
filled (targeted slot, else the broadest slot at the highest level) with a caption "Prerequisites checked at
level N"; also fixed a stray pre-reskin blurple on the type-filter pill. 4 golden tests (illegal in L1 slot /
legal in L3 slot on a half-BAB wizard, the warn Issue, the no-warn case, level-1 no-regression); 599 pass.
Browser-verified: a wizard-3 with Weapon Focus in the level-1 slot shows "Requires BAB +1 — you have +0".
Remaining friend feedback, in order: #1 larger text, #3 advancement preview + tooltips, #4 reset buttons,
#2 archetypes (own project).

**Prior — Builder step order: Class → Race → Basics.** Reordered the creation steps so class and
race come before Basics (was Basics-first), so by the time you reach Basics the ability rows already show
racial modifiers and the alignment grid already knows any class constraint. The order is pure data —
`deriveSteps` in resolve.ts sets the array (also used only for issue-panel grouping); `resolve()` itself is
order-independent (a pure function of `doc.decisions`), navigation is direct tab-clicks (no Next/Prev
walker), tests assert step *membership* not sequence, and nothing is persisted — so this is a ~4-line change:
the array + `Builder.tsx` now opens on `steps[0]` (was hardcoded `'basics'`). The race-owned floating +2
ability bonus stays rendered in Basics (per decision). 595 tests + tsc + build green; browser-verified the
tab order and that a character opens on Class.

**Prior — Candlelight dark variant + Light/Dark/System switch.** Parchment now has a full dark
counterpart and a theme switch. **Theme mechanism:** the rendered theme is `data-theme` on `<html>`
(`:root[data-theme="dark"]` in nocturne.css/app.css); a controller `src/ui/theme.ts` holds the preference
(`system|light|dark` in `localStorage['pathmaker:theme']`) and resolves `system` from
`prefers-color-scheme` in JS (with a matchMedia listener to follow the OS live), so the CSS has no
media branch. A tiny inline script in `index.html` applies the same resolution before first paint (no
flash). `ThemeToggle.tsx` (a segmented Light/Dark/System control, `useSyncExternalStore`) sits in every
screen header (Roster, Builder, Play, Sheet — all `.no-print`); `main.tsx` calls `initTheme()`. **Candlelight palette:** tanned-leather ground `#2c2216`,
warm parchment ink `#e7d7b4`, ember accent `#cf5f47`, brighter gilt. The light theme *inverted* the tonal
ramps (100 deepest); the dark block returns them to **conventional order** (100 palest → 900 deepest) so
low-step-as-text / high-step-as-fill reads on a dark ground. The filled button uses its own
`--btn-fill/-2/-text/-edge` tokens per theme (deep ember on dark). **Texture fixes (both themes):** dropped
the coarse mottle layer (its non-integer `baseFrequency × 700` tile + mismatched filter region read as
*tiled* with a seam) and pinned the fiber's filter region with an integer `baseFrequency × 320 = 192` for
seamless `stitchTiles`; added a warm top **bloom** to the body ground; the dark theme uses a **subtler
grain** (gentle feComponentTransfer curve) so `overlay` doesn't muddy the leather. **Verified** all switch
paths (light/dark/system × OS light/dark, reload persistence, no-flash head script) and hand-checked dark
contrast (the browser scanner can't resolve `color-mix()`/`oklch()` — it false-flags `.text-muted`/warn/err;
hand-computed text-muted-on-panel = 4.29, ember button = 4.85, panel border = 2.01). Only genuinely-dim text
is the muted "Requires" line on *disabled* feat cards (intentional de-emphasis). 567 tests + tsc + build green.

**Prior — Parchment skin, "lean-in" pass (richer components + medium grain).** Building on the skin
below: the grain preset moved **subtle → medium** (`--tex-fiber` feComponentTransfer slope 0.7→1.15).
`.btn-primary` is now a **filled oxblood letterpress** button (gradient fill, pale text, hard bottom edge
in the deepest oxblood, uppercase Cinzel) and `.btn-secondary` a bordered vellum button — both pure CSS,
so all 65 button sites upgraded at once. New **`.pick`** card class (in nocturne.css) gives every
selectable option an always-on border + paper grain, with a rich chosen state (oxblood border + wash +
3px inset rule); variants `.is-clickable`, `.is-warn`, `.is-empty` (dashed cue for empty feat slots),
`.is-marked` (chosen-but-not-previewed), `.is-disabled`. Converted the ~13 inline "invisible-ring" cards
to it across `bits.tsx` (OptionCard), Race (list rows + heritages), Class (list rows + EvolutionStepperRow),
Feats (slots/options/traits/granted), Spells (slot counts + list), Equipment. Fixed two placeholder texts
that used now-light dark-index neutrals (`neutral-600/700` → `500`: Feats "Empty", Basics float button).
**Play mat:** its ~11 section panels were a bare `surface` tint indistinguishable from the ground on a
light theme — replaced the repeated inline `surface/radius/padding` with a **`.mat-panel`** class (warm
26%-ink rule + gilt inner hairline + drop shadow + grain) so each reads as a framed card laid on the page.
**Verified:** 567 tests + tsc + build green; browser contrast-swept Race/Class/Feats/Skills/Spells/Basics
— zero real low-contrast text (filled-button text measured 6.75 against its own gradient; the scanner's
1.06 "hits" on buttons are a known blind spot — it can't read `background-image` fills). Still no theme
toggle / page-turn / dark variant (unchanged scope).

**Prior — Parchment skin (visual reskin, replaces Nocturne; skin-only).** The whole app moved from
the dark "Nocturne" look to an aged-book **Parchment** identity — retuned tokens + fonts + procedural
texture, no layout/JSX/interaction changes. In `src/styles/nocturne.css`: base tokens are now daylight
vellum (bg `#ece0c8`, ink `#3a2c1a`, **oxblood** accent `#8a2f24`, gilt second accent); three
self-hosted OFL faces via `@font-face` (Cinzel headings, IM Fell English body, MedievalSharp labels →
`--font-label`, files in `src/styles/fonts/`, Vite-bundled — the Inter CDN `@import` is gone); a
**procedural SVG-feTurbulence** paper grain ("subtle" preset) baked into `body`, `.card`, `.dialog`
backgrounds via `background-blend-mode`. **Key move:** the three tonal ramps are **inverted** (100 =
deepest … 900 = palest) because the app was built on a dark theme that uses low ramp steps as
*foreground text* and high steps as *fills* — inverting flips every foreground/fill pairing together so
the light theme stays legible without touching ~70 component sites. Fixed alongside: dialog-backdrop
scrim kept dark (ramp-independent), scrollbar thumb + `.micro` re-pointed for the inverted ramp,
warn/err semantic colours darkened for paper, ~16 hardcoded UI colours routed through tokens
(near-white hairlines → `--color-divider`, blurple fills → accent tint), SheetPreview's dead `Inter`
ref → `--font-body`. **Verified:** 567 tests + tsc + build green; browser contrast-swept Basics/Race/
Class/Skills/Advancement/PlaySheet/SheetPreview/Roster — **zero elements below 3.0** (e.g. point-buy
readout 1.55→7.03 after inversion); warn tag 12.8, err 15.8. Two OFL/CC-BY credit line added (footer
copy pending). **Not done (by the skin-only scope decision):** no theme toggle (parchment is the only
look, Nocturne replaced), no page-turn transitions, no dark "candlelight" variant — all easy follow-ups.
Screenshots wedge in the preview pane, so verification was DOM/contrast-measurement based.

**Prior — favored-class alternative bonuses (selectable + tracked).** The per-level favored-class
reward, previously just +1 HP / +1 skill rank, now offers each core race's **alternative** as a third
option. `FavoredClassBonusDef { desc, fraction? }` on `RaceDef.favoredClassBonuses` (keyed by class id);
authored for all **7 core races × 11 CRB classes** (77 entries, verified against raw d20pfsrd — the
`FCB_ALT` table in `races.ts`). The `fcb` decision value gained `'alt'`; `resolve.ts` counts the
alternative picks on favored-class levels (excluded from the HP/skill counts, so taking it gives up that
level's HP/skill) and exposes `Sheet.favoredClassAlt { className, desc, count, fraction?, whole }` — the
tracker does the fractional math (`whole` = count ÷ fraction, floored, for +1/N bonuses). The Advancement
step adds a "Racial alt" option to the per-level FCB select (only when the race×favored-class has one) and
a readout: e.g. "+1/6 of a new rogue talent … Taken ×6 — 1 complete (0/6 toward the next)". 5 tests
(golden: +1/6 accumulation, whole-per-pick, HP given up, none-taken/no-table; content: all 7×11 well-formed).
Browser-verified a human rogue 6 (×6 → 1 complete talent). **Scope:** these are *tracked*, not folded into
stats — most FCB alternatives are fractional accumulators, content ("one extra spell known"), or narrowly
situational, so the sheet counts them and shows the accrued whole rather than computing each into a stat.
Non-core races have no table yet (pure data to extend).

**Prior — spell-like abilities computed.** Each racial/heritage SLA on the play mat now carries its
**caster level** (= the creature's HD / character level) and, when the named spell allows a save, its
**save DC** (10 + spell level + Charisma, the ability racial SLAs use), and links to the catalog spell.
`SpellLikeAbility` gained `casterLevel`, `spellId?`, `saveDc?`; a `slaExtras()` helper in `resolve.ts`
slugifies the SLA name (stripping apostrophes so "Bear's Endurance" finds `bears-endurance`), looks it
up in `spellById`, and fills those fields — `gatherInnate(dec, level, chaMod)` now takes the level and
Cha. The play mat shows "CL N · save DC X" and makes the name open the spell's card when we have it;
SLAs whose spell isn't in the catalog (continual flame, misdirection) stay caster-levelled but unlinked.
4 golden tests (link + CL, CL scales with level, DC = 10 + level + Cha, graceful no-catalog case);
browser-verified a Musetouched aasimar 5 (Glitterdust → **CL 5 · save DC 15**). This closes the
"spell-like abilities (not computed)" bucket item — their *effects* are still the named spell's (utility
spells with nothing further to compute), but the numbers a player needs at the table are now derived.

**Prior — movement modes computed.** A swim or
climb speed now grants its **+8 racial bonus on Swim/Climb** automatically, derived from `race.speeds`
in `collectEffects` — this *fixed real gaps*: undine, gillman, grippli, merfolk, and vanara all had the
speed but never authored the bonus (only lizardfolk did, whose now-redundant trait effect was removed
so it stays +8 rather than doubling). And **medium/heavy armour or load now slows every movement mode**,
not just the land speed (`reduceMode` applies the same one-third step: fly 60 → 40, swim 30 → 20). 5
golden tests; browser-verified an Undine (Swim **+7** = −1 Str + 8 racial) and the Strix fly-reduction.

**Remaining "descriptive-by-nature" items stay descriptive by design** (not gaps — poor fits for
computation): **racial favored-class alternative bonuses** are mostly fractional accumulators (+1/6 of a
discovery), spellbook/known-list additions, or narrowly situational — the two universal options (+1 HP /
+1 skill rank) are already the FCB choice, and the alternates are surfaced in prose; **spell-like
abilities** are already pool-tracked (uses/day, reset on Rest) and their effects are utility spells
(daylight, alter self) with no stat to compute; **fly maneuverability** yields +0 for the only playable
flyer (strix, average). These are documented rather than half-modelled.

**Prior — variant heritages (Aasimar + Tiefling).** Both races now carry their full ARG heritage
tables — a race-level "pick one" that swaps the default ability spread, the 1/day spell-like ability,
and the two skill bonuses. New `HeritageDef` on `RaceDef.heritages`, plus `RaceDef.heritageReplaces`
(the default Skilled + SLA trait ids a heritage supersedes). Decision key `heritage`. In `resolve.ts`:
`chosenHeritage()` helper; `finalAbilities` uses the heritage spread over the race default;
`activeRacialTraits` suppresses the replaced traits; `collectEffects` adds the heritage skill bonuses;
`gatherInnate` swaps in the heritage SLA (`sla:heritage:<slug>`); the ability breakdown attributes the
bonus to the heritage; a `heritage` choice slot appears in the race step. Content authored + verified
against raw d20pfsrd: **6 Aasimar** (Idyllkin/Angelkin/Lawbringer/Musetouched/Plumekith/Emberkin) and
**10 Tiefling** (Faultspawn/Grimspawn/Foulspawn/Pitborn/Hellspawn/Spitespawn/Shackleborn/Hungerseed/
Motherless/Beastbrood) — each with its exact ability mods, alt skills, and alt SLA. Race builder step
renders a heritage picker (ability-spread + SLA badges, single-select, clear-to-default). 16 tests
(golden: Angelkin swap, default fallback, Pitborn, slot presence; content: well-formed + counts).
Browser-verified an Angelkin aasimar (play sheet SLA → Alter Self; picker shows "+2 STR, +2 CHA") and
switching to Musetouched live-bumped Initiative +0 → +1. **Scope note:** Perform maps to Perform
(oratory) since the app splits Perform; the heritages' custom flavor traits (physical features) stay
descriptive — the mechanical spread + SLA + skills are what's computed.

**Prior — racial natural attacks (first of the "descriptive-by-nature" bucket).** The four playable
races with natural attacks now get computed attack lines instead of prose: **Lizardfolk** (bite 1d3 +
two claws 1d4), **Tengu** (bite 1d3), **Changeling** (two claws 1d4), **Kitsune** (bite 1d4, true form
only). New `NaturalAttackDef` on `RacialTraitDef.naturalAttacks` (so an alt-trait that replaces the
trait takes the attack with it); `AttackLine.slot` gains `'natural'`; `PlayState.naturalWithWeapon`
declares "also swinging a weapon this round". Engine helpers in `combat.ts` — `naturalAttackDamageDie`
(size-steps the die for Small), `naturalStrMultiplier` (1½× a *sole* natural attack, 1× primary, ½×
secondary/with-weapon), `naturalAttackPenalty` (−5, or −2 with Multiattack), `naturalPowerAttackScale`
— feed a `naturalAttacks()` builder in `resolve.ts` that appends lines to `sheet.attacks` (full melee
bonus, no iteratives; Power Attack folds in). Play sheet renders them with a `natural` tag and a
`+ weapon` toggle (shown only for characters that have natural attacks) that flips them all to
secondary. 11 tests (5 combat unit, 5 resolve golden, 1 content); verified against raw d20pfsrd
(lizardfolk bite is 1d3 = "two size categories lower"); browser-verified a Lizardfolk 3 (bite +6 1d3+3,
claws ×2 1d4+3; `+ weapon` → +1 / ½ Str) and a Tengu 3 (sole bite +5 1d3+3, 1½× Str). **Scope:** this is
the character's *own* racial natural attacks — the eidolon's attack evolutions and full monster-race
statblocks (a companion/monster sheet) remain descriptive.

**Prior — metamagic damage/DC payoff.** The slot-cost model (below) now also computes the numbers
metamagic changes. In `engine/dice.ts`, `rollDamage(formula, rng, meta)` takes `MetamagicDamageMods
{ empower?, maximize? }`: **Maximize** sets every die to its max face, **Empower** adds half the
normally rolled dice (both together = "maximum result plus half a normal roll", per the feats); flat
modifiers are untouched — the documented simplification. `DamageRoll` gained `empowerBonus`/`maximized`
so the roll log reads e.g. `9d6 → 6+6+6+6+6+6+6+6+6 · maximized` = 54. In `content/metamagic.ts`,
new `dcSpellLevel(base, metaIds, heightenTo?)` returns the level used for the **save DC** — only
Heighten raises it (Empower/Maximize/etc. raise the *slot*, never the DC). `PlaySheet.tsx` wires both:
`rollDamageFor` takes the mods and tags the log; the damage roll button shows `✦` (maximized) / `½+`
(empowered); every prepared spell and the spontaneous tool now show a concrete **save DC** =
`10 + casting ability + dcSpellLevel + matching Spell Focus`, which rises when you toggle Heighten.
Also **fixed** `effectiveSpellLevel`: Heighten's delta now stacks on top of flat metamagic (Heighten-to-5
on a 3rd-level spell + Maximize = an 8th-level slot, was mis-counted as 6). Unit tests in
`dice.test.ts` + `content.test.ts`; browser-verified both modes (sorcerer 9 Fireball: Maximize → 54,
Empower → dice+half, DC held at 18; Heighten→L4 raised DC to 19 / spent a level-4 slot. wizard 9
prepared Fireball in a level-5 slot: Heighten raised DC 18→20, Heighten+Maximize warned "needs a
level-8 slot").

**Prior — metamagic slot-cost computed** (commit `a3244e1`). `content/metamagic.ts` holds the nine
Core metamagic feats with their slot-level adjustments + `effectiveSpellLevel`; `Sheet.feats` exposes
the active feat set; `PlayState.preparedMeta` records metamagic applied to a prepared spell (optional —
no migration). **Spontaneous** casters get a "Cast with metamagic" tool (pick a known spell, toggle
owned feats, Heighten takes a target level; **Spend** expends a slot of the raised effective level,
blocked over-cap or when no such slot is free); **prepared** casters get, per slot, an opened-up pool of
lower-level spells (tagged with their base level) plus metamagic chips, showing effective level and
warning when it won't fit.

**Remaining metamagic simplifications (deliberate):** Empower/Maximize apply to the spell's *dice*, not
to flat per-level modifiers (e.g. Magic Missile's +1s, Cure's +CL bonus stay as printed); non-numeric
metamagic (Enlarge/Extend/Widen/Silent/Still/Quicken) still only change the slot, with their prose
effect left to the player.

**Every computed-feat gap the effect model can express is now closed** — including the two that needed
special gating (Intimidating Prowess, metamagic). No descriptive-only feats remain in scope.

**Prior — Intimidating Prowess computed** (commit `aab12a8`). Adds the Strength modifier to Intimidate
on top of Charisma — an ability-*modifier*-as-bonus gated in the skill loop (`resolve.ts`) where `mods`
are known (like Fleet/Shield Focus). One `untyped` contribution on `skill:intimidate`, shown as
"Intimidating Prowess (Str)" in the breakdown. Golden test; browser-verified a Str 16 Fighter 1 at
Intimidate +7.

**Prior — eidolon evolution pool** (commits `4327f73`, `e9c4e3a`). The last of the four different-in-kind fill-ins,
and the only one that added a new engine capability rather than content. A **point-buy** subsystem: a
new `eidolon-evolutions` `ClassChoiceKind`; the summoner spends a per-level pool on evolutions costing
1–4 points each. `EIDOLON_EVOLUTIONS` (all 48 APG evolutions with cost, min summoner level, and
base-form gate) + `EIDOLON_EVOLUTION_POOL` (Table 2-9) in `subsystems.ts`; `EvolutionDef` in
`model.ts`; `pointBudget`/`pointsSpent` on the `ChoiceSlot`. In `resolve.ts`, `evolutionPool(level)`
sizes the pool, `classChoiceOptions` (now level-aware) marks each evolution legal/illegal by level +
chosen base form, and the class-choice slot loop special-cases the point-buy: it sums selected costs
and raises info (points unspent) / warning (over pool, or illegal picks) issues instead of the generic
"choose (x/count)". The Class step shows a live **spent / budget points** counter (warn-colored when
over) and per-option `◆ N pts` badges. 3 content + 2 golden tests; browser-verified a quadruped
Summoner 8 (counter read 7/11, correct level/form gating). **Verify-don't-guess earned its keep twice:**
the pool table I remembered (3,4,5,6,6,7…) was wrong — two sources agreed on the real
**3,4,5,7,8,9,10,11,13,14,15,16,17,19,20,21,22,23,25,26**; and I read the AoN evolutions page in-browser
to pull all 48 evolutions when the WebFetch summarizer kept dropping the structured data. **Multi-take
now fully supported** (commit `e9c4e3a`): repeatable evolutions (Ability Increase, Skilled, Claws…)
store one array entry per purchase and render with a stepper (`− n +`); one-shot evolutions keep the
take/remove toggle. Options carry `meta.multi` so the UI picks the control; the point-buy sums cost per
occurrence. Browser-verified the stepper (Ability Increase 2→3 moved the counter 5/11→7/11, persisted as
a duplicate id). No simplifications remain in the eidolon subsystem.

**All four different-in-kind subsystem fill-ins are now done** (witch patron spells, alchemist grand
discoveries, bloodline arcana/bonus spells, eidolon evolution pool). No known descriptive or
subsystem-data gaps remain in the class content.

**Prior — bloodline arcana & bonus spells** (commit `e6a1845`). `SORCERER_BLOODLINE_SPELLS`
(`source-features.ts`) gives all 6 CRB bloodlines their arcana (level 1) + 9 bonus spells at
**3/5/7/9/11/13/15/17/19**; `BLOODRAGER_BLOODLINE_SPELLS` gives all 10 ACG bloodlines 4 bonus spells at
**7/10/13/16**. **Bloodragers have no bloodline arcana** (only sorcerers do) — confirmed by reading the
raw class page in-browser. Injected off the existing `bloodline` choice alongside the bloodline
*powers*. All 94 bonus spells cross-checked; 2 coverage + 2 golden tests; browser-verified.

**Prior — alchemist grand discoveries** (commit `fff6b94`). `GRAND_DISCOVERIES` (`subsystems.ts`) is the
six-option 20th-level capstone (Awakened Intellect +2 Int, Eternal Youth, Fast Healing 5, Philosopher's
Stone, Poison Touch, True Mutagen +8 natural armor & +8 Str/Dex/Con / −2 Int/Wis/Cha), wired as a
level-20 `grand-discovery` choice — a flat `Opt[]` + `ClassChoiceDef`, so the engine emits a
`grand-discovery-L20` slot. Coverage + golden test; browser-verified in the Class step.

**Prior — witch patron bonus spells** (commit `ed4446c`). `WITCH_PATRON_SPELLS` (`source-features.ts`)
gives all 10 patrons (agility, animals, deception, elements, endurance, healing, plague, shadow,
strength, winter) their bonus spell added to the witch's list at **2/4/6/8/10/12/14/16/18** (spell
levels 1st–9th), via a compact `patron(...)` helper injected in `resolve.ts` off the level-1 `patron`
choice. Cross-checked two sources including off-Core picks (elements→vortex, endurance→miracle,
winter→polar midnight) — descriptive spell references, so no catalogue entry needed. Coverage +
Winter golden test; browser-verified in the Advancement table.

**Prior — shifter aspect abilities** (commit `a709375`). `SHIFTER_ASPECT_ABILITIES` gives all 10
aspects (bear, bull, eagle/Falcon, frog, lion, monkey, snake, stag, tiger, wolf) their Minor/Major
forms and 8th/15th-level improvements at **1/4/8/15**, injected off the level-1 `aspect` choice.
**No subsystem selector is descriptive-only anymore** — every remaining gap is spell-list or pool
data, not flavor text.

**Prior session — play-mat UX, trait validation, and a subsystem-content pass**
(commits `77bb2ab` → `3d0329a`). The subsystem-content pass closed out the "descriptive" gaps we
found by walking the subsystem lists:
- **Every class now has its own subsystem list — no cross-class reuse.** Authored `SLAYER_TALENTS` +
  `SLAYER_ADVANCED_TALENTS` (keyed off studied target), `INVESTIGATOR_TALENTS` (inspiration / studied
  combat), and `SHAMAN_HEXES` (Wisdom-keyed general hexes + a Witch Hex option) — replacing the old
  rogue-list / witch-list reuse. All in `subsystems.ts`, verified against d20pfsrd, core-scope subsets.
- **Every source-feature progression is authored and coverage-tested now.** `BLOODRAGER_BLOODLINE_POWERS`
  (10 bloodlines, 1/4/8/12/16/20), `SHAMAN_SPIRIT_ABILITIES` (10 spirits, 1/8/16/20 — spirit / greater /
  true / manifestation), and the two missing cavalier orders (Flame + Star, so `CAVALIER_ORDER_ABILITIES`
  now covers all 7 at 2/8/15) join the sorcerer-bloodline list in `source-features.ts`, injected into the
  advancement progression by chosen source via `sourceFeatures` (resolve.ts). The two **oracle**
  source-features are authored too — `ORACLE_FINAL_REVELATIONS` (all 10 mysteries' fixed 20th-level
  capstone) and `ORACLE_CURSE_ABILITIES` (all 6 curses deepening at 1/5/10/15) — as are **wizard
  arcane school powers** (`SCHOOL_POWERS` — two at 1st + one at 6th/8th, all 8 schools + universalist),
  all replacing their generic placeholders. Domain granted powers were already authored
  (`DomainDef.powers`). No source-feature list is descriptive-only. Each has a **coverage test** (every
  option id maps to abilities, so a new source can't silently fall back to the generic feature) + a
  golden progression test.
- Also corrected stale Phase 2 notes (arcanist/vampire-hunter caster tables are verified and filled;
  vampire-hunter has a full feature progression).
- **Play sheet space savings** (`PlaySheet.tsx`): the Running-effects add form folds behind an
  Add/Close toggle (its selects size to content instead of each stretching to its own row); the HP
  card moved Temp HP / Nonlethal up beside the HP number; Saving throws folded into the At-a-glance
  panel as a vertical stack, dropping the standalone panel plus the vs-DC field and the natural-20 note
  (the `saveDc` plumbing in `rollSavingThrow` was removed with it).
- **Play sheet section reorder** (`PlaySheet.tsx`): section order is now Attacks → Spells → Resources
  → Conditions → Skills → Senses (Spells pulled up right below Attacks; Resources/Conditions moved
  above Skills).
- **Builder trait validation** (`resolve.ts`): an `info` issue fires when fewer traits are selected
  than the budget (2, or 3 with a drawback) — "Choose N more trait(s)"; five golden tests cover the
  counts, the drawback bump, and that over-budget still errors.
- **Just before that**, a full multi-list spell-level audit + list-membership cleanup closed the
  spell-correctness backlog (per-list levels via `levelByList`; mass cures dropped from druid; Wail of
  the Banshee off the base cleric list but still Death/Repose-domain-reachable; Blindness cleric-3).

**Earlier — the "just more data" breadth pass is COMPLETE.** The content catalogues were worked to
core-scope coverage in order, each verified and test-gated:
- **① Feats** — the whole CRB list (~173 feats). Simple/Martial Weapon Proficiency were wired into
  `proficiencyCtx` so they actually clear the −4 non-proficiency penalty.
- **② Spells** — common-spell breadth (~130 → ~270). Per the user's scope choice this is the common
  spells players reach for at each level/list, **not** the exhaustive ~500. The five ability-boost
  buffs, Longstrider, the Heroism line and Good Hope are computed; Shocking Grasp / inflict-wounds /
  Sound Burst / etc. carry damage hooks.
- **③ Subsystem option lists** — flagship pick-lists rounded out to solid core coverage (descriptive,
  no engine numbers).
- **④ Traits & equipment** — common core/APG traits + the full Core armor table and a fuller
  adventuring-gear list.

Scope boundary was the Core Rulebook plus the named expansions already in (UC firearms, APG classes);
splatbook-wide breadth stays out. **A note for next time:** the WebFetch summarizer corrupts details
(it mis-stated Stunning Fist's BAB and invented prerequisites), so verified metadata was authored from
knowledge and fetches used only as a completeness cross-check.

**All five roadmap phases are done and committed.** Pathmaker covers the full arc: build a character
1–20, play it at the table (HP, spells, pools, conditions), run the clock (rounds, timed effects,
rest), and track consumables/charges/encumbrance live. Since the phases closed: magic items and
per-weapon combat — **feat parameters** (Weapon/Skill/Spell Focus store their chosen weapon/skill/
school), **masterwork & magic enhancement**, **named weapon and armour special abilities**, the
**worn-item catalogue** with body slots enforced, **Power Attack and two-weapon fighting** as
play-sheet toggles, and **multiclass**.

**What's left is not "just data."** The blocked-on-verification list is empty — every item held for an
untrustworthy source has been resolved. The open backlog is deliberately out-of-scope classes and
races (Vigilante/Omdura, Occult/Alternate/NPC/Unchained, monster/advanced races) and the fidelity
gaps that need engine work — now being worked in priority order. **Done: Improved Critical** (threat
range doubles on the attack line, reusing the keen hook, no stacking) and **Shield Focus / Greater
Shield Focus / Fleet** (the conditional feats, gated in `resolve` where equipped shield and armour
weight are known — Shield Focus folds into the shield's bonus, Fleet adds +5 ft in light/no armour). **Bonus domain /
specialist-school spells are now a distinct, restricted slot** (not the old +1-to-the-count): the
`CastingBlock.bonusSlot` carries a domain slot (allowed spell ids per level, unioned across the
chosen domains) or a specialist-school slot (spellbook filtered by the specialty school), and the
play tracker renders that extra slot with its filtered picker. Domain lists are authored for all 33
domains (`DOMAIN_SPELLS`) and **complete** — all 33 domains × 9 levels are filled (a content test
pins it), after two batches added ~130 spells (the alignment lines, the elemental high-level line,
the creation/hand/word/shadow lines, the aligned dispels, the rune spells, and the domain utility
spells), taking the catalogue to **~400 spells**. **Per-list spell levels are now modelled** — `SpellDef.
levelByList` overrides the flat level where a spell differs by list (Hold Person is cleric/bard 2 but
sorc-wiz 3; Dispel Magic is druid 4; Fear/Hold Monster/Mislead/Break Enchantment/Suggestion/Hideous
Laughter are a level lower on the bard list). Both consumers — the builder's spell step and the play
sheet's prepared pool — file a spell at its per-list level via `spellLevelOn`. The nine clearest
divergences are corrected; a broader audit of every multi-list spell is the remaining tail.

**The engine-fidelity queue is clear and the descriptive-by-nature bucket is essentially done** —
Improved Critical, Shield Focus/Fleet, bonus domain/school slots, per-list spell levels, the metamagic
damage/DC payoff, racial natural attacks, the Aasimar/Tiefling variant heritages, the swim/climb +8 /
armour-slows-all-modes movement rules, spell-like-ability caster level + save DC, and the core-race
favored-class alternative bonuses (selectable + tracked) are all in. What deliberately stays descriptive:
spell-like-ability *effects* (the named utility spell — the numbers are derived), FCB alternatives for
*non-core* races (pure data to extend when wanted) and the fold-into-stats step for the clean FCB ones,
fly maneuverability (+0 for the only playable flyer), darkvision, and the heritages' flavor traits.
What's left as opt-in scope is the deliberately out-of-scope classes/races (Vigilante, Omdura, Occult/
Alternate/NPC/Unchained; Kasatha, monster-tier races) and the content long tail (spells, splatbook feats).
Eidolon attack evolutions and full monster-race statblocks await a companion/monster sheet.

Everything below is the durable detail. When resuming, read this file, then `docs/DESIGN.md`.

## Phase 1 — Level-1 character creator: **complete**

Working, verified (60 tests passing, typecheck clean):
- **Roster** (create/duplicate/delete/import/export, empty state), **Builder** (all steps:
  Basics, Race, Class, Skills, Feats & traits, Spells, Equipment, Review), **Sheet preview**
  (screen + A4/Letter print).
- **Engine** (`src/engine/`): pure `resolve(doc) → { sheet, slots, issues, steps }`; typed-bonus
  stacking; predicate DSL; uniform choice slots; non-blocking validation; localStorage + migrations.
- **Content**: 31 classes (11 core + Warpriest + 12 base + 9 hybrid − see deferrals), 39 races
  (7 core + 16 featured + 14 uncommon + Android/Gnoll/Lizardfolk), ~20 core feats, level 0–1 spells, sample
  traits, core equipment, ~20 deities.

### Key conventions / decisions (don't relitigate without reason)
- **Nothing locks.** Changing an earlier choice never destroys a later one; conflicts surface as
  non-blocking `Issue`s. Exceptions we agreed: (a) hard-disable alignment cells only for
  single-alignment classes (paladin); (b) hard-illegal options (unmet prereqs, double-replaced
  traits) are disabled with `whyNot`.
- **Suspend, don't delete.** Orphaned feats and over-count picks (e.g. Dual Talent → drop) keep the
  decision but stop contributing to the sheet, and raise an error Issue. Generic slot-integrity pass
  in `resolve.ts` catches over-count / now-illegal selections across all slots.
- **UI does zero rules math** — renders `Sheet`/`ChoiceSlot[]`/`Issue[]`, dispatches decisions.
- **Verification gate**: `npm test` must be green. Two suites: golden-character (`resolve.test.ts`,
  hand-computed numbers) + content-integrity (`content.test.ts`, validates every cross-reference).
  Add a golden test for new rules math; content tests auto-cover new data.
- **New content is verified against d20pfsrd** before authoring (caught e.g. Warpriest ¾-BAB,
  Witch ½-BAB, Magus full-BAB).

## Deferred backlog — what's left out (current as of Phase 2 completion)

### Option descriptions & class-granted feats (audit, 2026-07)

Two related gaps were found and closed:
- **Warpriest blessings now show their real effect.** `BLESSINGS` in `deities.ts` holds all 33
  blessings (keyed by the matching domain id) with the **minor power (1st)** and **major power (10th)**,
  verified against d20pfsrd's blessing list; the `warpriest-blessings` choice renders both instead of
  the generic domain blurb.
- **Class-granted fixed feats are now surfaced.** New `ClassDef.grantedFeats` (`{level, feat, note}`)
  → `Sheet.grantedFeats`, rendered read-only under "Granted by your class" in the Feats step and folded
  into the prerequisite feat set. Authored: **warpriest** Weapon Focus (deity's favored weapon, 1st),
  **monk** Improved Unarmed Strike + Stunning Fist (1st), **wizard** Scribe Scroll (1st), **alchemist**
  Brew Potion + Throw Anything (1st), **ranger** Endurance (3rd). Added the missing `throw-anything` feat.

- **Cleric domain granted powers are now authored too.** `DomainDef` gained `powers: {name, level, desc}[]`;
  all 33 domains carry their **two** granted powers (the second at 4th/6th/8th depending on domain), each
  verified against that domain's own d20pfsrd page. `desc` is composed from them ("Fire Bolt (1st): … ·
  Fire Resistance (6th): …"), so the cleric domain picker explains itself. This removed the last
  generated-placeholder description in the content set.

Still open from that audit:
- ~~**Gunslinger's Gunsmithing**~~ — resolved; see *Firearms* below.
- **Bonus domain spells are now modelled per-spell** — a distinct `CastingBlock.bonusSlot` restricted
  to the chosen domains' spell at each level (see the Resume-here note). Domain lists are complete —
  all 33 domains × 9 levels filled (content-test-pinned). Granted powers were already authored.

### Session feedback fixes (2026-07)

- **Feat parameters are now selectable *and computed*.** `FeatDef.param` existed in content but was
  never rendered anywhere, so Weapon Focus (and Skill/Spell Focus, Rapid Reload) had no picker —
  including the warpriest's granted one. Params store under a `feat-params` decision, keyed by slot
  for chosen feats and `granted:<featId>:<level>` for class-granted ones; `GrantedFeat.param` carries
  the option list and current pick. Option lists derive from the catalogues (all 39 weapons, all
  skills) and carry **stable ids** — the stored value is a weapon/skill id, not a display label, so
  the pick survives a rename and is matched against the catalogue rather than string-matched.
  `normalizeParam` maps a legacy name-valued param back to its id so early docs don't lose the pick.
- **Weapon feats fold into the play sheet's attack lines.** `weaponFeatBonuses` applies Weapon Focus
  (+1 attack), Greater Weapon Focus (+1 more), Weapon Specialization (+2 damage) and Greater Weapon
  Specialization (+2 more) **to the named weapon only** — from chosen *and* class-granted feats. The
  bonus shows as its own row in the attack/damage breakdown tooltip.
- **Skill Focus and Spell Focus are computed too.** Skill Focus emits a real effect on
  `skill:<id>` (+3, rising to +6 at 10 ranks), so it flows through the normal stat pipeline and shows
  in that skill's breakdown. Spell DC became an engine stat (`spell:dc` = 10 + casting modifier);
  **Spell Focus / Greater Spell Focus are school-specific, so they are listed alongside** in
  `Sheet.spellFocus` and as stat annotations rather than inflating the flat number — the play sheet
  reads "save DC 13 + spell level (+1 Evocation)". The play sheet no longer computes the DC itself.
- **Masterwork and magic enhancement are modelled** (`src/engine/items.ts`, costs and mechanics
  verified against d20pfsrd). Quality is a property of the **owned item** (an `item-quality` decision:
  `{ masterwork?, enhancement? }` per item id) rather than 39 weapons × 5 catalogue entries — which is
  also how the rules read, since any weapon can be made masterwork or given a +1…+5 bonus.
  - **Weapons**: masterwork = +1 attack only; an enhancement = +N to attack **and** damage, and the
    masterwork bonus does **not** stack with it (a +1 weapon is +1/+1). Applies to that weapon's
    attack line only, with its own breakdown row, and the item reads "+1 Longsword".
  - **Armour/shields**: the enhancement is its own bonus type, so it stacks with the item's armour or
    shield bonus; masterwork (and therefore all magic armour) cuts the armour check penalty by 1.
  - **Cost is derived, not transacted**: masterwork 300/150 gp, weapon enhancement bonus² × 2,000,
    armour bonus² × 1,000, subtracted from gold by the engine — so lowering or clearing an upgrade
    refunds it, and quality on an item you don't own costs nothing.
- **Named weapon properties** (`src/content/weapon-properties.ts`): 20 core special abilities with
  equivalents, costs and mechanics verified against d20pfsrd's individual ability pages.
  - **Priced from the total effective bonus** (enhancement + all equivalents), so a +1 flaming sword
    costs the same as a +2 (both price at +2). The two rules constraints are enforced as Issues:
    an ability needs at least a +1 enhancement, and the combined bonus is capped at +10.
  - **Computed**: unconditional extra damage rides on the damage line (`1d8+4 + 1d6 fire`), **keen**
    doubles the threat range (19–20 → 17–20, multiplier untouched), **speed** inserts an extra attack
    at full bonus. **Conditional** abilities (bane, holy, anarchic, the burst line, wounding…) carry a
    `condition` and are surfaced as notes — never folded into the flat damage, which would overstate
    it against everything that isn't the special case.
- **Armour and shield special abilities** (`src/content/armor-properties.ts`): 15 core abilities,
  verified per-page. **These price differently from weapon abilities** — glamered, slick and shadow
  are a **flat gp surcharge** (2,700 / 3,750 / 3,750) rather than a bonus equivalent, and so do not
  count toward the +10 cap; fortification, invulnerability and spell resistance *are* equivalents.
  `qualityCost` therefore takes a lookup returning `{ equivalent, flat }` and applies both. Assuming
  symmetry with weapons here would have mispriced them.
  - **Computed**: slick (+5 competence Escape Artist) and shadow (+5 competence Stealth) emit real
    effects, composing with the masterwork ACP reduction. Conditional ones (fortification %, SR, DR,
    the shield abilities) are surfaced on the item, never totalled.
  - The ability list offered is filtered by item: weapon abilities on weapons, armour abilities on
    armour, shield abilities on shields.
- **Worn magic items** (`src/content/wondrous.ts`): the "big six" ability boosters (belts of
  strength/dexterity/constitution, headbands of intelligence/wisdom/charisma, +2/+4/+6) plus the
  defensive trio (cloak of resistance, ring of protection, amulet of natural armor, +1…+5) — slots,
  costs and bonus types verified per item page. Families are **generated from one definition each**,
  so a cost curve or bonus type can only be wrong in one place.
  - **Body slots are enforced**: one item per slot, **two rings**. An item beyond a slot's capacity
    is kept and still costs gold (you bought it) but contributes nothing and raises a warning Issue.
  - Effects are ordinary typed bonuses, so they compose with everything else — a Con belt raises HP
    retroactively across all levels, and deflection/natural-armor stack while two rings of protection
    (same type) do not.
  - Cost is derived like item quality, so removing an item refunds it.
  - **The rest of the catalogue** now fills the remaining slots, every price and bonus type read off
    the item's own page: bracers of armor +1…+8 (wrists), and flat-priced items — boots of elvenkind,
    cloak of elvenkind, eyes of the eagle, gloves of swimming and climbing, vest of escape (chest),
    circlet of persuasion (head, covering every Cha-based skill).
    - **Bracers of armor grant an *armor* bonus**, so the engine's same-type rule already stops them
      stacking with a worn suit — the higher of the two simply wins. No special case needed.
    - **Boots of striding and springing** add +10 ft. to speed as a real total; their +5 Acrobatics is
      jump-only, so it is carried as a `condition` and shown as an annotation, never in the total.
      This required a small engine change: `speed` is now an effect target (applied after any
      armour/load reduction, which is computed from base land speed).
    - **Boots of speed and goggles of night** are carried with an empty `effects` list: the engine
      does not model haste or darkvision as a number, so they cost gold and claim a slot but claim
      no bonus anywhere. A content test requires every such item to carry a description, so an item
      with no modelled effect can never be a silent gold sink.
    - `WondrousItemDef.tiered` distinguishes +N families (checked against the bonus² curve by a
      content test) from flat-priced items, which have no curve to check.
  - Not modelled: specific magic items (named weapons/armour) and consumable wondrous items. The
    amulet of mighty fists is deliberately absent — it buffs unarmed/natural attacks, which the
    attack-line engine does not yet model, and listing it would imply a bonus that never appears.
- **Starting gold uses Character Wealth by Level** above 1st (`startingWealth` in `progression.ts`,
  table verified against d20pfsrd): a 3rd-level character starts with 3,000 gp, not the class's
  1st-level roll. Trait gold (Rich Parents) still only replaces the 1st-level figure.
- **Hit points can be rolled in-page at every level**, 1st included. 1st still defaults to the max
  die (RAW) and later levels to the class average; 🎲 rolls 1d(hit die) per row, with a "roll levels
  2–N" bulk action and a reset to the default. The engine honours `hp-rolls[1]` as an override.
- **Layout**: the Advancement table now fills the pane (was capped at 900px); the Class/Race detail
  panels sit flush with the pane edge (a negative right margin pulls the scroll container into the
  Builder column's 26px padding, so their scrollbar lines up with the whole-page-scrolling steps).
- **Classes and races are listed alphabetically.** The definition arrays stay grouped by tier for
  authoring (core/base/hybrid, core/featured/uncommon/exotic) and are sorted at export; each entry
  still shows its tier in `sub`.

### Blocked on verification (won't ship guessed numbers — need a trusted source)
- ~~**Arcanist** spells-per-day grid~~ — **resolved.** The earlier ambiguity had a cause: the
  arcanist is the only class with **two** spell tables, "Spells per Day" and a separate, smaller
  "Spells Prepared", and the summaries being fetched were conflating them (one arrived
  column-shifted, labelling the 1st-level column "0"). Both grids were read straight from the
  page's table markup instead of a summary, and cross-checked against Archives of Nethys — which
  matched on Spells Prepared exactly and confirmed the summary was what had been garbled.
  - `ARCANIST_PER_DAY` / `ARCANIST_PREPARED` in `progression.ts`, with `spellsPreparedPerLevel()`
    exposed as `CastingBlock.preparedPerLevel` (set for no other class).
  - The distinction is now modelled, not flattened: **the arcanist prepares one number of spells
    and casts a different number of times.** The play sheet gives it a prepare list sized by the
    prepared count plus slot pips for castings — spending a casting doesn't consume a particular
    preparation, which is the class's whole point. An arcanist 5 with Int 18 prepares 4 first-level
    spells and can cast 5.
  - Intelligence bonus spells raise slots per day only, never the prepared count.
  - **Every class that casts now has a verified table** — a content test asserts the set is empty.
- ~~**Vampire Hunter** full class table~~ — **resolved; the class is now complete.** Table 1–1 was
  read from the class page's markup. Its BAB and saves matched the existing stat block exactly, and
  its **Spells per Day grid turned out to be the standard four-level progression already encoded as
  `FOUR_LEVEL`** (paladin/ranger) — so the only genuinely new data was the Spells Known table.
  - Spontaneous, **Wisdom**-based, drawing on the **inquisitor list**: no orisons, nothing above
    4th level, casting from 4th. Bonus spells per day from a high Wisdom; a `0` in the table means
    the slot exists only once the Wisdom bonus supplies it.
  - Full per-level progression authored from the Special column, with technique feats as the
    class's bonus-feat track (1st, 3rd, then every three levels). **This was the last of the 31
    classes without per-level content — Part B is now 31/31.**
  - **A gap found along the way:** the four-level *spontaneous* casters (bloodrager, vampire hunter)
    share `FOUR_LEVEL` for slots but know **different** numbers of spells, and `spellsKnownPerLevel`
    handled neither — the bloodrager had been showing no spells-known counts at all. Both known
    tables are now encoded under their own table tags, verified from each class's own page.
  - The repeated rows in both known tables are **in the source** (these tables plateau); a test
    pins them so a later "tidy-up" can't invent a progression the classes don't have.
- ~~**Lizardfolk** natural-armor value~~ — **resolved, and the race is now in.** The conflict was
  between *different stat blocks for the same name*, not a bad source: the playable race is the
  **8-RP race-builder entry** (+1 natural armour), while the +5 belongs to the Bestiary monster,
  and a third-party version quotes +2. The RP budget decides it without needing a tiebreak source:
  2 (flexible +2 Str/+2 Con) + 2 (natural armour) + 1 (swim) + 1 (bite) + 2 (claws) = **8 RP**,
  matching the entry's own title — a +5 natural armour could not fit an 8-RP race at all.
  - Authored in `races-exotic.ts` with +1 natural armour, 30-ft swim speed and the +8 racial Swim
    bonus as real effects. Its bite (1d3) and two claws (1d4) are now **computed natural attacks**
    (see the resume-here) — the amulet of mighty fists that would enhance them is still absent.
  - **Xenophobic** is modelled literally: `languagesAuto: ['draconic']` with **no Common**.

### Classes not in scope / deferred
- **Vigilante** — level-1 specialization changes BAB (Avenger full / Stalker ¾) and the Warlock
  path adds casting; needs choice-dependent progression the engine doesn't model.
- **Omdura** — obscure; ambiguous BAB in the source.
- **Never in scope** (user chose Base+Hybrid): Occult (Kineticist/Medium/Mesmerist/Occultist/
  Psychic/Spiritualist), Alternate (Antipaladin/Ninja/Samurai), NPC classes, Unchained variants.
- **Bloodrager bloodline powers are now authored** — all 10 core bloodlines (aberrant, abyssal,
  arcane, celestial, destined, draconic, elemental, fey, infernal, undead) carry their named powers
  at 1st/4th/8th/12th/16th/20th in `BLOODRAGER_BLOODLINE_POWERS` (`source-features.ts`), verified
  against d20pfsrd and injected into the advancement progression by chosen bloodline (same mechanism
  as sorcerer bloodlines / cavalier orders).

### Races
- **Kasatha** (four arms is a combat mechanic), **monster-tier** (Drider, Gargoyle, Trox, Drow
  Noble), and **advanced** (Lashunta, Skinwalker, Ghoran, Syrinx, Wyrwood, Wyvaran, Gathlain,
  Shabti, Triaxian, Monkey Goblin) are not "just data" — they carry mechanics beyond stat/skill
  bonuses, so they're deliberately not force-added.

### Content breadth (solid core coverage, not exhaustive)
- **Weapons**: 80 weapons (verified against d20pfsrd — damage/crit/type/range/cost/weight),
  feeding the equipment step and the play-sheet attack lines. **Exotic weapons are in**, along with
  the proficiency rule they exist for (see below). Not authored: the net, which deals no damage at
  all — the attack line is built around a damage string, so listing it would print a damage figure
  the weapon does not have. **Feats**: the full **Core Rulebook** catalogue (~173 feats across
  combat/general/skill/spellcasting/metamagic/item-creation) — the whole CRB list is now authored,
  verified against d20pfsrd; splatbook feats remain out of scope. **Spells**: ~270 across levels 0–9
  (core-scope) — the **common-spell breadth** pass added the CRB spells players actually reach for at
  each level and list (cantrips/orisons, the buff line, control, summons, inflict wounds, and more).
  The five ability-boost buffs (Cat's Grace … Owl's Wisdom), Longstrider, Heroism/Greater Heroism and
  Good Hope carry computed effects; Shocking Grasp, Sound Burst, Shout, Flame Blade, the inflict-wounds
  line, Call Lightning Storm and False Life carry damage/temp-HP hooks. Still not exhaustive — the
  obscure long tail and per-list level differences remain (the single-level model). **Subsystem option lists** (rage powers, talents, hexes, discoveries, arcana, mysteries,
  revelations, etc.) are expanded core-scope sets, not exhaustive. **Traits**: the common core/APG
  traits across all categories (numeric skill/save/init ones computed; mechanic-only ones prose) plus
  four drawbacks. **Equipment**: the full Core armor table (hide, splint/banded/half-plate, steel
  shields, tower shield) and a fuller adventuring-gear list (light sources, climbing/disguise kits,
  alchemical items, containers) atop the 80 weapons — costs/weights from the Core table.
  - **Feat fidelity**: numeric bonuses that are unconditional flow into the stat graph (Magical
    Aptitude +2 Spellcraft/UMD, the save/skill feats). **Simple/Martial Weapon Proficiency are wired
    into the proficiency engine** — they clear the −4 non-proficiency penalty (Martial names one
    weapon, Simple grants the group), so a feat can never leave a wrong penalty showing.
    **Improved Critical is now computed** — the chosen weapon's threat range doubles on its attack
    line, reusing the keen `doubleThreatRange` hook; it correctly does *not* stack with keen (the
    range doubles once when either is present). **Shield Focus / Greater Shield Focus and Fleet are
    now computed too** — the conditional feats the flat-bonus effect model can't express are gated at
    the point in `resolve` where the state is known: Shield Focus folds +1 (Greater +1 more) into the
    equipped shield's own shield bonus (only while a shield is wielded; never reaches touch AC), and
    Fleet adds +5 ft per instance only in light or no armour and no worse than a light load.
    **Intimidating Prowess is now computed too** — it adds the Strength modifier to Intimidate on top
    of Charisma, gated in the skill loop where mods are known (the ability-*modifier*-as-bonus case the
    flat-bonus effect model can't express). Class-feature-gated prereqs the DSL can't state ("channel energy", "cast arcane
    spells", "Nth-level fighter") live in `reqText`; fighter-gated feats approximate the level as
    `classId: fighter`, as Weapon Specialization already does.
- **Psychic/occult** spells not authored. **Extracts** (alchemist/investigator) are prepared from the
  full list like other prepared-list casters — slots/day shown, no creation-time selection.

### Modeling simplifications (fidelity notes)
- **Per-list spell levels — audited in full.** The per-list level map (`SpellDef.levelByList`, read via
  `spellLevelOn`) handles every spell whose level differs by list. All 172 multi-list spells were
  audited against the Core per-list levels: ~30 divergences corrected via `levelByList` (the bard
  list usually a level lower; the druid cure/utility lines a level or two above the cleric/arcane
  levels — cure moderate/serious/critical, wall of fire, stoneskin, true seeing, heal, regenerate,
  word of recall, the mass cures; plus cleric offsets like banishment 6, antimagic field 8,
  repulsion 7, locate object 3, bestow curse arcane 4). Golden tests pin a representative set.
  **List memberships were then cleaned up too:** dropped the mass-cure line from druid (druids get
  the single-target cures but no mass cures) and Wail of the Banshee from the base cleric list (it is
  a Death-domain spell — the domain still reaches it by id), and corrected Blindness/Deafness to
  cleric 3. Spell levels and memberships are now consistent across all lists.
- **Spellbook budget** is a soft nudge (free distribution across accessible levels), not a per-level cap.
- **Param feats are computed**: weapon ones (Weapon Focus / Specialization + Greater forms) into the
  per-weapon attack lines, Skill Focus into the skill total, Spell Focus into a per-school DC note.
  **Metamagic is computed** (`content/metamagic.ts` + the play sheet's cast-with-metamagic tools):
  applying a feat raises the effective spell level and spends the higher slot, **and** now recomputes the
  payoff — Empower/Maximize adjust the damage roll (`rollDamage` mods; dice only, not flat modifiers) and
  Heighten raises the displayed save DC (`dcSpellLevel`). Non-numeric metamagic (Enlarge/Extend/Widen/…)
  still only change the slot.
- Energy resistances **are** structured (they subtract on the typed-damage entry). Spell-like abilities
  and senses (darkvision/low-light) are not *computed*, but they are now **surfaced on the play mat**:
  a "Senses & innate abilities" card shows racial senses as badges and innate SLAs as rows, with each
  SLA's daily uses tracked as a pool (`sla:<trait>:<slug>` key, cleared by Rest). Structured on the
  racial traits (`senses` / `spellLikeAbilities`) across all four race tiers. Skill/save/stat bonuses
  (racial, feat, trait, class-feature) **are** real effects.
- Racial **variant heritages** (Aasimar/Tiefling sub-bloodlines) not modeled — standard heritage only.
- **Fly/swim/climb** speeds are display-only; only **land speed** is reduced by armor/encumbrance, and
  that reduction doesn't handle non-proficiency or class-feature exceptions.
- Favored-class **racial** alternative bonuses (beyond +1 HP / +1 skill) not modeled.

## Phase roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Level-1 character creator | **done** |
| 2 | **Level-up** — multi-level engine + per-level decisions | **done** (Part A engine/UI + Part B content, 31/31 classes; multiclass added later) |
| 3 | Interactive play sheet — HP/resource/spell tracking, conditions, prepared spells, rest | **done** |
| 4 | Time & campaign clock — buff durations, rest resets | **done** |
| 5 | Live inventory — consumables, charges, encumbrance in play | **done** |

### Phase 2 status (level-up)

**Part A — scaffolding & core numbers: done.** The engine resolves any level 1–20 with correct
BAB, saves, HP (incl. retroactive Con), skill ranks (Int mod as of each level), feats at odd
levels, class bonus feats (`ClassDef.bonusFeats`), ability increases at 4/8/12/16/20, caster
level, and spell slots/day. Model: `CharacterDoc.level` + level-suffixed decision keys
(`feat-L3`, `rogue-talent-L2`) + `hp-rolls` / `ability-increases`; schema v2 migration.
UI: header level stepper, Advancement step (progression table + per-level HP + ability picks),
feat slots grouped by level, skill cap = level. Golden tests at levels 5/7/4 + Toughness
scaling + retroactive-Con + level-down suspend. Single-class only; multiclass model-ready.

**Part B — verified per-class progression content: done (31/31 classes).** Per-level `features`,
`bonusFeats`, and per-level subsystem `ClassChoiceDef.levels` are authored for every class, verified against each class's d20pfsrd table (mechanical facts from source, prose
paraphrased). The data lives in `src/content/class-features.ts` (`CLASS_PROGRESSION`, attached to
the class defs by a loop in `classes.ts`); subsystem option lists in `subsystems.ts`. Subsystem
picks working: rage powers, rogue/slayer talents (+ advanced), alchemist discoveries, magus arcana,
paladin mercies & divine bond, oracle mystery/curse, witch/shaman hexes, arcanist exploits, shifter
aspects, and bonus-feat slots (fighter/monk/wizard/ranger/cavalier/gunslinger/inquisitor/brawler/
swashbuckler/bloodrager/warpriest/hunter). Caster slots gated to verified progressions only
(`CASTER_PROGRESSION`: cleric/druid/wizard/sorcerer/oracle/witch/shaman = full, bard/skald = six).

Remaining Part-B deferrals / fidelity notes:
- **Multi-level spell selection now works.** The Spells step offers spells up to each caster's max
  castable level: spontaneous casters get a per-level "known" slot capped by the known table;
  prepared-book casters get a per-level spellbook with a total free-distribution budget
  (3 + Int at 1st, +2/level) and an over-budget error. `spell-picks` migrated from a flat array to
  `Record<spellLevel, string[]>`. **Spell content**: a core-scope set now spans **levels 0–9**
  across the arcane/divine/druid lists (bard tagged where its level matches), ~130 spells — every
  caster can select spells at every level they can cast. Fuller (exhaustive) lists remain a breadth
  expansion; the single `level` per spell is a known model limitation for spells whose level differs
  by list (e.g. bard).
- **Caster slot tables encoded for 18 classes** (`progression.ts` + `SpellcastingDef.table`, set via
  the `CASTER` map in `classes.ts`): full-9 (cleric/druid/wizard/witch/shaman + sorcerer/oracle),
  six-level bard (bard/skald), six-level spontaneous (inquisitor/hunter/summoner, own known table),
  prepared-six (magus/warpriest), extract (alchemist/investigator), and four-level (paladin/ranger/
  bloodrager, caster level = level − 3). Each verified against d20pfsrd and anchor-golden-tested.
  Paladin/ranger/bloodrager gained minimal `spellcasting` blocks; four-level casters never get a
  creation-time spell step and show nothing before 4th level. Display filters spell levels whose total
  is 0 (hides the cantrip gap and 0-base levels). **Every casting class now has a verified table** —
  arcanist (9-level) and vampire-hunter (four-level) were the last holdouts and are now filled; a
  content test asserts the set of table-less casters is empty.
- **Fixed a latent bard/skald bug:** the six-level per-day table was indexed from 1st level while the
  engine assumes index 0 = cantrips, so bard slots displayed one level off and skipped the Cha bonus
  spell. The table is now cantrip-indexed (cantrips at-will, hidden in display).
- **Every class now has its own subsystem list** (no more cross-class reuse): **slayer and
  investigator** got their own talent lists (`SLAYER_TALENTS` + `SLAYER_ADVANCED_TALENTS`,
  `INVESTIGATOR_TALENTS`, keyed off studied target / inspiration), and the **shaman** its own general
  hex list (`SHAMAN_HEXES` — Wisdom-keyed, with a Witch Hex option in place of reusing the raw witch
  list). Every option list is still a core-scope subset. **Oracle revelations are now interactive** — a source-dependent `oracle-revelation`
  choice filters options by the chosen mystery (`ORACLE_REVELATIONS` per mystery). **All fixed
  per-source progressions now display per source** — `source-features.ts` holds them and the engine
  injects the chosen source's into the advancement progression (`sourceFeatures` in resolve.ts):
  sorcerer bloodline powers, bloodrager bloodline powers (1/4/8/12/16/20), shaman spirit abilities
  (1/8/16/20 — spirit / greater / true / manifestation, all 10 spirits), cavalier order abilities
  (2/8/15, all 7 orders), oracle final revelations (20th, all 10 mysteries), oracle curse effects
  (1/5/10/15, all 6 curses — the curse deepening at each tier), and wizard arcane school powers
  (`SCHOOL_POWERS` — two at 1st + one at 6th/8th, all 8 schools + universalist; the specialist bonus
  spell slot is separately modelled via `CastingBlock.bonusSlot`). Domain granted powers were already
  authored (`DomainDef.powers`). Each is verified against d20pfsrd, has a coverage test (every option
  id maps to abilities) + a golden progression test, and generic placeholder features were removed in
  favour of the real per-source names. **Gunslinger deeds** are named per level. No source-feature
  list remains descriptive-only.
- **vampire-hunter is now fully authored** — a per-level `features` progression (technique bonus
  feats + vampiric focus, stake, relentless line, etc.) and a verified four-level spontaneous caster
  table, so it no longer falls back to the level-1-only stub.
- **Toughness** scales correctly (`max(3, level)` HP), special-cased in the engine.
- **Favored-class bonus is now chosen per level** (`fcb-by-level` map; the overall `fcb` is the default
  for unset levels) — the Advancement table has a per-level HP/skill FCB picker.

Resolved follow-ups:
- **Class-feature effects are now computed** — `collectEffects` folds in `classFeaturesUpTo` effects
  (e.g. druid Nature Sense's +2 to Nature/Survival), alongside racial/feat/trait/armor effects.
- **Repeated subsystem picks enforce per-series uniqueness** — choosing the same rage power/talent/
  hex/exploit at two levels raises an error Issue (`-L<n>` suffix defines the series).

### Phase 2, concretely (the real work)
1. Give `CharacterDoc.decisions` a **level dimension** (per-level records; creation = levels 1..N via
   the same pipeline). Today it's a flat map — this is the main model change.
2. Generalize the engine off level 1: BAB/save curves over class levels, HP per level, skill ranks
   per level, feats at odd levels, ability bumps at 4/8/12/16/20, class features per level,
   multiclassing (stack BAB/saves), favored-class bonus per level.
3. Level-up UI reuses the existing builder steps per level; add retraining/undo of earlier levels.

Everything in phases 3–5 is additive on top of the effect engine (toggleable states with durations,
a "used" counter layer on the stat nodes that already model pools). No rearchitecting anticipated.

## Phase 3 — Interactive play sheet (in progress)

Goal: turn the read-only sheet into a play surface that tracks the mutable state of a session on
top of the resolved (immutable) build. Key idea: a separate **play state** layered over `resolve()`
output — the build (`decisions`) stays the source of truth for maxima; play state holds the current
values.

- **Play state** lives on `CharacterDoc.play` (persisted, migration-safe optional field):
  `{ hpDamage, tempHp, nonlethal, usedSlots: Record<spellLevel, number>, conditions: string[], … }`.
- **Increment 1 (first):** HP tracker (current = max − damage, temp HP, take-damage/heal, nonlethal)
  and spell-slot tracker (per level: used / remaining, tick off, restore) with a **Rest** action that
  clears damage and used slots. Reuses `sheet.stats['hp:max']` and `sheet.spellSlots`.
- **Increment 2 (done):** conditions as toggles on the play sheet feed effects into `resolve()`
  (`CONDITIONS` in `conditions.ts`; `doc.play.conditions` → `collectEffects`). Shaken/frightened/
  sickened (−2 attacks/saves), fatigued/exhausted (−Str/Dex), dazzled, prone, entangled, grappled,
  blinded, stunned. Required wiring **ability-score effects** into the engine (apply `ability:*`
  effects before deriving mods; show in the breakdown) — foundational, also enables future items.
  Non-numeric parts (can't-act, lose-Dex-to-AC, 50% miss) are noted in the description, not computed.
- **Increment 3 (done):** resource pools. The engine computes pool maxima (`classPools` → `sheet.pools`)
  for barbarian/bloodrager rage, monk ki, cleric channel, warpriest fervor, paladin lay-on-hands,
  bard/skald performance, gunslinger grit, swashbuckler panache, magus arcane pool, arcanist reservoir,
  alchemist bombs, investigator inspiration, inquisitor judgment, cavalier challenge. The play sheet
  tracks used/remaining per pool (pips for ≤10, a counter for larger), cleared by Rest. Murky/varied
  pools (oracle, sorcerer, witch, druid wild shape, ranger) omitted for now.
- **Increment 4 (done):** daily prepared-spell layer. Prepared casters (kind ≠ spontaneous) get a
  per-slot picker on the play sheet — prepare from the spellbook (prepared-book) or the class list
  (prepared-list), then tick each as cast; Rest clears cast (keeps the prep). Spontaneous casters keep
  the generic slot pips. Play state gains `prepared` / `castPrepared` (both optional).

Phase 3 is **complete**: the play sheet tracks HP (damage/temp/nonlethal), spell slots (spontaneous)
or prepared spells (prepared), resource pools, and conditions (which fold into the resolved stats),
all persisted and reset by Rest.

## Phase 4 — Time & campaign clock: **complete**

A pure clock module (`src/engine/clock.ts`) over `PlayState`, dispatched by the play sheet — the UI
still does zero rules math. **Everything is stored in combat rounds** (1 min = 10, 1 hr = 600,
1 day = 14,400) so the clock has a single unit; the UI converts at the edges.

- **Timers** (`PlayState.timers`): `{ id, label, remaining, conditionId? }`. A timer may drive a
  condition — when it expires the condition is cleared, so timed conditions flow back through
  `resolve()` with no engine changes (the existing `conditions` → `collectEffects` path does the work).
  A condition stays active while *any* live timer still drives it.
- **Encounter**: `round` (0 = not in combat) + `initiative`. "Roll initiative & start" rolls d20 +
  the sheet's init modifier and opens at round 1 (starting combat does not burn timer time);
  "Next round" ticks the counter and every timer down by one; "End encounter" resets round/initiative
  but **keeps durations running** (a buff cast before the fight is still up).
- **Advance time** (+1 min / +10 min / +1 hr) counts timers down without touching the round counter.
- **Rest** restores the daily resources (HP, slots, pools, cast-prepared) and then lets **8 hours pass**,
  so running effects expire naturally rather than being cleared by fiat. Prepared spells are kept —
  rest clears what was *cast*, not the preparation. Conditions the user set by hand are left alone:
  cancelling a countdown (✕) is deliberately **not** the same as the effect ending.
- Older saved docs predate these fields, so `normalizePlayState()` fills defaults on read (no schema bump).
- 17 unit tests in `clock.test.ts` cover unit conversion, labels, expiry, multi-timer conditions,
  encounter start/end, rest, and legacy play states.

Not modelled: initiative *order* for a whole party (this tracks one character), per-timer effects of
their own (a timer drives a condition or is just a labelled countdown — it can't add arbitrary bonuses),
and calendar dates.

## Phase 5 — Live inventory: **complete**

`src/engine/inventory.ts` (pure, mirroring `clock.ts`) plus a derived `Sheet.inventory`.

- **The build stays the source of truth for maxima.** `resolve()` builds `inventory` from
  `doc.purchases` minus `play.consumed`, so quantities are derived, never a second copy of the
  shopping list. `sheet.load` is now the sum of *carried* weight — **consuming items lightens you**,
  and the encumbrance label/speed follow automatically through the existing pipeline.
- **Play state**: `consumed` (item id → qty used) and `usedCharges` (item id → charges spent).
  Actions: `consume` / `unconsume` / `spendCharges` / `restoreCharges` / `restock`, all clamped so
  you can't spend past what's on hand or restore past what you bought.
- **Content**: `GearDef` gained `consumable?` and `charges?`. Added alchemical weapons (acid,
  alchemist's fire, holy water, thunderstone, tanglefoot bag), ammunition bundles (arrows, bolts,
  bullets), a potion and a wand of cure light wounds — all costs/weights verified against d20pfsrd.
  Torch, rations and healer's kit are marked consumable.
- **Rest deliberately does not restock.** A night's sleep restores HP/slots/pools; it does not refill
  your potion belt. **Restock** is the separate, explicit "went shopping" action.
- **Ammunition is tracked per listed bundle** ("Arrows (20)"), not per arrow — per-arrow tracking
  would need a bundle/unit split in the model and isn't worth the fidelity yet.
- 12 unit tests in `inventory.test.ts` (clamping, restock, derived quantities, load recomputation,
  over-consumption, stale entries on non-consumables).

Not modelled: buying items *during* play (the build's Equipment step is still the shop), containers,
item weight for coins, and per-arrow ammunition.

### Phase 3 breadth fill-in (ongoing)
- **Conditions** expanded 11 → 22 (added panicked, deafened, cowering, pinned, flat-footed, helpless,
  paralyzed, dazed, staggered, nauseated, confused). A `loseDexToAc` flag on conditions now drops the
  Dex bonus from AC/touch/CMD (flat-footed, blinded, stunned, cowering, pinned, paralyzed, helpless).
- **Domain / specialist-school bonus spell slot** — now a distinct, *restricted* slot (`CastingBlock.
  bonusSlot`), not the old +1-to-the-count: a cleric's domain slot offers the union of the chosen
  domains' spell at each level; a specialist wizard's slot offers the spellbook filtered to the
  specialty school. The play tracker renders it with its filtered picker; Rest clears its cast state.
- **Spell save DC** (10 + spell level + casting mod) shown on the play sheet.
- **Multiple pools per class**: paladin now has lay-on-hands **and** smite-evil; monk has ki **and**
  stunning fist. Added druid **wild shape** uses (4th–19th). A **skills panel** (trained skills + totals)
  is on the play sheet.
- **Per-weapon attack lines & breakdown tooltips: done.** The play sheet shows an attack line per
  equipped/carried weapon (main hand, off hand, then purchased weapons) with the iterative sequence
  (`+9/+4`), Str-scaled damage (one-handed +Str, two-handed +1½×, off-hand +½×; ranged adds no Str),
  crit/damage-type/range, and a click/hover breakdown card. At-a-glance stats, HP, and skills got the
  same breakdown tooltips. Not folded (noted, not computed): composite-bow Str, thrown-weapon Dex.
- **Multiclass: done** (rules confirmed against d20pfsrd's Character Advancement page: hit points,
  base attack bonus and saves from each class **add together**; class abilities key off that class's
  own level while character-level effects use the total; no XP penalty in PF1).
  - **Model:** `class-levels`, an array of the class taken at each character level, with unset
    entries falling back to the primary class. A single-class document therefore stores nothing,
    needs no migration, and resolves identically — the whole pre-existing suite passing unchanged
    was the evidence. Gaining a level needs no write either.
  - BAB and saves sum per class, each **rounded on its own level count**: Fighter 1/Rogue 1 is BAB
    +1 (not +2) but gets Fort +2 *and* Ref +2. `sumBab` / `sumSave` in `progression.ts`.
  - Each level takes its own class's hit die and skill ranks; class skills are the union.
  - General feats come from the character level; class bonus feats and subsystem picks from that
    class's level, keeping existing slot keys stable. `FeatSlotKey` gained a separate `charLevel`
    because `level` meant character level for general feats but class level for bonus feats.
  - The **favored-class bonus is earned only on levels in the favored class** — it previously
    counted every level, which would have overpaid every multiclass character.
  - **Spellcasting is per class** (`Sheet.casting: CastingBlock[]`): a wizard 5/cleric 2 casts as a
    5th-level wizard *and* a 2nd-level cleric, with separate caster levels, slot tables and save
    DCs. There is no merged progression, so these are never summed. Prerequisites ("caster level
    5th") use the best class.
  - **UI:** the Advancement table has a class column per level (1st level stays tied to the Class
    step, so there's one place to set the first class); the summary line reads "Fighter 5 / Wizard 1".
  - **The play-sheet tracker is per class too.** `PlayState.usedSlots` / `prepared` / `castPrepared`
    are keyed `classId → spellLevel → …`, and the play sheet renders one panel per casting class
    (each with that class's own save DC, since each casts off its own ability). Expending or
    preparing in one class cannot touch another. Rest clears expenditure for every class while
    keeping every class's preparations.
    - **Schema v3 migrates existing saves**: pre-v3 play state is keyed by spell level alone, and
      is filed under the character's class decision on load. Legacy entries with no class to
      belong to are dropped rather than left in a shape the new code would read as class ids.
      The migration is idempotent and covered by `character.test.ts`.
- **Exotic weapons + the weapon-proficiency rule: done.** The 21 Core exotic weapons are authored
  (kama/nunchaku/sai/siangham, bastard sword, dwarven waraxe, whip, the five double weapons, spiked
  chain, elven curve blade, totem spear, bola, hand and repeating crossbows, shuriken, halfling
  sling staff), read from the weapons table's markup and filtered to Core-Rulebook rows.
  - Exotic weapons only mean anything if **not** being proficient costs something, so the −4
    non-proficiency penalty is now modelled and folded into the attack line with its own breakdown
    row and an explanatory note. This also fixes the same gap for simple/martial weapons — a wizard
    with a longsword previously showed no penalty either.
  - Proficiency draws on three sources: the class list, **racial Weapon Familiarity**, and the new
    **Exotic Weapon Proficiency** feat (parameterised, offering only exotic weapons).
  - Familiarity distinguishes its two halves properly: `proficient` grants the weapon outright,
    while `martial` merely reclassifies an exotic weapon — which is **worthless to a class without
    martial training**. A dwarf fighter wields the waraxe cleanly; a dwarf wizard still takes −4.
    The data lives on the *trait*, so an alternate trait that replaces Weapon Familiarity takes the
    proficiency with it.
  - **Dwarf and gnome were missing their Weapon Familiarity traits entirely** — added, verified.
  - **The class proficiency lists had never been validated**, because nothing consumed them: they
    named `crossbow-light`, `crossbow-heavy` and `shortsword`, none of which are real weapon ids,
    and `sap`, which was not in the catalogue at all. All fixed, with a content test asserting every
    id in a proficiency list or a familiarity resolves — a silent mismatch is now a wrong −4.
- **Firearms: done** (Ultimate Combat). 20 guns authored from the UC firearms table's markup —
  8 early one-handed, 7 early two-handed, 5 advanced — plus the ammunition (black powder, bullets,
  pellets, the five alchemical cartridges, metal cartridges), a powder horn and a gunsmith's kit.
  - `WeaponDef.firearm` (`{era, grip, misfire, burst, capacity, scatter}`) marks a gun; presence of
    that block *is* what makes a weapon follow the firearm rules.
  - Firearms are **their own proficiency group**, not one-exotic-weapon-at-a-time: Exotic Weapon
    Proficiency (firearms) is a single pick covering every gun, so `EXOTIC_WEAPON_OPTIONS` carries a
    group option (`FIREARM_GROUP_ID`) that adds to `groups` rather than `weapons`. The gunslinger's
    class list already said `firearms`; that string is now a real group instead of a dangling id.
  - **The distinctive rules stay notes, not numbers.** Touch AC within the first range increment
    (early) or first five (advanced), the 5×/10× maximum range, misfire → broken → burst, capacity
    and reload action, the −4 for firing a two-handed gun one-handed, and scatter cones are all
    annotations on the attack line. None of them is a bonus to a total, and the engine cannot know
    the range to the target — so inventing a number would be worse than stating the rule.
  - **Gunsmithing** is authored and granted to the gunslinger at 1st, closing the last unmodelled
    granted feat. The **battered starting firearm** itself is not granted as an item.
  - Deliberately not authored, each for a stated reason: the **culverin** (its row gives no cone size
    for its grapeshot, and it carries its own unsupported-firing rules), the **breech-loader** and
    **air repeater** (their table rows carry no source at all), and the four later-supplement rows
    (dragoon pistol/musket, paddle-foot pistol, cylinder rifle) as out of scope.
  - Known upstream conflict: the **dragon pistol**'s table row prints a 20 ft. range increment while
    its own description says 10 ft. The table wins, as the printed stat block; noted in the data.
  - Several guns (axe musket, warhammer musket, dagger/sword-cane pistol, buckler gun) **double as a
    melee weapon**, and the firearm table carries no melee profile for them. Rather than invent one,
    the attack line says only the firearm mode is modelled (`WeaponDef.note`).
- **Composite bow Strength ratings: done.** A composite bow is built to a rating, and the rating is a
  property of the **owned bow** (`ItemQuality.strRating`) rather than six catalogue entries — which is
  how the rules read, even though the weapons table prints one row per rating.
  - The rating **caps** how much Strength bonus reaches damage (Str +4 with a +2 bow adds +2), a bow
    rated above your Strength costs **−2 to hit** (its own breakdown row), and a Strength **penalty**
    applies to damage in full regardless of rating — the rating is a maximum on the bonus, not a floor
    under the penalty.
  - Priced per point by the bow: **100 gp** for a composite longbow, **75 gp** for a shortbow, charged
    alongside `qualityCost` rather than through the enhancement curve. The picker's option labels show
    what the whole bow comes to, matching the printed +0…+5 rows exactly.
  - **Slings were the silent gap this uncovered.** The attack-line note had always read "no Str to
    damage (composite bows and slings excepted)" — but slings got no Strength at all, so the note
    described a rule the engine did not implement. The sling and the halfling sling staff now add the
    full Strength modifier, as their descriptions specify.
- **Thrown weapons: done.** A melee weapon with a range increment (dagger, club, shortspear, spear,
  trident) now produces a **second attack line** rather than a note the reader has to apply. The two
  modes are genuinely different attacks: thrown rolls off **Dex**, melee off Str.
  - Thrown adds Str to damage but **never the 1½× two-handed multiplier** — that rule is about a
    weapon "you are wielding two-handed", and a thrown one has left your hands. A Str 18 fighter's
    spear reads **1d8+6 melee, 1d8+4 thrown**, which is the case that makes the distinction visible.
  - Thrown range caps at **five** range increments (projectile weapons get ten), stated on the line.
  - **Power Attack does not reach the thrown line** — it is melee-only, and the existing `kind`
    gate handles that for free once throwing is a ranged attack. Off-hand throwing halves Str as
    any off-hand attack does. Enhancement, masterwork and weapon feats apply to *both* modes: it is
    one weapon.
  - `AttackLine.mode` distinguishes them. The two modes share a weapon `id`, so **anything keying
    attack lines must include the mode** — the play sheet's React key does.
  - Weapons that are already ranged (javelin, dart, shuriken, bola) keep their single line; throwing
    is their only mode.
- **Spell effects on the play sheet, and dice rolling: done.**
  - **Running buffs are real numbers now.** A `Timer` gained `effects: Effect[]`, resolved at cast
    time from the caster level and stored as plain data, and `resolve()` folds running timers into
    the same typed-stacking pipeline as conditions. Casting Divine Favor at CL 6 moves the attack
    line from +3 to +5 and its damage from 1d8+3 to 1d8+5; letting the minute run out puts them back.
    Nothing new was needed in the stacking rules — two Divine Favors take the higher (both luck),
    Bless and Divine Favor stack (morale vs luck), Mage Armor and Shield stack (armor vs shield).
  - **`damage:weapon` is a new effect target**, because weapon damage had none: it is per-weapon,
    not a printed stat. It rides every attack line's damage with its own breakdown row. This also
    fixed **Sickened**, whose −2 to weapon damage had been prose the engine never applied.
  - **`skill:all`** was added alongside the existing `save:all`, for Prayer.
  - **12 buff spells authored** (`spell-effects.ts`), each scaling clause read from its own spell
    page: divine favor, bless, prayer, aid, shield of faith, mage armor, shield, barkskin, haste,
    expeditious retreat. Spells whose effect is a miss chance, an area, or target-dependent stay
    prose — the engine cannot total them honestly. Bless's fear-only save bonus is an
    **annotation**, not a total, which is the same line drawn everywhere else.
  - **`SpellBuffDef.at(casterLevel)` is a function, not a table**, because the scaling genuinely
    differs in shape: "+1 per three levels, max +3" and "+2, plus 1 per six, max +5" share nothing.
  - **Dice live in `src/engine/dice.ts`** — pure functions over an injected `Rng`, so rolling is
    testable with scripted dice and `resolve()` stays completely deterministic. Attack rolls read
    the weapon's threat range from its crit string; damage parses the sheet's own damage strings
    (including a double weapon's `1d6/1d6`, which rolls one end) and never deals less than 1.
  - **~30 damaging spells carry rollable formulas**, capped where the spell caps: fireball at 10d6,
    burning hands at 5d4, magic missile growing in *missiles* rather than dice. Healing is labelled
    as healing rather than damage.
  - **The roll log is session-only React state**, deliberately not persisted: a roll is a moment,
    and a log restored from a session three days ago would be noise.
  - Casting a buff works from two places — the prepared-spell `cast` button (which also spends the
    casting) and a picker in Running effects, which is the only route a **spontaneous** caster has,
    since their casting is an anonymous pip with no spell identity.
  - Not modelled: expending the slot from the picker (it says so), Haste's extra attack and its
    twice-normal-speed cap, and Aid's temporary hit points (rollable, but entered by hand).
- **Saving throws are rollable on the play mat, and conditional bonuses finally do something.**
  `Stat` gained `conditional: ConditionalBonus[]` — the same bonuses it already rendered as
  `annotations` strings, now structured. A conditional bonus is useless as prose at the moment you
  roll a save against the very thing it covers, so the save panel offers each one as a **switch**,
  off by default, and the engine adds the ones turned on. A dwarf's Hardy reads "+2 vs poison,
  spells, and spell-like abilities" and can be included in the roll that needs it.
  - `rollSave` owns the outcome rather than letting the caller compare totals, because **a natural
    20 always saves and a natural 1 always fails** whatever the DC and the modifiers say.
  - The DC is optional: without one the roll is reported and left to whoever set the difficulty.
  - Both stat renderings now come from **one formatter**, so a breakdown card and a roll toggle
    cannot describe the same bonus differently.
- **Two buff spells were missed in the first pass and have been added**: **Bull's Strength**
  (+4 enhancement to Strength — an ability buff, so attack, damage, CMB and Climb all follow from
  the one change) and **Protection from Evil**, whose +2 AC and +2 saves are *both* evil-specific
  and therefore total nothing, existing only as conditional bonuses the save panel can switch on.
- **Typed damage entry: done** (`src/engine/damage.ts`). The HP tracker's `damage(n)` took a raw
  number and knew nothing about it, which is why damage reduction and energy resistance had no way
  in. The play sheet now takes an **amount plus a damage kind**, and the engine decides what
  actually lands. This is the other half of the game from `resolve()`: that computes what the
  character rolls, this computes what a number coming the other way is reduced to.
  - Three rules, each excluding the others: **energy** damage meets resistance of that type and
    never DR; **physical** damage meets DR and never resistance; **untyped** (a spell naming no
    type) meets neither, because spells and spell-like abilities ignore DR.
  - **Neither stacks.** The best single resistance applies — a spell's resist 20 does not add to a
    racial resist 5. DR is subtler: the best applies *in a given situation*, so which one wins
    depends on the attack. A barbarian 13 under stoneskin takes **10** from a plain sword (stoneskin's
    DR 10) but **17** from an adamantine one (stoneskin bypassed, the barbarian's DR 3 still there)
    — neither 20 nor 10. That is why the UI asks what got through rather than deriving it: only the
    player knows what hit them.
  - `Sheet.defenses` is fed from three sources: **racial energy resistance** (8 traits — aasimar,
    tiefling, suli and the elemental-blooded races — which existed only as prose and are now
    structured), **class DR** (barbarian, bloodrager, skald, where the amount is simply how many of
    the listed levels you have reached), and **running buffs**, via new `Timer.dr` / `.resistances`.
  - **Stoneskin** is the first buff that grants no stat bonus at all, so `SpellBuffDef.at()` can now
    return `dr`/`resistances` beside `effects`. Its discharge (10 points prevented per caster level)
    is not counted down, and says so.
  - Still not modelled: **resist energy** and **protection from energy**, which need a cast-time
    energy-type parameter the buff picker has no mechanism for; protection from energy is also a
    depleting pool rather than a flat reduction.
- **Self-directed attacker spells: done** — spiritual weapon and flaming sphere. These act once a
  round on your turn, so they belong on the mat as a **running timer that prompts a roll**, not as a
  bonus to the caster's own numbers. This is why they were deferred earlier — the mat had no
  recurring-per-round mechanism, and `Timer` had proven it could carry structured data only after
  the buff and DR work.
  - `Timer.attacker` (`IndependentAttacker`) is resolved from the caster at cast time and frozen:
    spiritual weapon strikes with the caster's **BAB (iteratives) + Wisdom** — not the casting
    ability — for 1d8 + 1 per three levels (max +5); flaming sphere makes **no attack roll**, deals
    3d6, and carries its **Reflex DC** (10 + casting mod + spell level) for the target to save
    against. The chip shows a d20 button only when it actually attacks.
  - `spellAttackerTimer(spell, ctx, id)` reuses the existing `iterativeBonuses` (now exported from
    resolve). The play sheet's cast picker is the buff picker generalised — both buffs and attackers
    are running timers, chosen by the spell's list at the caster level that casts it, and the
    prepared-spell `cast` button starts either.
  - Deliberately fixed at cast time (with a caveat saying so): spiritual weapon's BAB does not pick
    up a later Haste; its threat range defaults to ×2 because the engine does not know the deity's
    favored weapon. Not modelled: the move action to redirect either one.
- **Concealment miss chances: done** — the post-attack step. Concealment does not modify the
  attack roll; it is a *separate* d% rolled after a hit connects, per the rules ("make the attack
  normally — if the attacker hits, the defender must make a miss chance roll"). So it lives in
  `dice.ts` as `rollMissChance`, not in `resolve()`. Concealment is 20%, total concealment 50%, and
  neither stacks, so the mat offers the single applicable chance as a target selector.
  - On the play sheet a **Target** selector (in the open / concealed / total) applies to every
    attack roll until changed; when set, each attack also rolls the d% and the log reads
    "concealment 20%: rolled 12 — missed through concealment" with a **concealment miss** badge.
  - A percentile at or under the chance misses; a natural-20 threat can still be spoiled by
    concealment, which the browser run confirmed. A natural 1 has already missed, so no d% is rolled.
  - This is the caster's *offense* — swinging at a concealed foe. The defensive side (blur,
    displacement on the character) is the GM rolling against them, so it is not a player action and
    is not modelled here; the spells stay prose.
- **Resist energy: done — the first cast-time-parameterised buff.** `SpellBuffDef` gained an
  optional `param` (label + options) and `at(cl, param)`, so a spell can ask a question when cast.
  Resist energy grants **resist 10 against a chosen energy type, 20 at CL 7, 30 at CL 11**, for 10
  minutes per level — a resistance, not a stat bonus, so it rides `resistances` and flows into the
  same `Sheet.defenses` the typed-damage entry already reads. Verified end to end: CL 7 fire cast,
  12 fire in → 0.
  - The play sheet's cast picker shows the energy-type dropdown when the chosen spell has a `param`,
    and Cast is disabled until a type is picked. `spellBuffTimer(spell, cl, id, param)` resolves the
    choice once (an unknown/absent param falls back to the first option) so the chip label and the
    resistance always name the same type — "Resist Energy (Fire, CL 7)". The prepared-list cast
    button passes no param and so takes that visible default, correctable by re-casting.
  - Still deferred: **protection from energy**, which is not a flat resistance but a **pool** (12
    points absorbed per caster level, then it ends) — that wants the `usedPools` mechanism, not the
    resistance one, so it is its own piece of work.
- **Action economy: done** (`src/engine/actions.ts`) — the turn tracker, and the structural piece
  the sphere-redirect and a proper protection-from-energy pool were both waiting on. A turn hands
  out one standard, one move and one swift action; `PlayState.actionsUsed` records what's spent and
  the clock **refreshes it every round** (also on start/end encounter and rest). Free actions and
  the 5-foot step are not budgeted — the rules cap them loosely, so tracking them would be noise.
  - `spendAction(used, cost)` applies the rules one slot can cover another with: a **move you no
    longer have downgrades your standard action** ("you can take a move action in place of a
    standard action"), and a **full-round action needs both** standard and move free. It returns
    the new budget or leaves it untouched, so the mat never has to know the rule.
  - On the play sheet a **This turn** row (combat only) shows the three actions as toggle pips plus
    quick buttons (attack / full attack / cast / move / **direct a sphere** / draw / swift) that
    spend through the engine and disable when they don't fit, and a **New turn** reset. Verified:
    two moves spend the standard as the second; a full attack blocks a follow-up attack but leaves
    the swift; Next round refreshes.
  - This closes the sphere-redirect note from the self-directed-attacker work — directing a
    spiritual weapon or flaming sphere is now a real move action on the tracker. **Protection from
    energy** (a depleting pool) is still deferred; the action economy was the shared prerequisite,
    not the pool itself.
- **Protection from energy: done — the last excluded spell effect.** It is a **depleting pool**,
  not a flat resistance: it absorbs the whole chosen energy type until **12 points per caster level
  (max 120)** are spent, then discharges. `Timer.absorb` holds the pool; `applyDamage` reports a
  `deplete` so the play sheet subtracts what was absorbed and removes the timer at zero — the engine
  stays pure, the mat holds the state.
  - **Absorb takes precedence over resistance and never touches the same points**: the pool soaks
    up to its remaining charge, and only the overflow on the discharging hit reaches resist energy
    (the rules: "the protection spell absorbs damage until its power is exhausted"). Verified end to
    end — a CL 6 fire pool (72) took 50 fire to 0, then 30 more absorbed 22, discharged, and let 8
    land; the chip and defenses line disappeared when the pool emptied.
  - Uses the resist-energy cast-time param for its type, and the chip shows the pool remaining live.
- **All the excluded spell-effect categories are now resolved or accounted for.** Miss chances,
  DR/energy resistance, self-directed attackers, the action economy and both energy wards are done;
  what stays prose (target-imposed conditions, areas, utility) genuinely cannot be totalled honestly.
- **Power Attack & two-weapon fighting: done** (`src/engine/combat.ts`, numbers verified against both
  feat pages). These are **declared per attack**, not passive, so they live in play state
  (`PlayState.powerAttack` / `twoWeapon`) as play-sheet toggles and are folded in **only while on** —
  a character who owns Power Attack but isn't using it must still see their honest attack bonus.
  - Power Attack: −1/+2, worsening at BAB +4 and every 4 after; ×1½ damage two-handed, ×½ off-hand;
    melee only. Requires the feat.
  - Two-weapon: −6/−10, or −4/−8 with a light off-hand weapon; the feat lessens the primary by 2 and
    the off hand by 6. The off hand gets **one** attack (plus Improved/Greater at −5/−10), not the BAB
    iteratives. Both hands are penalised; carried weapons are not.
  - **Gated in the engine, not just the UI.** The flags can outlive their preconditions (unequip the
    off-hand weapon with the toggle still on), and a stale flag must never alter a number — this was
    a real bug caught in browser verification, where a one-weapon fighter showed +3/−2 instead of
    +9/+4. The toggle's lit state now mirrors what the engine actually applied.
  - `Sheet.combatOptions` reports availability, so the UI still does zero rules math.
- **Still thin:** resource pools still omit oracle/sorcerer/witch/ranger/hunter/summoner/shaman/slayer/
  brawler (varied or at-will resources); the domain/school slot is a count approximation (restriction
  not enforced).
