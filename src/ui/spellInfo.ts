import type { SpellDef } from '../content/model';
import type { TipCard } from './Tooltip';

/** True when a spell's save entry means "there is nothing to roll" — worth hiding rather than
 *  spending part of a compact stat line on the word "none". */
function hasSave(sp: SpellDef): boolean {
  return !!sp.save && !/^none/i.test(sp.save.trim());
}

/** The at-a-glance line that sits under a spell's name wherever it is picked or listed:
 *  what it costs to cast, how far it reaches, how long it lasts, and what the target rolls. */
export function spellStatLine(sp: SpellDef): string {
  return [sp.cast, sp.range, sp.dur, hasSave(sp) ? sp.save : null].filter(Boolean).join(' · ');
}

/** The hover/tap card for a spell: summary and stat line up top, full rules text below. Used
 *  everywhere a spell is named but there is no room for the description inline. */
export function spellCard(sp: SpellDef, kicker = 'Spell', levelLabel?: string): TipCard {
  return {
    kicker: levelLabel ? `${kicker} · ${levelLabel}` : kicker,
    title: sp.name,
    body: `${sp.summary} · ${spellStatLine(sp)}`,
    annotations: [sp.desc],
  };
}

/** "cantrip" / "level 2" — the spell's level on the caster's own list, spelled out. */
export function spellLevelLabel(level: number): string {
  return level === 0 ? 'cantrip' : `level ${level}`;
}
