import type { Ability, Alignment, Predicate } from './types';

/** The slice of resolved character state predicates evaluate against. */
export interface PredicateCtx {
  abilities: Record<Ability, number>; // final scores
  bab: number;
  featIds: string[];
  raceId: string | null;
  classId: string | null;
  alignment: Alignment | null;
  casterLevel: number;
  skillRanks: Record<string, number>;
}

export function evalPredicate(p: Predicate, ctx: PredicateCtx): boolean {
  if ('all' in p) return p.all.every((q) => evalPredicate(q, ctx));
  if ('any' in p) return p.any.some((q) => evalPredicate(q, ctx));
  if ('not' in p) return !evalPredicate(p.not, ctx);
  if ('ability' in p) return ctx.abilities[p.ability] >= p.gte;
  if ('bab' in p) return ctx.bab >= p.bab;
  if ('feat' in p) return ctx.featIds.includes(p.feat);
  if ('race' in p) return ctx.raceId === p.race;
  if ('classId' in p) return ctx.classId === p.classId;
  if ('casterLevel' in p) return ctx.casterLevel >= p.casterLevel;
  if ('alignment' in p) return ctx.alignment !== null && p.alignment.includes(ctx.alignment);
  if ('skillRanks' in p) return (ctx.skillRanks[p.skillRanks.skill] ?? 0) >= p.skillRanks.gte;
  return true;
}

/** Human-readable failure text for whyNot strings: describes the first failing clause. */
export function explainFailure(p: Predicate, ctx: PredicateCtx, names: (id: string) => string): string | null {
  if (evalPredicate(p, ctx)) return null;
  if ('all' in p) {
    for (const q of p.all) {
      const e = explainFailure(q, ctx, names);
      if (e) return e;
    }
    return 'requirements not met';
  }
  if ('any' in p) {
    const parts = p.any.map((q) => explainFailure(q, ctx, names) ?? 'requirement').filter(Boolean);
    return parts.join(' or ');
  }
  if ('not' in p) return 'not available for this selection';
  if ('ability' in p) {
    const label = p.ability.charAt(0).toUpperCase() + p.ability.slice(1);
    return `Requires ${label} ${p.gte} — you have ${ctx.abilities[p.ability]}`;
  }
  if ('bab' in p) return `Requires BAB +${p.bab} — you have +${ctx.bab}`;
  if ('feat' in p) return `Requires ${names(p.feat)}`;
  if ('race' in p) return `Requires race: ${names(p.race)}`;
  if ('classId' in p) return `Requires class: ${names(p.classId)}`;
  if ('casterLevel' in p) return `Requires caster level ${p.casterLevel}`;
  if ('alignment' in p) return `Requires alignment ${p.alignment.join(' / ')}`;
  if ('skillRanks' in p)
    return `Requires ${p.skillRanks.gte} ranks in ${names(p.skillRanks.skill)}`;
  return 'requirements not met';
}
