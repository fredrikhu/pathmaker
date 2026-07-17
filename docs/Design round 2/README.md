# Handoff: Pathmaker UI — Round 2

Answers round 2 of the brief (`UI-BRIEF-ROUND-2.md`). Same ground rules as round 1: the HTML files are **design references**, not production code — recreate them in the TypeScript/React codebase consuming `Sheet` / `ChoiceSlot[]` / `Issue[]`; all rules numbers baked into the mocks are illustrative. Round-1 tokens, shell, and tooltip system are unchanged; this README covers only what's new.

## Files (all interactive mocks)

- `Pathmaker Builder v2.dc.html` — the round-1 builder plus ask A. **Seed changed to LN Human Paladin** so the would-invalidate states are visible on load.
- `Pathmaker Spells.dc.html` — ask B. Elf wizard (evocation; opposition enchantment + necromancy), Spells step live; other step tabs are stubs pointing at Builder v2.
- `Pathmaker Roster.dc.html` — ask C. Populated state; delete a card for the confirm dialog; delete all three for the empty state. Duplicate/create work.
- `Pathmaker Sheet.dc.html` — ask D. Screen/Print toggle in the header.

## A. The would-invalidate state

**Three option states**: normal · would-invalidate (warning voice, selectable) · hard-illegal (dimmed 0.55, disabled, red `whyNot` — unchanged from round 1).

Resting treatment (see *Focused Study* and *Dual Talent* on the human, Race step):
- A **warning tag** on the option row: `⚠ will orphan: Cleave` — 10px text, 3px 9px padding, radius 6, bg `color-mix(in srgb, oklch(0.75 0.1 80) 16%, transparent)`, text `oklch(0.82 0.09 80)`. The row itself stays at full opacity with its normal button.
- Hovering/clicking the tag opens the standard tooltip card, kicker "Would raise an Issue", listing each `{ slotLabel: decisionName }` line, plus one sentence: the decision isn't deleted, it becomes an Issue; selection is instant and undoable.

Post-selection moment (no dialog, no toast):
1. The option selects instantly; its ring uses the **warning color** instead of accent (selected-with-consequence).
2. The orphaned slot (Feats step) keeps the decision visible: card ring turns warning, label gains "· orphaned", and a one-line note "Slot removed by Focused Study — resolve in Issues".
3. A new error Issue slides into the panel with a 0.55s entrance that flashes a warning outline (`@keyframes issueIn`) — that animation is the guidance from click to panel. The step tab glyph flips to `!`.

Applied to **race re-selection**: viewing a different race while human decisions exist shows `⚠ will orphan n decisions` beside the Select button (same tag + tooltip enumerating them); selecting proceeds and emits one Issue per orphan. Applied to **class selection**: a class conflicting with current alignment shows `⚠ conflicts with alignment LN` beside its Select button.

**Alignment grid** (Basics, with class = paladin): conflicting cells get a 5px warning dot in the top-right corner (too small for a tag); the reason lives in the hover tooltip ("A paladin must be LG. You can still choose CG — the conflict appears as an Issue"). The selected-but-conflicting cell renders with warning border + warning tint instead of accent, and a warning caption sits under the grid. **Deity select**: conflicting options get a "· ⚠ conflicts" suffix in the option label; a warning caption appears under the field when the chosen deity conflicts. On load the mock shows the required state: LN paladin → error Issue "Alignment LN conflicts with Paladin (requires LG)" visible in the panel, pointing at both slots.

## B. Spells step

