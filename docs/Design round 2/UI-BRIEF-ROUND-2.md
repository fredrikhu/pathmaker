# Pathmaker — UI Brief, Round 2 (for Claude Design)

Follow-up to your delivered handoff (`design_handoff_pathmaker_builder`). Round 1 is **accepted**: the 1b shell (stat strip + docked issues), the Nocturne token sheet, the tooltip/teaching system, and the seven designed steps are final and going into implementation as-is. This brief covers (1) answers to the audit question in your README, (2) one new interaction state to design, and (3) the three screens you listed under "Not yet designed."

The data contracts and ground rules from `ORIGINAL-HANDOVER-UI.md` still apply: the UI consumes `Sheet` / `ChoiceSlot[]` / `Issue[]`, performs zero rules math, nothing locks, dark theme, desktop-first, keyboard-navigable. Deliver in the same format as round 1 (HTML mocks + README).

---

## 1. Answers to your lock-in audit (README §"Open design question")

You asked whether the engine really models cross-step dependencies as Issues, and whether the UI can re-render racial modifiers when race changes after point buy. Confirmed on both:

- **Racial modifiers flow through `Sheet`.** Ability rows (base / cost / racial / final / mod) are all engine-computed. The human/half-elf/half-orc floating +2 is a `ChoiceSlot` *owned by the race* but rendered inside the Basics step — it appears, disappears, or becomes a fixed static value as race changes. Two states the mock didn't show, which we will implement without further design: racial cells show "—" before any race is chosen; fixed-mod races (dwarf, elf…) render static values with no interaction.
- **Cross-step conflicts are `Issue`s, never locks.** "Alignment CG conflicts with Paladin" arrives as an error Issue pointing at both slots; the character stays editable and savable throughout.
- **One correction to a round-1 pattern** (the reason for §2 below): your mock disabled the *Focused Study* alternate racial trait because a later decision (the human bonus feat) occupied a slot. That direction is inverted — earlier choices are never blocked by later ones. The engine distinguishes two kinds of "can't/shouldn't":
  - **hard-illegal** — impossible combination (two archetypes replacing the same feature, prerequisite not met): render disabled + `whyNot`, exactly as you designed;
  - **would-invalidate** — legal, but selecting it orphans one or more existing decisions (Focused Study removes the bonus feat slot; changing race breaks a racial feat). These must stay **selectable**; on selection the orphaned decisions surface as Issues.

## 2. Design ask A — the "would-invalidate" option state

Design the third option state for choice cards and list rows (alternate racial traits, archetypes, race/class *re*-selection, feats):

- Data available per option: `legal: true`, plus `wouldInvalidate: [{ slotLabel, decisionName }]` (e.g. selecting Focused Study invalidates "Human bonus feat: Cleave").
- Needs: a resting treatment distinct from both normal and disabled (we suggest building on your warning color `oklch(0.75 0.1 80)` and the tag component, e.g. a `will orphan: Cleave` tag — but this is your call); a hover/pinned tooltip enumerating what breaks; and the post-selection moment — how the user is guided from "I clicked it" to the new Issues in the panel (flash the panel? toast? count bump?). No confirmation dialog — selection is instant and undoable; the Issues panel is the recovery path.
- Also apply the state to the **alignment grid** and **deity select** in Basics: when class/deity/alignment constrain each other, conflicting cells/options get this treatment (they remain clickable; a 3×3 grid cell is small, so the reason lives in the tooltip). Show one mock state where an existing conflict Issue is visible in the panel.

## 3. Design ask B — Spells step (the biggest new surface)

Appears only when the engine emits spell `ChoiceSlot`s (never hard-code "wizards get a spell step"). Phase-1 scope is **creation-time selection only** — no preparing, no casting, no slot tracking (phase 2).

Seed the mock with an **elf wizard (evocation school, opposition enchantment + necromancy)** — this exercises everything below and the nested school slots from your class step.

