import type { CharCtl } from '../../Builder';
import { WEAPONS, ARMORS, GEAR, weaponById, armorById, anyItemById } from '../../../content/index';
import type { CharacterDoc } from '../../../engine/types';
import { TermSpan } from '../../Tooltip';

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
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface)' }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{item.name} <span className="text-muted" style={{ fontSize: 11 }}>×{q}</span></span>
                  {isEquippable && <button className="btn btn-ghost" style={{ fontSize: 11 }} disabled={isEquipped} onClick={() => equip(id)}>{isEquipped ? '✓ Equipped' : 'Equip'}</button>}
                  <button onClick={() => sell(id, cost)} style={{ background: 'transparent', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer', fontSize: 11.5, fontFamily: 'inherit' }}>Sell</button>
                </div>
              );
            })}
          </div>
          <p className="text-muted" style={{ fontSize: 11, marginTop: 12 }}>Selling refunds the full price — during creation it just undoes a purchase. Equipping armor or a shield changes AC and armor check penalty; watch the strip and the Skills step.</p>
        </div>
      </div>
    </div>
  );
}
