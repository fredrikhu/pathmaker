// The descriptive half of a character: what they look like, where they are from, who plays them.
//
// None of it is mechanical. Pathfinder 1e attaches no rules to sex, hair colour or homeland, which
// is why the engine went this long without any of it and why nothing here is read by `resolve`.
// It exists because two surfaces already need it and cannot get it anywhere else: the printed
// official sheet lays out these exact fields and could only ever render them blank, and the
// backstory export has to tell someone's language model whether the character has pronouns.
//
// Every field is free text on purpose. A fixed male/female list would be wrong for a player who
// wants something else, and wrong for the roster too — changelings, for instance, are published as
// always female, and a race-aware dropdown would have to special-case that to no benefit. Free
// text is also the honest shape for height and weight, which players write in whatever units their
// table uses.
//
// Age is deliberately *not* wired to anything. PF1e gives ageing categories ability modifiers, and
// this engine has never modelled them; storing a number that silently fails to move a stat is
// better than a number that moves it in a way the rest of the sheet cannot explain.

import type { CharacterDoc } from './types';

export interface CharacterDescription {
  gender: string;
  pronouns: string;
  age: string;
  height: string;
  weight: string;
  hair: string;
  eyes: string;
  homeland: string;
  /** The person at the table, not the character. */
  player: string;
}

export interface DescriptionField {
  key: keyof CharacterDescription;
  label: string;
  /** Offered as suggestions, never enforced — the input stays free text. */
  suggestions?: string[];
  /** Held back from the backstory export. */
  privateToSheet?: boolean;
}

/** One list drives the builder form, the printed sheet and the export, so the three cannot drift
 *  apart or disagree about what a field is called. */
export const DESCRIPTION_FIELDS: DescriptionField[] = [
  { key: 'gender', label: 'Gender', suggestions: ['Female', 'Male', 'Non-binary', 'Agender'] },
  { key: 'pronouns', label: 'Pronouns', suggestions: ['she/her', 'he/him', 'they/them', 'it/its'] },
  { key: 'age', label: 'Age' },
  { key: 'height', label: 'Height' },
  { key: 'weight', label: 'Weight' },
  { key: 'hair', label: 'Hair' },
  { key: 'eyes', label: 'Eyes' },
  { key: 'homeland', label: 'Homeland' },
  // A real person's name. It belongs on a sheet you print and hand across a table; it does not
  // belong in text the player is about to paste into someone else's service.
  { key: 'player', label: 'Player', privateToSheet: true },
];

export const DESCRIPTION_KEY = 'description';

const EMPTY: CharacterDescription = {
  gender: '', pronouns: '', age: '', height: '', weight: '', hair: '', eyes: '', homeland: '', player: '',
};

/** Read the block off a document, tolerating anything a hand-edited or older file might hold. */
export function readDescription(doc: CharacterDoc): CharacterDescription {
  const raw = doc.decisions[DESCRIPTION_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY };
  const src = raw as Record<string, unknown>;
  const out = { ...EMPTY };
  for (const f of DESCRIPTION_FIELDS) {
    const v = src[f.key];
    if (typeof v === 'string') out[f.key] = v.trim();
  }
  return out;
}

/** Set one field, returning a new document. Empty values are kept as empty strings rather than
 *  deleted, so a cleared field round-trips instead of reverting to whatever was there before. */
export function withDescriptionField(
  doc: CharacterDoc, key: keyof CharacterDescription, value: string,
): CharacterDoc {
  return {
    ...doc,
    decisions: { ...doc.decisions, [DESCRIPTION_KEY]: { ...readDescription(doc), [key]: value } },
  };
}

/** The filled fields, in form order. `includePrivate` false drops anything marked private. */
export function filledDescription(
  doc: CharacterDoc, includePrivate = true,
): { label: string; value: string }[] {
  const d = readDescription(doc);
  return DESCRIPTION_FIELDS
    .filter((f) => (includePrivate || !f.privateToSheet) && d[f.key] !== '')
    .map((f) => ({ label: f.label, value: d[f.key] }));
}
