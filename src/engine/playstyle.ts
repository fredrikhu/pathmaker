// Assemble a "how to play this character" brief from a build fingerprint.
//
// Pure selection and ordering over the authored fragments in content/playstyle.ts. No text is
// written here and no rule is computed here — this module decides which of the authored pieces
// apply to this build, in what order, and how many of them a reader will actually tolerate.
//
// The hard part is not selection but restraint. A level-12 character matches a great many tags,
// and printing all of them produces a wall nobody reads. Every section below is capped, and the
// caps are the reason the output stays a brief rather than a catalogue.

import type { BuildFingerprint, CombatRole, Gap } from './fingerprint';
import {
  CLASS_PLAYSTYLE, GAP_TEXT, LEAN_TEXT, PARTY_TEXT, POOL_PACING_TEXT, POOL_TEXT, POSTURE_TEXT,
  ROLE_TEXT, STRENGTH_TEXT, STYLE_TEXT, THEME_TEXT,
} from '../content/playstyle';

export type BriefSectionId = 'job' | 'round' | 'edge' | 'risk' | 'between';

export interface BriefSection {
  id: BriefSectionId;
  title: string;
  /** Paragraphs, already in reading order. Never empty — a section with nothing to say is
   *  dropped instead of rendered blank. */
  body: string[];
}

export interface PlaystyleBrief {
  /** One sentence naming what this character is. */
  identity: string;
  sections: BriefSection[];
}

/** Which role leads the description when a build holds several. Commander is deliberately last:
 *  having a companion is additive to whatever else you are, not a replacement for it. */
const ROLE_PRIORITY: CombatRole[] = ['frontline', 'controller', 'artillery', 'support', 'skirmisher', 'commander'];

/** Gaps in the order a player needs to hear them. A save that removes you from the fight outranks
 *  a missing skill, and being unable to act at all outranks both. */
const GAP_PRIORITY: Gap[] = [
  'no-ranged-option', 'no-melee-option',
  'weak-will', 'weak-ref', 'weak-fort',
  'ability-hungry', 'thin-skills', 'no-healing', 'no-trapfinder',
];

// Caps. Chosen so the whole brief stays roughly a screen: past this, readers skim and the useful
// lines get lost among the true-but-unremarkable ones.
const MAX_EDGE = 5;
const MAX_RISK = 4;
const MAX_POOLS = 2;

const cap = <T>(xs: T[], n: number): T[] => xs.slice(0, n);

/** Order `have` by `priority`, dropping anything not listed. */
function ranked<T>(have: readonly T[], priority: readonly T[]): T[] {
  return priority.filter((p) => have.includes(p));
}

function identityLine(fp: BuildFingerprint): string {
  // Name at most two classes: a third is a build so unusual that a generic sentence would be
  // wrong about it anyway, and the class blocks below still describe the primary one.
  const named = [...fp.classes]
    .sort((a, b) => b.levels - a.levels)
    .map((c) => CLASS_PLAYSTYLE[c.id]?.identity)
    .filter((s): s is string => !!s);
  const who = named.length === 0 ? 'an adventurer' : cap(named, 2).join(' and ');
  const clause = STYLE_TEXT[fp.offense.style].clause;
  return `You are ${who}, ${clause}.`;
}

function jobSection(fp: BuildFingerprint): BriefSection | null {
  const body: string[] = [];
  const primaryClass = CLASS_PLAYSTYLE[fp.primaryClassId];
  if (primaryClass) body.push(primaryClass.approach);

  const roles = ranked(fp.combatRoles, ROLE_PRIORITY);
  if (roles[0]) body.push(ROLE_TEXT[roles[0]]);
  // Commanding a second body changes a round more than anything else in this brief, so it is worth
  // saying even when it is not the leading role.
  if (roles[0] !== 'commander' && roles.includes('commander')) body.push(ROLE_TEXT.commander);

  body.push(POSTURE_TEXT[fp.defense.posture]);
  return body.length ? { id: 'job', title: 'What you are for', body } : null;
}

function roundSection(fp: BuildFingerprint): BriefSection | null {
  const body: string[] = [STYLE_TEXT[fp.offense.style].round];
  if (fp.casting) body.push(LEAN_TEXT[fp.casting.lean]);

  // Describe the pools that have something particular to say first; a pool with no authored line
  // still gets a sentence, because a resource nobody mentions is a resource nobody spends.
  const pools = [...fp.resources].sort((a, b) => Number(!!POOL_TEXT[b.id]) - Number(!!POOL_TEXT[a.id]));
  for (const pool of cap(pools, MAX_POOLS)) {
    body.push(POOL_TEXT[pool.id] ?? `${pool.name} ${POOL_PACING_TEXT[pool.pacing]}.`);
  }
  return { id: 'round', title: 'How a round goes', body };
}

function edgeSection(fp: BuildFingerprint): BriefSection | null {
  // Feats come first: they were chosen, so they describe intent rather than circumstance.
  const body = cap([
    ...fp.featThemes.map((t) => THEME_TEXT[t]),
    ...fp.strengths.map((s) => STRENGTH_TEXT[s]),
  ], MAX_EDGE);
  return body.length ? { id: 'edge', title: 'What you do well', body } : null;
}

function riskSection(fp: BuildFingerprint): BriefSection | null {
  const body = cap(ranked(fp.gaps, GAP_PRIORITY).map((g) => GAP_TEXT[g]), MAX_RISK);
  return body.length ? { id: 'risk', title: 'What will get you killed', body } : null;
}

function betweenSection(fp: BuildFingerprint): BriefSection | null {
  const body = fp.partyRoles.map((r) => PARTY_TEXT[r]);
  if (body.length === 0) {
    // Saying nothing here would read as "this section does not apply to you", which is the
    // opposite of the truth: it applies and the answer is nobody.
    body.push('Nothing on this sheet marks you as the party\'s talker, scout or scholar. That is a legitimate choice for a character who fights, and it does mean somebody else has to cover the half of a session that is not a fight.');
  }
  return { id: 'between', title: 'Between fights', body };
}

/** The class anchor alone, capitalised — a roster card has room for a phrase, not a sentence.
 *  Empty when the class is not chosen yet, so a caller can leave the line out entirely rather
 *  than print a placeholder. */
export function identityChip(fp: BuildFingerprint): string {
  const identity = CLASS_PLAYSTYLE[fp.primaryClassId]?.identity;
  return identity ? identity.charAt(0).toUpperCase() + identity.slice(1) : '';
}

/** Build the brief. Pure: the same fingerprint always produces the same text. */
export function playstyleBrief(fp: BuildFingerprint): PlaystyleBrief {
  const sections = [jobSection(fp), roundSection(fp), edgeSection(fp), riskSection(fp), betweenSection(fp)]
    .filter((s): s is BriefSection => s !== null);
  return { identity: identityLine(fp), sections };
}
