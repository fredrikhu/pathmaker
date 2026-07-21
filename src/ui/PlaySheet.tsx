import { useState } from 'react';
import { loadCharacter } from '../storage/store';
import { newCharacter } from '../engine/character';
import { ABILITIES, abilityMod, emptyPlayState, normalizePlayState, fmtMod, type Ability, type ActionType, type CastingBlock, type DamageKind, type PlayState, type Timer } from '../engine/types';
import {
  advanceTime, nextRound, startEncounter, endEncounter, addTimer, removeTimer, rest as restPlay,
  durationLabel, ROUNDS_PER_MINUTE, ROUNDS_PER_HOUR,
} from '../engine/clock';
import { consume, unconsume, spendCharges, restoreCharges, restock } from '../engine/inventory';
import { rollAttack, rollDamage, rollSave, rollMissChance, threatRange, CONCEALMENT, type Concealment, type MetamagicDamageMods } from '../engine/dice';
import { applyDamage, bypassOptions, ENERGY_TYPES } from '../engine/damage';
import { spellBuffTimer, spellDamageAt, spellAttackerTimer } from '../engine/buffs';
import { spendAction, resetActions, COMMON_ACTIONS, type ActionCost } from '../engine/actions';
import { CONDITIONS, conditionById, SPELLS, spellById, spellLevelOn, classById, skillById, METAMAGIC, effectiveSpellLevel, dcSpellLevel, type MetamagicDef } from '../content/index';
import { useCharacter } from './useCharacter';
import { useTip } from './Tooltip';
import { navigate } from './App';
import { ThemeToggle } from './ThemeToggle';

const SPELL_LEVEL = (l: number) => (l === 0 ? '0' : String(l));
const attackLabel = (bonuses: number[]) => bonuses.map(fmtMod).join('/');

/** One entry in the roll log. Deliberately session-only React state, never persisted: a roll is a
 *  moment, and a log restored from last week's session would be noise on the sheet. */
interface LoggedRoll {
  key: number;
  /** "Longsword attack", "Fireball damage". */
  source: string;
  /** "d20 14 +7", "1d8+4" — the arithmetic, so the reader can check it. */
  detail: string;
  total: number;
  /** How the roll landed, for the badge and its colour. */
  outcome?: 'threat' | 'fumble' | 'success' | 'failure' | 'miss';
}
const ROLL_LOG_LIMIT = 12;

