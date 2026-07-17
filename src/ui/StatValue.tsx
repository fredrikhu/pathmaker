import type { Stat } from '../engine/types';
import { fmtMod } from '../engine/types';
import { useTip } from './Tooltip';

/** A number that reveals its engine-provided breakdown on hover/click. */
export function StatValue({ stat, mode = 'plain', label }: { stat: Stat; mode?: 'plain' | 'mod'; label?: string }) {
  const tip = useTip();
  const shown = mode === 'mod' ? fmtMod(stat.total) : String(stat.total);
  const open = tip.card({
    kicker: 'Breakdown',
    title: `${label ?? stat.label} ${shown}`,
    lines: stat.lines,
    annotations: stat.annotations,
  });
  return (
    <button className="inspect num" onMouseEnter={open} onMouseLeave={tip.leave} onClick={open}>
      {shown}
    </button>
  );
}
