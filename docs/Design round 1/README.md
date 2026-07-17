# Handoff: Pathmaker Builder UI (Phase 1)

## Overview
High-fidelity design for the **Builder** screen of Pathmaker, a Pathfinder 1e character creator. This answers the UI brief in `ORIGINAL-HANDOVER-UI.md` (read it — it defines the data contracts, the "UI does zero rules math" rule, and the definition of done). The design covers the builder shell plus all seven steps, the live stat strip with inspectable breakdowns, the docked validation panel, and a recursive tooltip system for teaching rules terms to new players.

## About the Design Files
The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, not production code to copy. The task is to **recreate these designs in the target codebase** (TypeScript + Vite + React, per the original handover, in `src/ui/`) using its established patterns, consuming the engine's `Sheet` / `ChoiceSlot[]` / `Issue[]` view models. All rules math baked into the prototype (point-buy costs, skill totals, AC breakdowns) exists only to make the mock feel real — in production every one of those numbers comes from the engine.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interaction patterns are final and should be recreated closely. The mock is seeded with a Human Fighter 1 ("Valeria Kessler"); steps are interactive but intentionally **not connected to each other** (e.g., editing ability scores does not move the stat strip — in production it must, via engine re-resolve).

## ⚠ Open design question for you: lock-in audit
The designer was asked whether **step order creates hidden lock-ins**, e.g.:
- Race is chosen after ability scores are set in Basics, but race changes final scores (floating +2 for human/half-elf/half-orc, fixed mods otherwise).
- Class can constrain alignment (paladin LG-only; a warpriest's alignment must match their deity's).
- Deity is chosen in Basics but validated against class picked later.

The original engine handover claims changing an early decision **never destroys later ones** — conflicts surface as `Issue`s instead. Please audit: does the engine actually model these cross-step dependencies as Issues (e.g., "Alignment CG conflicts with Paladin"), and does the `ChoiceSlot` model let the UI re-render racial modifiers when race changes after point buy? If any of these hard-lock or silently mutate state, flag it — the UI is designed on the assumption that **nothing locks and everything re-validates**.

## Screens / Views

### 1. Builder shell (`Pathmaker Builder.dc.html`)
The delivered design. Layout, top to bottom:

**Header bar** (padding 10px 20px, flex, gap 16px)
- Brand kicker "PATHMAKER": 10px uppercase, letter-spacing .14em, accent color `#9184d9`.
- Character name (Inter 500, 15px) + muted "· Human Fighter 1" (12px).
- **Step tabs**, inline: 13px, padding 7px 12px 9px; current step has a 2px accent underline (`box-shadow: inset 0 -2px 0 accent`). Each tab has a status glyph: `✓` complete (neutral-500), `●` open choices (accent), `!` error (`oklch(0.7 0.11 25)`), `○` not visited. Steps are rendered from engine state — a Fighter has no Spells step; a wizard build must grow one.
- Right: Undo button (secondary/outline style, tooltip "Ctrl+Z"), "Saved just now" autosave note (11px muted), "Sheet preview" primary button (accent outline, never filled).

**Stat strip** (full-width row under header, surface background `#232532`, 1px dividers)
- One cell per stat: HP 13 · AC 18 · Touch 12 · FF 16 · Fort +4 · Ref +2 · Will +1 · BAB +1 · Init +2.
- Cell: label 9.5px uppercase neutral-500, value 17px weight 600 tabular-nums. Hover tint `rgba(145,132,217,.08)`.
- **Hover a cell → breakdown popover peeks; click → pins.** Breakdown lines come from the engine (`Sheet` breakdowns), e.g. AC 18 = "10 base / +4 armor (chain shirt) / +2 shield (heavy wooden) / +2 Dex".
- Right-aligned hint copy: "hover a number for its breakdown · click to pin · dotted terms explain the rules".

**Body**: CSS grid `1fr 300px` — main step content + docked issues panel. Main column has `min-width:0; overflow-x:auto` so dense tables scroll at tablet width instead of colliding with the panel.

**Issues panel** (right, 300px, surface bg, border-left)
- Heading "TO RESOLVE — n". Issue cards: bg `#161826`, radius 8, 2px left inset strip colored by severity (error `oklch(0.7 0.11 25)`, warning `oklch(0.75 0.1 80)`, info neutral-500). Card shows "SEVERITY · Step" (10px uppercase, severity color) + message (12.5px).
- Clicking an issue navigates to its step. Empty state: "✓ Nothing to resolve — ready to adventure." Footer: "Errors never block saving — a character with errors is still yours."