Requirements:
- **Two slot shapes.** Prepared-book casters (wizard): "all 0-level spells" (auto, display-only) + "3 + Int mod 1st-level spells" for the spellbook. Spontaneous casters (sorcerer, bard): spells-known picks per spell level. Both are `ChoiceSlot`s with `count`; render remaining-picks the way you render feat slots / point pools.
- **The list is big.** Hundreds of spells per class list even at core scope. Design for: filter by spell level and school, text search, and a compact row → detail pane pattern (your race/class gallery pattern likely transfers). Assume list virtualization; no pagination.
- Spell row minimum: name, school tag, level, one-line summary. Detail pane: full rules text (long — same typographic care as class descriptions), casting time, components, range, duration, save/SR.
- **Opposition schools**: spells from opposed schools are *selectable* but marked — they'll cost two slots to prepare in play. This is the would-invalidate visual language's cousin: a persistent cautionary tag ("opposed school — double slot"), not a disable.
- Show slots-per-day / spells-known readout from `Sheet` as context (display only).
- Tooltip dictionary gets new terms: spell level, school, components, opposition school, cantrip.

## 4. Design ask C — Roster (landing screen)

- Character cards: name, race/class/level line, portrait placeholder (portraits are a later feature — reserve the space), last-edited, and an "n issues" chip when the build has unresolved errors.
- Actions: create (primary), duplicate, delete (destructive — confirm; the only blocking dialog in the app), export JSON per character, import JSON (this is also the backup story — give it real prominence, not a buried menu item).
- Empty state for first launch — this is the app's first impression; a short "what is Pathmaker" moment plus create button.
- Storage note ("characters live in this browser — export to back up") somewhere honest but not naggy.

## 5. Design ask D — Sheet preview (own route, print-ready)

- Read-only full character sheet: identity, abilities, defense/saves/offense (including per-weapon attack lines), skills, feats/traits, gear, spells if any. Same peek/pin breakdowns on every number on screen.
- **Print stylesheet**: light background, ink-friendly, fits US Letter *and* A4 sensibly (we're in Sweden — A4 matters), no tooltips, no chrome. Design what print actually looks like, don't leave it to CSS defaults.
- **Phase-2 headroom, not phase-2 design**: this route later becomes the play surface (toggle chips for rage/haste, checkboxes for spell slots and uses, HP damage entry, time/rest). Don't design those — but choose layouts that have somewhere for them to go (e.g., stat blocks with room for a chip row; spell lines that can grow checkboxes).

## 6. Ours, not yours (so round 2 doesn't re-solve them)

We are implementing these directly from your existing patterns — no design needed, listed so the new mocks stay consistent with what production will do:

- Traits & drawbacks UI (reuses the feat step pattern: slot cards + filterable list; drawback adds a third trait slot).
- Languages picker; favored class + FCB control (goes in the Class detail pane).
- Feat slot routing (engine-driven; no silent overwrite when slots are full), multiple simultaneous alternate racial traits, severity levels always from the engine.
- Mock rules-data corrections: human fighter gets 3 skill ranks; the 15/14/13/12/10/8 "standard array" is D&D 5e and is replaced by dice-rolling (4d6 drop lowest) with assign-to-ability; sell during creation is a full-price undo, labeled as such.
- As in round 1: any rules numbers you bake into mocks are illustrative only; production values all come from the engine.

## 7. Definition of done (round 2)

- The elf-wizard seed can visibly: pick spells with filters, see opposition-school markers, and see remaining-picks count move.
- A mock state exists showing a would-invalidate option *before* selection (tagged), and *after* (Issue visible in panel, option selected).
- Alignment grid shown with at least one constrained cell (e.g. class = paladin).
- Roster shows: populated state, empty state, delete confirmation.
- Sheet preview shown twice: screen (dark, inspectable) and print (light, A4-proportioned).
- README in the same style as round 1: tokens for anything new, behavior notes, and open questions flagged back to us.
