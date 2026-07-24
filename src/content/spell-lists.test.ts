import { describe, it, expect } from 'vitest';
import * as C from './index';
import { CRB_SPELL_LISTS } from './crb-spell-lists';
import type { SpellDef, SpellList } from './model';

// Every list membership and per-list level in the catalogue, checked against the four Core
// Rulebook class spell lists as published on d20pfsrd (only rows whose Source is PZO1110).
//
// CRB_SPELL_LISTS is a scrape of those four pages, one entry per spell. It is the same data
// the authoring batches are diffed against, kept in the repo so the whole catalogue is
// re-checked on every run rather than only the spells a batch happened to touch.
//
// This caught real errors when first written: spells tagged onto a list that does not carry
// them (Prayer and Nondetection as bard spells, Incendiary Cloud as a druid spell), spells on
// the right list at the wrong level (Flame Strike, Death Ward, Control Water, Major Creation,
// Magic Mouth, Legend Lore), and thirteen spells missing a list they belong to.

const CODE: Record<string, SpellList> = { a: 'arcane', d: 'divine', r: 'druid', b: 'bard' };
const CRB_LISTS = new Set<string>(['arcane', 'divine', 'druid', 'bard']);

/** Our ids put greater/lesser/mass first where the SRD suffixes them, we split the alignment
 *  omnibus spells into one entry per alignment, and a couple of ids are simply older. None of
 *  that is a data error, so it is mapped rather than reported. */
function srdIdFor(id: string): string {
  const variant = id.match(/^(greater|lesser|mass)-(.+)$/);
  if (variant) return `${variant[2]}-${variant[1]}`;
  const omnibus: [RegExp, string][] = [
    [/^protection-from-(evil|good|law|chaos)$/, 'protection-from-chaos-evil-good-law'],
    [/^magic-circle-against-(evil|good|law|chaos)$/, 'magic-circle-against-chaos-evil-good-law'],
    [/^dispel-(evil|good|law|chaos)$/, 'dispel-chaos-evil-good-law'],
    [/^detect-(evil|good|law|chaos)$/, 'detect-chaos-evil-good-law'],
  ];
  for (const [re, target] of omnibus) if (re.test(id)) return target;
  return ({ blindness: 'blindness-deafness', 'order-s-wrath': 'orders-wrath' } as Record<string, string>)[id] ?? id;
}

/** Spells we carry that are on none of the four base CRB lists this fixture covers. All three are
 *  paladin-only (the paladin and ranger lists are now authored and audited separately in
 *  content.test.ts), so they are absent from this fixture by construction rather than by mistake. */
const NOT_ON_A_CRB_LIST = new Set(['bless-weapon', 'holy-sword', 'heal-mount']);

function loadFixture(): Record<string, Partial<Record<SpellList, number>>> {
  const out: Record<string, Partial<Record<SpellList, number>>> = {};
  for (const entry of CRB_SPELL_LISTS.trim().split(';')) {
    if (!entry) continue;
    const [id, rest] = entry.split('=');
    out[id] = {};
    for (const token of rest.split(',')) out[id][CODE[token[0]]] = Number(token.slice(1));
  }
  return out;
}

describe('spell lists match the Core Rulebook class lists', () => {
  const srd = loadFixture();
  const refFor = (s: SpellDef) => srd[s.id] ?? srd[srdIdFor(s.id)];

  it('has a fixture covering the whole Core Rulebook', () => {
    // 610 distinct CRB spells across the four lists. A short read means a truncated scrape,
    // which would make every check below vacuous.
    expect(Object.keys(srd).length).toBe(610);
  });

  it('tags no spell onto a list that does not carry it', () => {
    const wrong: string[] = [];
    for (const s of C.SPELLS) {
      const ref = refFor(s);
      if (!ref) continue;
      for (const list of s.lists) {
        if (!CRB_LISTS.has(list)) continue;
        if (!(list in ref)) wrong.push(`${s.id} is tagged "${list}"`);
      }
    }
    expect(wrong, `not on the CRB list they claim:\n${wrong.join('\n')}`).toEqual([]);
  });

  it('places every spell at its published level on each list', () => {
    const wrong: string[] = [];
    for (const s of C.SPELLS) {
      const ref = refFor(s);
      if (!ref) continue;
      for (const list of s.lists) {
        if (!CRB_LISTS.has(list) || !(list in ref)) continue;
        const ours = C.spellLevelOn(s, list);
        if (ours !== ref[list]) wrong.push(`${s.id} on ${list}: ours ${ours}, CRB ${ref[list]}`);
      }
    }
    expect(wrong, `wrong level on a list:\n${wrong.join('\n')}`).toEqual([]);
  });

  it('omits no list a spell we carry actually belongs to', () => {
    const missing: string[] = [];
    for (const s of C.SPELLS) {
      const ref = refFor(s);
      if (!ref) continue;
      for (const list of Object.keys(ref) as SpellList[]) {
        if (!s.lists.includes(list)) missing.push(`${s.id} should also be on ${list} ${ref[list]}`);
      }
    }
    expect(missing, `missing a list:\n${missing.join('\n')}`).toEqual([]);
  });

  it('accounts for every spell that matches no CRB list entry', () => {
    const unmatched = C.SPELLS.filter((s) => !refFor(s)).map((s) => s.id);
    // Anything new here is either a splatbook spell or an id that has drifted from the
    // convention — both worth looking at rather than silently skipping the checks above.
    expect(new Set(unmatched)).toEqual(NOT_ON_A_CRB_LIST);
  });
});
