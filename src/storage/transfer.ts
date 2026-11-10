import type { CharacterDoc } from '../engine/types';
import { migrate, SCHEMA_VERSION } from '../engine/character';
import { resolve } from '../engine/resolve';

/** Turning a character into a file someone else can open, and back.
 *
 *  An exported file is the character doc itself, so the format is exactly what the cache and the
 *  server already hold. The one thing the import side cannot assume is that the file *is* a
 *  character: it arrives from another person, over chat or email, and a doc that is saved
 *  without being checked breaks the roster on every load, because the roster resolves each doc
 *  to draw its card. So everything is checked here, before it goes into storage. */

/** An import that was refused. `message` is written for the person who picked the file. */
export class ImportError extends Error {}

const NOT_A_CHARACTER = 'That file is not a Pathmaker character.';

export function exportFileName(doc: CharacterDoc): string {
  return `${doc.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'character'}.pathmaker.json`;
}

export function serializeCharacter(doc: CharacterDoc): string {
  return JSON.stringify(doc, null, 2);
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isTime = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/** Reads an exported file into a doc that is ready to save into *this* roster: checked and
 *  migrated, with a new id (so importing your own export, or a friend's twice, never overwrites
 *  a character already here) and stamped as edited now (so it sorts to the top on every device).
 *  Throws `ImportError` when the file is not something the roster could show. */
export function parseCharacterFile(text: string, id: string, now = new Date().toISOString()): CharacterDoc {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    throw new ImportError(`${NOT_A_CHARACTER} It is not valid JSON.`);
  }
  if (!isRecord(raw) || typeof raw.schemaVersion !== 'number' || !isRecord(raw.decisions)) {
    throw new ImportError(NOT_A_CHARACTER);
  }
  if (raw.schemaVersion > SCHEMA_VERSION) {
    throw new ImportError('That character was saved by a newer version of Pathmaker. Reload the page to get the latest version, then import it again.');
  }

  const equipped = isRecord(raw.equipped) ? raw.equipped : {};
  const slot = (v: unknown) => (typeof v === 'string' ? v : null);
  const doc = migrate({
    ...(raw as unknown as CharacterDoc),
    id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Imported Hero',
    createdAt: isTime(raw.createdAt) ? raw.createdAt : now,
    updatedAt: now,
    purchases: isRecord(raw.purchases) ? (raw.purchases as Record<string, number>) : {},
    goldSpent: typeof raw.goldSpent === 'number' ? raw.goldSpent : 0,
    equipped: { armor: slot(equipped.armor), mainHand: slot(equipped.mainHand), offHand: slot(equipped.offHand) },
  });

  // The shape checks above catch the obvious mistakes; this catches the rest. Whatever the
  // engine cannot resolve, the roster could not draw.
  try {
    resolve(doc);
  } catch {
    throw new ImportError(`${NOT_A_CHARACTER} It looks like one, but parts of it could not be read.`);
  }
  return doc;
}
