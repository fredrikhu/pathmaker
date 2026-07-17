# Pathmaker

A Pathfinder 1st Edition character creator (and future interactive play sheet). Client-only web
app, TypeScript + Vite + React, persistence via `localStorage`.

## Running

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm test         # engine unit tests (Vitest)
npm run build    # typecheck + production build
```

## Architecture

Three strictly separated layers (see [docs/DESIGN.md](docs/DESIGN.md)):

- **`src/content/`** — declarative rules data (races, classes, feats, spells, equipment, traits,
  deities). Adding content is data-only; no engine changes.
- **`src/engine/`** — a pure `resolve(doc) → { sheet, slots, issues, steps }` function. No DOM.
  The character is stored as a **list of decisions**; everything on the sheet is derived. Typed-bonus
  stacking lives in one place (`stack.ts`) and every total flows through it. Fully unit-tested with
  hand-computed golden characters (`resolve.test.ts`).
- **`src/ui/`** — React. Performs **zero rules math** — it renders the three view models and
  dispatches decisions. Built to the Nocturne design system from the design handoffs.

Key behaviours: nothing locks (changing an early choice never destroys a later one — conflicts
surface as non-blocking Issues); a two-tier option model (**hard-illegal** disabled vs.
**would-invalidate** selectable-with-warning); orphaned decisions are suspended (no phantom bonuses)
until resolved; every number is inspectable for its breakdown.

## Status

Phase 1 (character creator) is functional: roster, the full builder (Basics, Race, Class, Skills,
Feats & traits, Spells, Equipment, Review), and a screen/print sheet preview. Content is core-rulebook
scope (7 races, 11 classes, ~20 feats, level 0–1 spells) — the schema supports the rest as pure data.

Phase 2 (interactive play sheet: level-up, spell/resource tracking, time, one-click roll totals) is
designed-for but not built; see the roadmap table in [docs/DESIGN.md](docs/DESIGN.md).
