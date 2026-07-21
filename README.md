# Pathmaker

A Pathfinder 1st Edition character creator and interactive play sheet. Client-only web
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

Both the character creator and the interactive play sheet are built.

- **Builder** — roster, the full builder (Basics → Review, including per-level Advancement), level-up
  to 20 with multiclassing, and a screen/print sheet preview.
- **Play sheet** — HP and condition tracking, per-class spell slots with prepared/spontaneous casting
  (metamagic is computed, including the Empower/Maximize damage and Heighten DC payoff), resource
  pools, an initiative/round clock, and one-click attack/save/skill/damage rolls.
- **Content** — 40 races, 31 classes, 173 feats, ~400 spells (levels 0–9), plus domains, bloodlines,
  and each class's subsystem picks (rage powers, rogue talents, discoveries, revelations, hexes,
  eidolon evolutions, …). Verified against d20pfsrd.

### Race depth

Beyond ability modifiers, senses, and skill bonuses, the engine computes the mechanical parts of a
race rather than just describing them:

- **Natural attacks** — lizardfolk (bite + two claws), tengu, changeling, and kitsune get real attack
  lines with the correct Strength multiplier (1½× a creature's sole natural attack, 1× primary, ½×
  secondary), the −5 secondary penalty (−2 with Multiattack), size-stepped damage dice, and a
  **"+ weapon"** toggle that turns every natural attack secondary when you also swing a weapon.
- **Variant heritages** — the full Aasimar (6) and Tiefling (10) Advanced Race Guide heritage tables.
  Pick one in the Race step to swap the default ability spread, the 1/day spell-like ability, and the
  two skill bonuses (e.g. an Angel-Blooded aasimar becomes +2 Str/+2 Cha with an Alter Self SLA).
- **Movement modes** — a swim or climb speed grants its **+8 racial** bonus on that skill
  automatically, and medium/heavy armour or load slows every movement mode (fly, swim, climb), not
  just the land speed.

See the roadmap and design rationale in [docs/DESIGN.md](docs/DESIGN.md) and current state in
[docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md).