export function PlaySheet({ id }: { id: string }) {
  const initial = loadCharacter(id) ?? newCharacter(id);
  const ch = useCharacter(initial);
  const tip = useTip();
  const { doc, resolution } = ch;
  const sheet = resolution.sheet;
  // Older saved docs predate the phase-4 clock fields, so fill defaults in on read.
  const play: PlayState = normalizePlayState(doc.play);

  // Open a stat's breakdown card (reuses the builder StatStrip tooltip infra).
  const statTip = (key: string, shown: string) => {
    const st = sheet.stats[key];
    return st ? tip.card({ kicker: 'Breakdown', title: `${st.label} ${shown}`, lines: st.lines, annotations: st.annotations }) : undefined;
  };

  // Functional update — reads the freshest play state so rapid clicks don't clobber each other.
  const updatePlay = (fn: (p: PlayState) => Partial<PlayState>) =>
    ch.patch((d) => { const p = { ...emptyPlayState(), ...d.play }; return { ...d, play: { ...p, ...fn(p) } }; });
  const setPlay = (patch: Partial<PlayState>) => updatePlay(() => patch);
  /** Apply a pure clock action (engine does the arithmetic; this just stores the result). */
  const applyClock = (fn: (p: PlayState) => PlayState) =>
    ch.patch((d) => ({ ...d, play: fn(normalizePlayState(d.play)) }));

  // ---- Dice ----
  // The engine rolls (pure functions over an injected rng); this only records what came back.
  const [rolls, setRolls] = useState<LoggedRoll[]>([]);
  // The target's concealment, applied to every attack roll while set — the player declares it when
  // facing a concealed foe, since only they (and the GM) know what they are swinging at.
  const [targetConcealment, setTargetConcealment] = useState<Concealment>('none');
  const targetMissChance = CONCEALMENT[targetConcealment];
  const log = (entry: Omit<LoggedRoll, 'key'>) =>
    setRolls((prev) => [{ ...entry, key: Date.now() + Math.random() }, ...prev].slice(0, ROLL_LOG_LIMIT));

  const rollAttackLine = (name: string, bonus: number, crit: string) => {
    const r = rollAttack(bonus, threatRange(crit));
    let detail = `d20 ${r.natural} ${fmtMod(r.bonus)}`;
    let outcome: LoggedRoll['outcome'] = r.threat ? 'threat' : r.fumble ? 'fumble' : undefined;
    // Concealment is a post-attack step: the attack resolves normally, then — only if it lands —
    // the target's concealment gets a chance to spoil it. A natural 1 has already missed, so skip.
    if (targetMissChance > 0 && !r.fumble) {
      const m = rollMissChance(targetMissChance);
      detail += ` · concealment ${m.chance}%: rolled ${m.roll}${m.missed ? ' — missed through concealment' : ' — got through'}`;
      // A concealment miss overrides a hit, so it wins the badge.
      if (m.missed) outcome = 'miss';
    }
    log({ source: `${name} attack`, detail, total: r.total, ...(outcome ? { outcome } : {}) });
  };
  /** Roll a damage formula; falls back to showing the text when it is not a plain formula. Metamagic
   *  that changes the numbers (Empower, Maximize) is applied to the dice and noted in the readout. */
  const rollDamageFor = (source: string, formula: string, meta: MetamagicDamageMods = {}) => {
    const r = rollDamage(formula, undefined, meta);
    if (!r) { log({ source, detail: `${formula} — not a rollable formula`, total: 0 }); return; }
    const dice = r.dice.join(' + ');
    const tags = [
      ...(r.maximized ? ['maximized'] : []),
      ...(r.empowerBonus ? [`empowered +${r.empowerBonus}`] : []),
    ];
    const detail = `${r.formula} → ${dice}${r.modifier ? ` ${fmtMod(r.modifier)}` : ''}${tags.length ? ` · ${tags.join(', ')}` : ''}`;
    log({ source, detail, total: r.total });
  };
  /** Turn a set of applied metamagic ids into the damage mods the dice roller understands. */
  const dmgModsFrom = (metaIds: readonly string[]): MetamagicDamageMods => ({
    empower: metaIds.includes('empower-spell'),
    maximize: metaIds.includes('maximize-spell'),
  });

  // ---- Saving throws ----
  // A save is where conditional bonuses finally become usable: "+2 against fear" is prose on the
  // sheet, but at the moment you roll a save against fear you know whether it applies. The chips
  // below are those bonuses, and the engine adds the ones you switch on.
  const [saveExtras, setSaveExtras] = useState<Record<string, boolean>>({});
  const extraKey = (sv: string, i: number) => `${sv}:${i}`;
  const rollSavingThrow = (sv: 'fort' | 'ref' | 'will') => {
    const st = sheet.stats[`save:${sv}`];
    if (!st) return;
    const chosen = st.conditional.filter((_, i) => saveExtras[extraKey(sv, i)]);
    const extra = chosen.reduce((n, c) => n + c.value, 0);
    const r = rollSave(st.total + extra, null);
    const why = chosen.length ? ` (incl. ${chosen.map((c) => c.note).join(', ')})` : '';
    log({
      source: `${st.label} save${r.dc !== undefined ? ` vs DC ${r.dc}` : ''}`,
      detail: `d20 ${r.natural} ${fmtMod(r.bonus)}${why}`
        + (r.success === undefined ? '' : r.automatic ? (r.success ? ' — natural 20, automatic success' : ' — natural 1, automatic failure') : r.success ? ' — made it' : ' — failed'),
      total: r.total,
      ...(r.success === true ? { outcome: 'success' as const } : r.success === false ? { outcome: 'failure' as const } : {}),
    });
  };

  // ---- Typed damage ----
  // The engine decides what a hit is reduced to; this only says what arrived and records the result.
  const [incomingAmount, setIncomingAmount] = useState('');
  const [incomingKind, setIncomingKind] = useState<DamageKind>('physical');
  const [bypassed, setBypassed] = useState<Record<string, boolean>>({});
  const bypassChoices = bypassOptions(sheet.defenses);
  const takeTypedDamage = () => {
    const n = Number(incomingAmount);
    if (!Number.isFinite(n) || n <= 0) return;
    const r = applyDamage(n, incomingKind, sheet.defenses, {
      bypassed: bypassChoices.filter((b) => bypassed[b]),
    });
    damage(r.applied);
    // Protection from energy is stateful: subtract what it absorbed, and end the spell if spent.
    if (r.deplete) {
      const dep = r.deplete;
      applyClock((p) => ({
        ...p,
        timers: p.timers
          .map((t) => (t.id === dep.timerId && t.absorb ? { ...t, absorb: { ...t.absorb, remaining: t.absorb.remaining - dep.amount } } : t))
          .filter((t) => !t.absorb || t.absorb.remaining > 0),
      }));
    }
    log({ source: 'Damage taken', detail: r.explain, total: r.applied });
    setIncomingAmount('');
  };

  // ---- Action economy ----
  // A turn's budget lives in play state and resets each round (the clock does that). Quick buttons
  // spend through the engine so the standard-as-move downgrade and the full-round rule apply; the
  // pips are manual toggles for corrections.
  const doAction = (cost: ActionCost) =>
    updatePlay((p) => { const r = spendAction(p.actionsUsed, cost); return r.ok ? { actionsUsed: r.used } : {}; });
  const toggleAction = (a: ActionType) =>
    updatePlay((p) => { const next = { ...p.actionsUsed }; if (next[a]) delete next[a]; else next[a] = true; return { actionsUsed: next }; });
  const newTurn = () => setPlay({ actionsUsed: resetActions() });
  const canSpend = (cost: ActionCost) => spendAction(play.actionsUsed, cost).ok;

  const maxHp = sheet.stats['hp:max']?.total ?? 0;
  const currentHp = maxHp - play.hpDamage;
  const damage = (n: number) => updatePlay((p) => {
    // Damage hits temp HP first, then real HP; healing reduces hpDamage (never above max).
    let remaining = n;
    let temp = p.tempHp;
    if (n > 0 && temp > 0) { const absorbed = Math.min(temp, remaining); temp -= absorbed; remaining -= absorbed; }
    return { hpDamage: Math.max(0, p.hpDamage + remaining), tempHp: temp };
  });

  // Every tracker below is keyed by casting class: a multiclass caster spends, prepares and
  // recovers each class's slots independently, so nothing here is shared between classes.
  const usedAt = (cls: string, l: number) => play.usedSlots[cls]?.[l] ?? 0;
  const setUsed = (cls: string, l: number, v: number) => updatePlay((p) => ({
    usedSlots: { ...p.usedSlots, [cls]: { ...p.usedSlots[cls], [l]: Math.max(0, v) } },
  }));

  const rawBook = doc.decisions['spell-picks'];
  const spellbook: Record<number, string[]> = Array.isArray(rawBook) ? { 1: rawBook as string[] } : ((rawBook as Record<number, string[]>) ?? {});

  /** The pool preparable at a spell level: the class's whole list, or its spellbook. */
  const preparablePool = (cls: string, level: number) => {
    const csc = classById.get(cls)?.spellcasting;
    if (!csc) return [];
    const pool = csc.kind === 'prepared-book'
      ? (spellbook[level] ?? []).map((id) => spellById.get(id)!).filter(Boolean)
      : SPELLS.filter((s) => s.lists.includes(csc.list as never) && spellLevelOn(s, csc.list) === level);
    return pool.slice().sort((a, b) => a.name.localeCompare(b.name));
  };

  const preparedAt = (cls: string, l: number) => play.prepared?.[cls]?.[l] ?? [];
  const castAt = (cls: string, l: number) => play.castPrepared?.[cls]?.[l] ?? [];
  const setPreparedAt = (cls: string, l: number, i: number, spell: string) =>
    updatePlay((p) => {
      const arr = [...(p.prepared?.[cls]?.[l] ?? [])];
      arr[i] = spell;
      // Changing the spell in a slot drops any metamagic that was applied to it.
      const metaLvl = { ...(p.preparedMeta?.[cls]?.[l] ?? {}) };
      delete metaLvl[i];
      return {
        prepared: { ...p.prepared, [cls]: { ...p.prepared?.[cls], [l]: arr } },
        preparedMeta: { ...p.preparedMeta, [cls]: { ...p.preparedMeta?.[cls], [l]: metaLvl } },
      };
    });

  // Metamagic owned by the character (feat ids on the sheet), and per-prepared-slot application.
  const ownedMeta = METAMAGIC.filter((m) => sheet.feats.includes(m.id));
  const preparedMetaAt = (cls: string, l: number, i: number) => play.preparedMeta?.[cls]?.[l]?.[i] ?? [];
  const togglePreparedMeta = (cls: string, l: number, i: number, mid: string) =>
    updatePlay((p) => {
      const cur = new Set(p.preparedMeta?.[cls]?.[l]?.[i] ?? []);
      cur.has(mid) ? cur.delete(mid) : cur.add(mid);
      const lvlMap = { ...(p.preparedMeta?.[cls]?.[l] ?? {}), [i]: [...cur] };
      return { preparedMeta: { ...p.preparedMeta, [cls]: { ...p.preparedMeta?.[cls], [l]: lvlMap } } };
    });
  /** The pool preparable in a slot of `maxLevel` when metamagic is in play: every spell of base
   *  level 1..maxLevel, so a lower spell can be metamagically raised to fill the slot. */
  const preparablePoolUpTo = (cls: string, maxLevel: number) => {
    const out: ReturnType<typeof preparablePool> = [];
    for (let l = 1; l <= maxLevel; l++) out.push(...preparablePool(cls, l));
    return out;
  };
  const toggleCast = (cls: string, l: number, i: number) =>
    updatePlay((p) => {
      const set = new Set(p.castPrepared?.[cls]?.[l] ?? []);
      set.has(i) ? set.delete(i) : set.add(i);
      return { castPrepared: { ...p.castPrepared, [cls]: { ...p.castPrepared?.[cls], [l]: [...set] } } };
    });

  // The one restricted bonus slot (cleric domain / specialist school) per level, tracked apart from
  // the regular prepared slots because it obeys a different restriction.
  const preparedBonusAt = (cls: string, l: number) => play.preparedBonus?.[cls]?.[l] ?? '';
  const castBonusAt = (cls: string, l: number) => play.castBonus?.[cls]?.[l] ?? false;
  const setPreparedBonus = (cls: string, l: number, spell: string) =>
    updatePlay((p) => ({ preparedBonus: { ...p.preparedBonus, [cls]: { ...p.preparedBonus?.[cls], [l]: spell } } }));
  const toggleCastBonus = (cls: string, l: number) =>
    updatePlay((p) => ({ castBonus: { ...p.castBonus, [cls]: { ...p.castBonus?.[cls], [l]: !(p.castBonus?.[cls]?.[l]) } } }));
  /** The spells the bonus slot may hold at a level: the domain spell(s), or spellbook spells of the
   *  specialty school. */
  const bonusPool = (block: typeof sheet.casting[number], level: number) => {
    const bs = block.bonusSlot;
    if (!bs) return [];
    const pool = bs.kind === 'domain'
      ? (bs.allowedByLevel?.[level] ?? []).map((id) => spellById.get(id)).filter(Boolean) as typeof SPELLS
      : preparablePool(block.classId, level).filter((sp) => sp.school === bs.school);
    return pool.slice().sort((a, b) => a.name.localeCompare(b.name));
  };

  // Each class casts off its own ability, so the DC base comes from that class's block. Spell
  // Focus is school-specific, so it's listed alongside rather than folded into the number.
  const focusNote = sheet.spellFocus.map((f) => `${fmtMod(f.bonus)} ${f.school}`).join(', ');
  const dcNoteFor = (dcBase: number) => `save DC ${dcBase} + spell level${focusNote ? ` (${focusNote})` : ''}`;
  // The concrete save DC for a spell: the class's DC base (10 + casting ability) plus the spell's
  // effective level for DCs — which only Heighten raises — plus any Spell Focus for its school.
  // Null for spells that force no save, so the caller shows nothing rather than a misleading number.
  const spellSaveDcFor = (sp: (typeof SPELLS)[number], dcBase: number, dcLevel: number): number | null => {
    if (!sp.save || /^\s*none\b/i.test(sp.save)) return null;
    const focus = sheet.spellFocus.filter((f) => f.school === sp.school).reduce((n, f) => n + f.bonus, 0);
    return dcBase + dcLevel + focus;
  };

  // Rest restores the daily resources and lets 8 hours pass, so running effects expire on their own.
  const rest = () => applyClock((p) => restPlay(p).play);

  // ---- Encounter & time (phase 4) ----
  const initMod = sheet.stats['init']?.total ?? 0;
  const rollInitiative = () => Math.floor(Math.random() * 20) + 1 + initMod;
  const inEncounter = play.round > 0;
  const [timerLabel, setTimerLabel] = useState('');
  const [timerAmount, setTimerAmount] = useState(1);
  const [timerUnit, setTimerUnit] = useState<'rounds' | 'minutes' | 'hours'>('minutes');
  const [timerCondition, setTimerCondition] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const unitRounds = { rounds: 1, minutes: ROUNDS_PER_MINUTE, hours: ROUNDS_PER_HOUR };

  const submitTimer = () => {
    const rounds = Math.max(1, Math.round(timerAmount)) * unitRounds[timerUnit];
    const label = timerLabel.trim() || (timerCondition ? conditionById.get(timerCondition)?.name ?? 'Effect' : 'Effect');
    const t: Timer = {
      id: `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      label, remaining: rounds,
      ...(timerCondition ? { conditionId: timerCondition } : {}),
    };
    applyClock((p) => {
      const withTimer = addTimer(p, t);
      // Timing a condition implies it is active now.
      return timerCondition && !withTimer.conditions.includes(timerCondition)
        ? { ...withTimer, conditions: [...withTimer.conditions, timerCondition] }
        : withTimer;
    });
    setTimerLabel(''); setTimerAmount(1); setTimerCondition('');
  };

  // ---- Casting a buff ----
  // A spell's list decides which of a multiclass caster's caster levels applies, so the picker
  // offers only spells this character can actually cast, at the caster level that casts them.
  // The casting block whose caster level actually casts this spell — the highest among the classes
  // whose list contains it. Carries the caster level and the DC base a self-directed attacker needs.
  const castingBlockFor = (spellId: string) => {
    const sp = spellById.get(spellId);
    if (!sp) return null;
    const matching = sheet.casting.filter((b) => {
      const list = classById.get(b.classId)?.spellcasting?.list;
      return list && sp.lists.includes(list as never);
    });
    return matching.length ? matching.reduce((best, b) => (b.casterLevel > best.casterLevel ? b : best)) : null;
  };
  const casterLevelFor = (spellId: string): number | null => castingBlockFor(spellId)?.casterLevel ?? null;
  // Both buffs and self-directed attackers become running timers, so they share one picker.
  const runningSpells = SPELLS.filter((s) => (s.buff || s.attacker) && casterLevelFor(s.id) !== null);
  const [buffPick, setBuffPick] = useState('');
  const [buffParam, setBuffParam] = useState('');
  // The cast-time choice the picked spell requires (resist energy's energy type), if any.
  const buffPickParam = buffPick ? spellById.get(buffPick)?.buff?.param : undefined;

  const casterAbilityMods = ABILITIES.reduce((m, ab) => {
    m[ab] = abilityMod(sheet.stats[`ability:${ab}`]?.total ?? 10);
    return m;
  }, {} as Record<Ability, number>);

  /** Start a spell's running effect — a buff, or a self-directed attacker. The engine resolves the
   *  scaling and (for an attacker) the attack bonus from the caster; this only stores the timer. */
  const castRunning = (spellId: string, param?: string) => {
    const sp = spellById.get(spellId);
    const block = castingBlockFor(spellId);
    if (!sp || !block) return;
    const id = `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    const timer = sp.buff
      ? spellBuffTimer(sp, block.casterLevel, id, param)
      : spellAttackerTimer(sp, {
          casterLevel: block.casterLevel,
          bab: sheet.stats['bab']?.total ?? 0,
          abilityMods: casterAbilityMods,
          dcBase: block.dcBase,
        }, id);
    if (timer) applyClock((p) => addTimer(p, timer));
  };

  /** Shortest remaining timer driving a condition, for the badge on its chip. */
  const timerFor = (conditionId: string): Timer | undefined =>
    play.timers.filter((t) => t.conditionId === conditionId).sort((a, b) => a.remaining - b.remaining)[0];

  const pools = sheet.pools;
  const usedPoolAt = (id: string) => play.usedPools[id] ?? 0;
  const setUsedPool = (id: string, v: number, max: number) =>
    updatePlay((p) => ({ usedPools: { ...p.usedPools, [id]: Math.max(0, Math.min(max, v)) } }));
  // Delta-based (reads fresh state) so rapid spend/restore clicks accumulate correctly.
  const adjustPool = (id: string, delta: number, max: number) =>
    updatePlay((p) => ({ usedPools: { ...p.usedPools, [id]: Math.max(0, Math.min(max, (p.usedPools[id] ?? 0) + delta)) } }));

  const ranks = (doc.decisions['skill-ranks'] as Record<string, number>) ?? {};
  const trainedSkills = sheet.skillIds.filter((sid) => (ranks[sid] ?? 0) > 0);

  const conditions = play.conditions;
  const toggleCondition = (id: string) =>
    updatePlay((p) => ({ conditions: p.conditions.includes(id) ? p.conditions.filter((x) => x !== id) : [...p.conditions, id] }));

  const hpColor = currentHp <= 0 ? 'var(--err)' : currentHp <= maxHp / 4 ? 'var(--warn-fg)' : 'var(--color-accent-300)';

  return (
    <div style={{ minHeight: '100vh', maxWidth: 920, margin: '0 auto', padding: '16px 24px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate({ name: 'roster' })}>← Roster</button>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{doc.name}</div>
          <div className="text-muted" style={{ fontSize: 13 }}>{sheet.summaryLine}</div>
        </div>
        <span style={{ flex: 1 }} />
        <ThemeToggle />
        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => navigate({ name: 'builder', id })}>Edit build</button>
        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => navigate({ name: 'sheet', id })}>Sheet</button>
        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={rest} title="Restore daily resources and let 8 hours pass">🌙 Rest</button>
      </div>

      {/* Encounter & time */}
      <div className="mat-panel" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="micro">Encounter</div>
          {inEncounter ? (
            <>
              <span style={{ fontSize: 13 }}>Round <span className="num" style={{ fontSize: 19, fontWeight: 700, color: 'var(--color-accent-300)' }}>{play.round}</span></span>
              {play.initiative !== null && <span className="text-muted" style={{ fontSize: 12 }}>initiative {play.initiative}</span>}
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => applyClock((p) => nextRound(p).play)}>Next round ▶</button>
              <button className="btn btn-ghost" style={{ fontSize: 11.5 }} onClick={() => applyClock(endEncounter)}>End encounter</button>
            </>
          ) : (
            <>
              <span className="text-muted" style={{ fontSize: 12 }}>not in combat · initiative {fmtMod(initMod)}</span>
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => applyClock((p) => startEncounter(p, rollInitiative()))}>🎲 Roll initiative &amp; start</button>
            </>
          )}
          <span style={{ flex: 1 }} />
          <span className="text-muted" style={{ fontSize: 11.5 }}>Advance time</span>
          {([['1 min', ROUNDS_PER_MINUTE], ['10 min', 10 * ROUNDS_PER_MINUTE], ['1 hr', ROUNDS_PER_HOUR]] as const).map(([label, rounds]) => (
            <button key={label} className="btn btn-ghost" style={{ fontSize: 11.5 }} onClick={() => applyClock((p) => advanceTime(p, rounds).play)}>+{label}</button>
          ))}
        </div>

        {/* This turn's action economy — only meaningful in combat. Resets each round. */}
        {inEncounter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-divider)' }}>
            <span className="text-muted" style={{ fontSize: 11.5 }}>This turn</span>
            {(['standard', 'move', 'swift'] as const).map((a) => {
              const used = play.actionsUsed[a] === true;
              return (
                <button key={a} onClick={() => toggleAction(a)}
                  title={used ? `${a} action spent — click to give it back` : `${a} action available — click to mark spent`}
                  style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                    textTransform: 'capitalize',
                    border: `1px solid ${used ? 'var(--color-divider)' : 'var(--color-accent-300)'}`,
                    background: used ? 'transparent' : 'color-mix(in srgb, var(--color-accent) 14%, transparent)',
                    color: used ? 'var(--color-neutral-500)' : 'var(--color-text)',
                    textDecoration: used ? 'line-through' : 'none',
                  }}>
                  {a}
                </button>
              );
            })}
            <span style={{ width: 1, height: 18, background: 'var(--color-divider)', margin: '0 2px' }} />
            {COMMON_ACTIONS.map((act) => (
              <button key={act.id} className="btn btn-ghost" style={{ fontSize: 11 }} disabled={!canSpend(act.cost)}
                title={`${act.name} — ${act.cost === 'full-round' ? 'full-round action' : `${act.cost} action`}${act.note ? ` (${act.note})` : ''}`}
                onClick={() => doAction(act.cost)}>{act.name}</button>
            ))}
            <span style={{ flex: 1 }} />
            <button className="btn btn-ghost" style={{ fontSize: 11 }} title="Start a fresh turn without advancing the round" onClick={newTurn}>↺ New turn</button>
          </div>
        )}

        {/* Running durations */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div className="micro">Running effects</div>
            <span style={{ flex: 1 }} />
            <button className="btn btn-ghost" style={{ fontSize: 11 }}
              title={addOpen ? 'Hide the add-effect form' : 'Add a buff or timed condition'}
              onClick={() => setAddOpen((o) => !o)}>{addOpen ? 'Close' : 'Add'}</button>
          </div>
          {play.timers.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 11.5, margin: '0 0 10px' }}>Nothing running. Use <strong>Add</strong> to start a buff or a timed condition — it counts down as rounds and time pass.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {play.timers.map((t) => {
                // A running spell carries either its resolved effects (a buff) or a self-directed
                // attacker, so the chip can say what it is doing rather than just counting down.
                const spell = t.spellId ? spellById.get(t.spellId) : undefined;
                const caveat = spell?.buff?.caveat ?? spell?.attacker?.caveat;
                const atk = t.attacker;
                const atkLabel = atk?.attackBonuses ? atk.attackBonuses.map(fmtMod).join('/') : null;
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 12.5, flexWrap: 'wrap' }}>
                    <span style={{ minWidth: 170, fontWeight: 500 }}>{t.label}</span>
                    <span className="num" style={{ color: t.remaining <= 3 ? 'var(--warn-fg)' : 'var(--color-accent-300)', minWidth: 90 }}>{durationLabel(t.remaining)}</span>
                    {t.conditionId && <span className="tag tag-neutral" style={{ fontSize: 10 }}>{conditionById.get(t.conditionId)?.name}</span>}
                    {t.effects?.length ? (
                      <span className="text-muted" style={{ fontSize: 11 }}>
                        {t.effects.map((e) => `${fmtMod(e.value)} ${e.target.replace('attack:', '').replace('damage:weapon', 'weapon damage').replace('save:all', 'saves').replace('skill:all', 'skills').replace('save:ref', 'Reflex')}${e.condition ? ` ${e.condition}` : ''}`).join(' · ')}
                      </span>
                    ) : null}
                    {atk ? (
                      <span className="text-muted num" style={{ fontSize: 11 }}>
                        {atkLabel ? `${atkLabel} · ` : ''}{atk.damage} {atk.dmgType}{atk.save ? ` · ${atk.save}` : ''}
                      </span>
                    ) : null}
                    {t.absorb ? (
                      <span className="text-muted num" style={{ fontSize: 11 }}>absorbs {t.absorb.type} · <strong>{t.absorb.remaining}</strong> left</span>
                    ) : null}
                    <span style={{ flex: 1 }} />
                    {/* A self-directed attacker acts each round on your turn — roll it here. */}
                    {atk?.attackBonuses && (
                      <RollButton label="d20" title={`Roll to hit at ${atkLabel}`}
                        onRoll={() => rollAttackLine(t.label, atk.attackBonuses![0], atk.crit ?? '×2')} />
                    )}
                    {atk && (
                      <RollButton label={atk.damage} title={`Roll ${atk.damage}${atk.save ? ` — ${atk.save}` : ''}`}
                        onRoll={() => rollDamageFor(`${t.label} damage`, atk.damage)} />
                    )}
                    <button className="btn btn-ghost" style={{ fontSize: 11 }} title="Cancel this countdown (leaves any condition set)"
                      onClick={() => applyClock((p) => removeTimer(p, t.id))}>✕</button>
                    {caveat && <div className="text-muted" style={{ fontSize: 11, width: '100%', marginTop: -2 }}>{caveat}</div>}
                  </div>
                );
              })}
            </div>
          )}
          {addOpen && (<>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="input" style={{ width: 160, fontSize: 12, padding: '4px 7px' }} placeholder="Effect name…"
              value={timerLabel} onChange={(e) => setTimerLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitTimer(); }} />
            <input className="input" style={{ width: 56, fontSize: 12, padding: '4px 7px', textAlign: 'center' }} type="number" min={1}
              value={timerAmount} onChange={(e) => setTimerAmount(Math.max(1, Math.round(Number(e.target.value) || 1)))} />
            <select className="input" style={{ width: 'auto', fontSize: 12, padding: '4px 7px' }} value={timerUnit} onChange={(e) => setTimerUnit(e.target.value as typeof timerUnit)}>
              <option value="rounds">rounds</option>
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
            </select>
            <select className="input" style={{ width: 'auto', fontSize: 12, padding: '4px 7px' }} value={timerCondition} onChange={(e) => setTimerCondition(e.target.value)}>
              <option value="">— no condition —</option>
              {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={submitTimer}>Start timer</button>
          </div>
          {/* Casting a running-effect spell: the engine works out the bonus/attack and the duration
              from your caster level, and it flows into the sheet (buff) or is rolled each round
              (a self-directed attacker) until it runs out. */}
          {runningSpells.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
              <span className="text-muted" style={{ fontSize: 11.5 }}>Cast a spell with a running effect</span>
              <select className="input" style={{ width: 'auto', fontSize: 12, padding: '4px 7px', minWidth: 200 }} value={buffPick}
                onChange={(e) => { setBuffPick(e.target.value); setBuffParam(''); }}>
                <option value="">— choose a spell —</option>
                {runningSpells.map((s) => <option key={s.id} value={s.id}>{s.name} (CL {casterLevelFor(s.id)}) — {(s.buff ?? s.attacker)!.scaling}</option>)}
              </select>
              {/* A spell with a cast-time choice (resist energy) shows its options before you cast. */}
              {buffPickParam && (
                <select className="input" style={{ width: 'auto', fontSize: 12, padding: '4px 7px' }} value={buffParam}
                  onChange={(e) => setBuffParam(e.target.value)}>
                  <option value="">{buffPickParam.label}…</option>
                  {buffPickParam.options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              )}
              <button className="btn btn-secondary" style={{ fontSize: 12 }} disabled={!buffPick || (!!buffPickParam && !buffParam)}
                onClick={() => { castRunning(buffPick, buffParam || undefined); setBuffPick(''); setBuffParam(''); }}>Cast</button>
              <span className="text-muted" style={{ fontSize: 11 }}>expending the slot is still up to you, below</span>
            </div>
          )}
          </>)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
        {/* HP tracker */}
        <div className="mat-panel">
          <div className="micro" style={{ marginBottom: 8 }}>Hit Points</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="num" style={{ fontSize: 44, fontWeight: 700, color: hpColor }}>{currentHp}</span>
              <span className="text-muted" style={{ fontSize: 18, cursor: 'pointer' }}
                onMouseEnter={statTip('hp:max', String(maxHp))} onMouseLeave={tip.leave} onClick={statTip('hp:max', String(maxHp))}
                title="max HP breakdown">/ {maxHp}</span>
              {play.tempHp > 0 && <span style={{ fontSize: 14, color: 'var(--color-accent-300)' }}>+{play.tempHp} temp</span>}
            </div>
            <span style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 12, fontSize: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="text-muted">Temp HP</span>
                <input className="input" style={{ width: 52, padding: '3px 5px', textAlign: 'center' }} type="number" min={0} value={play.tempHp}
                  onChange={(e) => setPlay({ tempHp: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="text-muted">Nonlethal</span>
                <input className="input" style={{ width: 52, padding: '3px 5px', textAlign: 'center' }} type="number" min={0} value={play.nonlethal}
                  onChange={(e) => setPlay({ nonlethal: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
              </label>
            </div>
          </div>
          {currentHp <= 0 && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 2 }}>{currentHp <= -maxHp ? 'Dead' : 'Dying / disabled'}</div>}
          <div style={{ height: 8, borderRadius: 4, background: 'var(--color-neutral-800)', overflow: 'hidden', margin: '12px 0' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, (currentHp / maxHp) * 100))}%`, height: '100%', background: hpColor, transition: 'width .15s' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => damage(5)}>−5</button>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => damage(1)}>−1</button>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => damage(-1)}>+1</button>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => damage(-5)}>+5</button>
            <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setPlay({ hpDamage: 0 })}>full</button>
          </div>

          {/* Typed damage. The quick −5/−1 buttons stay for the common case; this is the entry that
              knows what hit you, so damage reduction and energy resistance can apply themselves. */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-divider)' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <input className="input" style={{ width: 58, padding: '3px 5px', textAlign: 'center', fontSize: 12 }} type="number" min={0}
                placeholder="dmg" value={incomingAmount} onChange={(e) => setIncomingAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') takeTypedDamage(); }} />
              <select className="input" style={{ width: 'auto', fontSize: 12, padding: '3px 5px' }} value={incomingKind}
                onChange={(e) => setIncomingKind(e.target.value as DamageKind)}>
                <option value="physical">physical</option>
                {ENERGY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                <option value="untyped">untyped / spell</option>
              </select>
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={takeTypedDamage}>Take</button>
              {/* Only the player knows what struck them, so a bypass is declared rather than derived. */}
              {bypassChoices.map((b) => {
                const on = !!bypassed[b];
                return (
                  <button key={b} onClick={() => setBypassed((p) => ({ ...p, [b]: !p[b] }))}
                    title={`The attack was ${b}, so it gets past that DR`}
                    style={{
                      fontSize: 10.5, padding: '2px 7px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                      border: `1px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                      background: on ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)' : 'transparent',
                      color: on ? 'var(--color-text)' : 'var(--color-neutral-500)',
                    }}>
                    {on ? '✓ ' : ''}{b}
                  </button>
                );
              })}
            </div>
            {(sheet.defenses.dr.length > 0 || sheet.defenses.resistances.length > 0 || sheet.defenses.absorb.length > 0) ? (
              <div className="text-muted" style={{ fontSize: 11, marginTop: 7 }}>
                {sheet.defenses.dr.map((d) => `DR ${d.amount}/${d.bypass} (${d.note})`)
                  .concat(sheet.defenses.resistances.map((r) => `resist ${r.type} ${r.amount} (${r.note})`))
                  .concat(sheet.defenses.absorb.map((a) => `absorb ${a.type} · ${a.remaining} left (${a.note})`))
                  .join(' · ')}
              </div>
            ) : (
              <div className="text-muted" style={{ fontSize: 11, marginTop: 7 }}>No damage reduction or resistance — typed damage applies in full.</div>
            )}
          </div>
        </div>

        {/* Quick defenses / offense (read-only from the sheet) */}
        <div className="mat-panel">
          <div className="micro" style={{ marginBottom: 10 }}>At a glance</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 8px' }}>
            {([['AC', 'ac', false], ['Touch', 'ac:touch', false], ['FF', 'ac:ff', false], ['BAB', 'bab', true], ['Init', 'init', true], ['CMD', 'cmd', false]] as const).map(([label, key, mod]) => {
              const st = sheet.stats[key]; if (!st) return null;
              const shown = mod ? fmtMod(st.total) : String(st.total);
              const open = statTip(key, shown);
              return (
                <div key={key} onMouseEnter={open} onMouseLeave={tip.leave} onClick={open} style={{ cursor: 'pointer' }}>
                  <div className="micro">{label}</div>
                  <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{shown}</div>
                </div>
              );
            })}
          </div>
          {/* Every casting class, since a multiclass caster has a separate caster level in each. */}
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 12 }}>
            Speed {sheet.speed.base} ft
            {sheet.casting.map((b) => ` · ${sheet.casting.length > 1 ? `${b.className} ` : ''}caster level ${b.casterLevel}`).join('')}
          </div>

          {/* Saving throws, folded into this panel. */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-divider)' }}>
            <div className="micro" style={{ marginBottom: 10 }}>Saving throws</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(['fort', 'ref', 'will'] as const).map((sv) => {
            const st = sheet.stats[`save:${sv}`];
            if (!st) return null;
            const open = statTip(`save:${sv}`, fmtMod(st.total));
            return (
              <div key={sv}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span onMouseEnter={open} onMouseLeave={tip.leave} onClick={open} style={{ cursor: 'pointer' }}>
                    <span className="micro">{st.label}</span>{' '}
                    <span className="num" style={{ fontSize: 20, fontWeight: 700 }}>{fmtMod(st.total)}</span>
                  </span>
                  <span style={{ flex: 1 }} />
                  <RollButton label="roll" title={`Roll ${st.label} at ${fmtMod(st.total)}`} onRoll={() => rollSavingThrow(sv)} />
                </div>
                {/* Conditional bonuses become switches here, because this is the one moment the
                    player knows whether the circumstance applies. Off by default — a bonus that
                    only sometimes applies must never be assumed. */}
                {st.conditional.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                    {st.conditional.map((c, i) => {
                      const key = extraKey(sv, i);
                      const on = !!saveExtras[key];
                      return (
                        <button key={key} onClick={() => setSaveExtras((p) => ({ ...p, [key]: !p[key] }))}
                          title={`${c.note}: ${fmtMod(c.value)} ${c.condition}`}
                          style={{
                            fontSize: 10.5, padding: '2px 7px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                            border: `1px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                            background: on ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)' : 'transparent',
                            color: on ? 'var(--color-text)' : 'var(--color-neutral-500)',
                          }}>
                          {on ? '✓ ' : ''}{fmtMod(c.value)} {c.condition}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Attacks (per equipped/carried weapon) */}
      {sheet.attacks.length > 0 && (
        <div className="mat-panel" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <div className="micro">Attacks</div>
            <span className="text-muted" style={{ fontSize: 11.5 }}>iteratives from BAB · weapon feats, enhancement and any declared option folded in · hover for the breakdown</span>
            <span style={{ flex: 1 }} />
            {/* Declared options: off by default, because a character who owns Power Attack but
                isn't using it should see their honest attack bonus. */}
            {/* `on` reflects what the engine actually applied, so a stale flag never shows as
                active while the attack lines ignore it. */}
            <OptionToggle label="Power Attack" on={play.powerAttack && sheet.combatOptions.canPowerAttack}
              disabled={!sheet.combatOptions.canPowerAttack}
              title={sheet.combatOptions.canPowerAttack ? 'Trade attack for damage on every melee attack' : 'Requires the Power Attack feat'}
              onClick={() => setPlay({ powerAttack: !play.powerAttack })} />
            <OptionToggle label="Two-weapon" on={play.twoWeapon && sheet.combatOptions.canTwoWeapon}
              disabled={!sheet.combatOptions.canTwoWeapon}
              title={sheet.combatOptions.canTwoWeapon ? 'Apply two-weapon penalties to both hands' : 'Requires a weapon in each hand'}
              onClick={() => setPlay({ twoWeapon: !play.twoWeapon })} />
            {/* Only meaningful when you have natural attacks: toggling it makes them all secondary. */}
            {sheet.attacks.some((a) => a.slot === 'natural') && (
              <OptionToggle label="+ weapon" on={!!play.naturalWithWeapon} disabled={false}
                title="Also attacking with a manufactured weapon this round — makes every natural attack secondary (−5 to hit, ½ Str)"
                onClick={() => setPlay({ naturalWithWeapon: !play.naturalWithWeapon })} />
            )}
            {/* Target's concealment, applied to every attack roll below until you change it back. */}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11 }}
              title="Concealment gives a hit a chance to miss anyway — rolled after each attack.">
              <span className="text-muted">Target</span>
              <select className="input" style={{ fontSize: 11, padding: '2px 5px' }} value={targetConcealment}
                onChange={(e) => setTargetConcealment(e.target.value as Concealment)}>
                <option value="none">in the open</option>
                <option value="concealment">concealed (20%)</option>
                <option value="total">total concealment (50%)</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sheet.attacks.map((atk) => {
              const label = attackLabel(atk.bonuses);
              const open = tip.card({
                kicker: atk.kind === 'ranged' ? 'Ranged attack' : 'Melee attack',
                title: `${atk.name} ${label}`,
                lines: atk.attackLines,
                body: `Damage ${atk.damage} · crit ${atk.crit} · ${atk.dmgType}${atk.range ? ` · range ${atk.range} ft` : ''}`,
                annotations: atk.notes,
              });
              return (
                <div key={`${atk.slot}:${atk.id}:${atk.mode ?? 'normal'}`} onMouseEnter={open} onMouseLeave={tip.leave} onClick={open}
                  style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', cursor: 'pointer', padding: '4px 0', borderBottom: '1px solid var(--color-divider)' }}>
                  <span style={{ width: 150, fontSize: 13.5, fontWeight: 500 }}>
                    {atk.qualityLabel && <span style={{ color: 'var(--color-accent-300)' }}>{atk.qualityLabel} </span>}
                    {atk.name}
                    {atk.slot !== 'main' && <span className="text-muted" style={{ fontSize: 10.5, marginLeft: 5 }}>{atk.slot === 'off' ? 'off-hand' : atk.slot === 'natural' ? 'natural' : 'carried'}</span>}
                  </span>
                  <span className="num" style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-accent-300)', minWidth: 84 }}>{label}</span>
                  <span className="num" style={{ fontSize: 13 }}>{atk.damage}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>{atk.crit} · {atk.dmgType}{atk.kind === 'ranged' && atk.range ? ` · ${atk.range} ft` : ''}</span>
                  {atk.properties?.map((p) => (
                    <span key={p} className="tag tag-neutral" style={{ fontSize: 10 }}>{p}</span>
                  ))}
                  <span style={{ flex: 1 }} />
                  {/* Rolling must not also open the breakdown card, hence stopPropagation. */}
                  <RollButton label="d20" title={`Roll to hit at ${fmtMod(atk.bonuses[0])}`}
                    onRoll={() => rollAttackLine(atk.name, atk.bonuses[0], atk.crit)} />
                  <RollButton label="dmg" title={`Roll ${atk.damage}`}
                    onRoll={() => rollDamageFor(`${atk.name} damage`, atk.damage)} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Roll log */}
      {rolls.length > 0 && (
        <div className="mat-panel" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <div className="micro">Rolls</div>
            <span className="text-muted" style={{ fontSize: 11.5 }}>most recent first · this session only, not saved with the character</span>
            <span style={{ flex: 1 }} />
            <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setRolls([])}>clear</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {rolls.map((r) => (
              <div key={r.key} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 12.5 }}>
                <span style={{ minWidth: 190 }}>{r.source}</span>
                <span className="text-muted num" style={{ fontSize: 11.5, flex: 1 }}>{r.detail}</span>
                {r.outcome === 'threat' && <span className="tag" style={{ fontSize: 10, color: 'var(--color-accent-300)' }}>threat</span>}
                {r.outcome === 'success' && <span className="tag" style={{ fontSize: 10, color: 'var(--color-accent-300)' }}>save</span>}
                {r.outcome === 'fumble' && <span className="tag" style={{ fontSize: 10, color: 'var(--err)' }}>natural 1</span>}
                {r.outcome === 'failure' && <span className="tag" style={{ fontSize: 10, color: 'var(--err)' }}>failed</span>}
                {r.outcome === 'miss' && <span className="tag" style={{ fontSize: 10, color: 'var(--err)' }}>concealment miss</span>}
                <span className="num" style={{ fontSize: 16, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{r.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* One panel per casting class. A multiclass caster tracks each class separately, because
          the slots, the preparation and the recovery are all per class. */}
      {sheet.casting.filter((b) => b.slots?.some((n) => n > 0)).map((block) => {
        const cls = block.classId;
        const slots = block.slots ?? [];
        const isPrepared = block.kind !== 'spontaneous';
        const title = sheet.casting.length > 1
          ? `${block.className} — ${isPrepared ? 'prepared spells' : 'spell slots / day'}`
          : (isPrepared ? 'Prepared spells' : 'Spell slots / day');
        return (
          <div key={cls} className="mat-panel" style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <div className="micro">{title}</div>
              <span className="text-muted" style={{ fontSize: 11.5 }}>
                {dcNoteFor(block.dcBase)}
                {!isPrepared && ' · tap a pip to expend'}
                {isPrepared && block.preparedPerLevel && ' · prepare from your spellbook, then spend a casting from the pips — any prepared spell, any slot · cantrips at-will'}
                {isPrepared && !block.preparedPerLevel &&
                  ` · ${block.kind === 'prepared-book' ? 'prepare from your spellbook' : 'prepare from your class list'}, then tick as cast · cantrips at-will`}
              </span>
            </div>

            {!isPrepared && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {slots.map((total, level) => {
                  if (total <= 0) return null;
                  const used = usedAt(cls, level);
                  return (
                    <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="micro" style={{ width: 62 }}>{level === 0 ? 'Cantrips' : `Level ${SPELL_LEVEL(level)}`}</span>
                      {level === 0 ? (
                        <span className="text-muted" style={{ fontSize: 12 }}>at will</span>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {Array.from({ length: total }).map((_, i) => {
                              const spent = i < used;
                              return (
                                <button key={i} title={spent ? 'restore' : 'expend'}
                                  onClick={() => setUsed(cls, level, spent ? i : i + 1)}
                                  style={{ width: 22, height: 22, borderRadius: 6, cursor: 'pointer', border: '1px solid var(--color-divider)', background: spent ? 'transparent' : 'var(--color-accent)', opacity: spent ? 0.5 : 1 }} />
                              );
                            })}
                          </div>
                          <span className="num text-muted" style={{ fontSize: 12 }}>{total - used}/{total}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Spontaneous casters apply metamagic at cast time: pick a spell + the feats you own,
                and it spends a slot of the raised effective level. */}
            {!isPrepared && ownedMeta.length > 0 && (
              <MetamagicSpontaneousTool
                block={block} ownedMeta={ownedMeta}
                usedAt={(l) => usedAt(cls, l)}
                spend={(l) => setUsed(cls, l, usedAt(cls, l) + 1)}
                rollDamageFor={rollDamageFor}
                dmgModsFrom={dmgModsFrom}
                saveDc={(sp, dcLevel) => spellSaveDcFor(sp, block.dcBase, dcLevel)}
              />
            )}

            {isPrepared && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {slots.map((perDay, level) => {
                  if (perDay <= 0 || level === 0) return null;
                  // With metamagic, a lower-level spell can be raised to fill this slot, so the pool
                  // opens up to every base level ≤ this slot's level.
                  const pool = ownedMeta.length ? preparablePoolUpTo(cls, level) : preparablePool(cls, level);
                  const csList = classById.get(cls)?.spellcasting?.list;
                  const prep = preparedAt(cls, level);
                  const cast = new Set(castAt(cls, level));
                  // The arcanist prepares one number of spells and casts a different number of
                  // times, so it gets a prepare list sized by the prepared count plus its own
                  // slot pips. Every other prepared caster spends the preparation itself.
                  const prepCount = block.preparedPerLevel?.[level] ?? perDay;
                  const splitPool = !!block.preparedPerLevel;
                  const used = usedAt(cls, level);
                  return (
                    <div key={level}>
                      <div className="micro" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span>
                          Level {level} · <span className="num">{splitPool ? perDay - used : perDay - cast.size}</span>/{perDay} {splitPool ? 'castings left' : 'unspent'}
                        </span>
                        {splitPool && (
                          <span style={{ display: 'flex', gap: 4 }}>
                            {Array.from({ length: perDay }).map((_, i) => {
                              const spent = i < used;
                              return (
                                <button key={i} title={spent ? 'restore' : 'expend a casting'}
                                  onClick={() => setUsed(cls, level, spent ? i : i + 1)}
                                  style={{ width: 16, height: 16, borderRadius: 5, cursor: 'pointer', border: '1px solid var(--color-divider)', background: spent ? 'transparent' : 'var(--color-accent)', opacity: spent ? 0.5 : 1 }} />
                              );
                            })}
                          </span>
                        )}
                        {splitPool && <span className="text-muted" style={{ textTransform: 'none' }}>{prepCount} prepared</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                        {Array.from({ length: prepCount }).map((_, i) => {
                          const casted = !splitPool && cast.has(i);
                          const filled = !!prep[i];
                          const sp = prep[i] ? spellById.get(prep[i]!) : undefined;
                          const dmg = sp ? spellDamageAt(sp, block.casterLevel) : null;
                          const applied = ownedMeta.length ? preparedMetaAt(cls, level, i) : [];
                          const baseLvl = sp && csList ? spellLevelOn(sp, csList) : null;
                          // Heighten fills a slot up to its own level; other metamagic add flat levels.
                          const eff = baseLvl != null ? effectiveSpellLevel(baseLvl, applied, level) : null;
                          const overSlot = eff != null && eff > level;
                          // The save DC follows only Heighten (which fills to this slot's level); the
                          // damage roll follows Empower/Maximize. Both are the metamagic "payoff".
                          const dmgMods = dmgModsFrom(applied);
                          const dcLevel = baseLvl != null ? dcSpellLevel(baseLvl, applied, level) : null;
                          const dc = sp && dcLevel != null ? spellSaveDcFor(sp, block.dcBase, dcLevel) : null;
                          return (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <select className="input" style={{ flex: 1, padding: '4px 6px', fontSize: 12, opacity: casted ? 0.5 : 1, textDecoration: casted ? 'line-through' : 'none' }}
                                value={prep[i] ?? ''} onChange={(e) => setPreparedAt(cls, level, i, e.target.value)}>
                                <option value="">— empty —</option>
                                {pool.map((s) => <option key={s.id} value={s.id}>{s.name}{ownedMeta.length && csList && spellLevelOn(s, csList) !== level ? ` (L${spellLevelOn(s, csList)})` : ''}</option>)}
                              </select>
                              {dmg && (
                                <RollButton label={`${dmg.formula}${dmgMods.maximize ? ' ✦' : dmgMods.empower ? ' ½+' : ''}`}
                                  title={`Roll ${dmg.formula} ${dmg.label}${dmg.note ? ` — ${dmg.note}` : ''}${dmgMods.maximize ? ' — maximized' : ''}${dmgMods.empower ? ' — empowered (+half)' : ''}`}
                                  onRoll={() => rollDamageFor(`${sp!.name} ${dmg.label}${dmg.note ? ` (${dmg.note})` : ''}`, dmg.formula, dmgMods)} />
                              )}
                              {!splitPool && (
                                <button className="btn btn-ghost" style={{ fontSize: 11, flex: 'none', color: casted ? 'var(--color-accent-300)' : undefined }}
                                  disabled={!filled}
                                  title={casted ? 'restore' : (sp?.buff || sp?.attacker) ? 'mark cast and start its running effect' : 'mark cast'}
                                  onClick={() => {
                                    // Casting a buff or a self-directed attacker starts its running
                                    // effect as well as spending the casting — always together.
                                    if (!casted && (sp?.buff || sp?.attacker)) castRunning(sp.id);
                                    toggleCast(cls, level, i);
                                  }}>
                                  {casted ? '↺' : 'cast'}
                                </button>
                              )}
                              </div>
                              {/* Metamagic chips: toggle the feats you own onto this prepared spell. A
                                  lower-level spell raised to this slot's level "fits"; over it warns. */}
                              {ownedMeta.length > 0 && filled && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', paddingLeft: 2 }}>
                                  {ownedMeta.map((m) => {
                                    const on = applied.includes(m.id);
                                    return (
                                      <button key={m.id} title={`${m.name} Spell — ${m.desc}${m.levelAdj ? ` (+${m.levelAdj})` : ''}`}
                                        onClick={() => togglePreparedMeta(cls, level, i, m.id)}
                                        style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                                          border: `1px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                                          background: on ? 'var(--color-accent)' : 'transparent', color: on ? '#fff' : 'var(--color-neutral-400)' }}>
                                        {m.name}
                                      </button>
                                    );
                                  })}
                                  {applied.length > 0 && (
                                    <span style={{ fontSize: 10.5, color: overSlot ? 'var(--warn)' : 'var(--color-neutral-500)' }}>
                                      {overSlot ? `needs a level-${eff} slot` : `effective L${eff}`}
                                    </span>
                                  )}
                                  {dc != null && (
                                    <span style={{ fontSize: 10.5, color: 'var(--color-neutral-500)' }} title="10 + casting ability + effective spell level (Heighten only) + Spell Focus">
                                      save DC {dc}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {(() => {
                        // The one restricted bonus slot (domain / specialty school) for this level.
                        const bs = block.bonusSlot;
                        if (!bs) return null;
                        const options = bonusPool(block, level);
                        // A domain with no spell authored at this level offers no bonus slot yet.
                        if (bs.kind === 'domain' && options.length === 0) return null;
                        const cur = preparedBonusAt(cls, level);
                        const casted = castBonusAt(cls, level);
                        const sp = cur ? spellById.get(cur) : undefined;
                        const dmg = sp ? spellDamageAt(sp, block.casterLevel) : null;
                        return (
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="micro" style={{ minWidth: 62, color: 'var(--color-accent-300)' }} title={`Bonus ${bs.kind} slot — restricted to a ${bs.kind === 'domain' ? 'domain' : bs.school} spell`}>+ {bs.label}</span>
                            <select className="input" style={{ flex: 1, maxWidth: 240, padding: '4px 6px', fontSize: 12, opacity: casted ? 0.5 : 1, textDecoration: casted ? 'line-through' : 'none' }}
                              value={cur} onChange={(e) => setPreparedBonus(cls, level, e.target.value)}>
                              <option value="">— {bs.kind === 'domain' ? 'domain' : bs.school} spell —</option>
                              {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                            {dmg && (
                              <RollButton label={dmg.formula} title={`Roll ${dmg.formula} ${dmg.label}${dmg.note ? ` — ${dmg.note}` : ''}`}
                                onRoll={() => rollDamageFor(`${sp!.name} ${dmg.label}${dmg.note ? ` (${dmg.note})` : ''}`, dmg.formula)} />
                            )}
                            <button className="btn btn-ghost" style={{ fontSize: 11, flex: 'none', color: casted ? 'var(--color-accent-300)' : undefined }}
                              disabled={!cur}
                              title={casted ? 'restore' : (sp?.buff || sp?.attacker) ? 'mark cast and start its running effect' : 'mark cast'}
                              onClick={() => {
                                if (!casted && (sp?.buff || sp?.attacker)) castRunning(sp.id);
                                toggleCastBonus(cls, level);
                              }}>
                              {casted ? '↺' : 'cast'}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}

            {block.kind === 'prepared-book' && Object.values(spellbook).flat().length === 0 && (
              <p className="text-muted" style={{ fontSize: 11.5, marginTop: 10 }}>Your spellbook is empty — add spells in the builder's Spells step, then prepare them here.</p>
            )}
          </div>
        );
      })}

      {/* Resource pools */}
      {pools.length > 0 && (
        <div className="mat-panel" style={{ marginTop: 18 }}>
          <div className="micro" style={{ marginBottom: 12 }}>Resources</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pools.map((pool) => {
              const used = usedPoolAt(pool.id);
              const remaining = pool.max - used;
              return (
                <div key={pool.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ width: 148, fontSize: 13, fontWeight: 500 }}>{pool.name}</span>
                  {pool.max <= 10 ? (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {Array.from({ length: pool.max }).map((_, i) => {
                        const spent = i < used;
                        return (
                          <button key={i} title={spent ? 'restore' : 'spend'}
                            onClick={() => setUsedPool(pool.id, spent ? i : i + 1, pool.max)}
                            style={{ width: 22, height: 22, borderRadius: 6, cursor: 'pointer', border: '1px solid var(--color-divider)', background: spent ? 'transparent' : 'var(--color-accent)', opacity: spent ? 0.5 : 1 }} />
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <button className="stepper" style={{ width: 26, height: 26 }} disabled={remaining <= 0} onClick={() => adjustPool(pool.id, 1, pool.max)}>−</button>
                      <button className="stepper" style={{ width: 26, height: 26 }} disabled={used <= 0} onClick={() => adjustPool(pool.id, -1, pool.max)}>+</button>
                    </div>
                  )}
                  <span className="num" style={{ fontSize: 14, fontWeight: 600, color: remaining <= 0 ? 'var(--warn-fg)' : undefined }}>{remaining}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>/ {pool.max} {pool.unit}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inventory (phase 5) */}
      {sheet.inventory.length > 0 && (
        <div className="mat-panel" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <div className="micro">Inventory</div>
            <span className="text-muted" style={{ fontSize: 11.5 }}>
              carrying <span className="num" style={{ color: sheet.load.label === 'Light' ? 'var(--color-accent-300)' : 'var(--warn-fg)' }}>{sheet.load.current} lb</span>
              {' · '}{sheet.load.label.toLowerCase()} load (light ≤{sheet.load.light}, medium ≤{sheet.load.medium}, heavy ≤{sheet.load.heavy})
              {sheet.speed.reducedFrom ? ` · speed ${sheet.speed.base} ft` : ''}
            </span>
            <span style={{ flex: 1 }} />
            <button className="btn btn-ghost" style={{ fontSize: 11 }} title="Refill consumables and recharge to the amounts on your build"
              onClick={() => applyClock(restock)}>Restock</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {sheet.inventory.map((it) => {
              const out = it.consumable && it.qty === 0;
              return (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, opacity: out ? 0.5 : 1 }}>
                  <span style={{ minWidth: 200, fontWeight: 500 }}>
                    {it.name}
                    {it.equipped && <span className="tag tag-neutral" style={{ fontSize: 9.5, marginLeft: 6 }}>{it.equipped === 'main' ? 'wielded' : it.equipped === 'off' ? 'off-hand' : it.equipped}</span>}
                    {it.properties?.map((p) => (
                      <span key={p} className="tag tag-neutral" style={{ fontSize: 9.5, marginLeft: 4 }}>{p}</span>
                    ))}
                  </span>

                  {it.charges ? (
                    <>
                      <span className="num" style={{ minWidth: 62, color: it.charges.remaining <= 5 ? 'var(--warn-fg)' : 'var(--color-accent-300)' }}>
                        {it.charges.remaining}/{it.charges.max}
                      </span>
                      <button className="btn btn-secondary" style={{ fontSize: 11 }} disabled={it.charges.remaining <= 0}
                        onClick={() => applyClock((p) => spendCharges(p, it.id, 1, it.charges!.remaining))}>use charge</button>
                      <button className="btn btn-ghost" style={{ fontSize: 11 }} disabled={it.charges.remaining >= it.charges.max}
                        onClick={() => applyClock((p) => restoreCharges(p, it.id, 1))}>+1</button>
                    </>
                  ) : it.consumable ? (
                    <>
                      <span className="num" style={{ minWidth: 62, color: out ? 'var(--warn-fg)' : undefined }}>{it.qty}/{it.purchased}</span>
                      <button className="btn btn-secondary" style={{ fontSize: 11 }} disabled={it.qty <= 0}
                        onClick={() => applyClock((p) => consume(p, it.id, 1, it.qty))}>use</button>
                      <button className="btn btn-ghost" style={{ fontSize: 11 }} disabled={it.qty >= it.purchased}
                        onClick={() => applyClock((p) => unconsume(p, it.id, 1))}>+1</button>
                    </>
                  ) : (
                    <span className="num text-muted" style={{ minWidth: 62 }}>×{it.qty}</span>
                  )}

                  <span style={{ flex: 1 }} />
                  {it.note && <span className="text-muted" style={{ fontSize: 11 }}>{it.note}</span>}
                  <span className="num text-muted" style={{ fontSize: 11.5, minWidth: 52, textAlign: 'right' }}>{it.weight} lb</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conditions */}
      <div className="mat-panel" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div className="micro">Conditions</div>
          {conditions.length > 0 && <span className="text-muted" style={{ fontSize: 11.5 }}>active penalties are folded into the stats above</span>}
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {CONDITIONS.map((c) => {
            const on = conditions.includes(c.id);
            const t = on ? timerFor(c.id) : undefined;
            return (
              <button key={c.id} onClick={() => toggleCondition(c.id)} title={c.desc}
                style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1px solid ${on ? 'var(--warn-fg)' : 'var(--color-divider)'}`,
                  background: on ? 'var(--warn)' : 'transparent',
                  color: on ? 'var(--warn-fg)' : 'var(--color-text)' }}>
                {c.name}
                {t && <span className="num" style={{ marginLeft: 6, fontSize: 10.5, opacity: 0.85 }}>⏱ {durationLabel(t.remaining)}</span>}
              </button>
            );
          })}
        </div>
        {conditions.length > 0 && (
          <div style={{ fontSize: 11.5, color: 'var(--color-neutral-400)', marginTop: 10, lineHeight: 1.6 }}>
            {conditions.map((id) => conditionById.get(id)?.desc).filter(Boolean).join(' ')}
          </div>
        )}
      </div>

      {/* Skills (trained) */}
      {trainedSkills.length > 0 && (
        <div className="mat-panel" style={{ marginTop: 18 }}>
          <div className="micro" style={{ marginBottom: 10 }}>Skills</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {trainedSkills.map((sid) => {
              const shown = fmtMod(sheet.stats[`skill:${sid}`]?.total ?? 0);
              const open = statTip(`skill:${sid}`, shown);
              return (
                <span key={sid} onMouseEnter={open} onMouseLeave={tip.leave} onClick={open}
                  style={{ padding: '5px 11px', borderRadius: 999, fontSize: 12.5, background: 'var(--color-neutral-800)', cursor: 'pointer' }}>
                  {skillById.get(sid)?.name} <span className="num" style={{ fontWeight: 600, color: 'var(--color-accent-300)' }}>{shown}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Senses & innate abilities — a reminder for the things that are easy to forget you have:
          racial senses (badges) and innate spell-like abilities (daily uses tracked like a pool). */}
      {(sheet.senses.length > 0 || sheet.spellLikeAbilities.length > 0) && (
        <div className="mat-panel" style={{ marginTop: 18 }}>
          <div className="micro" style={{ marginBottom: 12 }}>Senses &amp; innate abilities</div>
          {sheet.senses.length > 0 && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: sheet.spellLikeAbilities.length > 0 ? 14 : 0 }}>
              {sheet.senses.map((s) => (
                <span key={s} style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, border: '1px solid var(--color-divider)', color: 'var(--color-text)' }}>{s}</span>
              ))}
            </div>
          )}
          {sheet.spellLikeAbilities.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sheet.spellLikeAbilities.map((sla) => {
                const atWill = sla.uses === 'at-will';
                const max = atWill ? 0 : (sla.uses as number);
                const used = usedPoolAt(sla.id);
                // When the SLA names a spell we have, its name opens the spell's card and we show the
                // computed caster level and (for spells with a save) the DC.
                const sp = sla.spellId ? spellById.get(sla.spellId) : undefined;
                const open = sp ? tip.card({
                  kicker: 'Spell-like ability', title: sp.name,
                  body: `${sp.summary} · ${sp.range} · ${sp.dur}${sp.save && !/^none$/i.test(sp.save) ? ` · ${sp.save}` : ''}`,
                  annotations: [sp.desc],
                }) : undefined;
                return (
                  <div key={sla.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span className={sp ? 'term' : undefined} style={{ minWidth: 150, fontSize: 13, fontWeight: 500, cursor: sp ? 'pointer' : undefined }}
                      {...(open ? { onMouseEnter: open, onMouseLeave: tip.leave, onClick: open } : {})}>{sla.name}</span>
                    {atWill ? (
                      <span className="text-muted" style={{ fontSize: 12 }}>at will</span>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {Array.from({ length: max }).map((_, i) => {
                            const spent = i < used;
                            return (
                              <button key={i} title={spent ? 'restore' : 'use'} onClick={() => setUsedPool(sla.id, spent ? i : i + 1, max)}
                                style={{ width: 22, height: 22, borderRadius: 6, cursor: 'pointer', border: '1px solid var(--color-divider)', background: spent ? 'transparent' : 'var(--color-accent)', opacity: spent ? 0.5 : 1 }} />
                            );
                          })}
                        </div>
                        <span className="num text-muted" style={{ fontSize: 12 }}>{max - used}/{max} per day</span>
                      </>
                    )}
                    <span className="num text-muted" style={{ fontSize: 11.5 }}>CL {sla.casterLevel}{sla.saveDc !== undefined ? ` · save DC ${sla.saveDc}` : ''}</span>
                    <span className="text-muted" style={{ fontSize: 11.5 }}>
                      {sla.source}{sla.note ? ` · ${sla.note}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-muted" style={{ fontSize: 11, marginTop: 12 }}>Spell-like abilities behave as the named spell; daily uses reset on Rest.</p>
        </div>
      )}

      <p className="text-muted" style={{ fontSize: 11, marginTop: 16 }}>Play state (HP, conditions, resources, prepared/expended spells) is saved with the character. Rest clears damage, resources, and cast spells.</p>
    </div>
  );
}

/** A declared combat option (Power Attack, two-weapon fighting): a pressed-in toggle whose
 *  state is part of play, not the build. Disabled when the character can't take the option. */
/** A small die button. Rolling sits inside a row that opens a breakdown card on click, so the
 *  event has to stop there — otherwise every roll also pops a tooltip over the log. */
/** Spontaneous casters apply metamagic at cast time: pick a known spell, toggle the metamagic feats
 *  you own, and spend a slot of the raised effective level (blocked when it exceeds your max level
 *  or no such slot is free). */
function MetamagicSpontaneousTool({ block, ownedMeta, usedAt, spend, rollDamageFor, dmgModsFrom, saveDc }: {
  block: CastingBlock;
  ownedMeta: MetamagicDef[];
  usedAt: (level: number) => number;
  spend: (level: number) => void;
  rollDamageFor: (source: string, formula: string, meta: MetamagicDamageMods) => void;
  dmgModsFrom: (metaIds: readonly string[]) => MetamagicDamageMods;
  saveDc: (sp: (typeof SPELLS)[number], dcLevel: number) => number | null;
}) {
  const [spellId, setSpellId] = useState('');
  const [applied, setApplied] = useState<string[]>([]);
  const [heightenTo, setHeightenTo] = useState<number | ''>('');
  const list = classById.get(block.classId)?.spellcasting?.list;
  const slots = block.slots ?? [];
  const maxLevel = slots.reduce((m, n, l) => (n > 0 ? l : m), 0);
  const options = list
    ? SPELLS.filter((s) => s.lists.includes(list as never) && spellLevelOn(s, list) >= 1 && spellLevelOn(s, list) <= maxLevel)
        .slice().sort((a, b) => spellLevelOn(a, list) - spellLevelOn(b, list) || a.name.localeCompare(b.name))
    : [];
  const sp = spellId ? spellById.get(spellId) : undefined;
  const base = sp && list ? spellLevelOn(sp, list) : null;
  const heightenOn = applied.includes('heighten-spell');
  const heightenTarget = heightenOn && heightenTo !== '' ? Number(heightenTo) : undefined;
  const eff = base != null ? effectiveSpellLevel(base, applied, heightenTarget) : null;
  const overCap = eff != null && eff > maxLevel;
  const noSlot = eff != null && !overCap && usedAt(eff) >= (slots[eff] ?? 0);
  const canCast = eff != null && eff >= 1 && !overCap && !noSlot;
  const toggle = (mid: string) => setApplied((a) => (a.includes(mid) ? a.filter((x) => x !== mid) : [...a, mid]));
  // The metamagic payoff for this cast: Empower/Maximize on the damage roll, and the save DC that
  // Heighten (and only Heighten) raises.
  const dmgMods = dmgModsFrom(applied);
  const dmg = sp ? spellDamageAt(sp, block.casterLevel) : null;
  const dc = sp && base != null ? saveDc(sp, dcSpellLevel(base, applied, heightenTarget)) : null;
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-divider)' }}>
      <div className="micro" style={{ marginBottom: 6 }}>Cast with metamagic</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <select className="input" style={{ padding: '4px 6px', fontSize: 12, minWidth: 160 }} value={spellId} onChange={(e) => setSpellId(e.target.value)}>
          <option value="">— pick a spell —</option>
          {options.map((s) => <option key={s.id} value={s.id}>{s.name} (L{spellLevelOn(s, list!)})</option>)}
        </select>
        {ownedMeta.map((m) => {
          const on = applied.includes(m.id);
          return (
            <button key={m.id} title={`${m.name} Spell — ${m.desc}${m.levelAdj ? ` (+${m.levelAdj})` : ''}`} onClick={() => toggle(m.id)}
              style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                background: on ? 'var(--color-accent)' : 'transparent', color: on ? '#fff' : 'var(--color-neutral-400)' }}>
              {m.name}
            </button>
          );
        })}
        {heightenOn && (
          <label style={{ fontSize: 11, color: 'var(--color-neutral-400)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            to L<input type="number" className="input" min={base ?? 1} max={maxLevel} value={heightenTo}
              onChange={(e) => setHeightenTo(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: 44, padding: '2px 4px', fontSize: 11 }} />
          </label>
        )}
        {eff != null && (
          <span style={{ fontSize: 11.5, color: overCap || noSlot ? 'var(--warn)' : 'var(--color-neutral-400)' }}>
            → {overCap ? `L${eff} exceeds your max (L${maxLevel})` : `spends a level-${eff} slot${noSlot ? ' (none left)' : ''}`}
          </span>
        )}
        {dc != null && (
          <span style={{ fontSize: 11.5, color: 'var(--color-neutral-400)' }} title="10 + casting ability + effective spell level (Heighten only) + Spell Focus">
            save DC {dc}
          </span>
        )}
        {dmg && (
          <RollButton label={`${dmg.formula}${dmgMods.maximize ? ' ✦' : dmgMods.empower ? ' ½+' : ''}`}
            title={`Roll ${dmg.formula} ${dmg.label}${dmg.note ? ` — ${dmg.note}` : ''}${dmgMods.maximize ? ' — maximized' : ''}${dmgMods.empower ? ' — empowered (+half)' : ''}`}
            onRoll={() => rollDamageFor(`${sp!.name} ${dmg.label}${dmg.note ? ` (${dmg.note})` : ''}`, dmg.formula, dmgMods)} />
        )}
        <button className="btn btn-secondary" style={{ fontSize: 11.5 }} disabled={!canCast}
          onClick={() => { if (eff != null) spend(eff); }}>
          Spend slot
        </button>
      </div>
    </div>
  );
}

function RollButton({ label, title, onRoll }: { label: string; title: string; onRoll: () => void }) {
  return (
    <button className="btn btn-ghost" title={title}
      onClick={(e) => { e.stopPropagation(); onRoll(); }}
      onMouseEnter={(e) => e.stopPropagation()}
      style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 999, flex: 'none',
        border: '1px solid rgba(233,233,237,.14)', color: 'var(--color-neutral-400)',
      }}>
      🎲 {label}
    </button>
  );
}

function OptionToggle({ label, on, disabled, title, onClick }: {
  label: string; on: boolean; disabled: boolean; title: string; onClick: () => void;
}) {
  return (
    <button className="btn btn-ghost" title={title} disabled={disabled} onClick={onClick}
      style={{
        fontSize: 11, padding: '3px 9px', borderRadius: 999,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: on ? 'var(--color-accent-300)' : 'transparent',
        color: on ? 'var(--color-bg)' : 'var(--color-neutral-500)',
        border: `1px solid ${on ? 'var(--color-accent-300)' : 'rgba(233,233,237,.14)'}`,
      }}>
      {on ? '● ' : ''}{label}
    </button>
  );
}