**Step contents** (all inside the main column):

1. **Basics** — two columns (left 280px fields, right ability scores; wraps/stacks below ~1000px).
   - Fields: name text input; alignment as a 3×3 grid of buttons (LG…CE, selected = accent border + `rgba(145,132,217,.12)` fill); deity select.
   - Ability scores: method segmented control (Point buy 15/20/25, Standard array, Manual — selected option gets accent text + 1px inset accent ring); points pool bar (110×5px, accent fill) + "n of 20 points left"; table with columns Ability / Base (− value + steppers, 26px square buttons) / Cost / Racial / Score / Mod. The human +2 is a clickable accent tag that moves between rows (`set +2` ghost affordance on other rows). Point-buy cost table: 7:−4, 8:−2, 9:−1, 10:0, 11:1, 12:2, 13:3, 14:5, 15:7, 16:10, 17:13, 18:17; steppers refuse moves the pool can't afford. Standard array sets 15/14/13/12/10/8 and freezes steppers; Manual frees range 3–18 with no pool.

2. **Race** — 280px list + detail pane (stacks below ~790px). List cards: name + one-line stat summary, viewed card gets 1px accent inset ring, selected race shows "✓ selected" in accent-300. Detail: name, Select button, description paragraph (13.5px/1.65), "Racial traits" list (trait names are tooltip terms), "Alternate racial traits" cards each with a `replaces X` neutral tag and Take/✓ Taken ghost button. Illegal alternates render at 0.55 opacity, button disabled, with the engine's `whyNot` string in error color below.

3. **Class** — same gallery+detail pattern for 11 core classes. Detail adds a stat row (Hit die, BAB, good saves, skill points), "Level 1 features", and "Archetypes" cards with `replaces X` tags; taking an archetype strikes through the replaced feature in the features list; conflicting archetypes disabled with `whyNot`. The wizard's description notes the **nested choice pattern**: choosing wizard opens an arcane-school `ChoiceSlot`, which opens opposition-school slots — render slots recursively from data, never hard-code per class.

4. **Skills** — table: Skill (● class-skill marker in accent, ▲ ACP marker) / Ability / rank steppers (24px) / "Max" ghost button / clickable Total / note. Header shows "n of 2 ranks left" (error color while > 0). Totals are dotted-underlined buttons: hover/click → breakdown ("1 rank / +3 class skill / +3 Strength modifier / −4 armor check penalty"). Trained-only skills with 0 ranks show "—" and note "trained only".

5. **Feats** — three slot cards (Level 1 feat / Human bonus feat / Fighter bonus · combat only); empty slots get an accent-800 ring and muted "Empty"; filled slots show the feat with an ✕ clear. Below: search input, type filter chips (All/Combat/General, pill style), and an illegal-visibility toggle. Feat rows: name + type tag + "Requires …" muted + benefit line; selected = accent inset ring; **illegal feats stay visible** at 0.55 opacity with `whyNot` ("Requires Int 13 — you have 10") — never hidden by default. Selecting routes to the first fitting empty slot (combat feats prefer the fighter slot).

6. **Equipment** — header row: gold remaining (accent-300), encumbrance meter (130×5px bar + "51 lb — Light") with tooltip explaining thresholds. Equip-slot cards (Armor / Main hand / Off hand). Two columns: Shop (grouped Weapons / Armor & shields / Gear; rows with name, note, cost, weight, Buy — unaffordable items disabled as "Too costly") and Owned (qty, Equip / ✓ Equipped, Sell). Copy notes equipping changes AC and ACP.

7. **Review** — identity line + Export JSON / Print sheet buttons; ability score cards; three columns (Defense, Saves & offense, Feats & gear); trained-skill pill chips. **Every number is a dotted-underline button with the same peek/pin breakdown behavior.**

