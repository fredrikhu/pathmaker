# Pathmaker — Project Status & Backlog

Snapshot of where the project stands, what was deliberately deferred (and why), and the
phase roadmap. Written so context isn't lost across sessions/compaction. Companion to
[DESIGN.md](DESIGN.md) (architecture) and the HANDOVER docs (UI).

## ▶ Resume here (last session end)

**Phases 1, 2, and 3 are all done and committed** (branch `master`, working tree clean, ~143 tests
passing; run `npx tsc --noEmit && npx vitest run && npm run build` to confirm). Phase-3 breadth is
substantially filled in (22 conditions with lose-Dex-to-AC, domain/school bonus slots, spell DCs,
multiple resource pools per class, a play-sheet skills panel).

**Phase-3 nice-to-haves are now done** — the play sheet has **per-weapon attack lines** (iteratives
from BAB, Str-scaled damage, crit/type/range, per-weapon breakdown tooltip) and **click-to-see-breakdown
tooltips** on the At-a-glance stats, HP, and trained skills (reusing the builder StatStrip tooltip infra).
`Sheet.attacks: AttackLine[]` is computed in `resolve.ts` (`weaponAttacks`), golden-tested.

**All five roadmap phases are done** (see their sections below). Pathmaker now covers the full arc:
build a character 1–20, play it at the table (HP, spells, pools, conditions), run the clock (rounds,
timed effects, rest), and track consumables/charges/encumbrance live.

From here the work is breadth and polish rather than new phases — the open items are the deferral
backlog below (blocked content, unmodelled subsystems) and whatever the table turns up in real use.

Everything below is the durable detail. When resuming, read this file, then `docs/DESIGN.md`.

## Phase 1 — Level-1 character creator: **complete**

Working, verified (60 tests passing, typecheck clean):
- **Roster** (create/duplicate/delete/import/export, empty state), **Builder** (all steps:
  Basics, Race, Class, Skills, Feats & traits, Spells, Equipment, Review), **Sheet preview**
  (screen + A4/Letter print).
- **Engine** (`src/engine/`): pure `resolve(doc) → { sheet, slots, issues, steps }`; typed-bonus
  stacking; predicate DSL; uniform choice slots; non-blocking validation; localStorage + migrations.
- **Content**: 31 classes (11 core + Warpriest + 12 base + 9 hybrid − see deferrals), 39 races
  (7 core + 16 featured + 14 uncommon + Android/Gnoll), ~20 core feats, level 0–1 spells, sample
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
- **Gunslinger's Gunsmithing** is the only unmodelled granted feat — the feat isn't in the catalogue and
  firearms aren't modelled at all, so adding it would dangle. The class feature text already describes it.
- **Bonus domain spells** are still not modelled per-spell (the extra domain slot is a +1 count
  approximation in the engine); only the granted powers are authored.

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
  - Not modelled: specific magic items and slotted wondrous items.
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
- **Arcanist** spells-per-day grid (unique 9-level table; the fetched values were ambiguous) →
  `SpellcastingDef.table` unset, so no slot numbers shown for arcanist.
- **Vampire Hunter** full class table (unverifiable) → keeps only its level-1 `features1` fallback.
- **Lizardfolk** natural-armor value (source gave +1 vs the canonical +5) → race held.

### Classes not in scope / deferred
- **Vigilante** — level-1 specialization changes BAB (Avenger full / Stalker ¾) and the Warlock
  path adds casting; needs choice-dependent progression the engine doesn't model.
- **Omdura** — obscure; ambiguous BAB in the source.
- **Never in scope** (user chose Base+Hybrid): Occult (Kineticist/Medium/Mesmerist/Occultist/
  Psychic/Spiritualist), Alternate (Antipaladin/Ninja/Samurai), NPC classes, Unchained variants.
- **Bloodrager bloodline-power names** are descriptive (per-level powers not named per bloodline);
  the source-feature mechanism exists (`source-features.ts`) and could hold them if authored.

### Races
- **Kasatha** (four arms is a combat mechanic), **monster-tier** (Drider, Gargoyle, Trox, Drow
  Noble), and **advanced** (Lashunta, Skinwalker, Ghoran, Syrinx, Wyrwood, Wyvaran, Gathlain,
  Shabti, Triaxian, Monkey Goblin) are not "just data" — they carry mechanics beyond stat/skill
  bonuses, so they're deliberately not force-added.

### Content breadth (solid core coverage, not exhaustive)
- **Weapons**: 39 core simple/martial weapons (verified against d20pfsrd — damage/crit/type/range/cost/
  weight), feeding the equipment step and the play-sheet attack lines. Exotic weapons and magic
  enhancements not yet modeled. **Feats**: 64 verified Core feats (combat/general/skill/spellcasting/
  metamagic/item-creation) — not the full splatbook catalogue. **Spells**: ~130 across levels 0–9 (core-scope) — not exhaustive
  full lists. **Subsystem option lists** (rage powers, talents, hexes, discoveries, arcana, mysteries,
  revelations, etc.) are expanded core-scope sets, not exhaustive. **Traits/equipment**: core subset.