- Rendered only because the engine emitted spell slots (tab sits between Feats and Equipment; stub copy states a fighter never sees it).
- **Slot cards** (same pattern as feat slots): Cantrips — display-only "All 10 in spellbook · automatic"; 1st-level spellbook — "4 of 6 picked" with a mini progress bar, accent-800 ring while open; Slots per day — display-only readout labelled "from Sheet".
- **Filters**: text search + level chips + school chips (opposition schools carry ⚠ in their chip label). Production virtualizes the full list under the same filters — no pagination.
- **Rows**: level number (16px column, tabular) · name · school tag · one-line summary (ellipsized) · Add/✓ In book button. 0-level rows show muted "in spellbook" instead of a button. When picks run out, remaining Add buttons disable as "Picks full" (deselect still works).
- **Opposition marker**: warning tag `⚠ opposed — double slot` on the row, repeated in the detail pane with an explanatory warning paragraph, plus one info Issue per opposed pick ("Sleep is from an opposition school — it will cost two slots to prepare"). Never a disable. Cousin of the would-invalidate tag: same warning voice, persistent instead of pre-selection.
- **Detail pane** (360px, sticky): name, school+level tags, a 2-column stat grid (casting, components, range, duration, save/SR), then full rules text at 13px/1.7. Row click selects the pane (accent ring on the viewed row; accent-800 ring on picked rows).
- New tooltip dictionary terms shipped in the mock: school, opposition school, cantrip, components, spell level.

## C. Roster

- Header: brand + tagline, right-aligned **Import JSON** (secondary) beside **+ New character** (primary) — import is a first-class citizen, it's the backup story.
- Cards (auto-fill grid, min 320px): 56px portrait placeholder (initial letter on neutral-900; space reserved for real portraits), name (16px/500), alignment-race-class line, "Edited …" timestamp, and a status chip — red `n issues` (error tint) or `✓ ready` (accent-900/accent-300). Actions per card: Open (primary), Duplicate, Export (ghosts), Delete (plain text, hover shifts to error tint).
- **Delete confirm** — the app's only blocking dialog: `.dialog` component, destructive button in error color outline, "Export first" escape hatch on the left, cancel/secondary. Copy states deletion has no undo.
- **Empty state**: centered mark, "Every hero starts at level 1", two-sentence what-is-Pathmaker, create + import buttons, honest one-line storage note. Storage note also appears in the populated state as a muted line with a tooltip.

## D. Sheet preview

Own route with a Screen/Print segmented toggle (production: the print rendition IS the print stylesheet, not a separate page).

- **Screen**: dark, identity header, ability score cards, three columns (Defense / Offense / Feats & gear), skill pills — every number is a dotted-underline peek/pin breakdown, same machinery as the builder. Conditional bonuses render as italic annotation lines adjacent to their stat block, visually distinct from totals.
- **Print**: A4-proportioned white page (794×1123 CSS px; margins ≈15mm — fits Letter too), near-black ink `oklch(0.24 0.015 277)` on paper `oklch(0.985 0.004 90)`, no tooltips/chrome, abilities as a ruled strip, two-column stat tables with hairline rules `oklch(0.88 0.005 277)`, footer with export date and page count. Implement via `@media print`; test both A4 and Letter.
- **Phase-2 headroom** (not designed, just space): stat rows have full-width right-aligned values (room for chips/checkboxes to the left of the value); the defense block carries a note reserving space for damage tracking; spell lines (wizard sheets) follow the skills-pill pattern which can grow per-line checkboxes.

## New tokens
Only one addition to the round-1 sheet: the **warning surface pair** — bg `color-mix(in srgb, oklch(0.75 0.1 80) 16%, transparent)`, fg `oklch(0.82 0.09 80)` — used by every would-invalidate tag, the orphaned slot ring, and opposition markers. Print palette (sheet only): paper `oklch(0.985 0.004 90)`, ink `oklch(0.24 0.015 277)`, hairline `oklch(0.88 0.005 277)`.

## Open questions back to you
1. **Multiple pinned tooltips**: mocks allow one at a time. Worth supporting several pinned breakdown cards simultaneously (compare two stats)? UI is ready either way.
2. **Issue ordering**: mocks show engine order. Should the panel sort by severity, or by step order? Suggest severity, then step.
3. **Orphan resolution affordance**: the orphaned-decision Issue currently navigates to the owning step. Should it also offer a one-click "clear this decision" action inline in the panel?
4. **Roll 4d6**: implemented as roll-then-swap (click two scores to swap). If the engine's dice method returns an unassigned pool instead, the same chips become a drag/assign row — confirm the contract shape.
5. **Deity data**: the conflict suffix in the native select is a stopgap; if deity lists grow past ~20, we'd promote it to the same gallery+detail pattern as race/class.