**Tooltip system** (the app's teaching layer — applies everywhere)
- Any dotted-underlined term (`border-bottom: 1px dotted neutral-600; cursor: help`) peeks a tooltip on hover (280ms grace on leave) and pins on click.
- Card: 330px, surface bg, radius 10, `--shadow-md`, 120ms fade/rise in. Contents: kicker (9.5px uppercase accent — "PF1e rules" / "Breakdown" / etc.), title (14px/500), body (12.5px/1.6 neutral-300) and/or breakdown lines (tabular-nums), then **related-term chips** (accent-700 outline pills) that drill into nested definitions with a "← back" breadcrumb. Esc or ✕ closes; "pinned" label when pinned; hint line "Click to pin · Esc or ✕ to close" while peeking.
- Positioning: fixed, below the anchor (8px gap), clamped to viewport, flips above when near the bottom.
- In production the term dictionary should come from content data, and breakdowns from `Sheet`.

### 2. Shell explorations (`Builder Shell Options.dc.html`)
Turn-1 canvas with three shell variations (1a right rail + bottom drawer, **1b stat strip + docked issues — chosen**, 1c left identity rail). Reference only.

## Interactions & Behavior
- Step navigation: free, never locked; status glyphs update live from validation state.
- Tooltips/breakdowns: hover to peek, click to pin, chip-drill with back stack, Esc closes. Only one tooltip at a time in the mock; consider allowing multiple pinned cards in production.
- All steppers clamp silently at legal bounds (no error flashes); disabled buy/select buttons use the system's 0.45-opacity disabled state.
- Issues panel: click navigates to the offending step (in production: scroll to and highlight the offending slot).
- Undo: visible control + Ctrl+Z (engine-side undo stack per original handover). Every dispatch autosaves ("Saved just now").
- Keyboard: full build must be achievable without a mouse; steppers and lists arrow-key friendly (prototype uses native buttons; production needs explicit focus order + arrow-key handling). Focus style: `outline: 2px solid #9184d9; offset 2px` — never the browser default.
- Responsive: two-column step layouts wrap to stacked below ~790–1000px; wide tables horizontally scroll within the main column; desktop-first, degrade gracefully to tablet.

## State Management (production)
- Single source of truth: engine `resolve(content, character)` → `Sheet`, `ChoiceSlot[]`, `Issue[]`. UI state is only: active step, tooltip/popover state, filter/search text, collapsed panels.
- Dispatches: `setDecision`, `clearDecision`, `purchase`/`sell`/`equip`, roster ops. Persistence: localStorage; restore mid-build on reload.
- Render steps and choice slots (including nested wizard-school → opposition-school chains) from engine data.

## Design Tokens (Nocturne design system — full sheet in `nocturne-styles.css`)
- Ground `--color-bg: #161826`; surface `#232532`; text `#e9e9ed`; divider = text @ 16% alpha.
- Accent `#9184d9` (used as line/outline/glow, **never** as a large fill); accent ramp 100–900 (`#f5f4ff` → `#2b2741`); neutral ramp 100–900 (`#f3f5fe` → `#292b31`).
- Severity colors (extensions, chosen in OKLCH to sit with the palette): error `oklch(0.7 0.11 25)`, warning `oklch(0.75 0.1 80)`, info = neutral-500.
- Type: Inter throughout; headings weight 500 max; body 15px/1.55; uppercase micro-labels 9.5–11px with .08–.14em tracking; **tabular-nums on all stat numbers**.
- Radii: 4/8/14px (`--radius-sm/md/lg`); pills 999px. Shadows: `--shadow-sm/md/lg` (hairline ring + ambient darkness). Spacing scale: 2.8/5.6/8.4/11.2/16.8/22.4px (0.7× density — this UI is dense on purpose).
- Buttons: primary = accent outline on transparent; secondary = divider outline; ghost = accent text. Hover = 7–12% tint; never solid accent fills.
- Icons: Phosphor (prototype uses text glyphs ✓ ● ! ○ ↩ ▲ — swap for Phosphor equivalents).

## Assets
None — no images. All marks are text glyphs; use Phosphor icons in production.

## Files
- `Pathmaker Builder.dc.html` — the full builder design (open in the design project for the live version; template markup + logic readable in-file).
- `Builder Shell Options.dc.html` — the three shell explorations (context for decisions).
- `nocturne-styles.css` — the design-system token sheet and component classes (`.btn`, `.seg`, `.card`, `.table`, `.tag`, `.input`, focus/selection states).
- `ORIGINAL-HANDOVER-UI.md` — the engine→UI brief this design answers; contracts and definition of done live here.

## Not yet designed (phase 1 gaps)
Roster (landing) screen; Sheet-preview route with print stylesheet; spell-step UI for casters (pattern: render from `ChoiceSlot`s like everything else); a real keyboard-navigation spec.
