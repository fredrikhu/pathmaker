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

**Phase 4 (time & campaign clock) is done** — see its section below. The remaining roadmap item is
**Phase 5** (live inventory: consumables, charges, encumbrance in play).

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
- **Metamagic / param feats** (Weapon Focus, Skill Focus) record the parameter but don't compute a
  weapon/skill-specific bonus into the sheet.
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
| 5 | Live inventory — consumables, charges, encumbrance in play | items are already entities |

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
