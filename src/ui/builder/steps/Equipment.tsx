import type { CharCtl } from '../../Builder';
import { WEAPONS, ARMORS, GEAR, weaponById, armorById, anyItemById } from '../../../content/index';
import type { CharacterDoc } from '../../../engine/types';
import { TermSpan } from '../../Tooltip';
import { qualityCost, qualityPrefix, totalBonus, MAX_ENHANCEMENT, MAX_TOTAL_BONUS, type ItemQuality } from '../../../engine/items';
import { propertyPrice } from '../../../engine/resolve';
import { WEAPON_PROPERTIES, ARMOR_PROPERTIES, WONDROUS_ITEMS, BODY_SLOTS, armorById as armorLookup } from '../../../content/index';

/** Abilities offered for an item: weapon abilities on weapons, and the matching
 *  armour/shield list on armour — a shield can't take Shadow, and armour can't take Bashing. */
const propertiesFor = (id: string) => {
  const a = armorLookup.get(id);
  if (a) return ARMOR_PROPERTIES.filter((p) => p.slot === (a.slot === 'shield' ? 'shield' : 'armor'))
    .map((p) => ({ id: p.id, name: p.name, equivalent: p.equivalent, flatCost: p.flatCost, desc: p.desc, restriction: undefined as string | undefined }));
  return WEAPON_PROPERTIES.map((p) => ({ id: p.id, name: p.name, equivalent: p.equivalent, flatCost: undefined as number | undefined, desc: p.desc, restriction: p.restriction }));
};

