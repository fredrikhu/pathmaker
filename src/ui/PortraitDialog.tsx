import { useMemo, useState } from 'react';
import { characterPortrait, type PortraitFormat } from '../engine/portrait';
import type { CharacterDoc, Resolution } from '../engine/types';

/** Hands the character to whatever assistant the player already uses.
 *
 *  Pathmaker never calls a model — the deployed app is a static site in front of an API that
 *  stores opaque JSON, and adding an inference bill to that is not on the table. So the product
 *  here is the text itself: accurate, compact, and editable before it leaves. The textarea is
 *  deliberately editable, because the player knows things about their character that the sheet
 *  does not and this is the natural place to add them. */
export function PortraitDialog({ doc, resolution, onClose }: {
  doc: CharacterDoc;
  resolution: Resolution;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<PortraitFormat>('prompt');
  const generated = useMemo(() => characterPortrait(doc, resolution, format), [doc, resolution, format]);
  // Regenerating on a format switch discards edits, which is the lesser surprise: the alternative
  // is silently keeping text that no longer matches the format the player just asked for.
  const [text, setText] = useState(generated);
  const [shown, setShown] = useState(generated);
  const [status, setStatus] = useState<'idle' | 'copied' | 'manual'>('idle');
  if (shown !== generated) { setShown(generated); setText(generated); setStatus('idle'); }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
      window.setTimeout(() => setStatus('idle'), 2000);
    } catch {
      // Writing to the clipboard can be refused outright — a browser with the permission denied,
      // an embedded webview. Selecting the text lets the player finish with their own keyboard,
      // but only if they are told to: a selection that appears with no explanation reads as the
      // button having done nothing.
      const el = document.getElementById('portrait-text') as HTMLTextAreaElement | null;
      el?.focus();
      el?.select();
      setStatus('manual');
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" style={{ maxWidth: 760, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">Describe {doc.name} with an AI</div>
        <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
            Pathmaker does not talk to an AI itself. Copy this and paste it into whichever assistant
            you use. Edit it first if you already know things about this character that the sheet does not.
          </p>
          <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.55 }}>
            {format === 'prompt' && 'Backstory — asks a writing model for an appearance, a history, mannerisms and motivations.'}
            {format === 'image' && 'Portrait — written for an image generator. Only the things that are actually visible, plus what it must not invent: the holy symbol, and equipment the character does not carry.'}
            {format === 'data' && 'Data only — the character block with no instructions, for a prompt you already have.'}
          </p>

          <div className="seg" style={{ alignSelf: 'flex-start' }}>
            {([['prompt', 'Backstory'], ['image', 'Portrait'], ['data', 'Data only']] as const).map(([id, label]) => (
              <label key={id} className="seg-opt">
                <input type="radio" name="portrait-format" hidden checked={format === id} onChange={() => setFormat(id)} />
                {label}
              </label>
            ))}
          </div>

          <textarea
            id="portrait-text"
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            style={{ width: '100%', minHeight: 320, resize: 'vertical', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}
          />

          <p className="text-muted" style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5 }}>
            Whatever you paste this into is a service outside Pathmaker, with its own terms and its own
            handling of what you send it.
          </p>
        </div>
        <div className="dialog-actions" style={{ alignItems: 'center' }}>
          {status === 'manual' && (
            <span className="text-muted" style={{ fontSize: 11.5, marginRight: 'auto' }}>
              Your browser blocked the clipboard. The text is selected — press Ctrl+C (⌘C on a Mac).
            </span>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={copy}>{status === 'copied' ? '✓ Copied' : 'Copy'}</button>
        </div>
      </div>
    </div>
  );
}
