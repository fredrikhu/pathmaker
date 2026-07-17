# Pathmaker — UI Handover for Claude Design

**Read [DESIGN.md](DESIGN.md) first.** This document tells you what the UI must do, what it must never do, and the data contracts it consumes. Visual design, layout craft, and interaction polish are yours.

---

## 1. Product context

Pathmaker is a **Pathfinder 1e character creator** (phase 1) that will grow into an **interactive play sheet** (phase 2: level-up, spell/resource tracking, time, equipment, one-click roll totals). Web app, client-only, `localStorage` persistence, desktop-first but should degrade gracefully to tablet width. Audience: PF1e players — rules-literate, detail-hungry, and they *will* want to see the numbers explained.

Stack: TypeScript + Vite + React. You own `src/ui/`.

## 2. The one hard rule

**The UI performs zero rules math and zero rules legality logic.** The engine (`src/engine/`) is a pure function that hands you three view models; you render them and dispatch decisions back. If you find yourself writing `if (str >= 13)` or adding numbers together in a component, stop — that belongs in the engine, request it as a view-model field.

### Data contracts you consume

```ts
// Everything below comes from one call: resolve(content, character)
Sheet          // every displayed number, pre-computed, WITH breakdowns (see §5)
ChoiceSlot[]   // every open or filled decision: label, count, options[], selected,
               // each option: { entity, legal: boolean, whyNot?: string, wouldReplace?: string[] }
Issue[]        // { severity: 'error'|'warning'|'info', slot?, message }
```

### Actions you dispatch

```ts
setDecision(slotId, value)   // engine re-resolves, you get fresh view models
clearDecision(slotId)
addLevel(classId) / removeLastLevel()
purchase(itemId, qty) / sell(...) / equip(slot, itemId)
// plus roster ops: createCharacter, deleteCharacter (confirm!), duplicate, importJson, exportJson
```

Every dispatch autosaves. There is an undo stack — surface it (Ctrl+Z + a visible control).

## 3. Screens

1. **Roster** — landing page. Character cards (name, race/class/level summary, last edited), create / duplicate / delete / import / export.
2. **Builder** — the core screen, described below.
3. **Sheet preview** — read-only, print-friendly full character sheet. Reachable from the builder at any time; also the phase-2 play surface, so design it as its own route, not a modal.

## 4. Builder: guided but never locked

The build process has natural stages — **Basics** (name, alignment, deity, ability scores) → **Race** → **Class & features** → **Skills** → **Feats & traits** → **Spells** (casters only) → **Equipment** → **Review**. Present them as navigable steps for orientation, **but never lock a step**. Users jump back constantly ("what if I'm a dwarf instead?"), and the engine is built for that: changing an early decision never destroys later ones — it flags conflicts as Issues instead.

Consequences for you:

- Steps show a **status glyph**: complete / has open choices / has errors. Free navigation between all of them.
- A **persistent validation panel** (collapsible drawer or sidebar) lists all Issues; clicking one navigates to the offending slot. Errors ≠ modal interruptions. A character with errors is savable — the tone is "2 things to resolve," not a red wall.
- A **persistent live summary** (right rail on desktop): key numbers (HP, AC, saves, BAB, top skills) updating instantly with every decision. This is the delight moment of the app — pick a race, watch numbers move.
- Spells and some steps are conditional: render steps from what the engine says is open, don't hard-code "wizards have a spell step."

### Step-specific notes

- **Ability scores**: method chosen per character (point buy 10/15/20/25 pts, manual entry, standard array). For point buy: show pool remaining, per-score cost, and the score **after racial modifiers** side-by-side once race is picked. This screen is the most fiddly in every existing tool — spinners with cost feedback beat text inputs.
- **Race / class**: browsable gallery with a detail pane (full rules text is in `entity.description`). Alternate racial traits and archetypes must clearly show **what they replace** (`wouldReplace` is pre-computed, including conflicts with already-selected options — illegal options render disabled with `whyNot`).
- **Nested choices**: picking wizard opens arcane school → picking a school opens opposition schools. Render `ChoiceSlot`s recursively as they appear; the slot tree is data, not layout you hand-build per class.
- **Skills**: the grind screen. Table of all skills: rank +/− steppers, points-remaining meter, computed total per skill with class-skill and armor-check-penalty markers. Support "max this skill" affordance.
- **Feats**: big filterable list (by type tag, by legality, text search). Illegal feats stay **visible but disabled** with `whyNot` ("requires BAB +6 — you have +4") — players plan ahead; hiding illegal options is a known frustration in other tools.
- **Equipment**: shop-style browse with gold remaining, owned list, and equip slots (armor, main hand, off hand, worn items). Encumbrance meter (engine supplies load level). Equipping visibly changes AC/skills in the summary rail.
- **Review**: the full sheet plus remaining Issues, and export.

## 5. Every number is inspectable

Non-negotiable, and the app's signature feature: any computed number (AC, save, skill total, attack) can be clicked/hovered to show its **breakdown**, which the engine provides:

```
Stealth +9 = 3 ranks + 3 class skill + 4 Dex − 1 armor check penalty
AC 17 = 10 + 4 armor + 2 Dex + 1 dodge (Dodge feat)
```

Conditional bonuses that don't fold into the total (e.g., "+2 saves vs. enchantment") come as annotation strings — display them adjacent to the relevant stat, visually distinct from the total.

## 6. Tone & aesthetics

- Fantasy-flavored but restrained — parchment kitsch ages badly and hurts readability; think "premium rules reference," data-dense but calm. Dark mode is expected by this audience.
- Dense information is fine; PF1e players read stat blocks for fun. Prioritize scanability: tabular numbers, clear hierarchy, generous line-height in rules text.
- Rules text from content may contain long paragraphs and tables — give the detail pane real typographic care.
- Print stylesheet for the sheet preview is genuinely valued by this audience.

## 7. Out of scope for phase 1 (don't design dead ends)

No dice rolling, no HP damage tracking, no spell-slot checkboxes, no time clock — but the **Sheet preview** becomes that play surface in phase 2, so leave room (e.g., stat blocks that can later grow toggle chips for rage/haste, slots that can grow checkboxes). No accounts, no sync, no multi-user.

## 8. Definition of done (phase 1 UI)

- Create a legal level-1 core-rulebook character of every class start-to-finish without touching dev tools.
- Change race *after* completing feats and watch conflicts surface in the validation panel, then resolve them.
- Every number on the review sheet shows a correct breakdown on inspection.
- Reload mid-build: everything restored from localStorage. Export → delete → import round-trips.
- Keyboard: full build achievable without a mouse; steppers and lists are arrow-key friendly.
