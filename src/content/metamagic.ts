// Metamagic feats, modelled as a slot-level adjustment applied at cast/preparation time. Each id
// matches the feat id in feats.ts. Level adjustments are the Core Rulebook values. Heighten is
// variable: it raises a spell to a chosen effective level (each +1 level = +1 slot level), so its
// flat `levelAdj` is 0 and the effective level is computed from the target instead.

export interface MetamagicDef {
  id: string;
  /** Short label for chips/labels, e.g. "Empower". */
  name: string;
  /** Flat increase to the spell's slot level (0 for Heighten). */
  levelAdj: number;
  /** True for Heighten — raises the effective level to a chosen target rather than a flat amount. */
  heighten?: boolean;
  desc: string;
}

export const METAMAGIC: MetamagicDef[] = [
  { id: 'empower-spell', name: 'Empower', levelAdj: 2, desc: 'Variable numeric effects increase by half.' },
  { id: 'enlarge-spell', name: 'Enlarge', levelAdj: 1, desc: "The spell's range is doubled." },
  { id: 'extend-spell', name: 'Extend', levelAdj: 1, desc: "The spell's duration is doubled." },
  { id: 'heighten-spell', name: 'Heighten', levelAdj: 0, heighten: true, desc: 'Cast at a higher effective level for a higher save DC (each +1 level costs a slot level).' },
  { id: 'maximize-spell', name: 'Maximize', levelAdj: 3, desc: 'Variable numeric effects are maximized.' },
  { id: 'quicken-spell', name: 'Quicken', levelAdj: 4, desc: 'Cast as a swift action.' },
  { id: 'silent-spell', name: 'Silent', levelAdj: 1, desc: 'Cast with no verbal component.' },
  { id: 'still-spell', name: 'Still', levelAdj: 1, desc: 'Cast with no somatic component.' },
  { id: 'widen-spell', name: 'Widen', levelAdj: 3, desc: "The spell's area is doubled." },
];

export const metamagicById = new Map(METAMAGIC.map((m) => [m.id, m]));

/** The slot level a spell of `baseLevel` occupies after applying the given metamagic feats. All
 *  adjustments are cumulative: Heighten raises the spell's own level by `heightenTo - baseLevel`,
 *  and the flat feats (Empower +2, Maximize +3, …) stack on top of that — so Heighten-to-5 on a
 *  3rd-level spell plus Maximize is a 3 + 2 + 3 = 8th-level slot. Unknown ids are ignored. */
export function effectiveSpellLevel(baseLevel: number, metaIds: readonly string[], heightenTo?: number): number {
  let level = baseLevel;
  let heightened = false;
  for (const id of metaIds) {
    const m = metamagicById.get(id);
    if (!m) continue;
    if (m.heighten) heightened = true;
    else level += m.levelAdj;
  }
  if (heightened && heightenTo != null && heightenTo > baseLevel) level += heightenTo - baseLevel;
  return level;
}

/** The spell level that determines the save DC after metamagic. Only Heighten raises it: every
 *  other metamagic increases the *slot* the spell occupies without making it count as a higher-level
 *  spell for any other purpose, so Empower/Maximize/Quicken/etc. leave the save DC untouched. */
export function dcSpellLevel(baseLevel: number, metaIds: readonly string[], heightenTo?: number): number {
  const heightened = metaIds.some((id) => metamagicById.get(id)?.heighten);
  if (heightened && heightenTo != null && heightenTo > baseLevel) return heightenTo;
  return baseLevel;
}