- **Psychic/occult** spells not authored. **Extracts** (alchemist/investigator) are prepared from the
  full list like other prepared-list casters — slots/day shown, no creation-time selection.

### Modeling simplifications (fidelity notes)
- **Single `level` per spell** — a spell whose level differs by list (e.g. many bard spells) is stored
  at one level; bard is tagged only where its level matches. A per-list level map would fix it.
- **Spellbook budget** is a soft nudge (free distribution across accessible levels), not a per-level cap.
- **Param feats are computed**: weapon ones (Weapon Focus / Specialization + Greater forms) into the
  per-weapon attack lines, Skill Focus into the skill total, Spell Focus into a per-school DC note.
  Metamagic feats are still descriptive (they don't alter slot cost or DCs).
- Spell-like abilities, darkvision, energy resistances are **descriptive** (not computed). Skill/save/
  stat bonuses (racial, feat, trait, class-feature) **are** real effects.
- Racial **variant heritages** (Aasimar/Tiefling sub-bloodlines) not modeled — standard heritage only.
- **Fly/swim/climb** speeds are display-only; only **land speed** is reduced by armor/encumbrance, and
  that reduction doesn't handle non-proficiency or class-feature exceptions.
- Favored-class **racial** alternative bonuses (beyond +1 HP / +1 skill) not modeled.

## Phase roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Level-1 character creator | **done** |
| 2 | **Level-up** — multi-level engine + per-level decisions | **done** (Part A engine/UI + Part B content, 30/31 classes) |
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

**Part B — verified per-class progression content: done (30/31 classes).** Per-level `features`,
`bonusFeats`, and per-level subsystem `ClassChoiceDef.levels` are authored for all classes except
vampire-hunter, verified against each class's d20pfsrd table (mechanical facts from source, prose
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
  is 0 (hides the cantrip gap and 0-base levels). **Still deferred:** arcanist (9-level, unique per-day
  grid we couldn't verify from a clean source) and vampire-hunter (`table` unset → no slot numbers).
- **Fixed a latent bard/skald bug:** the six-level per-day table was indexed from 1st level while the
  engine assumes index 0 = cantrips, so bard slots displayed one level off and skipped the Cha bonus
  spell. The table is now cantrip-indexed (cantrips at-will, hidden in display).
- **Subsystem-list approximations** (kept honest but not exhaustive): slayer & investigator talents
  reuse the rogue-talent list; shaman hexes reuse the witch-hex list; every option list is a
  core-scope subset. **Oracle revelations are now interactive** — a source-dependent `oracle-revelation`
  choice filters options by the chosen mystery (`ORACLE_REVELATIONS` per mystery). **Sorcerer
  bloodline powers and cavalier order abilities now display per source** — `source-features.ts`
  holds the fixed per-level abilities; the engine injects the chosen source's into the advancement
  progression (`sourceFeatures` in resolve.ts). **Gunslinger deeds** are named per level. Still
  descriptive (specific ability names not authored yet): bloodrager bloodline powers.
- **vampire-hunter** keeps only its level-1 `features1` fallback — its table couldn't be verified
  cleanly (same policy as the deferred Vigilante/Omdura classes).
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
- **Domain / specialist-school bonus spell slot** — cleric-with-domains and non-universalist wizard get
  +1 slot per accessible level (approximated as +1 to the count; the restriction isn't enforced).
- **Spell save DC** (10 + spell level + casting mod) shown on the play sheet.
- **Multiple pools per class**: paladin now has lay-on-hands **and** smite-evil; monk has ki **and**
  stunning fist. Added druid **wild shape** uses (4th–19th). A **skills panel** (trained skills + totals)
  is on the play sheet.
- **Per-weapon attack lines & breakdown tooltips: done.** The play sheet shows an attack line per
  equipped/carried weapon (main hand, off hand, then purchased weapons) with the iterative sequence
  (`+9/+4`), Str-scaled damage (one-handed +Str, two-handed +1½×, off-hand +½×; ranged adds no Str),
  crit/damage-type/range, and a click/hover breakdown card. At-a-glance stats, HP, and skills got the
  same breakdown tooltips. Not folded (noted, not computed): Weapon Focus/Training, magic enhancement,
  Power Attack, two-weapon-fighting penalties, composite-bow Str, thrown-weapon Dex.
- **Still thin:** resource pools still omit oracle/sorcerer/witch/ranger/hunter/summoner/shaman/slayer/
  brawler (varied or at-will resources); the domain/school slot is a count approximation (restriction
  not enforced).
