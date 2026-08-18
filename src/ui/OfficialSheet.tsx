/**
 * The two-page character sheet, laid out like the official Pathfinder RPG sheet.
 *
 * Structure only: the black notched banners, the "total = named addends" formula rows, the
 * skills column, the page-2 split of gear / feats / spells. None of Paizo's artwork is
 * reproduced — the masthead carries this app's own wordmark.
 *
 * The difference from a blank form is that every addend box is *filled*. A player copying
 * this to the table gets not just "AC 17" but "10 + 5 armor + 1 shield + 1 Dex", which is the
 * thing they need when a buff lands mid-fight. Boxes that only make sense at the table —
 * current HP, nonlethal damage, temp modifiers, XP, ammunition — are deliberately left blank.
 */
import type { CharacterDoc, Sheet, Stat, BreakdownLine, Ability } from '../engine/types';
import { ABILITIES, abilityMod, fmtMod } from '../engine/types';
import { resolve } from '../engine/resolve';
import { SKILLS, raceById, deityById, featById, spellById, armorById } from '../content/index';
import '../styles/sheet.css';

// ---------------------------------------------------------------------------
// Breakdown bucketing — sorting a stat's lines into the sheet's named columns.
// ---------------------------------------------------------------------------

/** The AC formula row: 10 + armor + shield + Dex + size + natural + deflection + misc. */
function bucketAc(stat: Stat) {
  const b = { armor: 0, shield: 0, dex: 0, size: 0, natural: 0, deflect: 0, misc: 0 };
  for (const l of stat.lines) {
    if (l.type === 'base' && l.label === 'Base') continue; // the literal 10, printed as such
    switch (l.type) {
      case 'armor': b.armor += l.value; break;
      case 'shield': b.shield += l.value; break;
      case 'natural-armor': b.natural += l.value; break;
      case 'deflection': b.deflect += l.value; break;
      case 'size': b.size += l.value; break;
      default:
        if (l.label.startsWith('Dex modifier')) b.dex += l.value;
        else b.misc += l.value;
    }
  }
  return b;
}

/** The save row: total = base + ability + magic + misc (+ a temp box left blank). */
function bucketSave(stat: Stat) {
  const b = { base: 0, ability: 0, magic: 0, misc: 0 };
  for (const l of stat.lines) {
    if (/ base \((good|poor)\)$/.test(l.label) || l.label === 'Class base') b.base += l.value;
    else if (/^(CON|DEX|WIS) modifier$/.test(l.label)) b.ability += l.value;
    else if (l.type === 'resistance' || l.type === 'enhancement') b.magic += l.value;
    else b.misc += l.value;
  }
  return b;
}

/** The skill row: total = ability mod + ranks + misc. The +3 class-skill bonus is misc, as on
 *  the printed sheet — it is not part of the ranks the player spent. */