export function EquipmentStep({ ch }: { ch: CharCtl }) {
  const { doc, resolution } = ch;
  const sheet = resolution.sheet;
  const purchases = doc.purchases;
  const equipped = doc.equipped;

  const buy = (id: string, cost: number) => {
    if (sheet.gold < cost) return;
    ch.patch((d) => ({ ...d, goldSpent: Math.round((d.goldSpent + cost) * 100) / 100, purchases: { ...d.purchases, [id]: (d.purchases[id] ?? 0) + 1 } }));
  };
  const sell = (id: string, cost: number) => {
    ch.patch((d) => {
      const q = (d.purchases[id] ?? 0) - 1;
      const purch = { ...d.purchases };
      if (q <= 0) delete purch[id]; else purch[id] = q;
      const eq: CharacterDoc['equipped'] = { ...d.equipped };
      if (q <= 0) { if (eq.armor === id) eq.armor = null; if (eq.mainHand === id) eq.mainHand = null; if (eq.offHand === id) eq.offHand = null; }
      return { ...d, goldSpent: Math.round((d.goldSpent - cost) * 100) / 100, purchases: purch, equipped: eq };
    });
  };
  const equip = (id: string) => {
    ch.patch((d) => {
      const w = weaponById.get(id); const a = armorById.get(id);
      const eq = { ...d.equipped };
      if (a?.slot === 'armor') eq.armor = id;
      else if (a?.slot === 'shield') eq.offHand = id;
      else if (w) eq.mainHand = id;
      return { ...d, equipped: eq };
    });
  };

  // ---- Masterwork / magic enhancement ----
  // Quality is a property of the owned item, so any weapon or armour can be upgraded. Its cost is
  // derived by the engine from this decision (no purchase transaction), so changing it refunds.
  const quality = (doc.decisions['item-quality'] as Record<string, ItemQuality>) ?? {};
  const qualityKind = (id: string): 'weapon' | 'armor' | null =>
    weaponById.has(id) ? 'weapon' : armorById.has(id) ? 'armor' : null;
  const setQuality = (id: string, q: ItemQuality | null) => {
    const next = { ...quality };
    if (!q) delete next[id]; else next[id] = q;
    ch.setDecision('item-quality', next);
  };

  /** — / masterwork / +1..+5, with the gp each option would cost. */
  const QualityPicker = ({ id, kind }: { id: string; kind: 'weapon' | 'armor' }) => {
    const cur = quality[id];
    const value = cur?.enhancement ? String(cur.enhancement) : cur?.masterwork ? 'mwk' : '';
    // What this item's quality already costs, so switching prices the difference honestly.
    const spent = qualityCost(kind, cur, propertyPrice);
    const keepProps = cur?.properties?.length ? { properties: cur.properties } : {};
    const options: { v: string; label: string; q: ItemQuality | null }[] = [
      { v: '', label: 'ordinary', q: null },
      { v: 'mwk', label: 'masterwork', q: { masterwork: true, ...keepProps } },
      ...Array.from({ length: MAX_ENHANCEMENT }, (_, i) => ({
        v: String(i + 1), label: `+${i + 1}`, q: { masterwork: true, enhancement: i + 1, ...keepProps } as ItemQuality,
      })),
    ];
    return (
      <select className="input" style={{ fontSize: 11.5, padding: '2px 5px' }} value={value}
        onChange={(e) => setQuality(id, options.find((o) => o.v === e.target.value)?.q ?? null)}>
        {options.map((o) => {
          const cost = qualityCost(kind, o.q ?? undefined, propertyPrice);
          const affordable = cost - spent <= sheet.gold;
          return (
            <option key={o.v} value={o.v} disabled={!affordable}>
              {o.label}{o.q ? ` · ${cost.toLocaleString()} gp` : ''}{!affordable ? ' — too costly' : ''}
            </option>
          );
        })}
      </select>
    );
  };

  /** Named special abilities, offered from the list matching the item (weapon / armour / shield).
   *  Only shown once the item is at least +1 — the rules require an enhancement bonus first. */
  const PropertyPicker = ({ id, kind }: { id: string; kind: 'weapon' | 'armor' }) => {
    const cur = quality[id];
    const chosen = cur?.properties ?? [];
    if ((cur?.enhancement ?? 0) < 1) return null;
    const toggle = (pid: string) => {
      const next = chosen.includes(pid) ? chosen.filter((x) => x !== pid) : [...chosen, pid];
      setQuality(id, { ...cur, properties: next.length ? next : undefined });
    };
    const total = totalBonus(cur, propertyPrice);
    return (
      <details style={{ width: '100%' }}>
        <summary style={{ cursor: 'pointer', fontSize: 11.5, color: 'var(--color-neutral-400)' }}>
          Special abilities {chosen.length ? `(${chosen.length}) · effective +${total}` : ''}
        </summary>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 4, marginTop: 6 }}>
          {propertiesFor(id).map((p) => {
            const on = chosen.includes(p.id);
            // Cost of adding this one, given what is already on the item.
            const delta = qualityCost(kind, { ...cur, properties: [...chosen, p.id] }, propertyPrice) - qualityCost(kind, cur, propertyPrice);
            const wouldExceed = !on && totalBonus({ ...cur, properties: [...chosen, p.id] }, propertyPrice) > MAX_TOTAL_BONUS;
            const affordable = on || (delta <= sheet.gold && !wouldExceed);
            // Flat-priced abilities show their gp; bonus-equivalent ones show the equivalent.
            const priceTag = p.equivalent ? `+${p.equivalent}` : `${(p.flatCost ?? 0).toLocaleString()} gp`;
            return (
              <button key={p.id} onClick={() => toggle(p.id)} disabled={!affordable}
                title={`${p.desc}${p.restriction ? ` (${p.restriction})` : ''}`}
                style={{ textAlign: 'left', padding: '4px 8px', borderRadius: 6, fontSize: 11.5, fontFamily: 'inherit',
                  cursor: affordable ? 'pointer' : 'not-allowed', opacity: affordable ? 1 : 0.45,
                  border: `1px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                  background: on ? 'rgba(145,132,217,.12)' : 'transparent', color: 'var(--color-text)' }}>
                {on ? '✓ ' : ''}{p.name} <span className="text-muted">{priceTag}</span>
                {!on && <span className="text-muted"> · {delta.toLocaleString()} gp</span>}
                {wouldExceed && <span style={{ color: 'var(--warn-fg)' }}> · over +{MAX_TOTAL_BONUS}</span>}
              </button>
            );
          })}
        </div>
      </details>
    );
  };

  // ---- Worn magic items ----
  // Declarative like item quality: the engine derives the cost, so removing one refunds it.
  const worn = (doc.decisions['worn-items'] as string[]) ?? [];
  const addWorn = (id: string) => ch.setDecision('worn-items', [...worn, id]);
  const removeWorn = (index: number) => ch.setDecision('worn-items', worn.filter((_, i) => i !== index));

  const owned = Object.entries(purchases).filter(([, q]) => q > 0);
  const loadPct = Math.min(100, Math.round((sheet.load.current / Math.max(1, sheet.load.heavy)) * 100));

  const groups: { label: string; items: { id: string; name: string; cost: number; note: string; weight: number }[] }[] = [
    { label: 'Weapons', items: WEAPONS.map((w) => ({ id: w.id, name: w.name, cost: w.cost, note: `${w.dmg} ${w.dmgType}, ${w.crit}`, weight: w.weight })) },
    { label: 'Armor & shields', items: ARMORS.map((a) => ({ id: a.id, name: a.name, cost: a.cost, note: `+${a.acBonus} AC, ACP ${a.acp}`, weight: a.weight })) },
    { label: 'Gear', items: GEAR.map((g) => ({ id: g.id, name: g.name, cost: g.cost, note: g.note ?? '', weight: g.weight })) },
  ];

  const slotLabel = (id: string | null) => (id ? anyItemById(id)?.name ?? '—' : '— empty —');

  return (
    <div style={{ maxWidth: 1080 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginBottom: 16, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 21, margin: 0 }}>Equipment</h3>
        <span style={{ fontSize: 13 }}>Gold <strong className="num" style={{ color: sheet.gold < 0 ? 'var(--err)' : 'var(--color-accent-300)' }}>{sheet.gold} gp</strong></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <TermSpan id="encumbrance"><span style={{ fontSize: 11.5, color: 'var(--color-neutral-400)' }}>Load</span></TermSpan>
          <div style={{ width: 130, height: 5, borderRadius: 3, background: 'var(--color-neutral-800)', overflow: 'hidden' }}>
            <div style={{ width: `${loadPct}%`, height: '100%', background: sheet.load.label === 'Overloaded' ? 'var(--err)' : 'var(--color-accent)' }} />
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--color-neutral-400)' }}>{sheet.load.current} lb — <strong style={{ color: 'var(--color-text)' }}>{sheet.load.label}</strong></span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {([['Armor', equipped.armor], ['Main hand', equipped.mainHand], ['Off hand', equipped.offHand]] as const).map(([k, v]) => (
          <div key={k} style={{ padding: '9px 14px', borderRadius: 8, background: 'var(--color-surface)', minWidth: 170, boxShadow: 'inset 0 0 0 1px var(--color-divider)' }}>
            <div className="micro">{k}</div>
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{slotLabel(v)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px,1fr) minmax(300px,380px)', gap: 34 }}>
        <div>
          <h6 style={{ margin: '0 0 10px', color: 'var(--color-neutral-500)' }}>Shop</h6>
          {groups.map((g) => (
            <div key={g.label} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 6 }}>{g.label}</div>
              {g.items.map((it) => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 4px', borderBottom: '1px solid rgba(233,233,237,.06)' }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{it.name} <span className="text-muted" style={{ fontSize: 11 }}>{it.note}</span></span>
                  <span className="num" style={{ fontSize: 12, color: 'var(--color-neutral-400)', width: 64, textAlign: 'right' }}>{it.cost} gp</span>
                  <span className="text-muted" style={{ fontSize: 11, width: 44, textAlign: 'right' }}>{it.weight} lb</span>
                  <button className="btn btn-ghost" style={{ fontSize: 11.5 }} disabled={sheet.gold < it.cost} onClick={() => buy(it.id, it.cost)}>{sheet.gold < it.cost ? 'Too costly' : 'Buy'}</button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div>
          <h6 style={{ margin: '0 0 10px', color: 'var(--color-neutral-500)' }}>Owned</h6>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {owned.length === 0 && <span className="text-muted" style={{ fontSize: 12.5 }}>Nothing purchased yet.</span>}
            {owned.map(([id, q]) => {
              const item = anyItemById(id)!;
              const isEquippable = !!weaponById.get(id) || !!armorById.get(id);
              const isEquipped = equipped.armor === id || equipped.mainHand === id || equipped.offHand === id;
              const cost = item.cost;
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface)', flexWrap: 'wrap' }}>
                  <span style={{ flex: 1, fontSize: 13, minWidth: 140 }}>
                    {qualityPrefix(quality[id])}{item.name} <span className="text-muted" style={{ fontSize: 11 }}>×{q}</span>
                  </span>
                  {qualityKind(id) && <QualityPicker id={id} kind={qualityKind(id)!} />}
                  {isEquippable && <button className="btn btn-ghost" style={{ fontSize: 11 }} disabled={isEquipped} onClick={() => equip(id)}>{isEquipped ? '✓ Equipped' : 'Equip'}</button>}
                  <button onClick={() => sell(id, cost)} style={{ background: 'transparent', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer', fontSize: 11.5, fontFamily: 'inherit' }}>Sell</button>
                  {qualityKind(id) && <PropertyPicker id={id} kind={qualityKind(id)!} />}
                </div>
              );
            })}
          </div>
          <p className="text-muted" style={{ fontSize: 11, marginTop: 12 }}>Selling refunds the full price — during creation it just undoes a purchase. Equipping armor or a shield changes AC and armor check penalty; watch the strip and the Skills step.</p>

          <h6 style={{ margin: '20px 0 8px', color: 'var(--color-neutral-500)' }}>Worn magic items</h6>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {sheet.worn.length === 0 && <span className="text-muted" style={{ fontSize: 12.5 }}>Nothing worn.</span>}
            {sheet.worn.map((w, i) => (
              <div key={`${w.id}-${i}`} title={w.desc} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 8, background: 'var(--color-surface)', opacity: w.active ? 1 : 0.55 }}>
                <span style={{ flex: 1, fontSize: 13 }}>
                  {w.name}
                  <span className="text-muted" style={{ fontSize: 11 }}> · {w.slot}</span>
                  {!w.active && <span style={{ fontSize: 11, color: 'var(--warn-fg)' }}> · slot full, no effect</span>}
                </span>
                <span className="num text-muted" style={{ fontSize: 11.5 }}>{w.cost.toLocaleString()} gp</span>
                <button onClick={() => removeWorn(i)} style={{ background: 'transparent', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer', fontSize: 11.5, fontFamily: 'inherit' }}>Remove</button>
              </div>
            ))}
          </div>
          <select className="input" style={{ fontSize: 12, padding: '4px 6px', width: '100%' }} value=""
            onChange={(e) => { if (e.target.value) addWorn(e.target.value); }}>
            <option value="">Add a worn item…</option>
            {BODY_SLOTS.filter((slot) => WONDROUS_ITEMS.some((w) => w.slot === slot)).map((slot) => (
              <optgroup key={slot} label={slot}>
                {WONDROUS_ITEMS.filter((w) => w.slot === slot).map((w) => (
                  <option key={w.id} value={w.id} disabled={w.cost > sheet.gold}>
                    {w.name} · {w.cost.toLocaleString()} gp{w.cost > sheet.gold ? ' — too costly' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
