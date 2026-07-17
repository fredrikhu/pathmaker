import { useState } from 'react';
import { loadCharacter } from '../storage/store';
import { newCharacter } from '../engine/character';
import { useCharacter } from './useCharacter';
import { navigate } from './App';
import { StatStrip } from './builder/StatStrip';
import { IssuesPanel } from './builder/IssuesPanel';
import { BasicsStep } from './builder/steps/Basics';
import { RaceStep } from './builder/steps/Race';
import { ClassStep } from './builder/steps/Class';
import { SkillsStep } from './builder/steps/Skills';
import { FeatsStep } from './builder/steps/Feats';
import { SpellsStep } from './builder/steps/Spells';
import { EquipmentStep } from './builder/steps/Equipment';
import { ReviewStep } from './builder/steps/Review';

const STEP_LABEL: Record<string, string> = {
  basics: 'Basics', race: 'Race', class: 'Class', skills: 'Skills',
  feats: 'Feats & traits', spells: 'Spells', equipment: 'Equipment', review: 'Review',
};

export function Builder({ id }: { id: string }) {
  const initial = loadCharacter(id) ?? newCharacter(id);
  const ch = useCharacter(initial);
  const { doc, resolution } = ch;
  const [step, setStep] = useState('basics');

  // Steps not present for this build (e.g. spells for a fighter) fall back to basics.
  const steps = resolution.steps;
  const activeStep = steps.includes(step) ? step : 'basics';

  const issuesByStep = (s: string) => resolution.issues.filter((i) => i.step === s);
  const glyph = (s: string): { g: string; color: string } => {
    const mine = issuesByStep(s);
    if (mine.some((i) => i.severity === 'error')) return { g: '!', color: 'var(--err)' };
    if (mine.some((i) => i.severity === 'info' || i.severity === 'warning')) return { g: '●', color: 'var(--color-accent)' };
    if (s === 'review') return { g: '○', color: 'var(--color-neutral-500)' };
    return { g: '✓', color: 'var(--color-neutral-500)' };
  };

  const goto = (s: string) => setStep(s);

  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontSize: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate({ name: 'roster' })} style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-accent)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Pathmaker</button>
        <span style={{ fontWeight: 500, fontSize: 15 }}>{doc.name} <span className="text-muted" style={{ fontSize: 12, fontWeight: 400 }}>· {resolution.sheet.summaryLine || 'new character'}</span></span>
        <div style={{ display: 'flex', gap: 2, marginLeft: 16, flexWrap: 'wrap' }}>
          {steps.map((s) => {
            const gg = glyph(s);
            return (
              <button key={s} onClick={() => goto(s)}
                style={{ padding: '7px 12px 9px', fontSize: 13, cursor: 'pointer', boxShadow: activeStep === s ? 'inset 0 -2px 0 var(--color-accent)' : 'none', color: 'var(--color-text)', background: 'transparent', border: 'none', fontFamily: 'inherit' }}>
                <span style={{ fontSize: 11, color: gg.color }}>{gg.g}</span> {STEP_LABEL[s]}
              </button>
            );
          })}
        </div>
        <span style={{ flex: 1 }} />
        <button className="btn btn-secondary" style={{ fontSize: 12 }} disabled={!ch.canUndo} onClick={ch.undo} title="Undo (Ctrl+Z)">↩ Undo</button>
        <span className="text-muted" style={{ fontSize: 11 }}>Saved</span>
        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => navigate({ name: 'sheet', id })}>Sheet preview</button>
      </div>

      <StatStrip sheet={resolution.sheet} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', flex: 1, alignItems: 'stretch', minHeight: 0 }}>
        <div style={{ padding: '20px 26px 40px', minWidth: 0, minHeight: 0, overflowX: 'auto', overflowY: 'auto' }}>
          {activeStep === 'basics' && <BasicsStep ch={ch} />}
          {activeStep === 'race' && <RaceStep ch={ch} />}
          {activeStep === 'class' && <ClassStep ch={ch} />}
          {activeStep === 'skills' && <SkillsStep ch={ch} />}
          {activeStep === 'feats' && <FeatsStep ch={ch} />}
          {activeStep === 'spells' && <SpellsStep ch={ch} />}
          {activeStep === 'equipment' && <EquipmentStep ch={ch} />}
          {activeStep === 'review' && <ReviewStep ch={ch} onGoto={goto} />}
        </div>
        <IssuesPanel issues={resolution.issues} onNavigate={(s) => goto(s)} onClear={(slot) => {
          // clearSlot format "feats.<key>": clear a nested feat decision.
          if (slot.startsWith('feats.')) {
            const key = slot.slice('feats.'.length);
            const feats = { ...(doc.decisions['feats'] as Record<string, string | null> ?? {}) };
            delete feats[key];
            ch.setDecision('feats', feats);
          } else {
            ch.clear(slot);
          }
        }} />
      </div>
    </div>
  );
}

export type CharCtl = ReturnType<typeof useCharacter>;