function bucketSkill(lines: BreakdownLine[]) {
  const b = { ability: 0, ranks: 0, misc: 0 };
  for (const l of lines) {
    if (/^\d+ ranks?$/.test(l.label)) b.ranks += l.value;
    else if (/^[A-Z]{3} modifier$/.test(l.label)) b.ability += l.value;
    else b.misc += l.value;
  }
  return b;
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

/** A value box with its caption underneath, as every addend on the sheet is drawn. A zero
 *  prints blank: the official sheet leaves unused addends empty, and a printed 0 reads as a
 *  number someone entered rather than one that does not apply. */
function Cell({ v, cap, w, mod, big, blank }: {
  v?: number | string; cap: string; w?: number | string; mod?: boolean; big?: boolean; blank?: boolean;
}) {
  const empty = blank || v === undefined || v === '' || v === 0;
  const text = empty ? '' : typeof v === 'number' ? (mod ? fmtMod(v) : String(v)) : v;
  return (
    <div className="pf-cell" style={{ width: w, flex: w === undefined ? 1 : undefined }}>
      <div className={`pf-box${big ? ' pf-box--lg' : ''}`}>{text}</div>
      <div className="pf-cap">{cap}</div>
    </div>
  );
}

function Op({ children, style }: { children: string; style?: React.CSSProperties }) {
  return <div className="pf-op" style={style}>{children}</div>;
}

function Banner({ children, arrow, style }: { children: React.ReactNode; arrow?: boolean; style?: React.CSSProperties }) {
  return <div className={`pf-banner${arrow ? ' pf-banner--arrow' : ''}`} style={style}>{children}</div>;
}

/** A masthead field: caption over a rule, with the value written on the rule. Sized by flex
 *  ratio rather than percentage — percentages plus the row gap always overrun the row. */
function Field({ cap, v, flex = 1 }: { cap: string; v?: string; flex?: number }) {
  return (
    <div style={{ flex, minWidth: 0 }}>
      <div className="pf-field"><span>{v ?? ''}</span></div>
      <div className="pf-cap pf-cap--l">{cap}</div>
    </div>
  );
}

/** Ruled write-in lines, pre-filled from the top with whatever we know. `rows` is the blank-form
 *  minimum, not a cap — a character with more feats than the form has lines gets more lines and
 *  the page grows onto another sheet. Silently dropping them would be worse than a third page. */
function Ruled({ items, rows }: { items: string[]; rows: number }) {
  return (
    <div className="pf-rules">
      {Array.from({ length: Math.max(rows, items.length) }, (_, i) => (
        <div key={i} title={items[i]}>{items[i] ?? ''}</div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function OfficialSheet({ doc, onExit }: { doc: CharacterDoc; onExit: () => void }) {
  const sheet = resolve(doc).sheet;
  // The backdrop is a fixed grey in both themes: the light theme's parchment surface sits too
  // close to the page's white for the sheet to read as paper resting on something.
  return (
    <div className="pf-sheet" style={{ background: '#4a4744', minHeight: '100vh', padding: 20 }}>
      <div className="no-print" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
        <button className="btn btn-secondary" onClick={onExit}>← Back to screen view</button>
        <button className="btn btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>
      <PageOne doc={doc} sheet={sheet} />
      <PageTwo doc={doc} sheet={sheet} />
    </div>
  );
}

// =========================================================================== page 1

function PageOne({ doc, sheet }: { doc: CharacterDoc; sheet: Sheet }) {
  const dec = doc.decisions;
  const race = raceById.get((dec['race'] as string) ?? '');
  const deity = deityById.get((dec['deity'] as string) ?? '');
  const alignment = (dec['alignment'] as string) ?? '';
  const classLine = sheet.summaryLine
    .replace(alignment, '').replace(race?.name ?? '', '').trim();

  const st = (id: string) => sheet.stats[id];
  const ac = bucketAc(st('ac'));
  const touch = st('ac:touch').total;
  const ff = st('ac:ff').total;
  const bab = st('bab').total;
  const initLines = st('init').lines;
  const initDex = initLines.find((l) => l.label === 'Dex modifier')?.value ?? 0;
  const initMisc = st('init').total - initDex;
  const strMod = abilityMod(st('ability:str').total);
  const dexMod = abilityMod(st('ability:dex').total);
  const cmbSize = st('cmb').lines.find((l) => l.type === 'size')?.value ?? 0;

  const ranks = (dec['skill-ranks'] as Record<string, number>) ?? {};
  const classSkills = new Set(sheet.classSkillIds);
  const speedBase = sheet.speed.reducedFrom ?? sheet.speed.base;

  const languages = [
    ...(race?.languagesAuto ?? []),
    ...((dec['languages'] as string[]) ?? []),
  ].map((l) => l.charAt(0).toUpperCase() + l.slice(1));

  const conditionals = Object.values(sheet.stats)
    .flatMap((s) => s.annotations.map((a) => `${s.label}: ${a}`));

  return (
    <div className="pf-page">
      {/* ---- Masthead ---- */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 165, flexShrink: 0 }}>
          <div style={{ fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700, fontSize: 23.5, letterSpacing: '0.005em', lineHeight: 1, whiteSpace: 'nowrap' }}>
            PATHMAKER
          </div>
          <div style={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: 10.5, letterSpacing: '0.09em', textAlign: 'center', marginTop: 4, whiteSpace: 'nowrap' }}>
            CHARACTER SHEET
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Field cap="Character Name" v={doc.name} flex={3.2} />
            <Field cap="Alignment" v={alignment} flex={1.3} />
            <Field cap="Player" flex={1.8} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Field cap="Character Level" v={classLine} flex={3.2} />
            <Field cap="Deity" v={deity?.name} flex={1.6} />
            <Field cap="Homeland" flex={1.5} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Field cap="Race" v={race?.name} flex={2.4} />
            <Field cap="Size" v={race ? race.size.charAt(0).toUpperCase() + race.size.slice(1) : ''} flex={1.1} />
            <Field cap="Gender" flex={1.1} />
            <Field cap="Age" flex={0.8} />
            <Field cap="Height" flex={1} />
            <Field cap="Weight" flex={1} />
            <Field cap="Hair" flex={1} />
            <Field cap="Eyes" flex={1} />
          </div>
        </div>
      </div>

      {/* ---- Two columns ---- */}
      <div style={{ display: 'flex', gap: 8, marginTop: 7, alignItems: 'flex-start' }}>
        {/* ============ LEFT ============ */}
        <div style={{ width: 368, flexShrink: 0, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
            {/* Abilities */}
            <div style={{ width: 186, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 2, alignItems: 'flex-end' }}>
                <div style={{ width: 48, fontSize: 4.7 }} className="pf-cap">Ability Name</div>
                {['Ability Score', 'Ability Modifier', 'Temp Adjustment', 'Temp Modifier'].map((c) => (
                  <div key={c} style={{ flex: 1, fontSize: 4.7, letterSpacing: 0 }} className="pf-cap">{c}</div>
                ))}
              </div>
              {ABILITIES.map((ab: Ability) => {
                const score = st(`ability:${ab}`).total;
                return (
                  <div key={ab} style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
                    <div className="pf-chip" style={{ width: 48, fontSize: 10.5 }}>
                      {ab.toUpperCase()}
                      <small>{ABILITY_LONG[ab]}</small>
                    </div>
                    <div className="pf-box" style={{ flex: 1 }}>{score}</div>
                    <div className="pf-box" style={{ flex: 1 }}>{fmtMod(abilityMod(score))}</div>
                    <div className="pf-box" style={{ flex: 1 }} />
                    <div className="pf-box" style={{ flex: 1 }} />
                  </div>
                );
              })}
            </div>

            {/* HP + initiative */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 3, alignItems: 'stretch' }}>
                <div className="pf-chip" style={{ width: 52, fontSize: 12.5, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  HP<small>Hit Points</small>
                </div>
                <div className="pf-cell" style={{ flex: 1 }}>
                  <div className="pf-box pf-box--lg">{st('hp:max').total}</div>
                  <div className="pf-cap pf-cap--l">Total</div>
                </div>
                <div className="pf-cell" style={{ width: 52 }}>
                  <div className="pf-box pf-box--lg">{sheet.defenses.dr.length ? sheet.defenses.dr.map((d) => `${d.amount}/${d.bypass}`).join(' ') : ''}</div>
                  <div className="pf-cap pf-cap--l">DR</div>
                </div>
              </div>
              <div style={{ border: '0.75px solid #000', height: 62, marginTop: 4, padding: '1px 2px' }}>
                <div className="pf-cap pf-cap--l">Wounds / Current HP</div>
              </div>
              <div style={{ border: '0.75px solid #000', height: 30, marginTop: 4, padding: '1px 2px' }}>
                <div className="pf-cap pf-cap--l">Nonlethal Damage</div>
              </div>
              <div style={{ display: 'flex', gap: 3, marginTop: 4, alignItems: 'flex-start' }}>
                <div className="pf-chip" style={{ width: 70, fontSize: 9.5, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  INITIATIVE<small>Modifier</small>
                </div>
                <Cell v={st('init').total} cap="Total" mod big />
                <Op>=</Op>
                <Cell v={initDex} cap="Dex Modifier" mod />
                <Op>+</Op>
                <Cell v={initMisc} cap="Misc Modifier" mod />
              </div>
            </div>
          </div>

          {/* AC formula row */}
          <div style={{ display: 'flex', gap: 1, marginTop: 6, alignItems: 'flex-start' }}>
            <div className="pf-chip" style={{ width: 42, fontSize: 12, alignSelf: 'flex-start', paddingTop: 3, paddingBottom: 3 }}>
              AC<small>Armor Class</small>
            </div>
            <Cell v={st('ac').total} cap="Total" w={30} big />
            <Op style={{ fontSize: 8.5 }}>= 10 +</Op>
            <Cell v={ac.armor} cap="Armor Bonus" mod />
            <Op style={{ fontSize: 8.5 }}>+</Op>
            <Cell v={ac.shield} cap="Shield Bonus" mod />
            <Op style={{ fontSize: 8.5 }}>+</Op>
            <Cell v={ac.dex} cap="Dex Modifier" mod />
            <Op style={{ fontSize: 8.5 }}>+</Op>
            <Cell v={ac.size} cap="Size Modifier" mod />
            <Op style={{ fontSize: 8.5 }}>+</Op>
            <Cell v={ac.natural} cap="Natural Armor" mod />
            <Op style={{ fontSize: 8.5 }}>+</Op>
            <Cell v={ac.deflect} cap="Deflection Modifier" mod />
            <Op style={{ fontSize: 8.5 }}>+</Op>
            <Cell v={ac.misc} cap="Misc Modifier" mod />
          </div>

          {/* Touch / flat-footed + modifiers */}
          <div style={{ display: 'flex', gap: 3, marginTop: 4, alignItems: 'flex-start' }}>
            <div className="pf-chip" style={{ width: 50, fontSize: 10 }}>TOUCH<small>Armor Class</small></div>
            <div className="pf-box pf-box--lg" style={{ width: 34 }}>{touch}</div>
            <div className="pf-chip" style={{ width: 84, fontSize: 10 }}>FLAT-FOOTED<small>Armor Class</small></div>
            <div className="pf-box pf-box--lg" style={{ width: 34 }}>{ff}</div>
            <div className="pf-cell" style={{ flex: 1 }}>
              <div style={{ border: '0.75px solid #000', minHeight: 24, fontSize: 7.5, padding: '1px 2px', lineHeight: 1.25 }}>
                {sheet.stats['ac'].annotations.join('; ')}
              </div>
              <div className="pf-cap">Modifiers</div>
            </div>
          </div>

          {/* Saves. The Modifiers box is one box beside all three rows — drawn as three stitched
              fragments it showed a seam wherever a row gap fell. */}
          <div style={{ display: 'flex', gap: 3, marginTop: 6, alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <div className="pf-cap pf-cap--l" style={{ width: 92 }}>Saving Throws</div>
                {SAVE_COLUMNS.map((cap, n) => (
                  <div key={cap} style={{ display: 'flex' }}>
                    {n > 0 && <div style={{ width: 7 }} />}
                    <div className="pf-cap" style={{ width: 30, fontSize: 4.7, letterSpacing: 0 }}>{cap}</div>
                  </div>
                ))}
              </div>
              {SAVES.map(([id, name, sub]) => {
                const s = st(`save:${id}`);
                const b = bucketSave(s);
                return (
                  <div key={id} style={{ display: 'flex', gap: 1, marginTop: 2, alignItems: 'stretch' }}>
                    {/* The governing ability sits on its own line under the save's name, as on the
                        printed sheet — inline it does not fit the banner at any legible size. */}
                    <Banner style={{ width: 92, fontSize: 9.5, display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.05 }}>
                      {name}<span style={{ fontSize: 5, fontWeight: 400 }}>({sub})</span>
                    </Banner>
                    <div className="pf-box" style={{ width: 30 }}>{fmtMod(s.total)}</div>
                    <Op>=</Op>
                    <div className="pf-box" style={{ width: 30 }}>{fmtMod(b.base)}</div>
                    <Op>+</Op>
                    <div className="pf-box" style={{ width: 30 }}>{fmtMod(b.ability)}</div>
                    <Op>+</Op>
                    <div className="pf-box" style={{ width: 30 }}>{b.magic ? fmtMod(b.magic) : ''}</div>
                    <Op>+</Op>
                    <div className="pf-box" style={{ width: 30 }}>{b.misc ? fmtMod(b.misc) : ''}</div>
                    <Op>+</Op>
                    <div className="pf-box" style={{ width: 30 }} />
                  </div>
                );
              })}
            </div>
            <div style={{ width: 38, display: 'flex', flexDirection: 'column' }}>
              <div className="pf-cap" style={{ height: 13, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Modifiers</div>
              <div style={{ flex: 1, marginTop: 2, border: '0.75px solid #000', fontSize: 6.5, padding: '1px 2px', lineHeight: 1.2 }}>
                {SAVE_NOTE_LINES(sheet).join('; ')}
              </div>
            </div>
          </div>

          {/* BAB / SR */}
          <div style={{ display: 'flex', gap: 3, marginTop: 6, alignItems: 'stretch' }}>
            <Banner arrow style={{ width: 138, fontSize: 10, height: 24, display: 'flex', alignItems: 'center' }}>Base Attack Bonus</Banner>
            <div className="pf-box pf-box--lg" style={{ width: 48 }}>{fmtMod(bab)}</div>
            <Banner arrow style={{ flex: 1, fontSize: 8.5, height: 24, display: 'flex', alignItems: 'center' }}>Spell Resistance</Banner>
            <div className="pf-box pf-box--lg" style={{ width: 42 }} />
          </div>

          {/* CMB / CMD */}
          <div style={{ display: 'flex', gap: 2, marginTop: 4, alignItems: 'flex-start' }}>
            <Banner arrow style={{ width: 90, fontSize: 11.5, height: 24, display: 'flex', alignItems: 'center' }}>CMB</Banner>
            <Cell v={st('cmb').total} cap="Total" w={34} mod big />
            <Op>=</Op>
            <Cell v={bab} cap="Base Attack Bonus" mod />
            <Op>+</Op>
            <Cell v={strMod} cap="Strength Modifier" mod />
            <Op>+</Op>
            <Cell v={cmbSize} cap="Size Modifier" mod />
            <div className="pf-cell" style={{ flex: 1.4 }}>
              <div style={{ border: '0.75px solid #000', minHeight: 24, fontSize: 7.5, padding: '1px 2px' }}>
                {sheet.stats['cmb'].annotations.join('; ')}
              </div>
              <div className="pf-cap">Modifiers</div>
            </div>
          </div>
          {/* Same banner geometry as CMB: an `alignSelf: stretch` banner grew to whatever caption
              happened to wrap in the row, which is what left the two rows different heights. The
              trailing "+ 10" is an operator on the row, as printed, not a cell of its own. */}
          <div style={{ display: 'flex', gap: 2, marginTop: 4, alignItems: 'flex-start' }}>
            <Banner arrow style={{ width: 90, fontSize: 11.5, height: 24, display: 'flex', alignItems: 'center' }}>CMD</Banner>
            <Cell v={st('cmd').total} cap="Total" w={34} big />
            <Op>=</Op>
            <Cell v={bab} cap="Base Attack Bonus" mod />
            <Op>+</Op>
            <Cell v={strMod} cap="Strength Modifier" mod />
            <Op>+</Op>
            <Cell v={dexMod} cap="Dexterity Modifier" mod />
            <Op>+</Op>
            <Cell v={cmbSize} cap="Size Modifier" mod />
            <div className="pf-op" style={{ height: 24, display: 'flex', alignItems: 'center', paddingLeft: 3 }}>+ 10</div>
            <div style={{ flex: 0.6 }} />
          </div>

          {/* Weapons */}
          {Array.from({ length: 5 }, (_, i) => {
            const a = sheet.attacks[i];
            return (
              <div key={i} style={{ marginTop: 9 }}>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <Banner arrow style={{ flex: 1, fontSize: 10.5, display: 'flex', alignItems: 'center' }}>Weapon</Banner>
                  <div className="pf-cap" style={{ width: 70, alignSelf: 'stretch', background: '#000', color: '#fff', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 1 }}>Attack Bonus</div>
                  <div className="pf-cap" style={{ width: 46, alignSelf: 'stretch', background: '#000', color: '#fff', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 1 }}>Critical</div>
                </div>
                <div style={{ display: 'flex', border: '0.75px solid #000' }}>
                  <div style={{ flex: 1, fontSize: 10, padding: '2px 3px', minHeight: 26, display: 'flex', alignItems: 'center', borderRight: '0.75px solid #000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a ? `${a.name}${a.qualityLabel ? ` (${a.qualityLabel})` : ''}${a.mode === 'thrown' ? ' — thrown' : ''}` : ''}
                  </div>
                  <div className="pf-box" style={{ width: 70, border: 'none', borderRight: '0.75px solid #000', fontSize: 11 }}>
                    {a ? a.bonuses.map(fmtMod).join('/') : ''}
                  </div>
                  <div className="pf-box" style={{ width: 46, border: 'none', fontSize: 10 }}>{a?.crit ?? ''}</div>
                </div>
                <div style={{ display: 'flex', borderRight: '0.75px solid #000', borderBottom: '0.75px solid #000', borderLeft: '0.75px solid #000' }}>
                  <WeaponCell cap="Type" v={a?.dmgType} w={58} />
                  <WeaponCell cap="Range" v={a?.range ? `${a.range} ft` : ''} w={48} />
                  <WeaponCell cap="Ammunition" w={112} />
                  <WeaponCell cap="Damage" v={a?.damage} last />
                </div>
              </div>
            );
          })}
        </div>

        {/* ============ RIGHT ============ */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Speed */}
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
            <div className="pf-chip" style={{ width: 58, fontSize: 10.5, alignSelf: 'flex-start', paddingTop: 3, paddingBottom: 3 }}>
              Speed<small>Land</small>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 3 }}>
                <div className="pf-cell" style={{ flex: 1 }}>
                  <div style={{ display: 'flex' }}>
                    <div className="pf-box" style={{ flex: 1 }}>{speedBase}</div>
                    <div className="pf-cap" style={{ alignSelf: 'center', padding: '0 3px' }}>ft.</div>
                    <div className="pf-box" style={{ width: 26 }}>{speedBase / 5}</div>
                    <div className="pf-cap" style={{ alignSelf: 'center', padding: '0 3px' }}>sq.</div>
                  </div>
                  <div className="pf-cap">Base Speed</div>
                </div>
                <div className="pf-cell" style={{ flex: 1 }}>
                  <div style={{ display: 'flex' }}>
                    <div className="pf-box" style={{ flex: 1 }}>{sheet.speed.base}</div>
                    <div className="pf-cap" style={{ alignSelf: 'center', padding: '0 3px' }}>ft.</div>
                    <div className="pf-box" style={{ width: 26 }}>{sheet.speed.base / 5}</div>
                    <div className="pf-cap" style={{ alignSelf: 'center', padding: '0 3px' }}>sq.</div>
                  </div>
                  <div className="pf-cap">With Armor</div>
                </div>
                <div className="pf-cell" style={{ width: 58 }}>
                  <div className="pf-box" style={{ minHeight: 26 }} />
                  <div className="pf-cap">Temp Modifiers</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
                <Cell v={sheet.speed.fly ? `${sheet.speed.fly} ft.` : ''} cap="Fly" />
                <Cell cap="Maneuverability" />
                <Cell v={sheet.speed.swim ? `${sheet.speed.swim} ft.` : ''} cap="Swim" />
                <Cell v={sheet.speed.climb ? `${sheet.speed.climb} ft.` : ''} cap="Climb" />
                <Cell v={sheet.speed.burrow ? `${sheet.speed.burrow} ft.` : ''} cap="Burrow" />
              </div>
            </div>
          </div>

          {/* Skills */}
          <Banner arrow style={{ marginTop: 6, fontSize: 12, textAlign: 'center' }}>Skills</Banner>
          <div className="pf-skill" style={{ height: 16, alignItems: 'flex-end' }}>
            <div />
            <div className="pf-cap pf-cap--l">Skill Names</div>
            <div className="pf-cap">Total Bonus</div>
            <div />
            {/* One heading over both the ability's name and its value. */}
            <div className="pf-cap" style={{ gridColumn: 'span 2' }}>Ability Mod.</div>
            <div />
            <div className="pf-cap">Ranks</div>
            <div />
            <div className="pf-cap">Misc. Mod.</div>
          </div>
          {SKILLS.map((sk) => {
            const s = sheet.stats[`skill:${sk.id}`];
            if (!s) return null;
            const b = bucketSkill(s.lines);
            const rank = ranks[sk.id] ?? 0;
            const usable = rank > 0 || !sk.trainedOnly;
            return (
              <div key={sk.id} className={`pf-skill${usable ? '' : ' pf-skill--untrained'}`}>
                <div className="pf-tick">{classSkills.has(sk.id) ? '✕' : ''}</div>
                <div className="pf-name">{sk.name}{sk.trainedOnly ? '*' : ''}</div>
                <div className="pf-val">{usable ? fmtMod(s.total) : ''}</div>
                <div className="pf-abbr">=</div>
                <div className="pf-abbr">{sk.ability}</div>
                <div className="pf-val">{fmtMod(b.ability)}</div>
                <div className="pf-abbr">+</div>
                <div className="pf-val">{b.ranks || ''}</div>
                <div className="pf-abbr">+</div>
                <div className="pf-val">{b.misc ? fmtMod(b.misc) : ''}</div>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 6.5 }}>
            <span><span className="pf-tick" style={{ display: 'inline-flex', width: 5.5, height: 5.5, border: '0.75px solid #000', verticalAlign: 'middle' }} /> Class Skill</span>
            <span>* Trained Only</span>
          </div>

          <div style={{ marginTop: 5 }}>
            <div style={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Conditional Modifiers:</div>
            <Ruled items={conditionals} rows={4} />
          </div>
          <div style={{ marginTop: 5 }}>
            <div style={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Languages:</div>
            <Ruled items={[languages.join(', ')]} rows={3} />
          </div>
        </div>
      </div>

      <div className="pf-foot">
        <span>Generated by Pathmaker. Layout after the Pathfinder RPG character sheet; Pathfinder is a trademark of Paizo Inc.</span>
        <span>Page 1 of 2</span>
      </div>
    </div>
  );
}

function WeaponCell({ cap, v, w, last }: { cap: string; v?: string; w?: number; last?: boolean }) {
  return (
    <div style={{ width: w, flex: w === undefined ? 1 : undefined, borderRight: last ? 'none' : '0.75px solid #000', minWidth: 0 }}>
      <div className="pf-cap" style={{ borderBottom: '0.75px solid #000', background: '#000', color: '#fff', minHeight: 9 }}>{cap}</div>
      <div style={{ fontSize: 9.5, minHeight: 26, display: 'flex', alignItems: 'center', padding: '4px 3px 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v ?? ''}</div>
    </div>
  );
}

// =========================================================================== page 2

function PageTwo({ doc, sheet }: { doc: CharacterDoc; sheet: Sheet }) {
  const dec = doc.decisions;
  const race = raceById.get((dec['race'] as string) ?? '');

  // --- AC items: every line that contributes to AC, enriched for armor and shields with the
  //     columns the table asks for (check penalty, spell failure, weight).
  const acRows = sheet.stats['ac'].lines
    .filter((l) => ['armor', 'shield', 'natural-armor', 'deflection'].includes(l.type ?? ''))
    .map((l) => {
      const armor = [doc.equipped.armor, doc.equipped.offHand]
        .map((id) => (id ? armorById.get(id) : undefined))
        .find((a) => a && l.label.startsWith(a.name));
      return {
        name: l.label,
        bonus: l.value,
        type: AC_TYPE_LABEL[l.type ?? 'untyped'] ?? l.type ?? '',
        acp: armor && armor.acp ? fmtMod(-Math.abs(armor.acp)) : '',
        asf: armor && armor.asf ? `${armor.asf}%` : '',
        weight: armor ? String(armor.weight) : '',
        props: armor?.maxDex !== null && armor?.maxDex !== undefined ? `max Dex +${armor.maxDex}` : '',
      };
    });
  const acTotals = {
    bonus: acRows.reduce((n, r) => n + r.bonus, 0),
    weight: acRows.reduce((n, r) => n + (Number(r.weight) || 0), 0),
  };

  // --- Gear
  const gear = sheet.inventory
    .filter((it) => it.qty > 0)
    .map((it) => ({ name: `${it.name}${it.qty > 1 ? ` ×${it.qty}` : ''}`, wt: it.weight }));

  // --- Feats: chosen slots plus everything the class handed out.
  const chosen = Object.values((dec['feats'] as Record<string, string | null>) ?? {})
    .filter(Boolean)
    .map((id) => featById.get(id as string)?.name ?? (id as string));
  const granted = sheet.grantedFeats.map((g) => `${g.name}${g.note ? ` (${g.note})` : ''}`);
  const feats = [...new Set([...chosen, ...granted])];

  // --- Special abilities: class features by level, active racial traits, senses, SLAs, defenses.
  const classFeatures = sheet.progression
    .filter((r) => r.level <= sheet.level)
    .flatMap((r) => r.features.map((f) => `${f} (${r.className ?? ''} ${r.classLevel ?? r.level})`.replace(/\s+\)/, ')')));
  const alts = (dec['alt-traits'] as string[]) ?? [];
  const replaced = new Set((race?.altTraits ?? []).filter((a) => alts.includes(a.id)).flatMap((a) => a.replaces));
  const racialTraits = [
    ...(race?.traits ?? []).filter((t) => !replaced.has(t.id)).map((t) => t.name),
    ...(race?.altTraits ?? []).filter((a) => alts.includes(a.id)).map((a) => a.name),
  ].map((n) => `${n} (${race?.name})`);
  const special = [
    ...classFeatures,
    ...racialTraits,
    ...sheet.senses.map((s) => `${s} (senses)`),
    ...sheet.spellLikeAbilities.map((s) => `${s.name} — ${s.uses === 'at-will' ? 'at will' : `${s.uses}/day`} (${s.source})`),
    ...sheet.defenses.dr.map((d) => `DR ${d.amount}/${d.bypass}`),
    ...sheet.defenses.resistances.map((r) => `Resist ${r.type} ${r.amount}`),
  ];

  // --- Spells
  const primary = sheet.casting[0];
  // The restricted bonus slot names itself generically ("Domain"); print what was actually
  // chosen, which is what the player needs on the line.
  const choices = (dec['class-choices'] as Record<string, string[]>) ?? {};
  const bonusSlotNames = [...(choices['domains'] ?? []), ...(choices['arcane-school'] ?? [])]
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1));
  const picks = (() => {
    const raw = dec['spell-picks'];
    if (Array.isArray(raw)) return { 1: raw as string[] } as Record<number, string[]>;
    return (raw as Record<number, string[]>) ?? {};
  })();

  const gp = Math.floor(sheet.gold);
  const sp = Math.floor((sheet.gold - gp) * 10);
  const cp = Math.round(((sheet.gold - gp) * 10 - sp) * 10);

  return (
    <div className="pf-page">
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Banner style={{ fontSize: 10 }}>{doc.name} · {sheet.summaryLine}</Banner>
      </div>

      <div style={{ display: 'flex', gap: 7, marginTop: 5, alignItems: 'flex-start' }}>
        {/* ---------- left: AC items, gear, load, money ---------- */}
        <div style={{ width: 238, flexShrink: 0, minWidth: 0 }}>
          <table className="pf-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}><div className="pf-banner" style={{ margin: '-0.5px -3px', fontSize: 8 }}>AC Items</div></th>
                <th style={{ width: 24 }}>Bonus</th>
                <th style={{ width: 28 }}>Type</th>
                <th style={{ width: 30 }}>Check Penalty</th>
                <th style={{ width: 30 }}>Spell Failure</th>
                <th style={{ width: 26 }}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(6, acRows.length) }, (_, i) => {
                const r = acRows[i];
                return (
                  <tr key={i}>
                    <td style={{ fontSize: 8, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 116 }}>{r?.name ?? ''}</td>
                    <td className="num">{r ? fmtMod(r.bonus) : ''}</td>
                    <td style={{ fontSize: 6.5, textAlign: 'center' }}>{r?.type ?? ''}</td>
                    <td className="num">{r?.acp ?? ''}</td>
                    <td className="num">{r?.asf ?? ''}</td>
                    <td className="num">{r?.weight ?? ''}</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ textAlign: 'right', padding: 0 }}><div className="pf-banner" style={{ fontSize: 8 }}>Totals</div></td>
                <td className="num">{fmtMod(acTotals.bonus)}</td>
                <td /><td /><td />
                <td className="num">{acTotals.weight || ''}</td>
              </tr>
            </tbody>
          </table>

          <table className="pf-table" style={{ marginTop: 6 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 0 }}><div className="pf-banner" style={{ fontSize: 8, textAlign: 'center' }}>Gear</div></th>
                <th style={{ width: 26 }}>Wt.</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(36, gear.length) }, (_, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 8.5, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 196 }}>{gear[i]?.name ?? ''}</td>
                  <td className="num">{gear[i] ? gear[i].wt || '' : ''}</td>
                </tr>
              ))}
              <tr>
                <td style={{ textAlign: 'right', padding: 0 }}><div className="pf-banner" style={{ fontSize: 8 }}>Total Weight</div></td>
                <td className="num">{sheet.load.current}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginTop: 5 }}>
            <LoadBox cap="Light Load" v={`${sheet.load.light} lb`} />
            <LoadBox cap="Lift Over Head" v={`${sheet.load.heavy} lb`} />
            <LoadBox cap="Medium Load" v={`${sheet.load.medium} lb`} />
            <LoadBox cap="Lift off Ground" v={`${sheet.load.heavy * 2} lb`} />
            <LoadBox cap="Heavy Load" v={`${sheet.load.heavy} lb`} />
            <LoadBox cap="Drag or Push" v={`${sheet.load.heavy * 5} lb`} />
          </div>

          <Banner style={{ marginTop: 6, fontSize: 9, textAlign: 'center' }}>Money</Banner>
          <div style={{ borderRight: '0.75px solid #000', borderBottom: '0.75px solid #000', borderLeft: '0.75px solid #000', padding: 3 }}>
            {[['CP', cp], ['SP', sp], ['GP', gp], ['PP', 0]].map(([k, v]) => (
              <div key={k as string} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 13 }}>
                <span className="pf-cap pf-cap--l" style={{ width: 14 }}>{k}</span>
                <span style={{ flex: 1, borderBottom: '0.75px solid #000', fontSize: 8.5, textAlign: 'right', paddingRight: 3 }}>{v || ''}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- middle: feats, special abilities, XP ---------- */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Banner arrow style={{ fontSize: 10, textAlign: 'center' }}>Feats</Banner>
          <Ruled items={feats} rows={18} />

          <Banner arrow style={{ fontSize: 10, textAlign: 'center', marginTop: 7 }}>Special Abilities</Banner>
          <Ruled items={special} rows={42} />

          <div style={{ display: 'flex', marginTop: 7, alignItems: 'stretch' }}>
            <Banner arrow style={{ flex: 1, fontSize: 9, display: 'flex', alignItems: 'center' }}>Experience Points</Banner>
            <div className="pf-cap" style={{ width: 54, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7 }}>Next Level</div>
          </div>
          <div style={{ display: 'flex', borderRight: '0.75px solid #000', borderBottom: '0.75px solid #000', borderLeft: '0.75px solid #000' }}>
            <div style={{ flex: 1, minHeight: 17, borderRight: '0.75px solid #000' }} />
            <div style={{ width: 54, minHeight: 17 }} />
          </div>
        </div>

        {/* ---------- right: spells ---------- */}
        <div style={{ width: 196, flexShrink: 0, minWidth: 0 }}>
          <Banner arrow style={{ fontSize: 10, textAlign: 'center' }}>Spells</Banner>
          <table className="pf-table">
            <thead>
              <tr>
                <th style={{ width: 34 }}>Spells Known</th>
                <th style={{ width: 34 }}>Spell Save DC</th>
                <th style={{ width: 24 }}>Level</th>
                <th style={{ width: 34 }}>Spells Per Day</th>
                <th style={{ width: 34 }}>Bonus Spells</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, l) => {
                const slots = primary?.slots?.[l];
                const known = primary?.known?.[l];
                return (
                  <tr key={l}>
                    <td className="num">{known ?? ''}</td>
                    <td className="num">{primary && (slots || known) ? primary.dcBase + l : ''}</td>
                    <td className="num" style={{ fontSize: 7 }}>{ORDINAL[l]}</td>
                    <td className="num">{slots || ''}</td>
                    <td className="num" style={{ background: l === 0 ? '#000' : undefined }} />
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ borderRight: '0.75px solid #000', borderBottom: '0.75px solid #000', borderLeft: '0.75px solid #000', minHeight: 22, padding: '1px 3px', fontSize: 6.5 }}>
            <div className="pf-cap pf-cap--l">Conditional Modifiers</div>
            {sheet.spellFocus.map((f) => `Spell Focus (${f.school}) +${f.bonus} DC`).join('; ')}
          </div>

          <div className="pf-split" style={{ marginTop: 5 }}>
            <div style={{ textAlign: 'center', fontFamily: '"Cinzel", Georgia, serif', fontSize: 7, padding: '2px 1px' }}>DOMAIN(S) / SPECIALTY SCHOOL</div>
            <div style={{ textAlign: 'center', fontFamily: '"Cinzel", Georgia, serif', fontSize: 7, padding: '2px 1px' }}>OPPOSITION SCHOOL(S)</div>
          </div>
          <div className="pf-split" style={{ borderTop: 'none', minHeight: 15 }}>
            <div style={{ fontSize: 9.5, padding: '1px 3px' }}>
              {bonusSlotNames.join(', ') || primary?.bonusSlot?.label || ''}
            </div>
            <div />
          </div>

          {Array.from({ length: 10 }, (_, l) => {
            const chosenSpells = (picks[l] ?? []).map((id) => spellById.get(id)?.name ?? id);
            const rows = Math.max(l === 0 ? 5 : 4, chosenSpells.length);
            return (
              <div key={l} style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: 7.5 }}>{ORDINAL[l]}</span>
                  <div className="pf-ticks">
                    {Array.from({ length: Math.min(9, primary?.slots?.[l] ?? 0) }, (_, i) => <i key={i} />)}
                  </div>
                </div>
                <Ruled items={chosenSpells} rows={rows} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="pf-foot">
        <span>Generated by Pathmaker. Layout after the Pathfinder RPG character sheet; Pathfinder is a trademark of Paizo Inc.</span>
        <span>Page 2 of 2</span>
      </div>
    </div>
  );
}

function LoadBox({ cap, v }: { cap: string; v: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span className="pf-cap pf-cap--l" style={{ width: 42, lineHeight: 1.1 }}>{cap}</span>
      <div className="pf-box" style={{ flex: 1, fontSize: 8 }}>{v}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const ABILITY_LONG: Record<Ability, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

const SAVE_COLUMNS = ['Total', 'Base Save', 'Ability Modifier', 'Magic Modifier', 'Misc Modifier', 'Temporary Modifier'];

const SAVES: [string, string, string][] = [
  ['fort', 'Fortitude', 'Constitution'],
  ['ref', 'Reflex', 'Dexterity'],
  ['will', 'Will', 'Wisdom'],
];

const AC_TYPE_LABEL: Record<string, string> = {
  armor: 'armor', shield: 'shield', 'natural-armor': 'natural', deflection: 'deflection',
};

const ORDINAL = ['0', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

/** The conditional save bonuses that never belong in a total but decide whether a save lands. */
const SAVE_NOTE_LINES = (sheet: Sheet): string[] =>
  ['fort', 'ref', 'will'].flatMap((sv) => sheet.stats[`save:${sv}`].annotations);
