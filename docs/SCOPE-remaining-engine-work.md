# Scope — the two remaining archetype-engine projects

> **Status update (2026-07-24): both projects are DONE. This document is now history.**
>
> **Project B** came in smaller than scoped — Blood Arcanist turned out to need no level remap at all
> (arcanist level *is* the sorcerer level), so B2 reduced to "let an archetype name which source tables
> it draws". Blood Arcanist and School Savant are both live.
>
> **Project A** was done in full rather than as "Companion Lite": A1–A6 all shipped, including the
> mechanical evolutions (A5) that the breakdown below called the long pole, and Synthesist (A6). Two
> things turned out differently in the doing. A5 was smaller than feared, because most evolutions reduce
> to a handful of shapes (an attack, an ability change, a movement mode, a named quality) — the ones that
> genuinely need a player choice are flagged `manual` and named on the card as *not folded in*, rather
> than approximated. And A2 did not become a second resolve pipeline: it is one file ending in a shared
> `assemble()`, reusing `combat.ts` rather than restating it, as hoped. Familiars, which the breakdown
> below never mentions, were added as a third kind and were the cheapest of the three — almost every
> number on a familiar is its master's.


Written 2026-07-24, after the batch-6 archetype work. Companion to
[PROJECT-STATUS.md](PROJECT-STATUS.md). This scopes what is actually left, corrects an earlier
mis-statement about it, and recommends an order.

## 0. Correction: the classes are not blocked; two archetypes are

An earlier note claimed summoner and arcanist "are genuinely blocked rather than merely unwritten."
**That was wrong.** Both can reach a third archetype today with zero engine work:

- **Arcanist → Brown-Fur Transmuter.** Replaces only the arcanist exploits gained at 3rd and 9th
  (verified on d20pfsrd). That is exactly the remove-and-re-add-the-`exploit`-line pattern the shipped
  **Eldritch Font** already uses. Other likely-cheap candidates on the same page: Spell Specialist,
  Collegiate Initiate, White Mage, Twilight Sage (unverified).
- **Summoner → Wild Caller.** *Alters* the eidolon (fey-type, restricted evolutions) and summon monster,
  and *replaces* aspect — which moves to 18th in place of greater aspect. All expressible as
  `replaces: ['summ-aspect', 'summ-greater-aspect']` plus three granted features.

What is genuinely blocked is a **specific pair of archetypes**, not the classes:

| Archetype | Class | Blocked on |
|---|---|---|
| **Synthesist** | Summoner | Companion creatures (Project A) |
| **Blood Arcanist**, **School Savant** | Arcanist | Source subsystem on a second class (Project B) |

So the cheap breadth work should be done first and independently of either project below.

---

## Project A — Companion creatures

### Why it is bigger than "Synthesist"

There is **no companion creature anywhere in the engine**. `Sheet` has no companion field; nothing in
`resolve.ts` computes one. Every companion in the game is currently a descriptive feature string:

- The eidolon is only two choice slots — `eidolon-form` (a list pick) and `evolutions` (an
  `eidolon-evolutions` point-buy with a pool sized by class level, `resolve.ts:2251`, plus over-budget
  validation). No HP, AC, saves, attacks, or skills.
- Animal companions, familiars, and mounts have no model at all — not even a point-buy.

So this is not "add eidolon fusion". It is **build companion creatures**, which happens to unblock
Synthesist. Scoped that way it pays for itself across the game rather than for one archetype.

### What it would serve

Druid, ranger, cavalier, hunter, paladin (mount), witch/wizard (familiar), summoner — plus three
archetypes shipped in the last few batches that grant companions and currently only describe them:
Beast Rider's exotic mount, Divine Commander's mount, Divine Hunter's otherworldly companion.

### Work breakdown

| Step | Work | Notes |
|---|---|---|
| A1 | `CompanionDef` content model + per-level companion progression table (HD, BAB, saves, natural armor, ability increases, tricks) | The animal-companion table is one verified table, same shape as the caster tables already in `progression.ts` |
| A2 | `resolveCompanion()` → a mini-`Sheet` (abilities, HP, AC, saves, attacks, skills) | **Real leverage here:** the natural-attack arc already shipped `naturalAttackDamageDie`, `naturalStrMultiplier`, `weaponDamageForSize`, `naturalAttackPenalty` in `combat.ts` |
| A3 | `Sheet.companions: CompanionBlock[]` | Additive; no existing consumer changes |
| A4 | UI: companion card in the builder + play sheet | New surface, not a modification |
| A5 | **Content: give evolutions mechanical effects** | Today `EvolutionDef` is `{ id, cost, desc, minLevel?, forms?, multi? }` — **no `effects`**. ~60 evolutions would need real effects. This is the bulk of the work |
| A6 | Synthesist on top | Fusion: eidolon physical stats replace the summoner's, summoner keeps mental stats, eidolon HP becomes a damage pool |

### Risk and size

**Largest arc since multiclass.** A5 is the long pole and is pure content grind with a verification
burden. A2 risks becoming a second parallel resolve pipeline if not kept deliberately small.

### Cheaper alternative — "Companion Lite"

Stat block for animal companions and the eidolon **base form** only; evolutions stay descriptive except
the handful that are plainly mechanical (ability increases, added natural attacks, natural armor). Gets
a genuinely useful companion card and an *honest approximation* of Synthesist, at maybe a third of the
cost. Recommended if companions are wanted mainly for play-sheet utility rather than exactness.

---

## Project B — Source subsystem on a second class

### The gap

`sourceFeatures` (`resolve.ts:345-355`) hardcodes the owning class per source:

```ts
if (dec.classId === 'sorcerer') add(C.SORCERER_BLOODLINE_POWERS, 'bloodline', 'sorc-bl');
```

The tables are keyed by source id and the injection mechanism is already generic (and, as of the
batch-6 fix, correctly gated on the effective class still offering the choice). Two things are missing:

1. A non-sorcerer class cannot carry a bloodline choice at all.
2. An archetype cannot *add* a source-backed choice, nor say that its powers arrive on a **different
   level schedule** than the parent class's. Blood Arcanist gains bloodline powers at shifted levels
   rather than the sorcerer's — the exact mapping needs verifying against d20pfsrd.

### Work breakdown

| Step | Work |
|---|---|
| B1 | Replace the `classId === X` chain with a small per-class source registry (`{ classId, choiceId, table, prefix }[]`) |
| B2 | Let `ArchetypeDef.choices.add` declare a source-backed choice, with an optional level remap for its power table |
| B3 | Content: Blood Arcanist and School Savant, each verified |

### Risk and size

**Low-to-moderate, one focused session.** Comparable to the spell-list-swap arc that shipped Unlettered
Arcanist (new `witch` list + `levelByList` + `CastingBlock.list`). The fiddly part is the level remap in
B2; everything else is a refactor of code that already works, guarded by the existing golden tests for
sorcerer/bloodrager/shaman/oracle/cavalier/wizard/shifter/witch sources.

---

## Recommendation

1. **Now, no engine work:** ship Brown-Fur Transmuter and Wild Caller. Every class then has ≥3.
2. **Next, small:** Project B. Bounded, low risk, unblocks two real archetypes and generalises a
   mechanism that is currently sorcerer-shaped by accident.
3. **Separately, on its own merits:** Project A — and justify it as *companions for the play sheet*,
   not as *Synthesist*. If the appetite is smaller, do Companion Lite.

Project A is the only item here that is genuinely large. Nothing about it is urgent for archetype
breadth, which is why it should not be bundled with Synthesist as if it were an archetype task.
