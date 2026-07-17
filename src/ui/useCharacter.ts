import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CharacterDoc } from '../engine/types';
import { resolve } from '../engine/resolve';
import { clearDecision, withDecision } from '../engine/character';
import { saveCharacter } from '../storage/store';

const UNDO_LIMIT = 50;

/** Owns one character doc, its derived resolution, autosave, and an undo ring. */
export function useCharacter(initial: CharacterDoc) {
  const [doc, setDoc] = useState<CharacterDoc>(initial);
  const undoStack = useRef<CharacterDoc[]>([]);
  const redoStack = useRef<CharacterDoc[]>([]);
  const [, forceTick] = useState(0);

  // Autosave (debounced) whenever the doc changes.
  const saveTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveCharacter(doc), 250);
    return () => window.clearTimeout(saveTimer.current);
  }, [doc]);

  const commit = useCallback((next: CharacterDoc) => {
    setDoc((prev) => {
      undoStack.current.push(prev);
      if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift();
      redoStack.current = [];
      return next;
    });
  }, []);

  const setDecision = useCallback((slot: string, value: unknown) => {
    setDoc((prev) => {
      undoStack.current.push(prev);
      if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift();
      redoStack.current = [];
      return withDecision(prev, slot, value);
    });
  }, []);

  const clear = useCallback((slot: string) => {
    setDoc((prev) => {
      undoStack.current.push(prev);
      redoStack.current = [];
      return clearDecision(prev, slot);
    });
  }, []);

  const patch = useCallback((mut: (d: CharacterDoc) => CharacterDoc) => {
    setDoc((prev) => {
      undoStack.current.push(prev);
      redoStack.current = [];
      return mut(prev);
    });
  }, []);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setDoc((cur) => {
      redoStack.current.push(cur);
      return prev;
    });
    forceTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  const resolution = useMemo(() => resolve(doc), [doc]);
  const canUndo = undoStack.current.length > 0;

  return { doc, resolution, setDecision, clear, patch, commit, undo, canUndo };
}
